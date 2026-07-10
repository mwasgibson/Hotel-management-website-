const API_URL = "https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api";

function registerUser() {
    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch(`${API_URL}/auth/register`, {
        credentials: 'include',
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({fullname, email, password})
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        window.location.href = "login.html";
    });
}

function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch(`${API_URL}/auth/login`, {
        credentials: 'include',
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password})
    })
    .then(res => res.json())
    .then(data => {

        if (
            data.role === "admin" ||
            data.role === "receptionist"
        ) {
            window.location.href = "dashboard.html";
        } else {
        window.location.href = "index.html";
        }
    });
}
