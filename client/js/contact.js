function submitContact() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            showToast(data.error || 'Failed to send message');
            return;
        }
        showToast(data.message);
        document.querySelector('form').reset();
    })
    .catch(error => {
        console.error('Error sending message:', error);
        showToast('Unable to connect to the server.');
    });
}