const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { twiml: { VoiceResponse } } = require('twilio');
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ***REMOVED*** = process.env.***REMOVED*** || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Load users data
function loadUsers() {
    try {
        const data = fs.readFileSync('users.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return { users: [] };
    }
}

// Save users data
function saveUsers(usersData) {
    try {
        fs.writeFileSync('users.json', JSON.stringify(usersData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// Load calls data
const callsFile = path.join(__dirname, 'calls.json');

function loadCalls() {
    try {
        if (!fs.existsSync(callsFile)) {
            fs.writeFileSync(callsFile, JSON.stringify({ calls: [] }, null, 2));
        }
        const data = fs.readFileSync(callsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading calls:', error);
        return { calls: [] };
    }
}

function saveCalls(callsData) {
    try {
        fs.writeFileSync(callsFile, JSON.stringify(callsData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving calls:', error);
        return false;
    }
}

// In-memory reset tokens (for demo; use DB in production)
const resetTokens = {};

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Add Twilio setup at the top (after other requires)
const ***REMOVED*** = process.env.***REMOVED***;
const ***REMOVED*** = process.env.***REMOVED***;
const ***REMOVED*** = process.env.***REMOVED***;

// Initialize Twilio client only if credentials are available
let twilioClient = null;
if (***REMOVED*** && ***REMOVED*** && ***REMOVED***) {
    if (***REMOVED*** === 'your_twilio_account_sid_here' || 
        ***REMOVED*** === 'your_twilio_auth_token_here' || 
        ***REMOVED*** === 'your_twilio_phone_number_here') {
        console.warn('âš ï¸  Twilio credentials are placeholder values. Real calls will not be made.');
        console.warn('ðŸ“ Please update your .env file with real Twilio credentials from https://console.twilio.com/');
    } else {
        twilioClient = twilio(***REMOVED***, ***REMOVED***);
        console.log('âœ… Twilio client initialized successfully with real credentials');
    }
} else {
    console.warn('âš ï¸  Twilio credentials not found. Call functionality will be disabled.');
    console.warn('ðŸ“ Please set ***REMOVED***, ***REMOVED***, and ***REMOVED*** environment variables.');
    console.warn('ðŸ”— Get credentials from: https://console.twilio.com/');
}

// Add questions file and functions
const questionsFile = path.join(__dirname, 'questions.json');
function loadQuestions() {
    try {
        if (!fs.existsSync(questionsFile)) {
            fs.writeFileSync(questionsFile, JSON.stringify({ questions: [] }, null, 2));
        }
        const data = fs.readFileSync(questionsFile, 'utf8');
        return JSON.parse(data).questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        return [];
    }
}
function saveQuestions(questions) {
    try {
        fs.writeFileSync(questionsFile, JSON.stringify({ questions }, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving questions:', error);
        return false;
    }
}

// At the top, after other requires
const responsesFile = path.join(__dirname, 'responses.json');
function loadResponses() {
    try {
        if (!fs.existsSync(responsesFile)) {
            fs.writeFileSync(responsesFile, JSON.stringify({ responses: [] }, null, 2));
        }
        const data = fs.readFileSync(responsesFile, 'utf8');
        return JSON.parse(data).responses;
    } catch (error) {
        console.error('Error loading responses:', error);
        return [];
    }
}
function saveResponses(responses) {
    try {
        fs.writeFileSync(responsesFile, JSON.stringify({ responses }, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving responses:', error);
        return false;
    }
}

// Transcript file and functions
const transcriptsFile = path.join(__dirname, 'transcripts.json');
function loadTranscripts() {
    try {
        if (!fs.existsSync(transcriptsFile)) {
            fs.writeFileSync(transcriptsFile, JSON.stringify({ transcripts: [] }, null, 2));
        }
        const data = fs.readFileSync(transcriptsFile, 'utf8');
        return JSON.parse(data).transcripts;
    } catch (error) {
        console.error('Error loading transcripts:', error);
        return [];
    }
}
function saveTranscripts(transcripts) {
    try {
        fs.writeFileSync(transcriptsFile, JSON.stringify({ transcripts }, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving transcripts:', error);
        return false;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Test questions page
app.get('/test-questions', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-questions.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        const usersData = loadUsers();
        const user = usersData.users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // For demo purposes, we'll use plain text comparison
        // In production, you should use bcrypt.compare(password, user.password)
        if (password !== user.password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Update last login
        user.last_login = new Date().toISOString();
        saveUsers(usersData);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            }, 
            ***REMOVED***, 
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, credits } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, password, and name are required' 
            });
        }

        const usersData = loadUsers();
        
        // Check if user already exists
        if (usersData.users.find(u => u.email === email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Create new user
        const newUser = {
            id: usersData.users.length + 1,
            email,
            password, // In production, hash this with bcrypt
            name,
            role: 'user',
            created_at: new Date().toISOString(),
            last_login: null,
            credits: typeof credits === 'number' ? credits : 0
        };

        usersData.users.push(newUser);
        saveUsers(usersData);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                credits: newUser.credits
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Protected route example
app.get('/api/profile', authenticateToken, (req, res) => {
    // Fetch the full user object from users.json
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === req.user.email);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            credits: user.credits || 0,
            created_at: user.created_at,
            last_login: user.last_login
        }
    });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, ***REMOVED***, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
}

// Get all users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }

    const usersData = loadUsers();
    const users = usersData.users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        last_login: user.last_login,
        credits: user.credits || 0
    }));

    res.json({
        success: true,
        users: users
    });
});

// Update user details (admin only)
app.put('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    try {
        const userId = parseInt(req.params.id, 10);
        const { name, email, role, credits } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
        }

        const usersData = loadUsers();
        const userIndex = usersData.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check for email conflicts
        if (usersData.users.some(u => u.email === email && u.id !== userId)) {
            return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
        }

        // Update user data
        usersData.users[userIndex] = {
            ...usersData.users[userIndex],
            name,
            email,
            role,
            credits: typeof credits === 'number' ? credits : usersData.users[userIndex].credits || 0
        };

        if (saveUsers(usersData)) {
            res.json({ success: true, message: 'User updated successfully', user: usersData.users[userIndex] });
        } else {
            throw new Error('Failed to save updated user data.');
        }

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    try {
        const userIdToDelete = parseInt(req.params.id, 10);
        const adminUserId = req.user.userId;

        if (userIdToDelete === adminUserId) {
            return res.status(400).json({ success: false, message: 'Admins cannot delete their own account.' });
        }

        const usersData = loadUsers();
        const initialUserCount = usersData.users.length;
        usersData.users = usersData.users.filter(u => u.id !== userIdToDelete);

        if (usersData.users.length === initialUserCount) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (saveUsers(usersData)) {
            res.json({ success: true, message: 'User deleted successfully' });
        } else {
            throw new Error('Failed to save updated user data.');
        }

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Forgot Password endpoint - Email-based
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === email);
    if (!user) {
        // Return error if user not found
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Generate a reset token
    const resetToken = Math.random().toString(36).substr(2, 8) + Date.now();
    resetTokens[resetToken] = {
        email,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        userId: user.id
    };
    // Send email with reset link
    const resetUrl = `${process.env.RESET_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `<h2>Password Reset</h2><p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>If you did not request this, please ignore this email.</p>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Reset email sent to', email);
    } catch (err) {
        console.error('Error sending reset email:', err);
        // For security, still return success
    }
    return res.json({ success: true, message: 'If this email is registered, a reset link will be sent.' });
});

// Reset Password endpoint
app.post('/api/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    
    const entry = resetTokens[token];
    if (!entry || entry.expires < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === entry.email);
    if (!user) {
        return res.status(400).json({ success: false, message: 'User not found' });
    }
    
    // Update password
    user.password = newPassword; // In production, hash this with bcrypt
    saveUsers(usersData);
    
    // Remove the used token
    delete resetTokens[token];
    
    console.log(`Password reset successful for ${entry.email}`);
    
    return res.json({ 
        success: true, 
        message: 'Password reset successful' 
    });
});

// Schedule a call for the logged-in user
app.post('/api/schedule-call', authenticateToken, (req, res) => {
    const { name, company, phone, time } = req.body;
    if (!name || !company || !phone || !time) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    
    try {
        const usersData = loadUsers();
        const user = usersData.users.find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        const callsData = loadCalls();
        const newCall = {
            id: callsData.calls.length + 1,
            userId: user.id,
            name,
            company,
            phone,
            scheduledTime: time, // Use scheduledTime instead of time
            status: 'Scheduled',
            created_at: new Date().toISOString()
        };
        
        callsData.calls.push(newCall);
        console.log('Writing to calls.json at:', callsFile);
        saveCalls(callsData);
        
        // Schedule the call using the scheduler
        const jobId = callScheduler.scheduleCall(newCall);
        
        res.json({ 
            success: true, 
            message: 'Call scheduled successfully.', 
            call: newCall,
            jobId: jobId
        });
    } catch (error) {
        console.error('Error scheduling call:', error);
        res.status(500).json({ success: false, message: 'Failed to schedule call' });
    }
});

// Get all scheduled calls for the logged-in user
app.get('/api/scheduled-calls', authenticateToken, (req, res) => {
    const callsData = loadCalls();
    const userCalls = callsData.calls.filter(call => call.userId === req.user.userId);
    res.json({ success: true, calls: userCalls });
});

// Improved scheduler with job management
class CallScheduler {
    constructor(twilioClient, twilioPhoneNumber) {
        this.twilioClient = twilioClient;
        this.twilioPhoneNumber = twilioPhoneNumber;
        this.scheduledJobs = new Map(); // Store job references
        this.isRunning = false;
        this.checkInterval = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('ðŸš€ Call Scheduler started');
        
        // Schedule existing calls
        this.scheduleExistingCalls();
        
        // Start periodic check
        this.checkInterval = setInterval(() => {
            this.checkScheduledCalls();
        }, 60 * 1000); // Check every minute
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('ðŸ›‘ Call Scheduler stopped');
    }

    scheduleExistingCalls() {
        try {
            const callsData = loadCalls();
            console.log(`ðŸ“‹ Scheduling ${callsData.calls.length} existing calls`);
            
            callsData.calls.forEach(call => {
                if (!call.completed && !call.failed) {
                    this.scheduleCall(call);
                }
            });
        } catch (error) {
            console.error('âŒ Error scheduling existing calls:', error);
        }
    }

    scheduleCall(callData) {
        try {
            // Validate callData and get the time field (support both time and scheduledTime)
            if (!callData) {
                console.error(`âŒ Invalid call data for scheduling:`, callData);
                return null;
            }
            
            // Support both 'time' and 'scheduledTime' fields for backward compatibility
            const timeField = callData.scheduledTime || callData.time;
            if (!timeField) {
                console.error(`âŒ No time field found for call ${callData.id}:`, callData);
                return null;
            }

            // Parse the time string and handle timezone correctly
            let callTime;
            
            // If the time is already a Date object, use it
            if (timeField instanceof Date) {
                callTime = timeField;
            } else {
                // If it's a string, parse it as IST time
                const timeString = timeField;
                
                // Validate timeString
                if (!timeString || typeof timeString !== 'string') {
                    console.error(`âŒ Invalid time string for call ${callData.id}:`, timeString);
                    return null;
                }
                
                // Check if it's already in ISO format (UTC)
                if (typeof timeString === 'string' && timeString.includes('T') && timeString.includes('Z')) {
                    // It's already in UTC, convert to IST
                    callTime = new Date(timeString);
                } else if (typeof timeString === 'string') {
                    // It's a local time string, treat it as IST
                    // Create a date object in IST
                    const [datePart, timePart] = timeString.split('T');
                    if (!datePart || !timePart) {
                        console.error(`âŒ Invalid time format for call ${callData.id}:`, timeString);
                        return null;
                    }
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    
                    // Create date in IST (UTC+5:30)
                    callTime = new Date(Date.UTC(year, month - 1, day, hour, minute) - (5.5 * 60 * 60 * 1000));
                } else {
                    console.error(`âŒ Invalid time string type for call ${callData.id}:`, typeof timeString, timeString);
                    return null;
                }
            }
            
            // Validate the parsed time
            if (isNaN(callTime.getTime())) {
                console.error(`âŒ Invalid parsed time for call ${callData.id}:`, callTime);
                return null;
            }
            
            const now = new Date();
            
            // If call is in the future, schedule it
            if (callTime > now) {
                const timeUntilCall = callTime.getTime() - now.getTime();
                const jobId = `call_${callData.id}_${timeField}`;
                
                // Schedule the call
                const timeoutId = setTimeout(() => {
                    this.makeCall(callData);
                }, timeUntilCall);
                
                this.scheduledJobs.set(jobId, {
                    timeoutId,
                    callData,
                    scheduledTime: callTime
                });
                
                // Display in IST
                const istTime = new Date(callTime.getTime() + (5.5 * 60 * 60 * 1000));
                console.log(`ðŸ“… Scheduled call for ${callData.name} (${callData.phone}) at ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
                return jobId;
            } else {
                // Call is due now or in the past
                console.log(`â° Call for ${callData.name} is due now or in the past`);
                const result = this.makeCall(callData);
                if (result === null) {
                    console.log(`âš ï¸  Call to ${callData.name} failed to initiate`);
                }
                return null;
            }
        } catch (error) {
            console.error(`âŒ Error scheduling call for ${callData?.name || 'Unknown'}:`, error);
            return null;
        }
    }

    async makeCall(callData) {
        try {
            console.log(`ðŸš€ Making scheduled call to ${callData.name} (${callData.phone})`);
            
            // Load questions from questions.json
            const questions = loadQuestions();
            
            if (questions.length === 0) {
                console.error('âŒ No questions defined. Please add questions in the admin dashboard.');
                throw new Error('No questions defined');
            }
            
            // Use webhook URL approach instead of inline TwiML
            const publicUrl = process.env.PUBLIC_URL || 'https://hr-team23.onrender.com';
            const twimlUrl = `${publicUrl}/twiml/ask`;
            const statusCallbackUrl = `${publicUrl}/call-status`;
            console.log(`Using TwiML webhook URL: ${twimlUrl}`);
            console.log(`Using status callback URL: ${statusCallbackUrl}`);
            
            // Make the call using Twilio with webhook URL
            const twilioCall = await twilioClient.calls.create({
                url: twimlUrl,
                to: callData.phone,
                from: this.twilioPhoneNumber,
                statusCallback: statusCallbackUrl,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST'
            });
            
            console.log(`âœ… Call initiated for ${callData.name} with SID: ${twilioCall.sid}`);
            
            // Update call status to in progress
            const callsData = loadCalls();
            const callIndex = callsData.calls.findIndex(c => c.id === callData.id);
            if (callIndex !== -1) {
                callsData.calls[callIndex].status = 'in-progress';
                callsData.calls[callIndex].started_at = new Date().toISOString();
                callsData.calls[callIndex].twilio_call_sid = twilioCall.sid;
                saveCalls(callsData);
            }
            
            return twilioCall;
            
        } catch (error) {
            console.error(`âŒ Error making call to ${callData.name}:`, error);
            
            // Update call status to failed
            const callsData = loadCalls();
            const callIndex = callsData.calls.findIndex(c => c.id === callData.id);
            if (callIndex !== -1) {
                callsData.calls[callIndex].failed = true;
                callsData.calls[callIndex].failed_at = new Date().toISOString();
                callsData.calls[callIndex].status = 'failed';
                callsData.calls[callIndex].error = error.message;
                saveCalls(callsData);
            }
            
            // Don't throw the error, just return null
            return null;
        }
    }

    checkScheduledCalls() {
        if (!this.twilioClient) {
            console.log('âš ï¸  Twilio client not available, skipping call check');
            return;
        }

        const callsData = loadCalls();
        const now = new Date();
        
        console.log(`\nðŸ• Scheduler check at ${now.toISOString()} (IST: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
        console.log(`   Total calls: ${callsData.calls.length}`);
        console.log(`   Active jobs: ${this.scheduledJobs.size}`);

        let updated = false;

        for (const call of callsData.calls) {
            // Skip if already completed, failed, or in progress
            if (call.completed || call.failed || call.status === 'in-progress' || call.status === 'completed') {
                continue;
            }

            // Parse call time correctly - support both time and scheduledTime fields
            let callTime;
            const timeField = call.scheduledTime || call.time;
            
            if (timeField instanceof Date) {
                callTime = timeField;
            } else {
                const timeString = timeField;
                if (typeof timeString === 'string' && timeString.includes('T') && timeString.includes('Z')) {
                    callTime = new Date(timeString);
                } else if (typeof timeString === 'string') {
                    const [datePart, timePart] = timeString.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    callTime = new Date(Date.UTC(year, month - 1, day, hour, minute) - (5.5 * 60 * 60 * 1000));
                } else {
                    console.error(`âŒ Invalid time string type for call ${call.id}:`, typeof timeString, timeString);
                    continue;
                }
            }
            
            const timeDiff = callTime - now;
            const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));
            
            // Display in IST
            const istTime = new Date(callTime.getTime() + (5.5 * 60 * 60 * 1000));
            console.log(`   Call ${call.id}: ${call.name} (${call.phone}) - Scheduled: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
            console.log(`     Status: ${call.status || 'Pending'}`);
            console.log(`     Time until call: ${minutesUntilCall} minutes`);
            
            if (callTime <= now) {
                console.log(`   â° Call for ${call.name} is due now or in the past`);
                
                // Mark call as in-progress to prevent duplicate calls
                call.status = 'in-progress';
                call.started_at = new Date().toISOString();
                saveCalls(callsData);
                
                console.log(`   ðŸš€ Making scheduled call to ${call.name} (${call.phone})`);
                // Handle errors from makeCall to prevent server crash
                this.makeCall(call).catch(error => {
                    console.error(`   âŒ Failed to make call to ${call.name}:`, error.message);
                    // Update call status to failed
                    const callsData = loadCalls();
                    const callIndex = callsData.calls.findIndex(c => c.id === call.id);
                    if (callIndex !== -1) {
                        callsData.calls[callIndex].status = 'failed';
                        callsData.calls[callIndex].error = error.message;
                        saveCalls(callsData);
                    }
                });
                updated = true;
            } else {
                console.log(`   â° Call not due yet (${minutesUntilCall} minutes remaining)`);
            }
        }
        
        if (updated) {
            console.log(`   ðŸ’¾ Updated calls data`);
        } else {
            console.log(`   ðŸ“ No updates needed`);
        }
    }

    getScheduledJobs() {
        return Array.from(this.scheduledJobs.values()).map(job => ({
            id: job.callData.id,
            name: job.callData.name,
            phone: job.callData.phone,
            scheduledTime: job.scheduledTime
        }));
    }

    cancelCall(callId) {
        try {
            const jobId = Array.from(this.scheduledJobs.keys()).find(key => key.includes(`call_${callId}_`));
            if (jobId) {
                const job = this.scheduledJobs.get(jobId);
                clearTimeout(job.timeoutId);
                this.scheduledJobs.delete(jobId);
                
                // Update call status to cancelled
                const callsData = loadCalls();
                const call = callsData.calls.find(c => c.id === parseInt(callId));
                if (call) {
                    call.status = 'Cancelled';
                    call.cancelled_at = new Date().toISOString();
                    saveCalls(callsData);
                }
                
                console.log(`âŒ Cancelled call for ${job.callData.name} (${job.callData.phone})`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('âŒ Error cancelling call:', error);
            return false;
        }
    }
}

// Initialize scheduler
const callScheduler = new CallScheduler(twilioClient, ***REMOVED***);

// Start scheduler when server starts
callScheduler.start();

// GET /api/questions
app.get('/api/questions', authenticateToken, (req, res) => {
    try {
        console.log('ðŸ” Questions API called by user:', req.user.email, 'role:', req.user.role);
        
        console.log('ðŸ“ Loading questions from file:', questionsFile);
        const questions = loadQuestions();
        console.log('ðŸ“Š Loaded questions:', questions);
        
        res.json({ 
            success: true, 
            questions: questions 
        });
    } catch (error) {
        console.error('âŒ Error fetching questions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch questions: ' + error.message 
        });
    }
});

// Update questions
app.put('/api/questions', authenticateToken, (req, res) => {
    try {
        console.log('ðŸ” Questions update API called by user:', req.user.email, 'role:', req.user.role);
        
        const { questions } = req.body;

        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Questions array is required' 
            });
        }

        // Filter out empty questions
        const validQuestions = questions.filter(q => q && q.trim() !== '');

        if (validQuestions.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'At least one question is required' 
            });
        }

        if (saveQuestions(validQuestions)) {
            console.log(`ðŸ“ Questions updated successfully by ${req.user.email}: ${validQuestions.length} questions`);
            res.json({ 
                success: true, 
                message: 'Questions updated successfully',
                questions: validQuestions
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to save questions' 
            });
        }
    } catch (error) {
        console.error('âŒ Error updating questions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update questions: ' + error.message 
        });
    }
});

// Test endpoint to verify TwiML functionality
app.get('/test-twiml', (req, res) => {
    const questions = loadQuestions();
    const questionIndex = parseInt(req.query.questionIndex || '0', 10);
    
    const response = new VoiceResponse();
    
    if (questionIndex === 0) {
        // First time - greeting
        response.say('Hello, this is a test call. Please answer the following questions.');
        response.redirect({ method: 'GET' }, `/test-twiml?questionIndex=1`);
    } else if (questionIndex <= questions.length) {
        // Ask the current question
        const currentQuestionIndex = questionIndex - 1; // Convert to 0-based index
        const gather = response.gather({
            input: 'speech dtmf',
            numDigits: 1,
            action: `/test-twiml?questionIndex=${questionIndex + 1}`,
            method: 'GET',
            timeout: 10,
            speechTimeout: 'auto'
        });
        
        gather.say(`Question ${questionIndex}: ${questions[currentQuestionIndex]}`);
        
        // If no response, repeat the question
        response.say(`Question ${questionIndex}: ${questions[currentQuestionIndex]}`);
        response.redirect({ method: 'GET' }, `/test-twiml?questionIndex=${questionIndex}`);
    } else {
        response.say('Thank you for your responses. Goodbye!');
        response.hangup();
    }
    
    res.type('text/xml');
    res.send(response.toString());
});

// TwiML webhook to ask questions and collect responses
app.post('/twiml/ask', express.urlencoded({ extended: false }), (req, res) => {
    try {
        const callSid = req.body.CallSid;
        const digits = req.body.SpeechResult || req.body.Digits;
        const questionIndex = parseInt(req.query.questionIndex || req.body.questionIndex || '0', 10);
        const questions = loadQuestions();
        let responses = loadResponses();
        
        console.log(`ðŸ“ž TwiML Request - CallSid: ${callSid}, QuestionIndex: ${questionIndex}, Response: ${digits}`);
        
        // Validate questions exist
        if (!questions || questions.length === 0) {
            console.error('âŒ No questions found in questions.json');
            const response = new VoiceResponse();
            response.say('Sorry, there are no questions configured. Please contact the administrator.');
            response.hangup();
            res.type('text/xml');
            return res.send(response.toString());
        }
        
        let callResponse = responses.find(r => r.callSid === callSid);
        if (!callResponse) {
            // Generate a unique ID for the new response
            const responseId = `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Get the call to find the userId
            const callsData = loadCalls();
            const call = callsData.calls.find(c => c.twilio_call_sid === callSid);
            const userId = call ? call.userId : null;
            
            callResponse = { 
                id: responseId,
                callSid,
                userId,
                answers: new Array(questions.length).fill(''), 
                confidences: new Array(questions.length).fill(0),
                timestamp: new Date().toISOString() 
            };
            responses.push(callResponse);
            console.log(`ðŸ†” Created new response with ID: ${responseId} for call: ${callSid}, userId: ${userId}`);
        }
        
        const response = new VoiceResponse();
        
        if (questionIndex === 0) {
            // First time - greeting with person's name and company
            const callsData = loadCalls();
            const call = callsData.calls.find(c => c.twilio_call_sid === callSid);
            
            if (call && call.name && call.company) {
                response.say(`Hi ${call.name}, calling from ${call.company}. Please answer the following questions.`);
            } else if (call && call.name) {
                response.say(`Hi ${call.name}, this is an automated call. Please answer the following questions.`);
            } else {
                response.say('Hello, this is an automated call. Please answer the following questions.');
            }
            response.redirect({ method: 'POST' }, `/twiml/ask?questionIndex=1`);
        } else if (questionIndex <= questions.length) {
            // Store response from previous question if present
            if (digits !== undefined && questionIndex > 1) {
                const previousQuestionIndex = questionIndex - 2; // Convert to 0-based index
                callResponse.answers[previousQuestionIndex] = digits;
                callResponse.confidences[previousQuestionIndex] = parseFloat(req.body.Confidence) || 0;
                saveResponses(responses);
                console.log(`ðŸ’¾ Stored response for question ${previousQuestionIndex + 1} (${questions[previousQuestionIndex]}): ${digits}`);
            }
            
            // Ask the current question
            const currentQuestionIndex = questionIndex - 1; // Convert to 0-based index
            const gather = response.gather({
                input: 'speech dtmf',
                numDigits: 1,
                action: `/twiml/ask?questionIndex=${questionIndex + 1}`,
                method: 'POST',
                timeout: 15,
                speechTimeout: 'auto'
            });
            
            gather.say(`Question ${questionIndex}: ${questions[currentQuestionIndex]}`);
            console.log(`â“ Asking question ${questionIndex}: ${questions[currentQuestionIndex]}`);
            
            // If no response within timeout, move to next question
            response.say(`Question ${questionIndex}: ${questions[currentQuestionIndex]}`);
            response.redirect({ method: 'POST' }, `/twiml/ask?questionIndex=${questionIndex + 1}`);
        } else {
            // Store response from the last question
            if (digits !== undefined) {
                const lastQuestionIndex = questions.length - 1;
                callResponse.answers[lastQuestionIndex] = digits;
                callResponse.confidences[lastQuestionIndex] = parseFloat(req.body.Confidence) || 0;
                saveResponses(responses);
                console.log(`ðŸ’¾ Stored final response for question ${lastQuestionIndex + 1} (${questions[lastQuestionIndex]}): ${digits}`);
            }
            
            // All questions completed
            response.say('Thank you for your responses. Goodbye!');
            response.hangup();
            console.log(`âœ… Call completed for CallSid: ${callSid}`);
            
            // Update call status to completed
            const callsData = loadCalls();
            const call = callsData.calls.find(c => c.twilio_call_sid === callSid);
            if (call) {
                call.completed = true;
                call.completed_at = new Date().toISOString();
                call.status = 'completed';
                saveCalls(callsData);
                console.log(`âœ… Updated call ${call.id} status to completed`);
            }
        }
        
        res.type('text/xml');
        res.send(response.toString());
        
    } catch (error) {
        console.error('âŒ Error in TwiML webhook:', error);
        
        // Send a safe TwiML response
        const response = new VoiceResponse();
        response.say('Sorry, there was an error processing your call. Please try again later.');
        response.hangup();
        
        res.type('text/xml');
        res.send(response.toString());
    }
});

// Direct call endpoint - make call immediately
app.post('/api/direct-call', authenticateToken, async (req, res) => {
    if (!twilioClient) {
        return res.status(400).json({ 
            success: false, 
            message: 'Twilio client not configured' 
        });
    }
    
    const { name, company, phone } = req.body;
    if (!name || !company || !phone) {
        return res.status(400).json({ 
            success: false, 
            message: 'Name, company, and phone number are required.' 
        });
    }
    
    try {
        const publicUrl = process.env.PUBLIC_URL || 'https://hr-team23.onrender.com';
        const twimlUrl = `${publicUrl}/twiml/ask`;
        const statusCallbackUrl = `${publicUrl}/call-status`;
        console.log(`Making direct call to ${name} (${phone}) at ${twimlUrl}`);
        
        // Make the call immediately
        const call = await twilioClient.calls.create({
            url: twimlUrl,
            to: phone,
            from: ***REMOVED***,
            statusCallback: statusCallbackUrl,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
        });
        
        // Save call record for tracking
        const callsData = loadCalls();
        const newCall = {
            id: callsData.calls.length + 1,
            userId: req.user.userId,
            name,
            company,
            phone,
            time: new Date().toISOString(),
            created_at: new Date().toISOString(),
            completed: true,
            completed_at: new Date().toISOString(),
            direct_call: true,
            twilio_call_sid: call.sid
        };
        callsData.calls.push(newCall);
        saveCalls(callsData);
        
        console.log(`Direct call made successfully to ${name} (${phone})`);
        
        res.json({ 
            success: true, 
            message: 'Call initiated successfully!',
            call: newCall
        });
    } catch (err) {
        console.error('Error making direct call:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to make call: ' + err.message 
        });
    }
});

// Manual call trigger for testing (admin only)
app.post('/api/trigger-call/:callId', authenticateToken, async (req, res) => {
    if (!twilioClient) {
        return res.status(400).json({ 
            success: false, 
            message: 'Twilio client not configured' 
        });
    }
    
    const callId = parseInt(req.params.callId);
    const callsData = loadCalls();
    const call = callsData.calls.find(c => c.id === callId);
    
    if (!call) {
        return res.status(404).json({ 
            success: false, 
            message: 'Call not found' 
        });
    }
    
    if (call.userId !== req.user.userId) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized to trigger this call' 
        });
    }
    
    try {
        const publicUrl = process.env.PUBLIC_URL || 'https://hr-team23.onrender.com';
        const twimlUrl = `${publicUrl}/twiml/ask`;
        const statusCallbackUrl = `${publicUrl}/call-status`;
        console.log(`Manually triggering call to ${call.name} (${call.phone}) at ${twimlUrl}`);
        console.log(`IST Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        
        await twilioClient.calls.create({
            url: twimlUrl,
            to: call.phone,
            from: ***REMOVED***,
            statusCallback: statusCallbackUrl,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
        });
        
        call.completed = true;
        call.completed_at = new Date().toISOString();
        call.manual_trigger = true;
        saveCalls(callsData);
        
        res.json({ 
            success: true, 
            message: 'Call triggered successfully' 
        });
    } catch (err) {
        console.error('Error triggering call:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to trigger call: ' + err.message 
        });
    }
});

// Scheduler management endpoints
app.get('/api/scheduler/jobs', authenticateToken, (req, res) => {
    try {
        const jobs = callScheduler.getScheduledJobs();
        res.json({ 
            success: true, 
            jobs: jobs,
            totalJobs: jobs.length,
            schedulerRunning: callScheduler.isRunning
        });
    } catch (error) {
        console.error('Error getting scheduled jobs:', error);
        res.status(500).json({ success: false, message: 'Failed to get scheduled jobs' });
    }
});

app.post('/api/scheduler/cancel/:callId', authenticateToken, (req, res) => {
    try {
        const callId = req.params.callId;
        const success = callScheduler.cancelCall(callId);
        
        if (success) {
            res.json({ success: true, message: 'Call cancelled successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Call not found or already completed' });
        }
    } catch (error) {
        console.error('Error cancelling call:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel call' });
    }
});

app.post('/api/scheduler/restart', authenticateToken, (req, res) => {
    try {
        callScheduler.stop();
        callScheduler.start();
        res.json({ success: true, message: 'Scheduler restarted successfully' });
    } catch (error) {
        console.error('Error restarting scheduler:', error);
        res.status(500).json({ success: false, message: 'Failed to restart scheduler' });
    }
});

app.get('/api/scheduler/status', authenticateToken, (req, res) => {
    try {
        const jobs = callScheduler.getScheduledJobs();
        const callsData = loadCalls();
        const pendingCalls = callsData.calls.filter(call => !call.completed && !call.failed);
        const completedCalls = callsData.calls.filter(call => call.completed);
        const failedCalls = callsData.calls.filter(call => call.failed);
        
        res.json({
            success: true,
            schedulerRunning: callScheduler.isRunning,
            activeJobs: jobs.length,
            totalCalls: callsData.calls.length,
            pendingCalls: pendingCalls.length,
            completedCalls: completedCalls.length,
            failedCalls: failedCalls.length,
            twilioConfigured: !!twilioClient
        });
    } catch (error) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({ success: false, message: 'Failed to get scheduler status' });
    }
});

// Call status callback endpoint
app.post('/call-status', express.urlencoded({ extended: false }), (req, res) => {
    try {
        const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
        
        console.log(`ðŸ“ž Call status update for CallSid: ${CallSid}`);
        console.log(`   Status: ${CallStatus}`);
        console.log(`   Duration: ${CallDuration} seconds`);
        console.log(`   Recording URL: ${RecordingUrl}`);
        
        // Update call record with status information
        const callsData = loadCalls();
        const call = callsData.calls.find(c => c.twilio_call_sid === CallSid);
        
        if (call) {
            call.call_status = CallStatus;
            call.call_duration = CallDuration;
            call.recording_url = RecordingUrl;
            call.status_updated_at = new Date().toISOString();
            
            // Mark as completed if call ended
            if (CallStatus === 'completed' || CallStatus === 'busy' || CallStatus === 'no-answer' || CallStatus === 'failed') {
                call.completed = true;
                call.completed_at = new Date().toISOString();
                call.status = CallStatus === 'completed' ? 'completed' : 'failed';
            }
            
            saveCalls(callsData);
            console.log(`âœ… Updated call ${call.id} with status: ${CallStatus}`);
        } else {
            console.log(`âš ï¸  Call not found for CallSid: ${CallSid}`);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('âŒ Error handling call status:', error);
        res.status(500).send('Error');
    }
});

// Recording status callback endpoint (like Python version)
app.post('/recording_status', express.urlencoded({ extended: false }), (req, res) => {
    try {
        const { CallSid, RecordingSid, RecordingUrl, RecordingStatus } = req.body;
        
        console.log(`ðŸ“¹ Recording status update for CallSid: ${CallSid}`);
        console.log(`   RecordingSid: ${RecordingSid}`);
        console.log(`   Status: ${RecordingStatus}`);
        console.log(`   URL: ${RecordingUrl}`);
        
        // Update call record with recording information
        const callsData = loadCalls();
        const call = callsData.calls.find(c => c.twilio_call_sid === CallSid);
        
        if (call) {
            call.recording_sid = RecordingSid;
            call.recording_url = RecordingUrl;
            call.recording_status = RecordingStatus;
            call.recording_updated_at = new Date().toISOString();
            saveCalls(callsData);
            
            console.log(`âœ… Updated call ${call.id} with recording info`);
        } else {
            console.log(`âš ï¸  Call not found for CallSid: ${CallSid}`);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('âŒ Error handling recording status:', error);
        res.status(500).send('Error');
    }
});

// Excel download endpoint for user call responses
app.get('/api/download-responses', authenticateToken, (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only admins can download response data' 
            });
        }

        const responses = loadResponses();
        const callsData = loadCalls();
        const usersData = loadUsers();

        if (responses.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No response data available for download' 
            });
        }

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = responses.map(response => {
            // Find corresponding call data
            const call = callsData.calls.find(c => c.twilio_call_sid === response.callSid);
            const user = usersData.users.find(u => u.id === (call ? call.userId : null));
            
            return {
                'Response ID': response.id || 'N/A',
                'Call SID': response.callSid || 'N/A',
                'User Name': user ? user.name : 'N/A',
                'User Email': user ? user.email : 'N/A',
                'Phone Number': call ? call.phone : 'N/A',
                'Call Date': call ? new Date(call.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
                'Question 1': response.answers && response.answers.length > 0 ? response.answers[0] : 'N/A',
                'Question 2': response.answers && response.answers.length > 1 ? response.answers[1] : 'N/A',
                'Question 3': response.answers && response.answers.length > 2 ? response.answers[2] : 'N/A',
                'Question 4': response.answers && response.answers.length > 3 ? response.answers[3] : 'N/A',
                'Question 5': response.answers && response.answers.length > 4 ? response.answers[4] : 'N/A',
                'Total Questions Answered': response.answers ? response.answers.length : 0,
                'Response Date': new Date(response.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                'Call Status': call ? (call.completed ? 'Completed' : call.failed ? 'Failed' : 'Pending') : 'N/A',
                'Recording URL': call ? (call.recording_url || 'N/A') : 'N/A'
            };
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const columnWidths = [
            { wch: 15 }, // Response ID
            { wch: 35 }, // Call SID
            { wch: 20 }, // User Name
            { wch: 25 }, // User Email
            { wch: 15 }, // Phone Number
            { wch: 20 }, // Call Date
            { wch: 30 }, // Question 1
            { wch: 30 }, // Question 2
            { wch: 30 }, // Question 3
            { wch: 30 }, // Question 4
            { wch: 30 }, // Question 5
            { wch: 20 }, // Total Questions Answered
            { wch: 20 }, // Response Date
            { wch: 15 }, // Call Status
            { wch: 50 }  // Recording URL
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Call Responses');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `call_responses_${timestamp}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to buffer and send
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

        console.log(`ðŸ“Š Excel report downloaded: ${filename} with ${responses.length} responses`);

    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate Excel report: ' + error.message 
        });
    }
});

// API endpoint to get all calls
app.get('/api/calls', authenticateToken, (req, res) => {
    try {
        const callsData = loadCalls();
        res.json({ 
            success: true, 
            calls: callsData.calls 
        });
    } catch (error) {
        console.error('Error fetching calls:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch calls' 
        });
    }
});

