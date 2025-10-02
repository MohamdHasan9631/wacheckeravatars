// API Base URL
const API_URL = 'http://localhost:3000';

// Store results and logs globally
let allResults = [];
let allLogs = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadSessions();
    updateDashboard();
    
    // Auto-refresh sessions every 5 seconds
    setInterval(() => {
        loadSessions();
        updateDashboard();
    }, 5000);
});

// Show/Hide sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked menu item
    event.target.closest('.menu-item, .nav-item')?.classList.add('active');
}

// Create a new session
async function createSession() {
    const sessionId = document.getElementById('sessionId').value.trim();
    
    if (!sessionId) {
        showAlert('error', 'Please enter a session name');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/session/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('success', 'Session created successfully! Waiting for QR code...');
            document.getElementById('sessionId').value = '';
            loadSessions();
        } else {
            showAlert('error', data.error || 'Failed to create session');
        }
    } catch (error) {
        showAlert('error', 'Network error: ' + error.message);
    }
}

// Load all sessions
async function loadSessions() {
    try {
        const response = await fetch(`${API_URL}/api/sessions`);
        const data = await response.json();
        
        const container = document.getElementById('sessionsContainer');
        const select = document.getElementById('checkSessionId');
        
        if (data.sessions.length === 0) {
            container.innerHTML = `
                <div class="info-box">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <h4>No Active Sessions</h4>
                        <p>Create a new session to get started</p>
                    </div>
                </div>
            `;
            select.innerHTML = '<option value="">-- No sessions available --</option>';
            return;
        }
        
        // Update sessions container
        container.innerHTML = '';
        select.innerHTML = '<option value="">-- Select a session --</option>';
        
        for (const session of data.sessions) {
            await loadSessionCard(session.sessionId);
            select.innerHTML += `<option value="${session.sessionId}">${session.sessionId}</option>`;
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

// Load individual session card
async function loadSessionCard(sessionId) {
    try {
        const statusResponse = await fetch(`${API_URL}/api/session/${sessionId}/status`);
        const statusData = await statusResponse.json();
        
        const container = document.getElementById('sessionsContainer');
        
        let statusClass = 'initializing';
        let statusText = 'Initializing';
        let qrContent = '';
        
        if (statusData.ready) {
            statusClass = 'connected';
            statusText = 'Connected';
        } else if (statusData.hasQR) {
            statusClass = 'waiting';
            statusText = 'Waiting for Scan';
            
            // Fetch QR code
            const qrResponse = await fetch(`${API_URL}/api/session/${sessionId}/qr`);
            if (qrResponse.ok) {
                const qrData = await qrResponse.json();
                qrContent = `
                    <div class="qr-container">
                        <img src="${qrData.qrCode}" alt="QR Code">
                        <p><i class="fas fa-mobile-alt"></i> Scan with WhatsApp</p>
                    </div>
                `;
            }
        }
        
        const cardHTML = `
            <div class="session-card" id="session-${sessionId}">
                <div class="session-header">
                    <h3><i class="fas fa-mobile-alt"></i> ${sessionId}</h3>
                    <span class="session-status ${statusClass}">${statusText}</span>
                </div>
                ${qrContent}
                <div class="session-actions">
                    <button onclick="deleteSession('${sessionId}')" class="btn btn-danger btn-small">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        // Check if card already exists
        const existingCard = document.getElementById(`session-${sessionId}`);
        if (existingCard) {
            existingCard.outerHTML = cardHTML;
        } else {
            container.innerHTML += cardHTML;
        }
    } catch (error) {
        console.error(`Error loading session ${sessionId}:`, error);
    }
}

// Delete a session
async function deleteSession(sessionId) {
    if (!confirm(`Are you sure you want to delete session "${sessionId}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/session/${sessionId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('success', 'Session deleted successfully');
            loadSessions();
        } else {
            showAlert('error', data.error || 'Failed to delete session');
        }
    } catch (error) {
        showAlert('error', 'Network error: ' + error.message);
    }
}

// Check numbers
async function checkNumbers() {
    const sessionId = document.getElementById('checkSessionId').value;
    const numbersText = document.getElementById('phoneNumbers').value.trim();
    
    if (!sessionId) {
        showAlert('error', 'Please select a session');
        return;
    }
    
    if (!numbersText) {
        showAlert('error', 'Please enter phone numbers to check');
        return;
    }
    
    const numbers = numbersText.split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);
    
    if (numbers.length === 0) {
        showAlert('error', 'No valid numbers found');
        return;
    }
    
    // Show progress
    const progressBox = document.getElementById('checkProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    
    progressBox.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressText.textContent = 'Checking numbers, please wait...';
    progressCount.textContent = `0 / ${numbers.length}`;
    
    try {
        // Check numbers one at a time to show progress
        const results = [];
        const logs = [];
        
        for (let i = 0; i < numbers.length; i++) {
            const number = numbers[i];
            
            const response = await fetch(`${API_URL}/api/check-numbers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, numbers: [number] })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                results.push(...data.results);
                logs.push(...data.logs);
                
                // Update progress
                const progress = ((i + 1) / numbers.length) * 100;
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${Math.round(progress)}%`;
                progressCount.textContent = `${i + 1} / ${numbers.length}`;
            } else {
                results.push({
                    number: number,
                    exists: false,
                    error: data.error || 'Failed to check number',
                    whatsappId: null,
                    name: 'Error',
                    isBusiness: false,
                    hasProfilePic: false,
                    profilePicUrl: null
                });
            }
        }
        
        progressBox.style.display = 'none';
        
        allResults = allResults.concat(results);
        allLogs = allLogs.concat(logs);
        updateResultsTable();
        updateLogsDisplay();
        showAlert('success', `Successfully checked ${results.length} numbers`);
        
        // Clear the textarea
        document.getElementById('phoneNumbers').value = '';
        
        // Update dashboard
        updateDashboard();
        
        // Switch to results section
        showSection('results');
    } catch (error) {
        progressBox.style.display = 'none';
        showAlert('error', 'Network error: ' + error.message);
    }
}

// Update results table
function updateResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';
    
    if (allResults.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No results available. Check some numbers to see results here.
                </td>
            </tr>
        `;
        return;
    }
    
    allResults.forEach(result => {
        const row = document.createElement('tr');
        
        // Number
        const numberCell = document.createElement('td');
        numberCell.textContent = result.number;
        row.appendChild(numberCell);
        
        // Profile Picture
        const picCell = document.createElement('td');
        if (result.profilePicUrl) {
            picCell.innerHTML = `<img src="${result.profilePicUrl}" class="profile-pic" alt="Profile Picture">`;
        } else {
            picCell.innerHTML = `<div class="profile-pic-placeholder"><i class="fas fa-user"></i></div>`;
        }
        row.appendChild(picCell);
        
        // Account Type
        const accountCell = document.createElement('td');
        if (result.exists) {
            const typeClass = result.isBusiness ? 'business' : 'regular';
            const typeIcon = result.isBusiness ? 'fa-briefcase' : 'fa-user';
            const typeText = result.isBusiness ? 'Business' : 'Regular';
            accountCell.innerHTML = `
                <span class="account-type-badge ${typeClass}">
                    <i class="fas ${typeIcon}"></i> ${typeText}
                </span>
            `;
        } else {
            accountCell.innerHTML = '<span class="text-muted">N/A</span>';
        }
        row.appendChild(accountCell);
        
        // Status
        const statusCell = document.createElement('td');
        const statusBadge = result.exists 
            ? '<span class="status-badge valid"><i class="fas fa-check-circle"></i> Valid</span>'
            : '<span class="status-badge invalid"><i class="fas fa-times-circle"></i> Invalid</span>';
        statusCell.innerHTML = statusBadge;
        row.appendChild(statusCell);
        
        // WhatsApp ID
        const idCell = document.createElement('td');
        idCell.innerHTML = `<code style="font-size: 0.85rem;">${result.whatsappId || 'N/A'}</code>`;
        row.appendChild(idCell);
        
        // Progress (as percentage of success)
        const progressCell = document.createElement('td');
        const progressValue = result.exists ? 100 : 0;
        const progressColor = result.exists ? 'bg-success' : 'bg-danger';
        progressCell.innerHTML = `
            <div class="result-progress">
                <div class="progress">
                    <div class="progress-bar ${progressColor}" role="progressbar" 
                         style="width: ${progressValue}%" aria-valuenow="${progressValue}" 
                         aria-valuemin="0" aria-valuemax="100">${progressValue}%</div>
                </div>
            </div>
        `;
        row.appendChild(progressCell);
        
        tbody.appendChild(row);
    });
}

// Update logs display
function updateLogsDisplay() {
    const container = document.getElementById('logsContainer');
    
    if (allLogs.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <span>No logs yet. Check some numbers to see server responses here.</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // Display logs in reverse order (newest first)
    [...allLogs].reverse().forEach(log => {
        const logEntry = document.createElement('div');
        const logClass = log.result === 'error' ? 'log-entry error' : 'log-entry';
        logEntry.className = logClass;
        
        const time = new Date(log.timestamp).toLocaleTimeString();
        
        let attemptsHtml = '';
        log.attempts.forEach(attempt => {
            const icon = attempt.success ? 'fa-check-circle text-success' : 'fa-times-circle text-danger';
            attemptsHtml += `
                <div class="mb-1">
                    <i class="fas ${icon}"></i> 
                    ${attempt.id ? `<code>${attempt.id}</code>: ` : ''}
                    ${attempt.message}
                </div>
            `;
        });
        
        logEntry.innerHTML = `
            <div class="log-header">
                <span class="log-number"><i class="fas fa-phone"></i> ${log.number}</span>
                <span class="log-time">${time}</span>
            </div>
            <div class="log-details">
                ${attemptsHtml}
                ${log.isBusiness !== undefined ? `<div class="mt-2"><strong>Account Type:</strong> ${log.isBusiness ? 'Business' : 'Regular'}</div>` : ''}
            </div>
        `;
        
        container.appendChild(logEntry);
    });
}

// Clear logs
function clearLogs() {
    if (!confirm('Are you sure you want to clear all logs?')) {
        return;
    }
    
    allLogs = [];
    updateLogsDisplay();
    showAlert('info', 'Logs cleared successfully');
}

// Update dashboard statistics
async function updateDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/sessions`);
        const data = await response.json();
        
        document.getElementById('activeSessions').textContent = data.sessions.length;
        document.getElementById('numbersChecked').textContent = allResults.length;
        
        const validCount = allResults.filter(r => r.exists).length;
        const invalidCount = allResults.filter(r => !r.exists).length;
        
        document.getElementById('validNumbers').textContent = validCount;
        document.getElementById('invalidNumbers').textContent = invalidCount;
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Clear all results
function clearResults() {
    if (!confirm('Are you sure you want to clear all results?')) {
        return;
    }
    
    allResults = [];
    updateResultsTable();
    updateDashboard();
    showAlert('info', 'Results cleared successfully');
}

// Export results to CSV
function exportResults(filterType) {
    if (allResults.length === 0) {
        showAlert('error', 'No results to export');
        return;
    }
    
    let resultsToExport = allResults;
    let fileName = 'whatsapp-check-results';
    
    // Filter based on type
    if (filterType === 'business') {
        resultsToExport = allResults.filter(r => r.isBusiness === true);
        fileName = 'whatsapp-business-accounts';
        if (resultsToExport.length === 0) {
            showAlert('error', 'No business accounts to export');
            return;
        }
    } else if (filterType === 'regular') {
        resultsToExport = allResults.filter(r => r.exists && r.isBusiness === false);
        fileName = 'whatsapp-regular-accounts';
        if (resultsToExport.length === 0) {
            showAlert('error', 'No regular accounts to export');
            return;
        }
    }
    
    let csv = 'Number,Status,WhatsApp ID,Account Type,Has Profile Picture,Profile Picture URL\n';
    
    resultsToExport.forEach(result => {
        csv += `${result.number},`;
        csv += `${result.exists ? 'Valid' : 'Invalid'},`;
        csv += `${result.whatsappId || 'N/A'},`;
        csv += `${result.isBusiness ? 'Business' : 'Regular'},`;
        csv += `${result.hasProfilePic ? 'Yes' : 'No'},`;
        csv += `${result.profilePicUrl || 'N/A'}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showAlert('success', `Exported ${resultsToExport.length} results successfully`);
}

// Show alert message
function showAlert(type, message) {
    const alertClass = type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : 'alert-info';
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    // Insert at the top of active section
    const activeSection = document.querySelector('.content-section.active');
    activeSection.insertBefore(alert, activeSection.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
