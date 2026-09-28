let enrollmentInfo = { deadline: "", dates: [], timeSlots: [] };
let currentRecord = null;
let currentStudentSession = null;
let loadedOnce = false;
let countdownTimer = null;

async function initPage() {
    currentStudentSession = requireStudent();
    if (!currentStudentSession) return;

    document.getElementById("logoutBtn")?.addEventListener("click", () => logout("signedout"));
    document.getElementById("bookingForm")?.addEventListener("submit", handleBooking);
    document.getElementById("scrollScheduleBtn")?.addEventListener("click", () =>
        document.getElementById("bookingSection").scrollIntoView({ behavior: "smooth" })
    );
    document.getElementById("printTicketBtn")?.addEventListener("click", openPrintPreview);
    document.getElementById("printNowBtn")?.addEventListener("click", printTicket);
    document.getElementById("markNotificationsRead")?.addEventListener("click", markNotificationsRead);
    document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

    loadTheme();
    await autoFill();
    setLoading(true);
    await loadAll();
    startCountdown();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage);
else initPage();



function setLoading(on) {
    document.body.classList.toggle("is-loading", on);
    const submit = document.querySelector('#bookingForm button[type="submit"]');
    if (submit && on) submit.disabled = true;
    const status = document.getElementById("studentDashboardStatus");
    if (status && on && !loadedOnce) status.innerHTML = '<span class="badge bg-secondary">Loading...</span>';
    const appt = document.getElementById("studentDashboardAppointment");
    if (appt && on && !loadedOnce) appt.textContent = "Loading your appointment...";
}

function showRetry(message) {
    const alert = document.getElementById("studentSystemAlert");
    if (!alert) return;
    alert.className = "alert alert-danger d-flex justify-content-between align-items-center gap-2";
    alert.textContent = message;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-outline-danger flex-shrink-0";
    button.textContent = "Retry";
    button.addEventListener("click", async () => {
        alert.classList.add("d-none");
        setLoading(true);
        await loadAll();
    });
    alert.appendChild(button);
    alert.classList.remove("d-none");
}


async function loadAll() {
    const [info, record] = await Promise.all([loadEnrollmentInfo(), loadCurrentRecord()]);
    setLoading(false);

    if (!info.ok && !loadedOnce) {
        showRetry(info.error);
        return;
    }
    if (!record.ok && record.offline) {
        showAlert("Your appointment could not be refreshed. Showing the last known details.", "warning");
    }

    loadedOnce = true;
    renderAll();
}

async function loadEnrollmentInfo() {
    const res = await apiFetch("/api/enrollment-info");
    if (res.ok) {
        enrollmentInfo = res.data;
        return { ok: true };
    }
    return { ok: false, error: res.error, offline: res.offline };
}

async function loadCurrentRecord() {
    const res = await apiFetch(`/api/students/${encodeURIComponent(currentStudentSession.id)}`);
    if (res.ok) {
        currentRecord = res.data;
        return { ok: true };
    }
    if (res.status === 404) {
        currentRecord = null;
        return { ok: true };
    }
    return { ok: false, error: res.error, offline: res.offline };
}


async function autoFill() {
    let profile = currentStudentSession;
    if (window.JPCFirebase?.configured) {
        try {
            const firebaseUser = await window.JPCFirebase.getUserDetails();
            if (firebaseUser) profile = { ...profile, ...firebaseUser, id: firebaseUser.studentId || profile.id };
        } catch {}
    }
    currentStudentSession = profile;
    document.getElementById("studentId").value = profile.id || "";
    document.getElementById("fullName").value = profile.name || "";
    const email = document.getElementById("profileEmail");
    if (email) email.textContent = profile.email || "—";
}

function enrollmentOpen() {
    return !enrollmentInfo.deadline || new Date(`${enrollmentInfo.deadline}T23:59:59`) > new Date();
}

