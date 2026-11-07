import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
    FaHome,
    FaBook,
    FaCalendarAlt,
    FaChartBar,
    FaUser,
    FaChalkboardTeacher,
    FaMoneyBillWave,
    FaClipboardCheck,
    FaReceipt,
    FaExclamationTriangle,
    FaWallet,
    FaUserCircle,
    FaGraduationCap,
    FaCog,
    FaBullhorn,
    FaMagic, // NEW: icon for AI Creative Studio
} from "react-icons/fa";

import "./Layout.css";

// =====================================================
// WHERE THE ROLE PICKER (RoleSelect) LIVES
// =====================================================

const ROLE_SELECT_PATH = "/roles";

// =====================================================
// LOGIN ROUTE KEYS
// =====================================================

const LOGIN_KEYS = {
    classTeacher: "class-teacher",
};

// =====================================================
// ROLE LINKS
// =====================================================

const ROLE_LINKS = {
    // TEACHER
    teacher: {
        label: "SchoolOS · Teacher",

        links: [
            { to: "/teacher", label: "Dashboard", icon: <FaHome /> },
            { to: "/teacher/marks", label: "Upload Marks", icon: <FaBook /> },
            { to: "/teacher/lesson-plan", label: "Lesson Plan", icon: <FaChartBar /> },
            { to: "/teacher/timetable", label: "Timetable", icon: <FaCalendarAlt /> },
            { to: "/teacher/attendance", label: "Attendance", icon: <FaUser /> },
            { to: "/teacher/weekly-report", label: "Weekly Report", icon: <FaChartBar /> },
        ],
    },

    // ADMIN
    admin: {
        label: "SchoolOS · Admin",

        links: [
            { to: "/admin", label: "Dashboard", icon: <FaHome /> },
            { to: "/admin/students", label: "Students", icon: <FaUser /> },
            { to: "/admin/teachers", label: "Teachers", icon: <FaChalkboardTeacher /> },
            { to: "/admin/feeset", label: "Fee Set", icon: <FaMoneyBillWave /> },
            { to: "/admin/academics", label: "Academic Oversight", icon: <FaGraduationCap /> },
            { to: "/admin/communication", label: "Communication", icon: <FaBullhorn /> },
            // NEW: AI Creative Studio tab (posters, flyers, banners)
            { to: "/admin/ai-studio", label: "AI Creative Studio", icon: <FaMagic /> },
            { to: "/admin/configuration", label: "System Configuration", icon: <FaCog /> },
        ],
    },

    // CLASS TEACHER
    classTeacher: {
        label: "SchoolOS · Class Teacher",

        links: [
            { to: "/class-teacher", label: "Report Compilation", icon: <FaChartBar /> },
            { to: "/class-teacher/attendance", label: "Class Attendance", icon: <FaClipboardCheck /> },
            { to: "/class-teacher/timetable", label: "Class Timetable", icon: <FaCalendarAlt /> },
        ],
    },

    // PARENT
    parent: {
        label: "SchoolOS · Parent",

        links: [
            { to: "/parent", label: "Dashboard", icon: <FaHome /> },
            { to: "/parent/announcements", label: "Announcements", icon: <FaBook /> },
            { to: "/parent/results", label: "Results", icon: <FaChartBar /> },
            { to: "/parent/payment-status", label: "Payment Status", icon: <FaUser /> },
            { to: "/parent/receipts", label: "Receipts", icon: <FaCalendarAlt /> },
        ],
    },

    // BURSAR
    bursar: {
        label: "SchoolOS · Bursar",

        links: [
            { to: "/bursar", label: "Dashboard", icon: <FaHome /> },
            { to: "/bursar/capture-money", label: "Capture Money", icon: <FaBook /> },
            { to: "/bursar/pupil-details", label: "Pupil Details", icon: <FaUser /> },
            { to: "/bursar/records", label: "Records", icon: <FaChartBar /> },
            { to: "/bursar/update-status", label: "Update Status", icon: <FaCalendarAlt /> },
            { to: "/bursar/receipts", label: "Receipts", icon: <FaReceipt /> },
            { to: "/bursar/defaulters", label: "Defaulters", icon: <FaExclamationTriangle /> },
            { to: "/bursar/expenses", label: "Expenses", icon: <FaWallet /> },
            { to: "/bursar/student-profile", label: "Student Profile", icon: <FaUserCircle /> },
        ],
    },
};

