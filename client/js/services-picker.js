const selectedServices = {}

function loadServicesPicker(containerId) {
    fetch(`${API_URL}/services`, { credentials: 'include' })
        .then(res => res.json())
        .then(services => {
            const container = document.getElementById(containerId);
            container.innerHTML = '<h3>Optional Services</h3> <div class="services-grid"></div>';
            const grid = container.querySelector(".services-grid");

            services.forEach(service => {
                grid.innerHTML += `
                    <div class="service-card">
                        <div class="service-details">
                            <h4>${service.name}</h4>
                            <small>${service.description || "" }</small>
                            <span>KES ${Number(service.price).toLocaleString()}</span>
                        </div>    
                        <div class="qty-picker">
                            <button type="button" onclick="changeQty(${service.id},-1)"> - </button>
                            <span id="qty-${service.id}">0</span>
                            <button type="button" onclick="changeQty(${service.id},1)"> + </button>
                        </div>
                    </div>
                `;
            });
        })
        .catch(error => console.error('Error loading services:', error));
}

function changeQty(id, amount){
    if(!selectedServices[id]){
        selectedServices[id]=0;
    }
    selectedServices[id]+=amount;
    if(selectedServices[id]<0){
        selectedServices[id]=0;
    }
    document.getElementById(`qty-${id}`).textContent =
        selectedServices[id];
}

function getSelectedServices() {
    return Object.entries(selectedServices)
        .filter(([id,qty])=>qty>0)
        .map(([id,qty])=>({
            service_id:Number(id),
            quantity:qty
        }));
}

function applyPromoPreview() {
    const code = document.getElementById('promo_code').value;
    if (!code) return;

    let servicesTotal = 0;
    document.querySelectorAll(".service-card").forEach(card=>{
        const id = card.dataset.id;
        if(selectedServices[id]){
            const price = Number(card.dataset.price);
            servicesTotal +=  price * selectedServices[id];
        }
    });

    const roomSubtotal = window.currentBookingSubtotal || 0;   // each page sets this once it knows the room price/nights

    fetch(`${API_URL}/deals/preview-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: roomSubtotal + servicesTotal })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        const result = document.getElementById('promoPreviewResult');
        if (!ok) {
            result.textContent = data.error;
            result.style.color = 'red';
            return;
        }
        result.textContent = `${data.dealTitle}: KES ${data.discount} off`;
        result.style.color = 'green';
    })
    .catch(error => console.error('Error checking promo code:', error));
}