// API endpoint to get all responses
app.get('/api/responses', authenticateToken, (req, res) => {
    try {
        const responses = loadResponses();
        const callsData = loadCalls();
        const usersData = loadUsers();

        console.log('ðŸ” Raw responses from loadResponses():', responses);
        console.log('ðŸ“‹ First response object:', responses[0]);
        console.log('ðŸ†” First response ID:', responses[0]?.id);

        // Enhance response data with user and call information
        const enhancedResponses = responses.map(response => {
            console.log('ðŸ” Processing response:', response);
            console.log('ðŸ†” Response ID before enhancement:', response.id);
            
            const call = callsData.calls.find(c => c.twilio_call_sid === response.callSid);
            const user = usersData.users.find(u => u.id === (call ? call.userId : null));
            
            const enhancedResponse = {
                ...response,
                userName: user ? user.name : 'N/A',
                phone: call ? call.phone : 'N/A'
            };
            
            console.log('ðŸ†” Response ID after enhancement:', enhancedResponse.id);
            console.log('ðŸ“‹ Enhanced response object:', enhancedResponse);
            
            return enhancedResponse;
        });

        console.log('ðŸ“Š Final enhanced responses:', enhancedResponses);
        console.log('ðŸ†” First enhanced response ID:', enhancedResponses[0]?.id);

        res.json({ 
            success: true, 
            responses: enhancedResponses 
        });
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch responses' 
        });
    }
});

