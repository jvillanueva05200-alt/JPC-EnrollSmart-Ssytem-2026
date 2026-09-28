function showNotification(message, type = "info") {
    document.querySelector(".toast-notification")?.remove();

    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute("role", type === "danger" ? "alert" : "status");

    const icon = document.createElement("i");
    icon.className = `bi ${type === "success" ? "bi-check-circle" : type === "danger" ? "bi-x-circle" : "bi-info-circle"}`;

    const text = document.createElement("span");
    text.textContent = String(message ?? "");

    toast.append(icon, text);
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 250);
    }, 3800);
}
