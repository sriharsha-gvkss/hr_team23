// Individual response download as text file
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

        // Create text content
        let textContent = '';
        
        // Header
        textContent += 'CALL RESPONSE REPORT\n';
        textContent += '===================\n\n';
        
        // Response Details
        textContent += 'RESPONSE DETAILS:\n';
        textContent += '-----------------\n';
        textContent += `Response ID: ${responseId}\n`;
        textContent += `Call SID: ${response.callSid || 'N/A'}\n`;
        textContent += `User Name: ${user ? user.name : 'N/A'}\n`;
        textContent += `Contact Name: ${call ? call.name : 'N/A'}\n`;
        textContent += `Phone Number: ${call ? call.phone : 'N/A'}\n`;
        textContent += `Response Date: ${new Date(response.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
        textContent += `Questions Answered: ${response.answers ? response.answers.length : 0}\n\n`;
        
        // Questions & Answers
        textContent += 'QUESTIONS & ANSWERS:\n';
        textContent += '--------------------\n\n';
        
        if (response.answers && response.answers.length > 0) {
            response.answers.forEach((answer, index) => {
                const question = questions[index] || `Question ${index + 1}`;
                const confidence = response.confidences ? response.confidences[index] : null;
                
                textContent += `Q${index + 1}: ${question}\n`;
                textContent += `Answer: ${answer || 'No response recorded'}\n`;
                textContent += `Confidence: ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}\n`;
                textContent += '\n';
            });
        } else {
            textContent += 'No questions and answers available for this response.\n\n';
        }
        
        // Footer
        textContent += '===================\n';
        textContent += `Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;

        // Set headers for text file download
        const filename = `response_report_${responseId}.txt`;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send the text content
        res.send(textContent);

    } catch (error) {
        console.error('Error generating response report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate response report: ' + error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`ðŸš€ Server running on http://localhost:${PORT}`);
    console.log(`ðŸ“ Static files served from: ${__dirname}`);
    console.log(`ðŸ” JWT Secret: ${JWT_SECRET}`);
    console.log(`ðŸ‘¥ Available users:`);
    
    const usersData = loadUsers();
    usersData.users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
    });
    console.log(`\nðŸ”‘ Password Reset: Token-based system active`);
    console.log(`   Reset tokens expire in 15 minutes`);
}); 
