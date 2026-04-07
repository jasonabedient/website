// Main JavaScript file

// Theme Initialization (Run immediately to avoid FOUC)
(function () {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemTheme)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio site loaded.');

    // Inject Theme Toggle
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.ariaLabel = 'Toggle Dark Mode';

        // Icons
        const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
        const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

        function updateIcon() {
            const isDark = document.documentElement.classList.contains('dark');
            themeToggle.innerHTML = isDark ? sunIcon : moonIcon;
        }

        updateIcon();

        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateIcon();
        });

        // Insert before the last item (likely the "Let's Talk" button) or at the end
        // Inserting at the end is safest for now
        mainNav.appendChild(themeToggle);
    }

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

    // Contact Form Handler
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            let feedbackEl = document.getElementById('form-feedback');
            if (!feedbackEl) {
                feedbackEl = document.createElement('div');
                feedbackEl.id = 'form-feedback';
                feedbackEl.style.marginTop = '1rem';
                feedbackEl.style.textAlign = 'center';
                feedbackEl.style.fontWeight = '500';
                contactForm.appendChild(feedbackEl);
            }
            feedbackEl.style.display = 'none';

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            // Simple client-side email check before Sending
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(data.email)) {
                feedbackEl.style.display = 'block';
                feedbackEl.textContent = 'Please enter a valid email address.';
                feedbackEl.style.color = 'hsl(var(--destructive))';
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                feedbackEl.style.display = 'block';
                if (response.ok) {
                    feedbackEl.textContent = 'Message sent successfully! I will get back to you soon.';
                    feedbackEl.style.color = 'hsl(var(--primary))';
                    contactForm.reset();
                } else {
                    feedbackEl.textContent = result.error || 'Failed to send message. Please try again later.';
                    feedbackEl.style.color = 'hsl(var(--destructive))';
                }
            } catch (err) {
                feedbackEl.style.display = 'block';
                feedbackEl.textContent = 'A network error occurred. Please try again.';
                feedbackEl.style.color = 'hsl(var(--destructive))';
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});