function formatDate(value) {
    if (!value) return "\u2014";
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function renderAll() {
    renderDates();
    renderTimeSlots();
    renderStudentDashboard();
    renderRequirements();
    renderTimeline();
    renderNotifications();
    renderTicket();
}

function renderDates() {
    const select = document.getElementById("enrollDate");
    const previous = select.value;
    select.innerHTML = '<option value="">-- Select Announced Date --</option>';

    const dates = enrollmentInfo.dates || [];
    dates.forEach((d) => {
        const option = document.createElement("option");
        option.value = d.date;
        option.textContent = `${formatDate(d.date)} \u2014 ${d.available} slots available`;
        option.disabled = d.available <= 0;
        select.appendChild(option);
    });
    if (previous && dates.some((d) => d.date === previous)) select.value = previous;

    select.onchange = renderTimeSlots;

    document.getElementById("dispStart").textContent = dates[0] ? formatDate(dates[0].date) : "Not announced";
    document.getElementById("dispDeadline").textContent = enrollmentInfo.deadline
        ? formatDate(enrollmentInfo.deadline)
        : "Not set";

    const hasActive = currentRecord && currentRecord.status !== "Cancelled";
    const closed = !enrollmentOpen() || !dates.length || hasActive;
    const submit = document.querySelector('#bookingForm button[type="submit"]');
    submit.disabled = closed;
    submit.title = hasActive
        ? "You already have an active appointment."
        : !dates.length
        ? "No enrollment dates have been announced yet."
        : !enrollmentOpen()
        ? "Enrollment is already closed."
        : "";
}

function renderTimeSlots() {
    const select = document.getElementById("timeSlot");
    if (!select) return;
    const previous = select.value;
    const chosenDate = document.getElementById("enrollDate").value;
    const dateInfo = (enrollmentInfo.dates || []).find((d) => d.date === chosenDate);
    const slots = enrollmentInfo.timeSlots || [];

    select.innerHTML = '<option value="">-- Select Time --</option>';
    slots.forEach((time) => {
        const option = document.createElement("option");
        option.value = time;
        const left = dateInfo?.slotAvailability?.[time];
        option.textContent = dateInfo ? `${time} \u2014 ${left} left` : time;
        option.disabled = dateInfo ? left <= 0 : false;
        select.appendChild(option);
    });
    if (previous && slots.includes(previous)) select.value = previous;
}

async function handleBooking(e) {
    e.preventDefault();
    const submit = e.target.querySelector('button[type="submit"]');

    const dept = document.getElementById("program").value;
    const level = document.getElementById("yearLevel").value;
    const date = document.getElementById("enrollDate").value;
    const time = document.getElementById("timeSlot").value;
    const phone = document.getElementById("contactNo").value.replace(/[-\s]/g, "");

    if (!dept || !level) return showAlert("Please choose your program and year level.", "warning");
    if (!date) return showAlert("Please select an announced enrollment date.", "warning");
    if (!time) return showAlert("Please select a time slot.", "warning");
    if (!/^09\d{9}$/.test(phone)) return showAlert("Please enter a valid Philippine mobile number (09XXXXXXXXX).", "warning");
    if (currentRecord && currentRecord.status !== "Cancelled") {
        return showAlert("You already have an active appointment. Check your ticket below.", "warning");
    }

    const originalHtml = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = "Submitting...";

    const res = await apiFetch("/api/students", {
        method: "POST",
        body: JSON.stringify({ name: currentStudentSession.name, dept, level, date, time, phone }),
    });

    submit.disabled = false;
    submit.innerHTML = originalHtml;

    if (!res.ok) {
        showAlert(res.error, "danger");
        await loadAll();
        return;
    }

    e.target.reset();
    autoFill();
    showAlert("Appointment submitted. Your digital ticket is now available below.", "success");
    await loadAll();
}

function renderStudentDashboard() {
    const record = currentRecord;
    const display = currentStudentSession.name || "Student";
    const first = display.includes(",") ? display.split(",")[1].trim().split(" ")[0] : display.trim().split(" ")[0];
    const initials =
        display.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "S";

    document.getElementById("studentNameDisplay").textContent = display;
    document.getElementById("welcomeStudentName").textContent = first || "Student";
    document.getElementById("profileStudentName").textContent = display;
    document.getElementById("profileStudentId").textContent = currentStudentSession.id;
    document.getElementById("profileEmail").textContent = currentStudentSession.email || "Local student login";
    document.getElementById("profileDeadline").textContent = formatDate(enrollmentInfo.deadline);
    document.getElementById("profileAvatar").textContent = initials;
    document.getElementById("studentAvatar").textContent = initials[0];

    if (!record) {
        document.getElementById("studentDashboardStatus").innerHTML = '<span class="badge bg-secondary">No Appointment</span>';
        document.getElementById("studentDashboardAppointment").textContent = "No appointment yet";
        document.getElementById("studentDashboardProgram").textContent = "Not yet provided";
        document.getElementById("requirementProgress").textContent = "0% Complete";
        return;
    }

    const cls = { Pending: "warning", Enrolled: "success", Completed: "primary", Cancelled: "danger" }[record.status] || "secondary";
    const badge = document.getElementById("studentDashboardStatus");
    badge.innerHTML = "";
    const span = document.createElement("span");
    span.className = `badge bg-${cls}`;
    span.textContent = record.status;
    badge.appendChild(span);

    document.getElementById("studentDashboardAppointment").textContent = `${formatDate(record.date)} \u00b7 ${record.time}`;
    document.getElementById("studentDashboardProgram").textContent = `${record.dept} \u00b7 ${record.level}`;
    document.getElementById("program").value = record.dept;
    document.getElementById("yearLevel").value = record.level;
    document.getElementById("contactNo").value = record.phone || "";
}

function renderRequirements() {
    const box = document.getElementById("requirementsList");
    const record = currentRecord;
    const req = record?.requirements || {
        studentId: false, registration: false, birthCertificate: false,
        clearance: false, grades: false, other: false,
    };
    const items = [
        ["studentId", "Student ID / School ID"],
        ["registration", "Registration Form"],
        ["birthCertificate", "Birth Certificate"],
        ["clearance", "Clearance"],
        ["grades", "Previous Grades / Report Card"],
        ["other", "Other school requirements"],
    ];
    const done = items.filter(([key]) => req[key]).length;
    document.getElementById("requirementProgress").textContent = `${Math.round((done / items.length) * 100)}% Complete`;

    box.innerHTML = "";
    items.forEach(([key, label]) => {
        const wrapper = document.createElement("label");
        wrapper.className = "requirement-item";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.dataset.req = key;
        input.checked = !!req[key];
        input.disabled = !record;

        const text = document.createElement("span");
        text.textContent = label;

        const icon = document.createElement("i");
        icon.className = req[key] ? "bi bi-check-circle-fill text-success" : "bi bi-circle";

        input.addEventListener("change", async () => {
            if (!currentRecord) return;
            input.disabled = true;
            const res = await apiFetch(`/api/students/${encodeURIComponent(currentRecord.id)}`, {
                method: "PUT",
                body: JSON.stringify({ requirements: { [key]: input.checked } }),
            });
            if (res.ok) {
                currentRecord = res.data;
            } else {
                showAlert(res.error, "danger");
                input.checked = !input.checked;
            }
            renderRequirements();
        });

        wrapper.append(input, text, icon);
        box.appendChild(wrapper);
    });
}

function renderTimeline() {
    const box = document.getElementById("statusTimeline");
    const record = currentRecord;
    const steps = ["Appointment Created", "Pending Verification", "Approved / Enrolled", "Enrollment Completed"];
    const active = record ? { Pending: 1, Enrolled: 3, Completed: 4, Cancelled: 1 }[record.status] || 1 : 0;

    box.innerHTML = "";
    steps.forEach((label, i) => {
        const step = document.createElement("div");
        step.className = `timeline-step ${i < active ? "done" : ""} ${i === active - 1 ? "current" : ""}`.trim();

        const dot = document.createElement("span");
        dot.className = "timeline-dot";
        if (i < active) dot.innerHTML = '<i class="bi bi-check"></i>';
        else dot.textContent = String(i + 1);

        const body = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = label;
        const note = document.createElement("small");
        note.textContent =
            i === 0 && record ? `${formatDate(record.date)} \u00b7 ${record.time}`
            : i === 1 && record ? "Awaiting admin review"
            : i === 2 && record && record.status !== "Pending" ? "Appointment approved"
            : "Complete this step after admin confirmation";

        body.append(title, note);
        step.append(dot, body);
        box.appendChild(step);
    });
}

function renderNotifications() {
    const box = document.getElementById("notificationList");
    const record = currentRecord;
    box.innerHTML = "";

    if (!record || !record.notifications?.length) {
        box.innerHTML = '<div class="empty-notification"><i class="bi bi-bell-slash"></i><span>No notifications yet.</span></div>';
        return;
    }

    record.notifications.slice(0, 6).forEach((n) => {
        const item = document.createElement("div");
        item.className = `notification-item ${n.read ? "read" : ""}`.trim();

        const dot = document.createElement("span");
        dot.className = `notification-dot ${n.type || "info"}`;

        const body = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = n.title;
        const message = document.createElement("p");
        message.textContent = n.message;
        const when = document.createElement("small");
        when.textContent = new Date(n.createdAt).toLocaleString("en-PH");

        body.append(title, message, when);
        item.append(dot, body);
        box.appendChild(item);
    });
}

async function markNotificationsRead() {
    if (!currentRecord || !currentRecord.notifications?.length) return;
    const res = await apiFetch(`/api/students/${encodeURIComponent(currentRecord.id)}`, {
        method: "PUT",
        body: JSON.stringify({ markNotificationsRead: true }),
    });
    if (res.ok) currentRecord = res.data;
    else showAlert(res.error, "danger");
    renderNotifications();
}

function renderTicket() {
    const record = currentRecord;
    const empty = document.getElementById("ticketEmpty");
    const card = document.getElementById("ticketCard");
    const actions = document.getElementById("ticketActions");

    if (!record) {
        empty.classList.remove("d-none");
        card.classList.add("d-none");
        actions.classList.add("d-none");
        return;
    }

    empty.classList.add("d-none");
    card.classList.remove("d-none");
    actions.classList.remove("d-none");

    document.getElementById("ticketNo").textContent = record.appointmentNo;
    document.getElementById("ticketStudent").textContent = record.name;
    document.getElementById("ticketId").textContent = record.id;
    document.getElementById("ticketDate").textContent = formatDate(record.date);
    document.getElementById("ticketTime").textContent = record.time;
    document.getElementById("ticketStatus").textContent = record.status;
    document.getElementById("ticketProgram").textContent = record.dept;

    const qr = document.getElementById("qrcode");
    qr.innerHTML = "";
    if (window.QRCode) {
        new QRCode(qr, { text: `JPC-ENROLLSMART|${record.appointmentNo}`, width: 120, height: 120 });
        document.getElementById("qrFallback").textContent = "Scan to verify appointment";
    } else {
        document.getElementById("qrFallback").textContent =
            "QR code unavailable offline. Your appointment number above is still valid.";
    }
}

function openPrintPreview() {
    if (!currentRecord) return;
    document.getElementById("printPreview").innerHTML = "";
    document.getElementById("printPreview").appendChild(buildSlip(currentRecord));
    new bootstrap.Modal(document.getElementById("printPreviewModal")).show();
}

function buildSlip(record) {
    const wrap = document.createElement("div");
    wrap.className = "print-slip";

    const head = document.createElement("div");
    head.className = "print-head";
    const brand = document.createElement("div");
    const brandName = document.createElement("strong");
    brandName.textContent = "JPC ENROLLSMART";
    const brandSub = document.createElement("small");
    brandSub.textContent = "Enrollment Appointment System";
    brand.append(brandName, brandSub);
    const no = document.createElement("span");
    no.textContent = record.appointmentNo;
    head.append(brand, no);

    const title = document.createElement("h2");
    title.textContent = "ENROLLMENT APPOINTMENT SLIP";

    const grid = document.createElement("div");
    grid.className = "print-grid";
    [
        ["Student Name", record.name],
        ["Student ID", record.id],
        ["Program / Level", `${record.dept} \u00b7 ${record.level}`],
        ["Appointment", `${formatDate(record.date)} \u00b7 ${record.time}`],
        ["Contact", record.phone || "\u2014"],
        ["Status", record.status],
    ].forEach(([label, value]) => {
        const cell = document.createElement("div");
        const small = document.createElement("small");
        small.textContent = label;
        const strong = document.createElement("strong");
        strong.textContent = value;
        cell.append(small, strong);
        grid.appendChild(cell);
    });

    const note = document.createElement("div");
    note.className = "print-note";
    note.textContent = "Please bring your student ID and required enrollment documents. Keep this appointment slip for verification.";

    wrap.append(head, title, grid, note);
    return wrap;
}

function printTicket() {
    if (!currentRecord) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
        showAlert("Your browser blocked the print window. Allow pop-ups for this site and try again.", "warning");
        return;
    }
    win.document.write(
        '<html><head><title>Appointment Slip</title><style>' +
        'body{font-family:Arial,sans-serif;padding:40px;color:#17212b}' +
        '.print-head{display:flex;justify-content:space-between;border-bottom:2px solid #17212b;padding-bottom:16px}' +
        '.print-head small{display:block;color:#667}' +
        '.print-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:28px 0}' +
        '.print-grid div{border:1px solid #ddd;padding:14px;border-radius:8px}' +
        '.print-grid small{display:block;color:#777;text-transform:uppercase;font-size:11px}' +
        '.print-grid strong{display:block;margin-top:5px}' +
        '.print-note{padding:16px;background:#f5f7f9;border-radius:8px}' +
        '</style></head><body></body></html>'
    );
    win.document.close();
    win.document.title = `${currentRecord.appointmentNo} - JPC ENROLLSMART`;
    win.document.body.appendChild(buildSlip(currentRecord));
    win.focus();
    win.print();
}

