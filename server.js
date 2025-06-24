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
        console.warn('⚠️  Twilio credentials are placeholder values. Real calls will not be made.');
        console.warn('📝 Please update your .env file with real Twilio credentials from https://console.twilio.com/');
    } else {
        twilioClient = twilio(***REMOVED***, ***REMOVED***);
        console.log('✅ Twilio client initialized successfully with real credentials');
    }
} else {
    console.warn('⚠️  Twilio credentials not found. Call functionality will be disabled.');
    console.warn('📝 Please set ***REMOVED***, ***REMOVED***, and ***REMOVED*** environment variables.');
    console.warn('🔗 Get credentials from: https://console.twilio.com/');
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
        console.log('🚀 Call Scheduler started');
        
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
        console.log('🛑 Call Scheduler stopped');
    }

    scheduleExistingCalls() {
        try {
            const callsData = loadCalls();
            console.log(`📋 Scheduling ${callsData.calls.length} existing calls`);
            
            callsData.calls.forEach(call => {
                if (!call.completed && !call.failed) {
                    this.scheduleCall(call);
                }
            });
        } catch (error) {
            console.error('❌ Error scheduling existing calls:', error);
        }
    }

    scheduleCall(callData) {
        try {
            // Validate callData and get the time field (support both time and scheduledTime)
            if (!callData) {
                console.error(`❌ Invalid call data for scheduling:`, callData);
                return null;
            }
            
            // Support both 'time' and 'scheduledTime' fields for backward compatibility
            const timeField = callData.scheduledTime || callData.time;
            if (!timeField) {
                console.error(`❌ No time field found for call ${callData.id}:`, callData);
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
                    console.error(`❌ Invalid time string for call ${callData.id}:`, timeString);
                    return null;
                }
                
                // Check if it's already in ISO format (UTC)
                if (timeString.includes('T') && timeString.includes('Z')) {
                    // It's already in UTC, convert to IST
                    callTime = new Date(timeString);
                } else {
                    // It's a local time string, treat it as IST
                    // Create a date object in IST
                    const [datePart, timePart] = timeString.split('T');
                    if (!datePart || !timePart) {
                        console.error(`❌ Invalid time format for call ${callData.id}:`, timeString);
                        return null;
                    }
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    
                    // Create date in IST (UTC+5:30)
                    callTime = new Date(Date.UTC(year, month - 1, day, hour, minute) - (5.5 * 60 * 60 * 1000));
                }
            }
            
            // Validate the parsed time
            if (isNaN(callTime.getTime())) {
                console.error(`❌ Invalid parsed time for call ${callData.id}:`, callTime);
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
                console.log(`📅 Scheduled call for ${callData.name} (${callData.phone}) at ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
                return jobId;
            } else {
                // Call is due now or in the past
                console.log(`⏰ Call for ${callData.name} is due now or in the past`);
                const result = this.makeCall(callData);
                if (result === null) {
                    console.log(`⚠️  Call to ${callData.name} failed to initiate`);
                }
                return null;
            }
        } catch (error) {
            console.error(`❌ Error scheduling call for ${callData?.name || 'Unknown'}:`, error);
            return null;
        }
    }

    async makeCall(callData) {
        try {
            console.log(`🚀 Making scheduled call to ${callData.name} (${callData.phone})`);
            
            // Load questions from questions.json
            const questions = loadQuestions();
            
            if (questions.length === 0) {
                console.error('❌ No questions defined. Please add questions in the admin dashboard.');
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
            
            console.log(`✅ Call initiated for ${callData.name} with SID: ${twilioCall.sid}`);
            
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
            console.error(`❌ Error making call to ${callData.name}:`, error);
            
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
            console.log('⚠️  Twilio client not available, skipping call check');
            return;
        }

        const callsData = loadCalls();
        const now = new Date();
        
        console.log(`\n🕐 Scheduler check at ${now.toISOString()} (IST: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
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
                if (timeString.includes('T') && timeString.includes('Z')) {
                    callTime = new Date(timeString);
                } else {
                    const [datePart, timePart] = timeString.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    callTime = new Date(Date.UTC(year, month - 1, day, hour, minute) - (5.5 * 60 * 60 * 1000));
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
                console.log(`   ⏰ Call for ${call.name} is due now or in the past`);
                
                // Mark call as in-progress to prevent duplicate calls
                call.status = 'in-progress';
                call.started_at = new Date().toISOString();
                saveCalls(callsData);
                
                console.log(`   🚀 Making scheduled call to ${call.name} (${call.phone})`);
                // Handle errors from makeCall to prevent server crash
                this.makeCall(call).catch(error => {
                    console.error(`   ❌ Failed to make call to ${call.name}:`, error.message);
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
                console.log(`   ⏰ Call not due yet (${minutesUntilCall} minutes remaining)`);
            }
        }
        
        if (updated) {
            console.log(`   💾 Updated calls data`);
        } else {
            console.log(`   📝 No updates needed`);
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
                
                console.log(`❌ Cancelled call for ${job.callData.name} (${job.callData.phone})`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error cancelling call:', error);
            return false;
        }
    }
}

// Initialize scheduler
const callScheduler = new CallScheduler(twilioClient, ***REMOVED***);

// Start scheduler when server starts
callScheduler.start();

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

// GET /api/questions
app.get('/api/questions', authenticateToken, (req, res) => {
    try {
        console.log('🔍 Questions API called by user:', req.user.email, 'role:', req.user.role);
        
        console.log('📁 Loading questions from file:', questionsFile);
        const questions = loadQuestions();
        console.log('📊 Loaded questions:', questions);
        
        res.json({ 
            success: true, 
            questions: questions 
        });
    } catch (error) {
        console.error('❌ Error fetching questions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch questions: ' + error.message 
        });
    }
});

// Update questions
app.put('/api/questions', authenticateToken, (req, res) => {
    try {
        console.log('🔍 Questions update API called by user:', req.user.email, 'role:', req.user.role);
        
        const { questions } = req.body;

        if (!Array.isArray(questions)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Questions must be an array' 
            });
        }

        console.log('📝 Saving questions:', questions);
        
        if (saveQuestions(questions)) {
            console.log('✅ Questions saved successfully');
            res.json({ 
                success: true, 
                message: 'Questions updated successfully',
                questions: questions
            });
        } else {
            throw new Error('Failed to save questions to file');
        }
    } catch (error) {
        console.error('❌ Error updating questions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update questions: ' + error.message 
        });
    }
});

// Individual response download as text file

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${__dirname}`);
    console.log(`🔐 JWT Secret: ${***REMOVED***}`);
    console.log(`👥 Available users:`);
    
    const usersData = loadUsers();
    usersData.users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
    });
    console.log(`\n🔑 Password Reset: Token-based system active`);
    console.log(`   Reset tokens expire in 15 minutes`);
}); 
