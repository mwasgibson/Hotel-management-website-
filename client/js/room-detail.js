function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

const params = new URLSearchParams(window.location.search);
const roomId = params.get('id');

fetch(`${API_URL}/rooms/${roomId}`, { credentials: 'include' })
    .then(res => res.json())
    .then(room => {
        document.getElementById('roomDetail').innerHTML = `
            <h2>${escapeHtml(room.room_type)} — Room ${escapeHtml(room.room_number)}</h2>
            <p>Price: KES ${escapeHtml(room.price)} / night</p>
            <p>Capacity: ${escapeHtml(room.capacity)}</p>
            <p>Status: ${escapeHtml(room.status)}</p>
            <p>${escapeHtml(room.description)}</p>
        `;
    })
    .catch(error => {
        console.error('Error loading room:', error);
        document.getElementById('roomDetail').innerHTML = '<p>Unable to load this room.</p>';
    });

function goToBook() {
    window.location.href = `booking.html?room_number=${roomId}`;
}

function goToReserve() {
    window.location.href = `reserve.html?room_number=${roomId}`;
}