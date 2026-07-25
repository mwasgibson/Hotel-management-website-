const transporter = require('../config/mailer');

const sendEmail = async ({ to, subject, html }) => {
    try {
        await transporter.sendMail({
            from: `"Hotel Management" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
    } catch (error) {
        // Don't let email failures break the booking/payment flow — just log it
        console.error('Error sending email:', error);
        res.status(500).json({
            error: "Failed to send email"
        });
    }
};

module.exports = sendEmail;