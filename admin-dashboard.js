document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    console.log('Admin Dashboard loaded');
    console.log('Token exists:', !!token);
    console.log('User:', user);
    
    // Check for token and user role
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    // Elements
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const userTableBody = document.querySelector('#userTable tbody');

    // Add User Modal Elements
    const addUserModal = document.getElementById('addUserModal');
    const addUserBtn = document.getElementById('addUserBtn');
    const closeModalBtn = addUserModal.querySelector('.close-btn');
    const addUserForm = document.getElementById('addUserForm');
    const addUserError = document.getElementById('addUserError');
    const newUserCredits = document.getElementById('newUserCredits');

    // Edit User Modal Elements
    const editUserModal = document.getElementById('editUserModal');
    const closeEditModalBtn = editUserModal.querySelector('.close-btn');
    const editUserForm = document.getElementById('editUserForm');
    const editUserError = document.getElementById('editUserError');
    const editUserId = document.getElementById('editUserId');
    const editUserName = document.getElementById('editUserName');
    const editUserEmail = document.getElementById('editUserEmail');
    const editUserRole = document.getElementById('editUserRole');
    const editUserCredits = document.getElementById('editUserCredits');

    // Display welcome message
    welcomeMessage.textContent = `Welcome, ${user.name}!`;

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    // Fetch and display users
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 403) {
                // If token is invalid or expired
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json(); // Get the full response object
            if (data && data.users && Array.isArray(data.users)) {
                const users = data.users; // Correctly access the nested users array
                userTableBody.innerHTML = ''; // Clear existing table data
                users.forEach(u => {
                    const row = document.createElement('tr');
                    // Store the user object in a data attribute, ensuring proper HTML encoding
                    const userJSON = JSON.stringify(u).replace(/'/g, "&apos;");
                    row.innerHTML = `
                        <td>${u.id}</td>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td><span class="role-chip role-${u.role}">${u.role}</span></td>
                        <td>${u.credits ?? 0}</td>
                        <td>${formatDate(u.created_at)}</td>
                        <td>${formatDate(u.last_login)}</td>
                        <td>
                            <div class="actions-container">
                                <button class="actions-btn edit-btn" data-user='${userJSON}'>Edit</button>
                                <button class="actions-btn delete-btn" data-id="${u.id}">Delete</button>
                            </div>
                        </td>
                    `;
                    userTableBody.appendChild(row);
                });

                // Add event listeners for edit buttons
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userToEdit = JSON.parse(e.currentTarget.dataset.user);
                        openEditModal(userToEdit);
                    });
                });

                // Add event listeners for delete buttons
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userId = e.currentTarget.dataset.id;
                        handleDeleteUser(userId);
                    });
                });
            } else {
                userTableBody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            userTableBody.innerHTML = '<tr><td colspan="7">Error loading users.</td></tr>';
        }
    };

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // --- Download Responses Logic ---
    const downloadResponsesBtn = document.getElementById('downloadResponsesBtn');
    
    downloadResponsesBtn.addEventListener('click', async () => {
        try {
            // Disable button and show loading state
            downloadResponsesBtn.disabled = true;
            downloadResponsesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-responses', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to download responses');
            }

            // Get the filename from the response headers
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'call_responses.xlsx';
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

            // Show success message
            alert('Responses downloaded successfully!');

        } catch (error) {
            console.error('Error downloading responses:', error);
            alert(`Error downloading responses: ${error.message}`);
        } finally {
            // Re-enable button and restore original text
            downloadResponsesBtn.disabled = false;
            downloadResponsesBtn.innerHTML = '<i class="fas fa-download"></i> Download Responses';
        }
    });

    // --- Add User Modal Logic ---
    
    // Open modal
    addUserBtn.addEventListener('click', () => {
        addUserModal.style.display = 'flex';
        addUserForm.reset();
        addUserError.textContent = '';
    });

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        addUserModal.style.display = 'none';
    });

    // Handle Add User Form Submission
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addUserError.textContent = '';

        const name = document.getElementById('newUserName').value;
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const credits = parseInt(newUserCredits.value, 10) || 0;

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, password, credits })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create user');
            }

            // Close modal and refresh users
            addUserModal.style.display = 'none';
            fetchUsers();
            alert('User created successfully!');
        } catch (error) {
            addUserError.textContent = error.message;
        }
    });

    // --- Edit User Modal Logic ---

    // Open the modal and populate it with user data
    const openEditModal = (userData) => {
        editUserId.value = userData.id;
        editUserName.value = userData.name;
        editUserEmail.value = userData.email;
        editUserRole.value = userData.role;
        editUserCredits.value = userData.credits ?? 0;
        editUserError.textContent = '';
        editUserModal.style.display = 'flex';
    };

    // Close edit modal
    closeEditModalBtn.addEventListener('click', () => {
        editUserModal.style.display = 'none';
    });
    
    // Combined window click listener for closing modals
    window.addEventListener('click', (event) => {
        if (event.target === addUserModal) {
            addUserModal.style.display = 'none';
        }
        if (event.target === editUserModal) {
            editUserModal.style.display = 'none';
        }
    });

    // Handle Edit User Form Submission
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editUserError.textContent = '';

        const id = editUserId.value;
        const name = editUserName.value;
        const email = editUserEmail.value;
        const role = editUserRole.value;
        const credits = parseInt(editUserCredits.value, 10) || 0;

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, role, credits })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to update user');
            }

            // Success
            editUserModal.style.display = 'none';
            fetchUsers(); // Refresh the user list
            alert('User updated successfully!');

        } catch (error) {
            editUserError.textContent = error.message;
        }
    });

    // --- Delete User Logic ---
    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to delete user');
            }

            // Success
            fetchUsers(); // Refresh the user list
            alert('User deleted successfully!');

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Initial data fetch
    fetchUsers();

    // --- Reports Section Logic ---
    
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Load data for the selected tab
            loadTabData(tabName);
        });
    });

    // Load data for specific tab
    function loadTabData(tabName) {
        console.log(`🔄 Loading data for tab: ${tabName}`);
        switch(tabName) {
            case 'calls':
                loadCalls();
                break;
            case 'responses':
                loadResponses();
                break;
            case 'transcripts':
                loadTranscripts();
                break;
            case 'users':
                loadUsersAnalytics();
                break;
            default:
                console.log('Unknown tab:', tabName);
        }
    }

    // Load calls data
    const loadCallsData = async () => {
        try {
            console.log('Loading calls data...');
            const response = await fetch('/api/calls', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Calls response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`Failed to fetch calls: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Calls data received:', data);
            
            if (!data.calls || data.calls.length === 0) {
                const callsTableBody = document.querySelector('#callsTable tbody');
                if (callsTableBody) {
                    callsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No calls found</td></tr>';
                }
                return;
            }
            
            // Use the displayCalls function that includes edit/delete buttons
            displayCalls(data.calls);
            
            console.log(`Loaded ${data.calls.length} calls successfully`);
        } catch (error) {
            console.error('Error loading calls:', error);
            const callsTableBody = document.querySelector('#callsTable tbody');
            if (callsTableBody) {
                callsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: red;">Error loading calls: ${error.message}</td></tr>`;
            }
        }
    };

    // Load responses data
    const loadResponsesData = async () => {
        try {
            console.log('Loading responses data...');
            const response = await fetch('/api/responses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Responses response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Responses response error:', errorText);
                throw new Error(`Failed to fetch responses: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Responses data received:', data);
            
            const responsesTableBody = document.querySelector('#responsesTable tbody');
            if (!responsesTableBody) {
                console.error('Responses table body not found!');
                return;
            }
            
            responsesTableBody.innerHTML = '';
            
            if (!data.responses || data.responses.length === 0) {
                responsesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No responses found</td></tr>';
                return;
            }
            
            data.responses.forEach(resp => {
                const row = document.createElement('tr');
                const responseData = JSON.stringify(resp).replace(/'/g, "&apos;");
                row.innerHTML = `
                    <td>${resp.id || 'N/A'}</td>
                    <td>${resp.callSid || 'N/A'}</td>
                    <td>${resp.userName || 'N/A'}</td>
                    <td>${resp.phone || 'N/A'}</td>
                    <td>${resp.answers ? resp.answers.length : 0}</td>
                    <td>${new Date(resp.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td><span class="status-badge completed">Completed</span></td>
                    <td>
                        <button class="view-btn" data-response='${responseData}'>
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="download-btn" onclick="downloadResponseReport('${resp.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </td>
                `;
                responsesTableBody.appendChild(row);
            });
            
            // Add event listeners for view buttons
            document.querySelectorAll('.view-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    console.log('🔘 View button clicked');
                    const responseData = JSON.parse(e.currentTarget.dataset.response);
                    console.log('📊 Parsed response data:', responseData);
                    console.log('📋 Response answers:', responseData.answers);
                    openResponseModal(responseData);
                });
            });
            
            console.log(`Loaded ${data.responses.length} responses successfully`);
        } catch (error) {
            console.error('Error loading responses:', error);
            const responsesTableBody = document.querySelector('#responsesTable tbody');
            if (responsesTableBody) {
                responsesTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: red;">Error loading responses: ${error.message}</td></tr>`;
            }
        }
    };

    // Load analytics data
    const loadAnalyticsData = async () => {
        try {
            const [usersResponse, callsResponse] = await Promise.all([
                fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/calls', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!usersResponse.ok || !callsResponse.ok) throw new Error('Failed to fetch analytics data');
            
            const usersData = await usersResponse.json();
            const callsData = await callsResponse.json();
            
            const totalUsers = usersData.users.length;
            const totalCalls = callsData.calls.length;
            const completedCalls = callsData.calls.filter(call => call.completed).length;
            const failedCalls = callsData.calls.filter(call => call.failed).length;
            
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('totalCalls').textContent = totalCalls;
            document.getElementById('completedCalls').textContent = completedCalls;
            document.getElementById('failedCalls').textContent = failedCalls;
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    };

    // Download functions (global scope for onclick handlers)
    window.downloadCallReport = async (callId) => {
        try {
            const response = await fetch(`/api/download-call-report/${callId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download call report');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `call_report_${callId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert(`Error downloading call report: ${error.message}`);
        }
    };

    // Make downloadResponseReport globally accessible
    window.downloadResponseReport = downloadResponseReport;

    // Download individual response report
    async function downloadResponseReport(responseId) {
        try {
            console.log(`📥 Downloading response report for ${responseId}...`);
            const response = await fetch(`/api/download-response-report/${responseId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `response_report_${responseId}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ Response report downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading response report:', error);
            alert('Failed to download response report: ' + error.message);
        }
    }

    // Test function for response modal (can be called from browser console)
    window.testResponseModal = () => {
        const testResponseData = {
            id: "test-resp-001",
            callSid: "CA1234567890abcdef",
            userName: "Test User",
            phone: "+91 9876543210",
            timestamp: new Date().toISOString(),
            answers: [
                "Yes, I am interested in the position",
                "I have 5 years of experience in software development",
                "My expected salary is 50,000 dollars per year",
                "I can start immediately",
                "I prefer remote work"
            ],
            confidences: [0.92, 0.87, 0.85, 0.94, 0.91]
        };
        
        console.log('🧪 Testing response modal with sample data:', testResponseData);
        openResponseModal(testResponseData);
    };

    // Debug function to check if modal elements exist
    window.debugModalElements = () => {
        const modal = document.getElementById('viewResponseModal');
        const questionsList = document.getElementById('questionsAnswersList');
        const responseId = document.getElementById('responseId');
        
        console.log('🔍 Modal element:', modal);
        console.log('🔍 Questions list element:', questionsList);
        console.log('🔍 Response ID element:', responseId);
        
        if (modal) {
            console.log('✅ Modal found');
            console.log('📋 Modal display style:', modal.style.display);
        } else {
            console.log('❌ Modal not found');
        }
        
        if (questionsList) {
            console.log('✅ Questions list found');
        } else {
            console.log('❌ Questions list not found');
        }
    };

    // Download all reports button
    const downloadAllReportsBtn = document.getElementById('downloadAllReportsBtn');
    downloadAllReportsBtn.addEventListener('click', async () => {
        try {
            downloadAllReportsBtn.disabled = true;
            downloadAllReportsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-all-reports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download all reports');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all_reports_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('All reports downloaded successfully!');
        } catch (error) {
            alert(`Error downloading all reports: ${error.message}`);
        } finally {
            downloadAllReportsBtn.disabled = false;
            downloadAllReportsBtn.innerHTML = '<i class="fas fa-download"></i> Download All Reports';
        }
    });

    // Refresh reports button
    const refreshReportsBtn = document.getElementById('refreshReportsBtn');
    refreshReportsBtn.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            loadTabData(activeTab.dataset.tab);
        }
    });

    // Individual tab download buttons
    const downloadCallsBtn = document.getElementById('downloadCallsBtn');
    downloadCallsBtn.addEventListener('click', async () => {
        try {
            downloadCallsBtn.disabled = true;
            downloadCallsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-calls-report', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download calls report');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calls_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Calls report downloaded successfully!');
        } catch (error) {
            alert(`Error downloading calls report: ${error.message}`);
        } finally {
            downloadCallsBtn.disabled = false;
            downloadCallsBtn.innerHTML = '<i class="fas fa-download"></i> Download Calls';
        }
    });

    const downloadResponsesTabBtn = document.getElementById('downloadResponsesTabBtn');
    downloadResponsesTabBtn.addEventListener('click', async () => {
        try {
            downloadResponsesTabBtn.disabled = true;
            downloadResponsesTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-responses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download responses');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `responses_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Responses report downloaded successfully!');
        } catch (error) {
            alert(`Error downloading responses report: ${error.message}`);
        } finally {
            downloadResponsesTabBtn.disabled = false;
            downloadResponsesTabBtn.innerHTML = '<i class="fas fa-download"></i> Download Responses';
        }
    });

    const downloadUsersBtn = document.getElementById('downloadUsersBtn');
    downloadUsersBtn.addEventListener('click', async () => {
        try {
            downloadUsersBtn.disabled = true;
            downloadUsersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-users-analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download users analytics');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Users analytics downloaded successfully!');
        } catch (error) {
            alert(`Error downloading users analytics: ${error.message}`);
        } finally {
            downloadUsersBtn.disabled = false;
            downloadUsersBtn.innerHTML = '<i class="fas fa-download"></i> Download Analytics';
        }
    });

    // Load initial reports data
    console.log('Loading initial reports data...');
    loadTabData('calls');

    // Load and display responses
    async function loadResponses() {
        try {
            console.log('🔍 Loading responses...');
            const response = await fetch('/api/responses', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Responses data:', data);
            
            if (data.success && data.responses) {
                displayResponses(data.responses);
            } else {
                console.error('❌ Failed to load responses:', data.message);
                document.getElementById('responsesTable').innerHTML = '<tr><td colspan="8" class="no-data">No response data available</td></tr>';
            }
        } catch (error) {
            console.error('❌ Error loading responses:', error);
            document.getElementById('responsesTable').innerHTML = '<tr><td colspan="8" class="no-data">Error loading responses</td></tr>';
        }
    }

    // Display responses in table
    function displayResponses(responses) {
        const tbody = document.querySelector('#responsesTable tbody');
        tbody.innerHTML = '';
        
        if (responses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No responses found</td></tr>';
            return;
        }
        
        responses.forEach(response => {
            const row = document.createElement('tr');
            // Store the response data in a data attribute
            const responseData = JSON.stringify(response).replace(/'/g, "&apos;");
            row.innerHTML = `
                <td>${response.id || 'N/A'}</td>
                <td>${response.callSid || 'N/A'}</td>
                <td>${response.userName || 'N/A'}</td>
                <td>${response.phone || 'N/A'}</td>
                <td>${response.answers ? response.answers.length : 0}</td>
                <td>${new Date(response.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td><span class="status-badge completed">Completed</span></td>
                <td>
                    <button class="action-btn view-btn" data-response='${responseData}' title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadResponseReport('${response.id}')" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for view buttons
        document.querySelectorAll('#responsesTable .view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('🔘 View button clicked');
                const responseData = JSON.parse(e.currentTarget.dataset.response);
                console.log('📊 Parsed response data:', responseData);
                console.log('📋 Response answers:', responseData.answers);
                openResponseModal(responseData);
            });
        });
    }

    // Load and display transcripts
    async function loadTranscripts() {
        try {
            console.log('🔍 Loading transcripts...');
            const response = await fetch('/api/transcripts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Transcripts data:', data);
            
            if (data.success && data.transcripts) {
                displayTranscripts(data.transcripts);
            } else {
                console.error('❌ Failed to load transcripts:', data.message);
                document.getElementById('transcriptsTable').innerHTML = '<tr><td colspan="10" class="no-data">No transcript data available</td></tr>';
            }
        } catch (error) {
            console.error('❌ Error loading transcripts:', error);
            document.getElementById('transcriptsTable').innerHTML = '<tr><td colspan="10" class="no-data">Error loading transcripts</td></tr>';
        }
    }

    // Display transcripts in table
    function displayTranscripts(transcripts) {
        const tbody = document.querySelector('#transcriptsTable tbody');
        tbody.innerHTML = '';
        
        if (transcripts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="no-data">No transcripts found</td></tr>';
            return;
        }
        
        transcripts.forEach(transcript => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transcript.id}</td>
                <td>${transcript.callSid}</td>
                <td>${transcript.userName || 'N/A'}</td>
                <td>${transcript.contactName}</td>
                <td>${transcript.phone}</td>
                <td>${new Date(transcript.callDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td>${transcript.duration}</td>
                <td>${transcript.wordsCount}</td>
                <td><span class="confidence-badge ${getConfidenceClass(transcript.confidence)}">${(transcript.confidence * 100).toFixed(1)}%</span></td>
                <td>
                    <button class="action-btn view-btn" onclick="viewTranscript('${transcript.id}')" title="View Transcript">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadTranscriptReport('${transcript.id}')" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Get confidence class for styling
    function getConfidenceClass(confidence) {
        if (confidence >= 0.9) return 'high';
        if (confidence >= 0.7) return 'medium';
        return 'low';
    }

    // View transcript details
    function viewTranscript(transcriptId) {
        // This would open a modal with detailed transcript view
        console.log(`Viewing transcript ${transcriptId}`);
    }

    // Download individual transcript report
    async function downloadTranscriptReport(transcriptId) {
        try {
            console.log(`📥 Downloading transcript report for ${transcriptId}...`);
            const response = await fetch(`/api/download-transcript/${transcriptId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_report_${transcriptId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ Transcript report downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading transcript report:', error);
            alert('Failed to download transcript report: ' + error.message);
        }
    }

    // Download all transcripts report
    async function downloadTranscriptsReport() {
        try {
            console.log('📥 Downloading all transcripts report...');
            const response = await fetch('/api/download-transcripts-report', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `transcripts_report_${timestamp}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ All transcripts report downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading transcripts report:', error);
            alert('Failed to download transcripts report: ' + error.message);
        }
    }

    // Event listeners for download buttons
    document.getElementById('downloadCallsBtn').addEventListener('click', downloadCallsReport);
    document.getElementById('downloadResponsesBtn').addEventListener('click', downloadResponsesReport);
    document.getElementById('downloadUsersBtn').addEventListener('click', downloadUsersAnalytics);
    document.getElementById('downloadResponsesTabBtn').addEventListener('click', downloadResponsesReport);
    document.getElementById('downloadTranscriptsBtn').addEventListener('click', downloadTranscriptsReport);
    document.getElementById('refreshTranscriptsBtn').addEventListener('click', () => loadTabData('transcripts'));

    // Display calls in table
    function displayCalls(calls) {
        const tbody = document.getElementById('callsTableBody');
        tbody.innerHTML = '';
        
        if (calls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No calls found</td></tr>';
            return;
        }
        
        calls.forEach(call => {
            const row = document.createElement('tr');
            const status = call.completed ? 'completed' : call.failed ? 'failed' : 'pending';
            const statusText = call.completed ? 'Completed' : call.failed ? 'Failed' : 'Pending';
            
            row.innerHTML = `
                <td>${call.id}</td>
                <td>${call.name}</td>
                <td>${call.phone}</td>
                <td>${new Date(call.scheduledTime || call.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td><span class="status-badge ${status}">${statusText}</span></td>
                <td>${call.userName || 'N/A'}</td>
                <td>
                    ${status !== 'completed' && status !== 'failed' ? `
                        <div class="scheduled-call-actions">
                            <button onclick="editCall(${call.id})" class="edit-btn" title="Edit Call">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="deleteCall(${call.id})" class="delete-btn" title="Delete Call">
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
                            <button onclick="deleteCall(${call.id})" class="delete-btn" title="Delete Call">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                            <button onclick="downloadCallText(${call.id})" class="download-text-btn" title="Download Text Report">
                                <i class="fas fa-file-alt"></i> Text
                            </button>
                        </div>
                    `}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Trigger call immediately
    async function triggerCall(callId) {
        try {
            const confirmed = confirm('Are you sure you want to trigger this call immediately?');
            if (!confirmed) {
                return;
            }
            
            console.log(`🚀 Triggering call: ${callId}`);
            
            const response = await fetch(`/api/trigger-call/${callId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to trigger call');
            }
            
            const data = await response.json();
            if (data.success) {
                console.log('✅ Call triggered successfully');
                alert('Call triggered successfully!');
                loadCalls(); // Refresh the calls list
            } else {
                throw new Error(data.message || 'Failed to trigger call');
            }
            
        } catch (error) {
            console.error('❌ Error triggering call:', error);
            alert('Failed to trigger call: ' + error.message);
        }
    }

    // Edit call function
    async function editCall(callId) {
        try {
            console.log(`✏️ Editing call: ${callId}`);
            
            // Fetch call details
            const response = await fetch(`/api/calls/${callId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch call details');
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch call details');
            }
            
            const call = data.call;
            
            // Populate the form with existing data
            document.getElementById('contactName').value = call.name;
            document.getElementById('phoneNumber').value = call.phone;
            
            // Convert UTC time to local time for the datetime-local input
            const localTime = new Date(call.scheduledTime || call.time);
            const year = localTime.getFullYear();
            const month = String(localTime.getMonth() + 1).padStart(2, '0');
            const day = String(localTime.getDate()).padStart(2, '0');
            const hours = String(localTime.getHours()).padStart(2, '0');
            const minutes = String(localTime.getMinutes()).padStart(2, '0');
            const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            document.getElementById('scheduledTime').value = localDateTime;
            
            // Change form mode to edit
            document.getElementById('scheduleForm').setAttribute('data-edit-mode', 'true');
            document.getElementById('scheduleForm').setAttribute('data-edit-id', callId);
            document.getElementById('scheduleCallBtn').textContent = 'Update Call';
            document.getElementById('scheduleCallBtn').innerHTML = '<i class="fas fa-edit"></i> Update Call';
            
            // Show cancel button
            document.getElementById('cancelEditBtn').style.display = 'inline-flex';
            
            // Scroll to form
            document.getElementById('scheduleForm').scrollIntoView({ behavior: 'smooth' });
            
            console.log('✅ Form populated for editing');
            
        } catch (error) {
            console.error('❌ Error editing call:', error);
            alert('Failed to load call details: ' + error.message);
        }
    }

    // Delete call function
    async function deleteCall(callId) {
        try {
            const confirmed = confirm('Are you sure you want to delete this call? This action cannot be undone.');
            if (!confirmed) {
                return;
            }
            
            console.log(`🗑️ Deleting call: ${callId}`);
            
            const response = await fetch(`/api/calls/${callId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete call');
            }
            
            // Success
            fetchCalls(); // Refresh the calls list
            alert('Call deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting call:', error);
            alert('Failed to delete call: ' + error.message);
        }
    }

    // Make functions globally accessible for onclick handlers
    window.editCall = editCall;
    window.deleteCall = deleteCall;
    window.triggerCall = triggerCall;
    window.downloadCallReport = downloadCallReport;
    window.downloadCallText = downloadCallText;
    window.openResponseModal = openResponseModal;

    // Function to open response details modal
    function openResponseModal(responseData) {
        console.log('🔍 Opening response modal with data:', responseData);
        
        // Get modal elements
        const modal = document.getElementById('viewResponseModal');
        const responseId = document.getElementById('responseId');
        const responseCallSid = document.getElementById('responseCallSid');
        const responseUserName = document.getElementById('responseUserName');
        const responsePhone = document.getElementById('responsePhone');
        const responseDate = document.getElementById('responseDate');
        const questionsAnswersList = document.getElementById('questionsAnswersList');
        const downloadBtn = document.getElementById('downloadResponseDetailsBtn');
        
        if (!modal) {
            console.error('❌ Response modal not found');
            alert('Modal not found. Please refresh the page.');
            return;
        }
        
        // Populate modal with response data
        responseId.textContent = responseData.id || 'N/A';
        responseCallSid.textContent = responseData.callSid || 'N/A';
        responseUserName.textContent = responseData.userName || 'N/A';
        responsePhone.textContent = responseData.phone || 'N/A';
        responseDate.textContent = new Date(responseData.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        // Load questions to match with answers
        loadQuestionsForModal(responseData, questionsAnswersList);
        
        // Set up download button
        downloadBtn.onclick = () => downloadResponseDetails(responseData.id);
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close modal when clicking on X or outside
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        console.log('✅ Response modal opened successfully');
    }

    // Function to load questions for the modal
    async function loadQuestionsForModal(responseData, container) {
        try {
            const response = await fetch('/api/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            
            const data = await response.json();
            const questions = data.questions || [];
            
            // Generate questions and answers HTML
            container.innerHTML = generateQuestionsHTML(responseData, questions);
            
        } catch (error) {
            console.error('❌ Error loading questions:', error);
            container.innerHTML = '<div class="error-message">Error loading questions</div>';
        }
    }

    // Function to generate questions HTML
    function generateQuestionsHTML(responseData, questions) {
        if (!responseData.answers || responseData.answers.length === 0) {
            return '<div class="no-data">No responses recorded for this call.</div>';
        }
        
        let html = '';
        
        responseData.answers.forEach((answer, index) => {
            const question = questions[index] || `Question ${index + 1}`;
            const confidence = responseData.confidences && responseData.confidences[index] 
                ? (responseData.confidences[index] * 100).toFixed(1) 
                : 'N/A';
            
            const confidenceClass = confidence !== 'N/A' 
                ? (confidence >= 80 ? 'confidence-high' : confidence >= 60 ? 'confidence-medium' : 'confidence-low')
                : '';
            
            html += `
                <div class="qa-item">
                    <div class="qa-question">
                        Q${index + 1}: ${question}
                    </div>
                    <div class="qa-answer">
                        <strong>Answer:</strong> ${answer || 'No response recorded'}
                        ${confidence !== 'N/A' ? `<span class="qa-confidence ${confidenceClass}">${confidence}%</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    // Function to download response details
    async function downloadResponseDetails(responseId) {
        try {
            console.log(`📥 Downloading response details for ${responseId}...`);
            
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
            a.download = `response_details_${responseId}_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ Response details downloaded successfully');
            alert('Response details downloaded successfully!');
        } catch (error) {
            console.error('❌ Error downloading response details:', error);
            alert('Failed to download response details: ' + error.message);
        }
    }

    // Function to download call as text file
    async function downloadCallText(callId) {
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
            
            alert('Text file downloaded successfully!');
            
        } catch (error) {
            console.error('Error downloading text file:', error);
            alert('Failed to download text file: ' + error.message);
        }
    }
});