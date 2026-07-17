function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; path=/; max-age=0;`;
}

function Logout() {
    fetch(`${API_URL}/auth/logout`,
        {   method: 'POST',  
            credentials: 'include'
        })
        .then(() => window.location.href = 'login.html');
}

function goToDashboard() {
    fetch(`${API_URL}/auth/profile`, { credentials: 'include' })
        .then(res => {
            if (res.status === 401) {
                window.location.href = 'login.html';
                return null;
            }
            return res.json();
        })
        .then(user => {
            if (!user) return;
            if (user.role === 'admin' || user.role === 'receptionist') {
                window.location.href = 'staff-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        })
        .catch(error => console.error('Error checking profile:', error));
}