// -----------------------------
// Helpers
// -----------------------------
function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
}

function scrollSectionTitleIntoView(sectionEl) {
    const titleEl = sectionEl.querySelector(".section-title");
    if (!titleEl) return;

    const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
    const y = titleEl.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 6;

    window.scrollTo({ top: y, behavior: "smooth" });
}

function closeAllSections(exceptSection = null) {
    document.querySelectorAll(".collapsible-section").forEach((sec) => {
        if (exceptSection && sec === exceptSection) return;
        sec.classList.remove("is-open");
        const title = sec.querySelector(".section-title");
        if (title) title.setAttribute("aria-expanded", "false");
    });
}

function openSection(sectionEl) {
    if (!sectionEl) return;
    closeAllSections(sectionEl);
    sectionEl.classList.add("is-open");
    const title = sectionEl.querySelector(".section-title");
    if (title) title.setAttribute("aria-expanded", "true");
    scrollSectionTitleIntoView(sectionEl);
}

function toggleSection(sectionEl) {
    if (!sectionEl) return;

    const isOpen = sectionEl.classList.contains("is-open");
    if (!isOpen) {
        openSection(sectionEl);
    } else {
        sectionEl.classList.remove("is-open");
        const title = sectionEl.querySelector(".section-title");
        if (title) title.setAttribute("aria-expanded", "false");
    }
}

function initAccordionState() {
    const sections = document.querySelectorAll(".collapsible-section");

    sections.forEach((sec) => {
        sec.classList.remove("is-open");
        const title = sec.querySelector(".section-title");
        if (title) title.setAttribute("aria-expanded", "false");
    });

    // On desktop, keep everything open
    if (!isMobile()) {
        sections.forEach((sec) => {
            sec.classList.add("is-open");
            const title = sec.querySelector(".section-title");
            if (title) title.setAttribute("aria-expanded", "true");
        });
    }
}

// -----------------------------
// Mobile nav (hamburger)
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");

    if (hamburger && navLinks) {
        hamburger.addEventListener("click", () => {
            navLinks.classList.toggle("show");
        });
    }

    // -----------------------------
    // Accordion: iPhone-safe tap detection
    // Only toggle when it is a real TAP (no scroll movement, no page scroll)
    // -----------------------------
    const MOVE_THRESHOLD_PX = 14; // slightly higher = safer on iOS
    const SCROLL_THRESHOLD_PX = 2;

    // Prevent "double fire" (touchend then click)
    let justHandledTouch = false;

    document.querySelectorAll(".collapsible-section .section-title").forEach((titleEl) => {
        let startX = 0;
        let startY = 0;
        let startScrollY = 0;
        let moved = false;

        // Touch start
        titleEl.addEventListener(
            "touchstart",
            (e) => {
                if (!isMobile()) return;

                const t = e.touches[0];
                startX = t.clientX;
                startY = t.clientY;
                startScrollY = window.scrollY;
                moved = false;
            },
            { passive: true }
        );

        // Touch move = user is scrolling/swiping
        titleEl.addEventListener(
            "touchmove",
            (e) => {
                if (!isMobile()) return;

                const t = e.touches[0];
                const dx = Math.abs(t.clientX - startX);
                const dy = Math.abs(t.clientY - startY);

                if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
                    moved = true;
                }
            },
            { passive: true }
        );

        // Touch end: toggle only if no movement AND no scroll happened
        titleEl.addEventListener(
            "touchend",
            () => {
                if (!isMobile()) return;

                const scrolled = Math.abs(window.scrollY - startScrollY) > SCROLL_THRESHOLD_PX;
                if (moved || scrolled) return;

                justHandledTouch = true;
                setTimeout(() => (justHandledTouch = false), 600);

                toggleSection(titleEl.closest(".collapsible-section"));
            },
            { passive: true }
        );

        // Click: allow desktop mouse, and Android non-touch click;
        // ignore the "ghost click" that sometimes follows iOS touch.
        titleEl.addEventListener("click", (e) => {
            if (!isMobile()) return;

            if (justHandledTouch) {
                e.preventDefault();
                return;
            }

            // On iOS, click can occur after scroll; if page is moving, ignore.
            // (This is extra safety; touch handlers already cover most cases.)
            toggleSection(titleEl.closest(".collapsible-section"));
        });

        // Keyboard accessibility
        titleEl.addEventListener("keydown", (e) => {
            if (!isMobile()) return;
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleSection(titleEl.closest(".collapsible-section"));
            }
        });
    });

    // -----------------------------
    // Navbar links: open section on mobile + scroll
    // -----------------------------
    document.querySelectorAll('.navbar a[href^="#"]').forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute("href"));
            if (!target) return;

            if (isMobile() && target.classList.contains("collapsible-section")) {
                openSection(target);
            } else {
                scrollSectionTitleIntoView(target);
            }

            // close mobile nav
            navLinks?.classList.remove("show");
        });
    });

    // Init + resize
    initAccordionState();
    window.addEventListener("resize", initAccordionState);
});
