// Attendance Management with Firebase

let allAttendance = [];
let allMembers = [];

document.addEventListener('DOMContentLoaded', function() {
    loadAttendance();
    loadAttendanceStats();
    loadMembersForDropdown();
    setupForm();
    setupSearch();
    
    // Set default date to today
    document.getElementById('attendanceDate').valueAsDate = new Date();
    
    // Set current time
    const now = new Date();
    document.getElementById('checkInTime').value = now.toTimeString().slice(0, 5);
});

// Load attendance statistics
async function loadAttendanceStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        // Today's attendance
        const todaySnapshot = await attendanceRef.where('date', '==', today).get();
        document.getElementById('todayAttendance').textContent = todaySnapshot.size;
        
        // This week's attendance
        const weekSnapshot = await attendanceRef
            .where('date', '>=', weekAgo)
            .where('date', '<=', today)
            .get();
        document.getElementById('weekAttendance').textContent = weekSnapshot.size;
        
        // This month's attendance
        const monthSnapshot = await attendanceRef
            .where('date', '>=', monthStart)
            .where('date', '<=', today)
            .get();
        document.getElementById('monthAttendance').textContent = monthSnapshot.size;
        
    } catch (error) {
        console.error('Error loading attendance stats:', error);
    }
}

// Load attendance records
async function loadAttendance() {
    const tableBody = document.querySelector('#attendanceTable tbody');
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    
    try {
        const filterDate = document.getElementById('filterDate').value;
        let query = attendanceRef.orderBy('date', 'desc').limit(100);
        
        if (filterDate) {
            query = attendanceRef.where('date', '==', filterDate);
        }
        
        const snapshot = await query.get();
        
        allAttendance = [];
        snapshot.forEach(doc => {
            allAttendance.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayAttendance(allAttendance);
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading attendance</td></tr>';
    }
}

// Display attendance in table
function displayAttendance(attendance) {
    const tableBody = document.querySelector('#attendanceTable tbody');
    
    if (attendance.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance records found</td></tr>';
        return;
    }
    
    let html = '';
    attendance.forEach(record => {
        const duration = calculateDuration(record.checkInTime, record.checkOutTime);
        
        html += `
            <tr>
                <td>${record.memberName}</td>
                <td>${formatDateDisplay(record.date)}</td>
                <td>${record.checkInTime}</td>
                <td>${record.checkOutTime || '-'}</td>
                <td>${duration}</td>
                <td>
                    ${!record.checkOutTime ? `
                        <button class="btn btn-sm btn-primary" onclick="markCheckOut('${record.id}')" style="margin-right: 5px;">
                            <i class="fas fa-sign-out-alt"></i> Check-Out
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteAttendance('${record.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Calculate duration between check-in and check-out
function calculateDuration(checkIn, checkOut) {
    if (!checkOut) return '-';
    
    const [inHour, inMin] = checkIn.split(':').map(Number);
    const [outHour, outMin] = checkOut.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    
    const diffMinutes = outMinutes - inMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours}h ${minutes}m`;
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allAttendance.filter(record => 
            record.memberName.toLowerCase().includes(searchTerm)
        );
        displayAttendance(filtered);
    });
}

// Clear date filter
function clearDateFilter() {
    document.getElementById('filterDate').value = '';
    loadAttendance();
}

// Load members for dropdown
async function loadMembersForDropdown() {
    try {
        const snapshot = await membersRef.where('status', '==', 'Active').get();
        const select = document.getElementById('attendanceMember');
        
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

// Open mark attendance modal
function openMarkAttendanceModal() {
    document.getElementById('attendanceForm').reset();
    document.getElementById('attendanceDate').valueAsDate = new Date();
    
    const now = new Date();
    document.getElementById('checkInTime').value = now.toTimeString().slice(0, 5);
    
    document.getElementById('attendanceModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

// Setup form submission
function setupForm() {
    document.getElementById('attendanceForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveAttendance();
    });
}

// Save attendance to Firebase
async function saveAttendance() {
    const memberId = document.getElementById('attendanceMember').value;
    const date = document.getElementById('attendanceDate').value;
    const checkInTime = document.getElementById('checkInTime').value;
    const checkOutTime = document.getElementById('checkOutTime').value;
    
    // Get member name
    const member = allMembers.find(m => m.id === memberId);
    if (!member) {
        showNotification('Member not found', 'error');
        return;
    }
    
    // Check if attendance already exists for this member on this date
    const existingSnapshot = await attendanceRef
        .where('memberId', '==', memberId)
        .where('date', '==', date)
        .get();
    
    if (!existingSnapshot.empty) {
        showNotification('Attendance already marked for this member today', 'error');
        return;
    }
    
    const attendanceData = {
        memberId,
        memberName: member.name,
        date,
        checkInTime,
        checkOutTime: checkOutTime || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await attendanceRef.add(attendanceData);
        showNotification('Attendance marked successfully!', 'success');
        closeModal();
        loadAttendance();
        loadAttendanceStats();
    } catch (error) {
        console.error('Error saving attendance:', error);
        showNotification('Error saving attendance: ' + error.message, 'error');
    }
}

// Mark check-out time
async function markCheckOut(attendanceId) {
    const now = new Date();
    const checkOutTime = now.toTimeString().slice(0, 5);
    
    try {
        await attendanceRef.doc(attendanceId).update({
            checkOutTime: checkOutTime
        });
        showNotification('Check-out marked successfully!', 'success');
        loadAttendance();
    } catch (error) {
        console.error('Error marking check-out:', error);
        showNotification('Error marking check-out', 'error');
    }
}

// Delete attendance record
async function deleteAttendance(attendanceId) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
    }
    
    try {
        await attendanceRef.doc(attendanceId).delete();
        showNotification('Attendance deleted successfully!', 'success');
        loadAttendance();
        loadAttendanceStats();
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showNotification('Error deleting attendance', 'error');
    }
}

// Export attendance to CSV
function exportAttendance() {
    if (allAttendance.length === 0) {
        showNotification('No attendance records to export', 'error');
        return;
    }
    
    const csvData = allAttendance.map(a => ({
        'Member Name': a.memberName,
        Date: a.date,
        'Check-In': a.checkInTime,
        'Check-Out': a.checkOutTime || '-',
        Duration: calculateDuration(a.checkInTime, a.checkOutTime)
    }));
    
    exportToCSV(csvData, 'attendance.csv');
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
