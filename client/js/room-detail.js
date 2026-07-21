function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

const params = new URLSearchParams(window.location.search);
const roomId = params.get('room_number');

let currentRoom = null;

fetch(`${API_URL}/rooms/${roomId}`, 
    { 
        credentials: 'include' 
    })
    .then(res => res.json())
    .then(room => {
        currentRoom = room;
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

function getQuote() {
    const check_in = document.getElementById('quote_check_in').value;
    const check_out = document.getElementById('quote_check_out').value;

    if (!check_in || !check_out) {
        showToast('Please select both check-in and check-out dates');
        return;
    }

    const params = new URLSearchParams({ check_in, check_out });

    fetch(`${API_URL}/rooms/${roomId}/quote?${params.toString()}`, { credentials: 'include' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                document.getElementById('quoteResult').innerHTML = `<p>${escapeHtml(data.error)}</p>`;
                return;
            }
            const reasonsText = data.appliedReasons.length ? ` (${data.appliedReasons.join(', ')})` : '';
            document.getElementById('quoteResult').innerHTML = `
                <p>KES ${escapeHtml(data.pricePerNight)} / night${reasonsText}</p>
                <p><strong>Total for ${escapeHtml(data.nights)} night(s): KES ${escapeHtml(data.totalPrice)}</strong></p>
            `;
        })
        .catch(error => {
            console.error('Error fetching quote:', error);
            document.getElementById('quoteResult').innerHTML = '<p>Unable to fetch pricing right now.</p>';
        });
}    

function goToBook() {
    const params = new URLSearchParams({
        room_number: currentRoom.room_number,
        room_type: currentRoom.room_type,
        price: currentRoom.price
    });
    window.location.href = `booking.html?${params.toString()}`;
}

function goToReserve() {
    const params = new URLSearchParams({
        room_number: currentRoom.room_number,
        room_type: currentRoom.room_type,
        price: currentRoom.price
    });
    window.location.href = `reserve.html?${params.toString()}`;
}