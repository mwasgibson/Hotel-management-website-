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