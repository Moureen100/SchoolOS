
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
    FaArrowRight,
    FaLock,
    FaEnvelope,
    FaEye,
    FaEyeSlash,
    FaRobot,
    FaSchool,
    FaUserTie,
    FaPhone,
    FaUsers,
    FaCheckCircle,
} from "react-icons/fa";

import "./welcome.css";
import gradBgImage from "../assets/img2/grad.jpg";

const SchoolOSShowcase = () => {
    const navigate = useNavigate();

    const API_URL = String(import.meta.env.VITE_API_URL || "")
        .trim()
        .replace(/\/+$/, "");

    const [showCreateAccount, setShowCreateAccount] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [showConfirmAdminPassword, setShowConfirmAdminPassword] =
        useState(false);

    // =====================================================
    // SCHOOL ACCOUNT LOGIN
    // =====================================================

    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    });

    const [loggingIn, setLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState("");

    // =====================================================
    // SCHOOL REGISTRATION
    // School and administrator credentials remain separate.
    // =====================================================

    const [schoolData, setSchoolData] = useState({
        schoolName: "",
        schoolEmail: "",
        creatorRole: "",
        creatorEmail: "",
        creatorPhone: "",
        estimatedStudents: "",

        password: "",
        confirmPassword: "",

        adminPassword: "",
        confirmAdminPassword: "",
    });

    const [creatingSchool, setCreatingSchool] = useState(false);
    const [schoolMessage, setSchoolMessage] = useState("");
    const [schoolError, setSchoolError] = useState("");

    // =====================================================
    // RESET LOGIN VIEW
    // =====================================================

    const resetToCleanLoginView = () => {
        setShowCreateAccount(false);
        setLoginError("");
        setSchoolError("");
        setSchoolMessage("");
    };

    useEffect(() => {
        resetToCleanLoginView();

        const handlePageShow = (event) => {
            if (event.persisted) {
                resetToCleanLoginView();
            }
        };

        window.addEventListener("pageshow", handlePageShow);

        return () => {
            window.removeEventListener("pageshow", handlePageShow);
        };
    }, []);

    // =====================================================
    // SCHOOL LOGIN INPUT
    // =====================================================

    const handleLoginInputChange = (e) => {
        const { name, value } = e.target;

        setLoginData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setLoginError("");
    };

    // =====================================================
    // SCHOOL REGISTRATION INPUT
    // =====================================================

    const handleSchoolInputChange = (e) => {
        const { name, value } = e.target;

        setSchoolData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setSchoolError("");
        setSchoolMessage("");
    };

    // =====================================================
    // ENTER SCHOOLOS
    // =====================================================

    const handleEnterSchoolOS = () => {
        resetToCleanLoginView();
    };

    // =====================================================
    // SCHOOL ACCOUNT LOGIN
    //
    // Endpoint: /login_school_account
    //
    // Uses ONLY:
    // school_email
    // password
    //
    // Does NOT use:
    // creator_email
    // admin_password
    // =====================================================

    const handleLoginSubmit = async (e) => {
        e.preventDefault();

        setLoginError("");

        if (loggingIn) return;

        const schoolEmail = loginData.email.trim().toLowerCase();
        const schoolPassword = loginData.password;

        if (!schoolEmail || !schoolPassword) {
            setLoginError(
                "Please enter your school email and school password."
            );
            return;
        }

        if (!API_URL) {
            setLoginError(
                "The SchoolOS API URL is not configured."
            );
            return;
        }

        setLoggingIn(true);

        try {
            // SCHOOL ACCOUNT CREDENTIALS ONLY
            const requestData = {
                school_email: schoolEmail,
                password: schoolPassword,
            };

            const response = await fetch(
                `${API_URL}/login_school_account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestData),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setLoginError(
                    result.message ||
                    "Unable to log in. Please check your school credentials."
                );
                return;
            }

            if (!result.access_token) {
                setLoginError(
                    "School login response did not include an access token."
                );
                return;
            }

            // Save school authentication session.
            localStorage.setItem(
                "access_token",
                result.access_token
            );

            if (result.school) {
                localStorage.setItem(
                    "school",
                    JSON.stringify(result.school)
                );
            }

            console.log("School account login successful.");

            navigate("/roles");

        } catch (error) {
            console.error("School Account Login Error:", error);

            setLoginError(
                "Unable to connect to the SchoolOS server. Please try again."
            );

        } finally {
            setLoggingIn(false);
        }
    };

    // =====================================================
    // VALIDATE SCHOOL REGISTRATION
    // =====================================================

    const validateSchoolForm = () => {

        if (!schoolData.schoolName.trim()) {
            setSchoolError("School name is required.");
            return false;
        }

        if (!schoolData.schoolEmail.trim()) {
            setSchoolError("School email is required.");
            return false;
        }

        if (!schoolData.creatorRole) {
            setSchoolError("Please select your role.");
            return false;
        }

        if (!schoolData.creatorEmail.trim()) {
            setSchoolError(
                "Administrator email address is required."
            );
            return false;
        }

        if (!schoolData.creatorPhone.trim()) {
            setSchoolError(
                "Administrator phone number is required."
            );
            return false;
        }

        if (
            !schoolData.estimatedStudents ||
            !Number.isInteger(Number(schoolData.estimatedStudents)) ||
            Number(schoolData.estimatedStudents) < 1
        ) {
            setSchoolError(
                "Please enter a valid number of students."
            );
            return false;
        }

        if (schoolData.password.length < 8) {
            setSchoolError(
                "The school password must be at least 8 characters long."
            );
            return false;
        }

        if (
            schoolData.password !== schoolData.confirmPassword
        ) {
            setSchoolError(
                "The school passwords do not match."
            );
            return false;
        }

        if (schoolData.adminPassword.length < 8) {
            setSchoolError(
                "The administrator password must be at least 8 characters long."
            );
            return false;
        }

        if (
            schoolData.adminPassword !==
            schoolData.confirmAdminPassword
        ) {
            setSchoolError(
                "The administrator passwords do not match."
            );
            return false;
        }

        if (
            schoolData.password === schoolData.adminPassword
        ) {
            setSchoolError(
                "For better security, use different school and administrator passwords."
            );
            return false;
        }

        return true;
    };

    // =====================================================
    // CREATE SCHOOL ACCOUNT
    // =====================================================

    const handleCreateSchoolAccount = async (e) => {
        e.preventDefault();

        setSchoolMessage("");
        setSchoolError("");

        if (creatingSchool) return;

        if (!validateSchoolForm()) return;

        if (!API_URL) {
            setSchoolError(
                "The SchoolOS API URL is not configured."
            );
            return;
        }

        setCreatingSchool(true);

        try {
            const requestData = {
                school_name: schoolData.schoolName.trim(),

                school_email: schoolData.schoolEmail
                    .trim()
                    .toLowerCase(),

                creator_role: schoolData.creatorRole,

                creator_email: schoolData.creatorEmail
                    .trim()
                    .toLowerCase(),

                creator_phone: schoolData.creatorPhone.trim(),

                estimated_students: Number(
                    schoolData.estimatedStudents
                ),

                // School's own password.
                password: schoolData.password,

                // Separate administrator password.
                admin_password: schoolData.adminPassword,
            };

            const response = await fetch(
                `${API_URL}/create_school_account`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestData),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setSchoolError(
                    result.message ||
                    "Unable to create school account."
                );
                return;
            }

            setSchoolMessage(
                result.message ||
                "School account created successfully. You can now log in using your school email and school password."
            );

            setSchoolData({
                schoolName: "",
                schoolEmail: "",
                creatorRole: "",
                creatorEmail: "",
                creatorPhone: "",
                estimatedStudents: "",
                password: "",
                confirmPassword: "",
                adminPassword: "",
                confirmAdminPassword: "",
            });

            setShowCreatePassword(false);
            setShowConfirmPassword(false);
            setShowAdminPassword(false);
            setShowConfirmAdminPassword(false);

        } catch (error) {
            console.error(
                "Create School Account Error:",
                error
            );

            setSchoolError(
                "Unable to connect to the SchoolOS server."
            );

        } finally {
            setCreatingSchool(false);
        }
    };

    // =====================================================
    // OPEN REGISTRATION
    // =====================================================

    const openCreateAccount = () => {
        setSchoolMessage("");
        setSchoolError("");
        setLoginError("");
        setShowCreateAccount(true);
    };

    // =====================================================
    // RETURN TO SCHOOL LOGIN
    // =====================================================

    const backToLogin = () => {
        setSchoolMessage("");
        setSchoolError("");
        setLoginError("");
        setShowCreateAccount(false);

        setLoginData({
            email: "",
            password: "",
        });

        setShowPassword(false);
    };

    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("school");

        setLoginData({
            email: "",
            password: "",
        });

        setLoginError("");

        navigate("/", { replace: true });
    };

    // =====================================================
    // PAGE UI
    // =====================================================

    return (
        <div className="showcase-page single-screen-lock">

            <div className="split-bg-white"></div>

            <div
                className="split-bg-image-clip"
                style={{
                    backgroundImage: `
                        linear-gradient(
                            135deg,
                            rgba(3, 11, 18, 0.45),
                            rgba(18, 59, 93, 0.45)
                        ),
                        url(${gradBgImage})
                    `,
                }}
            >
                <div className="clip-gradient-overlay"></div>
            </div>

            <div className="showcase-blob"></div>

            {/* NAVIGATION */}

            <header className="welcome-nav">

                <div
                    className="welcome-brand"
                    onClick={() => navigate("/")}
                >
                    <div className="brand-mark">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>

                    <div>
                        <div className="brand-name">
                            School<span>OS</span>
                        </div>

                        <div className="brand-small">
                            SCHOOL MANAGEMENT SYSTEM
                        </div>
                    </div>
                </div>

                <button
                    className="nav-login"
                    type="button"
                    onClick={handleEnterSchoolOS}
                >
                    Enter SchoolOS
                    <FaArrowRight />
                </button>

            </header>

            {/* MAIN CONTENT */}

            <main className="welcome-main">

                <div className="hero-layout-wrapper">

                    {/* LEFT HERO SECTION */}

                    <section className="hero-copy">

                        <div className="hero-ai-intro">
                            <span className="ai-intro-dot"></span>

                            <span>
                                AI-POWERED SCHOOL & LEARNING PLATFORM
                            </span>
                        </div>

                        <h1>
                            Run your school
                            <span>smarter.</span>
                        </h1>

                        <p className="hero-description">
                            SchoolOS brings students, academics,
                            attendance, fees, communication and
                            school operations into one organized
                            workspace — enhanced with AI to help
                            schools work faster and smarter.
                        </p>

                        <p className="hero-support">
                            From automatic emails and school
                            communication to reports, learning
                            activities and everyday administrative
                            tasks, SchoolOS helps turn routine work
                            into intelligent workflows.
                        </p>

                        <div className="hero-inclusive">

                            <div className="inclusive-content">

                                <span className="inclusive-label">
                                    AI-ASSISTED INCLUSIVE LEARNING
                                </span>

                                <p>
                                    Learning support designed to help
                                    students with disabilities access
                                    lessons, practice activities,
                                    reading support and school content
                                    in ways that work better for them.
                                </p>

                            </div>

                        </div>

                    </section>

                    {/* LOGIN AND REGISTRATION */}

                    <section className="hero-login-panel">

                        <div className="glass-login-card">

                            {showCreateAccount ? (

                                /* =================================
                                   SCHOOL REGISTRATION
                                ================================= */

                                <>

                                    <div className="glass-login-avatar">
                                        <div className="avatar-icon-inner"></div>
                                    </div>

                                    <h2>Create School Account</h2>

                                    <p className="glass-subtitle">
                                        Set up your school and administrator credentials.
                                    </p>

                                    <div className="glass-ai-badge">
                                        <FaRobot className="ai-badge-icon" />

                                        <span>
                                            SchoolOS Institutional Setup
                                        </span>
                                    </div>

                                    {schoolMessage && (
                                        <div className="school-account-success">
                                            <FaCheckCircle />
                                            <span>{schoolMessage}</span>
                                        </div>
                                    )}

                                    {schoolError && (
                                        <div
                                            className="school-account-error"
                                            role="alert"
                                        >
                                            {schoolError}
                                        </div>
                                    )}

                                    <form
                                        onSubmit={handleCreateSchoolAccount}
                                        className="glass-form"
                                    >

                                        <div className="glass-input-group">
                                            <FaSchool className="input-icon" />

                                            <input
                                                type="text"
                                                name="schoolName"
                                                placeholder="School Name"
                                                required
                                                value={schoolData.schoolName}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="organization"
                                            />
                                        </div>

                                        <div className="glass-input-group">
                                            <FaEnvelope className="input-icon" />

                                            <input
                                                type="email"
                                                name="schoolEmail"
                                                placeholder="School Email Address"
                                                required
                                                value={schoolData.schoolEmail}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="off"
                                            />
                                        </div>

                                        <div className="glass-input-group">
                                            <FaUserTie className="input-icon" />

                                            <select
                                                name="creatorRole"
                                                required
                                                value={schoolData.creatorRole}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                            >
                                                <option value="">
                                                    Select Your Role
                                                </option>

                                                <option value="head-teacher">
                                                    Head Teacher
                                                </option>

                                                <option value="director">
                                                    Director
                                                </option>

                                                <option value="administrator">
                                                    School Administrator
                                                </option>

                                                <option value="proprietor">
                                                    Proprietor / Owner
                                                </option>

                                                <option value="deputy-head-teacher">
                                                    Deputy Head Teacher
                                                </option>

                                                <option value="bursar">
                                                    Bursar
                                                </option>

                                                <option value="teacher">
                                                    Teacher
                                                </option>

                                                <option value="other">
                                                    Other
                                                </option>

                                            </select>
                                        </div>

                                        <div className="glass-input-group">
                                            <FaEnvelope className="input-icon" />

                                            <input
                                                type="email"
                                                name="creatorEmail"
                                                placeholder="Administrator Email Address"
                                                required
                                                value={schoolData.creatorEmail}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="email"
                                            />
                                        </div>

                                        <div className="glass-input-group">
                                            <FaPhone className="input-icon" />

                                            <input
                                                type="tel"
                                                name="creatorPhone"
                                                placeholder="Administrator Phone Number"
                                                required
                                                value={schoolData.creatorPhone}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="tel"
                                            />
                                        </div>

                                        <div className="glass-input-group">
                                            <FaUsers className="input-icon" />

                                            <input
                                                type="number"
                                                name="estimatedStudents"
                                                placeholder="Estimated Number of Students"
                                                min="1"
                                                step="1"
                                                required
                                                value={schoolData.estimatedStudents}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                            />
                                        </div>

                                        {/* SCHOOL PASSWORD */}

                                        <div className="password-section-heading">

                                            <strong>
                                                School Account Password
                                            </strong>

                                            <p>
                                                This password belongs to the school account.
                                            </p>

                                        </div>

                                        <div className="glass-input-group">

                                            <FaLock className="input-icon" />

                                            <input
                                                type={
                                                    showCreatePassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="password"
                                                placeholder="Create School Password"
                                                required
                                                minLength="8"
                                                value={schoolData.password}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="new-password"
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowCreatePassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                aria-label={
                                                    showCreatePassword
                                                        ? "Hide school password"
                                                        : "Show school password"
                                                }
                                            >
                                                {showCreatePassword
                                                    ? <FaEyeSlash />
                                                    : <FaEye />}
                                            </button>

                                        </div>

                                        <div className="glass-input-group">

                                            <FaLock className="input-icon" />

                                            <input
                                                type={
                                                    showConfirmPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="confirmPassword"
                                                placeholder="Confirm School Password"
                                                required
                                                minLength="8"
                                                value={schoolData.confirmPassword}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="new-password"
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                aria-label={
                                                    showConfirmPassword
                                                        ? "Hide confirmation"
                                                        : "Show confirmation"
                                                }
                                            >
                                                {showConfirmPassword
                                                    ? <FaEyeSlash />
                                                    : <FaEye />}
                                            </button>

                                        </div>

                                        {/* ADMINISTRATOR PASSWORD */}

                                        <div className="password-section-heading">

                                            <strong>
                                                Administrator Login Password
                                            </strong>

                                            <p>
                                                Separate credentials for the administrator.
                                            </p>

                                        </div>

                                        <div className="glass-input-group">

                                            <FaLock className="input-icon" />

                                            <input
                                                type={
                                                    showAdminPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="adminPassword"
                                                placeholder="Create Admin Password"
                                                required
                                                minLength="8"
                                                value={schoolData.adminPassword}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="new-password"
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowAdminPassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                aria-label={
                                                    showAdminPassword
                                                        ? "Hide admin password"
                                                        : "Show admin password"
                                                }
                                            >
                                                {showAdminPassword
                                                    ? <FaEyeSlash />
                                                    : <FaEye />}
                                            </button>

                                        </div>

                                        <div className="glass-input-group">

                                            <FaLock className="input-icon" />

                                            <input
                                                type={
                                                    showConfirmAdminPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="confirmAdminPassword"
                                                placeholder="Confirm Admin Password"
                                                required
                                                minLength="8"
                                                value={schoolData.confirmAdminPassword}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                                autoComplete="new-password"
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowConfirmAdminPassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                aria-label={
                                                    showConfirmAdminPassword
                                                        ? "Hide admin confirmation"
                                                        : "Show admin confirmation"
                                                }
                                            >
                                                {showConfirmAdminPassword
                                                    ? <FaEyeSlash />
                                                    : <FaEye />}
                                            </button>

                                        </div>

                                        <div className="password-help-text">
                                            Both passwords must contain at least
                                            8 characters. Keep them different.
                                        </div>

                                        <button
                                            type="submit"
                                            className="glass-submit-btn"
                                            disabled={creatingSchool}
                                        >
                                            {creatingSchool
                                                ? "Creating School Account..."
                                                : "Create School Account"}

                                            {!creatingSchool && (
                                                <FaArrowRight />
                                            )}
                                        </button>

                                    </form>

                                    <div className="glass-divider">
                                        <span>
                                            Already have an account?
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="glass-secondary-action"
                                        onClick={backToLogin}
                                        disabled={creatingSchool}
                                    >
                                        Back to School Login
                                        <span>→</span>
                                    </button>

                                </>

                            ) : (

                                /* =================================
                                   SCHOOL ACCOUNT LOGIN
                                ================================= */

                                <>

                                    <div className="glass-login-avatar">
                                        <div className="avatar-icon-inner"></div>
                                    </div>

                                    <h2>School Login</h2>

                                    <p className="glass-subtitle">
                                        Welcome back! Log in using your school account email and password.
                                    </p>

                                    <div className="glass-ai-badge">
                                        <FaRobot className="ai-badge-icon" />

                                        <span>
                                            SchoolOS School Account Access
                                        </span>
                                    </div>

                                    {loginError && (
                                        <div
                                            className="school-account-error"
                                            role="alert"
                                        >
                                            {loginError}
                                        </div>
                                    )}

                                    <form
                                        onSubmit={handleLoginSubmit}
                                        className="glass-form"
                                    >

                                        {/* SCHOOL EMAIL */}

                                        <div className="glass-input-group">

                                            <FaEnvelope className="input-icon" />

                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="School Email Address"
                                                required
                                                value={loginData.email}
                                                onChange={handleLoginInputChange}
                                                disabled={loggingIn}
                                                autoComplete="username"
                                            />

                                        </div>

                                        {/* SCHOOL PASSWORD */}

                                        <div className="glass-input-group">

                                            <FaLock className="input-icon" />

                                            <input
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="password"
                                                placeholder="School Account Password"
                                                required
                                                value={loginData.password}
                                                onChange={handleLoginInputChange}
                                                disabled={loggingIn}
                                                autoComplete="current-password"
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                aria-label={
                                                    showPassword
                                                        ? "Hide school password"
                                                        : "Show school password"
                                                }
                                            >
                                                {showPassword
                                                    ? <FaEyeSlash />
                                                    : <FaEye />}
                                            </button>

                                        </div>

                                        <div className="glass-actions-row">

                                            <span
                                                className="forgot-password-link"
                                                onClick={() =>
                                                    navigate("/forgot-password")
                                                }
                                            >
                                                Forgot Password?
                                            </span>

                                        </div>

                                        <button
                                            type="submit"
                                            className="glass-submit-btn"
                                            disabled={loggingIn}
                                        >
                                            {loggingIn
                                                ? "Logging In..."
                                                : "Enter SchoolOS System"}

                                            {!loggingIn && (
                                                <FaArrowRight />
                                            )}
                                        </button>

                                    </form>

                                    <div className="glass-divider">
                                        <span>
                                            New to SchoolOS?
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="glass-secondary-action"
                                        onClick={openCreateAccount}
                                        disabled={loggingIn}
                                    >
                                        Create School Management Account
                                        <span>→</span>
                                    </button>

                                </>

                            )}

                        </div>

                    </section>

                </div>

            </main>

        </div>
    );
};

export default SchoolOSShowcase;
