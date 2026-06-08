fetch("http://localhost:3000/api/rooms")
.then(res => res.json())
.then(data => {

    const roomContainer =
        document.getElementById("rooms");

    data.forEach(room => {

        roomContainer.innerHTML += `
            <div>
                <h3>${room.room_type}</h3>
                <p>Room: ${room.room_number}</p>
                <p>Price: KES ${room.price}</p>
                <p>Status: ${room.status}</p>
            </div>
            <hr>
        `;
    });

});