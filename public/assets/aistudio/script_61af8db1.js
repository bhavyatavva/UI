
const $ = id => document.getElementById(id);

/* =========================
   LOGIN DIALOG
========================= */

const EYE_OPEN =
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF =
    '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94"/>' +
    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
    '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

function hasActiveSession() {
    return !!(window.BTAuth && BTAuth.getSession());
}

function openLogin() {
    /* Already signed in? Go straight to the workspace. */
    if (hasActiveSession()) {
        window.location.href = "workspace.html";
        return;
    }

    $("loginOverlay").classList.add("show");
    document.body.style.overflow = "hidden";

    setTimeout(() => $("employeeId").focus(), 100);
}

function closeLogin() {
    $("loginOverlay").classList.remove("show");
    document.body.style.overflow = "";
    setMessage("", "");
    clearFieldError("employeeId");
    clearFieldError("password");
}

function setMessage(text, type) {
    const message = $("loginMessage");
    message.textContent = text;
    message.className = "message" + (type ? " " + type : "");
}

function setFieldError(name, text) {
    const input = $(name);
    const error = $(name + "Error");
    const field = input.closest(".field");

    error.textContent = text;
    field.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
}

function clearFieldError(name) {
    const input = $(name);
    const error = $(name + "Error");
    const field = input.closest(".field");

    error.textContent = "";
    field.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
}

function setSubmitting(on) {
    const btn = $("signinBtn");
    btn.disabled = on;
    btn.classList.toggle("loading", on);
}

function handleLogin(e) {
    e.preventDefault();

    clearFieldError("employeeId");
    clearFieldError("password");
    setMessage("", "");

    const empId = $("employeeId").value;
    const password = $("password").value;

    /* Field-level validation first, so both problems show together */
    const idError = BTAuth.validateEmployeeId(empId);
    const pwError = BTAuth.validateLoginPassword(password);

    if (idError) setFieldError("employeeId", idError);
    if (pwError) setFieldError("password", pwError);

    if (idError || pwError) {
        (idError ? $("employeeId") : $("password")).focus();
        return;
    }

    const result = BTAuth.signIn(empId, password);

    if (!result.ok) {
        setMessage(result.message, "error");
        $("password").value = "";
        $("password").focus();
        return;
    }

    setSubmitting(true);
    setMessage("Login successful. Opening workspace...", "success");

    setTimeout(() => {
        window.location.href = "workspace.html";
    }, 450);
}

/* =========================
   BACK TO TOP
========================= */

function setupBackToTop() {
    const button = document.createElement("button");

    button.className = "back-to-top";
    button.innerHTML = "&#8593;";
    button.type = "button";
    button.setAttribute("aria-label", "Back to top");

    document.body.appendChild(button);

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
        button.classList.toggle("show", window.scrollY > 350);
    });
}

/* =========================
   INITIALIZE
========================= */

function setup() {
    setupBackToTop();

    const header = $("header");

    window.addEventListener("scroll", () => {
        header.classList.toggle("scrolled", window.scrollY > 18);
    });

    /* LOGIN BUTTONS */

    document.querySelectorAll("[data-login]").forEach(btn => {
        btn.addEventListener("click", openLogin);
    });

    $("closeLogin").addEventListener("click", closeLogin);

    $("loginOverlay").addEventListener("click", e => {
        if (e.target === $("loginOverlay")) {
            closeLogin();
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeLogin();
        }
    });

    /* PASSWORD VISIBILITY (eye icon) */

    $("togglePassword").addEventListener("click", () => {
        const password = $("password");
        const show = password.type === "password";

        password.type = show ? "text" : "password";

        const btn = $("togglePassword");
        const label = show ? "Hide password" : "Show password";

        btn.setAttribute("aria-label", label);
        btn.setAttribute("data-tip", label);
        btn.setAttribute("aria-pressed", String(show));
        $("eyeIcon").innerHTML = show ? EYE_OFF : EYE_OPEN;

        password.focus();
    });

    /* CAPS LOCK WARNING */

    $("password").addEventListener("keyup", e => {
        if (typeof e.getModifierState === "function") {
            $("capsHint").hidden = !e.getModifierState("CapsLock");
        }
    });

    $("password").addEventListener("blur", () => {
        $("capsHint").hidden = true;
    });

    /* LIVE FIELD VALIDATION */

    $("employeeId").addEventListener("input", e => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        clearFieldError("employeeId");
        setMessage("", "");
    });

    $("employeeId").addEventListener("blur", e => {
        if (e.target.value) {
            const err = BTAuth.validateEmployeeId(e.target.value);
            if (err) setFieldError("employeeId", err);
        }
    });

    $("password").addEventListener("input", () => {
        clearFieldError("password");
        setMessage("", "");
    });

    /* LOGIN FORM */

    $("loginForm").addEventListener("submit", handleLogin);

    /* Redirected here after an idle timeout or sign-out */

    const params = new URLSearchParams(window.location.search);

    if (params.get("expired") === "1") {
        $("loginOverlay").classList.add("show");
        document.body.style.overflow = "hidden";
        setMessage("Your session expired. Please sign in again.", "error");
        history.replaceState(null, "", window.location.pathname);
    } else if (params.get("login") === "1" && !hasActiveSession()) {
        openLogin();
    }

    /* MOBILE NAVIGATION */

    $("menuBtn").addEventListener("click", () => {
        $("mobileNav").classList.toggle("show");
    });

    document.querySelectorAll(".mobile-nav a").forEach(link => {
        link.addEventListener("click", () => {
            $("mobileNav").classList.remove("show");
        });
    });

    /* SCROLL REVEAL ANIMATION */

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(".reveal").forEach(el => {
        observer.observe(el);
    });

    /* CARD TILT ANIMATION */

    document.querySelectorAll(".tilt").forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();

            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            card.style.transform =
                `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg) translateY(-3px)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });

    /* HERO LOGO ANIMATION */

    const heroArt = $("heroArt");
    const heroLogo = $("heroLogo");

    heroArt.addEventListener("mousemove", e => {
        const rect = heroArt.getBoundingClientRect();

        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        heroLogo.style.animation = "none";

        heroLogo.style.transform =
            `translate(-50%,-50%) perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 8}deg) scale(1.02)`;
    });

    heroArt.addEventListener("mouseleave", () => {
        heroLogo.style.transform = "translate(-50%,-50%)";
        heroLogo.style.animation = "logoFloat 5s ease-in-out infinite";
    });
}

/* =========================
   DOM READY
========================= */

document.addEventListener("DOMContentLoaded", setup);
