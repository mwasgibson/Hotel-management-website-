const sendEmail = require('../utils/sendEmail');

exports.submitContact = async (req, res) => {
    try{
        const { name, email, subject, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        // Notify the hotel
        await sendEmail({
            to: process.env.EMAIL_USER,
            subject: `New contact form message: ${subject || 'No subject'}`,
            html: `
                <p><strong>From:</strong> ${name} (${email})</p>
                <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                `
        });
        // Confirm receipt to the sender
        await sendEmail({
            to: email,
            subject: 'We received your message',
            html: `<p>Hi ${name},</p><p>Thanks for reaching out — we've received your message and will get back to you soon.</p>`
        });
    }
        catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Failed to send email'
            });
        }
    res.status(200).json({ message: 'Your message has been sent successfully' });
};