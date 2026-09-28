import React from "react";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App({ page }) {
  switch (page) {
    case "login.html": return <LoginPage />;
    case "admin-login.html": return <AdminLoginPage />;
    case "student.html": return <StudentDashboard />;
    case "admin.html": return <AdminDashboard />;
    default: return <LandingPage />;
  }
}
