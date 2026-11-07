
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaLock } from "react-icons/fa";
import "./passwordRecovery.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail) {
            setError("Please enter your registered administrator email.");
            return;
        }

        if (!API_URL) {
            setError("API URL is not configured. Please contact support.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/forgot_school_password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: cleanEmail,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Unable to process your request. Please try again."
                );
            }

            setSuccess(true);
            setMessage(
                data.message ||
                "If an account exists with that email, a password reset link will be sent."
            );
        } catch (err) {
            setError(
                err.message ||
                "Connection failed. Please check your internet connection and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="recovery-page">
            <div className="recovery-card">

                <button
                    type="button"
                    className="recovery-back"
                    onClick={() => navigate("/")}
                >
                    <FaArrowLeft />
                    Back to Login
                </button>

                <div className="recovery-logo">
                    <div className="recovery-logo-icon">
                        <FaLock />
                    </div>
                    <span>SchoolOS</span>
                </div>

                {!success ? (
                    <>
                        <div className="recovery-heading">
                            <h1>Forgot Password?</h1>
                            <p>
                                Don't worry. Enter the administrator email
                                registered with your school account and we
                                will send you a password reset link.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label htmlFor="recovery-email">
                                Administrator Email
                            </label>

                            <div className="recovery-input-wrapper">
                                <FaEnvelope />
                                <input
                                    id="recovery-email"
                                    type="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="recovery-error">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="recovery-submit"
                                disabled={loading}
                            >
                                {loading ? "Sending reset link..." : "Send Reset Link"}
                            </button>
                        </form>

                        <p className="recovery-footer">
                            Remember your password?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("/")}
                            >
                                Login here
                            </button>
                        </p>
                    </>
                ) : (
                    <div className="recovery-success">
                        <div className="recovery-success-icon">
                            <FaCheckCircle />
                        </div>

                        <h1>Check Your Email</h1>

                        <p>{message}</p>

                        <p className="recovery-email-display">
                            {email.trim().toLowerCase()}
                        </p>

                        <p className="recovery-small-note">
                            If you do not see the email, check your spam or
                            junk folder. The reset link expires after 15 minutes.
                        </p>

                        <button
                            type="button"
                            className="recovery-submit"
                            onClick={() => navigate("/")}
                        >
                            Return to Login
                        </button>

                        <button
                            type="button"
                            className="recovery-resend"
                            onClick={() => {
                                setSuccess(false);
                                setMessage("");
                            }}
                        >
                            Try another email
                        </button>
                    </div>
                )}

                <div className="recovery-bottom">
                    Secure SchoolOS Account Recovery
                </div>
            </div>
        </div>
    );
}
