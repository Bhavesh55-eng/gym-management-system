// Trainers Management with Firebase

let allTrainers = [];

document.addEventListener('DOMContentLoaded', function() {
    loadTrainers();
    loadTrainerStats();
    setupForm();
    setupSearch();
    
    // Set default join date to today
    document.getElementById('trainerJoinDate').valueAsDate = new Date();
    
    // Check if should open add modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openAddTrainerModal();
    }
});

// Load trainer statistics
async function loadTrainerStats() {
    try {
        const snapshot = await trainersRef.get();
        
        let totalTrainers = 0;
        let activeTrainers = 0;
        let totalSalary = 0;
        
        snapshot.forEach(doc => {
            const trainer = doc.data();
            totalTrainers++;
            if (trainer.status === 'Active') {
                activeTrainers++;
                totalSalary += parseFloat(trainer.salary || 0);
            }
        });
        
        document.getElementById('totalTrainers').textContent = totalTrainers;
        document.getElementById('activeTrainers').textContent = activeTrainers;
        document.getElementById('totalSalary').textContent = '₹' + totalSalary.toFixed(2);
        
    } catch (error) {
        console.error('Error loading trainer stats:', error);
    }
}

// Load all trainers from Firebase
async function loadTrainers() {
    const tableBody = document.querySelector('#trainersTable tbody');
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
    
    try {
        const snapshot = await trainersRef.orderBy('joinDate', 'desc').get();
        
        allTrainers = [];
        snapshot.forEach(doc => {
            allTrainers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayTrainers(allTrainers);
        
    } catch (error) {
        console.error('Error loading trainers:', error);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading trainers</td></tr>';
    }
}

// Display trainers in table
function displayTrainers(trainers) {
    const tableBody = document.querySelector('#trainersTable tbody');
    
    if (trainers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No trainers found. Add your first trainer!</td></tr>';
        return;
    }
    
    let html = '';
    trainers.forEach(trainer => {
        html += `
            <tr>
                <td>${trainer.name}</td>
                <td>${trainer.email}</td>
                <td>${trainer.phone}</td>
                <td>${trainer.specialization}</td>
                <td>${trainer.experience} years</td>
                <td>₹${parseFloat(trainer.salary).toFixed(2)}</td>
                <td><span class="status-badge status-${trainer.status.toLowerCase()}">${trainer.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewTrainer('${trainer.id}')" style="margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editTrainer('${trainer.id}')" style="margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTrainer('${trainer.id}', '${trainer.name}')">
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
        const filtered = allTrainers.filter(trainer => 
            trainer.name.toLowerCase().includes(searchTerm) ||
            trainer.email.toLowerCase().includes(searchTerm) ||
            trainer.phone.includes(searchTerm) ||
            trainer.specialization.toLowerCase().includes(searchTerm)
        );
        displayTrainers(filtered);
    });
}

// Open add trainer modal
function openAddTrainerModal() {
    document.getElementById('modalTitle').textContent = 'Add New Trainer';
    document.getElementById('trainerForm').reset();
    document.getElementById('trainerId').value = '';
    document.getElementById('trainerJoinDate').valueAsDate = new Date();
    document.getElementById('trainerStatus').value = 'Active';
    document.getElementById('trainerModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('trainerModal').classList.remove('active');
}

// Setup form submission
function setupForm() {
    document.getElementById('trainerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveTrainer();
    });
}

// Save trainer to Firebase
async function saveTrainer() {
    const trainerId = document.getElementById('trainerId').value;
    const name = document.getElementById('trainerName').value;
    const email = document.getElementById('trainerEmail').value;
    const phone = document.getElementById('trainerPhone').value;
    const gender = document.getElementById('trainerGender').value;
    const specialization = document.getElementById('trainerSpecialization').value;
    const experience = parseInt(document.getElementById('trainerExperience').value);
    const salary = parseFloat(document.getElementById('trainerSalary').value);
    const joinDate = document.getElementById('trainerJoinDate').value;
    const certification = document.getElementById('trainerCertification').value;
    const status = document.getElementById('trainerStatus').value;
    const address = document.getElementById('trainerAddress').value;
    const bio = document.getElementById('trainerBio').value;
    
    const trainerData = {
        name,
        email,
        phone,
        gender,
        specialization,
        experience,
        salary,
        joinDate,
        certification,
        status,
        address,
        bio,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (trainerId) {
            // Update existing trainer
            await trainersRef.doc(trainerId).update(trainerData);
            showNotification('Trainer updated successfully!', 'success');
        } else {
            // Add new trainer
            trainerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await trainersRef.add(trainerData);
            showNotification('Trainer added successfully!', 'success');
        }
        
        closeModal();
        loadTrainers();
        loadTrainerStats();
        
    } catch (error) {
        console.error('Error saving trainer:', error);
        showNotification('Error saving trainer: ' + error.message, 'error');
    }
}

// View trainer details
async function viewTrainer(trainerId) {
    try {
        const doc = await trainersRef.doc(trainerId).get();
        
        if (!doc.exists) {
            showNotification('Trainer not found', 'error');
            return;
        }
        
        const trainer = doc.data();
        
        // Create info display
        const info = `
            <strong>Name:</strong> ${trainer.name}<br>
            <strong>Email:</strong> ${trainer.email}<br>
            <strong>Phone:</strong> ${trainer.phone}<br>
            <strong>Specialization:</strong> ${trainer.specialization}<br>
            <strong>Experience:</strong> ${trainer.experience} years<br>
            <strong>Salary:</strong> ₹${trainer.salary}<br>
            <strong>Join Date:</strong> ${formatDateDisplay(trainer.joinDate)}<br>
            <strong>Certification:</strong> ${trainer.certification || 'N/A'}<br>
            <strong>Status:</strong> ${trainer.status}<br>
            <strong>Bio:</strong> ${trainer.bio || 'N/A'}
        `;
        
        alert(info.replace(/<br>/g, '\n').replace(/<strong>|<\/strong>/g, ''));
        
    } catch (error) {
        console.error('Error loading trainer:', error);
        showNotification('Error loading trainer', 'error');
    }
}

// Edit trainer
async function editTrainer(trainerId) {
    try {
        const doc = await trainersRef.doc(trainerId).get();
        
        if (!doc.exists) {
            showNotification('Trainer not found', 'error');
            return;
        }
        
        const trainer = doc.data();
        
        document.getElementById('modalTitle').textContent = 'Edit Trainer';
        document.getElementById('trainerId').value = trainerId;
        document.getElementById('trainerName').value = trainer.name;
        document.getElementById('trainerEmail').value = trainer.email;
        document.getElementById('trainerPhone').value = trainer.phone;
        document.getElementById('trainerGender').value = trainer.gender;
        document.getElementById('trainerSpecialization').value = trainer.specialization;
        document.getElementById('trainerExperience').value = trainer.experience;
        document.getElementById('trainerSalary').value = trainer.salary;
        document.getElementById('trainerJoinDate').value = trainer.joinDate;
        document.getElementById('trainerCertification').value = trainer.certification || '';
        document.getElementById('trainerStatus').value = trainer.status;
        document.getElementById('trainerAddress').value = trainer.address || '';
        document.getElementById('trainerBio').value = trainer.bio || '';
        document.getElementById('trainerModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading trainer:', error);
        showNotification('Error loading trainer', 'error');
    }
}

// Delete trainer
async function deleteTrainer(trainerId, trainerName) {
    if (!confirm(`Are you sure you want to delete ${trainerName}?`)) {
        return;
    }
    
    try {
        await trainersRef.doc(trainerId).delete();
        showNotification('Trainer deleted successfully!', 'success');
        loadTrainers();
        loadTrainerStats();
    } catch (error) {
        console.error('Error deleting trainer:', error);
        showNotification('Error deleting trainer', 'error');
    }
}

// Export trainers to CSV
function exportTrainers() {
    if (allTrainers.length === 0) {
        showNotification('No trainers to export', 'error');
        return;
    }
    
    const csvData = allTrainers.map(t => ({
        Name: t.name,
        Email: t.email,
        Phone: t.phone,
        Gender: t.gender,
        Specialization: t.specialization,
        'Experience (Years)': t.experience,
        'Monthly Salary': t.salary,
        'Join Date': t.joinDate,
        Certification: t.certification || 'N/A',
        Status: t.status
    }));
    
    exportToCSV(csvData, 'trainers.csv');
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
