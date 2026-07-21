document.addEventListener('DOMContentLoaded', () => {
    // Auto-tag common repeating containers so individual pages don't need to hand-annotate every card
    document.querySelectorAll('#rooms > div, #roomGrid > div, .card, #allBookings > div, .service-icon')
        .forEach(el => el.classList.add('reveal-on-scroll'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 60);   // slight stagger
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
});