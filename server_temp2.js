
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
});

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
    console.log(`ðŸ” JWT Secret: ${***REMOVED***}`);
    console.log(`ðŸ‘¥ Available users:`);
    
    const usersData = loadUsers();
    usersData.users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
    });
    console.log(`\nðŸ”‘ Password Reset: Token-based system active`);
    console.log(`   Reset tokens expire in 15 minutes`);
}); 