function startCountdown() {
    const timer = document.getElementById("countdownTimer");
    if (countdownTimer) clearInterval(countdownTimer);

    function tick() {
        if (!enrollmentInfo.deadline) {
            timer.textContent = "No deadline set";
            return;
        }
        const diff = new Date(`${enrollmentInfo.deadline}T23:59:59`) - new Date();
        if (diff <= 0) {
            timer.textContent = "Enrollment closed";
            return;
        }
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor(diff / 3600000) % 24;
        const minutes = Math.floor(diff / 60000) % 60;
        timer.textContent = `${days}d ${hours}h ${minutes}m remaining`;
    }

    tick();
    countdownTimer = setInterval(tick, 60000);
}

function showAlert(message, type = "info") {
    const alert = document.getElementById("studentSystemAlert");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.classList.remove("d-none");
    setTimeout(() => alert.classList.add("d-none"), 6000);
}

function toggleTheme() {
    const dark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("jpc_enrollsmart_theme", dark ? "dark" : "light");
    swapThemeIcon(dark);
}
function loadTheme() {
    const dark = localStorage.getItem("jpc_enrollsmart_theme") === "dark";
    document.body.classList.toggle("dark-mode", dark);
    swapThemeIcon(dark);
}
function swapThemeIcon(dark) {
    const icon = document.querySelector("#themeToggle i");
    if (!icon) return;
    const next = document.createElement("i");
    next.className = dark ? "bi bi-sun" : "bi bi-moon-stars";
    icon.parentNode.replaceChild(next, icon);
}
