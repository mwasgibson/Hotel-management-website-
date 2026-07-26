document.addEventListener("DOMContentLoaded", () => {
    loadBooking();
    loadServicesPicker("servicesPicker");
});

let bookingId;

function loadBooking(){
    fetch(`${API_URL}/bookings/my-current`,{
        credentials:"include"
    })
    .then(res=>res.json())
    .then(data=>{
        bookingId=data.id;
        document.getElementById("bookingInfo").innerHTML=`
            <h2>Room ${data.room_number}</h2>
            <p>${data.check_in}  - ${data.check_out}</p>
        `;
        loadCurrentServices();
    });
}

function loadCurrentServices(){
    fetch(`${API_URL}/services/booking/${bookingId}`,{
        credentials:"include"
    })
    .then(res=>res.json())
    .then(services=>{
        let html="<h3>Current Bill</h3>";
        let total=0;
        services.forEach(service=>{
            const line=service.price_at_booking*service.quantity;
            total+=line;
            html+=`
                <p>${service.name} × ${service.quantity} — KES ${line}</p>
            `;
        });
        html+=`<hr><strong>KES ${total}</strong>`;
        document.getElementById("currentServices").innerHTML=html;
    });
}

function addServices(){
    fetch(`${API_URL}/services/add-to-booking`,{
        method:"POST",
        credentials:"include",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            services:getSelectedServices()
        })
    })
    .then(res=>res.json())
    .then(data=>{
        showToast(data.message,"success");
        loadCurrentServices();
        loadServicesPicker("servicesPicker");
    });
}