function registerUser() {
    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    fetch(`${API_URL}/auth/register`, {
        credentials: 'include',
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({fullname, email, password, role})
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            showToast(data.error || 'Registration failed');
            return;
        }
        showToast(data.message);
    window.location.href = 'login.html';
    })
    .catch(error => console.error('Error:', error));
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
    .then(res => res.json().then(data => ({ok: res.ok, data})))
    .then(({ok, data}) => {

        if(!ok){
            showToast(data.error || 'Login failed');
            return;
        }
        if (
            data.role === "admin" ||
            data.role === "receptionist"
        ) {
            window.location.href = "staff-dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
    })
    .catch(err => {
        console.error(err);
        showToast("Unable to connect to the server.");
    });
}
