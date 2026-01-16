// -----------------------------
// Helpers
// -----------------------------
function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
}

function getHeaderEl(sectionEl) {
    return sectionEl?.querySelector(".section-header");
}

function scrollSectionHeaderIntoView(sectionEl) {
    const headerEl = getHeaderEl(sectionEl);
    if (!headerEl) return;

    const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
    const y = headerEl.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 6;

    window.scrollTo({ top: y, behavior: "smooth" });
}

function setExpanded(sectionEl, expanded) {
    const headerEl = getHeaderEl(sectionEl);
    if (headerEl) headerEl.setAttribute("aria-expanded", String(expanded));
}

function openSection(sectionEl) {
    if (!sectionEl) return;
    sectionEl.classList.add("is-open");
    setExpanded(sectionEl, true);
}

function closeSection(sectionEl) {
    if (!sectionEl) return;
    sectionEl.classList.remove("is-open");
    setExpanded(sectionEl, false);
}

function toggleSection(sectionEl) {
    if (!sectionEl) return;
    const open = sectionEl.classList.contains("is-open");
    if (open) closeSection(sectionEl);
    else openSection(sectionEl);
}

function initAccordionState() {
    const sections = document.querySelectorAll(".collapsible-section");

    // Desktop: open all
    if (!isMobile()) {
        sections.forEach(sec => openSection(sec));
        return;
    }

    // Mobile: start closed
    sections.forEach(sec => closeSection(sec));
}

// -----------------------------
// Main
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Hamburger
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");

    if (hamburger && navLinks) {
        hamburger.addEventListener("click", () => {
            navLinks.classList.toggle("show");
        });
    }

    // -----------------------------
    // iOS-safe accordion tap detection
    // Entire header is clickable, BUT only toggles on a real tap (no scroll gesture)
    // -----------------------------
    const MOVE_THRESHOLD = 14;      // px
    const SCROLL_THRESHOLD = 2;     // px

    // Prevent ghost click after touchend on iOS
    let justHandledTouch = false;

    document.querySelectorAll(".collapsible-section .section-header").forEach((btn) => {
        let startX = 0;
        let startY = 0;
        let startScrollY = 0;
        let moved = false;

        btn.addEventListener("touchstart", (e) => {
            if (!isMobile()) return;
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startScrollY = window.scrollY;
            moved = false;
        }, { passive: true });

        btn.addEventListener("touchmove", (e) => {
            if (!isMobile()) return;
            const t = e.touches[0];
            const dx = Math.abs(t.clientX - startX);
            const dy = Math.abs(t.clientY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) moved = true;
        }, { passive: true });

        btn.addEventListener("touchend", (e) => {
            if (!isMobile()) return;

            const scrolled = Math.abs(window.scrollY - startScrollY) > SCROLL_THRESHOLD;
            if (moved || scrolled) return;

            e.preventDefault(); // stops ghost click
            justHandledTouch = true;
            setTimeout(() => (justHandledTouch = false), 600);

            const section = btn.closest(".collapsible-section");
            toggleSection(section);
        }, { passive: false });

        // Desktop click toggling
        btn.addEventListener("click", (e) => {
            if (isMobile()) {
                // On mobile/iOS we do NOT toggle on click due to ghost clicks
                if (justHandledTouch) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                return;
            }

            const section = btn.closest(".collapsible-section");
            toggleSection(section);
        });
    });

    // -----------------------------
    // Navbar links: open section + smooth scroll
    // -----------------------------
    document.querySelectorAll('.navbar a[href^="#"]').forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute("href"));
            if (!target) return;

            if (isMobile() && target.classList.contains("collapsible-section")) {
                openSection(target);
                scrollSectionHeaderIntoView(target);
            } else {
                scrollSectionHeaderIntoView(target);
            }

            navLinks?.classList.remove("show");
        });
    });

    // Init / resize
    initAccordionState();
    window.addEventListener("resize", initAccordionState);
});
