let dates = [];
let deadline = "";
let masterlist = { students: [], total: 0, page: 1, pageSize: 25 };
let programOptions = [];
let searchDebounce = null;

async function initPage() {
    if (!requireAdmin()) return;

    document.getElementById("adminLogoutBtn")?.addEventListener("click", () => logout("signedout"));
    document.getElementById("settingsForm")?.addEventListener("submit", saveSettings);
    document.getElementById("dateForm")?.addEventListener("submit", addDate);
    document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
    document.getElementById("resetDataBtn")?.addEventListener("click", resetAllData);
    document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

    document.getElementById("adminSearch")?.addEventListener("input", () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => loadMasterlist(1), 300);
    });
    document.getElementById("statusFilter")?.addEventListener("change", () => loadMasterlist(1));
    document.getElementById("programFilter")?.addEventListener("change", () => loadMasterlist(1));

    document.getElementById("masterlistContainer")?.addEventListener("click", onMasterlistClick);
    document.getElementById("masterlistContainer")?.addEventListener("change", onMasterlistChange);
    document.getElementById("announcedDatesContainer")?.addEventListener("click", onDatesClick);

    loadTheme();
    await refreshAll();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage);
else initPage();



function setBusy(on) {
    document.body.classList.toggle("is-loading", on);
}

async function refreshAll() {
    setBusy(true);
    const [settings, stats, activity] = await Promise.all([
        loadSchedule(),
        loadStats(),
        loadActivity(),
    ]);
    await loadMasterlist(masterlist.page);
    setBusy(false);

    if (!settings.ok) {
        showNotification(settings.error, "danger");
        showBlockingError(settings.error);
    }
    if (!stats.ok || !activity.ok) showNotification("Some dashboard panels could not be loaded.", "danger");
}

function showBlockingError(message) {
    const box = document.getElementById("masterlistContainer");
    if (!box) return;
    box.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "text-center text-muted py-5";
    const text = document.createElement("p");
    text.textContent = message;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-sm btn-outline-primary";
    retry.textContent = "Retry";
    retry.addEventListener("click", refreshAll);
    wrap.append(text, retry);
    box.appendChild(wrap);
}


async function loadSchedule() {
    const [datesRes, infoRes] = await Promise.all([apiFetch("/api/dates"), apiFetch("/api/enrollment-info")]);
    if (!datesRes.ok) return { ok: false, error: datesRes.error };
    dates = datesRes.data;
    deadline = infoRes.ok ? infoRes.data.deadline : deadline;
    const input = document.getElementById("adminDeadline");
    if (input) input.value = deadline || "";
    renderDates();
    return { ok: true };
}

async function loadStats() {
    const res = await apiFetch("/api/analytics");
    if (!res.ok) return { ok: false, error: res.error };
    const a = res.data;
    document.getElementById("statTotal").textContent = a.total;
    document.getElementById("statPending").textContent = a.pending;
    document.getElementById("statEnrolled").textContent = a.enrolled;
    document.getElementById("statSlots").textContent = a.availableSlots;
    renderAnalytics(a);
    programOptions = Object.keys(a.programCounts || {}).filter(Boolean).sort();
    populateProgramFilter();
    return { ok: true };
}

async function loadActivity() {
    const res = await apiFetch("/api/activity");
    if (!res.ok) return { ok: false, error: res.error };
    renderActivity(res.data);
    return { ok: true };
}

