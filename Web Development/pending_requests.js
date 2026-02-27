/* COMP 307 Final Project, Eleni Lyberopoulos */
// Purpose: display pending requests for a prof and allow them to accept or decline

function fetchPendingRequests() {
    fetch('../api/display_pending.php', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayRequests(data.appointments);
        } else {
            if (data.type === 'login_required') {
                window.location.href = '../pages/login-register.html'
            } else {
                alert(data.message || 'Error fetching pending requests');
            }
        }
    })
    .catch(error => {
        alert('Failed to fetch pending requests.');
    });
}

function displayRequests(appointments) {
    const container = document.getElementById('appointments-container');
    container.innerHTML = '';

    if (appointments.length === 0) {
        container.innerHTML = '<div class="no-appointments">No pending appointments</div>';
        return;
    }

    appointments.forEach(appointment => {
        const appointmentDiv = document.createElement('div');
        appointmentDiv.classList.add('appointment-card');
        
        const date = new Date(appointment.date + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        appointmentDiv.innerHTML = `
            <div class="appointment-info">
                <h3>Meeting with ${appointment.student_first_name} ${appointment.student_last_name}</h3>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${appointment.start_time} - ${appointment.end_time}</p>
            </div>
            <div class="button-group">
                <button class="accept-btn" onclick="handleRequest(${appointment.appointment_id}, 'accept')">Accept</button>
                <button class="decline-btn" onclick="handleRequest(${appointment.appointment_id}, 'reject')">Decline</button>
            </div>
        `;
        container.appendChild(appointmentDiv);
    });
}

function handleRequest(appointmentId, action) {
    const confirmMessage = action === 'accept' ? 'Are you sure you want to accept this request?' : 'Are you sure you want to decline this request?';
    if (!confirm(confirmMessage)) {
        return;
    }
        const formData = new FormData();
        formData.append('appointment_id', appointmentId);
        formData.append('action', action);

        fetch('../api/manage_pending.php', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                fetchPendingRequests();
            } else {
                alert(data.message || 'Error processing the request.');
            }
        })
        .catch(error => {
            alert('Failed to process the request.');
        });
    }


    function updateNavbar() {
        fetch('../api/get_session_data.php')
            .then(response => response.json())
            .then(data => {                
                const navLeft = document.getElementById('nav-left');
                const navRight = document.getElementById('nav-right');
                const navbar = document.getElementById('navbar');
                const bookcsLogoLink = document.querySelector('.bookcs-logo').parentElement; 

                if (data.success) {
                    let historyLink;
                    let homepage;

                    // Update the "My History" link based on the user's role
                    switch (data.role) {
                        case "student":
                            historyLink = '../pages/history.html';
                            homepage = '../index.html';
                            break;
                        case "professor":
                            historyLink = '../pages/prof-history.html';
                            homepage = '../pages/prof-dashboard.html';
                            break;
                        default:
                            historyLink = '../pages/history.html';
                            homepage = '../index.html';
                    }

                    navLeft.innerHTML += `
                        <a href="${historyLink}">My History</a>
                    `;

                    navRight.innerHTML = `
                        <span style="color: white;">Hi, ${data.first_name}</span>
                        <a href="../api/logout.php">Log Out</a>
                    `;

                    bookcsLogoLink.href = homepage;
                }

                navbar.style.display = 'flex';
            })
    }

document.addEventListener('DOMContentLoaded', () => {
    fetchPendingRequests();
    updateNavbar();
});