// API endpoint to get individual response details
app.get('/api/responses/:responseId', authenticateToken, (req, res) => {
    try {
        const responseId = req.params.responseId;
        const responses = loadResponses();
        const callsData = loadCalls();
        const usersData = loadUsers();

        let response;
        
        // First, try to find by original ID
        response = responses.find(r => r.id === responseId);
        
        // If not found and it's a generated ID (format: resp-{callSid}-{index})
        if (!response && responseId.startsWith('resp-')) {
            const parts = responseId.split('-');
            if (parts.length >= 3) {
                const callSid = parts[1];
                response = responses.find(r => r.callSid === callSid);
            }
        }

        if (!response) {
            console.log(`âŒ Response not found for ID: ${responseId}`);
            console.log(`ðŸ“‹ Available response IDs:`, responses.map(r => r.id));
            return res.status(404).json({ 
                success: false, 
                message: 'Response not found' 
            });
        }

        // Enhance response data with user and call information
        const call = callsData.calls.find(c => c.twilio_call_sid === response.callSid);
        const user = usersData.users.find(u => u.id === (call ? call.userId : null));
        
        const enhancedResponse = {
            ...response,
            id: responseId, // Use the requested ID
            userName: user ? user.name : 'N/A',
            phone: call ? call.phone : 'N/A',
            contactName: call ? call.name : 'N/A'
        };

        res.json({ 
            success: true, 
            response: enhancedResponse 
        });
    } catch (error) {
        console.error('Error fetching response details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch response details' 
        });
    }
});

