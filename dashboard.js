// Dashboard functionality with Firebase

document.addEventListener('DOMContentLoaded', function() {
    // Display user email
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('userEmail').textContent = user.email.split('@')[0];
        }
    });
    
    // Load dashboard data
    loadDashboardStats();
    loadRecentMembers();
    loadUpcomingRenewals();
});

// Load dashboard statistics from Firebase
async function loadDashboardStats() {
    try {
        // Get total members
        const membersSnapshot = await membersRef.get();
        document.getElementById('totalMembers').textContent = membersSnapshot.size;
        
        // Get total trainers
        const trainersSnapshot = await trainersRef.get();
        document.getElementById('totalTrainers').textContent = trainersSnapshot.size;
        
        // Get total revenue
        const paymentsSnapshot = await paymentsRef.get();
        let totalRevenue = 0;
        paymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            totalRevenue += parseFloat(payment.amount || 0);
        });
        document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toFixed(2);
        
        // Get today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceSnapshot = await attendanceRef
            .where('date', '==', today)
            .get();
        document.getElementById('todayAttendance').textContent = attendanceSnapshot.size;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent members from Firebase
async function loadRecentMembers() {
    const tableBody = document.querySelector('#recentMembersTable tbody');
    
    try {
        const snapshot = await membersRef
            .orderBy('joinDate', 'desc')
            .limit(5)
            .get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No members found</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const member = doc.data();
            html += `
                <tr>
                    <td>${member.name}</td>
                    <td>${formatDateDisplay(member.joinDate)}</td>
                    <td><span class="status-badge status-${member.status.toLowerCase()}">${member.status}</span></td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent members:', error);
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Error loading data</td></tr>';
    }
}

// Load upcoming renewals from Firebase
async function loadUpcomingRenewals() {
    const tableBody = document.querySelector('#upcomingRenewalsTable tbody');
    
    try {
        const today = new Date();
        const thirtyDaysLater = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        const snapshot = await membersRef
            .where('expiryDate', '>=', formatDate(today))
            .where('expiryDate', '<=', formatDate(thirtyDaysLater))
            .limit(5)
            .get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No upcoming renewals</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const member = doc.data();
            html += `
                <tr>
                    <td>${member.name}</td>
                    <td>${formatDateDisplay(member.expiryDate)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="renewMembership('${doc.id}', '${member.name}')">
                            Renew
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading upcoming renewals:', error);
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Error loading data</td></tr>';
    }
}

// Renew membership
function renewMembership(memberId, memberName) {
    if (confirm(`Do you want to renew membership for ${memberName}?`)) {
        window.location.href = `payments.html?memberId=${memberId}&action=renew`;
    }
}

// Helper function to format date for display
function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
