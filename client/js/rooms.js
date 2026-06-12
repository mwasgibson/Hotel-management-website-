fetch(`${API_URL}/rooms`)
.then(res => res.json())
.then(data => {

    const roomContainer =
        document.getElementById("rooms");

    data.forEach(room => {

        const roomImages = {
            'Standard':  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
            'Deluxe':    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
            'Suite':     'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
            'Executive': 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=800&q=80'
            };

        const img = roomImages[room.room_type] || roomImages['Standard'];

        roomContainer.innerHTML += `
            <div>
                <img class="room-img" src="${img}" alt="${room.room_type} Room">
                <h3>${room.room_type}</h3>
                <p>Room: ${room.room_number}</p>
                <p>Price: KES ${room.price}</p>
                <p>Status: ${room.status}</p>
            </div>
        `;
    });
});