// API endpoint to get all transcripts
app.get('/api/transcripts', authenticateToken, (req, res) => {
    try {
        const transcripts = loadTranscripts();
        const usersData = loadUsers();

        // Enhance transcript data with user information
        const enhancedTranscripts = transcripts.map(transcript => {
            const user = usersData.users.find(u => u.id === transcript.userId);
            
            return {
                ...transcript,
                userName: user ? user.name : 'N/A',
                userEmail: user ? user.email : 'N/A'
            };
        });

        res.json({ 
            success: true, 
            transcripts: enhancedTranscripts 
        });
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch transcripts' 
        });
    }
});

// Individual transcript download
app.get('/api/download-transcript/:transcriptId', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only admins can download transcript reports' 
            });
        }

        const transcriptId = req.params.transcriptId;
        const transcripts = loadTranscripts();
        const transcript = transcripts.find(t => t.id === transcriptId);
        
        if (!transcript) {
            return res.status(404).json({ 
                success: false, 
                message: 'Transcript not found' 
            });
        }

        const usersData = loadUsers();
        const user = usersData.users.find(u => u.id === transcript.userId);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Prepare transcript data
        const transcriptData = [{
            'Transcript ID': transcript.id,
            'Call SID': transcript.callSid,
            'User Name': user ? user.name : 'N/A',
            'Contact Name': transcript.contactName,
            'Phone Number': transcript.phone,
            'Call Date': new Date(transcript.callDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            'Duration': transcript.duration,
            'Words Count': transcript.wordsCount,
            'Confidence Score': transcript.confidence,
            'Total Questions': transcript.summary.totalQuestions,
            'Questions Answered': transcript.summary.questionsAnswered,
            'Average Confidence': transcript.summary.averageConfidence,
            'Key Topics': transcript.summary.keyTopics.join(', '),
            'Sentiment': transcript.summary.sentiment
        }];

        const worksheet = XLSX.utils.json_to_sheet(transcriptData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transcript Summary');

        // Add detailed transcript sheet
        const detailedData = transcript.transcript.map((entry, index) => ({
            'Line': index + 1,
            'Speaker': entry.speaker,
            'Text': entry.text,
            'Timestamp': entry.timestamp,
            'Confidence': entry.confidence || 'N/A'
        }));

        const detailedWorksheet = XLSX.utils.json_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(workbook, detailedWorksheet, 'Detailed Transcript');

        const filename = `transcript_report_${transcriptId}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

    } catch (error) {
        console.error('Error generating transcript report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate transcript report: ' + error.message 
        });
    }
});

// Download all transcripts
app.get('/api/download-transcripts-report', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only admins can download transcripts reports' 
            });
        }

        const transcripts = loadTranscripts();
        const usersData = loadUsers();

        if (transcripts.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No transcript data available for download' 
            });
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Prepare transcripts summary data
        const excelData = transcripts.map(transcript => {
            const user = usersData.users.find(u => u.id === transcript.userId);
            return {
                'Transcript ID': transcript.id,
                'Call SID': transcript.callSid,
                'User Name': user ? user.name : 'N/A',
                'Contact Name': transcript.contactName,
                'Phone Number': transcript.phone,
                'Call Date': new Date(transcript.callDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                'Duration': transcript.duration,
                'Words Count': transcript.wordsCount,
                'Confidence Score': transcript.confidence,
                'Total Questions': transcript.summary.totalQuestions,
                'Questions Answered': transcript.summary.questionsAnswered,
                'Average Confidence': transcript.summary.averageConfidence,
                'Key Topics': transcript.summary.keyTopics.join(', '),
                'Sentiment': transcript.summary.sentiment
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transcripts Summary');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `transcripts_report_${timestamp}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

    } catch (error) {
        console.error('Error generating transcripts report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate transcripts report: ' + error.message 
        });
    }
});

