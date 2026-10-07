
import { useState } from "react";
import Layout from "../../Layout";
import "./UploadMarks.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function UploadMarks() {

    // =========================================================
    // FILTERS
    // =========================================================

    const [studentClass, setStudentClass] = useState("");
    const [subject, setSubject] = useState("");
    const [term, setTerm] = useState("");
    const [assessmentType, setAssessmentType] = useState("");

    // =========================================================
    // PUPILS
    // =========================================================

    const [pupils, setPupils] = useState([]);

    // =========================================================
    // UI STATES
    // =========================================================

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");


    // =========================================================
    // LOAD CLASS
    // =========================================================

    async function handleLoadClass() {

        if (
            !studentClass ||
            !subject ||
            !term ||
            !assessmentType
        ) {
            setError(
                "Please select class, subject, term and assessment."
            );
            return;
        }

        setLoading(true);
        setSaved(false);
        setError("");
        setInfo("");
        setPupils([]);

        try {

            const year = String(
                new Date().getFullYear()
            );

            // =================================================
            // STUDENTS URL
            // =================================================

            const studentsUrl =
                `${API_URL}/students/class/` +
                `${encodeURIComponent(studentClass)}`;


            // =================================================
            // EXISTING MARKS URL
            // =================================================

            const marksUrl =
                `${API_URL}/classes/` +
                `${encodeURIComponent(studentClass)}/marks` +
    `?term=${encodeURIComponent(term)}` +
`&year=${encodeURIComponent(year)}` +
`&assessment_type=${encodeURIComponent(
    assessmentType
)}`;


console.log(
    "Getting students from:",
    studentsUrl
);

console.log(
    "Getting existing marks from:",
    marksUrl
);


// =================================================
// LOAD BOTH AT THE SAME TIME
// =================================================

const [
    studentsResponse,
    marksResponse
] = await Promise.all([

    fetch(studentsUrl),

    fetch(marksUrl),

]);


console.log(
    "Students response status:",
    studentsResponse.status
);

console.log(
    "Marks response status:",
    marksResponse.status
);


// =================================================
// CHECK STUDENTS RESPONSE
// =================================================

if (!studentsResponse.ok) {

    throw new Error(
        `Failed to load students. Server returned ${studentsResponse.status}`
    );

}


// =================================================
// CHECK MARKS RESPONSE
// =================================================

if (!marksResponse.ok) {

    const marksError =
        await marksResponse.json();

    throw new Error(
        marksError.message ||
        `Failed to check existing marks. Server returned ${marksResponse.status}`
    );

}


// =================================================
// READ RESPONSES
// =================================================

const studentsData =
    await studentsResponse.json();

const marksData =
    await marksResponse.json();


console.log(
    "Students received:",
    studentsData
);

console.log(
    "Existing marks received:",
    marksData
);


// =================================================
// FIND EXISTING MARKS
// =================================================

const existingMarks = {};


if (marksData.students) {

    marksData.students.forEach(
        (student) => {

            if (!student.marks) {
                return;
            }


            student.marks.forEach(
                (mark) => {

                    if (
                        mark.subject === subject &&
                        mark.term === term &&
                        String(mark.year) === year &&
                        mark.assessment_type ===
                        assessmentType
                    ) {

                        existingMarks[
                            student.student_id
                            ] = {

                            score:
                            mark.score,

                            grade:
                            mark.grade,

                        };

                    }

                }
            );

        }
    );

}


console.log(
    "Existing marks for selected assessment:",
    existingMarks
);


// =================================================
// FORMAT STUDENTS
// =================================================

const formattedPupils =
    studentsData.map(
        (student) => {

            const existingMark =
                existingMarks[
                    student.student_id
                    ];


            return {

                id:
                student.student_id,

                name: [

                    student.student_name,

                    student.middle_name,

                    student.last_name,

                ]
                    .filter(Boolean)
                    .join(" "),

                score:
                    existingMark
                        ? existingMark.score
                        : "",

                grade:
                    existingMark
                        ? existingMark.grade
                        : "",

                alreadyUploaded:
                    Boolean(existingMark),

            };

        }
    );


setPupils(formattedPupils);


// =================================================
// UPLOAD STATUS
// =================================================

const alreadyUploadedCount =
    formattedPupils.filter(
        (pupil) =>
            pupil.alreadyUploaded
    ).length;


const remainingCount =
    formattedPupils.length -
    alreadyUploadedCount;


console.log(
    "Already uploaded:",
    alreadyUploadedCount
);

console.log(
    "Remaining:",
    remainingCount
);


// =================================================
// INFORMATION MESSAGE
// =================================================

if (alreadyUploadedCount > 0) {

    if (remainingCount > 0) {

        setInfo(
            `${alreadyUploadedCount} pupil(s) already have ` +
            `${subject} ${assessmentType} marks for ` +
            `${term} ${year}. ` +
            `${remainingCount} pupil(s) are ready for marks.`
        );

    } else {

        setInfo(
            `All ${formattedPupils.length} pupil(s) already have ` +
            `${subject} ${assessmentType} marks for ` +
            `${term} ${year}.`
        );

    }

}


// =================================================
// NO STUDENTS
// =================================================

if (formattedPupils.length === 0) {

    setError(
        `No students found in ${studentClass}.`
    );

}

} catch (error) {

    console.error(
        "Error loading students/marks:",
        error
    );

    setPupils([]);

    setError(
        error.message ||
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

    const pupil =
        pupils.find(
            (item) =>
                item.id === id
        );


    if (pupil?.alreadyUploaded) {
        return;
    }


    // Maximum 100

    if (
        value !== "" &&
        Number(value) > 100
    ) {

        value = "100";

    }


    // Minimum 0

    if (
        value !== "" &&
        Number(value) < 0
    ) {

        value = "0";

    }


    setPupils(
        (prev) =>
            prev.map(
                (pupil) =>
                    pupil.id === id
                        ? {
                            ...pupil,
                            score: value,
                        }
                        : pupil
            )
    );


    setSaved(false);
    setError("");

}


// =========================================================
// GRADE CHANGE
// =========================================================

function handleGradeChange(id, value) {

    const pupil =
        pupils.find(
            (item) =>
                item.id === id
        );


    if (pupil?.alreadyUploaded) {
        return;
    }


    setPupils(
        (prev) =>
            prev.map(
                (pupil) =>
                    pupil.id === id
                        ? {
                            ...pupil,
                            grade: value,
                        }
                        : pupil
            )
    );


    setSaved(false);
    setError("");

}


// =========================================================
// SUBMIT MARKS
// =========================================================

async function handleSubmit() {

    setSaved(false);
    setError("");


    const pupilsToUpload =
        pupils.filter(
            (pupil) =>
                !pupil.alreadyUploaded
        );


    console.log(
        "Pupils to upload:",
        pupilsToUpload
    );


    // =====================================================
    // VALIDATION
    // =====================================================

    if (pupils.length === 0) {

        setError(
            "Please load a class first."
        );

        return;

    }


    if (pupilsToUpload.length === 0) {

        setError(
            `All pupils already have ${subject} ${assessmentType} marks for ${term}.`
        );

        return;

    }


    // =====================================================
    // CHECK SCORES
    // =====================================================

    const studentsWithoutScores =
        pupilsToUpload.filter(
            (pupil) =>
                pupil.score === "" ||
                pupil.score === null ||
                pupil.score === undefined
        );


    if (
        studentsWithoutScores.length > 0
    ) {

        setError(
            `Please enter scores for all pupils. ` +
            `${studentsWithoutScores.length} pupil(s) still have no score.`
        );

        return;

    }


    // =====================================================
    // CHECK GRADES
    // =====================================================

    const studentsWithoutGrades =
        pupilsToUpload.filter(
            (pupil) =>
                !pupil.grade
        );


    if (
        studentsWithoutGrades.length > 0
    ) {

        setError(
            `Please select grades for all pupils. ` +
            `${studentsWithoutGrades.length} pupil(s) still have no grade.`
        );

        return;

    }


    // =====================================================
    // CHECK SCORE RANGE
    // =====================================================

    const invalidScores =
        pupilsToUpload.filter(
            (pupil) =>
                Number(pupil.score) < 0 ||
                Number(pupil.score) > 100 ||
                Number.isNaN(
                    Number(pupil.score)
                )
        );


    if (
        invalidScores.length > 0
    ) {

        setError(
            "Scores must be between 0 and 100."
        );

        return;

    }


    setSaving(true);


    try {

        // =================================================
        // PREPARE MARKS
        // =================================================

        const marks =
            pupilsToUpload.map(
                (pupil) => ({

                    student_id:
                    pupil.id,

                    score:
                        Number(pupil.score),

                    grade:
                    pupil.grade,

                })
            );


        // =================================================
        // COMPLETE PAYLOAD
        // =================================================

        const payload = {

            subject:
            subject,

            term:
            term,

            assessment:
            assessmentType,

            year:
                String(
                    new Date().getFullYear()
                ),

            marks:
            marks,

        };


        console.log(
            "Submitting NEW marks only:",
            payload
        );


        // =================================================
        // POST MARKS
        // =================================================

        const response =
            await fetch(
                `${API_URL}/marks`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify(
                            payload
                        ),

                }
            );


        console.log(
            "Marks response status:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Marks response:",
            data
        );


        // =================================================
        // ERROR
        // =================================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Failed to save marks."
            );

        }


        // =================================================
        // SUCCESS
        // =================================================

        setSaved(true);


        console.log(
            "New marks successfully saved."
        );


        // Reload class so uploaded marks become locked

        await handleLoadClass();


    } catch (error) {

        console.error(
            "Error submitting marks:",
            error
        );


        setSaved(false);


        setError(
            error.message ||
            "Failed to submit marks. Please check the connection."
        );

    } finally {

        setSaving(false);

    }

}


