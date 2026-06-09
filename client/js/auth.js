function registerUser() {

    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch(
        "http://localhost:3000/api/register", {
            
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
        "http://localhost:3000/api/login", {
            
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