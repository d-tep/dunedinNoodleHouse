// ---------- Mobile nav ----------
document.getElementById('hamburger').addEventListener('click', function () {
    document.getElementById('nav-links').classList.toggle('show');
});

// ---------- Accordion + scroll helpers ----------
function isMobile() {
    return window.matchMedia('(max-width: 700px)').matches;
}

function scrollSectionTitleIntoView(sectionEl) {
    const titleEl = sectionEl.querySelector('.section-title');
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
    closeAllSections(sectionEl); // <-- remove this line if you don't want auto-collapse others
    sectionEl.classList.add('is-open');
    const title = sectionEl.querySelector('.section-title');
    if (title) title.setAttribute('aria-expanded', 'true');
    scrollSectionTitleIntoView(sectionEl);
}

function toggleSection(sectionEl) {
    if (!sectionEl) return;
    const isOpen = sectionEl.classList.contains('is-open');

    if (!isOpen) {
        openSection(sectionEl);
    } else {
        sectionEl.classList.remove('is-open');
        const title = sectionEl.querySelector('.section-title');
        if (title) title.setAttribute('aria-expanded', 'false');
    }
}

function initAccordionState() {
    const sections = document.querySelectorAll('.collapsible-section');

    sections.forEach(sec => {
        sec.classList.remove('is-open');
        const title = sec.querySelector('.section-title');
        if (title) title.setAttribute('aria-expanded', 'false');
    });

    // On desktop, keep everything open
    if (!isMobile()) {
        sections.forEach(sec => {
            sec.classList.add('is-open');
            const title = sec.querySelector('.section-title');
            if (title) title.setAttribute('aria-expanded', 'true');
        });
    }
}

// ---------- iOS-safe tap-only accordion headers ----------
const MOVE_THRESHOLD = 24;    // px (higher so fast flicks never count as taps)
const SCROLL_THRESHOLD = 12;  // px

let justHandledTouch = false;

document.querySelectorAll('.collapsible-section .section-title').forEach(titleEl => {
    // Block ghost click on iOS: on mobile we NEVER toggle via click
    titleEl.addEventListener('click', (e) => {
        if (!isMobile()) return; // desktop click works (handled below)
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, { capture: true });

    // Desktop click toggling
    titleEl.addEventListener('click', () => {
        if (isMobile()) return;
        toggleSection(titleEl.closest('.collapsible-section'));
    });

    // Touch tap detection
    let startX = 0;
    let startY = 0;
    let startScrollY = 0;
    let moved = false;

    titleEl.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;

        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        startScrollY = window.scrollY;
        moved = false;
    }, { passive: true });

    titleEl.addEventListener('touchmove', (e) => {
        if (!isMobile()) return;

        const t = e.touches[0];
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);

        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) moved = true;
    }, { passive: true });

    titleEl.addEventListener('touchend', (e) => {
        if (!isMobile()) return;

        const scrolled = Math.abs(window.scrollY - startScrollY) > SCROLL_THRESHOLD;
        if (moved || scrolled) return;

        // This was a real tap
        e.preventDefault(); // prevents ghost click
        justHandledTouch = true;
        setTimeout(() => { justHandledTouch = false; }, 650);

        toggleSection(titleEl.closest('.collapsible-section'));
    }, { passive: false });

    titleEl.addEventListener('touchcancel', () => {
        moved = true;
    }, { passive: true });

    // Keyboard
    titleEl.addEventListener('keydown', (e) => {
        if (!isMobile()) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection(titleEl.closest('.collapsible-section'));
        }
    });
});

// Nav click: open the section (accordion) then scroll to title
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

        document.getElementById('nav-links').classList.remove('show');
    });
});

initAccordionState();
window.addEventListener('resize', initAccordionState);
