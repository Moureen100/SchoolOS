
import { useEffect, useRef, useState } from "react";
import Layout from "../../Layout";
import "./SystemConfiguration.css";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const MAX_LOGO_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
];

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status}).`
        );
    }

    return data;
}

function mapSavedInfo(info) {
    return {
        motto: info?.motto || "",
        location: info?.location || "",
        address: info?.address || "",
        phone: info?.school_telephone || info?.phone || "",
        directorPhone:
            info?.director_telephone ||
            info?.director_phone ||
            "",
    };
}

const EMPTY_SAVED_INFO = mapSavedInfo(null);

export default function SystemConfiguration() {
    const [schoolName, setSchoolName] = useState("");

    // Form fields start empty intentionally.
    const [motto, setMotto] = useState("");
    const [location, setLocation] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [directorPhone, setDirectorPhone] = useState("");

    // Saved school information.
    const [savedInfo, setSavedInfo] = useState(EMPTY_SAVED_INFO);

    // New logo selected by the admin.
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");

    // Actual saved logo image URL returned by the backend.
    const [savedLogoUrl, setSavedLogoUrl] = useState("");
    const [savedLogoKey, setSavedLogoKey] = useState("");
    const [savedLogoLoading, setSavedLogoLoading] = useState(true);
    const [savedLogoError, setSavedLogoError] = useState(false);

    const [schoolLoading, setSchoolLoading] = useState(true);
    const [configLoading, setConfigLoading] = useState(true);
    const [configSaving, setConfigSaving] = useState(false);

    const [status, setStatus] = useState({
        type: "",
        text: "",
    });

    const fileInputRef = useRef(null);
    const previewObjectUrlRef = useRef("");

    const getToken = () =>
        localStorage.getItem("token") ||
        localStorage.getItem("access_token");

    const authHeaders = () => {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Your login session has expired. Please log in again."
            );
        }

        return {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        };
    };

    const clearPreviewObjectUrl = () => {
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = "";
        }
    };

    const setPreviewFromFile = (file) => {
        clearPreviewObjectUrl();

        const objectUrl = URL.createObjectURL(file);

        previewObjectUrlRef.current = objectUrl;
        setLogoPreview(objectUrl);
    };

    // Fetch the real saved logo image URL from the backend.
    const loadSavedLogo = async () => {
        setSavedLogoLoading(true);
        setSavedLogoError(false);

        try {
            const response = await fetch(
                `${API_BASE}/school_configuration/logo`,
                {
                    method: "GET",
                    headers: authHeaders(),
                    cache: "no-store",
                }
            );

            const data = await readResponse(response);

            if (data.logo_key) {
                setSavedLogoKey(data.logo_key);
            } else {
                setSavedLogoKey("");
            }

            if (data.logo_url) {
                // This must be the signed image URL returned by
                // the backend, not the R2 object key.
                setSavedLogoUrl(data.logo_url);
            } else {
                setSavedLogoUrl("");
            }
        } catch (error) {
            console.error("Could not load saved school logo:", error);

            setSavedLogoError(true);
            setSavedLogoUrl("");
        } finally {
            setSavedLogoLoading(false);
        }
    };

    // Load school name, saved details and saved logo.
    useEffect(() => {
        let cancelled = false;

        async function loadConfiguration() {
            try {
                if (!API_BASE) {
                    throw new Error(
                        "VITE_API_URL is missing from your frontend .env file."
                    );
                }

                const headers = authHeaders();

                const nameResponse = await fetch(
                    `${API_BASE}/school-information/name`,
                    {
                        method: "GET",
                        headers,
                    }
                );

                const nameData = await readResponse(nameResponse);

                if (cancelled) return;

                setSchoolName(nameData.school_name || "");

                const configResponse = await fetch(
                    `${API_BASE}/system_configuration`,
                    {
                        method: "GET",
                        headers,
                    }
                );

                const configData = await readResponse(configResponse);

                if (cancelled) return;

                const info =
                    configData.configuration ||
                    configData.school_information ||
                    null;

                if (info) {
                    setSavedInfo(mapSavedInfo(info));

                    if (info.logo_key) {
                        setSavedLogoKey(info.logo_key);
                    } else if (info.logo_url) {
                        // Some responses use logo_url for the object key.
                        setSavedLogoKey(info.logo_url);
                    }
                }

                if (!cancelled) {
                    await loadSavedLogo();
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Could not load school configuration:",
                        error
                    );

                    setStatus({
                        type: "error",
                        text:
                            error.message ||
                            "Could not load school information.",
                    });
                }
            } finally {
                if (!cancelled) {
                    setSchoolLoading(false);
                    setConfigLoading(false);
                }
            }
        }

        loadConfiguration();

        return () => {
            cancelled = true;
            clearPreviewObjectUrl();
        };
    }, []);

    const handleLogoChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setStatus({ type: "", text: "" });

        if (!ALLOWED_TYPES.includes(file.type)) {
            setStatus({
                type: "error",
                text: "Choose a PNG, JPG, JPEG, or WebP image.",
            });

            event.target.value = "";
            return;
        }

        if (file.size > MAX_LOGO_SIZE) {
            setStatus({
                type: "error",
                text: "The logo must be 5 MB or smaller.",
            });

            event.target.value = "";
            return;
        }

        setLogoFile(file);
        setPreviewFromFile(file);
    };

    const handleClearSelection = () => {
        setLogoFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        clearPreviewObjectUrl();
        setLogoPreview("");

        setStatus({
            type: "info",
            text:
                "New logo selection cleared. Your saved logo has not been deleted.",
        });
    };

    const uploadSelectedLogo = async () => {
        if (!logoFile) return false;

        const formData = new FormData();
        formData.append("logo", logoFile);

        const response = await fetch(
            `${API_BASE}/school_configuration/logo`,
            {
                method: "POST",
                headers: authHeaders(),
                body: formData,
            }
        );

        const data = await readResponse(response);

        if (data.logo_key) {
            setSavedLogoKey(data.logo_key);
        }

        // Do not assume the upload response contains a signed URL.
        // Refresh the saved logo using the GET endpoint.
        await loadSavedLogo();

        clearPreviewObjectUrl();
        setLogoPreview("");
        setLogoFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        return true;
    };

    const handleSave = async (event) => {
        event.preventDefault();

        if (configSaving) return;

        if (!API_BASE) {
            setStatus({
                type: "error",
                text:
                    "VITE_API_URL is missing from your frontend .env file.",
            });
            return;
        }

        const payload = {};

        if (motto.trim()) payload.motto = motto.trim();
        if (location.trim()) payload.location = location.trim();
        if (address.trim()) payload.address = address.trim();
        if (phone.trim()) {
            payload.school_telephone = phone.trim();
        }

        if (directorPhone.trim()) {
            payload.director_telephone = directorPhone.trim();
        }

        const hasDetails = Object.keys(payload).length > 0;

        if (!hasDetails && !logoFile) {
            setStatus({
                type: "error",
                text:
                    "Enter at least one detail or choose a logo before saving.",
            });
            return;
        }

        setConfigSaving(true);
        setStatus({ type: "", text: "" });

        let logoUploaded = false;
        let detailsSaved = false;

        try {
            if (logoFile) {
                logoUploaded = await uploadSelectedLogo();
            }

            let message = "";

            if (hasDetails) {
                const response = await fetch(
                    `${API_BASE}/system_configuration`,
                    {
                        method: "POST",
                        headers: {
                            ...authHeaders(),
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    }
                );

                const data = await readResponse(response);

                const info =
                    data.configuration ||
                    data.school_information ||
                    null;

                if (info) {
                    setSavedInfo(mapSavedInfo(info));
                }

                setMotto("");
                setLocation("");
                setAddress("");
                setPhone("");
                setDirectorPhone("");

                detailsSaved = true;
                message = data.message || "";
            }

            let successMessage =
                "School information saved successfully.";

            if (logoUploaded && detailsSaved) {
                successMessage =
                    "School information saved and logo uploaded successfully.";
            } else if (logoUploaded) {
                successMessage = "School logo uploaded successfully.";
            } else if (message) {
                successMessage = message;
            }

            setStatus({
                type: "success",
                text: successMessage,
            });
        } catch (error) {
            console.error(
                "Saving school configuration failed:",
                error
            );

            setStatus({
                type: "error",
                text: logoUploaded
                    ? `The logo was uploaded, but saving school details failed: ${error.message}. Click Save again to retry the details.`
                    : error.message ||
                    "Could not save school information.",
            });
        } finally {
            setConfigSaving(false);
        }
    };

    const savedDetails = [
        { label: "Official school name", value: schoolName },
        { label: "School motto", value: savedInfo.motto },
        { label: "Location / P.O. Box", value: savedInfo.location },
        { label: "Physical address", value: savedInfo.address },
        { label: "School telephone", value: savedInfo.phone },
        {
            label: "Director / Head teacher telephone",
            value: savedInfo.directorPhone,
        },
    ];

    const handleSavedLogoError = () => {
        setSavedLogoError(true);
    };

    return (
        <Layout role="admin">
            <div className="admin-page sc-page">
                <section className="page-hero">
                    <div className="hero-copy">
                        <span className="eyebrow">
                            SYSTEM CONFIGURATION
                        </span>

                        <h1>School information</h1>

                        <p>
                            Manage your school's official information
                            and contact details. Your saved information
                            is displayed below and is retrieved
                            automatically when you return to this page.
                        </p>
                    </div>

                    <div className="hero-shape large">⚙</div>
                    <div className="hero-shape small" />
                </section>

                {status.text && (
                    <div
                        role="status"
                        aria-live="polite"
                        className={`sc-status sc-status-${status.type}`}
                    >
                        {status.type === "success" ? "✓ " : ""}
                        {status.text}
                    </div>
                )}

                {configLoading && (
                    <p className="sc-loading">
                        Loading saved school information...
                    </p>
                )}

                {/* SAVED SCHOOL INFORMATION */}
                <section className="card sc-saved-card">
                    <span className="kicker">SAVED DETAILS</span>

                    <h2>Current school information</h2>

                    <p className="sc-section-description">
                        These are the details currently saved for your
                        school. Use the form below to add or update them.
                    </p>

                    <div className="sc-saved-layout">
                        {/* ACTUAL SAVED LOGO */}
                        <div className="sc-saved-logo">
                            {savedLogoLoading ? (
                                <div className="sc-logo-placeholder">
                                    <span>…</span>
                                    <small>Loading saved logo</small>
                                </div>
                            ) : savedLogoUrl && !savedLogoError ? (
                                <img
                                    src={savedLogoUrl}
                                    alt={`${schoolName || "School"} official logo`}
                                    onError={handleSavedLogoError}
                                />
                            ) : (
                                <div className="sc-logo-placeholder">
                                    <span>
                                        {schoolName
                                            ? schoolName
                                                .charAt(0)
                                                .toUpperCase()
                                            : "S"}
                                    </span>

                                    <small>
                                        {savedLogoError
                                            ? "Logo could not be displayed"
                                            : "No logo uploaded"}
                                    </small>
                                </div>
                            )}
                        </div>

                        <div className="sc-saved-grid">
                            {savedDetails.map((item) => (
                                <div
                                    className="sc-saved-item"
                                    key={item.label}
                                >
                                    <span className="sc-saved-label">
                                        {item.label}
                                    </span>

                                    <strong
                                        className={
                                            item.value
                                                ? "sc-saved-value"
                                                : "sc-saved-value sc-saved-empty"
                                        }
                                    >
                                        {item.value || "Not provided yet"}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="sc-configuration-layout">
                    {/* SCHOOL DETAILS FORM */}
                    <section className="card blue sc-form-card">
                        <span className="kicker">SCHOOL PROFILE</span>

                        <h2>General information</h2>

                        <p className="sc-section-description">
                            Fill in only the details you want to add or
                            change. Fields left blank keep their current
                            saved value.
                        </p>

                        <form onSubmit={handleSave}>
                            <div className="sc-group-title">
                                School identity
                            </div>

                            <div className="form-grid">
                                <label className="field sc-full">
                                    Official school name

                                    <input
                                        type="text"
                                        value={
                                            schoolLoading
                                                ? "Loading school name..."
                                                : schoolName
                                        }
                                        readOnly
                                        aria-label="Official school name"
                                    />

                                    <em className="sc-hint">
                                        Retrieved from your registered
                                        school account.
                                    </em>
                                </label>

                                <label className="field sc-full">
                                    School motto

                                    <input
                                        type="text"
                                        value={motto}
                                        onChange={(event) =>
                                            setMotto(event.target.value)
                                        }
                                        placeholder="Enter the school motto"
                                        maxLength={255}
                                    />
                                </label>
                            </div>

                            <div className="sc-group-title">
                                Location and address
                            </div>

                            <div className="form-grid">
                                <label className="field">
                                    Location / P.O. Box

                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(event) =>
                                            setLocation(event.target.value)
                                        }
                                        placeholder="e.g. P.O. Box 123, Kampala"
                                        maxLength={255}
                                    />
                                </label>

                                <label className="field">
                                    Physical address

                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(event) =>
                                            setAddress(event.target.value)
                                        }
                                        placeholder="e.g. Kampala, Uganda"
                                        maxLength={255}
                                    />
                                </label>
                            </div>

                            <div className="sc-group-title">
                                Telephone information
                            </div>

                            <div className="form-grid">
                                <label className="field">
                                    School telephone

                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(event) =>
                                            setPhone(event.target.value)
                                        }
                                        placeholder="+256 700 000 000"
                                        maxLength={30}
                                    />
                                </label>

                                <label className="field">
                                    Director / Head teacher telephone

                                    <input
                                        type="tel"
                                        value={directorPhone}
                                        onChange={(event) =>
                                            setDirectorPhone(
                                                event.target.value
                                            )
                                        }
                                        placeholder="+256 701 000 000"
                                        maxLength={30}
                                    />
                                </label>
                            </div>

                            <div className="sc-actions">
                                <button
                                    className="btn yellow"
                                    type="submit"
                                    disabled={
                                        configSaving ||
                                        configLoading ||
                                        schoolLoading
                                    }
                                >
                                    {configSaving
                                        ? "Saving information..."
                                        : "Save school information"}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* SCHOOL LOGO UPLOAD AND PREVIEW */}
                    <aside className="card yellow sc-logo-card">
                        <span className="kicker">SCHOOL BRANDING</span>

                        <h2>School logo</h2>

                        <p className="sc-section-description">
                            Upload your official school badge or logo.
                            Your saved logo is retrieved from private
                            Cloudflare R2 storage.
                        </p>

                        <div className="sc-logo-display">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Preview of newly selected school logo"
                                />
                            ) : savedLogoLoading ? (
                                <div className="sc-logo-placeholder">
                                    <span>…</span>
                                    <small>Loading saved logo</small>
                                </div>
                            ) : savedLogoUrl && !savedLogoError ? (
                                <img
                                    src={savedLogoUrl}
                                    alt={`${schoolName || "School"} saved logo`}
                                    onError={handleSavedLogoError}
                                />
                            ) : (
                                <div className="sc-logo-placeholder">
                                    <span>
                                        {schoolName
                                            ? schoolName
                                                .charAt(0)
                                                .toUpperCase()
                                            : "S"}
                                    </span>

                                    <small>
                                        {savedLogoError
                                            ? "Saved logo unavailable"
                                            : "No logo uploaded"}
                                    </small>
                                </div>
                            )}
                        </div>

                        <div className="sc-logo-information">
                            <strong>
                                {logoFile
                                    ? "New logo selected"
                                    : savedLogoLoading
                                        ? "Checking saved logo..."
                                        : savedLogoUrl && !savedLogoError
                                            ? "Saved school logo loaded"
                                            : savedLogoKey
                                                ? "Saved logo record found"
                                                : "No logo uploaded"}
                            </strong>

                            <p>
                                PNG, JPG, JPEG or WebP. Maximum file
                                size: 5 MB.
                            </p>

                            {logoFile && (
                                <small className="sc-file-name">
                                    {logoFile.name}
                                </small>
                            )}
                        </div>

                        <div className="sc-logo-actions">
                            <label
                                className="btn yellow"
                                htmlFor="school-logo-input"
                            >
                                {logoFile
                                    ? "Choose another logo"
                                    : "Choose logo"}
                            </label>

                            <input
                                ref={fileInputRef}
                                id="school-logo-input"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleLogoChange}
                                hidden
                            />

                            {logoFile && (
                                <button
                                    type="button"
                                    className="btn outline"
                                    onClick={handleClearSelection}
                                    disabled={configSaving}
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>

                        <div className="sc-logo-note">
                            <strong>Important</strong>

                            <p>
                                Choosing a file only creates a preview.
                                The new logo is uploaded when you click
                                Save school information. Your saved logo
                                remains unchanged until the upload succeeds.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </Layout>
    );
}
