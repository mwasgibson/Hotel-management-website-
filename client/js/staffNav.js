const STAFF_ALLOWED_PAGES = ['', 'index.html', 'rooms.html', 'room-detail.html', 'login.html', 'staff-dashboard.html', 'walk-in-booking.html'];
const RESTRICTED_HREFS = ['booking.html', 'reserve.html', 'contact.html', 'register.html', 'payment.html', 'dashboard.html', 'deals.html'];
const AUTH_ONLY_HREFS = ['login.html', 'register.html'];   // hidden for anyone already logged in, regardless of role

function hideNavLinks(hrefsToHide) {
    document.querySelectorAll('nav a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const isDashboardLink = href.includes('dashboard.html') && !href.includes('staff-dashboard.html');
        if (isDashboardLink || hrefsToHide.some(target => href.includes(target))){
            const listItem = link.closest('li');
            if (listItem) {
                listItem.style.display = 'none';
            } else {
                link.style.display = 'none';
            }
        }
    });
}

fetch(`${API_URL}/auth/profile`, { credentials: 'include' })
    .then(res => res.status === 401 ? null : res.json())
    .then(user => {
        if (!user) return;   // not logged in — Login/Register stay visible, nothing else to do

        // Logged in — hide Login/Register for everyone, guest or staff
        hideNavLinks(AUTH_ONLY_HREFS);

        if (user.role !== 'admin' && user.role !== 'receptionist') return;   // guests: no further restrictions

        const currentPage = window.location.pathname.split('/').pop();
        if (!STAFF_ALLOWED_PAGES.includes(currentPage)) {
            window.location.href = 'staff-dashboard.html';
            return;
        }

        hideNavLinks(RESTRICTED_HREFS);
    })
    .catch(error => console.error('Error checking navigation:', error));