document.addEventListener("DOMContentLoaded", () => {
    loadCurrentGuests();
    loadServicesPicker("servicesPicker");
});

function loadCurrentGuests() {
    fetch(`${API_URL}/bookings/current`, {
        credentials: "include"
    })
    .then(res => res.json())
    .then(bookings => {
        const select = document.getElementById("bookingSelect");
        select.innerHTML =
            '<option value="">Select Guest</option>';
        bookings.forEach(booking => {
            select.innerHTML += `
                <option value="${booking.id}">
                    ${booking.fullname}
                    • Room ${booking.room_number}
                </option>
            `;
        });
    });
}

function addServicesToBill(){
    const booking_id = document.getElementById("bookingSelect").value;
    if(!booking_id){
        showToast("Select a guest","error");
        return;
    }
    fetch(`${API_URL}/services/add-to-booking`,{
        method:"POST",
        credentials:"include",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            booking_id,
            services:getSelectedServices()
        })
    })
    .then(res=>res.json())
    .then(data=>{
        showToast(data.message,"success");
        document.getElementById("result").innerHTML=`
            <h3>Added To Bill</h3>
            Total Added:  <strong>KES ${Number(data.services_total).toFixed(2)}</strong>
        `;
        loadServicesPicker("servicesPicker");
    });
}