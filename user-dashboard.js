document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.email) {
        // Redirect to login if not authenticated
        window.location.href = '/';
        return;
    }

    // Update user information in the dashboard
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('welcomeMessage').textContent = `Welcome, ${user.name}!`;
    const userCredits = document.getElementById('userCredits');
    const dashboardCredits = document.getElementById('dashboardCredits');
    function updateCreditsDisplay(credits) {
        if (userCredits) userCredits.textContent = `Credits: ${credits ?? 0}`;
        if (dashboardCredits) dashboardCredits.textContent = credits ?? 0;
        if (infoBox) {
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-user'></i> Welcome, ${user.name || user.email}!</div><div class='info-box-content'>You have <strong>${credits ?? 0} credits</strong>. Use the options above to manage your account.</div>`;
        }
    }

    // Fetch latest user profile from backend and update credits
    async function refreshUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    updateCreditsDisplay(data.user.credits);
                }
            }
        } catch (err) {
            // Ignore network errors for now
        }
    }
    refreshUserProfile();

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function() {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/';
    });

    // Add click handlers for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    // Removed generic click handler that showed "coming soon" messages
    // Individual stat cards now have their own specific click handlers below

    // Verify token with backend
    verifyToken(token);

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            font-weight: 500;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    function getNotificationColor(type) {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            default: return '#667eea';
        }
    }

    // Verify token with backend
    async function verifyToken(token) {
        try {
            const response = await fetch(`${window.location.origin}/api/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                // Token is invalid, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            const data = await response.json();
            if (data.success) {
                // Token is valid, update user info if needed
                console.log('Token verified successfully');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            // On network error, we'll keep the user logged in
            // but could implement a retry mechanism
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + L for logout
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            document.getElementById('logoutBtn').click();
        }
        
        // Escape key to close any open modals (if implemented)
        if (e.key === 'Escape') {
            // Close any open modals or dropdowns
        }
    });

    // Add hover effects for stat cards
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Auto-refresh token (optional - implement if needed)
    // setInterval(() => {
    //     verifyToken(token);
    // }, 5 * 60 * 1000); // Check every 5 minutes

    // Show welcome message
    setTimeout(() => {
        showNotification(`Welcome back, ${user.name || user.email}!`, 'success');
    }, 1000);

    // Dynamic Info Box logic
    const infoBox = document.getElementById('infoBoxMessage');
    if (statCards.length && infoBox) {
        if (statCards[0]) statCards[0].addEventListener('click', () => {
            // Scheduling Call logic
            infoBox.innerHTML = `
                <div class='info-box-title'><i class='fas fa-calendar-plus'></i> Scheduling Call</div>
                <div class='info-box-content'>
                    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #0ea5e9; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fas fa-coins" style="color: #0ea5e9;"></i>
                            <strong style="color: #0c4a6e;">Credit Information</strong>
                        </div>
                        <div style="color: #0c4a6e; font-size: 0.9rem;">
                            <div>• Each call costs <strong>1 credit</strong></div>
                            <div>• Credits are deducted when call is initiated</div>
                            <div>• Credits are refunded if call fails (busy, no-answer, etc.)</div>
                            <div>• Current balance: <span id="currentCreditsDisplay" style="font-weight: bold; color: #0ea5e9;">Loading...</span></div>
                        </div>
                    </div>
                    <form id="scheduleCallForm" class="schedule-call-form">
                        <div style="margin-bottom: 1rem;">
                            <label for="callName">Name</label><br>
                            <input type="text" id="callName" name="callName" required style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="callPhone">Phone Number</label><br>
                            <input type="tel" id="callPhone" name="callPhone" required pattern="[0-9\\-\\+\\s\\(\\)]{7,}" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="callTime">Time</label><br>
                            <input type="datetime-local" id="callTime" name="callTime" required style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">Schedule</button>
                    </form>
                </div>
            `;
            
            // Update current credits display
            const currentCreditsDisplay = document.getElementById('currentCreditsDisplay');
            if (currentCreditsDisplay) {
                const currentCredits = getUserCredits ? getUserCredits() : 0;
                currentCreditsDisplay.textContent = `${currentCredits} credits`;
            }
            
            // Add form submit handler
            const scheduleForm = document.getElementById('scheduleCallForm');
            if (scheduleForm) {
                scheduleForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const name = document.getElementById('callName').value.trim();
                    const phone = document.getElementById('callPhone').value.trim();
                    const time = document.getElementById('callTime').value;
                    const company = getCurrentCompanyName();
                    if (!name || !phone || !time) {
                        showNotification('Please fill in all fields', 'error');
                        return;
                    }
                    try {
                        const response = await fetch('/api/schedule-call', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ name, company, phone, time })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                            showNotification('Call scheduled successfully!', 'success');
                            scheduleForm.reset();
                            // Refresh credits display after successful scheduling
                            refreshUserProfile();
                        } else {
                            if (response.status === 402) {
                                // Insufficient credits error
                                showNotification(`Insufficient credits. You have ${data.currentCredits} credits. You need 1 credit to schedule a call.`, 'error');
                                // Refresh credits display
                                refreshUserProfile();
                        } else {
                            showNotification(data.message || 'Failed to schedule call', 'error');
                            }
                        }
                    } catch (err) {
                        showNotification('Network error. Please try again.', 'error');
                    }
                });
            }
        });
        if (statCards[1]) statCards[1].addEventListener('click', async () => {
            // Scheduled Calls logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Loading your scheduled calls...</div>`;
            try {
                const response = await fetch('/api/scheduled-calls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    if (data.calls.length === 0) {
                        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>You have no scheduled calls.</div>`;
                    } else {
                        const callsList = data.calls.map(call => {
                            // Format the time for display (IST) - use scheduledTime field
                            const timeField = call.scheduledTime || call.time;
                            const callTime = new Date(timeField);
                            const formattedTime = callTime.toLocaleString('en-IN', { 
                                timeZone: 'Asia/Kolkata',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            // Use status field instead of completed/failed
                            const status = call.status || 'Pending';
                            const statusClass = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'pending';
                            
                            // Action buttons - show delete for all calls, but edit/trigger only for pending calls
                            const actionButtons = status !== 'completed' && status !== 'failed' ? `
                                <div class="scheduled-call-actions">
                                    <button onclick="editUserCall(${call.id})" class="edit-btn" title="Edit Call">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button onclick="deleteUserCall(${call.id})" class="delete-btn" title="Delete Call">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                    <button onclick="triggerCall(${call.id})" class="trigger-btn" title="Trigger Now">
                                        <i class="fas fa-play"></i> Trigger Now
                                    </button>
                                    <button onclick="downloadCallText(${call.id})" class="download-text-btn" title="Download Text Report">
                                        <i class="fas fa-file-alt"></i> Text
                                    </button>
                                </div>
                            ` : `
                                <div class="scheduled-call-actions">
                                    <button onclick="deleteUserCall(${call.id})" class="delete-btn" title="Delete Call">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                    <button onclick="downloadCallText(${call.id})" class="download-text-btn" title="Download Text Report">
                                        <i class="fas fa-file-alt"></i> Text
                                    </button>
                                </div>
                            `;
                            
                            return `<li style="margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <strong>${call.name}</strong>${call.company ? ` (${call.company})` : ''} (${call.phone})<br>
                                ${formattedTime}<br>
                                Status: <span class="status-badge ${statusClass}">${status}</span>
                                ${actionButtons}
                            </li>`;
                        }).join('');
                        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'><ul style="list-style: none; padding: 0;">${callsList}</ul></div>`;
                    }
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Failed to load scheduled calls.</div>`;
                }
            } catch (err) {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
        if (statCards[2]) statCards[2].addEventListener('click', async () => {
            // Report logic - Show user's actual reports
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Loading your reports...</div>`;
            
            try {
                // Fetch user's responses and calls data
                const [responsesResponse, callsResponse] = await Promise.all([
                    fetch('/api/responses', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('/api/calls', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                const responsesData = await responsesResponse.json();
                const callsData = await callsResponse.json();

                console.log('📊 Raw responses data from API:', responsesData);
                console.log('📞 Raw calls data from API:', callsData);

                if (responsesResponse.ok && callsResponse.ok) {
                    const responses = responsesData.responses || [];
                    const calls = callsData.calls || [];
                    
                    console.log('🔍 Processed responses array:', responses);
                    console.log('📞 Processed calls array:', calls);
                    
                    // Debug each response object
                    responses.forEach((response, index) => {
                        console.log(`🔍 Response ${index}:`, {
                            id: response.id,
                            callSid: response.callSid,
                            userId: response.userId,
                            hasId: 'id' in response,
                            idType: typeof response.id
                        });
                    });
                    
                    renderUserReports(responses, calls);
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Failed to load reports. Please try again.</div>`;
                }
            } catch (err) {
                console.error('Error loading reports:', err);
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
        if (statCards[3]) statCards[3].addEventListener('click', async () => {
            // Manage Questions logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Loading questions...</div>`;
            try {
                const response = await fetch('/api/questions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    renderQuestionsBox(data.questions);
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Failed to load questions.</div>`;
                }
            } catch (err) {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
    }

    // Start the dashboard initialization
    initializeDashboard();

    // Function to download call as text file
    window.downloadCallText = async function(callId) {
        try {
            console.log('📄 Downloading text file for call:', callId);
            
            const response = await fetch(`/api/calls/${callId}/export-text`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to download text file');
            }
            
            // Get the filename from the response headers
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `call_report_${callId}.txt`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showNotification('Text file downloaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error downloading text file:', error);
            showNotification(error.message || 'Failed to download text file', 'error');
        }
    };

    // Function to render questions box for users
    function renderQuestionsBox(questions) {
        const infoBox = document.getElementById('dashboardInfoBox');
        
        if (!questions || questions.length === 0) {
            infoBox.innerHTML = `
                <div class='info-box-title'>
                    <i class='fas fa-question'></i> Manage Questions
                </div>
                <div class='info-box-content'>
                    <div style='text-align: center; padding: 2rem; color: #6b7280;'>
                        <i class='fas fa-question-circle' style='font-size: 3rem; margin-bottom: 1rem; display: block;'></i>
                        <h3 style='margin: 0 0 0.5rem 0;'>No Questions Available</h3>
                        <p style='margin: 0;'>No questions have been configured yet.</p>
                        <button id="addFirstQuestionBtn" style="
                            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            margin-top: 1rem;
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <i class="fas fa-plus"></i>
                            Add First Question
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listener for the first question button
            document.getElementById('addFirstQuestionBtn').addEventListener('click', () => {
                showAddQuestionModal();
            });
            return;
        }

        let html = `
            <div class='info-box-title'>
                <i class='fas fa-question'></i> Manage Questions
            </div>
            <div class='info-box-content'>
                <div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;'>
                    <div>
                        <h3 style='margin: 0 0 0.5rem 0; color: #1f2937;'>📝 Current Questions</h3>
                        <p style='color: #6b7280; margin: 0;'>These are the questions that will be asked during your calls:</p>
                    </div>
                    <button id="addQuestionBtn" style="
                        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)'">
                        <i class="fas fa-plus"></i>
                        Add Question
                    </button>
                </div>
                
                <div style='max-height: 400px; overflow-y: auto; margin-bottom: 1.5rem;'>
        `;

        questions.forEach((question, index) => {
            html += `
                <div style="
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 0.75rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                        <div style="
                            background: #4facfe;
                            color: white;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 0.75rem;
                            font-weight: bold;
                            flex-shrink: 0;
                            margin-top: 0.125rem;
                        ">
                            ${index + 1}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #1f2937; margin-bottom: 0.25rem;">
                                ${question}
                            </div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.75rem;">
                                Question ${index + 1} of ${questions.length}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button onclick="editQuestion(${index})" style="
                                    background: #f59e0b;
                                    color: white;
                                    border: none;
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    font-size: 0.875rem;
                                    font-weight: 500;
                                    cursor: pointer;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 0.25rem;
                                    transition: all 0.2s ease;
                                " onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'">
                                    <i class="fas fa-edit"></i>
                                    Edit
                                </button>
                                <button onclick="deleteQuestion(${index})" style="
                                    background: #ef4444;
                                    color: white;
                                    border: none;
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    font-size: 0.875rem;
                                    font-weight: 500;
                                    cursor: pointer;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 0.25rem;
                                    transition: all 0.2s ease;
                                " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                                    <i class="fas fa-trash"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                
                <div style="
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-info-circle" style="color: #4facfe;"></i>
                        <strong style="color: #1f2937;">How it works:</strong>
                    </div>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #6b7280; font-size: 0.875rem;">
                        <li>Questions are asked in order during your calls</li>
                        <li>Each question allows for voice or keypad responses</li>
                        <li>Responses are recorded and analyzed for confidence scores</li>
                        <li>You can view detailed reports of all responses</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <div style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 1rem;
                        border-radius: 8px;
                        display: inline-block;
                    ">
                        <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem;">
                            ${questions.length}
                        </div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">
                            Questions Configured
                        </div>
                    </div>
                </div>
            </div>
        `;

        infoBox.innerHTML = html;
        
        // Add event listener for the add question button
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
            showAddQuestionModal();
        });
    }

    // Function to show add question modal
    function showAddQuestionModal() {
        const modalHTML = `
            <div id="addQuestionModal" class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div class="modal-content" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                            <i class="fas fa-plus" style="color: #4facfe; margin-right: 0.5rem;"></i>
                            Add New Question
                        </h2>
                        <button id="closeAddQuestionModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <form id="addQuestionForm">
                        <div style="margin-bottom: 1.5rem;">
                            <label for="newQuestionText" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Question Text</label>
                            <textarea id="newQuestionText" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                                min-height: 100px;
                                resize: vertical;
                            " placeholder="Enter your question here..."></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button type="submit" style="
                                flex: 1;
                                background: #4facfe;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                <i class="fas fa-plus" style="margin-right: 0.5rem;"></i>
                                Add Question
                            </button>
                            <button type="button" id="cancelAddQuestion" style="
                                flex: 1;
                                background: #6b7280;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        document.getElementById('closeAddQuestionModal').addEventListener('click', closeAddQuestionModal);
        document.getElementById('cancelAddQuestion').addEventListener('click', closeAddQuestionModal);
        document.getElementById('addQuestionForm').addEventListener('submit', handleAddQuestion);
        
        // Close modal when clicking outside
        document.getElementById('addQuestionModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddQuestionModal();
            }
        });
    }

    // Function to close add question modal
    function closeAddQuestionModal() {
        const modal = document.getElementById('addQuestionModal');
        if (modal) {
            modal.remove();
        }
    }

    // Function to handle add question submission
    async function handleAddQuestion(e) {
        e.preventDefault();
        
        const questionText = document.getElementById('newQuestionText').value.trim();
        
        if (!questionText) {
            showNotification('Please enter a question', 'error');
            return;
        }
        
        try {
            // First, get current questions
            const response = await fetch('/api/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load current questions');
            }
            
            const currentQuestions = data.questions || [];
            const updatedQuestions = [...currentQuestions, questionText];
            
            // Update questions
            const updateResponse = await fetch('/api/questions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: updatedQuestions })
            });
            
            const updateData = await updateResponse.json();
            
            if (updateResponse.ok && updateData.success) {
                showNotification('Question added successfully!', 'success');
                closeAddQuestionModal();
                // Refresh the questions display
                renderQuestionsBox(updateData.questions);
            } else {
                throw new Error(updateData.message || 'Failed to add question');
            }
        } catch (error) {
            console.error('Error adding question:', error);
            showNotification('Failed to add question: ' + error.message, 'error');
        }
    }

    // Function to edit question
    window.editQuestion = async function(index) {
        try {
            // Get current questions
            const response = await fetch('/api/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load questions');
            }
            
            const questions = data.questions || [];
            const question = questions[index];
            
            if (!question) {
                showNotification('Question not found', 'error');
                return;
            }
            
            showEditQuestionModal(index, question);
        } catch (error) {
            console.error('Error loading question for editing:', error);
            showNotification('Failed to load question: ' + error.message, 'error');
        }
    };

    // Function to show edit question modal
    function showEditQuestionModal(index, questionText) {
        const modalHTML = `
            <div id="editQuestionModal" class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div class="modal-content" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                            <i class="fas fa-edit" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                            Edit Question ${index + 1}
                        </h2>
                        <button id="closeEditQuestionModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <form id="editQuestionForm">
                        <input type="hidden" id="editQuestionIndex" value="${index}">
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label for="editQuestionText" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Question Text</label>
                            <textarea id="editQuestionText" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                                min-height: 100px;
                                resize: vertical;
                            ">${questionText}</textarea>
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button type="submit" style="
                                flex: 1;
                                background: #f59e0b;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                <i class="fas fa-save" style="margin-right: 0.5rem;"></i>
                                Update Question
                            </button>
                            <button type="button" id="cancelEditQuestion" style="
                                flex: 1;
                                background: #6b7280;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        document.getElementById('closeEditQuestionModal').addEventListener('click', closeEditQuestionModal);
        document.getElementById('cancelEditQuestion').addEventListener('click', closeEditQuestionModal);
        document.getElementById('editQuestionForm').addEventListener('submit', handleEditQuestion);
        
        // Close modal when clicking outside
        document.getElementById('editQuestionModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditQuestionModal();
            }
        });
    }

    // Function to close edit question modal
    function closeEditQuestionModal() {
        const modal = document.getElementById('editQuestionModal');
        if (modal) {
            modal.remove();
        }
    }

    // Function to handle edit question submission
    async function handleEditQuestion(e) {
        e.preventDefault();
        
        const index = parseInt(document.getElementById('editQuestionIndex').value);
        const questionText = document.getElementById('editQuestionText').value.trim();
        
        if (!questionText) {
            showNotification('Please enter a question', 'error');
            return;
        }
        
        try {
            // Get current questions
            const response = await fetch('/api/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load questions');
            }
            
            const questions = data.questions || [];
            questions[index] = questionText;
            
            // Update questions
            const updateResponse = await fetch('/api/questions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: questions })
            });
            
            const updateData = await updateResponse.json();
            
            if (updateResponse.ok && updateData.success) {
                showNotification('Question updated successfully!', 'success');
                closeEditQuestionModal();
                // Refresh the questions display
                renderQuestionsBox(updateData.questions);
            } else {
                throw new Error(updateData.message || 'Failed to update question');
            }
        } catch (error) {
            console.error('Error updating question:', error);
            showNotification('Failed to update question: ' + error.message, 'error');
        }
    }

    // Function to delete question
    window.deleteQuestion = async function(index) {
        if (!confirm(`Are you sure you want to delete question ${index + 1}?`)) {
            return;
        }
        
        try {
            // Get current questions
            const response = await fetch('/api/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load questions');
            }
            
            const questions = data.questions || [];
            const updatedQuestions = questions.filter((_, i) => i !== index);
            
            if (updatedQuestions.length === 0) {
                showNotification('Cannot delete the last question. At least one question is required.', 'error');
                return;
            }
            
            // Update questions
            const updateResponse = await fetch('/api/questions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: updatedQuestions })
            });
            
            const updateData = await updateResponse.json();
            
            if (updateResponse.ok && updateData.success) {
                showNotification('Question deleted successfully!', 'success');
                // Refresh the questions display
                renderQuestionsBox(updateData.questions);
            } else {
                throw new Error(updateData.message || 'Failed to delete question');
            }
        } catch (error) {
            console.error('Error deleting question:', error);
            showNotification('Failed to delete question: ' + error.message, 'error');
        }
    };

    // Function to view response details
    window.viewResponseDetails = async function(responseId) {
        try {
            console.log('🔍 Viewing response details for ID:', responseId);
            
            const response = await fetch(`/api/responses/${responseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load response details');
            }
            
            const data = await response.json();
            console.log('📊 Response details data:', data);
            
            if (data.success && data.response) {
                showResponseDetailsModal(data.response);
            } else {
                throw new Error('Response details not found');
            }
        } catch (error) {
            console.error('❌ Error loading response details:', error);
            showNotification('Failed to load response details: ' + error.message, 'error');
        }
    };

    // Function to show response details modal
    function showResponseDetailsModal(responseData) {
        console.log('📋 Showing response details modal:', responseData);
        
        // Get questions for display
        const questions = loadQuestionsFromStorage() || [];
        
        let questionsAnswersHTML = '';
        if (responseData.answers && responseData.answers.length > 0) {
            responseData.answers.forEach((answer, index) => {
                const question = questions[index] || `Question ${index + 1}`;
                const confidence = responseData.confidences && responseData.confidences[index] 
                    ? (responseData.confidences[index] * 100).toFixed(1) + '%'
                    : 'N/A';
                
                const confidenceColor = responseData.confidences && responseData.confidences[index]
                    ? (responseData.confidences[index] >= 0.8 ? '#10b981' : responseData.confidences[index] >= 0.6 ? '#f59e0b' : '#ef4444')
                    : '#6b7280';
                
                questionsAnswersHTML += `
                    <div style="
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 1rem;
                        margin-bottom: 1rem;
                    ">
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">
                            ${question}
                        </div>
                        <div style="color: #374151; margin-bottom: 0.5rem;">
                            <strong>Answer:</strong> ${answer || 'No response'}
                        </div>
                        <div style="color: ${confidenceColor}; font-weight: 600;">
                            <strong>Confidence:</strong> ${confidence}
                        </div>
                    </div>
                `;
            });
        } else {
            questionsAnswersHTML = '<div style="color: #6b7280; text-align: center; padding: 2rem;">No responses recorded</div>';
        }
        
        const modalHTML = `
            <div id="responseDetailsModal" class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div class="modal-content" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                            <i class="fas fa-file-alt" style="color: #667eea; margin-right: 0.5rem;"></i>
                            Response Details
                        </h2>
                        <button id="closeResponseDetailsModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                                <div style="font-weight: 600; color: #374151; margin-bottom: 0.25rem;">Response ID</div>
                                <div style="color: #6b7280; font-family: monospace;">${responseData.id}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                                <div style="font-weight: 600; color: #374151; margin-bottom: 0.25rem;">Date</div>
                                <div style="color: #6b7280;">${new Date(responseData.timestamp).toLocaleString('en-IN')}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                                <div style="font-weight: 600; color: #374151; margin-bottom: 0.25rem;">Questions Answered</div>
                                <div style="color: #6b7280;">${responseData.answers?.length || 0}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Questions & Answers</h3>
                        ${questionsAnswersHTML}
                    </div>
                    
                    <div style="text-align: center; margin-top: 2rem;">
                        <button id="closeResponseDetailsBtn" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        document.getElementById('closeResponseDetailsModal').addEventListener('click', closeResponseDetailsModal);
        document.getElementById('closeResponseDetailsBtn').addEventListener('click', closeResponseDetailsModal);
        
        // Close modal when clicking outside
        document.getElementById('responseDetailsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeResponseDetailsModal();
            }
        });
    };

    // Function to close response details modal
    function closeResponseDetailsModal() {
        const modal = document.getElementById('responseDetailsModal');
        if (modal) {
            modal.remove();
        }
    }

    // Function to load all responses (for pagination)
    window.loadAllResponses = async function() {
        try {
            console.log('📥 Loading all responses...');
            
            // Fetch all responses and calls
            const [responsesResponse, callsResponse] = await Promise.all([
                fetch('/api/responses', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/calls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const responsesData = await responsesResponse.json();
            const callsData = await callsResponse.json();

            if (responsesResponse.ok && callsResponse.ok) {
                const responses = responsesData.responses || [];
                const calls = callsData.calls || [];
                
                // Filter for current user
                const userId = getCurrentUserId();
                const userResponses = responses.filter(r => {
                    const call = calls.find(c => c.twilio_call_sid === r.callSid);
                    return call && parseInt(call.userId) === parseInt(userId);
                });
                
                // Re-render with all responses
                renderUserReports(userResponses, calls);
                showNotification('All responses loaded!', 'success');
            } else {
                throw new Error('Failed to load responses');
            }
        } catch (error) {
            console.error('❌ Error loading all responses:', error);
            showNotification('Failed to load all responses: ' + error.message, 'error');
        }
    };

    // Helper function to load questions from storage (for response details)
    function loadQuestionsFromStorage() {
        try {
            // Try to get questions from localStorage first
            const storedQuestions = localStorage.getItem('questions');
            if (storedQuestions) {
                return JSON.parse(storedQuestions);
            }
            
            // If not in localStorage, return empty array
            return [];
        } catch (error) {
            console.error('Error loading questions from storage:', error);
            return [];
        }
    }

    // Function to store questions in localStorage when they're loaded
    function storeQuestionsInStorage(questions) {
        try {
            localStorage.setItem('questions', JSON.stringify(questions));
        } catch (error) {
            console.error('Error storing questions in localStorage:', error);
        }
    }

    // Update the renderQuestionsBox function to store questions
    const originalRenderQuestionsBox = renderQuestionsBox;
    renderQuestionsBox = function(questions) {
        storeQuestionsInStorage(questions);
        return originalRenderQuestionsBox(questions);
    };

    // Helper to get current user credits
    async function getUserCredits() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return 0;
            }
            
            const response = await fetch('/api/credits', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.credits || 0;
            } else {
                console.error('Failed to fetch user credits');
                return 0;
            }
        } catch (error) {
            console.error('Error fetching user credits:', error);
            return 0;
        }
    }
}); 