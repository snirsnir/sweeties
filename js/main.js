/**
 * sweeties - Main Site JavaScript
 */
(function () {
    'use strict';

    // ─── Custom Cursor ────────────────────────────────────────────────────────
    const cursorDot    = document.getElementById('cursor-dot');
    const cursorHammer = document.getElementById('cursor-hammer');
    let mouseX = 0, mouseY = 0;
    let dotX   = 0, dotY   = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (cursorHammer) {
            cursorHammer.style.left = e.clientX + 'px';
            cursorHammer.style.top  = e.clientY + 'px';
        }
    });

    // Smooth dot
    function animateDot() {
        dotX += (mouseX - dotX) * 0.2;
        dotY += (mouseY - dotY) * 0.2;
        if (cursorDot) {
            cursorDot.style.left = dotX + 'px';
            cursorDot.style.top  = dotY + 'px';
        }
        requestAnimationFrame(animateDot);
    }
    animateDot();

    document.addEventListener('mousedown', () => {
        // בלחיצה - פטיש מורם לניפוץ
        if (cursorHammer) cursorHammer.style.transform = 'translate(-50%,-50%) rotate(-55deg) scale(1.15)';
    });
    document.addEventListener('mouseup', () => {
        // בשחרור - חזרה למצב סיור (רגוע, מוחזק טבעי)
        if (cursorHammer) cursorHammer.style.transform = 'translate(-50%,-50%) rotate(25deg)';
    });

    // ─── Dark / Light mode toggle ─────────────────────────────────────────────
    const themeBtn = document.getElementById('theme-toggle');
    const applyMode = (mode) => {
        document.body.classList.toggle('light-mode', mode === 'light');
        localStorage.setItem('sweeties-theme', mode);
    };
    applyMode(localStorage.getItem('sweeties-theme') || 'dark');
    themeBtn.addEventListener('click', () => {
        applyMode(document.body.classList.contains('light-mode') ? 'dark' : 'light');
    });

    // ─── Color theme dots ─────────────────────────────────────────────────────
    const applyColor = (color) => {
        document.body.setAttribute('data-color', color);
        localStorage.setItem('sweeties-color', color);
        document.querySelectorAll('.cdot').forEach(d => {
            d.classList.toggle('active', d.dataset.color === color);
        });
        const logoSrc = `logos/${color}.png`;
        document.querySelectorAll('.intro-logo, .loading-logo, .logo-float img, .footer-logo').forEach(img => {
            img.style.display = '';
            img.src = logoSrc;
        });
    };
    applyColor(localStorage.getItem('sweeties-color') || 'pink');
    document.querySelectorAll('.cdot').forEach(dot => {
        dot.addEventListener('click', () => applyColor(dot.dataset.color));
    });

    // ─── Background Hearts ────────────────────────────────────────────────────
    function spawnHearts() {
        const container = document.getElementById('bg-hearts');
        if (!container) return;
        const HEARTS = ['♥', '♡', '❤', '💜'];
        for (let i = 0; i < 18; i++) {
            const el = document.createElement('div');
            el.className  = 'bg-heart';
            el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
            el.style.left     = Math.random() * 100 + 'vw';
            el.style.fontSize = (14 + Math.random() * 22) + 'px';
            const dur = 12 + Math.random() * 18;
            el.style.animationDuration = dur + 's';
            el.style.animationDelay    = -(Math.random() * dur) + 's';
            el.style.color = Math.random() > 0.5 ? '#8B2FC9' : '#D4AF37';
            container.appendChild(el);
        }
    }

    // ─── Hero Particles ───────────────────────────────────────────────────────
    function spawnHeroParticles() {
        const container = document.getElementById('hero-particles');
        if (!container) return;
        for (let i = 0; i < 40; i++) {
            const el = document.createElement('div');
            el.className = 'hero-particle';
            const size = 2 + Math.random() * 5;
            el.style.cssText = `
                width:${size}px; height:${size}px;
                left:${Math.random()*100}%;
                top:${Math.random()*100}%;
                background:${Math.random()>.5?'#D4AF37':'#8B2FC9'};
                animation-duration:${3+Math.random()*4}s;
                animation-delay:${Math.random()*4}s;
                opacity:.4;
            `;
            container.appendChild(el);
        }
    }

    // ─── Navbar scroll effect ─────────────────────────────────────────────────
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    // ─── Mobile nav toggle ────────────────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('nav-links');

    hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navLinks.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });

    // Close nav on outside click
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') &&
            !navLinks.contains(e.target) &&
            !hamburger.contains(e.target)) {
            navLinks.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    });

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const allNavLinks = document.querySelectorAll('.nav-link');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                allNavLinks.forEach(l => {
                    l.style.color = l.getAttribute('href') === '#' + id
                        ? 'var(--gold)' : '';
                });
            }
        });
    }, { threshold: 0.35 });
    sections.forEach(s => observer.observe(s));

    // ─── Scroll reveal ────────────────────────────────────────────────────────
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 80);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    function initReveal() {
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    }

    // ─── Counter animation ────────────────────────────────────────────────────
    function animateCount(el) {
        const target   = parseInt(el.dataset.count, 10);
        const duration = 2000;
        const start    = performance.now();
        function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(e * target);
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-num').forEach(el => counterObserver.observe(el));

    // ─── FAQ accordion ────────────────────────────────────────────────────────
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const item   = btn.parentElement;
            const answer = item.querySelector('.faq-a');
            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item.open').forEach(i => {
                i.classList.remove('open');
                const a = i.querySelector('.faq-a');
                a.classList.remove('open-anim');
                a.hidden = true;
                i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
            });

            if (!isOpen) {
                item.classList.add('open');
                answer.hidden = false;
                answer.classList.add('open-anim');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ─── Phone auto-format XXX-XXXXXXX ───────────────────────────────────────
    const phoneInput = document.getElementById('cf-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            let digits = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            phoneInput.value = digits.length > 3 ? digits.slice(0, 3) + '-' + digits.slice(3) : digits;
        });
    }

    // ─── Contact form → Google Forms ─────────────────────────────────────────
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name  = document.getElementById('cf-name').value.trim();
            const phone = document.getElementById('cf-phone').value.trim();
            const type  = document.getElementById('cf-type').value;
            const msg   = document.getElementById('cf-msg').value.trim();

            if (!name || !phone) {
                alert('אנא מלאי שם וטלפון');
                return;
            }

            const formData = new FormData();
            formData.append('entry.100282387', name);
            formData.append('entry.67947579',  phone);
            formData.append('entry.1269928289', type);
            formData.append('entry.1569489097', msg);

            fetch('https://docs.google.com/forms/d/e/1FAIpQLScg6H_jcJlQ5H-Aq-qKkVoy-YjlRgKlavAqjonJgALrIC2YXw/formResponse', {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });

            const wrap = contactForm.closest('.contact-form-wrap');
            wrap.innerHTML = `
                <div class="form-success">
                    <div class="form-success-icon">💜</div>
                    <h3>ההודעה נשלחה!</h3>
                    <p>נחזור אליך בקרוב מאוד</p>
                    <p class="form-success-thanks">תודה רבה!</p>
                </div>`;
        });
    }

    // ─── Product card sparkle on hover ────────────────────────────────────────
    const sparkStyle = document.createElement('style');
    sparkStyle.textContent = `
        .spark { position:fixed; pointer-events:none; z-index:9999; font-size:14px;
                 animation: sparkFly .7s ease forwards; }
        @keyframes sparkFly {
            0%   { opacity:1; transform: translate(-50%,-50%) scale(1); }
            100% { opacity:0; transform: translate(calc(-50% + var(--dx)),calc(-50% - 40px)) scale(0.2); }
        }
    `;
    document.head.appendChild(sparkStyle);

    document.querySelectorAll('.product-card, .workshop-card').forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            for (let i = 0; i < 5; i++) {
                const spark = document.createElement('span');
                spark.className = 'spark';
                spark.textContent = Math.random() > 0.5 ? '✦' : '✧';
                const rect = card.getBoundingClientRect();
                spark.style.left  = (rect.left + Math.random() * rect.width)  + 'px';
                spark.style.top   = (rect.top  + Math.random() * rect.height) + 'px';
                spark.style.color = Math.random() > 0.5 ? '#D4AF37' : '#A855F7';
                spark.style.setProperty('--dx', (Math.random()-0.5)*50 + 'px');
                document.body.appendChild(spark);
                setTimeout(() => spark.remove(), 700);
            }
        });
    });

    // ─── Lightbox ─────────────────────────────────────────────────────────────
    const lightbox  = document.getElementById('lightbox');
    const lbImg     = document.getElementById('lb-img');
    const lbClose   = document.getElementById('lb-close');
    const lbBackdrop = document.getElementById('lb-backdrop');

    function openLightbox(src, alt) {
        lbImg.src = src; lbImg.alt = alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { lbImg.src = ''; }, 320);
    }

    lbClose.addEventListener('click', closeLightbox);
    lbBackdrop.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    // הוסף כפתור זכוכית מגדלת לכל תמונת מוצר
    function addZoomButtons() {
        document.querySelectorAll('.product-img-real').forEach(img => {
            if (img.parentElement.querySelector('.img-zoom-btn')) return;
            const btn = document.createElement('button');
            btn.className = 'img-zoom-btn';
            btn.setAttribute('aria-label', 'הגדל תמונה');
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>`;
            btn.addEventListener('click', e => { e.stopPropagation(); openLightbox(img.src, img.alt); });
            img.parentElement.appendChild(btn);
        });
    }
    addZoomButtons();
    document.addEventListener('introComplete', addZoomButtons);

    // ─── Product slideshow (crossfade dissolve) ──────────────────────────────
    document.querySelectorAll('.product-slideshow').forEach(img => {
        const slides = img.dataset.slides.split(',');
        let idx = 0;

        // שכבת overlay לdissolve — נטענת מעל התמונה הנוכחית
        const overlay = document.createElement('img');
        overlay.className = 'product-img-real product-dissolve-overlay';
        img.parentElement.appendChild(overlay);

        setInterval(() => {
            idx = (idx + 1) % slides.length;
            overlay.src = slides[idx];
            overlay.style.opacity = '0';
            overlay.style.transition = 'none';

            // כשהתמונה נטענת — fade in
            overlay.onload = () => {
                requestAnimationFrame(() => {
                    overlay.style.transition = 'opacity 1.4s ease';
                    overlay.style.opacity = '1';
                });
                // אחרי שה-dissolve הסתיים — עדכן את השכבה הבסיסית
                setTimeout(() => {
                    img.src = slides[idx];
                    overlay.style.transition = 'none';
                    overlay.style.opacity = '0';
                }, 1500);
            };
        }, 2000);
    });

    // ─── Reviews modal ───────────────────────────────────────────────────────
    const reviewsModal   = document.getElementById('reviews-modal');
    const reviewsTrigger = document.getElementById('reviews-trigger');
    const rvClose        = document.getElementById('rv-close');
    const rvBackdrop     = document.getElementById('rv-backdrop');

    function openReviews()  { reviewsModal.classList.add('active');    document.body.style.overflow = 'hidden'; }
    function closeReviews() { reviewsModal.classList.remove('active'); document.body.style.overflow = ''; }

    if (reviewsTrigger) reviewsTrigger.addEventListener('click', openReviews);
    if (rvClose)        rvClose.addEventListener('click', closeReviews);
    if (rvBackdrop)     rvBackdrop.addEventListener('click', closeReviews);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeReviews(); });

    // ─── Smooth anchor scrolling ──────────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href').slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });


    // ─── Init after intro (or immediately if skipped) ─────────────────────────
    function initSite() {
        spawnHearts();
        spawnHeroParticles();
        initReveal();
        // הפעל סרטון רק אחרי שהאתר עולה
        const heroVideo = document.getElementById('hero-video');
        if (heroVideo) heroVideo.play().catch(() => {});
    }

    document.addEventListener('introComplete', initSite);

    // If main site is already visible (e.g., reload), init now
    if (document.getElementById('main-site').classList.contains('visible')) {
        initSite();
    }

    // Also init if intro gets skipped quickly
    const mainSiteObserver = new MutationObserver(() => {
        if (document.getElementById('main-site').classList.contains('visible')) {
            initSite();
            mainSiteObserver.disconnect();
        }
    });
    mainSiteObserver.observe(document.getElementById('main-site'), { attributes: true, attributeFilter: ['class'] });

})();
