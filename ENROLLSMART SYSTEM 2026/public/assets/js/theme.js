(function () {
    var KEY = "jpc_enrollsmart_theme";

    function saved() {
        var v = null;
        try { v = localStorage.getItem(KEY); } catch (e) {}
        if (v === "dark" || v === "light") return v;
        return window.matchMedia &&
               window.matchMedia("(prefers-color-scheme: dark)").matches
               ? "dark" : "light";
    }

    function apply(mode) {
        var dark = mode === "dark";
        document.body.classList.toggle("dark-mode", dark);
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", dark ? "#060A14" : "#0A1735");
        var icon = document.querySelector("#themeToggle i, #jpcThemeFab i");
        if (icon) {
            var next = document.createElement("i");
            next.className = dark ? "bi bi-sun" : "bi bi-moon-stars";
            icon.parentNode.replaceChild(next, icon);
        }
    }

    function set(mode) {
        try { localStorage.setItem(KEY, mode); } catch (e) {}
        apply(mode);
    }

    function start() {
        apply(saved());

        if (document.getElementById("themeToggle")) return;

        var btn = document.createElement("button");
        btn.id = "jpcThemeFab";
        btn.type = "button";
        btn.className = "jpc-theme-fab";
        btn.setAttribute("aria-label", "Switch between light and dark mode");
        btn.innerHTML = '<i class="bi bi-moon-stars"></i>';
        btn.addEventListener("click", function () {
            set(document.body.classList.contains("dark-mode") ? "light" : "dark");
        });
        document.body.appendChild(btn);
        apply(saved());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.JPCTheme = { set: set, current: saved };
})();
