import React, { useEffect, useRef } from "react";
import { pageData } from "../pageData.js";

const scriptsByPage = {
  "index.html": [
    "/assets/vendor/bootstrap/js/bootstrap.bundle.min.js",
    "/assets/js/icons.js",
    "/assets/js/pwa.js",
    "/assets/js/theme.js"
  ],
  "login.html": [
    "/assets/vendor/bootstrap/js/bootstrap.bundle.min.js",
    "/assets/js/auth.js",
    "/assets/js/login.js",
    "/assets/js/icons.js",
    "/assets/js/pwa.js",
    "/assets/js/theme.js"
  ],
  "admin-login.html": [
    "/assets/vendor/bootstrap/js/bootstrap.bundle.min.js",
    "/assets/js/auth.js",
    "/assets/js/admin-login.js",
    "/assets/js/icons.js",
    "/assets/js/pwa.js",
    "/assets/js/theme.js"
  ],
  "student.html": [
    "/assets/vendor/bootstrap/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    "/assets/js/auth.js",
    "/assets/js/notification.js",
    "/assets/js/student.js",
    "/assets/js/icons.js",
    "/assets/js/pwa.js",
    "/assets/js/theme.js"
  ],
  "admin.html": [
    "/assets/vendor/bootstrap/js/bootstrap.bundle.min.js",
    "/assets/js/auth.js",
    "/assets/js/notification.js",
    "/assets/js/admin.js",
    "/assets/js/icons.js",
    "/assets/js/pwa.js",
    "/assets/js/theme.js"
  ]
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.reactPageScript = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function LegacyPage({ page }) {
  const data = pageData[page] || pageData["index.html"];
  const booted = useRef(false);

  useEffect(() => {
    const bodyClassMap = {
      "login.html": "login-page",
      "admin-login.html": "login-page"
    };
    document.body.className = bodyClassMap[page] || data.bodyClass || "";
    document.documentElement.setAttribute("data-react-page", page);

    const titleMap = {
      "index.html": "JPC ENROLLSMART | John Paul College",
      "login.html": "Login | JPC ENROLLSMART",
      "admin-login.html": "Admin Login | JPC ENROLLSMART",
      "student.html": "Student Portal | JPC ENROLLSMART",
      "admin.html": "Admin Dashboard | JPC ENROLLSMART"
    };
    document.title = titleMap[page] || titleMap["index.html"];

    if (!booted.current) {
      booted.current = true;
      (async () => {
        for (const src of scriptsByPage[page] || []) {
          try {
            await loadScript(src);
          } catch (error) {
            console.error(error);
          }
        }



        document.dispatchEvent(new Event("DOMContentLoaded", {
          bubbles: true,
          cancelable: true
        }));
      })();
    }

    return () => {
      document.body.className = "";
      document.documentElement.removeAttribute("data-react-page");
    };
  }, [page, data.bodyClass]);

  return <div dangerouslySetInnerHTML={{ __html: data.body }} />;
}