async function loadMasterlist(page = 1) {
    const q = document.getElementById("adminSearch")?.value.trim() || "";
    const status = document.getElementById("statusFilter")?.value || "";
    const program = document.getElementById("programFilter")?.value || "";

    const params = new URLSearchParams({ page: String(page), pageSize: String(masterlist.pageSize) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (program) params.set("program", program);

    const res = await apiFetch(`/api/students?${params.toString()}`);
    if (!res.ok) {
        showNotification(res.error, "danger");
        return;
    }
    masterlist = { ...res.data, pageSize: masterlist.pageSize };
    renderMasterlist();
}


async function saveSettings(e) {
    e.preventDefault();
    const value = document.getElementById("adminDeadline").value;
    if (!value) return showNotification("Please select an enrollment deadline.", "warning");

    const res = await apiFetch("/api/settings/deadline", { method: "PUT", body: JSON.stringify({ deadline: value }) });
    if (!res.ok) return showNotification(res.error, "danger");

    deadline = res.data.deadline;
    showNotification("Enrollment deadline updated.", "success");
}


async function addDate(e) {
    e.preventDefault();
    const date = document.getElementById("adminDate").value;
    const maxSlots = Number(document.getElementById("adminSlots").value);
    if (!date || !Number.isFinite(maxSlots) || maxSlots <= 0) {
        return showNotification("Enter a valid date and capacity.", "warning");
    }

    const res = await apiFetch("/api/dates", { method: "POST", body: JSON.stringify({ date, maxSlots }) });
    if (!res.ok) return showNotification(res.error, "warning");

    document.getElementById("dateForm").reset();
    showNotification("New enrollment date announced.", "success");
    await loadSchedule();
    await loadStats();
}

function renderDates() {
    const box = document.getElementById("announcedDatesContainer");
    box.innerHTML = "";

    if (!dates.length) {
        const empty = document.createElement("div");
        empty.className = "text-muted small";
        empty.textContent = "No dates configured.";
        box.appendChild(empty);
        return;
    }

    dates.forEach((d) => {
        const row = document.createElement("div");
        row.className = "schedule-item";

        const info = document.createElement("div");
        const label = document.createElement("strong");
        label.textContent = d.date;
        const badge = document.createElement("span");
        badge.className = `badge ${d.status === "Announced" ? "bg-success" : "bg-secondary"} ms-1`;
        badge.textContent = d.status;
        const counts = document.createElement("small");
        counts.className = "d-block text-muted";
        counts.textContent = `${d.booked}/${d.maxSlots} booked \u00b7 ${d.available} available`;
        info.append(label, badge, counts);

        const actions = document.createElement("div");
        actions.className = "d-flex gap-1";
        actions.append(
            iconButton("btn-outline-warning", "bi-eye", "toggle", d.date, `Toggle ${d.date}`),
            iconButton("btn-outline-danger", "bi-trash", "delete", d.date, `Delete ${d.date}`)
        );

        row.append(info, actions);
        box.appendChild(row);
    });
}

function iconButton(variant, icon, action, value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-sm ${variant}`;
    button.dataset.action = action;
    button.dataset.value = value;
    button.setAttribute("aria-label", label);
    button.title = label;
    const i = document.createElement("i");
    i.className = `bi ${icon}`;
    button.appendChild(i);
    return button;
}

async function onDatesClick(e) {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const date = button.dataset.value;

    if (button.dataset.action === "toggle") {
        const res = await apiFetch(`/api/dates/${encodeURIComponent(date)}/toggle`, { method: "PUT" });
        if (!res.ok) return showNotification(res.error, "danger");
        showNotification(`Date is now ${res.data.status}.`, "info");
    }

    if (button.dataset.action === "delete") {
        const affected = dates.find((d) => d.date === date)?.booked || 0;
        const message = affected
            ? `There are ${affected} appointments on ${date}. Delete this date anyway?`
            : `Delete ${date}?`;
        if (!confirm(message)) return;
        const res = await apiFetch(`/api/dates/${encodeURIComponent(date)}`, { method: "DELETE" });
        if (!res.ok) return showNotification(res.error, "danger");
        showNotification("Enrollment date removed.", "danger");
    }

    await loadSchedule();
    await loadStats();
}


function populateProgramFilter() {
    const select = document.getElementById("programFilter");
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "All Programs";
    select.appendChild(all);
    programOptions.forEach((program) => {
        const option = document.createElement("option");
        option.value = program;
        option.textContent = program;
        select.appendChild(option);
    });
    select.value = programOptions.includes(current) ? current : "";
}

function statusColor(status) {
    return { Pending: "warning", Enrolled: "success", Completed: "primary", Cancelled: "danger" }[status] || "secondary";
}

function renderMasterlist() {
    const box = document.getElementById("masterlistContainer");
    box.innerHTML = "";

    if (!masterlist.students.length) {
        const empty = document.createElement("div");
        empty.className = "text-center text-muted py-5";
        const icon = document.createElement("i");
        icon.className = "bi bi-inbox fs-1";
        const text = document.createElement("p");
        text.className = "mt-2";
        text.textContent = "No records found.";
        empty.append(icon, text);
        box.appendChild(empty);
        return;
    }

    masterlist.students.forEach((s) => box.appendChild(masterlistRow(s)));
    box.appendChild(paginationBar());
}

function masterlistRow(s) {
    const row = document.createElement("div");
    row.className = "masterlist-item enhanced-record";

    const info = document.createElement("div");
    info.className = "student-info";

    const top = document.createElement("div");
    top.className = "d-flex align-items-center gap-2";
    const avatar = document.createElement("div");
    avatar.className = "mini-avatar";
    avatar.textContent = (s.name || "S").charAt(0);
    const names = document.createElement("div");
    const name = document.createElement("h6");
    name.textContent = s.name;
    const meta = document.createElement("small");
    meta.textContent = `${s.id} \u00b7 ${s.dept} \u00b7 ${s.level}`;
    names.append(name, meta);
    top.append(avatar, names);

    const when = document.createElement("div");
    when.className = "appointment-time";
    const calIcon = document.createElement("i");
    calIcon.className = "bi bi-calendar3";
    const whenText = document.createElement("span");
    whenText.textContent = ` ${s.date} \u00b7 ${s.time} `;
    const badge = document.createElement("span");
    badge.className = `badge bg-${statusColor(s.status)} ms-1`;
    badge.textContent = s.status;
    when.append(calIcon, whenText, badge);

    info.append(top, when);

    const actions = document.createElement("div");
    actions.className = "student-actions";

    const view = document.createElement("button");
    view.type = "button";
    view.className = "btn btn-sm btn-outline-primary";
    view.dataset.action = "view";
    view.dataset.id = s.id;
    view.textContent = "View";

    const select = document.createElement("select");
    select.className = "form-select form-select-sm";
    select.dataset.action = "status";
    select.dataset.id = s.id;
    select.setAttribute("aria-label", `Change status for ${s.id}`);
    ["Pending", "Enrolled", "Completed", "Cancelled"].forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        option.selected = s.status === status;
        select.appendChild(option);
    });

    const remove = iconButton("btn-outline-danger", "bi-trash", "delete", s.id, `Delete record ${s.id}`);
    remove.dataset.id = s.id;

    actions.append(view, select, remove);
    row.append(info, actions);
    return row;
}

function paginationBar() {
    const pages = Math.max(1, Math.ceil(masterlist.total / masterlist.pageSize));
    const bar = document.createElement("div");
    bar.className = "d-flex justify-content-between align-items-center gap-2 pt-3";

    const label = document.createElement("small");
    label.className = "text-muted";
    label.textContent = `Page ${masterlist.page} of ${pages} \u00b7 ${masterlist.total} records`;

    const buttons = document.createElement("div");
    buttons.className = "d-flex gap-1";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn btn-sm btn-outline-secondary";
    prev.textContent = "Previous";
    prev.disabled = masterlist.page <= 1;
    prev.addEventListener("click", () => loadMasterlist(masterlist.page - 1));

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn-sm btn-outline-secondary";
    next.textContent = "Next";
    next.disabled = masterlist.page >= pages;
    next.addEventListener("click", () => loadMasterlist(masterlist.page + 1));

    buttons.append(prev, next);
    bar.append(label, buttons);
    return bar;
}

async function onMasterlistClick(e) {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;

    if (button.dataset.action === "view") return viewStudent(id);

    if (button.dataset.action === "delete") {
        const student = masterlist.students.find((s) => s.id === id);
        if (!student || !confirm(`Remove ${student.name}'s record?`)) return;
        const res = await apiFetch(`/api/students/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) return showNotification(res.error, "danger");
        showNotification("Student record removed.", "danger");
        await loadMasterlist(masterlist.page);
        await loadStats();
    }
}

async function onMasterlistChange(e) {
    const select = e.target.closest('select[data-action="status"]');
    if (!select) return;

    const id = select.dataset.id;
    const status = select.value;
    if (!["Pending", "Enrolled", "Completed", "Cancelled"].includes(status)) return;

    select.disabled = true;
    const res = await apiFetch(`/api/students/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status }) });
    select.disabled = false;

    if (!res.ok) {
        showNotification(res.error, "danger");
        await loadMasterlist(masterlist.page);
        return;
    }
    showNotification("Student status updated.", "info");
    await loadMasterlist(masterlist.page);
    await loadStats();
    await loadActivity();
}

