// ---------- Mobile nav ----------
document.getElementById('hamburger')?.addEventListener('click', function () {
    document.getElementById('nav-links')?.classList.toggle('show');
});

// ---------- Accordion + scroll helpers ----------
function isMobile() {
    return window.matchMedia('(max-width: 700px)').matches;
}

function scrollSectionTitleIntoView(sectionEl) {
    const titleEl = sectionEl?.querySelector('.section-title');
    if (!titleEl) return;

    const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
    const y = titleEl.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 6;

    window.scrollTo({ top: y, behavior: 'smooth' });
}

function closeAllSections(exceptSection = null) {
    document.querySelectorAll('.collapsible-section').forEach(sec => {
        if (exceptSection && sec === exceptSection) return;
        sec.classList.remove('is-open');
        const title = sec.querySelector('.section-title');
        if (title) title.setAttribute('aria-expanded', 'false');
    });
}

function openSection(sectionEl) {
    if (!sectionEl) return;

    // Auto-collapse others (remove this line if you want multiple open)
    closeAllSections(sectionEl);

    sectionEl.classList.add('is-open');
    const title = sectionEl.querySelector('.section-title');
    if (title) title.setAttribute('aria-expanded', 'true');

    scrollSectionTitleIntoView(sectionEl);
}

function closeSection(sectionEl) {
    if (!sectionEl) return;
    sectionEl.classList.remove('is-open');
    const title = sectionEl.querySelector('.section-title');
    if (title) title.setAttribute('aria-expanded', 'false');
}

function toggleSection(sectionEl) {
    if (!sectionEl) return;
    const open = sectionEl.classList.contains('is-open');
    if (open) closeSection(sectionEl);
    else openSection(sectionEl);
}

function initAccordionState() {
    const sections = document.querySelectorAll('.collapsible-section');

    // Reset
    sections.forEach(sec => {
        sec.classList.remove('is-open');
        const title = sec.querySelector('.section-title');
        if (title) title.setAttribute('aria-expanded', 'false');
    });

    // Desktop: keep everything open
    if (!isMobile()) {
        sections.forEach(sec => {
            sec.classList.add('is-open');
            const title = sec.querySelector('.section-title');
            if (title) title.setAttribute('aria-expanded', 'true');
        });
    }
}

// ---------- iOS FIX: prevent flick-scroll from toggling accordion ----------
let touchIsScrolling = false;

// Start of any touch gesture -> assume not scrolling yet
window.addEventListener('touchstart', () => {
    touchIsScrolling = false;
}, { passive: true });

// If any touchmove happens anywhere, user is scrolling (works for fast flicks)
window.addEventListener('touchmove', () => {
    touchIsScrolling = true;
}, { passive: true });

// Small cooldown after touch ends
window.addEventListener('touchend', () => {
    setTimeout(() => {
        touchIsScrolling = false;
    }, 180);
}, { passive: true });

// Accordion title handlers (entire header is clickable)
document.querySelectorAll('.collapsible-section .section-title').forEach(titleEl => {
    // Block iOS ghost clicks on mobile
    titleEl.addEventListener('click', (e) => {
        if (!isMobile()) return; // desktop ignores click anyway
        e.preventDefault();
        e.stopPropagation();
    }, true);

    // Use touchend for real taps only (no scrolling)
    titleEl.addEventListener('touchend', (e) => {
        if (!isMobile()) return;

        // If any scrolling happened during this touch gesture, do NOT toggle
        if (touchIsScrolling) return;

        e.preventDefault();
        toggleSection(titleEl.closest('.collapsible-section'));
    }, { passive: false });

    // Keyboard accessibility (mobile focus + Enter/Space)
    titleEl.addEventListener('keydown', (e) => {
        if (!isMobile()) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection(titleEl.closest('.collapsible-section'));
        }
    });
});

// ---------- Navbar links: open + scroll ----------
document.querySelectorAll('.navbar a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;

        if (isMobile() && target.classList.contains('collapsible-section')) {
            openSection(target);
        } else {
            scrollSectionTitleIntoView(target);
        }

        document.getElementById('nav-links')?.classList.remove('show');
    });
});

// Init
initAccordionState();
window.addEventListener('resize', initAccordionState);
