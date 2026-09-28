const installAppButton = document.getElementById("installAppBtn");
let deferredInstallPrompt = null;

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" })
            .then(() => console.log("ENROLLSMART service worker registered."))
            .catch(error => console.warn("Service worker registration failed:", error));
    });
}

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installAppButton) installAppButton.classList.remove("d-none");
});

if (installAppButton) {
    installAppButton.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installAppButton.classList.add("d-none");
    });
}

window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installAppButton) installAppButton.classList.add("d-none");
});
