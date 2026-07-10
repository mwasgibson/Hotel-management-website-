function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

fetch(`${API_URL}/rooms`, {
    credentials: 'include'
})
.then(res => res.json())
.then(data => {

    const roomContainer =
        document.getElementById("rooms");

    data.forEach(room => {

        const roomImages = {
            'Standard':  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
            'Single':    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
            'Double': "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
            'Suite':     "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
            'Deluxe': "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=800&q=80",
            'Executive': "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"
            };

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
});