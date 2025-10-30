// Members Management with Firebase

let allMembers = [];

document.addEventListener('DOMContentLoaded', function() {
    loadMembers();
    loadTrainersForDropdown();
    setupForm();
    setupSearch();
    
    // Set default join date to today
    document.getElementById('memberJoinDate').valueAsDate = new Date();
    
    // Check if should open add modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openAddMemberModal();
    }
});

// Load all members from Firebase
async function loadMembers() {
    const tableBody = document.querySelector('#membersTable tbody');
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    
    try {
        const snapshot = await membersRef.orderBy('joinDate', 'desc').get();
        
        allMembers = [];
        snapshot.forEach(doc => {
            allMembers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayMembers(allMembers);
        
    } catch (error) {
        console.error('Error loading members:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading members</td></tr>';
    }
}

// Display members in table
function displayMembers(members) {
    const tableBody = document.querySelector('#membersTable tbody');
    
    if (members.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No members found</td></tr>';
        return;
    }
    
    let html = '';
    members.forEach(member => {
        // Update status based on expiry date
        const today = new Date();
        const expiryDate = new Date(member.expiryDate);
        let status = member.status;
        if (expiryDate < today) {
            status = 'Expired';
        }
        
        html += `
            <tr>
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td>${member.phone}</td>
                <td>${formatDateDisplay(member.joinDate)}</td>
                <td>${formatDateDisplay(member.expiryDate)}</td>
                <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editMember('${member.id}')" style="margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMember('${member.id}', '${member.name}')">
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
        const filtered = allMembers.filter(member => 
            member.name.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm) ||
            member.phone.includes(searchTerm)
        );
        displayMembers(filtered);
    });
}

// Open add member modal
function openAddMemberModal() {
    document.getElementById('modalTitle').textContent = 'Add New Member';
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = '';
    document.getElementById('memberJoinDate').valueAsDate = new Date();
    document.getElementById('memberModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('memberModal').classList.remove('active');
}

// Setup form submission
function setupForm() {
    document.getElementById('memberForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveMember();
    });
}

// Save member to Firebase
async function saveMember() {
    const memberId = document.getElementById('memberId').value;
    const name = document.getElementById('memberName').value;
    const email = document.getElementById('memberEmail').value;
    const phone = document.getElementById('memberPhone').value;
    const gender = document.getElementById('memberGender').value;
    const joinDate = document.getElementById('memberJoinDate').value;
    const duration = parseInt(document.getElementById('membershipDuration').value);
    const fee = parseFloat(document.getElementById('memberFee').value);
    const trainer = document.getElementById('memberTrainer').value;
    const address = document.getElementById('memberAddress').value;
    
    // Calculate expiry date
    const expiryDate = calculateExpiryDate(joinDate, duration);
    
    const memberData = {
        name,
        email,
        phone,
        gender,
        joinDate,
        expiryDate,
        duration,
        fee,
        trainer,
        address,
        status: 'Active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (memberId) {
            // Update existing member
            await membersRef.doc(memberId).update(memberData);
            showNotification('Member updated successfully!', 'success');
        } else {
            // Add new member
            memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await membersRef.add(memberData);
            
            // Add payment record
            await addPaymentRecord(docRef.id, name, fee, joinDate);
            
            showNotification('Member added successfully!', 'success');
        }
        
        closeModal();
        loadMembers();
        
    } catch (error) {
        console.error('Error saving member:', error);
        showNotification('Error saving member: ' + error.message, 'error');
    }
}

// Add payment record for new member
async function addPaymentRecord(memberId, memberName, amount, date) {
    try {
        await paymentsRef.add({
            memberId,
            memberName,
            amount,
            date,
            type: 'Membership Fee',
            method: 'Cash',
            status: 'Completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error adding payment record:', error);
    }
}

// Edit member
async function editMember(memberId) {
    try {
        const doc = await membersRef.doc(memberId).get();
        
        if (!doc.exists) {
            showNotification('Member not found', 'error');
            return;
        }
        
        const member = doc.data();
        
        document.getElementById('modalTitle').textContent = 'Edit Member';
        document.getElementById('memberId').value = memberId;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberEmail').value = member.email;
        document.getElementById('memberPhone').value = member.phone;
        document.getElementById('memberGender').value = member.gender;
        document.getElementById('memberJoinDate').value = member.joinDate;
        document.getElementById('membershipDuration').value = member.duration;
        document.getElementById('memberFee').value = member.fee;
        document.getElementById('memberTrainer').value = member.trainer || '';
        document.getElementById('memberAddress').value = member.address || '';
        document.getElementById('memberModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading member:', error);
        showNotification('Error loading member', 'error');
    }
}

// Delete member
async function deleteMember(memberId, memberName) {
    if (!confirm(`Are you sure you want to delete ${memberName}?`)) {
        return;
    }
    
    try {
        await membersRef.doc(memberId).delete();
        showNotification('Member deleted successfully!', 'success');
        loadMembers();
    } catch (error) {
        console.error('Error deleting member:', error);
        showNotification('Error deleting member', 'error');
    }
}

// Export members to CSV
function exportMembers() {
    if (allMembers.length === 0) {
        showNotification('No members to export', 'error');
        return;
    }
    
    const csvData = allMembers.map(m => ({
        Name: m.name,
        Email: m.email,
        Phone: m.phone,
        Gender: m.gender,
        'Join Date': m.joinDate,
        'Expiry Date': m.expiryDate,
        Duration: m.duration + ' months',
        Fee: m.fee,
        Status: m.status
    }));
    
    exportToCSV(csvData, 'members.csv');
}

// Load trainers for dropdown
async function loadTrainersForDropdown() {
    try {
        const snapshot = await trainersRef.where('status', '==', 'Active').get();
        const select = document.getElementById('memberTrainer');
        
        snapshot.forEach(doc => {
            const trainer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = trainer.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading trainers:', error);
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
