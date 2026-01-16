
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
    closeAllSections(sectionEl);
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

// Click/keyboard on section titles
document.querySelectorAll('.collapsible-section .section-title').forEach(titleEl => {
    titleEl.addEventListener('click', () => {
        if (!isMobile()) return;
        toggleSection(titleEl.closest('.collapsible-section'));
    });

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