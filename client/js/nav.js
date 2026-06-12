(function () {

  const nav = document.querySelector('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const toggle  = document.querySelector('.nav-toggle');
  const navUl   = document.querySelector('nav ul');
  const overlay = document.querySelector('.nav-overlay');

  function openMenu() {
    toggle?.classList.add('open');
    navUl?.classList.add('open');
    overlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggle?.classList.remove('open');
    navUl?.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', () =>
    toggle.classList.contains('open') ? closeMenu() : openMenu()
  );

  overlay?.addEventListener('click', closeMenu);

  navUl?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => e.key === 'Escape' && closeMenu());

  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav ul li a').forEach(link => {
    if (link.getAttribute('href') === current) link.classList.add('active');
  });

})();