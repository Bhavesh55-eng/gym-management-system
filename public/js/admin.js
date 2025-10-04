import { db, auth, logger } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query, 
    orderBy, 
    limit,
    where,
    Timestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated and has admin role
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userRole = await getUserRole(user.uid);
            if (userRole !== 'admin') {
                logger.warn('Non-admin user attempting to access admin dashboard', { uid: user.uid });
                window.location.href = '/public/index.html';
                return;
            }
            
            // Load dashboard data
            await loadDashboardData();
        } else {
            window.location.href = '/public/index.html';
        }
    });
});

// Load dashboard statistics and data
async function loadDashboardData() {
    try {
        logger.info('Loading dashboard data');
        
        // Load statistics
        await Promise.all([
            loadMemberStats(),
            loadRevenueStats(),
            loadRecentMembers(),
            loadPendingTasks()
        ]);
        
        logger.info('Dashboard data loaded successfully');
    } catch (error) {
        logger.error('Failed to load dashboard data', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// Load member statistics
async function loadMemberStats() {
    try {
        const membersRef = collection(db, 'users');
        const membersQuery = query(membersRef, where('role', '==', 'member'));
        const membersSnapshot = await getDocs(membersQuery);
        
        const totalMembers = membersSnapshot.size;
        let activeMembers = 0;
        let expiringMembers = 0;
        
        const currentDate = new Date();
        const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        membersSnapshot.forEach(doc => {
            const member = doc.data();
            if (member.membershipStatus === 'active') {
                activeMembers++;
                
                if (member.membershipEndDate && member.membershipEndDate.toDate() <= nextWeek) {
                    expiringMembers++;
                }
            }
        });
        
        // Update UI
        document.getElementById('total-members').textContent = totalMembers;
        document.getElementById('active-memberships').textContent = activeMembers;
        document.getElementById('expiring-soon').textContent = expiringMembers;
        
        logger.info('Member stats loaded', { totalMembers, activeMembers, expiringMembers });
    } catch (error) {
        logger.error('Failed to load member stats', error);
    }
}

// Load revenue statistics
async function loadRevenueStats() {
    try {
        const paymentsRef = collection(db, 'payments');
        const currentMonth = new Date();
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        const paymentsQuery = query(
            paymentsRef,
            where('paymentDate', '>=', Timestamp.fromDate(firstDayOfMonth)),
            where('status', '==', 'completed')
        );
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        let monthlyRevenue = 0;
        
        paymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            monthlyRevenue += payment.amount || 0;
        });
        
        // Update UI
        document.getElementById('monthly-revenue').textContent = `₹${monthlyRevenue.toLocaleString()}`;
        
        logger.info('Revenue stats loaded', { monthlyRevenue });
    } catch (error) {
        logger.error('Failed to load revenue stats', error);
    }
}

// Load recent members
async function loadRecentMembers() {
    try {
        const membersRef = collection(db, 'users');
        const recentMembersQuery = query(
            membersRef,
            where('role', '==', 'member'),
            orderBy('joinDate', 'desc'),
            limit(5)
        );
        
        const recentMembersSnapshot = await getDocs(recentMembersQuery);
        const membersList = document.getElementById('recent-members');
        membersList.innerHTML = '';
        
        recentMembersSnapshot.forEach(doc => {
            const member = doc.data();
            const memberElement = createMemberListItem(member, doc.id);
            membersList.appendChild(memberElement);
        });
        
        logger.info('Recent members loaded');
    } catch (error) {
        logger.error('Failed to load recent members', error);
    }
}

// Create member list item
function createMemberListItem(member, memberId) {
    const memberDiv = document.createElement('div');
    memberDiv.className = 'member-item';
    memberDiv.innerHTML = `
        <div class="member-avatar">
            <img src="${member.profileImage || '../public/images/default-avatar.jpg'}" alt="${member.firstName}">
        </div>
        <div class="member-info">
            <h4>${member.firstName} ${member.lastName}</h4>
            <p>${member.email}</p>
            <span class="member-status ${member.membershipStatus}">${member.membershipStatus}</span>
        </div>
        <div class="member-actions">
            <button onclick="viewMember('${memberId}')" class="btn-icon" title="View Member">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="editMember('${memberId}')" class="btn-icon" title="Edit Member">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;
    return memberDiv;
}

// Load pending tasks
async function loadPendingTasks() {
    try {
        // This is a simplified version - you can expand based on your needs
        const tasksContainer = document.querySelector('.tasks-list');
        
        // Example: Check for expiring memberships
        const membersRef = collection(db, 'users');
        const currentDate = new Date();
        const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const expiringQuery = query(
            membersRef,
            where('membershipEndDate', '<=', Timestamp.fromDate(nextWeek)),
            where('membershipStatus', '==', 'active')
        );
        
        const expiringSnapshot = await getDocs(expiringQuery);
        const expiringCount = expiringSnapshot.size;
        
        // Update the existing task item with actual count
        const renewalTask = tasksContainer.querySelector('.task-item:first-child .task-content p');
        if (renewalTask) {
            renewalTask.textContent = `${expiringCount} members have memberships expiring in the next 7 days`;
        }
        
        logger.info('Pending tasks loaded');
    } catch (error) {
        logger.error('Failed to load pending tasks', error);
    }
}

// Add new member
async function addNewMember(memberData) {
    try {
        logger.info('Adding new member', { email: memberData.email });
        
        // Create user document
        const newMember = {
            ...memberData,
            role: 'member',
            joinDate: new Date(),
            membershipStatus: 'active',
            membershipStartDate: new Date(memberData.startDate),
            membershipEndDate: calculateMembershipEndDate(memberData.startDate, memberData.membershipPlan),
            profileComplete: true,
            addedBy: auth.currentUser.uid
        };
        
        const docRef = await addDoc(collection(db, 'users'), newMember);
        
        // Log the activity
        await logAdminActivity('add_member', `Added new member: ${memberData.firstName} ${memberData.lastName}`);
        
        logger.info('Member added successfully', { memberId: docRef.id });
        showNotification('Member added successfully!', 'success');
        
        // Refresh dashboard data
        await loadDashboardData();
        
        return docRef.id;
    } catch (error) {
        logger.error('Failed to add member', error);
        showNotification(`Failed to add member: ${error.message}`, 'error');
        throw error;
    }
}

// Calculate membership end date based on plan
function calculateMembershipEndDate(startDate, plan) {
    const start = new Date(startDate);
    const endDate = new Date(start);
    
    switch (plan) {
        case 'basic':
        case 'premium':
        case 'vip':
            endDate.setMonth(endDate.getMonth() + 1); // 1 month
            break;
        default:
            endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
}

// Send notifications to members
async function sendNotifications() {
    try {
        logger.info('Sending notifications to members');
        
        // This is a simplified version - implement based on your notification system
        const message = prompt('Enter notification message:');
        if (!message) return;
        
        const notification = {
            message: message,
            sentBy: auth.currentUser.uid,
            sentAt: new Date(),
            type: 'general'
        };
        
        await addDoc(collection(db, 'notifications'), notification);
        
        await logAdminActivity('send_notification', `Sent notification: ${message}`);
        
        showNotification('Notification sent successfully!', 'success');
        logger.info('Notification sent');
    } catch (error) {
        logger.error('Failed to send notification', error);
        showNotification('Failed to send notification', 'error');
    }
}

// Generate report
async function generateReport() {
    try {
        logger.info('Generating report');
        
        // Redirect to reports page
        window.location.href = 'reports.html';
    } catch (error) {
        logger.error('Failed to generate report', error);
        showNotification('Failed to generate report', 'error');
    }
}

// Log admin activity
async function logAdminActivity(action, description) {
    try {
        const activityLog = {
            uid: auth.currentUser.uid,
            action: action,
            description: description,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            type: 'admin_action'
        };
        
        await addDoc(collection(db, 'adminActivityLogs'), activityLog);
        logger.info('Admin activity logged', { action });
    } catch (error) {
        logger.error('Failed to log admin activity', error);
    }
}

// Modal functions
function openAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'block';
    logger.info('Add member modal opened');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    logger.info('Modal closed', { modalId });
}

// Event listeners
document.getElementById('addMemberForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const memberData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        membershipPlan: formData.get('membershipPlan'),
        startDate: formData.get('startDate')
    };
    
    try {
        await addNewMember(memberData);
        closeModal('addMemberModal');
        e.target.reset();
    } catch (error) {
        // Error already handled in addNewMember function
    }
});

// Export functions for global access
window.openAddMemberModal = openAddMemberModal;
window.closeModal = closeModal;
window.sendNotifications = sendNotifications;
window.generateReport = generateReport;
