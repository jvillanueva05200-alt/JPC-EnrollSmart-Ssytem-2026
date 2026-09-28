document.addEventListener("DOMContentLoaded", async () => {
    const studentForm = document.getElementById("studentLoginForm");
    const registerForm = document.getElementById("studentRegisterForm");

    document.getElementById("showRegisterLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        studentForm.classList.add("d-none");
        registerForm.classList.remove("d-none");
        clearLoginError();
    });

    document.getElementById("showLoginLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        registerForm.classList.add("d-none");
        studentForm.classList.remove("d-none");
        clearLoginError();
    });

    studentForm?.addEventListener("submit", handleStudentLogin);
    registerForm?.addEventListener("submit", handleStudentRegister);

    const firebaseReady = await checkFirebaseServer();
    const googleButton = document.getElementById("gsiButtonContainer");
    if (googleButton && firebaseReady && window.JPCFirebase?.configured) {
        googleButton.innerHTML = '<button type="button" id="firebaseGoogleBtn" class="google-login-btn"><span class="google-g">G</span> Continue with Google</button>';
        document.getElementById("firebaseGoogleBtn")?.addEventListener("click", handleGoogleLogin);
        document.getElementById("gsiStatusText")?.replaceChildren(document.createTextNode("Sign in securely with your Google account."));
    } else if (googleButton) {
        googleButton.remove();
        document.getElementById("gsiStatusText")?.remove();
        document.querySelector(".divider")?.remove();
    }

    const reason = new URLSearchParams(location.search).get("reason");
    if (reason === "expired") showLoginError("Your session expired. Please log in again.");
    if (reason === "signedout") showLoginError("You have been signed out.");
});

async function checkFirebaseServer() {
    try {
        const response = await fetch(`${ENROLLSMART_CONFIG.BACKEND_URL}/api/config`, { cache: "no-store" });
        const data = await response.json();
        ENROLLSMART_CONFIG.SERVER_FEATURES = data;
        return Boolean(data.firebaseAuth);
    } catch {
        ENROLLSMART_CONFIG.SERVER_FEATURES = { firebaseAuth: false };
        return false;
    }
}

function clearLoginError() {
    const a = document.getElementById("loginAlert");
    a.className = "alert d-none";
    a.textContent = "";
}

function showLoginError(message) {
    const a = document.getElementById("loginAlert");
    a.className = "alert alert-danger";
    a.textContent = message;
}

function busy(button, on, labelWhenBusy = "Please wait...") {
    if (!button) return;
    if (on) {
        button.dataset.originalHtml = button.innerHTML;
        button.disabled = true;
        button.textContent = labelWhenBusy;
    } else {
        button.disabled = false;
        if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
}

const STUDENT_ID_RE = /^\d{4}-\d{4,6}$/;

async function postJSON(path, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ENROLLSMART_CONFIG.REQUEST_TIMEOUT_MS || 15000);
    try {
        const res = await fetch(`${ENROLLSMART_CONFIG.BACKEND_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, status: 0, data: { error: err.name === "AbortError" ? "The server is taking too long to respond." : "Could not reach the ENROLLSMART server." } };
    } finally {
        clearTimeout(timeout);
    }
}

async function handleStudentLogin(e) {
    e.preventDefault();
    clearLoginError();
    const id = document.getElementById("loginStudentId").value.trim();
    const password = document.getElementById("loginStudentPassword").value;
    if (!STUDENT_ID_RE.test(id)) return showLoginError("Student ID should look like 2026-00123.");
    if (!password) return showLoginError("Please enter your password.");

    const button = e.target.querySelector('button[type="submit"]');
    busy(button, true, "Signing in...");
    try {
        let data;
        if (window.ENROLLSMART_CONFIG.SERVER_FEATURES?.firebaseAuth && window.JPCFirebase?.configured) {
            data = await window.JPCFirebase.signInStudent(id, password);
        } else {
            const result = await postJSON("/api/auth/student", { studentId: id, password });
            if (!result.ok) throw new Error(result.data.error || "Could not sign in. Please try again.");
            data = result.data;
        }
        setStudentSession({ id: data.id, name: data.name, email: data.email, provider: data.provider, token: data.token });
        location.href = "student.html";
    } catch (err) {
        showLoginError(err.message || "Could not sign in. Please try again.");
    } finally {
        busy(button, false);
    }
}

async function handleStudentRegister(e) {
    e.preventDefault();
    clearLoginError();
    const id = document.getElementById("regStudentId").value.trim();
    const name = document.getElementById("regStudentName").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regPasswordConfirm").value;
    if (!STUDENT_ID_RE.test(id)) return showLoginError("Student ID should look like 2026-00123.");
    if (name.length < 2) return showLoginError("Please enter your full name.");
    if (password.length < 8) return showLoginError("Password must be at least 8 characters.");
    if (password !== confirm) return showLoginError("The two passwords do not match.");

    const button = e.target.querySelector('button[type="submit"]');
    busy(button, true, "Creating account...");
    try {
        let data;
        if (window.ENROLLSMART_CONFIG.SERVER_FEATURES?.firebaseAuth && window.JPCFirebase?.configured) {
            data = await window.JPCFirebase.registerStudent(id, name, password);
        } else {
            const result = await postJSON("/api/auth/student/register", { studentId: id, name, password });
            if (!result.ok) throw new Error(result.data.error || "Could not create your account. Please try again.");
            data = result.data;
        }
        setStudentSession({ id: data.id, name: data.name, email: data.email, provider: data.provider, token: data.token });
        location.href = "student.html";
    } catch (err) {
        showLoginError(err.message || "Could not create your account. Please try again.");
    } finally {
        busy(button, false);
    }
}

async function handleGoogleLogin() {
    clearLoginError();
    const button = document.getElementById("firebaseGoogleBtn");
    busy(button, true, "Connecting to Google...");
    try {
        if (!window.JPCFirebase?.configured || !window.ENROLLSMART_CONFIG.SERVER_FEATURES?.firebaseAuth) throw new Error("Google sign-in is not available on this server.");
        const data = await window.JPCFirebase.signInGoogle();
        setStudentSession({ id: data.id, name: data.name, email: data.email, provider: "google", token: data.token });
        location.href = "student.html";
    } catch (err) {
        showLoginError(err.message || "Google sign-in failed.");
    } finally {
        busy(button, false);
    }
}
