
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
    // =====================================================
    // TEACHER
    // =====================================================

    teacher: {
        label: "SchoolOS · Teacher",

        links: [
            {
                to: "/teacher",
                label: "Dashboard",
                icon: <FaHome />,
            },

            {
                to: "/teacher/marks",
                label: "Upload Marks",
                icon: <FaBook />,
            },

            {
                to: "/teacher/lesson-plan",
                label: "Lesson Plan",
                icon: <FaChartBar />,
            },

            {
                to: "/teacher/timetable",
                label: "Timetable",
                icon: <FaCalendarAlt />,
            },

            {
                to: "/teacher/attendance",
                label: "Attendance",
                icon: <FaUser />,
            },

            {
                to: "/teacher/weekly-report",
                label: "Weekly Report",
                icon: <FaChartBar />,
            },
        ],
    },

    // =====================================================
    // ADMIN
    // =====================================================

    admin: {
        label: "SchoolOS · Admin",

        links: [
            {
                to: "/admin",
                label: "Dashboard",
                icon: <FaHome />,
            },

            // Students
            {
                to: "/admin/students",
                label: "Students",
                icon: <FaUser />,
            },

            // Teachers
            {
                to: "/admin/teachers",
                label: "Teachers",
                icon: <FaChalkboardTeacher />,
            },

            // Fee Set
            {
                to: "/admin/feeset",
                label: "Fee Set",
                icon: <FaMoneyBillWave />,
            },
        ],
    },

    // =====================================================
    // CLASS TEACHER
    // =====================================================

    classTeacher: {
        label: "SchoolOS · Class Teacher",

        links: [
            // Report Compilation
            {
                to: "/class-teacher",
                label: "Report Compilation",
                icon: <FaChartBar />,
            },

            // Class Attendance
            {
                to: "/class-teacher/attendance",
                label: "Class Attendance",
                icon: <FaClipboardCheck />,
            },

            // Class Timetable
            {
                to: "/class-teacher/timetable",
                label: "Class Timetable",
                icon: <FaCalendarAlt />,
            },
        ],
    },

    // =====================================================
    // PARENT
    // =====================================================

    parent: {
        label: "SchoolOS · Parent",

        links: [
            {
                to: "/parent",
                label: "Dashboard",
                icon: <FaHome />,
            },

            {
                to: "/parent/announcements",
                label: "Announcements",
                icon: <FaBook />,
            },

            {
                to: "/parent/results",
                label: "Results",
                icon: <FaChartBar />,
            },

            {
                to: "/parent/payment-status",
                label: "Payment Status",
                icon: <FaUser />,
            },

            {
                to: "/parent/receipts",
                label: "Receipts",
                icon: <FaCalendarAlt />,
            },
        ],
    },

    // =====================================================
    // BURSAR
    // =====================================================

    bursar: {
        label: "SchoolOS · Bursar",

        links: [
            {
                to: "/bursar",
                label: "Dashboard",
                icon: <FaHome />,
            },

            {
                to: "/bursar/capture-money",
                label: "Capture Money",
                icon: <FaBook />,
            },

            {
                to: "/bursar/pupil-details",
                label: "Pupil Details",
                icon: <FaUser />,
            },

            {
                to: "/bursar/records",
                label: "Records",
                icon: <FaChartBar />,
            },

            {
                to: "/bursar/update-status",
                label: "Update Status",
                icon: <FaCalendarAlt />,
            },
        ],
    },
};


// =====================================================
// LAYOUT COMPONENT
// =====================================================

export default function Layout({ role: propRole, children }) {

    const location = useLocation();
    const navigate = useNavigate();

    // =====================================================
    // AUTO-DETECT ROLE FROM URL
    // =====================================================

    const path = location.pathname;

    const inferredRole =
        propRole ||
        (path.startsWith("/teacher") && "teacher") ||
        (path.startsWith("/admin") && "admin") ||
        (path.startsWith("/class-teacher") && "classTeacher") ||
        (path.startsWith("/parent") && "parent") ||
        (path.startsWith("/bursar") && "bursar");


    // =====================================================
    // ROLE CONFIGURATION
    // =====================================================

    const config =
        ROLE_LINKS[inferredRole] || {
            label: "Unknown Role",
            links: [],
        };


    // =====================================================
    // LOGIN PAGE FOR CURRENT ROLE
    // =====================================================

    const loginPath =
        `/login/${LOGIN_KEYS[inferredRole] || inferredRole}`;


    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="layout-container">

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside className="sidebar">

                {/* Sidebar Header */}

                <div className="sidebar-header">
                    {config.label}
                </div>


                {/* Sidebar Navigation */}

                <nav className="sidebar-links">

                    {config.links.map((link) => {

                        // Active page detection
                        const active =
                            location.pathname === link.to;

                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`sidebar-link ${
    active ? "active" : ""
}`}
                            >

                                {/* Icon */}

                                <span className="icon">
                                    {link.icon}
                                </span>


                                {/* Label */}

                                <span>
                                    {link.label}
                                </span>

                            </Link>
                        );
                    })}

                </nav>


                {/* =================================================
                    SIDEBAR FOOTER
                ================================================= */}

                <div className="sidebar-footer">

                    {/* Switch Role */}

                    <Link
                        to={ROLE_SELECT_PATH}
                        className="switch-role"
                    >
                        ← Switch role
                    </Link>


                    {/* Profile */}

                    <div
                        className="profile-section"
                        onClick={() => navigate(loginPath)}
                    >

                        <div className="avatar">
                            S
                        </div>

                        <div className="profile-info">

                            <div className="name">
                                You
                            </div>

                            <div className="role">
                                {inferredRole || "Guest"}
                            </div>

                        </div>

                    </div>

                </div>

            </aside>


            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <main className="main-content">

                {/* =================================================
                    TOP NAVIGATION
                ================================================= */}

                <header className="top-navbar">

                    <input
                        type="text"
                        placeholder="Search..."
                        className="search-bar"
                    />

                    <div className="user-actions">

                        {/* Notifications */}

                        <button
                            className="notif-btn"
                            type="button"
                        >
                            🔔
                        </button>


                        {/* Logout */}

                        <button
                            className="logout-btn"
                            type="button"
                            onClick={() => navigate(loginPath)}
                        >
                            ⏻
                        </button>

                    </div>

                </header>


                {/* =================================================
                    PAGE CONTENT
                ================================================= */}

                <div className="page-content">
                    {children}
                </div>

            </main>

        </div>
    );
}