async function viewStudent(id) {
    const res = await apiFetch(`/api/students/${encodeURIComponent(id)}`);
    if (!res.ok) return showNotification(res.error, "danger");
    const s = res.data;

    const body = document.getElementById("studentDetailBody");
    body.innerHTML = "";

    const avatar = document.createElement("div");
    avatar.className = "detail-avatar";
    avatar.textContent = (s.name || "S").charAt(0);

    const name = document.createElement("h5");
    name.className = "text-center mt-2";
    name.textContent = s.name;

    const email = document.createElement("p");
    email.className = "text-center text-muted small";
    email.textContent = s.email || "No linked email";

    const grid = document.createElement("div");
    grid.className = "detail-grid";
    [
        ["Student ID", s.id],
        ["Appointment", s.appointmentNo || "\u2014"],
        ["Date / Time", `${s.date} \u00b7 ${s.time}`],
        ["Program", `${s.dept} \u00b7 ${s.level}`],
        ["Contact", s.phone || "\u2014"],
        ["Status", s.status],
    ].forEach(([label, value]) => {
        const cell = document.createElement("div");
        const small = document.createElement("small");
        small.textContent = label;
        const strong = document.createElement("strong");
        strong.textContent = value;
        cell.append(small, strong);
        grid.appendChild(cell);
    });

    const hr = document.createElement("hr");
    const heading = document.createElement("h6");
    heading.textContent = "Requirements";

    const reqs = document.createElement("div");
    reqs.className = "small";
    Object.entries(s.requirements || {}).forEach(([key, value]) => {
        const line = document.createElement("div");
        line.className = "d-flex justify-content-between py-1";
        const label = document.createElement("span");
        label.textContent = prettyRequirement(key);
        const state = document.createElement("span");
        state.textContent = value ? "\u2713 Complete" : "\u25cb Pending";
        line.append(label, state);
        reqs.appendChild(line);
    });

    body.append(avatar, name, email, grid, hr, heading, reqs);
    new bootstrap.Modal(document.getElementById("studentDetailModal")).show();
}