// =========================================================
// RESET FILTERS
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

            {/* PAGE HEADER */}

            <div className="upload-marks-header">

                <h1>
                    Upload Marks
                </h1>

                <p>
                    Enter student marks for a
                    specific term and assessment.
                </p>

            </div>


            {/* FILTER CARD */}

            <div className="upload-marks-filter-card">

                {/* CLASS */}

                <FilterField label="Class">

                    <select
                        value={studentClass}
                        onChange={(e) => {

                            setStudentClass(
                                e.target.value
                            );

                            setPupils([]);

                            setSaved(false);
                            setError("");
                            setInfo("");

                        }}
                        className="upload-marks-select"
                    >

                        <option value="">
                            Select class...
                        </option>

                        <option value="P1">
                            P1
                        </option>

                        <option value="P2">
                            P2
                        </option>

                        <option value="P3">
                            P3
                        </option>

                        <option value="P4">
                            P4
                        </option>

                        <option value="P5">
                            P5
                        </option>

                        <option value="P6">
                            P6
                        </option>

                        <option value="P7">
                            P7
                        </option>

                    </select>

                </FilterField>


                {/* SUBJECT */}

                <FilterField label="Subject">

                    <select
                        value={subject}
                        onChange={(e) => {

                            setSubject(
                                e.target.value
                            );

                            setPupils([]);

                            setSaved(false);
                            setError("");
                            setInfo("");

                        }}
                        className="upload-marks-select"
                    >

                        <option value="">
                            Select subject...
                        </option>

                        <option value="English">
                            English
                        </option>

                        <option value="Mathematics">
                            Mathematics
                        </option>

                        <option value="Science">
                            Science
                        </option>

                        <option value="Social Studies">
                            Social Studies
                        </option>

                    </select>

                </FilterField>


                {/* TERM */}

                <FilterField label="Term">

                    <select
                        value={term}
                        onChange={(e) => {

                            setTerm(
                                e.target.value
                            );

                            setPupils([]);

                            setSaved(false);
                            setError("");
                            setInfo("");

                        }}
                        className="upload-marks-select"
                    >

                        <option value="">
                            Select term...
                        </option>

                        <option value="Term 1">
                            Term 1
                        </option>

                        <option value="Term 2">
                            Term 2
                        </option>

                        <option value="Term 3">
                            Term 3
                        </option>

                    </select>

                </FilterField>


                {/* ASSESSMENT */}

                <FilterField label="Assessment">

                    <select
                        value={assessmentType}
                        onChange={(e) => {

                            setAssessmentType(
                                e.target.value
                            );

                            setPupils([]);

                            setSaved(false);
                            setError("");
                            setInfo("");

                        }}
                        className="upload-marks-select"
                    >

                        <option value="">
                            Select assessment...
                        </option>

                        <option value="B.O.T">
                            B.O.T
                        </option>

                        <option value="Test">
                            Test
                        </option>

                        <option value="Mid-Term">
                            Mid-Term
                        </option>

                        <option value="Holiday Package">
                            Holiday Package
                        </option>

                        <option value="End of Term">
                            End of Term
                        </option>

                    </select>

                </FilterField>


                {/* LOAD BUTTON */}

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

                    {loading
                        ? "Loading..."
                        : "Load Class"}

                </button>


                {/* RESET */}

                <button
                    onClick={resetForm}
                    className="upload-marks-reset-btn"
                >
                    Reset
                </button>

            </div>


            {/* INFO */}

            {info && (

                <div className="upload-marks-info">
                    {info}
                </div>

            )}


            {/* ERROR */}

            {error && (

                <div className="upload-marks-error">
                    {error}
                </div>

            )}


            {/* SUCCESS */}

            {saved && (

                <div className="upload-marks-success">
                    Marks saved successfully.
                </div>

            )}


            {/* MARKS TABLE */}

            {pupils.length > 0 && (

                <div className="upload-marks-table-card">

                    {/* TABLE HEADER */}

                    <div className="upload-marks-table-header">

                        <div>

                            <div className="upload-marks-subject">
                                {subject}
                            </div>

                            <div className="upload-marks-meta">

                                {studentClass}

                                {" • "}

                                {term}

                                {" • "}

                                {assessmentType}

                                {" • "}

                                {new Date().getFullYear()}

                            </div>

                        </div>


                        <div className="upload-marks-pupil-count">

                            {pupils.length}

                            {" pupil(s)"}

                        </div>

                    </div>


                    {/* TABLE */}

                    <div className="upload-marks-table-wrapper">

                        <table className="upload-marks-table">

                            <thead>

                            <tr>

                                <th>
                                    #
                                </th>

                                <th>
                                    Student
                                </th>

                                <th>
                                    Student ID
                                </th>

                                <th>
                                    Score
                                </th>

                                <th>
                                    Grade
                                </th>

                                <th>
                                    Status
                                </th>

                            </tr>

                            </thead>


                            <tbody>

                            {pupils.map(
                                (
                                    pupil,
                                    index
                                ) => (

                                    <tr
                                        key={
                                            pupil.id
                                        }
                                    >

                                        {/* NUMBER */}

                                        <td>
                                            {index + 1}
                                        </td>


                                        {/* NAME */}

                                        <td>

                                            <strong>
                                                {
                                                    pupil.name
                                                }
                                            </strong>

                                        </td>


                                        {/* ID */}

                                        <td>
                                            {
                                                pupil.id
                                            }
                                        </td>


                                        {/* SCORE */}

                                        <td>

                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={
                                                    pupil.score
                                                }
                                                disabled={
                                                    pupil.alreadyUploaded
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
                                            />

                                        </td>


                                        {/* GRADE */}

                                        <td>

                                            <select
                                                value={
                                                    pupil.grade
                                                }
                                                disabled={
                                                    pupil.alreadyUploaded
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
                                            >

                                                <option value="">
                                                    Select...
                                                </option>

                                                <option value="D1">
                                                    D1
                                                </option>

                                                <option value="D2">
                                                    D2
                                                </option>

                                                <option value="C3">
                                                    C3
                                                </option>

                                                <option value="C4">
                                                    C4
                                                </option>

                                                <option value="C5">
                                                    C5
                                                </option>

                                                <option value="C6">
                                                    C6
                                                </option>

                                                <option value="P7">
                                                    P7
                                                </option>

                                                <option value="P8">
                                                    P8
                                                </option>

                                                <option value="F9">
                                                    F9
                                                </option>

                                            </select>

                                        </td>


                                        {/* STATUS */}

                                        <td>

                                            {pupil.alreadyUploaded ? (

                                                <span className="upload-marks-status uploaded">
                                                            Uploaded
                                                        </span>

                                            ) : (

                                                <span className="upload-marks-status ready">
                                                            Ready
                                                        </span>

                                            )}

                                        </td>

                                    </tr>

                                )
                            )}

                            </tbody>

                        </table>

                    </div>


                    {/* SAVE FOOTER */}

                    <div className="upload-marks-save-footer">

                        <button
                            onClick={handleSubmit}
                            disabled={
                                saving ||
                                pupils.every(
                                    (pupil) =>
                                        pupil.alreadyUploaded
                                )
                            }
                            className="upload-marks-save-btn"
                        >

                            {saving
                                ? "Saving..."
                                : "Save Marks"}

                        </button>

                    </div>

                </div>

            )}

        </div>

    </Layout>

);

}


// =============================================================
// FILTER FIELD
// =============================================================

function FilterField({
                         label,
                         children,
                     }) {

    return (

        <label className="upload-marks-filter-field">

            <span>
                {label}
            </span>

            {children}

        </label>

    );

}
