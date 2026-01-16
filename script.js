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

function openSection(sectionEl) {
    if (!sectionEl) return;
    sectionEl.classList.add('is-open');
    const btn = sectionEl.querySelector('.section-toggle');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    scrollSectionTitleIntoView(sectionEl);
}


function toggleSection(sectionEl) {
    if (!sectionEl) return;
    const isOpen = sectionEl.classList.contains('is-open');

    if (!isOpen) {
        openSection(sectionEl);
    } else {
        sectionEl.classList.remove('is-open');
        const btn = sectionEl.querySelector('.section-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
}

function initAccordionState() {
    const sections = document.querySelectorAll('.collapsible-section');

    sections.forEach(sec => {
        sec.classList.remove('is-open');
        const btn = sec.querySelector('.section-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });

    // On desktop, keep everything open
    if (!isMobile()) {
        sections.forEach(sec => {
            sec.classList.add('is-open');
            const btn = sec.querySelector('.section-toggle');
            if (btn) btn.setAttribute('aria-expanded', 'true');
        });
    }
}

// iOS-safe toggle: ONLY toggle when the toggle button is tapped (not when scrolling on header)
document.querySelectorAll('.collapsible-section .section-toggle').forEach(btn => {
    let startX = 0;
    let startY = 0;
    let moved = false;
    const THRESHOLD = 10;

    btn.addEventListener('touchstart', (e) => {
        if (!isMobile()) return;
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        moved = false;
    }, { passive: true });

    btn.addEventListener('touchmove', (e) => {
        if (!isMobile()) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        if (dx > THRESHOLD || dy > THRESHOLD) moved = true;
    }, { passive: true });

    btn.addEventListener('touchend', (e) => {
        if (!isMobile()) return;
        if (moved) return;

        e.preventDefault(); // prevent iOS ghost click
        e.stopPropagation();

        const section = btn.closest('.collapsible-section');
        toggleSection(section);
    }, { passive: false });

    // Desktop / non-iOS fallback
    btn.addEventListener('click', (e) => {
        if (!isMobile()) return;
        e.preventDefault();
        e.stopPropagation();
        toggleSection(btn.closest('.collapsible-section'));
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