function prettyRequirement(key) {
    return {
        studentId: "Student ID",
        registration: "Registration Form",
        birthCertificate: "Birth Certificate",
        clearance: "Clearance",
        grades: "Previous Grades",
        other: "Other Requirements",
    }[key] || key;
}


function renderAnalytics(analytics) {
    const statusBox = document.getElementById("statusAnalytics");
    statusBox.innerHTML = "";
    const total = Math.max(1, analytics.total);

    Object.entries(analytics.statusCounts || {}).forEach(([status, count]) => {
        const row = document.createElement("div");
        row.className = "analytics-row";

        const head = document.createElement("div");
        head.className = "d-flex justify-content-between";
        const label = document.createElement("span");
        label.textContent = status;
        const value = document.createElement("strong");
        value.textContent = count;
        head.append(label, value);

        const track = document.createElement("div");
        track.className = "analytics-track";
        const fill = document.createElement("span");
        fill.className = `analytics-fill ${status.toLowerCase()}`;
        fill.style.width = `${(count / total) * 100}%`;
        track.appendChild(fill);

        row.append(head, track);
        statusBox.appendChild(row);
    });

    const programBox = document.getElementById("programAnalytics");
    programBox.innerHTML = "";
    const programs = Object.entries(analytics.programCounts || {}).filter(([p]) => p).sort((a, b) => b[1] - a[1]).slice(0, 6);

    if (!programs.length) {
        const empty = document.createElement("div");
        empty.className = "text-muted small";
        empty.textContent = "No program data.";
        programBox.appendChild(empty);
        return;
    }

    programs.forEach(([program, count]) => {
        const row = document.createElement("div");
        row.className = "program-row";

        const head = document.createElement("div");
        head.className = "d-flex justify-content-between gap-2";
        const label = document.createElement("span");
        label.textContent = program;
        const value = document.createElement("strong");
        value.textContent = count;
        head.append(label, value);

        const progress = document.createElement("div");
        progress.className = "progress";
        progress.style.height = "6px";
        const bar = document.createElement("div");
        bar.className = "progress-bar";
        bar.style.width = `${(count / total) * 100}%`;
        progress.appendChild(bar);

        row.append(head, progress);
        programBox.appendChild(row);
    });
}

function renderActivity(events) {
    const box = document.getElementById("activityLog");
    box.innerHTML = "";

    if (!events.length) {
        const empty = document.createElement("div");
        empty.className = "text-muted small";
        empty.textContent = "No recent activity.";
        box.appendChild(empty);
        return;
    }

    events.slice(0, 8).forEach((event) => {
        const item = document.createElement("div");
        item.className = "activity-item";

        const icon = document.createElement("span");
        icon.className = "activity-icon";
        const i = document.createElement("i");
        i.className = "bi bi-activity";
        icon.appendChild(i);

        const body = document.createElement("div");
        const action = document.createElement("strong");
        action.textContent = event.action;
        const meta = document.createElement("small");
        meta.textContent = `${event.name} \u00b7 ${new Date(event.at).toLocaleString("en-PH")}`;
        body.append(action, meta);

        item.append(icon, body);
        box.appendChild(item);
    });
}


