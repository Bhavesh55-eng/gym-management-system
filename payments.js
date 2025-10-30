// Payments Management with Firebase

let allPayments = [];
let allMembers = [];

document.addEventListener('DOMContentLoaded', function() {
    loadPayments();
    loadPaymentStats();
    loadMembersForDropdown();
    setupForm();
    setupSearch();
    
    // Set default payment date to today
    document.getElementById('paymentDate').valueAsDate = new Date();
    
    // Check if should open add modal with pre-selected member
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add' || urlParams.get('memberId')) {
        setTimeout(() => {
            openAddPaymentModal();
            if (urlParams.get('memberId')) {
                document.getElementById('paymentMember').value = urlParams.get('memberId');
                loadMemberDetails();
            }
            if (urlParams.get('action') === 'renew') {
                document.getElementById('paymentType').value = 'Renewal';
            }
        }, 500);
    }
});

// Load payment statistics
async function loadPaymentStats() {
    try {
        const snapshot = await paymentsRef.get();
        
        let totalRevenue = 0;
        let todayRevenue = 0;
        let monthRevenue = 0;
        let totalPayments = 0;
        
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        snapshot.forEach(doc => {
            const payment = doc.data();
            const amount = parseFloat(payment.amount || 0);
            const paymentDate = new Date(payment.date);
            
            totalRevenue += amount;
            totalPayments++;
            
            if (payment.date === today) {
                todayRevenue += amount;
            }
            
            if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
                monthRevenue += amount;
            }
        });
        
        document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toFixed(2);
        document.getElementById('todayRevenue').textContent = '₹' + todayRevenue.toFixed(2);
        document.getElementById('monthRevenue').textContent = '₹' + monthRevenue.toFixed(2);
        document.getElementById('totalPayments').textContent = totalPayments;
        
    } catch (error) {
        console.error('Error loading payment stats:', error);
    }
}