// Download all reports (placeholder - would need zip functionality)
app.get('/api/download-all-reports', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only admins can download all reports' 
            });
        }

        // For now, just download the responses report as a placeholder
        // In a full implementation, you'd create a zip file with all reports
        const responses = loadResponses();
        const callsData = loadCalls();
        const usersData = loadUsers();

        if (responses.length === 0 && callsData.calls.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No data available for download' 
            });
        }

        // Create workbook with multiple sheets
        const workbook = XLSX.utils.book_new();
        
        // Add calls sheet
        if (callsData.calls.length > 0) {
            const callsData = loadCalls();
            const usersData = loadUsers();
            
            const callsExcelData = callsData.calls.map(call => {
                const user = usersData.users.find(u => u.id === call.userId);
                return {
                    'Call ID': call.id,
                    'User Name': user ? user.name : 'N/A',
                    'Contact Name': call.name,
                    'Phone Number': call.phone,
                    'Scheduled Time': new Date(call.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    'Status': call.completed ? 'Completed' : call.failed ? 'Failed' : 'Pending',
                    'Created At': new Date(call.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                };
            });
            
            const callsWorksheet = XLSX.utils.json_to_sheet(callsExcelData);
            XLSX.utils.book_append_sheet(workbook, callsWorksheet, 'Calls');
        }

        // Add responses sheet
        if (responses.length > 0) {
            const responsesExcelData = responses.map(response => {
                const call = callsData.calls.find(c => c.twilio_call_sid === response.callSid);
                const user = usersData.users.find(u => u.id === (call ? call.userId : null));
                
                return {
                    'Response ID': response.id || 'N/A',
                    'User Name': user ? user.name : 'N/A',
                    'Phone Number': call ? call.phone : 'N/A',
                    'Questions Answered': response.answers ? response.answers.length : 0,
                    'Response Date': new Date(response.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                };
            });
            
            const responsesWorksheet = XLSX.utils.json_to_sheet(responsesExcelData);
            XLSX.utils.book_append_sheet(workbook, responsesWorksheet, 'Responses');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `all_reports_${timestamp}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

    } catch (error) {
        console.error('Error generating all reports:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate all reports: ' + error.message 
        });
    }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Get individual call details
app.get('/api/calls/:callId', authenticateToken, (req, res) => {
    try {
        const callId = req.params.callId;
        const callsData = loadCalls();
        const call = callsData.calls.find(c => c.id == callId);
        
        if (!call) {
            return res.status(404).json({ 
                success: false, 
                message: 'Call not found' 
            });
        }

        // Allow users to view their own calls or admins to view any call
        if (req.user.role !== 'admin' && call.userId !== req.user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only view your own calls' 
            });
        }

        const usersData = loadUsers();
        const user = usersData.users.find(u => u.id === call.userId);
        
        const callWithUser = {
            ...call,
            userName: user ? user.name : 'N/A'
        };

        res.json({ 
            success: true, 
            call: callWithUser 
        });
    } catch (error) {
        console.error('Error fetching call details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch call details' 
        });
    }
});

// Update individual call
app.put('/api/calls/:callId', authenticateToken, (req, res) => {
    try {
        const callId = req.params.callId;
        const { name, company, phone, time } = req.body;

        if (!name || !company || !phone || !time) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, company, phone, and time are required' 
            });
        }

        const callsData = loadCalls();
        const callIndex = callsData.calls.findIndex(c => c.id == callId);
        
        if (callIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Call not found' 
            });
        }

        const call = callsData.calls[callIndex];
        
        // Allow users to edit their own calls or admins to edit any call
        if (req.user.role !== 'admin' && call.userId !== req.user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only edit your own calls' 
            });
        }
        
        // Don't allow editing completed or failed calls
        if (call.status === 'completed' || call.status === 'failed') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot edit completed or failed calls' 
            });
        }

        // Update call details - properly handle timezone conversion
        // The datetime-local input provides local time, but we want to treat it as IST time
        const localDateTime = new Date(time);
        
        // Create a new date object treating the input as IST time (UTC+5:30)
        const istYear = localDateTime.getFullYear();
        const istMonth = localDateTime.getMonth();
        const istDay = localDateTime.getDate();
        const istHour = localDateTime.getHours();
        const istMinute = localDateTime.getMinutes();
        
        // Create UTC time by subtracting IST offset (5:30 hours)
        const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
        const utcTime = new Date(Date.UTC(istYear, istMonth, istDay, istHour, istMinute) - istOffset);
        
        callsData.calls[callIndex] = {
            ...call,
            name: name.trim(),
            company: company.trim(),
            phone: phone.trim(),
            scheduledTime: utcTime.toISOString(),
            updated_at: new Date().toISOString()
        };

        // Save updated calls
        if (saveCalls(callsData)) {
            console.log(`ðŸ“ Call ${callId} updated successfully`);
            
            // Cancel any existing scheduled job for this call
            const jobKeys = Array.from(callScheduler.scheduledJobs.keys());
            const existingJobKey = jobKeys.find(key => key.startsWith(`call_${callId}_`));
            
            if (existingJobKey) {
                const existingJob = callScheduler.scheduledJobs.get(existingJobKey);
                if (existingJob && existingJob.timeoutId) {
                    clearTimeout(existingJob.timeoutId);
                }
                callScheduler.scheduledJobs.delete(existingJobKey);
                console.log(`ðŸ—‘ï¸ Cancelled existing scheduled job for call ${callId}`);
            }
            
            // Schedule the updated call
            callScheduler.scheduleCall(callsData.calls[callIndex]);
            
            res.json({ 
                success: true, 
                message: 'Call updated successfully' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to save call updates' 
            });
        }
    } catch (error) {
        console.error('Error updating call:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update call: ' + error.message 
        });
    }
});

// Delete individual call
app.delete('/api/calls/:callId', authenticateToken, (req, res) => {
    try {
        const callId = req.params.callId;
        const callsData = loadCalls();
        const callIndex = callsData.calls.findIndex(c => c.id == callId);
        
        if (callIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Call not found' 
            });
        }

        const call = callsData.calls[callIndex];
        
        // Allow users to delete their own calls or admins to delete any call
        if (req.user.role !== 'admin' && call.userId !== req.user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only delete your own calls' 
            });
        }
        
        // Cancel scheduled job if exists
        const jobKeys = Array.from(callScheduler.scheduledJobs.keys());
        const existingJobKey = jobKeys.find(key => key.startsWith(`call_${callId}_`));
        
        if (existingJobKey) {
            const existingJob = callScheduler.scheduledJobs.get(existingJobKey);
            if (existingJob && existingJob.timeoutId) {
                clearTimeout(existingJob.timeoutId);
            }
            callScheduler.scheduledJobs.delete(existingJobKey);
            console.log(`ðŸ—‘ï¸ Cancelled scheduled job for call ${callId}`);
        }

        // Remove call from array
        callsData.calls.splice(callIndex, 1);

        // Save updated calls
        if (saveCalls(callsData)) {
            console.log(`ðŸ—‘ï¸ Call ${callId} deleted successfully`);
            res.json({ 
                success: true, 
                message: 'Call deleted successfully' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to save call deletion' 
            });
        }
    } catch (error) {
        console.error('Error deleting call:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete call: ' + error.message 
        });
    }
});

// Trigger call immediately
app.post('/api/trigger-call/:callId', authenticateToken, (req, res) => {
    try {
        const callId = req.params.callId;
        const callsData = loadCalls();
        const callIndex = callsData.calls.findIndex(c => c.id == callId);
        
        if (callIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Call not found' 
            });
        }

        const call = callsData.calls[callIndex];
        
        // Allow users to trigger their own calls or admins to trigger any call
        if (req.user.role !== 'admin' && call.userId !== req.user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only trigger your own calls' 
            });
        }
        
        // Don't allow triggering completed or failed calls
        if (call.status === 'completed' || call.status === 'failed') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot trigger completed or failed calls' 
            });
        }

        console.log(`ðŸš€ Call ${callId} triggered immediately by ${req.user.role === 'admin' ? 'admin' : 'user'}`);
        
        // Make the call immediately
        makeCall(call)
            .then(() => {
                res.json({ 
                    success: true, 
                    message: 'Call triggered successfully' 
                });
            })
            .catch(error => {
                console.error('Error making triggered call:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to trigger call: ' + error.message 
                });
            });

    } catch (error) {
        console.error('Error triggering call:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to trigger call: ' + error.message 
        });
    }
});

// Handle call responses
app.post('/handle-response', (req, res) => {
    try {
        const { question, callId } = req.query;
        const speechResult = req.body.SpeechResult;
        const confidence = req.body.Confidence;
        
        console.log(`ðŸ“ Received response for question ${question} from call ${callId}: ${speechResult}`);
        
        // Load existing responses
        const responses = loadResponses();
        
        // Find or create response record for this call
        let responseRecord = responses.find(r => r.callSid === callId);
        if (!responseRecord) {
            responseRecord = {
                id: `resp-${Date.now()}`,
                callSid: callId,
                answers: [],
                confidences: [],
                timestamp: new Date().toISOString()
            };
            responses.push(responseRecord);
        }
        
        // Add the answer
        responseRecord.answers[parseInt(question) - 1] = speechResult || 'No response';
        responseRecord.confidences[parseInt(question) - 1] = confidence || 0;
        
        // Save responses
        saveResponses(responses);
        
        // Create TwiML response
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Thank you for your response.');
        
        res.type('text/xml');
        res.send(twiml.toString());
        
    } catch (error) {
        console.error('Error handling response:', error);
        res.status(500).send('Error processing response');
    }
});


// Export call to Word document
app.get('/api/calls/:callId/export-word', authenticateToken, async (req, res) => {
    try {
        const callId = req.params.callId;
        const callsData = loadCalls();
        const call = callsData.calls.find(c => c.id == callId);
        
        if (!call) {
            return res.status(404).json({ 
                success: false, 
                message: 'Call not found' 
            });
        }

        // Allow users to export their own calls or admins to export any call
        if (req.user.role !== 'admin' && call.userId !== req.user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only export your own calls' 
            });
        }

        const usersData = loadUsers();
        const user = usersData.users.find(u => u.id === call.userId);
        const responses = loadResponses();
        const questions = loadQuestions();
        
        // Find response for this call
        const response = responses.find(r => r.callSid === call.twilio_call_sid);

        // Create Word document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        text: "Call Report",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: {
                            after: 400
                        }
                    }),
                    
                    // Call Details Section
                    new Paragraph({
                        text: "Call Details",
                        heading: HeadingLevel.HEADING_2,
                        spacing: {
                            before: 400,
                            after: 200
                        }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Call ID: ", bold: true }),
                            new TextRun({ text: call.id })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Contact Name: ", bold: true }),
                            new TextRun({ text: call.name || 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Company: ", bold: true }),
                            new TextRun({ text: call.company || 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Phone Number: ", bold: true }),
                            new TextRun({ text: call.phone || 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Scheduled Time: ", bold: true }),
                            new TextRun({ text: call.scheduledTime ? 
                                new Date(call.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Status: ", bold: true }),
                            new TextRun({ text: call.status || 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Created By: ", bold: true }),
                            new TextRun({ text: user ? user.name : 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Created At: ", bold: true }),
                            new TextRun({ text: call.created_at ? 
                                new Date(call.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A' })
                        ],
                        spacing: { after: 400 }
                    }),
                    
                    // Questions and Answers Section
                    new Paragraph({
                        text: "Questions and Answers",
                        heading: HeadingLevel.HEADING_2,
                        spacing: {
                            before: 400,
                            after: 200
                        }
                    })
                ]
            }]
        });

        // Add questions and answers if response exists
        if (response && response.answers && response.answers.length > 0) {
            response.answers.forEach((answer, index) => {
                const question = questions[index] || `Question ${index + 1}`;
                const confidence = response.confidences ? response.confidences[index] : null;
                
                doc.addSection({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: `Q${index + 1}: `, bold: true }),
                                new TextRun({ text: question })
                            ],
                            spacing: { after: 100 }
                        }),
                        
                        new Paragraph({
                            children: [
                                new TextRun({ text: `A${index + 1}: `, bold: true }),
                                new TextRun({ text: answer || 'No response' })
                            ],
                            spacing: { after: 100 }
                        }),
                        
                        ...(confidence ? [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Confidence: ", bold: true }),
                                    new TextRun({ text: `${(confidence * 100).toFixed(2)}%` })
                                ],
                                spacing: { after: 200 }
                            })
                        ] : [
                            new Paragraph({
                                spacing: { after: 200 }
                            })
                        ])
                    ]
                });
            });
        } else {
            // No responses available
            doc.addSection({
                children: [
                    new Paragraph({
                        text: "No responses available for this call.",
                        spacing: { after: 200 }
                    })
                ]
            });
        }

        // Generate document buffer
        const buffer = await Packer.toBuffer(doc);
        
        // Set response headers
        const filename = `call_report_${callId}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(buffer);

    } catch (error) {
        console.error('Error generating Word document:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate Word document: ' + error.message 
        });
    }
});

