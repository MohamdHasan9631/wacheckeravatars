const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active WhatsApp clients
const clients = new Map();
const qrCodes = new Map();

// Initialize a new WhatsApp client session
app.post('/api/session/create', async (req, res) => {
    const { sessionId } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }
    
    if (clients.has(sessionId)) {
        return res.status(400).json({ error: 'Session already exists' });
    }
    
    try {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: sessionId }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox']
            }
        });
        
        // Handle QR code generation
        client.on('qr', async (qr) => {
            const qrImage = await QRCode.toDataURL(qr);
            qrCodes.set(sessionId, qrImage);
        });
        
        // Handle ready state
        client.on('ready', () => {
            console.log(`Client ${sessionId} is ready!`);
            qrCodes.delete(sessionId);
        });
        
        // Handle disconnection
        client.on('disconnected', (reason) => {
            console.log(`Client ${sessionId} disconnected:`, reason);
            clients.delete(sessionId);
            qrCodes.delete(sessionId);
        });
        
        clients.set(sessionId, client);
        await client.initialize();
        
        res.json({ 
            success: true, 
            message: 'Session created successfully',
            sessionId 
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get QR code for a session
app.get('/api/session/:sessionId/qr', (req, res) => {
    const { sessionId } = req.params;
    const qrCode = qrCodes.get(sessionId);
    
    if (!qrCode) {
        return res.status(404).json({ error: 'QR code not available or session already authenticated' });
    }
    
    res.json({ qrCode });
});

// Get session status
app.get('/api/session/:sessionId/status', async (req, res) => {
    const { sessionId } = req.params;
    const client = clients.get(sessionId);
    
    if (!client) {
        return res.json({ status: 'not_found' });
    }
    
    try {
        const state = await client.getState();
        const hasQR = qrCodes.has(sessionId);
        res.json({ 
            status: state,
            hasQR,
            ready: state === 'CONNECTED'
        });
    } catch (error) {
        res.json({ status: 'initializing', hasQR: qrCodes.has(sessionId) });
    }
});

// List all sessions
app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(clients.keys()).map(sessionId => ({
        sessionId,
        hasQR: qrCodes.has(sessionId)
    }));
    res.json({ sessions });
});

// Delete a session
app.delete('/api/session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const client = clients.get(sessionId);
    
    if (!client) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        await client.destroy();
        clients.delete(sessionId);
        qrCodes.delete(sessionId);
        res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Check WhatsApp numbers
app.post('/api/check-numbers', async (req, res) => {
    const { sessionId, numbers } = req.body;
    
    if (!sessionId || !numbers || !Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Session ID and numbers array are required' });
    }
    
    const client = clients.get(sessionId);
    
    if (!client) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        const results = [];
        const logs = [];
        
        for (const number of numbers) {
            const logEntry = {
                number: number,
                timestamp: new Date().toISOString(),
                attempts: []
            };
            
            try {
                const numberId = await client.getNumberId(number);
                
                if (numberId) {
                    // Number exists on WhatsApp
                    const contact = await client.getContactById(numberId._serialized);
                    
                    logEntry.attempts.push({
                        id: numberId._serialized,
                        success: true,
                        message: `Number found with ID: ${numberId._serialized}`
                    });
                    
                    // Try to get profile picture with different ID formats
                    let profilePicUrl = null;
                    const idFormats = [
                        numberId._serialized,
                        `${number.replace(/[^0-9]/g, '')}@c.us`,
                        `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`,
                        `${number.replace(/[^0-9]/g, '')}@w.whatsapp.net`
                    ];
                    
                    for (const idFormat of idFormats) {
                        try {
                            const picUrl = await client.getProfilePicUrl(idFormat);
                            if (picUrl) {
                                profilePicUrl = picUrl;
                                logEntry.attempts.push({
                                    id: idFormat,
                                    success: true,
                                    message: `Profile picture found using ID: ${idFormat}`
                                });
                                break;
                            }
                        } catch (picError) {
                            logEntry.attempts.push({
                                id: idFormat,
                                success: false,
                                message: `Failed to get profile picture with ID: ${idFormat} - ${picError.message}`
                            });
                        }
                    }
                    
                    results.push({
                        number: number,
                        exists: true,
                        whatsappId: numberId._serialized,
                        name: contact.name || contact.pushname || 'N/A',
                        isBusiness: contact.isBusiness || false,
                        hasProfilePic: profilePicUrl ? true : false,
                        profilePicUrl: profilePicUrl
                    });
                    
                    logEntry.result = 'success';
                    logEntry.isBusiness = contact.isBusiness || false;
                } else {
                    // Number doesn't exist on WhatsApp
                    logEntry.result = 'not_found';
                    logEntry.attempts.push({
                        success: false,
                        message: 'Number not found on WhatsApp'
                    });
                    
                    results.push({
                        number: number,
                        exists: false,
                        whatsappId: null,
                        name: 'N/A',
                        isBusiness: false,
                        hasProfilePic: false,
                        profilePicUrl: null
                    });
                }
            } catch (error) {
                logEntry.result = 'error';
                logEntry.attempts.push({
                    success: false,
                    message: `Error: ${error.message}`
                });
                
                results.push({
                    number: number,
                    exists: false,
                    error: error.message,
                    whatsappId: null,
                    name: 'Error',
                    isBusiness: false,
                    hasProfilePic: false,
                    profilePicUrl: null
                });
            }
            
            logs.push(logEntry);
        }
        
        res.json({ success: true, results, logs });
    } catch (error) {
        console.error('Error checking numbers:', error);
        res.status(500).json({ error: 'Failed to check numbers' });
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
