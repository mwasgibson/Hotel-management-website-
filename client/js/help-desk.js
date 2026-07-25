function initHelpDesk() {
    const widget = document.createElement('div');
    widget.id = 'help-desk-widget';
    widget.innerHTML = `
        <div id="help-desk-panel" class="hidden">
            <h3>Need help?</h3>
            <a href="https://wa.me/254794819019" target="_blank" rel="noopener" class="help-desk-option">
                <i class="ph ph-whatsapp-logo"></i> WhatsApp
            </a>
            <a href="tel:+254108962037" class="help-desk-option">
                <i class="ph ph-phone"></i> Call us
            </a>
            <a href="mailto:gibsonmwangi72@gmail.com" class="help-desk-option">
                <i class="ph ph-envelope"></i> Email
            </a>
            <button type="button" class="help-desk-option" onclick="openHelpDeskChat()">
                <i class="ph ph-chat-circle-text"></i> Leave a message
            </button>
        </div>
        <button type="button" id="help-desk-toggle" aria-label="Help">
            <i class="ph ph-headset"></i>
        </button>
    `;
    document.body.appendChild(widget);

    document.getElementById('help-desk-toggle').addEventListener('click', () => {
        document.getElementById('help-desk-panel').classList.toggle('hidden');
    });
}

function openHelpDeskChat() {
    const panel = document.getElementById('help-desk-panel');
    panel.innerHTML = `
        <h3>Leave a message</h3>
        <input type="text" id="hd_name" placeholder="Your name">
        <input type="email" id="hd_email" placeholder="Your email">
        <textarea id="hd_message" placeholder="How can we help?"></textarea>
        <button type="button" onclick="submitHelpDeskMessage()">Send</button>
    `;
}

function submitHelpDeskMessage() {
    const name = document.getElementById('hd_name').value;
    const email = document.getElementById('hd_email').value;
    const message = document.getElementById('hd_message').value;

    if (!name || !email || !message) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject: 'Help Desk message', message })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) { showToast(data.error || 'Failed to send', 'error'); return; }
        document.getElementById('help-desk-panel').innerHTML = `<p>Thanks — we'll get back to you shortly.</p>`;
        showToast('Message sent', 'success');
    })
    .catch(error => console.error('Error sending help desk message:', error));
}

document.addEventListener('DOMContentLoaded', initHelpDesk);