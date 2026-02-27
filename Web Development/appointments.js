/* COMP 307 Final Project, Eleni Lyberopoulos */
// Purpose: Create the interactive grid to view and make appointments

let floatingTooltip;
let currentDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    window.userInfo = {
        isLoggedIn: false,
        role: null,
        member_id: null
    };

    floatingTooltip = document.getElementById('floating-tooltip');

    initializeDatePicker();
    
    initializeApp();
});

async function initializeApp() {
    try {
        await new Promise((resolve) => {
            fetch('../api/get_session_data.php')
                .then(response => response.json())
                .then(data => {
                    window.userInfo = {
                        isLoggedIn: data.success,
                        role: data.role,
                        member_id: data.member_id 
                    };
                    updateNavbarWithData(data);
                    resolve();
                })
                .catch(error => {
                    window.userInfo = {
                        isLoggedIn: false,
                        role: null,
                        member_id: null
                    };
                    resolve();
                });
        });

        updateDateDisplay();
        loadAppointments();
    } catch (error) {
        return;
    }
}

function updateNavbarWithData(data) {
    const navLeft = document.getElementById('nav-left');
    const navRight = document.getElementById('nav-right');
    const navbar = document.getElementById('navbar');
    const bookcsLogoLink = document.querySelector('.bookcs-logo').parentElement;

    if (data.success) {
        let historyLink;
        let homepage;

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
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minutes = 0; minutes < 60; minutes += 30) {
            const hourStr = hour.toString().padStart(2, '0');
            const minStr = minutes.toString().padStart(2, '0');
            const timeStr = `${hourStr}:${minStr}:00`;
            
            const displayTime = new Date(2024, 0, 1, hour, minutes)
                .toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            
            slots.push({
                value: timeStr,
                display: displayTime
            });
        }
    }
    return slots;
}

function updateDateDisplay() {
    const localDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const formattedDate = localDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    document.getElementById('currentDate').textContent = formattedDate;
}

// "go to date" button
function initializeDatePicker() {
    const datePicker = document.getElementById('datePicker');
    const goToDateBtn = document.getElementById('goToDate');

    const today = new Date();
    const minDate = new Date(today);
    minDate.setMonth(today.getMonth() - 1);
    datePicker.min = minDate.toISOString().split('T')[0];

    const maxDate = new Date(today);
    maxDate.setMonth(today.getMonth() + 6);
    datePicker.max = maxDate.toISOString().split('T')[0];

    datePicker.value = currentDate.toISOString().split('T')[0];

    goToDateBtn.addEventListener('click', () => {
        const selectedDate = datePicker.value;
        if (selectedDate) {
            currentDate = new Date(selectedDate + 'T00:00:00');
            currentDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate()
            );
            updateDateDisplay();
            loadAppointments();
        }
    });

    datePicker.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            goToDateBtn.click();
        }
    });

    // Navigation buttons
    document.getElementById('prevDay').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateDisplay();
        loadAppointments();
    });

    document.getElementById('nextDay').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDateDisplay();
        loadAppointments();
    });
}

// load appointments from database
function loadAppointments() {
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;        
    const requestData = { date: formattedDate };
    
    const urlParams = new URLSearchParams(window.location.search);
    const professorId = urlParams.get('prof');
    if (professorId) {
        requestData.professor_id = professorId;
    }

    $.ajax({
        url: '../api/display_appointments_public.php',
        method: 'POST',
        data: requestData,
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                let professorsToRender = response.professors;
            
                if (professorId) {
                    const professor = response.professors.find(prof => 
                        String(prof.member_id) === professorId
                    );

                    if (professor) {
                        handleProfessorView(professor, response);
                        professorsToRender = [professor];
                    } else {
                        $('#appointmentGrid').text('Professor not found.');
                        return;
                    }
                }

                renderGrid(response.appointments, professorsToRender);
            } else {
                $('#appointmentGrid').text('Failed to load appointments.');
            }
        },
        error: function(xhr, status, error) {
            $('#appointmentGrid').text('Error loading appointments.');
        }
    });
}

// functions for specific prof page
function handleProfessorView(professor, response) {
    const professorName = `${professor.first_name} ${professor.last_name}`;
    document.title = `${professorName}'s Availability`;
    
    let headerElement = document.querySelector('.professor-availability-header');
    if (!headerElement) {
        headerElement = document.createElement('h1');
        headerElement.className = 'professor-availability-header';
        headerElement.textContent = `${professorName}'s Available Appointments`;
        document.querySelector('.date-nav').before(headerElement);
    }

    updateProfessorBookingsList(professor, response);
}

function updateProfessorBookingsList(professor, response) {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;

    const upcomingBookings = response.appointments.filter(apt => {
        const aptDate = new Date(`${apt.date}T${apt.start_time}`);
        const now = new Date();
        return aptDate > now && 
               String(apt.professor_member_id) === String(professor.member_id) && 
               ['open', 'closed', 'pending'].includes(apt.appointment_status);
    });

    bookingsList.innerHTML = '';
    
    if (upcomingBookings.length === 0) {
        bookingsList.innerHTML = '<div style="text-align: center; color: #666;">No upcoming bookings</div>';
        return;
    }

    upcomingBookings
        .sort((a, b) => new Date(`${a.date}T${a.start_time}`) - new Date(`${b.date}T${b.start_time}`))
        .forEach(booking => {
            const bookingCard = createBookingCard(booking);
            bookingsList.appendChild(bookingCard);
        });
}

