// ---------- Mobile hamburger ----------
document.getElementById('hamburger')?.addEventListener('click', function () {
    document.getElementById('nav-links')?.classList.toggle('show');
});

// ---------- Helpers ----------
function isMobile() {
    return window.matchMedia('(max-width: 700px)').matches;
}

function getNavbarOffset() {
    const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
    return navbarHeight + 6;
}

function scrollSectionIntoView(sectionEl) {
    if (!sectionEl) return;

    const y =
        sectionEl.getBoundingClientRect().top +
        window.pageYOffset -
        getNavbarOffset();

    window.scrollTo({ top: y, behavior: 'smooth' });
}

// ---------- Smooth scroll for ALL navbar links (hamburger menu + desktop) ----------
document.querySelectorAll('.navbar a[href^="#"]').forEach(link => {
    // NOTE: we'll still let nav-strip manage its own click (below)
    // This handler is okay because nav-strip also prevents default.
    link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        const target = href ? document.querySelector(href) : null;
        if (!target) return;

        e.preventDefault();
        scrollSectionIntoView(target);

        // close hamburger after click
        document.getElementById('nav-links')?.classList.remove('show');
    });
});

// ---------- Horizontal mobile nav strip: active tracking + NO jumping underline ----------
(function initActiveChipTracking() {
    const strip = document.querySelector('.nav-strip');
    if (!strip) return;

    const chipLinks = Array.from(strip.querySelectorAll('a[href^="#"]'));
    if (!chipLinks.length) return;

    // Map section id -> chip link
    const chipById = new Map();
    chipLinks.forEach(a => {
        const id = (a.getAttribute('href') || '').slice(1);
        if (id) chipById.set(id, a);
    });

    const sections = Array.from(chipById.keys())
        .map(id => document.getElementById(id))
        .filter(Boolean);

    if (!sections.length) return;

    let lastActiveId = null;

    // ✅ NEW: lock active chip during programmatic scroll
    let lockActive = false;
    let lockTimer = null;
    let scrollEndTimer = null;

    function setLockActive(on) {
        lockActive = on;
        if (lockTimer) clearTimeout(lockTimer);
        if (!on) return;

        // hard timeout fallback (in case scrollend detection fails)
        lockTimer = setTimeout(() => {
            lockActive = false;
        }, 1200);
    }

    // Detect when scrolling settles (debounced)
    function armScrollEndUnlock() {
        if (scrollEndTimer) clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
            lockActive = false;
        }, 140);
    }

    window.addEventListener(
        'scroll',
        () => {
            if (!lockActive) return;
            armScrollEndUnlock();
        },
        { passive: true }
    );

    function setActiveChip(id, { align = true, force = false } = {}) {
        if (!id) return;
        if (!force && id === lastActiveId) return;

        lastActiveId = id;

        chipLinks.forEach(a => a.classList.remove('active'));
        const active = chipById.get(id);
        if (!active) return;

        active.classList.add('active');

        if (align && isMobile()) {
            active.scrollIntoView({
                behavior: 'smooth',
                inline: 'start',
                block: 'nearest'
            });
        }
    }

    // ✅ When you tap a chip:
    // - lock active so underline doesn't jump
    // - set active immediately
    // - smooth scroll to section
    chipLinks.forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href') || '';
            if (!href.startsWith('#')) return;

            const id = href.slice(1);
            const target = document.getElementById(id);
            if (!target) return;

            e.preventDefault();

            setLockActive(true);
            setActiveChip(id, { align: true, force: true });
            scrollSectionIntoView(target);

            // close hamburger if open
            document.getElementById('nav-links')?.classList.remove('show');
        });
    });

    // Observer: keep active chip in sync while user scrolls
    const observer = new IntersectionObserver(
        (entries) => {
            if (!isMobile()) return;
            if (lockActive) return; // ✅ key line: ignore observer updates while locked

            const visible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            if (visible.length) {
                setActiveChip(visible[0].target.id, { align: true });
            }
        },
        {
            rootMargin: `-${getNavbarOffset()}px 0px -45% 0px`,
            threshold: [0.08, 0.15, 0.25, 0.4, 0.6]
        }
    );

    sections.forEach(sec => observer.observe(sec));
    // ---------- Back to top button ----------
    (function initBackToTop() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;

        const SHOW_AFTER = 400; // px scrolled before showing

        function onScroll() {
            if (window.scrollY > SHOW_AFTER) {
                btn.classList.add('show');
            } else {
                btn.classList.remove('show');
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    })();

    // Set initial active chip on load
    window.addEventListener('load', () => {
        if (!isMobile()) return;

        const y = window.scrollY + getNavbarOffset();
        let best = null;
        let bestDist = Infinity;

        sections.forEach(sec => {
            const top = sec.getBoundingClientRect().top + window.scrollY;
            const d = Math.abs(top - y);
            if (d < bestDist) {
                bestDist = d;
                best = sec;
            }
        });

        if (best) setActiveChip(best.id, { align: false, force: true });
    });
})();
