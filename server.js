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
