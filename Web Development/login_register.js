/* COMP 307 Final Project, Eleni Lyberopoulos */
// Purpose: allow a user to log in or register for an account, also check the session to force redirect them if they're logged in

function checkAuthAndRedirect() {
    fetch('../api/get_session_data.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // redirect user if they're logged in already
                if (data.role === "professor") {
                    window.location.replace("../pages/prof-dashboard.html");
                } else {
                    window.location.replace("../index.html");
                }
                return true;
            }
            return false;
        })
        .catch(error => {
            return false;
        });
    }
document.addEventListener('DOMContentLoaded', () => {

    // prevent logged in user from accessing the page again
    checkAuthAndRedirect();

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAuthAndRedirect();
        }
    });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            checkAuthAndRedirect();
        }
    });

    // register form
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(registerForm);

        fetch(registerForm.action, {
            method: 'POST',
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    window.location.href = data.redirect;
                } else {
                    alert(`Error: ${data.message}`);
                }
            })
    });

    // login form
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(loginForm);

        fetch(loginForm.action, {
            method: 'POST',
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    }
                } else {
                    alert(`Error: ${data.message}`);
                }
            })
    });

    function updateNavbar() {
        fetch('../api/get_session_data.php')
            .then(response => response.json())
            .then(data => {
                const navLeft = document.getElementById('nav-left');
                const navRight = document.getElementById('nav-right');
                const navbar = document.getElementById('navbar');

                if (data.success) {
                    let historyLink;

                    // Update the "My History" link based on the user's role
                    switch (data.role) {
                        case "student":
                            historyLink = '../pages/history.html';
                            break;
                        case "professor":
                            historyLink = '../pages/prof-history.html';
                            break;
                        default:
                            historyLink = '../pages/history.html';
                    }

                    navLeft.innerHTML += `
                        <a href="${historyLink}">My History</a>
                    `;

                    navRight.innerHTML = `
                        <span style="color: white;">Hi, ${data.first_name}</span>
                        <a href="../api/logout.php">Log Out</a>
                    `;
                }

                navbar.style.display = 'flex';
            })
    }
    updateNavbar();
    
});
