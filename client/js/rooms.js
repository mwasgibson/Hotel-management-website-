function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

const roomImages = {
    'Standard': "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
    'Single': "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
    'Double': "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
    'Suite': "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    'Deluxe': "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=800&q=80",
    'Executive': "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"
};

function renderRooms(data) {
    const roomContainer = document.getElementById("rooms");
    roomContainer.innerHTML = '';

    if (!data.length) {
        roomContainer.innerHTML = '<p>No rooms match your search.</p>';
        return;
    }

    data.forEach(room => {
        const img = roomImages[room.room_type] || roomImages['Standard'];
        roomContainer.innerHTML += `
            <div>
                <img class="room-img" src="${img}" alt="${escapeHtml(room.room_type)} Room">
                <h3>${escapeHtml(room.room_type)}</h3>
                <p>Room: ${escapeHtml(room.room_number)}</p>
                <p>Price: KES ${escapeHtml(room.price)}</p>
                <p>Capacity: ${escapeHtml(room.capacity)}</p>
                <p>Status: ${escapeHtml(room.status)}</p>
                <p>Description: ${escapeHtml(room.description)}</p>
            </div>
        `;
    });
}

function loadRooms(queryString = '') {
    fetch(`${API_URL}/rooms${queryString}`, { credentials: 'include' })
        .then(res => res.json())
        .then(renderRooms)
        .catch(error => {
            console.error('Error fetching rooms:', error);
            document.getElementById('rooms').innerHTML = '<p>Unable to load rooms right now.</p>';
        });
}

function searchRooms() {
    const params = new URLSearchParams();

    const room_type = document.getElementById('filter_room_type').value;
    const min_price = document.getElementById('filter_min_price').value;
    const max_price = document.getElementById('filter_max_price').value;
    const capacity = document.getElementById('filter_capacity').value;
    const check_in = document.getElementById('filter_check_in').value;
    const check_out = document.getElementById('filter_check_out').value;

    if (room_type) params.set('room_type', room_type);
    if (min_price) params.set('min_price', min_price);
    if (max_price) params.set('max_price', max_price);
    if (capacity) params.set('capacity', capacity);

    if (check_in && check_out) {
        if (new Date(check_out) <= new Date(check_in)) {
            alert('Check-out date must be after check-in date');
            return;
        }
        params.set('check_in', check_in);
        params.set('check_out', check_out);
    }

    const query = params.toString();
    loadRooms(query ? `?${query}` : '');
}

function clearFilters() {
    document.getElementById('filter_room_type').value = '';
    document.getElementById('filter_min_price').value = '';
    document.getElementById('filter_max_price').value = '';
    document.getElementById('filter_capacity').value = '';
    document.getElementById('filter_check_in').value = '';
    document.getElementById('filter_check_out').value = '';
    loadRooms();
}

loadRooms();