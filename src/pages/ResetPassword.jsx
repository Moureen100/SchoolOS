
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    FaLock,
    FaEye,
    FaEyeSlash,
    FaCheckCircle,
    FaArrowLeft
} from "react-icons/fa";
import "./passwordRecovery.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Your password reset link is invalid or incomplete.");
            return;
        }

        if (password.length < 8) {
            setError("Your new password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Your passwords do not match.");
            return;
        }

        if (!API_URL) {
            setError("API URL is not configured. Please contact support.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/reset_school_password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    new_password: password,
                    confirm_password: confirmPassword,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Password reset failed. Your link may have expired."
                );
            }

            setSuccess(true);
        } catch (err) {
            setError(
                err.message ||
                "Unable to reset your password. Please try again."
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
                            <h1>Create New Password</h1>
                            <p>
                                Choose a strong password for your SchoolOS
                                administrator account.
                            </p>
                        </div>

                        {!token && (
                            <div className="recovery-error">
                                Your reset link is missing its security token.
                                Request a new password reset link.
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <label htmlFor="new-password">
                                New Password
                            </label>

                            <div className="recovery-input-wrapper">
                                <FaLock />
                                <input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    disabled={loading || !token}
                                />

                                <button
                                    type="button"
                                    className="recovery-eye"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            <label htmlFor="confirm-password">
                                Confirm New Password
                            </label>

                            <div className="recovery-input-wrapper">
                                <FaLock />
                                <input
                                    id="confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    disabled={loading || !token}
                                />

                                <button
                                    type="button"
                                    className="recovery-eye"
                                    onClick={() =>
                                        setShowConfirmPassword(!showConfirmPassword)
                                    }
                                    aria-label="Toggle confirm password visibility"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            <p className="recovery-hint">
                                Use at least 8 characters.
                            </p>

                            {error && (
                                <div className="recovery-error">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="recovery-submit"
                                disabled={loading || !token}
                            >
                                {loading ? "Updating Password..." : "Reset Password"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="recovery-success">
                        <div className="recovery-success-icon">
                            <FaCheckCircle />
                        </div>

                        <h1>Password Updated!</h1>

                        <p>
                            Your SchoolOS administrator password has been
                            successfully changed.
                        </p>

                        <p className="recovery-small-note">
                            You can now log in using your new password.
                        </p>

                        <button
                            type="button"
                            className="recovery-submit"
                            onClick={() => navigate("/")}
                        >
                            Continue to Login
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