// Load all payments from Firebase
async function loadPayments() {
    const tableBody = document.querySelector('#paymentsTable tbody');
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    
    try {
        const snapshot = await paymentsRef.orderBy('date', 'desc').get();
        
        allPayments = [];
        snapshot.forEach(doc => {
            allPayments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayPayments(allPayments);
        
    } catch (error) {
        console.error('Error loading payments:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading payments</td></tr>';
    }
}

// Display payments in table
function displayPayments(payments) {
    const tableBody = document.querySelector('#paymentsTable tbody');
    
    if (payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No payments found</td></tr>';
        return;
    }
    
    let html = '';
    payments.forEach(payment => {
        html += `
            <tr>
                <td>${formatDateDisplay(payment.date)}</td>
                <td>${payment.memberName}</td>
                <td>${payment.type}</td>
                <td>₹${parseFloat(payment.amount).toFixed(2)}</td>
                <td>${payment.method}</td>
                <td><span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewPayment('${payment.id}')" style="margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePayment('${payment.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allPayments.filter(payment => 
            payment.memberName.toLowerCase().includes(searchTerm) ||
            payment.type.toLowerCase().includes(searchTerm) ||
            payment.method.toLowerCase().includes(searchTerm)
        );
        displayPayments(filtered);
    });
}

// Filter payments
function filterPayments() {
    const type = document.getElementById('filterType').value;
    const method = document.getElementById('filterMethod').value;
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    
    let filtered = allPayments;
    
    if (type) {
        filtered = filtered.filter(p => p.type === type);
    }
    
    if (method) {
        filtered = filtered.filter(p => p.method === method);
    }
    
    if (startDate) {
        filtered = filtered.filter(p => p.date >= startDate);
    }
    
    if (endDate) {
        filtered = filtered.filter(p => p.date <= endDate);
    }
    
    displayPayments(filtered);
}

// Clear filters
function clearFilters() {
    document.getElementById('filterType').value = '';
    document.getElementById('filterMethod').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    displayPayments(allPayments);
}

// Load members for dropdown
async function loadMembersForDropdown() {
    try {
        const snapshot = await membersRef.where('status', '==', 'Active').get();
        const select = document.getElementById('paymentMember');
        
        allMembers = [];
        snapshot.forEach(doc => {
            const member = {
                id: doc.id,
                ...doc.data()
            };
            allMembers.push(member);
            
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = member.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// Load member details when selected
function loadMemberDetails() {
    const memberId = document.getElementById('paymentMember').value;
    const detailsDiv = document.getElementById('memberDetails');
    
    if (!memberId) {
        detailsDiv.style.display = 'none';
        return;
    }
    
    const member = allMembers.find(m => m.id === memberId);
    
    if (member) {
        document.getElementById('memberEmail').textContent = member.email;
        document.getElementById('memberPhone').textContent = member.phone;
        document.getElementById('memberExpiry').textContent = formatDateDisplay(member.expiryDate);
        detailsDiv.style.display = 'block';
    }
}

// Open add payment modal
function openAddPaymentModal() {
    document.getElementById('modalTitle').textContent = 'Record Payment';
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentId').value = '';
    document.getElementById('paymentDate').valueAsDate = new Date();
    document.getElementById('memberDetails').style.display = 'none';
    document.getElementById('paymentModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

// Setup form submission
function setupForm() {
    document.getElementById('paymentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await savePayment();
    });
}

// Save payment to Firebase
async function savePayment() {
    const memberId = document.getElementById('paymentMember').value;
    const type = document.getElementById('paymentType').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    const date = document.getElementById('paymentDate').value;
    const reference = document.getElementById('paymentReference').value;
    const notes = document.getElementById('paymentNotes').value;
    
    // Get member name
    const member = allMembers.find(m => m.id === memberId);
    if (!member) {
        showNotification('Member not found', 'error');
        return;
    }
    
    const paymentData = {
        memberId,
        memberName: member.name,
        type,
        amount,
        method,
        date,
        reference,
        notes,
        status: 'Completed',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await paymentsRef.add(paymentData);
        
        // If renewal, update member expiry date
        if (type === 'Renewal' || type === 'Membership Fee') {
            const newExpiryDate = calculateExpiryDate(member.expiryDate, member.duration);
            await membersRef.doc(memberId).update({
                expiryDate: newExpiryDate,
                status: 'Active'
            });
        }
        
        showNotification('Payment recorded successfully!', 'success');
        closeModal();
        loadPayments();
        loadPaymentStats();
        
    } catch (error) {
        console.error('Error saving payment:', error);
        showNotification('Error saving payment: ' + error.message, 'error');
    }
}

// View payment details
async function viewPayment(paymentId) {
    try {
        const doc = await paymentsRef.doc(paymentId).get();
        
        if (!doc.exists) {
            showNotification('Payment not found', 'error');
            return;
        }
        
        const payment = doc.data();
        
        const info = `
Payment Details:
━━━━━━━━━━━━━━━━━━━━
Member: ${payment.memberName}
Type: ${payment.type}
Amount: ₹${payment.amount}
Method: ${payment.method}
Date: ${formatDateDisplay(payment.date)}
Reference: ${payment.reference || 'N/A'}
Status: ${payment.status}
Notes: ${payment.notes || 'N/A'}
        `;
        
        alert(info);
        
    } catch (error) {
        console.error('Error loading payment:', error);
        showNotification('Error loading payment', 'error');
    }
}

// Delete payment
async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment record?')) {
        return;
    }
    
    try {
        await paymentsRef.doc(paymentId).delete();
        showNotification('Payment deleted successfully!', 'success');
        loadPayments();
        loadPaymentStats();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showNotification('Error deleting payment', 'error');
    }
}

// Export payments to CSV
function exportPayments() {
    if (allPayments.length === 0) {
        showNotification('No payments to export', 'error');
        return;
    }
    
    const csvData = allPayments.map(p => ({
        Date: p.date,
        'Member Name': p.memberName,
        Type: p.type,
        Amount: p.amount,
        Method: p.method,
        Status: p.status,
        Reference: p.reference || 'N/A',
        Notes: p.notes || 'N/A'
    }));
    
    exportToCSV(csvData, 'payments.csv');
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
