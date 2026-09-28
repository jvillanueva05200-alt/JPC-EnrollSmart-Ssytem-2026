import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./app.css";

const root = document.getElementById("root");
if (!root) throw new Error("React root element was not found.");

const existingConfig = window.ENROLLSMART_CONFIG || {};
const existingFirebase = existingConfig.FIREBASE || {};

window.ENROLLSMART_CONFIG = {
  ...existingConfig,
  BACKEND_URL: existingConfig.BACKEND_URL || (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "::1" ? "http://localhost:4000" : location.origin),
  REQUEST_TIMEOUT_MS: existingConfig.REQUEST_TIMEOUT_MS || 15000,
  FIREBASE: {
    ...existingFirebase,
    apiKey: existingFirebase.apiKey || "",
    authDomain: existingFirebase.authDomain || "",
    projectId: existingFirebase.projectId || "",
    storageBucket: existingFirebase.storageBucket || "",
    messagingSenderId: existingFirebase.messagingSenderId || "",
    appId: existingFirebase.appId || ""
  }
};

const page = root.dataset.page || "index.html";

async function boot() {
  await import("./firebaseBridge.js");
  createRoot(root).render(<App page={page} />);
}

boot().catch((error) => {
  console.error(error);
  root.innerHTML = '<div class="container py-5"><div class="alert alert-danger">The application could not start. Check the project configuration and console for details.</div></div>';
});
