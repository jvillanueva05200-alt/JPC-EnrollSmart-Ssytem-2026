function initPage() {
    const session = getSession();
    if (session?.type === "admin" && session.token) {
        location.href = "admin.html";
        return;
    }

    document.getElementById("adminLoginForm")?.addEventListener("submit", handleAdminLogin);
    const reason = new URLSearchParams(location.search).get("reason");
    if (reason === "expired") showAdminLoginError("Your admin session expired. Please log in again.");
    if (reason === "signedout") showAdminLoginError("You have been signed out.");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage);
else initPage();


function showAdminLoginError(message) {
    const alert = document.getElementById("adminLoginAlert");
    if (!alert) return;
    alert.className = "alert alert-danger";
    alert.textContent = message;
}

function clearAdminLoginError() {
    const alert = document.getElementById("adminLoginAlert");
    if (!alert) return;
    alert.className = "alert d-none";
    alert.textContent = "";
}

async function handleAdminLogin(event) {
    event.preventDefault();
    clearAdminLoginError();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    const button = document.getElementById("adminLoginBtn");

    if (!username || !password) {
        showAdminLoginError("Please enter your admin username and password.");
        return;
    }

    button.disabled = true;
    button.innerHTML = 'Signing in... <i class="bi bi-arrow-repeat ms-2"></i>';

    try {
        const response = await fetch(`${ENROLLSMART_CONFIG.BACKEND_URL}/api/auth/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            showAdminLoginError(data.error || "Invalid admin credentials.");
            return;
        }

        setAdminSession(data.username, data.token);
        location.href = "admin.html";
    } catch {
        showAdminLoginError("Could not complete admin login. Please try again.");
    } finally {
        button.disabled = false;
        button.innerHTML = 'Admin Log in <i class="bi bi-arrow-right ms-2"></i>';
    }
}
