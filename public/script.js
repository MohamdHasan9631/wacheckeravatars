// API Base URL
const API_URL = 'http://localhost:3000';

// Store results globally
let allResults = [];
let resultsTable;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeDataTable();
    loadSessions();
    updateDashboard();
    
    // Auto-refresh sessions every 5 seconds
    setInterval(() => {
        loadSessions();
        updateDashboard();
    }, 5000);
});

// Initialize DataTable
function initializeDataTable() {
    resultsTable = $('#resultsTable').DataTable({
        order: [[0, 'asc']],
        pageLength: 25,
        language: {
            emptyTable: "No results available. Check some numbers to see results here."
        }
    });
}

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
    document.getElementById('checkProgress').style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/api/check-numbers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, numbers })
        });
        
        const data = await response.json();
        
        document.getElementById('checkProgress').style.display = 'none';
        
        if (response.ok && data.success) {
            allResults = allResults.concat(data.results);
            updateResultsTable(data.results);
            showAlert('success', `Successfully checked ${data.results.length} numbers`);
            
            // Clear the textarea
            document.getElementById('phoneNumbers').value = '';
            
            // Update dashboard
            updateDashboard();
            
            // Switch to results section
            showSection('results');
        } else {
            showAlert('error', data.error || 'Failed to check numbers');
        }
    } catch (error) {
        document.getElementById('checkProgress').style.display = 'none';
        showAlert('error', 'Network error: ' + error.message);
    }
}

// Update results table
function updateResultsTable(results) {
    results.forEach(result => {
        const statusBadge = result.exists 
            ? '<span class="status-badge valid"><i class="fas fa-check-circle"></i> Valid</span>'
            : '<span class="status-badge invalid"><i class="fas fa-times-circle"></i> Invalid</span>';
        
        const businessBadge = result.isBusiness 
            ? '<i class="fas fa-briefcase" style="color: #128C7E;"></i>'
            : '<i class="fas fa-user" style="color: #718096;"></i>';
        
        const profilePicBadge = result.hasProfilePic
            ? '<i class="fas fa-image" style="color: #128C7E;"></i>'
            : '<i class="fas fa-user-slash" style="color: #718096;"></i>';
        
        resultsTable.row.add([
            result.number,
            statusBadge,
            result.whatsappId || 'N/A',
            result.name,
            businessBadge,
            profilePicBadge
        ]).draw();
    });
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
    resultsTable.clear().draw();
    updateDashboard();
    showAlert('info', 'Results cleared successfully');
}

// Export results to CSV
function exportResults(format) {
    if (allResults.length === 0) {
        showAlert('error', 'No results to export');
        return;
    }
    
    if (format === 'csv') {
        let csv = 'Number,Status,WhatsApp ID,Name,Business,Has Profile Picture\n';
        
        allResults.forEach(result => {
            csv += `${result.number},`;
            csv += `${result.exists ? 'Valid' : 'Invalid'},`;
            csv += `${result.whatsappId || 'N/A'},`;
            csv += `"${result.name}",`;
            csv += `${result.isBusiness ? 'Yes' : 'No'},`;
            csv += `${result.hasProfilePic ? 'Yes' : 'No'}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whatsapp-check-results-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showAlert('success', 'Results exported successfully');
    }
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
