const API_URL = "https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api";

function registerUser() {

    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch(
        `${API_URL}/auth/register`, {
            
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({fullname, email, password})
        }
    )
    .then(res => res.json())
    .then(data => {

        alert(data.message);

        window.location.href =
        "login.html";

    });
}

function loginUser() {

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch(
        `${API_URL}/auth/login`, {
            
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        }
    )
    .then(res => res.json())
    .then(data => {

        localStorage.setItem("token", data.token);

        window.location.href = "dashboard.html";
    });
};