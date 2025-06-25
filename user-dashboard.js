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

    // Helper to render user reports with responses
    function renderUserReports(responses, calls) {
        const userId = getCurrentUserId();
        console.log('🔍 Current user ID:', userId);
        console.log('📊 All responses:', responses);
        console.log('📞 All calls:', calls);
        
        const userResponses = responses.filter(r => {
            const call = calls.find(c => c.twilio_call_sid === r.callSid);
            // Ensure proper type comparison - convert both to numbers
            const callUserId = parseInt(call?.userId);
            const currentUserId = parseInt(userId);
            const isUserResponse = call && callUserId === currentUserId;
            console.log(`🔍 Response ${r.id}: callSid=${r.callSid}, call.userId=${call?.userId} (${typeof call?.userId}), currentUserId=${userId} (${typeof userId}), isUserResponse=${isUserResponse}`);
            return isUserResponse;
        });
        
        console.log('👤 Filtered user responses:', userResponses);
        
        const userCalls = calls.filter(c => {
            // Ensure proper type comparison - convert both to numbers
            const callUserId = parseInt(c.userId);
            const currentUserId = parseInt(userId);
            return callUserId === currentUserId;
        });
        console.log('📞 User calls:', userCalls);
        
        if (userResponses.length === 0 && userCalls.length === 0) {
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>
                <div style='text-align: center; padding: 2rem; color: #6b7280;'>
                    <i class='fas fa-chart-line' style='font-size: 3rem; margin-bottom: 1rem; display: block;'></i>
                    <h3 style='margin: 0 0 0.5rem 0;'>No Reports Available</h3>
                    <p style='margin: 0;'>You haven't made any calls yet. Schedule a call to see your reports here.</p>
                </div>
            </div>`;
            return;
        }
        
        // Calculate statistics
        const totalCalls = userCalls.length;
        const completedCalls = userCalls.filter(c => c.status === 'completed').length;
        const pendingCalls = userCalls.filter(c => c.status === 'pending' || c.status === 'scheduled').length;
        const totalResponses = userResponses.length;
        const avgConfidence = userResponses.length > 0 
            ? (userResponses.reduce((sum, r) => sum + (r.confidences?.reduce((a, b) => a + b, 0) / (r.confidences?.length || 1)), 0) / userResponses.length * 100).toFixed(1)
            : 0;
        
        let html = `
            <div style='margin-bottom: 2rem;'>
                <h3 style='margin: 0 0 1rem 0; color: #1f2937;'>📊 Your Call Statistics</h3>
                <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;'>
                    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem; border-radius: 8px; text-align: center;'>
                        <div style='font-size: 1.5rem; font-weight: bold;'>${totalCalls}</div>
                        <div style='font-size: 0.9rem; opacity: 0.9;'>Total Calls</div>
                    </div>
                    <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; border-radius: 8px; text-align: center;'>
                        <div style='font-size: 1.5rem; font-weight: bold;'>${completedCalls}</div>
                        <div style='font-size: 0.9rem; opacity: 0.9;'>Completed</div>
                    </div>
                    <div style='background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1rem; border-radius: 8px; text-align: center;'>
                        <div style='font-size: 1.5rem; font-weight: bold;'>${pendingCalls}</div>
                        <div style='font-size: 0.9rem; opacity: 0.9;'>Pending</div>
                    </div>
                    <div style='background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 1rem; border-radius: 8px; text-align: center;'>
                        <div style='font-size: 1.5rem; font-weight: bold;'>${totalResponses}</div>
                        <div style='font-size: 0.9rem; opacity: 0.9;'>Responses</div>
                    </div>
                </div>
                <div style='background: #f8fafc; padding: 1rem; border-radius: 8px; border-left: 4px solid #667eea;'>
                    <div style='font-weight: 600; color: #374151; margin-bottom: 0.5rem;'>🎯 Average Confidence Score</div>
                    <div style='font-size: 1.2rem; color: #667eea; font-weight: bold;'>${avgConfidence}%</div>
                </div>
            </div>
        `;
        
        // Overall download button for all responses
        if (userResponses.length > 0) {
            html += `
                <div style='margin-bottom: 2rem; text-align: center;'>
                    <button id="downloadAllResponsesBtn" style="
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
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
                        <i class="fas fa-download"></i>
                        Download All Responses (${userResponses.length})
                    </button>
                </div>
            `;
        }
        
        // Recent responses section
        if (userResponses.length > 0) {
            html += `
                <div style='margin-bottom: 2rem;'>
                    <h3 style='margin: 0 0 1rem 0; color: #1f2937;'>📝 Recent Call Responses</h3>
                    <div style='max-height: 300px; overflow-y: auto;'>
            `;
            
            userResponses.slice(0, 5).forEach((response, index) => {
                console.log('🔍 Processing response:', response);
                console.log('📋 Response ID:', response.id);
                console.log('📞 Call SID:', response.callSid);
                console.log('👤 User ID:', response.userId);
                console.log('🔍 Response object keys:', Object.keys(response));
                console.log('🔍 Response object values:', Object.values(response));
                
                // Use the original response ID instead of generating a new one
                const responseId = response.id;
                console.log('🆔 Using Response ID:', responseId);
                console.log('🆔 Response ID type:', typeof responseId);
                console.log('🆔 Response ID === undefined:', responseId === undefined);
                console.log('🆔 Response ID === null:', responseId === null);
                
                if (!responseId) {
                    console.error('❌ Response ID is missing! Response object:', response);
                }
                
                const call = calls.find(c => c.twilio_call_sid === response.callSid);
                const responseDate = new Date(response.timestamp).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const avgConfidence = response.confidences && response.confidences.length > 0
                    ? (response.confidences.reduce((a, b) => a + b, 0) / response.confidences.length * 100).toFixed(1)
                    : 'N/A';
                
                const confidenceColor = avgConfidence !== 'N/A' 
                    ? (avgConfidence >= 80 ? '#10b981' : avgConfidence >= 60 ? '#f59e0b' : '#ef4444')
                    : '#6b7280';
                
                html += `
                    <div style="
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 1rem;
                        margin-bottom: 1rem;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <div style="font-weight: 600; color: #1f2937;">
                                ${call ? call.name : 'Unknown Contact'}
                            </div>
                            <div style="font-size: 0.875rem; color: #6b7280;">
                                ${responseDate}
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 1rem; align-items: center; font-size: 0.875rem;">
                            <div>
                                <strong>Questions:</strong> ${response.answers?.length || 0}
                            </div>
                            <div>
                                <strong>Confidence:</strong> 
                                <span style="color: ${confidenceColor}; font-weight: 600;">
                                    ${avgConfidence}${avgConfidence !== 'N/A' ? '%' : ''}
                                </span>
                            </div>
                            <div>
                                <strong>Status:</strong> 
                                <span style="color: #10b981; font-weight: 600;">Completed</span>
                            </div>
                            <button class="view-response-btn" 
                                data-response='${JSON.stringify(response)}'
                                style="
                                    background: #667eea;
                                    color: white;
                                    border: none;
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    font-size: 0.875rem;
                                    font-weight: 600;
                                    cursor: pointer;
                                ">
                                View Details
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    ${userResponses.length > 5 ? `<div style='text-align: center; margin-top: 1rem;'><button onclick="loadAllResponses()" style='background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;'>View All Responses</button></div>` : ''}
                </div>
            `;
        }
        
        // Recent calls section
        if (userCalls.length > 0) {
            html += `
                <div>
                    <h3 style='margin: 0 0 1rem 0; color: #1f2937;'>📞 Recent Calls</h3>
                    <div style='max-height: 200px; overflow-y: auto;'>
            `;
            
            userCalls.slice(0, 3).forEach((call, index) => {
                const callDate = new Date(call.scheduledTime).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const statusColor = call.status === 'completed' ? '#10b981' : call.status === 'failed' ? '#ef4444' : '#f59e0b';
                
                html += `
                    <div style='background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem;'>
                        <div style='display: flex; justify-content: space-between; align-items: center;'>
                            <div>
                                <div style='font-weight: 600; color: #374151;'>${call.name}</div>
                                <div style='color: #6b7280; font-size: 0.9rem;'>${call.phone}</div>
                            </div>
                            <div style='text-align: right;'>
                                <span style='background: ${statusColor}; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize;'>${call.status}</span>
                                <div style='color: #6b7280; font-size: 0.9rem; margin-top: 0.2rem;'>${callDate}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>${html}</div>`;
        
        // Add event listeners for view buttons
        document.querySelectorAll('.view-response-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('🔘 View button clicked');
                console.log('🔍 Button dataset:', e.currentTarget.dataset);
                console.log('📋 Raw response data:', e.currentTarget.dataset.response);
                
                try {
                    const responseData = JSON.parse(e.currentTarget.dataset.response);
                    console.log('📊 Parsed response data:', responseData);
                    console.log('📋 Response ID:', responseData.id);
                    console.log('📋 Response ID type:', typeof responseData.id);
                    
                    if (!responseData.id) {
                        console.error('❌ Response ID is missing or undefined');
                        showNotification('Response ID is missing. Please try again.', 'error');
                        return;
                    }
                    
                    viewResponseDetails(responseData.id);
                } catch (error) {
                    console.error('❌ Error parsing response data:', error);
                    showNotification('Error loading response data. Please try again.', 'error');
                }
            });
        });
        
        // Add event listener for download all responses button
        const downloadAllResponsesBtn = document.getElementById('downloadAllResponsesBtn');
        if (downloadAllResponsesBtn) {
            downloadAllResponsesBtn.addEventListener('click', async () => {
                try {
                    console.log('📥 Downloading all user responses...');
                    
                    // Show loading state
                    downloadAllResponsesBtn.disabled = true;
                    downloadAllResponsesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
                    
                    const response = await fetch('/api/download-user-responses', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to download all responses');
                    }
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const timestamp = new Date().toISOString().split('T')[0];
                    a.download = `all_my_responses_${timestamp}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    console.log('✅ All user responses downloaded successfully');
                    showNotification('All responses downloaded successfully!', 'success');
                    
                } catch (error) {
                    console.error('❌ Error downloading all responses:', error);
                    showNotification('Failed to download all responses: ' + error.message, 'error');
                } finally {
                    // Reset button state
                    downloadAllResponsesBtn.disabled = false;
                    downloadAllResponsesBtn.innerHTML = `<i class="fas fa-download"></i> Download All Responses (${userResponses.length})`;
                }
            });
        }
    }

    // Helper to get current user ID from token
    function getCurrentUserId() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            // Decode JWT to get user ID (assuming JWT structure)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id || payload.userId || null;
        } catch (e) {
            return null;
        }
    }

    // Function to show edit call modal
    function showEditCallModal(call) {
        console.log('📋 Call data received:', call);
        
        // Convert UTC time to local time for the datetime-local input
        // Use scheduledTime field from the call data
        const timeField = call.scheduledTime || call.time;
        console.log('⏰ Time field found:', timeField);
        
        if (!timeField) {
            console.error('❌ No time field found in call data:', call);
            showNotification('Call time data is missing. Please contact support.', 'error');
            return;
        }
        
        const localTime = new Date(timeField);
        if (isNaN(localTime.getTime())) {
            console.error('❌ Invalid time format:', timeField);
            showNotification('Invalid call time format. Please contact support.', 'error');
            return;
        }
        
        console.log('✅ Parsed time successfully:', localTime);
        
        const year = localTime.getFullYear();
        const month = String(localTime.getMonth() + 1).padStart(2, '0');
        const day = String(localTime.getDate()).padStart(2, '0');
        const hours = String(localTime.getHours()).padStart(2, '0');
        const minutes = String(localTime.getMinutes()).padStart(2, '0');
        const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        console.log('📅 Formatted datetime for input:', localDateTime);
        
        const modalHTML = `
            <div id="editCallModal" class="modal-overlay" style="
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
                            <i class="fas fa-edit" style="color: #4facfe; margin-right: 0.5rem;"></i>
                            Edit Scheduled Call
                        </h2>
                        <button id="closeEditCallModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <form id="editCallForm">
                        <input type="hidden" id="editCallId" value="${call.id}">
                        
                        <div style="margin-bottom: 1rem;">
                            <label for="editCallName" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Name</label>
                            <input type="text" id="editCallName" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " value="${call.name}">
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label for="editCallPhone" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Phone Number</label>
                            <input type="tel" id="editCallPhone" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " value="${call.phone}" pattern="[0-9\\-\\+\\s\\(\\)]{7,}">
                            <small style="color: #6b7280; font-size: 0.875rem;">Include country code (e.g., +1 for US)</small>
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label for="editCallTime" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Scheduled Time</label>
                            <input type="datetime-local" id="editCallTime" value="${localDateTime}" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            ">
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
                                <i class="fas fa-save" style="margin-right: 0.5rem;"></i>
                                Update Call
                            </button>
                            <button type="button" id="cancelEditCall" style="
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
        document.getElementById('closeEditCallModal').addEventListener('click', closeEditCallModal);
        document.getElementById('cancelEditCall').addEventListener('click', closeEditCallModal);
        document.getElementById('editCallForm').addEventListener('submit', handleEditCall);
        
        // Close modal when clicking outside
        document.getElementById('editCallModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditCallModal();
            }
        });
    }
    
    // Function to close edit call modal
    function closeEditCallModal() {
        const modal = document.getElementById('editCallModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Function to handle edit call submission
    async function handleEditCall(e) {
        e.preventDefault();
        
        const callId = document.getElementById('editCallId').value;
        const name = document.getElementById('editCallName').value.trim();
        const phone = document.getElementById('editCallPhone').value.trim();
        const time = document.getElementById('editCallTime').value;
        const company = getCurrentCompanyName();
        
        if (!name || !phone || !time) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/calls/${callId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, company, phone, time })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showNotification('Call updated successfully!', 'success');
                closeEditCallModal();
                // Refresh the calls list
                statCards[1].click();
            } else {
                showNotification(data.message || 'Failed to update call', 'error');
            }
        } catch (err) {
            console.error('Error updating call:', err);
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Function to delete a user call
    window.deleteUserCall = async function(callId) {
        try {
            const confirmed = confirm('Are you sure you want to delete this call? This action cannot be undone.');
            if (!confirmed) return;
            console.log('🗑️ Deleting call:', callId);
            
            const response = await fetch(`/api/calls/${callId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    showNotification('This call no longer exists or was already deleted.', 'error');
                } else {
                    throw new Error('Failed to delete call');
                }
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Call deleted successfully!', 'success');
                // Refresh the calls list
                statCards[1].click();
            } else {
                showNotification(data.message || 'Failed to delete call', 'error');
            }
        } catch (error) {
            console.error('❌ Error deleting call:', error);
            showNotification('Error deleting call. Please try again.', 'error');
        }
    };

    // Function to trigger a user call
    window.triggerUserCall = async function(callId) {
        try {
            const confirmed = confirm('Are you sure you want to trigger this call now?');
            if (!confirmed) return;
            
            console.log('🚀 Triggering call:', callId);
            
            const response = await fetch(`/api/calls/${callId}/trigger`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showNotification('Call triggered successfully!', 'success');
                // Refresh the calls list
                statCards[1].click();
            } else {
                showNotification(data.message || 'Failed to trigger call', 'error');
            }
        } catch (error) {
            console.error('❌ Error triggering call:', error);
            showNotification('Error triggering call. Please try again.', 'error');
        }
    };

    // Company Name Management
    let originalCompanyName = '';
    
    function initializeCompanySection() {
        const editBtn = document.getElementById('editCompanyBtn');
        const saveBtn = document.getElementById('saveCompanyBtn');
        const cancelBtn = document.getElementById('cancelCompanyBtn');
        const companyDisplay = document.getElementById('companyDisplay');
        const companyInput = document.getElementById('companyName');
        
        // Load company name from localStorage or set default
        const savedCompany = localStorage.getItem('userCompanyName') || 'Your Company';
        companyDisplay.textContent = savedCompany;
        originalCompanyName = savedCompany;
        
        editBtn.addEventListener('click', () => {
            companyDisplay.style.display = 'none';
            companyInput.style.display = 'inline-block';
            companyInput.value = companyDisplay.textContent;
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-flex';
            cancelBtn.style.display = 'inline-flex';
            companyInput.focus();
        });
        
        saveBtn.addEventListener('click', async () => {
            const newCompanyName = companyInput.value.trim();
            if (!newCompanyName) {
                showNotification('Company name cannot be empty', 'error');
                return;
            }
            
            try {
                // Save to localStorage
                localStorage.setItem('userCompanyName', newCompanyName);
                
                // Update display
                companyDisplay.textContent = newCompanyName;
                originalCompanyName = newCompanyName;
                
                // Hide input, show display
                companyDisplay.style.display = 'inline-block';
                companyInput.style.display = 'none';
                editBtn.style.display = 'inline-flex';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                
                showNotification('Company name updated successfully!', 'success');
            } catch (error) {
                showNotification('Failed to update company name', 'error');
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            companyDisplay.style.display = 'inline-block';
            companyInput.style.display = 'none';
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            companyInput.value = originalCompanyName;
        });
        
        // Handle Enter key in input
        companyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
        
        // Handle Escape key
        companyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });
    }
    
    // Get current company name for use in calls
    function getCurrentCompanyName() {
        return localStorage.getItem('userCompanyName') || 'Your Company';
    }

    // Initialize dashboard
    async function initializeDashboard() {
        await refreshUserProfile();
        initializeCompanySection();
        
        // Add event listeners to stat cards
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
                        <p style='margin: 0;'>No questions have been configured yet. Please contact your administrator.</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <div class='info-box-title'>
                <i class='fas fa-question'></i> Manage Questions
            </div>
            <div class='info-box-content'>
                <div style='margin-bottom: 1.5rem;'>
                    <h3 style='margin: 0 0 1rem 0; color: #1f2937;'>📝 Current Questions</h3>
                    <p style='color: #6b7280; margin-bottom: 1rem;'>These are the questions that will be asked during your calls:</p>
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
                            <div style="font-size: 0.875rem; color: #6b7280;">
                                Question ${index + 1} of ${questions.length}
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
    }
}); 