// =====================================================
// HELPER: READ THE LOGGED-IN USER FROM LOCAL STORAGE
// =====================================================

function getStoredUser() {
    try {
        const savedUser = localStorage.getItem("user");

        return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
        console.error("Could not read the saved user:", error);
        return null;
    }
}

// =====================================================
// LAYOUT COMPONENT
// =====================================================

export default function Layout({ role: propRole, children }) {
    const location = useLocation();
    const navigate = useNavigate();

    // =================================================
    // LOGGED-IN USER
    // =================================================

    const [currentUser, setCurrentUser] = useState(getStoredUser);

    // Refresh the user when navigating between pages.
    // This picks up the user saved during login.
    useEffect(() => {
        setCurrentUser(getStoredUser());
    }, [location.pathname]);

    // =================================================
    // AUTO-DETECT ROLE FROM URL
    // =================================================

    const path = location.pathname;

    const inferredRole =
        propRole ||
        (path.startsWith("/teacher") && "teacher") ||
        (path.startsWith("/admin") && "admin") ||
        (path.startsWith("/class-teacher") && "classTeacher") ||
        (path.startsWith("/parent") && "parent") ||
        (path.startsWith("/bursar") && "bursar");

    // =================================================
    // ROLE CONFIGURATION
    // =================================================

    const config =
        ROLE_LINKS[inferredRole] || {
            label: "Unknown Role",
            links: [],
        };

    // =================================================
    // LOGIN PAGE FOR CURRENT ROLE
    // =================================================

    const loginPath = `/login/${LOGIN_KEYS[inferredRole] || inferredRole}`;

    // =================================================
    // DISPLAY USER NAME AND AVATAR
    // =================================================

    const displayName =
        currentUser?.firstName ||
        currentUser?.first_name ||
        currentUser?.name ||
        currentUser?.username ||
        "You";

    const avatarInitial = displayName.charAt(0).toUpperCase();

    // Display a readable role name instead of camelCase.
    const displayRole =
        inferredRole === "classTeacher"
            ? "Class Teacher"
            : inferredRole === "teacher"
                ? "Teacher"
                : inferredRole === "admin"
                    ? "Admin"
                    : inferredRole === "parent"
                        ? "Parent"
                        : inferredRole === "bursar"
                            ? "Bursar"
                            : "Guest";

    // =================================================
    // RENDER LAYOUT
    // =================================================

    return (
        <div className="layout-container">
            {/* ================= SIDEBAR ================= */}

            <aside className="sidebar">
                <div className="sidebar-header">
                    {config.label}
                </div>

                <nav className="sidebar-links">
                    {config.links.map((link) => {
                        const active = location.pathname === link.to;

                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`sidebar-link ${active ? "active" : ""}`}
                            >
                                <span className="icon">
                                    {link.icon}
                                </span>

                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* ================= SIDEBAR FOOTER ================= */}

                <div className="sidebar-footer">
                    <Link
                        to={ROLE_SELECT_PATH}
                        className="switch-role"
                    >
                        ← Switch role
                    </Link>

                    {/* ================= USER PROFILE ================= */}

                    <div
                        className="profile-section"
                        onClick={() => navigate(loginPath)}
                        title="Open login page"
                    >
                        <div className="avatar">
                            {avatarInitial}
                        </div>

                        <div className="profile-info">
                            <div className="name">
                                {displayName}
                            </div>

                            <div className="role">
                                {displayRole}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ================= MAIN CONTENT ================= */}

            <main className="main-content">
                {/* ================= TOP NAVBAR ================= */}

                <header className="top-navbar">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="search-bar"
                    />

                    <div className="user-actions">
                        <button
                            className="notif-btn"
                            type="button"
                            aria-label="Notifications"
                        >
                            🔔
                        </button>

                        <button
                            className="logout-btn"
                            type="button"
                            aria-label="Go to login"
                            title="Go to login"
                            onClick={() => navigate(loginPath)}
                        >
                            ⏻
                        </button>
                    </div>
                </header>

                {/* ================= PAGE CONTENT ================= */}

                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}