function createBookingCard(booking) {
    const bookingCard = document.createElement('div');
    bookingCard.className = 'booking-card';

    const dateTime = document.createElement('div');
    dateTime.innerHTML = `
        <strong>${formatDate(booking.date)}</strong><br>
        ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}
    `;
    
    const meetingDetails = document.createElement('div');
    meetingDetails.innerHTML = `
        <strong>Meeting:</strong> ${booking.meeting_name || 'Untitled Meeting'}
    `;
    
    const status = document.createElement('div');
    status.className = `booking-status ${booking.appointment_status}`;
    status.textContent = booking.appointment_status.charAt(0).toUpperCase() + 
                    booking.appointment_status.slice(1);
    
    bookingCard.appendChild(dateTime);
    bookingCard.appendChild(meetingDetails);
    bookingCard.appendChild(status);
    
    return bookingCard;
}

function formatTime(timeStr) {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
    });
}

function isTimeInAppointmentRange(slotTime, startTime, endTime) {
    const slotMinutes = timeToMinutes(slotTime);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function isWithinBusinessHours(timeStr) {
    const [hours] = timeStr.split(':').map(Number);
    return hours >= 8 && hours < 20;
}

function getBlockClass(appointment) {
    const now = new Date();
    const appointmentTime = new Date(`${appointment.date}T${appointment.start_time}`);

    if (appointmentTime < now) return 'light-grey';
    
    switch (appointment.appointment_status) {
        case 'pending':
            return 'yellow';
        case 'open':
            return 'green';
        case 'closed':
            return 'red';
        case 'not available':
            return 'dark-grey';
        default:
            return 'white';
    }
}

// check if a slot is clickable based on status and user role
function isClickable(appointment) {
    const userRole = window.userInfo?.role;
    
    if (userRole === 'professor') {
        return appointment.professor_member_id === window.userInfo.member_id;
    }
    
    const now = new Date();
    const appointmentTime = new Date(`${appointment.date}T${appointment.start_time}`);

    if (appointmentTime < now) return false;

    return ['open', 'available'].includes(appointment.appointment_status);
}

function handleBlockClick(appointment) {
    const userRole = window.userInfo?.role;

    if (userRole === 'professor') {
        handleProfessorBlockClick(appointment);
        return;
    }

    handleStudentBlockClick(appointment);
}

// logic for professors
function handleProfessorBlockClick(appointment) {
    if (appointment.professor_member_id !== window.userInfo.member_id) {
        alert('Professors cannot book appointments.');
        return;
    }

    const appointmentStatus = appointment.appointment_status || 'available';
    
    switch (appointmentStatus) {
        case 'open':
        case 'not available':
        case 'closed':
            window.location.href = '../pages/prof-history.html';
            break;
        case 'available':
            window.location.href = '../pages/create-meeting.html';
            break;
        case 'pending':
            window.location.href = '../pages/pending-requests.html';
            break;
    }
}

// logic for students
function handleStudentBlockClick(appointment) {
    const formattedDate = appointment.date || currentDate.toISOString().split('T')[0];

    if (appointment.appointment_status === 'available') {
        const now = new Date();
        const appointmentTime = new Date(`${formattedDate}T${appointment.time}`);
    
        if (appointmentTime < now) {
            alert('Cannot request meetings in the past.');
            return;
        }

        const [hours, minutes] = appointment.time.split(':').map(Number);
        const startTimeObj = new Date(2024, 0, 1, hours, minutes);
        const endTimeObj = new Date(startTimeObj.getTime() + 30 * 60000);
        
        const start_time = appointment.time;
        const end_time = endTimeObj.toTimeString().slice(0, 8);

        const url = `../pages/request-alternate.html?professor_id=${appointment.professor_member_id}&professor_name=${encodeURIComponent(appointment.professor_name)}&date=${formattedDate}&start_time=${start_time}&end_time=${end_time}`;
        window.location.href = url;
        return;
    }

    if (appointment.appointment_status === 'open') {
        const url = `../pages/book-meeting.html?appointment_id=${appointment.appointment_id}`;
        window.location.href = url;
    } else {
        alert('This slot cannot be booked.');
    }
}

// render the appointments grid dynamically from the database
function renderGrid(appointments, allProfessors) {
    const grid = document.getElementById('appointmentGrid');
    grid.innerHTML = '';

    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.overflowX = 'auto';
    scrollWrapper.style.width = '100%';

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    
    const timeSlots = generateTimeSlots();
    
    const headerRow = document.createElement('tr');
    
    const profHeader = document.createElement('th');
    profHeader.textContent = "Professor";
    profHeader.style.position = 'sticky';
    profHeader.style.left = '0';
    profHeader.style.backgroundColor = '#373E40';
    profHeader.style.color = 'white';
    profHeader.style.zIndex = '2';
    profHeader.style.minWidth = '150px';
    headerRow.appendChild(profHeader);

    timeSlots.forEach(slot => {
        const th = document.createElement('th');
        th.textContent = slot.display;
        th.style.padding = '8px';
        th.style.minWidth = '100px';
        th.style.textAlign = 'center';
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Create a map of appointments by professor ID
    const appointmentsByProf = {};
    appointments.forEach(apt => {
        if (!appointmentsByProf[apt.professor_member_id]) {
            appointmentsByProf[apt.professor_member_id] = [];
        }
        appointmentsByProf[apt.professor_member_id].push(apt);
    });

    // Create a row for each professor
    allProfessors.forEach(professor => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = `${professor.first_name} ${professor.last_name}`;
        nameCell.style.position = 'sticky';
        nameCell.style.left = '0';
        nameCell.style.backgroundColor = '#373E40';
        nameCell.style.color = 'white';
        nameCell.style.zIndex = '1';
        nameCell.style.fontWeight = 'bold';
        nameCell.style.textAlign = 'center';
        nameCell.style.verticalAlign = 'middle';
        nameCell.style.cursor = 'pointer';
        row.appendChild(nameCell);

        nameCell.addEventListener('click', () => {
            window.location.href = `../pages/specific-prof-apps.html?prof=${professor.member_id}`;
        });

        // Add time slot cells
        timeSlots.forEach((slot, index) => {
            const cell = document.createElement('td');
            const profAppointments = appointmentsByProf[professor.member_id] || [];
            const appointment = profAppointments.find(apt => 
                isTimeInAppointmentRange(slot.value, apt.start_time, apt.end_time)
            );
            
            const block = document.createElement('div');
            block.className = 'time-block';
            
            if (!isWithinBusinessHours(slot.value)) {
                block.className += ' dark-grey';
            } else if (appointment) {
                block.className += ` ${getBlockClass(appointment)}`;
                
                // Check if this is part of a continuous meeting
                const nextSlot = timeSlots[index + 1];
                const prevSlot = timeSlots[index - 1];
                
                const nextAppointment = nextSlot ? profAppointments.find(apt => 
                    isTimeInAppointmentRange(nextSlot.value, apt.start_time, apt.end_time)
                ) : null;
                
                const prevAppointment = prevSlot ? profAppointments.find(apt => 
                    isTimeInAppointmentRange(prevSlot.value, apt.start_time, apt.end_time)
                ) : null;
                
                // to distinguish between meetings
                if (!nextAppointment || appointment.appointment_id !== nextAppointment.appointment_id) {
                    block.className += ' meeting-end';
                }
                if (!prevAppointment || appointment.appointment_id !== prevAppointment.appointment_id) {
                    block.className += ' meeting-start';
                }
                
                // Add tooltip for certain appointments
                if (appointment.appointment_status === 'open' || 
                    appointment.appointment_status === 'closed' || 
                    appointment.appointment_status === 'past') {
                    block.addEventListener('mouseenter', () => {
                        floatingTooltip.innerHTML = `
                            Meeting: ${appointment.meeting_name}<br>
                            Time: ${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}<br>
                            Date: ${formatDate(appointment.date)}
                        `;
                        floatingTooltip.style.display = 'block';
                    });
                
                    block.addEventListener('mouseleave', () => {
                        floatingTooltip.style.display = 'none';
                    });
                }
                
                if (isClickable(appointment)) {
                    block.addEventListener('click', () => handleBlockClick(appointment));
                }
            } else {
                block.className += ' white';
                
                const slotTime = new Date(`${currentDate.toISOString().split('T')[0]}T${slot.value}`);
                const now = new Date();
                
                if (slotTime < now) {
                    block.className = 'time-block dark-grey';
                } else {
                    block.addEventListener('click', () => {
                        handleBlockClick({
                            appointment_status: 'available',
                            time: slot.value,
                            professor_name: `${professor.first_name} ${professor.last_name}`,
                            professor_member_id: professor.member_id,
                            date: currentDate.toISOString().split('T')[0]
                        });
                    });
                }
            }

            cell.appendChild(block);
            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    scrollWrapper.appendChild(table);
    grid.appendChild(scrollWrapper);

    // scroll to current time
    scrollWrapper.style.scrollBehavior = 'smooth';

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    const currentTimeIndex = timeSlots.findIndex(slot => {
        const [hours, minutes] = slot.value.split(':').map(Number);
        return (hours > currentHour) || 
            (hours === currentHour && minutes >= currentMinutes);
    });

    if (currentTimeIndex !== -1) {
        setTimeout(() => {
            const scrollOffset = currentTimeIndex * 105;
            scrollWrapper.scrollLeft = scrollOffset;
        }, 100);
    }
}

function positionTooltip(event, tooltipElement) {
    const padding = 10;
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;
    
    let left = mouseX + padding;
    let top = mouseY + padding;
    
    if (left + tooltipWidth > viewportWidth) {
        left = mouseX - tooltipWidth - padding;
    }
    
    if (top + tooltipHeight > viewportHeight) {
        top = mouseY - tooltipHeight - padding;
    }
    
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
}