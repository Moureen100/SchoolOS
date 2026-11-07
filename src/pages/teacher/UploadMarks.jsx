
import { useState } from "react";
import Layout from "../../Layout";
import "./UploadMarks.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const ALLOWED_GRADES = [
    "D1", "D2", "C3", "C4", "C5",
    "C6", "P7", "P8", "F9"
];

// =========================================================
// TEACHER AUTHENTICATION
// =========================================================

function getTeacherAuthHeaders() {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Your teacher session has expired. Please log in again.");
    }

    return {
        Authorization: `Bearer ${token}`
    };
}

export default function UploadMarks() {

    // FILTERS
    const [studentClass, setStudentClass] = useState("");
    const [subject, setSubject] = useState("");
    const [term, setTerm] = useState("");
    const [assessmentType, setAssessmentType] = useState("");

    // PUPILS
    const [pupils, setPupils] = useState([]);

    // UI STATES
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    // CURRENT YEAR
    const currentYear = String(new Date().getFullYear());

    // =========================================================
    // LOAD CLASS AND EXISTING MARKS
    // =========================================================

    async function handleLoadClass() {

        if (!studentClass || !subject || !term || !assessmentType) {
            setError("Please select class, subject, term and assessment.");
            return;
        }

        setLoading(true);
        setSaved(false);
        setError("");
        setInfo("");
        setPupils([]);

        try {

            // Get teacher JWT authentication headers.
            const authHeaders = getTeacherAuthHeaders();

            const studentsUrl =
                `${API_URL}/students/class/` +
                encodeURIComponent(studentClass);

            const marksUrl =
                `${API_URL}/classes/` +
                `${encodeURIComponent(studentClass)}/marks` +
                `?term=${encodeURIComponent(term)}` +
                `&year=${encodeURIComponent(currentYear)}` +
                `&assessment_type=${encodeURIComponent(assessmentType)}`;

            console.log("Getting students from:", studentsUrl);
            console.log("Getting existing marks from:", marksUrl);

            // Both requests carry the teacher JWT.
            const [studentsResponse, marksResponse] = await Promise.all([

                fetch(studentsUrl, {
                    method: "GET",
                    headers: authHeaders
                }),

                fetch(marksUrl, {
                    method: "GET",
                    headers: authHeaders
                })

            ]);

            if (studentsResponse.status === 401) {
                throw new Error(
                    "Teacher authentication failed or your session has expired. Please log in again."
                );
            }

            if (marksResponse.status === 401) {
                throw new Error(
                    "Your teacher session has expired. Please log in again."
                );
            }

            if (!studentsResponse.ok) {
                throw new Error(
                    `Failed to load students. Server returned ${studentsResponse.status}`
                );
            }

            if (!marksResponse.ok) {

                const marksError = await marksResponse.json().catch(() => ({}));

                throw new Error(
                    marksError.message ||
                    `Failed to check existing marks. Server returned ${marksResponse.status}`
                );
            }

            const studentsData = await studentsResponse.json();
            const marksData = await marksResponse.json();

            console.log("Students received:", studentsData);
            console.log("Existing marks received:", marksData);

            if (!Array.isArray(studentsData)) {
                throw new Error(
                    "The students endpoint returned an unexpected response."
                );
            }

            // =================================================
            // FIND EXISTING MARKS
            // =================================================

            const existingMarks = {};

            if (Array.isArray(marksData.students)) {

                marksData.students.forEach((student) => {

                    if (!Array.isArray(student.marks)) return;

                    student.marks.forEach((mark) => {

                        if (
                            mark.subject === subject &&
                            mark.term === term &&
                            String(mark.year) === currentYear &&
                            (mark.assessment || mark.assessment_type) === assessmentType
                        ) {

                            existingMarks[
                            mark.student_id || student.student_id
                                ] = {
                                score: mark.score,
                                grade: mark.grade
                            };

                        }

                    });

                });

            }

            console.log(
                "Existing marks for selected assessment:",
                existingMarks
            );

            // =================================================
            // FORMAT PUPILS
            // =================================================

            const formattedPupils = studentsData.map((student) => {

                const existingMark = existingMarks[student.student_id];

                return {
                    id: student.student_id,

                    name: [
                        student.student_name,
                        student.middle_name,
                        student.last_name
                    ].filter(Boolean).join(" "),

                    score: existingMark
                        ? String(existingMark.score)
                        : "",

                    grade: existingMark
                        ? existingMark.grade
                        : "",

                    alreadyUploaded: Boolean(existingMark)
                };

            });

            setPupils(formattedPupils);

            const uploadedCount = formattedPupils.filter(
                (pupil) => pupil.alreadyUploaded
            ).length;

            const remainingCount =
                formattedPupils.length - uploadedCount;

            if (formattedPupils.length === 0) {

                setError(`No students found in ${studentClass}.`);

            } else if (remainingCount > 0 && uploadedCount > 0) {

                setInfo(
                    `${uploadedCount} pupil(s) already have marks. ` +
                    `${remainingCount} pupil(s) remain available. ` +
                    `You can save marks for any number of pupils.`
                );

            } else if (remainingCount > 0) {

                setInfo(
                    `${remainingCount} pupil(s) loaded. ` +
                    `Enter marks for the pupils you are ready to submit. ` +
                    `You do not need to complete the whole class at once.`
                );

            } else {

                setInfo(
                    `All ${formattedPupils.length} pupil(s) already have ` +
                    `${subject} ${assessmentType} marks for ${term} ${currentYear}.`
                );

            }

        } catch (err) {

            console.error("Error loading students/marks:", err);

            setPupils([]);

            setError(
                err.message ||
                "Could not load students. Please check the connection."
            );

        } finally {

            setLoading(false);

        }
    }

    // =========================================================
    // SCORE CHANGE
    // =========================================================

    function handleScoreChange(id, value) {

        const pupil = pupils.find((item) => item.id === id);

        if (pupil?.alreadyUploaded) return;

        if (value !== "" && Number(value) > 100) value = "100";
        if (value !== "" && Number(value) < 0) value = "0";

        setPupils((previous) =>
            previous.map((item) =>
                item.id === id
                    ? { ...item, score: value }
                    : item
            )
        );

        setSaved(false);
        setError("");
    }

    // =========================================================
    // GRADE CHANGE
    // =========================================================

    function handleGradeChange(id, value) {

        const pupil = pupils.find((item) => item.id === id);

        if (pupil?.alreadyUploaded) return;

        setPupils((previous) =>
            previous.map((item) =>
                item.id === id
                    ? { ...item, grade: value }
                    : item
            )
        );

        setSaved(false);
        setError("");
    }

    // =========================================================
    // SUBMIT COMPLETED MARKS ONLY
    // =========================================================

    async function handleSubmit() {

        setSaved(false);
        setError("");

        if (pupils.length === 0) {
            setError("Please load a class first.");
            return;
        }

        const pupilsToUpload = pupils.filter(
            (pupil) => !pupil.alreadyUploaded
        );

        if (pupilsToUpload.length === 0) {

            setError(
                `All pupils already have ${subject} ${assessmentType} marks for ${term}.`
            );

            return;
        }

        // Check entered scores.
        const invalidScores = pupilsToUpload.filter((pupil) => {

            if (pupil.score === "" || pupil.score == null) {
                return false;
            }

            const score = Number(pupil.score);

            return (
                !Number.isFinite(score) ||
                score < 0 ||
                score > 100
            );

        });

        if (invalidScores.length > 0) {

            setError(
                "Scores must be valid numbers between 0 and 100."
            );

            return;
        }

        // A pupil is ready only when BOTH score and grade are supplied.
        const completePupils = pupilsToUpload.filter((pupil) => {

            const hasScore =
                pupil.score !== "" &&
                pupil.score !== null &&
                pupil.score !== undefined;

            const hasGrade =
                Boolean(pupil.grade) &&
                ALLOWED_GRADES.includes(pupil.grade);

            return hasScore && hasGrade;

        });

        const incompleteCount =
            pupilsToUpload.length - completePupils.length;

        if (completePupils.length === 0) {

            setError(
                "No complete marks to save yet. Enter both a score and " +
                "a valid grade for at least one pupil. You can leave the other pupils blank."
            );

            return;
        }

        setSaving(true);

        try {

            // Get the teacher's JWT before submitting.
            const authHeaders = getTeacherAuthHeaders();

            // Send only pupils with both a score and a valid grade.
            const marks = completePupils.map((pupil) => ({
                student_id: pupil.id,
                score: Number(pupil.score),
                grade: pupil.grade
            }));

            const payload = {
                subject,
                term,
                assessment: assessmentType,
                year: currentYear,
                marks
            };

            console.log(
                "Submitting completed marks only:",
                payload
            );

            // Submit marks with teacher authentication.
            const response = await fetch(`${API_URL}/marks`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders
                },

                body: JSON.stringify(payload)

            });

            const data = await response.json().catch(() => ({}));

            console.log("Marks response status:", response.status);
            console.log("Marks response:", data);

            if (response.status === 401) {

                throw new Error(
                    "Teacher authentication failed or your session has expired. Please log in again."
                );

            }

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    data.error ||
                    "Failed to save marks."
                );

            }

            // Reload to get the latest saved marks.
            await handleLoadClass();

            setSaved(true);

            const uploadedCount =
                data.uploaded_count ?? marks.length;

            const skippedCount =
                data.skipped_count ?? 0;

            let message =
                `${uploadedCount} pupil(s) saved successfully.`;

            if (skippedCount > 0) {

                message +=
                    ` ${skippedCount} existing mark(s) were skipped.`;

            }

            if (incompleteCount > 0) {

                message +=
                    ` ${incompleteCount} pupil(s) still need scores and/or grades. ` +
                    `You can enter those marks and save them later.`;

            } else {

                message +=
                    " All remaining pupils submitted in this batch were complete.";

            }

            setInfo(message);

            if (Array.isArray(data.errors) && data.errors.length > 0) {

                setError(
                    data.errors
                        .map(
                            (item) =>
                                `${item.student_id || "Pupil"}: ${item.message}`
                        )
                        .join(" ")
                );

            }

        } catch (err) {

            console.error("Error submitting marks:", err);

            setSaved(false);

            setError(
                err.message ||
                "Failed to submit marks. Please check the connection."
            );

        } finally {

            setSaving(false);

        }
    }

    // =========================================================
    // RESET
    // =========================================================

    function resetForm() {

        setStudentClass("");
        setSubject("");
        setTerm("");
        setAssessmentType("");
        setPupils([]);
        setSaved(false);
        setError("");
        setInfo("");

    }

    // =========================================================
    // UI
    // =========================================================

    return (

        <Layout role="teacher">

            <div className="upload-marks-page">

                <div className="upload-marks-header">

                    <h1>Upload Marks</h1>

                    <p>
                        Enter and save marks for one pupil or multiple pupils.
                        You can finish the remaining pupils later.
                    </p>

                </div>

                <div className="upload-marks-filter-card">

                    <FilterField label="Class">

                        <select
                            value={studentClass}
                            onChange={(e) => {
                                setStudentClass(e.target.value);
                                setPupils([]);
                                setSaved(false);
                                setError("");
                                setInfo("");
                            }}
                            className="upload-marks-select"
                        >

                            <option value="">Select class...</option>

                            {[
                                "Nursery",
                                "Middle",
                                "Top",
                                "P1",
                                "P2",
                                "P3",
                                "P4",
                                "P5",
                                "P6",
                                "P7"
                            ].map((value) => (

                                <option key={value} value={value}>
                                    {value}
                                </option>

                            ))}

                        </select>

                    </FilterField>

                    <FilterField label="Subject">

                        <select
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                setPupils([]);
                                setSaved(false);
                                setError("");
                                setInfo("");
                            }}
                            className="upload-marks-select"
                        >

                            <option value="">Select subject...</option>

                            {[
                                "English",
                                "Mathematics",
                                "Science",
                                "Social Studies"
                            ].map((value) => (

                                <option key={value} value={value}>
                                    {value}
                                </option>

                            ))}

                        </select>

                    </FilterField>

                    <FilterField label="Term">

                        <select
                            value={term}
                            onChange={(e) => {
                                setTerm(e.target.value);
                                setPupils([]);
                                setSaved(false);
                                setError("");
                                setInfo("");
                            }}
                            className="upload-marks-select"
                        >

                            <option value="">Select term...</option>

                            {[
                                "Term 1",
                                "Term 2",
                                "Term 3"
                            ].map((value) => (

                                <option key={value} value={value}>
                                    {value}
                                </option>

                            ))}

                        </select>

                    </FilterField>

                    <FilterField label="Assessment">

                        <select
                            value={assessmentType}
                            onChange={(e) => {
                                setAssessmentType(e.target.value);
                                setPupils([]);
                                setSaved(false);
                                setError("");
                                setInfo("");
                            }}
                            className="upload-marks-select"
                        >

                            <option value="">Select assessment...</option>

                            {[
                                "B.O.T",
                                "Test",
                                "Mid-Term",
                                "Holiday Package",
                                "End of Term"
                            ].map((value) => (

                                <option key={value} value={value}>
                                    {value}
                                </option>

                            ))}

                        </select>

                    </FilterField>

                    <button
                        onClick={handleLoadClass}
                        disabled={
                            loading ||
                            !studentClass ||
                            !subject ||
                            !term ||
                            !assessmentType
                        }
                        className="upload-marks-load-btn"
                    >

                        {loading ? "Loading..." : "Load Class"}

                    </button>

                    <button
                        onClick={resetForm}
                        className="upload-marks-reset-btn"
                    >

                        Reset

                    </button>

                </div>

                {info && (

                    <div
                        className="upload-marks-info"
                        role="status"
                    >
                        {info}
                    </div>

                )}

                {error && (

                    <div
                        className="upload-marks-error"
                        role="alert"
                    >
                        {error}
                    </div>

                )}

                {saved && (

                    <div
                        className="upload-marks-success"
                        role="status"
                    >
                        Marks saved successfully.
                    </div>

                )}

                {pupils.length > 0 && (

                    <div className="upload-marks-table-card">

                        <div className="upload-marks-table-header">

                            <div>

                                <div className="upload-marks-subject">
                                    {subject}
                                </div>

                                <div className="upload-marks-meta">

                                    {studentClass} {" • "} {term} {" • "}
                                    {assessmentType} {" • "} {currentYear}

                                </div>

                            </div>

                            <div className="upload-marks-pupil-count">
                                {pupils.length} pupil(s)
                            </div>

                        </div>

                        <div className="upload-marks-table-wrapper">

                            <table className="upload-marks-table">

                                <thead>

                                <tr>
                                    <th>#</th>
                                    <th>Student</th>
                                    <th>Student ID</th>
                                    <th>Score</th>
                                    <th>Grade</th>
                                    <th>Status</th>
                                </tr>

                                </thead>

                                <tbody>

                                {pupils.map((pupil, index) => (

                                    <tr key={pupil.id}>

                                        <td>{index + 1}</td>

                                        <td>
                                            <strong>{pupil.name}</strong>
                                        </td>

                                        <td>{pupil.id}</td>

                                        <td>

                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="any"
                                                value={pupil.score}
                                                disabled={
                                                    pupil.alreadyUploaded ||
                                                    saving
                                                }
                                                onChange={(e) =>
                                                    handleScoreChange(
                                                        pupil.id,
                                                        e.target.value
                                                    )
                                                }
                                                className={
                                                    pupil.alreadyUploaded
                                                        ? "upload-marks-score-input locked"
                                                        : "upload-marks-score-input"
                                                }
                                                aria-label={`Score for ${pupil.name}`}
                                            />

                                        </td>

                                        <td>

                                            <select
                                                value={pupil.grade}
                                                disabled={
                                                    pupil.alreadyUploaded ||
                                                    saving
                                                }
                                                onChange={(e) =>
                                                    handleGradeChange(
                                                        pupil.id,
                                                        e.target.value
                                                    )
                                                }
                                                className={
                                                    pupil.alreadyUploaded
                                                        ? "upload-marks-grade-select locked"
                                                        : "upload-marks-grade-select"
                                                }
                                                aria-label={`Grade for ${pupil.name}`}
                                            >

                                                <option value="">
                                                    Select...
                                                </option>

                                                {ALLOWED_GRADES.map(
                                                    (grade) => (

                                                        <option
                                                            key={grade}
                                                            value={grade}
                                                        >
                                                            {grade}
                                                        </option>

                                                    )
                                                )}

                                            </select>

                                        </td>

                                        <td>

                                            {pupil.alreadyUploaded ? (

                                                <span className="upload-marks-status uploaded">
                                                        Uploaded
                                                    </span>

                                            ) : pupil.score !== "" &&
                                            pupil.grade ? (

                                                <span className="upload-marks-status ready">
                                                        Ready
                                                    </span>

                                            ) : (

                                                <span className="upload-marks-status ready">
                                                        Pending
                                                    </span>

                                            )}

                                        </td>

                                    </tr>

                                ))}

                                </tbody>

                            </table>

                        </div>

                        <div className="upload-marks-save-footer">

                            <button
                                onClick={handleSubmit}
                                disabled={
                                    saving ||
                                    loading ||
                                    pupils.every(
                                        (pupil) => pupil.alreadyUploaded
                                    )
                                }
                                className="upload-marks-save-btn"
                            >

                                {saving
                                    ? "Saving..."
                                    : "Save Completed Marks"}

                            </button>

                        </div>

                    </div>

                )}

            </div>

        </Layout>

    );

}

// =========================================================
// FILTER FIELD
// =========================================================

function FilterField({ label, children }) {

    return (

        <label className="upload-marks-filter-field">

            <span>{label}</span>

            {children}

        </label>

    );

}
