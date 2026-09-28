const AUTH_KEY = "jpc_enrollsmart_auth";

function setStudentSession(student) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
        type: "student",
        id: String(student.id).trim(),
        name: String(student.name || "").trim(),
        email: student.email || "",
        provider: student.provider || "local",
        token: student.token || null,
        loginAt: Date.now(),
    }));
}

function setAdminSession(username = "admin", token = null) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ type: "admin", username, token, loginAt: Date.now() }));
}

function getSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
}

function getAuthToken() {
    return getSession()?.token || null;
}

function requireStudent() {
    const s = getSession();
    if (!s || s.type !== "student") { location.href = "login.html"; return null; }
    return s;
}

function requireAdmin() {
    const s = getSession();
    if (!s || s.type !== "admin") { location.href = "admin-login.html"; return null; }
    return s;
}

async function apiFetch(path, options = {}) {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ENROLLSMART_CONFIG.REQUEST_TIMEOUT_MS || 15000);

    try {
        const res = await fetch(`${ENROLLSMART_CONFIG.BACKEND_URL}${path}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        if (res.status === 401) {
            logout("expired");
            return { ok: false, status: 401, error: "Your session has expired. Please log in again." };
        }

        if (res.status === 204) return { ok: true, status: 204, data: null };

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { ok: false, status: res.status, data, error: data.error || "Something went wrong. Please try again." };
        }
        return { ok: true, status: res.status, data };
    } catch (err) {
        const timedOut = err.name === "AbortError";
        return {
            ok: false,
            status: 0,
            offline: true,
            timedOut,
            error: timedOut
                ? "The server is taking too long to respond. Check your connection and try again."
                : "Could not reach the ENROLLSMART server. Check your connection and try again.",
        };
    } finally {
        clearTimeout(timeout);
    }
}


function logout(reason = "signedout") {
    const current = getSession();
    localStorage.removeItem(AUTH_KEY);
    location.href = current?.type === "admin" ? `admin-login.html?reason=${encodeURIComponent(reason)}` : `login.html?reason=${encodeURIComponent(reason)}`;
}
