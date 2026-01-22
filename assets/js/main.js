// Main JavaScript file

document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio site loaded.');

    // Inject Mobile Toggle if header exists
    const headerContainer = document.querySelector('.site-header .container');
    if (headerContainer && !document.querySelector('.mobile-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-toggle';
        toggleBtn.innerHTML = '<span></span><span></span><span></span>';
        toggleBtn.ariaLabel = 'Menu';
        headerContainer.appendChild(toggleBtn);

        const nav = document.querySelector('.main-nav');

        // Mobile Toggle Logic
        toggleBtn.addEventListener('click', () => {
            nav.classList.toggle('open');
            // Prevent scrolling when menu is open
            document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';

            // Optional: Animate hamburger
            if (nav.classList.contains('open')) {
                // Could add transformation styles here or toggle class on btn
            }
        });

        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // Scroll Animations (Intersection Observer)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Unobserve after revealing to only animate once
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px" // Trigger slightly before element is fully in view
    });

    // Target elements to animate
    const animateElements = document.querySelectorAll('section > .container > *, .case-study-card, .blog-preview-card, .hero-title, .hero-subtitle');
    animateElements.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
});
