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
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            showNotification(`${title} feature coming soon!`, 'info');
        });
    });

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
            // Add form submit handler
            const scheduleForm = document.getElementById('scheduleCallForm');
            if (scheduleForm) {
                scheduleForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const name = document.getElementById('callName').value.trim();
                    const phone = document.getElementById('callPhone').value.trim();
                    const time = document.getElementById('callTime').value;
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
                            body: JSON.stringify({ name, phone, time })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                            showNotification('Call scheduled successfully!', 'success');
                            scheduleForm.reset();
                        } else {
                            showNotification(data.message || 'Failed to schedule call', 'error');
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
                                </div>
                            ` : `
                                <div class="scheduled-call-actions">
                                    <button onclick="deleteUserCall(${call.id})" class="delete-btn" title="Delete Call">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            `;
                            
                            return `<li style="margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <strong>${call.name}</strong> (${call.phone})<br>
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
    }

    // Helper to get current user ID from token
    function getCurrentUserId() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId;
        } catch (err) {
            console.error('Error parsing token:', err);
            return null;
        }
    }

    // Function to view response details with proper modal implementation
    async function viewResponseDetails(responseId) {
        try {
            console.log('🔍 Fetching response details for:', responseId);
            console.log('📋 Response ID type:', typeof responseId);
            
            // Validate responseId
            if (!responseId || responseId === 'undefined' || responseId === 'null') {
                console.error('❌ Invalid response ID:', responseId);
                showNotification('Invalid response ID. Please try again.', 'error');
                return;
            }
            
            // Fetch the specific response details
            const response = await fetch(`/api/responses/${responseId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch response details');
            }
            
            const data = await response.json();
            console.log('📊 Response data:', data);
            
            if (!data.success || !data.response) {
                throw new Error('Invalid response data');
            }
            
            const responseData = data.response;
            
            // Load questions to match with answers
            const questionsResponse = await fetch('/api/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const questionsData = await questionsResponse.json();
            const questions = questionsData.questions || [];
            
            // Create and show modal
            showResponseDetailsModal(responseData, questions);
            
        } catch (error) {
            console.error('Error fetching response details:', error);
            showNotification('Failed to load response details. Please try again.', 'error');
        }
    }

    // Function to show response details modal
    function showResponseDetailsModal(responseData, questions) {
        // Remove existing modal if any
        const existingModal = document.getElementById('userResponseModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal HTML
        const modalHTML = `
            <div id="userResponseModal" class="modal-overlay" style="
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
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                            <i class="fas fa-eye" style="color: #667eea; margin-right: 0.5rem;"></i>
                            Call Response Details
                        </h2>
                        <button id="closeUserResponseModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                                <div>
                                    <strong>Response ID:</strong> ${responseData.id || 'N/A'}
                                </div>
                                <div>
                                    <strong>Call SID:</strong> ${responseData.callSid || 'N/A'}
                                </div>
                                <div>
                                    <strong>Date:</strong> ${new Date(responseData.timestamp).toLocaleString('en-IN')}
                                </div>
                                <div>
                                    <strong>Questions Answered:</strong> ${responseData.answers?.length || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="responseQuestionsList">
                        ${generateQuestionsHTML(responseData, questions)}
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem; gap: 1rem;">
                        <button id="downloadUserResponseBtn" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <i class="fas fa-download"></i> Download Response
                        </button>
                        <button id="closeUserResponseModalBtn" style="
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
        document.getElementById('closeUserResponseModal').addEventListener('click', closeUserResponseModal);
        document.getElementById('closeUserResponseModalBtn').addEventListener('click', closeUserResponseModal);
        document.getElementById('downloadUserResponseBtn').addEventListener('click', () => downloadUserResponseDetails(responseData.id));
        
        // Close modal when clicking outside
        document.getElementById('userResponseModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeUserResponseModal();
            }
        });
    }

    // Function to generate questions HTML
    function generateQuestionsHTML(responseData, questions) {
        if (!responseData.answers || responseData.answers.length === 0) {
            return '<div style="text-align: center; color: #6b7280; padding: 2rem;">No responses recorded for this call.</div>';
        }
        
        let html = '<h3 style="margin: 0 0 1rem 0; color: #1f2937;">Questions & Answers</h3>';
        
        responseData.answers.forEach((answer, index) => {
            const question = questions[index] || `Question ${index + 1}`;
            const confidence = responseData.confidences && responseData.confidences[index] 
                ? (responseData.confidences[index] * 100).toFixed(1) 
                : 'N/A';
            
            const confidenceColor = confidence !== 'N/A' 
                ? (confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#ef4444')
                : '#6b7280';
            
            html += `
                <div style="
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                ">
                    <div style="margin-bottom: 0.5rem;">
                        <strong style="color: #374151;">Q${index + 1}:</strong> ${question}
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <strong style="color: #374151;">Answer:</strong> 
                        <span style="color: #6b7280;">${answer || 'No response recorded'}</span>
                    </div>
                    <div>
                        <strong style="color: #374151;">Confidence:</strong> 
                        <span style="color: ${confidenceColor}; font-weight: 600;">
                            ${confidence}${confidence !== 'N/A' ? '%' : ''}
                        </span>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    // Function to close response modal
    function closeUserResponseModal() {
        const modal = document.getElementById('userResponseModal');
        if (modal) {
            modal.remove();
        }
    }

    // Function to download user response details
    async function downloadUserResponseDetails(responseId) {
        try {
            console.log(`📥 Downloading user response details for ${responseId}...`);
            
            const response = await fetch(`/api/download-response-report/${responseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my_response_details_${responseId}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ User response details downloaded successfully');
            showNotification('Response details downloaded successfully!', 'success');
        } catch (error) {
            console.error('❌ Error downloading user response details:', error);
            showNotification('Failed to download response details: ' + error.message, 'error');
        }
    }

    // Function to load all responses (placeholder - can be expanded)
    function loadAllResponses() {
        showNotification('Loading all responses...', 'info');
    }

    // Helper to render the questions management UI
    function renderQuestionsBox(questions) {
        let html = `<div style='margin-bottom:1rem; display: flex; gap: 0.5rem; align-items: center;'>
            <button id='addQuestionBtn' style='background: #667eea; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;'>
                <i class="fas fa-plus"></i> Add Question
            </button>
            <button id='saveAllQuestionsBtn' style='background: #10b981; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;'>
                <i class="fas fa-save"></i> Save All
            </button>
        </div>`;
        
        if (questions.length === 0) {
            html += `<div style='color: #6b7280; font-style: italic; margin: 1rem 0;'>No questions defined. Add some questions to get started.</div>`;
        } else {
            html += `<div id='questionsList'>`;
            questions.forEach((q, idx) => {
                html += `<div style='margin-bottom:0.8rem; padding: 0.8rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;'>
                    <div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;'>
                        <span style='font-weight: 600; color: #374151;'>${idx + 1}.</span>
                        <input type='text' value="${q}" data-idx='${idx}' class='question-input' style='flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; font-size: 0.9rem;' placeholder='Enter question text...'>
                    </div>
                    <div style='display: flex; gap: 0.5rem; justify-content: flex-end;'>
                        <button class='deleteQuestionBtn' data-idx='${idx}' style='background: #ef4444; color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;'>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        
        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>${html}</div>`;

        // Add event listeners
        const addQuestionBtn = document.getElementById('addQuestionBtn');
        const saveAllQuestionsBtn = document.getElementById('saveAllQuestionsBtn');
        
        if (addQuestionBtn) {
            addQuestionBtn.onclick = () => {
                const updated = [...questions, "New question"];
                renderQuestionsBox(updated);
            };
        }
        
        if (saveAllQuestionsBtn) {
            saveAllQuestionsBtn.onclick = async () => {
                const questionInputs = document.querySelectorAll('.question-input');
                const updatedQuestions = Array.from(questionInputs).map(input => input.value.trim()).filter(q => q !== '');
                
                if (updatedQuestions.length === 0) {
                    showNotification('Please add at least one question before saving.', 'error');
                    return;
                }
                
                await updateQuestions(updatedQuestions);
            };
        }
        
        document.querySelectorAll('.deleteQuestionBtn').forEach(btn => {
            btn.onclick = async (e) => {
                const confirmed = confirm('Are you sure you want to delete this question?');
                if (confirmed) {
                    const idx = parseInt(btn.dataset.idx);
                    const updated = questions.filter((_, i) => i !== idx);
                    await updateQuestions(updated);
                }
            };
        });
    }

    // Helper to update questions via backend
    async function updateQuestions(newQuestions) {
        try {
            const response = await fetch('/api/questions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: newQuestions })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                renderQuestionsBox(data.questions);
                showNotification('Questions updated successfully!', 'success');
            } else {
                showNotification(data.message || 'Failed to update questions', 'error');
            }
        } catch (err) {
            console.error('Error updating questions:', err);
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Add event listener for Contact Admin button in navbar
    const contactAdminBtn = document.getElementById('contactAdminBtn');
    if (contactAdminBtn) {
        contactAdminBtn.addEventListener('click', function() {
            showNotification('admin@example.com | +1 234 567 890', 'info');
        });
    }

    // Direct Call button functionality
    document.getElementById('directCallBtn').addEventListener('click', function() {
        showDirectCallModal();
    });

    // Function to show direct call modal
    function showDirectCallModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="directCallModal" class="modal-overlay" style="
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
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                            <i class="fas fa-phone" style="color: #10b981; margin-right: 0.5rem;"></i>
                            Make Direct Call
                        </h2>
                        <button id="closeDirectCallModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <form id="directCallForm">
                        <div style="margin-bottom: 1rem;">
                            <label for="directCallName" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Name</label>
                            <input type="text" id="directCallName" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " placeholder="Enter name">
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label for="directCallPhone" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Phone Number</label>
                            <input type="tel" id="directCallPhone" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " placeholder="+1234567890" pattern="[0-9\\-\\+\\s\\(\\)]{7,}">
                            <small style="color: #6b7280; font-size: 0.875rem;">Include country code (e.g., +1 for US)</small>
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button type="submit" style="
                                flex: 1;
                                background: #10b981;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                <i class="fas fa-phone" style="margin-right: 0.5rem;"></i>
                                Make Call
                            </button>
                            <button type="button" id="cancelDirectCall" style="
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
        document.getElementById('closeDirectCallModal').addEventListener('click', closeDirectCallModal);
        document.getElementById('cancelDirectCall').addEventListener('click', closeDirectCallModal);
        document.getElementById('directCallForm').addEventListener('submit', handleDirectCall);
        
        // Close modal when clicking outside
        document.getElementById('directCallModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeDirectCallModal();
            }
        });
    }
    
    // Function to close direct call modal
    function closeDirectCallModal() {
        const modal = document.getElementById('directCallModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Function to handle direct call submission
    async function handleDirectCall(e) {
        e.preventDefault();
        
        const name = document.getElementById('directCallName').value.trim();
        const phone = document.getElementById('directCallPhone').value.trim();
        
        if (!name || !phone) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        try {
            // Create a call record for immediate execution
            const response = await fetch('/api/direct-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, phone })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showNotification('Call initiated successfully!', 'success');
                closeDirectCallModal();
            } else {
                showNotification(data.message || 'Failed to make call', 'error');
            }
        } catch (err) {
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Function to trigger a call manually
    window.triggerCall = async function(callId) {
        try {
            const response = await fetch(`/api/trigger-call/${callId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showNotification('Call triggered successfully!', 'success');
                // Refresh the calls list
                statCards[1].click();
            } else {
                showNotification(data.message || 'Failed to trigger call', 'error');
            }
        } catch (err) {
            showNotification('Network error. Please try again.', 'error');
        }
    };

    // Function to edit a user call
    window.editUserCall = async function(callId) {
        try {
            console.log('✏️ Editing call:', callId);
            
            const response = await fetch(`/api/calls/${callId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    showNotification('This call no longer exists or was already deleted.', 'error');
                } else {
                    throw new Error('Failed to fetch call details');
                }
                return;
            }
            
            const result = await response.json();
            
            // Check if the response has the expected structure
            if (!result.success || !result.call) {
                showNotification('Invalid call data received from server', 'error');
                return;
            }
            
            const call = result.call;
            showEditCallModal(call);
        } catch (error) {
            console.error('❌ Error editing call:', error);
            showNotification('Error loading call details. Please try again.', 'error');
        }
    };

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
                            <label for="editCallName" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Contact Name</label>
                            <input type="text" id="editCallName" value="${call.name}" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " placeholder="Enter contact name">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label for="editCallPhone" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Phone Number</label>
                            <input type="tel" id="editCallPhone" value="${call.phone}" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " placeholder="+1234567890" pattern="[0-9\\-\\+\\s\\(\\)]{7,}">
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
                body: JSON.stringify({ name, phone, time })
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
}); 