// Individual response download as Word document
app.get('/api/download-response-report/:responseId', authenticateToken, async (req, res) => {
    try {
        const responseId = req.params.responseId;
        const responses = loadResponses();
        const callsData = loadCalls();
        const usersData = loadUsers();
        
        let response;
        
        // First, try to find by original ID
        response = responses.find(r => r.id === responseId);
        
        // If not found and it's a generated ID (format: resp-{callSid}-{index})
        if (!response && responseId.startsWith('resp-')) {
            const parts = responseId.split('-');
            if (parts.length >= 3) {
                const callSid = parts[1];
                response = responses.find(r => r.callSid === callSid);
            }
        }
        
        if (!response) {
            console.log(`âŒ Response not found for download ID: ${responseId}`);
            console.log(`ðŸ“‹ Available response IDs:`, responses.map(r => r.id));
            return res.status(404).json({ 
                success: false, 
                message: 'Response not found' 
            });
        }

        // Check authorization - users can only download their own responses, admins can download any
        const call = callsData.calls.find(c => c.twilio_call_sid === response.callSid);
        if (req.user.role !== 'admin' && call && call.userId !== req.user.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only download your own response reports' 
            });
        }

        const questions = loadQuestions();
        const user = usersData.users.find(u => u.id === (call ? call.userId : null));

        // Create Word document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        text: "Call Response Report",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: {
                            after: 400
                        }
                    }),
                    
                    // Response Details Section
                    new Paragraph({
                        text: "Response Details",
                        heading: HeadingLevel.HEADING_2,
                        spacing: {
                            before: 400,
                            after: 200
                        }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Response ID: ", bold: true }),
                            new TextRun({ text: responseId })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Call SID: ", bold: true }),
                            new TextRun({ text: response.callSid || 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "User Name: ", bold: true }),
                            new TextRun({ text: user ? user.name : 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Contact Name: ", bold: true }),
                            new TextRun({ text: call ? call.name : 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Phone Number: ", bold: true }),
                            new TextRun({ text: call ? call.phone : 'N/A' })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Response Date: ", bold: true }),
                            new TextRun({ text: new Date(response.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) })
                        ],
                        spacing: { after: 100 }
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Questions Answered: ", bold: true }),
                            new TextRun({ text: response.answers ? response.answers.length.toString() : '0' })
                        ],
                        spacing: { after: 200 }
                    }),
                    
                    // Questions & Answers Section
                    new Paragraph({
                        text: "Questions & Answers",
                        heading: HeadingLevel.HEADING_2,
                        spacing: {
                            before: 400,
                            after: 200
                        }
                    }),
                    
                    // Add questions and answers in list format
                    ...(response.answers && response.answers.length > 0 ? response.answers.map((answer, index) => {
                        const question = questions[index] || `Question ${index + 1}`;
                        const confidence = response.confidences ? response.confidences[index] : null;
                        
                        return [
                            // Question
                            new Paragraph({
                                children: [
                                    new TextRun({ 
                                        text: `Q${index + 1}: ${question}`, 
                                        bold: true,
                                        size: 24
                                    })
                                ],
                                spacing: { before: 200, after: 100 }
                            }),
                            
                            // Answer
                            new Paragraph({
                                children: [
                                    new TextRun({ 
                                        text: `Answer: ${answer || 'No response recorded'}`, 
                                        size: 24
                                    })
                                ],
                                spacing: { after: 100 }
                            }),
                            
                            // Confidence
                            new Paragraph({
                                children: [
                                    new TextRun({ 
                                        text: `Confidence: ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}`, 
                                        size: 20,
                                        color: confidence && confidence > 0.7 ? '008000' : confidence && confidence > 0.4 ? 'FFA500' : 'FF0000'
                                    })
                                ],
                                spacing: { after: 200 }
                            })
                        ];
                    }).flat() : [
                        new Paragraph({ 
                            text: "No questions and answers available for this response.", 
                            spacing: { after: 200 } 
                        })
                    ])
                ]
            }]
        });

        // Generate buffer and send response
        const buffer = await Packer.toBuffer(doc);
        
        const filename = `response_report_${responseId}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(buffer);

    } catch (error) {
        console.error('Error generating response report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate response report: ' + error.message 
        });
    }
