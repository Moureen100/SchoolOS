
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
    const API_URL = import.meta.env.VITE_API_URL;

    const [showCreateAccount, setShowCreateAccount] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    });

    const [loggingIn, setLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState("");

    const [schoolData, setSchoolData] = useState({
        schoolName: "",
        schoolEmail: "",
        creatorRole: "",
        creatorEmail: "",
        creatorPhone: "",
        estimatedStudents: "",
        password: "",
        confirmPassword: "",
    });

    const [creatingSchool, setCreatingSchool] = useState(false);
    const [schoolMessage, setSchoolMessage] = useState("");
    const [schoolError, setSchoolError] = useState("");

    // =====================================================
    // RESET TO A CLEAN LOGIN SCREEN
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
    // LOGIN INPUT
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
    // SCHOOL LOGIN
    // Existing login endpoint preserved.
    // =====================================================

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError("");

        if (loggingIn) return;

        setLoggingIn(true);

        try {
            if (!API_URL) {
                setLoginError("The SchoolOS API URL is not configured.");
                return;
            }

            const requestData = {
                school_email: loginData.email.trim(),
                password: loginData.password,
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
                setLoginError(result.message || "Unable to log in.");
                return;
            }

            if (!result.access_token) {
                setLoginError(
                    "Login response did not include an access token."
                );
                return;
            }

            localStorage.setItem("access_token", result.access_token);

            if (result.school) {
                localStorage.setItem(
                    "school",
                    JSON.stringify(result.school)
                );
            }

            console.log("Logged In School:", result.school);

            navigate("/roles");
        } catch (error) {
            console.error("Login Error:", error);
            setLoginError(
                "Unable to connect to the SchoolOS server."
            );
        } finally {
            setLoggingIn(false);
        }
    };

    // =====================================================
    // VALIDATE SCHOOL REGISTRATION FORM
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
            setSchoolError("Your email address is required.");
            return false;
        }

        if (!schoolData.creatorPhone.trim()) {
            setSchoolError("Your phone number is required.");
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
                "Password must be at least 8 characters long."
            );
            return false;
        }

        if (schoolData.password !== schoolData.confirmPassword) {
            setSchoolError("Passwords do not match.");
            return false;
        }

        return true;
    };

    // =====================================================
    // CREATE SCHOOL ACCOUNT DIRECTLY
    //
    // No verification email.
    // No verification code.
    // No resend verification request.
    // =====================================================

    const handleCreateSchoolAccount = async (e) => {
        e.preventDefault();

        setSchoolMessage("");
        setSchoolError("");

        if (creatingSchool) return;
        if (!validateSchoolForm()) return;

        setCreatingSchool(true);

        try {
            if (!API_URL) {
                setSchoolError(
                    "The SchoolOS API URL is not configured."
                );
                return;
            }

            const requestData = {
                school_name: schoolData.schoolName.trim(),
                school_email: schoolData.schoolEmail.trim(),
                creator_role: schoolData.creatorRole,
                creator_email: schoolData.creatorEmail.trim(),
                creator_phone: schoolData.creatorPhone.trim(),
                estimated_students: Number(
                    schoolData.estimatedStudents
                ),
                password: schoolData.password,
            };

            // Do not log passwords or other sensitive information.
            console.log("Submitting school account registration.");

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

            console.log("School account registration status:", response.status);

            if (!response.ok) {
                setSchoolError(
                    result.message ||
                    "Unable to create school account."
                );
                return;
            }

            setSchoolMessage(
                result.message ||
                "School account created successfully. You can now log in."
            );

            console.log("School account created successfully.");

            // Clear the registration form after successful creation.
            setSchoolData({
                schoolName: "",
                schoolEmail: "",
                creatorRole: "",
                creatorEmail: "",
                creatorPhone: "",
                estimatedStudents: "",
                password: "",
                confirmPassword: "",
            });

            setShowCreatePassword(false);
            setShowConfirmPassword(false);
        } catch (error) {
            console.error("Create School Account Error:", error);

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
        setShowCreateAccount(true);
    };

    // =====================================================
    // RETURN TO LOGIN
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
                    onClick={handleEnterSchoolOS}
                >
                    Enter SchoolOS
                    <FaArrowRight />
                </button>
            </header>

            <main className="welcome-main">
                <div className="hero-layout-wrapper">
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

                    <section className="hero-login-panel">
                        <div className="glass-login-card">
                            {showCreateAccount ? (
                                <>
                                    <div className="glass-login-avatar">
                                        <div className="avatar-icon-inner"></div>
                                    </div>

                                    <h2>Create School Account</h2>

                                    <p className="glass-subtitle">
                                        Set up your school on SchoolOS.
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
                                        <div className="school-account-error">
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
                                                placeholder="Your Email Address"
                                                required
                                                value={schoolData.creatorEmail}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                            />
                                        </div>

                                        <div className="glass-input-group">
                                            <FaPhone className="input-icon" />
                                            <input
                                                type="tel"
                                                name="creatorPhone"
                                                placeholder="Your Phone Number"
                                                required
                                                value={schoolData.creatorPhone}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
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

                                        <div className="glass-input-group">
                                            <FaLock className="input-icon" />
                                            <input
                                                type={
                                                    showCreatePassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="password"
                                                placeholder="Create Password"
                                                required
                                                minLength="8"
                                                value={schoolData.password}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowCreatePassword(
                                                        !showCreatePassword
                                                    )
                                                }
                                                aria-label={
                                                    showCreatePassword
                                                        ? "Hide password"
                                                        : "Show password"
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
                                                placeholder="Confirm Password"
                                                required
                                                minLength="8"
                                                value={schoolData.confirmPassword}
                                                onChange={handleSchoolInputChange}
                                                disabled={creatingSchool}
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        !showConfirmPassword
                                                    )
                                                }
                                                aria-label={
                                                    showConfirmPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showConfirmPassword
                                                    ? <FaEyeSlash />
                                                    : <FaEye />}
                                            </button>
                                        </div>

                                        <div className="password-help-text">
                                            Password must contain at least
                                            8 characters.
                                        </div>

                                        <button
                                            type="submit"
                                            className="glass-submit-btn"
                                            disabled={creatingSchool}
                                        >
                                            {creatingSchool
                                                ? "Creating School Account..."
                                                : "Create School Account"}

                                            {!creatingSchool && <FaArrowRight />}
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
                                <>
                                    <div className="glass-login-avatar">
                                        <div className="avatar-icon-inner"></div>
                                    </div>

                                    <h2>School Login</h2>

                                    <p className="glass-subtitle">
                                        Welcome Back! Please login to continue.
                                    </p>

                                    <div className="glass-ai-badge">
                                        <FaRobot className="ai-badge-icon" />
                                        <span>
                                            AI-Powered Operational Management
                                            System Enabled
                                        </span>
                                    </div>

                                    {loginError && (
                                        <div className="school-account-error">
                                            {loginError}
                                        </div>
                                    )}

                                    <form
                                        onSubmit={handleLoginSubmit}
                                        className="glass-form"
                                    >
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
                                            />
                                        </div>

                                        <div className="glass-input-group">
                                            <FaLock className="input-icon" />
                                            <input
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                name="password"
                                                placeholder="Password"
                                                required
                                                value={loginData.password}
                                                onChange={handleLoginInputChange}
                                                disabled={loggingIn}
                                            />

                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() =>
                                                    setShowPassword(!showPassword)
                                                }
                                                aria-label={
                                                    showPassword
                                                        ? "Hide password"
                                                        : "Show password"
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

                                            {!loggingIn && <FaArrowRight />}
                                        </button>
                                    </form>

                                    <div className="glass-divider">
                                        <span>Or Registration System</span>
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
