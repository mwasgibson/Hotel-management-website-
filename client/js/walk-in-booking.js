function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

loadRoomOptions();

function loadRoomOptions() {
    fetch(`${API_URL}/rooms`, { credentials: 'include' })
        .then(res => res.json())
        .then(rooms => {
            const select = document.getElementById('room_number');
            select.innerHTML = '<option value="">Select a room</option>';
            rooms.filter(room => room.status === 'available').forEach(room => {
                select.innerHTML += `<option value="${room.room_number}">Room ${room.room_number} — ${room.room_type} (KES ${room.price}/night)</option>`;
            });
        })
        .catch(error => console.error('Error loading rooms:', error));
}

const paymentMethod = document.getElementById("payment_method");
paymentMethod.addEventListener("change", () => {
    document.getElementById("mpesaFields").style.display =
        paymentMethod.value === "mpesa"
            ? "block"
            : "none";
});

loadServicesPicker('servicesPicker');

function createWalkInBooking() {
    const body = {
        fullname: document.getElementById('fullname').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value || null,
        room_number: document.getElementById('room_number').value,
        check_in: document.getElementById('check_in').value,
        check_out: document.getElementById('check_out').value,
        services: getSelectedServices(),
        payment_method: document.getElementById('payment_method').value,
        payment_received: document.getElementById('payment_received').checked
    };

    fetch(`${API_URL}/bookings/walk-in`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            showToast(data.error || 'Failed to create reservation', 'error');
            return;
        }
        if(body.payment_method === "mpesa"){
            sendSTKPush( data.bookingId, document.getElementById("phone").value);
        } else{
            showToast("Walk-in reservation created","success");
        }

        document.getElementById('result').innerHTML = `
            <p>Booking #${escapeHtml(data.bookingId)} — Total: KES ${escapeHtml(Number(data.total_amount).toFixed(2))} — Status: ${escapeHtml(data.booking_status)}</p>
            <button type="button" onclick="printReceipt(${JSON.stringify(data).replace(/"/g, '&quot;')})">Print Receipt</button>
        `;
        document.querySelector('form').reset();
        loadRoomOptions();
    })
    .catch(error => {
        console.error('Error creating walk-in booking:', error);
        showToast('Unable to connect to the server.', 'error');
    });
}

function sendSTKPush(bookingId, phone){
    fetch(`${API_URL}/mpesa/stkpush`,{
        method:"POST",
        credentials:"include",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            booking_id:bookingId,
            phoneNumber:phone
        })
    })
    .then(res=>res.json())
    .then(data=>{
        showToast(data.message);
        pollPayment(bookingId);
    });
}

function pollPayment(bookingId){
    const timer=setInterval(()=>{
        fetch(`${API_URL}/payments/status/${bookingId}`,{
            credentials:"include"
        })
        .then(res=>res.json())
        .then(data=>{
            if(data.status==="paid"){
                clearInterval(timer);
                showToast(
                    "Payment received!",
                    "success"
                );
                loadRoomOptions();
            }
        });
    },3000);
}

function printReceipt(data) {
    document.getElementById('receipt').innerHTML = `
        <h2>Payment Receipt</h2>
        <p>Booking #${escapeHtml(data.bookingId)}</p>
        <p>Guest: ${escapeHtml(data.guest.fullname)} (${escapeHtml(data.guest.phone)})</p>
        <p>Total: KES ${escapeHtml(Number(data.total_amount).toFixed(2))}</p>
        <p>Status: ${escapeHtml(data.booking_status)}</p>
        <p>Issued: ${new Date().toLocaleString()}</p>
    `;
    window.print();
}