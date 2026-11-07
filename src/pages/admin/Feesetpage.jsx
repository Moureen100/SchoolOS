import React, { useState, useMemo, useEffect } from "react";
import {
    FaSearch,
    FaEdit,
    FaTrash,
    FaChevronDown,
    FaTimes,
    FaSave,
    FaCopy,
    FaMoneyBillWave,
    FaWallet,
    FaBalanceScale,
    FaPercentage,
} from "react-icons/fa";
import Layout from "../../Layout";
import "./Feeset.css";

// =====================================================
// BACKEND URL
// .env -> VITE_API_URL=http://127.0.0.1:5000
// =====================================================
const API_URL = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"
).replace(/\/+$/, "");

// =====================================================
// OPTIONS
// =====================================================
const CLASS_OPTIONS = [
    "Nursery",
    "Middle",
    "Top",
    "P.1",
    "P.2",
    "P.3",
    "P.4",
    "P.5",
    "P.6",
    "P.7",
];

const TERMS = ["Term 1", "Term 2", "Term 3"];

const METHODS = [
    "Bursar Office",
    "School Pay",
    "Mobile Money",
    "Bank Slip",
];

const METHOD_CLASS = {
    "Bursar Office": "navy",
    "School Pay": "blue",
    "Mobile Money": "yellow",
    "Bank Slip": "green",
};

// =====================================================
// ACADEMIC PERIOD
// =====================================================
const getCurrentYear = () => new Date().getFullYear();

const getCurrentTerm = () => {
    const month = new Date().getMonth() + 1;

    if (month <= 4) return "Term 1";
    if (month <= 8) return "Term 2";
    return "Term 3";
};

const getCurrentPeriod = () => ({
    year: getCurrentYear(),
    term: getCurrentTerm(),
});

const getPreviousPeriod = (year, term) => {
    const index = TERMS.indexOf(term);

    return index <= 0
        ? { year: year - 1, term: TERMS[TERMS.length - 1] }
        : { year, term: TERMS[index - 1] };
};

// =====================================================
// HELPERS
// =====================================================
const money = (amount) =>
    `UGX ${Number(amount || 0).toLocaleString("en-UG")}`;

const classLabel = (student) =>
    student.stream
        ? `${student.level} ${student.stream}`
        : student.level;

const normalizeClass = (value) =>
    String(value || "").trim().toLowerCase();

const normalizeStudent = (student, requestedLevel = "") => ({
    // Important: student IDs may be codes such as ST007.
    // Never convert them to numbers.
    id: String(
        student.student_id ??
        student.id ??
        student.student_code ??
        ""
    ),
    name:
        student.name ||
        student.student_name ||
        [
            student.first_name,
            student.middle_name,
            student.last_name,
        ]
            .filter(Boolean)
            .join(" ") ||
        `Student ${student.student_id ?? student.id ?? ""}`,
    level:
        student.level ||
        student.class_name ||
        student.class ||
        requestedLevel,
    stream: student.stream || "",
});

const normalizeFee = (fee) => ({
    id: fee.id,
    year: Number(fee.year),
    term: fee.term,
    level: fee.level ?? fee.class_name,
    amount: Number(fee.amount || 0),
});

const normalizeSpecial = (allocation) => ({
    id: allocation.id,
    studentId: String(
        allocation.student_id ??
        allocation.studentId ??
        ""
    ),
    studentName:
        allocation.student_name ??
        allocation.studentName ??
        "",
    level:
        allocation.class_name ??
        allocation.level ??
        "",
    year: Number(allocation.year),
    term: allocation.term,
    amount: Number(allocation.amount || 0),
    reason: allocation.reason || "Special case",
});

const normalizePayment = (payment) => ({
    ...payment,
    id: payment.id,
    studentId: String(
        payment.student_id ??
        payment.studentId ??
        ""
    ),
    year: Number(payment.year),
    term: payment.term,
    amount: Number(payment.amount || 0),
    method: payment.method || "",
    reference: payment.reference || "",
    date: payment.date || "",
});

// =====================================================
// AUTH + API HELPERS
// =====================================================
const getAuthToken = () => {
    const keys = [
        "access_token",
        "token",
        "school_access_token",
        "school_token",
    ];

    for (const storage of [sessionStorage, localStorage]) {
        for (const key of keys) {
            const value = storage.getItem(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }
    }

    return "";
};

const getAuthHeaders = (includeJsonContentType = false) => {
    const token = getAuthToken();

    if (!token) {
        throw new Error(
            "Your login token was not found. Please log out and log in again."
        );
    }

    return {
        ...(includeJsonContentType
            ? { "Content-Type": "application/json" }
            : {}),
        Authorization: `Bearer ${token}`,
    };
};

const friendlyError = (error) =>
    error?.message === "Failed to fetch"
        ? "Cannot reach the server. Check that the backend is running."
        : error?.message || "Something went wrong.";

const apiRequest = async (
    path,
    { method = "GET", body } = {}
) => {
    const hasBody = body !== undefined;

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: getAuthHeaders(hasBody),
        body: hasBody ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            response.status === 401
                ? "Your session is unauthorized or has expired. Please log in again."
                : data.error ||
                data.message ||
                "The request failed."
        );
    }

    return data;
};

// =====================================================
// CLASS FEES API
// =====================================================
const fetchClassFees = async (year, term) => {
    const params = new URLSearchParams({
        year: String(year),
        term,
    });

    const data = await apiRequest(
        `/api/class-fees?${params}`
    );

    return {
        fees: (data.fees || []).map(normalizeFee),
        studentCounts: data.student_counts || {},
    };
};

// =====================================================
// REAL STUDENTS API
// Uses the existing class-scoped endpoint and combines
// students from all classes for the payment section.
// =====================================================
const fetchStudentsByClass = async (level) => {
    const params = new URLSearchParams({ level });

    const data = await apiRequest(
        `/api/special-allocations/students?${params}`
    );

    return (data.students || [])
        .map((student) => normalizeStudent(student, level))
        .filter((student) => student.id);
};

const fetchAllStudents = async () => {
    const results = await Promise.all(
        CLASS_OPTIONS.map(async (level) => {
            try {
                return await fetchStudentsByClass(level);
            } catch (error) {
                // Continue loading other classes if one class
                // cannot be retrieved.
                console.error(
                    `Could not load students in ${level}:`,
                    error
                );
                return [];
            }
        })
    );

    const studentsById = new Map();

    results.flat().forEach((student) => {
        studentsById.set(String(student.id), student);
    });

    return Array.from(studentsById.values()).sort((a, b) => {
        const classDifference =
            CLASS_OPTIONS.indexOf(a.level) -
            CLASS_OPTIONS.indexOf(b.level);

        if (classDifference !== 0) {
            return classDifference;
        }

        return a.name.localeCompare(b.name);
    });
};

// =====================================================
// SPECIAL ALLOCATION API
// =====================================================
const fetchSpecialAllocations = async (year, term) => {
    const params = new URLSearchParams({
        year: String(year),
        term,
    });

    const data = await apiRequest(
        `/api/special-allocations?${params}`
    );

    return (data.allocations || []).map(normalizeSpecial);
};

const saveSpecialAllocation = async (payload) =>
    apiRequest("/api/special-allocations", {
        method: "POST",
        body: payload,
    });

const deleteSpecialAllocation = async (id) =>
    apiRequest(`/api/special-allocations/${id}`, {
        method: "DELETE",
    });

// =====================================================
// SELECT COMPONENT
// =====================================================
const SelectBox = ({
                       value,
                       onChange,
                       children,
                       disabled = false,
                   }) => (
    <div className="fs-select">
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
        >
            {children}
        </select>

        <FaChevronDown className="fs-caret" />
    </div>
);

// =====================================================
// PAGE
// =====================================================
const FeeSetPage = () => {
    const [period, setPeriod] = useState(getCurrentPeriod);
    const { year, term } = period;

    // REAL SCHOOL STUDENTS — no demo students.
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [studentsError, setStudentsError] = useState("");

    const [fees, setFees] = useState([]);
    const [studentCounts, setStudentCounts] = useState({});
    const [loadingFees, setLoadingFees] = useState(false);
    const [feesError, setFeesError] = useState("");

    const [editingFee, setEditingFee] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [copying, setCopying] = useState(false);
    const [savingFee, setSavingFee] = useState(false);

    const [specials, setSpecials] = useState([]);
    const [specialStudents, setSpecialStudents] = useState([]);
    const [loadingSpecialStudents, setLoadingSpecialStudents] =
        useState(false);
    const [loadingSpecials, setLoadingSpecials] = useState(false);
    const [savingSpecial, setSavingSpecial] = useState(false);
    const [deletingSpecialId, setDeletingSpecialId] =
        useState(null);
    const [specialsError, setSpecialsError] = useState("");

    // No fake payment records. Actual payments require a
    // backend payment endpoint to persist across refreshes.
    const [payments, setPayments] = useState([]);

    const [feeForm, setFeeForm] = useState({
        level: "",
        amount: "",
    });

    const [specialForm, setSpecialForm] = useState({
        level: "",
        studentId: "",
        amount: "",
        reason: "",
    });

    const [payForm, setPayForm] = useState({
        studentId: "",
        amount: "",
        method: "",
        reference: "",
    });

    const [message, setMessage] = useState(null);

    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [methodFilter, setMethodFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const flash = (type, text) =>
        setMessage({ type, text });

    const inPeriod = (item) =>
        Number(item.year) === year &&
        item.term === term;

    // =================================================
    // AUTO-INCREMENT YEAR
    // =================================================
    useEffect(() => {
        const syncYear = () => {
            const currentYear = getCurrentYear();

            setPeriod((previous) =>
                previous.year === currentYear
                    ? previous
                    : {
                        year: currentYear,
                        term: getCurrentTerm(),
                    }
            );
        };

        const timer = setInterval(syncYear, 60 * 1000);

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                syncYear();
            }
        };

        document.addEventListener(
            "visibilitychange",
            onVisible
        );

        return () => {
            clearInterval(timer);
            document.removeEventListener(
                "visibilitychange",
                onVisible
            );
        };
    }, []);

    // =================================================
    // LOAD ALL REAL STUDENTS
    // =================================================
    useEffect(() => {
        let cancelled = false;

        const loadStudents = async () => {
            setLoadingStudents(true);
            setStudentsError("");

            try {
                const data = await fetchAllStudents();

                if (cancelled) return;

                setStudents(data);

                // Clear a selected payment student if the
                // student is no longer present in the response.
                setPayForm((previous) => ({
                    ...previous,
                    studentId: data.some(
                        (student) =>
                            String(student.id) ===
                            String(previous.studentId)
                    )
                        ? previous.studentId
                        : "",
                }));
            } catch (error) {
                if (!cancelled) {
                    setStudentsError(friendlyError(error));
                }
            } finally {
                if (!cancelled) {
                    setLoadingStudents(false);
                }
            }
        };

        loadStudents();

        return () => {
            cancelled = true;
        };
    }, []);

    // =================================================
    // FEE PER STUDENT
    //
    // If a student has a special allocation for the
    // selected year and term, that amount replaces the
    // normal class fee.
    // =================================================
    const rows = useMemo(() => {
        return students.map((student) => {
            const studentId = String(student.id);

            const special = specials.find(
                (allocation) =>
                    String(allocation.studentId) === studentId &&
                    Number(allocation.year) === year &&
                    allocation.term === term
            );

            const standardFee = fees.find(
                (fee) =>
                    normalizeClass(fee.level) ===
                    normalizeClass(student.level) &&
                    Number(fee.year) === year &&
                    fee.term === term
            );

            const standard = Number(
                standardFee?.amount || 0
            );

            // Use special.amount even when it is zero.
            // A zero special allocation means fully waived.
            const due = special
                ? Number(special.amount || 0)
                : standard;

            const studentPayments = payments.filter(
                (payment) =>
                    String(payment.studentId) === studentId &&
                    Number(payment.year) === year &&
                    payment.term === term
            );

            const paid = studentPayments.reduce(
                (sum, payment) =>
                    sum + Number(payment.amount || 0),
                0
            );

            const balance = Math.max(due - paid, 0);

            const status =
                due === 0
                    ? "No fee"
                    : balance === 0
                        ? "Paid"
                        : paid > 0
                            ? "Partial"
                            : "Unpaid";

            return {
                ...student,
                id: studentId,
                special,
                due,
                paid,
                balance,
                status,
                methods: [
                    ...new Set(
                        studentPayments
                            .map((payment) => payment.method)
                            .filter(Boolean)
                    ),
                ],
            };
        });
    }, [students, fees, specials, payments, year, term]);

    // =================================================
    // FINANCIAL SUMMARY
    // =================================================
    const totals = useMemo(() => {
        const expected = rows.reduce(
            (sum, row) => sum + row.due,
            0
        );

        const collected = rows.reduce(
            (sum, row) => sum + row.paid,
            0
        );

        const balance = rows.reduce(
            (sum, row) => sum + row.balance,
            0
        );

        return {
            expected,
            collected,
            balance,
            rate: expected
                ? Math.round((collected / expected) * 100)
                : 0,
        };
    }, [rows]);

    // =================================================
    // CURRENT-PERIOD FEES AND ALLOCATIONS
    // =================================================
    const periodFees = useMemo(
        () =>
            fees
                .filter(
                    (fee) =>
                        Number(fee.year) === year &&
                        fee.term === term
                )
                .sort(
                    (a, b) =>
                        CLASS_OPTIONS.indexOf(a.level) -
                        CLASS_OPTIONS.indexOf(b.level)
                ),
        [fees, year, term]
    );

    const periodSpecials = specials.filter(
        (allocation) =>
            Number(allocation.year) === year &&
            allocation.term === term
    );

    const previous = getPreviousPeriod(year, term);

    const previousFees = fees.filter(
        (fee) =>
            Number(fee.year) === previous.year &&
            fee.term === previous.term
    );

    // =================================================
    // LOAD CLASS FEES
    // =================================================
    useEffect(() => {
        let cancelled = false;

        const loadFees = async () => {
            const prev = getPreviousPeriod(year, term);

            setLoadingFees(true);
            setFeesError("");

            try {
                const [current, before] = await Promise.all([
                    fetchClassFees(year, term),
                    fetchClassFees(prev.year, prev.term),
                ]);

                if (cancelled) return;

                setStudentCounts(current.studentCounts);

                setFees((old) => [
                    ...old.filter(
                        (fee) =>
                            !(
                                Number(fee.year) === year &&
                                fee.term === term
                            ) &&
                            !(
                                Number(fee.year) === prev.year &&
                                fee.term === prev.term
                            )
                    ),
                    ...current.fees,
                    ...before.fees,
                ]);
            } catch (error) {
                if (!cancelled) {
                    setFeesError(friendlyError(error));
                }
            } finally {
                if (!cancelled) {
                    setLoadingFees(false);
                }
            }
        };

        loadFees();

        return () => {
            cancelled = true;
        };
    }, [year, term]);

    // =================================================
    // LOAD SPECIAL ALLOCATIONS
    // =================================================
    useEffect(() => {
        let cancelled = false;

        const loadSpecials = async () => {
            setLoadingSpecials(true);
            setSpecialsError("");

            try {
                const data = await fetchSpecialAllocations(
                    year,
                    term
                );

                if (cancelled) return;

                setSpecials((old) => [
                    ...old.filter(
                        (allocation) =>
                            !(
                                Number(allocation.year) === year &&
                                allocation.term === term
                            )
                    ),
                    ...data,
                ]);
            } catch (error) {
                if (!cancelled) {
                    setSpecialsError(friendlyError(error));
                }
            } finally {
                if (!cancelled) {
                    setLoadingSpecials(false);
                }
            }
        };

        loadSpecials();

        return () => {
            cancelled = true;
        };
    }, [year, term]);

    // =================================================
    // LOAD REAL STUDENTS FOR SPECIAL ALLOCATION FORM
    // =================================================
    useEffect(() => {
        let cancelled = false;

        const loadStudents = async () => {
            setSpecialStudents([]);

            setSpecialForm((previous) => ({
                ...previous,
                studentId: "",
            }));

            if (!specialForm.level) {
                setLoadingSpecialStudents(false);
                return;
            }

            setLoadingSpecialStudents(true);
            setSpecialsError("");

            try {
                const data = await fetchStudentsByClass(
                    specialForm.level
                );

                if (!cancelled) {
                    setSpecialStudents(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setSpecialsError(friendlyError(error));
                    flash("error", friendlyError(error));
                }
            } finally {
                if (!cancelled) {
                    setLoadingSpecialStudents(false);
                }
            }
        };

        loadStudents();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [specialForm.level]);

    // =================================================
    // SEARCH AND FILTERS
    // =================================================
    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();

        return rows.filter(
            (row) =>
                (
                    query === "" ||
                    row.name.toLowerCase().includes(query) ||
                    row.id.toLowerCase().includes(query)
                ) &&
                (
                    classFilter === "" ||
                    row.level === classFilter
                ) &&
                (
                    methodFilter === "" ||
                    row.methods.includes(methodFilter)
                ) &&
                (
                    statusFilter === "" ||
                    row.status === statusFilter
                )
        );
    }, [
        rows,
        search,
        classFilter,
        methodFilter,
        statusFilter,
    ]);

    // =================================================
    // TERM CHANGE
    // =================================================
    const handleTermChange = (event) => {
        setPeriod((previous) => ({
            ...previous,
            term: event.target.value,
        }));

        setEditingFee(null);
        setFeeForm({ level: "", amount: "" });
        setMessage(null);
    };

    // =================================================
    // 1. SET / EDIT CLASS FEE
    // =================================================
    const handleSaveFee = async (event) => {
        event.preventDefault();

        if (savingFee) return;

        const amount = Number(feeForm.amount);

        if (
            !feeForm.level ||
            feeForm.amount === "" ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return flash(
                "error",
                "Choose a class and enter a fee above zero."
            );
        }

        setSavingFee(true);

        try {
            const payload = {
                year,
                term,
                level: feeForm.level,
                amount,
            };

            const data = editingFee
                ? await apiRequest(
                    `/api/class-fees/${editingFee.id}`,
                    {
                        method: "PUT",
                        body: payload,
                    }
                )
                : await apiRequest("/api/class-fees", {
                    method: "POST",
                    body: payload,
                });

            if (!data.fee) {
                throw new Error(
                    "The server did not return the saved class fee."
                );
            }

            const saved = normalizeFee(data.fee);

            setFees((previous) => [
                ...previous.filter(
                    (fee) =>
                        fee.id !== saved.id &&
                        !(
                            fee.level === saved.level &&
                            Number(fee.year) === saved.year &&
                            fee.term === saved.term
                        )
                ),
                saved,
            ]);

            flash(
                "success",
                data.message ||
                `${saved.level} fee for ${term}, ${year} is now ${money(saved.amount)}.`
            );

            setFeeForm({ level: "", amount: "" });
            setEditingFee(null);
        } catch (error) {
            flash("error", friendlyError(error));
        } finally {
            setSavingFee(false);
        }
    };

    const handleEditFee = (fee) => {
        setEditingFee(fee);

        setFeeForm({
            level: fee.level,
            amount: String(fee.amount),
        });

        setMessage(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelEdit = () => {
        setEditingFee(null);
        setFeeForm({ level: "", amount: "" });
    };

    // =================================================
    // DELETE CLASS FEE
    // =================================================
    const handleDeleteFee = async (fee) => {
        if (deletingId !== null) return;

        if (
            !window.confirm(
                `Remove the ${fee.level} fee for ${fee.term}, ${fee.year}?`
            )
        ) {
            return;
        }

        setDeletingId(fee.id);

        try {
            const data = await apiRequest(
                `/api/class-fees/${fee.id}`,
                { method: "DELETE" }
            );

            setFees((previous) =>
                previous.filter((item) => item.id !== fee.id)
            );

            if (editingFee?.id === fee.id) {
                handleCancelEdit();
            }

            flash(
                "success",
                data.message || `${fee.level} fee removed.`
            );
        } catch (error) {
            flash("error", friendlyError(error));
        } finally {
            setDeletingId(null);
        }
    };

    // =================================================
    // COPY PREVIOUS TERM FEES
    // =================================================
    const handleCopyPreviousFees = async () => {
        if (copying) return;

        const toCopy = previousFees.filter(
            (previousFee) =>
                !periodFees.some(
                    (fee) => fee.level === previousFee.level
                )
        );

        if (toCopy.length === 0) {
            return flash(
                "error",
                `No fees to copy from ${previous.term}, ${previous.year}.`
            );
        }

        setCopying(true);

        try {
            const results = await Promise.allSettled(
                toCopy.map((fee) =>
                    apiRequest("/api/class-fees", {
                        method: "POST",
                        body: {
                            year,
                            term,
                            level: fee.level,
                            amount: fee.amount,
                        },
                    })
                )
            );

            const saved = results
                .filter(
                    (result) => result.status === "fulfilled"
                )
                .map((result) =>
                    normalizeFee(result.value.fee)
                )
                .filter((fee) => fee.id !== undefined);

            const failed = results.length - saved.length;

            if (saved.length > 0) {
                setFees((previousFees) => [
                    ...previousFees.filter(
                        (fee) =>
                            !saved.some(
                                (item) =>
                                    item.id === fee.id ||
                                    (
                                        item.level === fee.level &&
                                        item.year === Number(fee.year) &&
                                        item.term === fee.term
                                    )
                            )
                    ),
                    ...saved,
                ]);
            }

            if (failed > 0) {
                flash(
                    "error",
                    `Copied ${saved.length} fee(s), but ${failed} could not be saved.`
                );
            } else {
                flash(
                    "success",
                    `Copied ${saved.length} class fee(s) from ${previous.term}, ${previous.year}.`
                );
            }
        } catch (error) {
            flash("error", friendlyError(error));
        } finally {
            setCopying(false);
        }
    };

    // =================================================
    // 2. CREATE SPECIAL ALLOCATION
    // =================================================
    const handleSaveSpecial = async (event) => {
        event.preventDefault();

        if (savingSpecial) return;

        const amount = Number(specialForm.amount);
        const studentId = String(specialForm.studentId || "");

        if (
            !specialForm.level ||
            !studentId ||
            specialForm.amount === "" ||
            !Number.isFinite(amount) ||
            amount < 0
        ) {
            return flash(
                "error",
                "Choose a class, a student and enter the special fee. Enter 0 for a full waiver."
            );
        }

        const selectedStudent = specialStudents.find(
            (student) => String(student.id) === studentId
        );

        if (!selectedStudent) {
            return flash(
                "error",
                "The selected student could not be found. Please select the student again."
            );
        }

        const payload = {
            year,
            term,
            level: specialForm.level,
            student_id: studentId,
            amount,
            reason:
                specialForm.reason.trim() || "Special case",
        };

        setSavingSpecial(true);

        try {
            const data = await saveSpecialAllocation(payload);

            if (!data.allocation) {
                throw new Error(
                    "The server did not return the saved allocation."
                );
            }

            const saved = normalizeSpecial(data.allocation);

            setSpecials((previous) => [
                ...previous.filter(
                    (item) =>
                        !(
                            String(item.studentId) ===
                            saved.studentId &&
                            Number(item.year) === saved.year &&
                            item.term === saved.term
                        )
                ),
                saved,
            ]);

            flash(
                "success",
                data.message ||
                `${selectedStudent.name} now has a special fee of ${money(amount)}.`
            );

            setSpecialForm((previous) => ({
                ...previous,
                studentId: "",
                amount: "",
                reason: "",
            }));
        } catch (error) {
            flash("error", friendlyError(error));
        } finally {
            setSavingSpecial(false);
        }
    };

    // =================================================
    // DELETE SPECIAL ALLOCATION
    // =================================================
    const handleRemoveSpecial = async (allocation) => {
        if (deletingSpecialId !== null) return;

        const studentName =
            allocation.studentName ||
            students.find(
                (student) =>
                    String(student.id) ===
                    String(allocation.studentId)
            )?.name ||
            `Student ${allocation.studentId}`;

        if (
            !window.confirm(
                `Remove the special allocation for ${studentName} (${allocation.term}, ${allocation.year})?`
            )
        ) {
            return;
        }

        setDeletingSpecialId(allocation.id);

        try {
            const data = await deleteSpecialAllocation(
                allocation.id
            );

            setSpecials((previous) =>
                previous.filter(
                    (item) => item.id !== allocation.id
                )
            );

            flash(
                "success",
                data.message || "Special allocation removed."
            );
        } catch (error) {
            flash("error", friendlyError(error));
        } finally {
            setDeletingSpecialId(null);
        }
    };

    // =================================================
    // 3. RECORD PAYMENT
    //
    // Uses a REAL student ID and the balance calculated
    // from the class fee or special allocation.
    //
    // IMPORTANT: this remains frontend-only until a
    // real payment backend endpoint is connected.
    // =================================================
    const handleRecordPayment = (event) => {
        event.preventDefault();

        const amount = Number(payForm.amount);
        const studentId = String(payForm.studentId || "");

        const row = rows.find(
            (item) => String(item.id) === studentId
        );

        if (
            !row ||
            payForm.amount === "" ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !payForm.method
        ) {
            return flash(
                "error",
                "Choose a student, enter an amount and select a payment method."
            );
        }

        if (row.due === 0) {
            return flash(
                "error",
                row.special
                    ? `${row.name} has a fully waived fee for ${term}, ${year}.`
                    : `No class fee is set for ${row.level} in ${term}, ${year}. Set the class fee first.`
            );
        }

        if (row.balance <= 0) {
            return flash(
                "error",
                `${row.name} has no outstanding balance for ${term}, ${year}.`
            );
        }

        if (amount > row.balance) {
            return flash(
                "error",
                `${row.name} only owes ${money(row.balance)}.`
            );
        }

        const newPayment = {
            id: `local-${Date.now()}-${studentId}`,
            studentId,
            year,
            term,
            amount,
            method: payForm.method,
            reference: payForm.reference.trim(),
            date: new Date().toISOString().slice(0, 10),
        };

        setPayments((previous) => [
            ...previous,
            newPayment,
        ]);

        flash(
            "success",
            `${money(amount)} received from ${row.name}. Note: this payment is currently held in frontend state and is not yet saved to the backend.`
        );

        setPayForm({
            studentId: "",
            amount: "",
            method: "",
            reference: "",
        });
    };

    // =================================================
    // DELETE FRONTEND-ONLY PAYMENT RECORDS
    // =================================================
    const handleDeletePayments = (row) => {
        const studentId = String(row.id);

        const studentPayments = payments.filter(
            (payment) =>
                String(payment.studentId) === studentId &&
                Number(payment.year) === year &&
                payment.term === term
        );

        if (studentPayments.length === 0) return;

        const total = studentPayments.reduce(
            (sum, payment) =>
                sum + Number(payment.amount || 0),
            0
        );

        if (
            !window.confirm(
                `Delete ${studentPayments.length} locally recorded payment(s) totalling ${money(total)} for ${row.name} in ${term}, ${year}?`
            )
        ) {
            return;
        }

        setPayments((previous) =>
            previous.filter(
                (payment) =>
                    !(
                        String(payment.studentId) === studentId &&
                        Number(payment.year) === year &&
                        payment.term === term
                    )
            )
        );

        flash(
            "success",
            `Local payment records for ${row.name} have been removed.`
        );
    };

    const payStudent = rows.find(
        (row) =>
            String(row.id) === String(payForm.studentId)
    );

    // =================================================
    // RENDER
    // =================================================
    return (
        <Layout role="admin">
            <div className="fee-set-content">
                {/* HEADER */}
                <header className="fs-page-header">
                    <div className="fs-header-text">
                        <h1 className="fs-title">
                            Fee Management
                        </h1>

                        <h2 className="fs-subtitle">
                            Set class fees, allocate special cases and track payments
                        </h2>
                    </div>

                    <div className="fs-period">
                        <div className="fs-control">
                            <span className="fs-control-label">
                                Academic Year
                            </span>
                            <div className="fs-year-display">
                                {year}
                            </div>
                        </div>

                        <div className="fs-control">
                            <span className="fs-control-label">
                                Active Term
                            </span>
                            <div className="fs-year-display">
                                {term}
                            </div>
                        </div>
                    </div>
                </header>

                {/* SUMMARY */}
                <section className="fs-summary">
                    <div className="fs-stat fs-stat--blue">
                        <span className="fs-stat-icon">
                            <FaMoneyBillWave />
                        </span>
                        <div>
                            <div className="fs-stat-label">
                                Total expected
                            </div>
                            <div className="fs-stat-value">
                                {money(totals.expected)}
                            </div>
                        </div>
                    </div>

                    <div className="fs-stat fs-stat--green">
                        <span className="fs-stat-icon">
                            <FaWallet />
                        </span>
                        <div>
                            <div className="fs-stat-label">
                                Revenue collected
                            </div>
                            <div className="fs-stat-value">
                                {money(totals.collected)}
                            </div>
                        </div>
                    </div>

                    <div className="fs-stat fs-stat--red">
                        <span className="fs-stat-icon">
                            <FaBalanceScale />
                        </span>
                        <div>
                            <div className="fs-stat-label">
                                Total balance
                            </div>
                            <div className="fs-stat-value">
                                {money(totals.balance)}
                            </div>
                        </div>
                    </div>

                    <div className="fs-stat fs-stat--yellow">
                        <span className="fs-stat-icon">
                            <FaPercentage />
                        </span>
                        <div className="fs-stat-grow">
                            <div className="fs-stat-label">
                                Collection rate
                            </div>
                            <div className="fs-stat-value">
                                {totals.rate}%
                            </div>
                            <div className="fs-progress">
                                <span
                                    style={{
                                        width: `${Math.min(
                                            totals.rate,
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* THREE FORM CARDS */}
                <div className="fs-form-grid">
                    {/* SET CLASS FEE */}
                    <form
                        className="fs-fieldset fs-accent-blue"
                        onSubmit={handleSaveFee}
                    >
                        <h3 className="fs-legend">
                            {editingFee
                                ? "Edit Class Fee"
                                : "Set Class Fee"}
                        </h3>

                        <p className="fs-hint">
                            {editingFee
                                ? `Editing the ${editingFee.level} fee for ${term}, ${year}`
                                : `Fee structure for ${term}, ${year}`}
                        </p>

                        <div className="fs-field-row">
                            <div className="fs-field">
                                <span className="fs-field-label">
                                    Academic year (auto)
                                </span>
                                <div className="fs-year-display">
                                    {year}
                                </div>
                            </div>

                            <label className="fs-field">
                                <span className="fs-field-label">
                                    Term
                                </span>
                                <SelectBox
                                    value={term}
                                    onChange={handleTermChange}
                                >
                                    {TERMS.map((item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    ))}
                                </SelectBox>
                            </label>
                        </div>

                        <label className="fs-field">
                            <span className="fs-field-label">
                                Class
                            </span>
                            <SelectBox
                                value={feeForm.level}
                                onChange={(event) =>
                                    setFeeForm((previous) => ({
                                        ...previous,
                                        level: event.target.value,
                                    }))
                                }
                            >
                                <option value="">
                                    Select a class
                                </option>
                                {CLASS_OPTIONS.map((item) => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                ))}
                            </SelectBox>
                        </label>

                        <label className="fs-field">
                            <span className="fs-field-label">
                                Fee amount (UGX)
                            </span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="e.g. 400000"
                                value={feeForm.amount}
                                onChange={(event) =>
                                    setFeeForm((previous) => ({
                                        ...previous,
                                        amount: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <button
                            type="submit"
                            className="fs-btn-primary"
                            disabled={savingFee}
                        >
                            <FaSave />{" "}
                            {savingFee
                                ? "Saving..."
                                : editingFee
                                    ? "Update class fee"
                                    : "Save class fee"}
                        </button>

                        {editingFee && (
                            <button
                                type="button"
                                className="fs-btn-dark"
                                onClick={handleCancelEdit}
                                disabled={savingFee}
                            >
                                Cancel edit
                            </button>
                        )}
                    </form>

                    {/* SPECIAL ALLOCATION */}
                    <form
                        className="fs-fieldset fs-accent-green"
                        onSubmit={handleSaveSpecial}
                    >
                        <h3 className="fs-legend">
                            Special Allocation
                        </h3>

                        <p className="fs-hint">
                            Bursary, discount or fee waiver for one student ({term}, {year})
                        </p>

                        <label className="fs-field">
                            <span className="fs-field-label">
                                Class
                            </span>
                            <SelectBox
                                value={specialForm.level}
                                onChange={(event) =>
                                    setSpecialForm((previous) => ({
                                        ...previous,
                                        level: event.target.value,
                                        studentId: "",
                                    }))
                                }
                            >
                                <option value="">
                                    Select a class
                                </option>
                                {CLASS_OPTIONS.map((item) => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                ))}
                            </SelectBox>
                        </label>

                        <label className="fs-field">
                            <span className="fs-field-label">
                                Student
                            </span>
                            <SelectBox
                                value={specialForm.studentId}
                                disabled={
                                    !specialForm.level ||
                                    loadingSpecialStudents ||
                                    specialStudents.length === 0
                                }
                                onChange={(event) =>
                                    setSpecialForm((previous) => ({
                                        ...previous,
                                        studentId: event.target.value,
                                    }))
                                }
                            >
                                <option value="">
                                    {!specialForm.level
                                        ? "Select a class first"
                                        : loadingSpecialStudents
                                            ? "Loading students..."
                                            : specialStudents.length === 0
                                                ? "No students in this class"
                                                : "Select a student"}
                                </option>

                                {specialStudents.map((student) => (
                                    <option
                                        key={student.id}
                                        value={student.id}
                                    >
                                        {student.name} ({classLabel(student)})
                                    </option>
                                ))}
                            </SelectBox>
                        </label>

                        <div className="fs-field-row">
                            <label className="fs-field">
                                <span className="fs-field-label">
                                    Special fee (UGX)
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0 = waived"
                                    value={specialForm.amount}
                                    onChange={(event) =>
                                        setSpecialForm((previous) => ({
                                            ...previous,
                                            amount: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label className="fs-field">
                                <span className="fs-field-label">
                                    Reason
                                </span>
                                <input
                                    type="text"
                                    maxLength={255}
                                    placeholder="Bursary"
                                    value={specialForm.reason}
                                    onChange={(event) =>
                                        setSpecialForm((previous) => ({
                                            ...previous,
                                            reason: event.target.value,
                                        }))
                                    }
                                />
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="fs-btn-dark"
                            disabled={
                                savingSpecial ||
                                loadingSpecialStudents
                            }
                        >
                            {savingSpecial
                                ? "Saving allocation..."
                                : "Allocate fee"}
                        </button>

                        {specialsError && (
                            <p role="alert" className="fs-hint">
                                {specialsError}
                            </p>
                        )}

                        {loadingSpecials && (
                            <p className="fs-hint">
                                Loading saved allocations...
                            </p>
                        )}

                        {!loadingSpecials &&
                            periodSpecials.length === 0 && (
                                <p className="fs-hint">
                                    No special allocations saved for {term}, {year}.
                                </p>
                            )}

                        {periodSpecials.length > 0 && (
                            <div className="fs-chip-list">
                                {periodSpecials.map((allocation) => {
                                    const name =
                                        allocation.studentName ||
                                        students.find(
                                            (student) =>
                                                String(student.id) ===
                                                String(allocation.studentId)
                                        )?.name ||
                                        `Student ${allocation.studentId}`;

                                    return (
                                        <span
                                            className="fs-chip"
                                            key={allocation.id}
                                        >
                                            {name}:{" "}
                                            {money(allocation.amount)}{" "}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveSpecial(
                                                        allocation
                                                    )
                                                }
                                                disabled={
                                                    deletingSpecialId ===
                                                    allocation.id
                                                }
                                                aria-label={`Remove special allocation for ${name}`}
                                                title="Remove allocation"
                                            >
                                                {deletingSpecialId ===
                                                allocation.id
                                                    ? "..."
                                                    : <FaTimes />}
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </form>

                    {/* RECORD PAYMENT — REAL STUDENTS */}
                    <form
                        className="fs-fieldset fs-accent-yellow"
                        onSubmit={handleRecordPayment}
                    >
                        <h3 className="fs-legend">
                            Record Payment
                        </h3>

                        <p className="fs-hint">
                            {payStudent
                                ? `${payStudent.name} owes ${money(payStudent.balance)} (${term}, ${year})`
                                : `Select a real student to view their outstanding fee (${term}, ${year}).`}
                        </p>

                        {studentsError && (
                            <p className="fs-hint" role="alert">
                                {studentsError}
                            </p>
                        )}

                        <label className="fs-field">
                            <span className="fs-field-label">
                                Student
                            </span>
                            <SelectBox
                                value={payForm.studentId}
                                disabled={
                                    loadingStudents ||
                                    students.length === 0
                                }
                                onChange={(event) =>
                                    setPayForm((previous) => ({
                                        ...previous,
                                        studentId: event.target.value,
                                    }))
                                }
                            >
                                <option value="">
                                    {loadingStudents
                                        ? "Loading real students..."
                                        : students.length === 0
                                            ? "No students found"
                                            : "Select a student"}
                                </option>

                                {students.map((student) => (
                                    <option
                                        key={student.id}
                                        value={student.id}
                                    >
                                        {student.name} — {classLabel(student)}
                                    </option>
                                ))}
                            </SelectBox>
                        </label>

                        {payStudent && (
                            <div className="fs-hint">
                                <div>
                                    Student ID: <strong>{payStudent.id}</strong>
                                </div>
                                <div>
                                    Fee due: <strong>{money(payStudent.due)}</strong>
                                </div>
                                <div>
                                    Already paid: <strong>{money(payStudent.paid)}</strong>
                                </div>
                                <div>
                                    Outstanding: <strong>{money(payStudent.balance)}</strong>
                                </div>

                                {payStudent.special && (
                                    <div>
                                        Special allocation:{" "}
                                        <strong>
                                            {money(payStudent.special.amount)}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="fs-field-row">
                            <label className="fs-field">
                                <span className="fs-field-label">
                                    Amount (UGX)
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Amount paid"
                                    value={payForm.amount}
                                    onChange={(event) =>
                                        setPayForm((previous) => ({
                                            ...previous,
                                            amount: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label className="fs-field">
                                <span className="fs-field-label">
                                    Method
                                </span>
                                <SelectBox
                                    value={payForm.method}
                                    onChange={(event) =>
                                        setPayForm((previous) => ({
                                            ...previous,
                                            method: event.target.value,
                                        }))
                                    }
                                >
                                    <option value="">
                                        Select method
                                    </option>
                                    {METHODS.map((method) => (
                                        <option
                                            key={method}
                                            value={method}
                                        >
                                            {method}
                                        </option>
                                    ))}
                                </SelectBox>
                            </label>
                        </div>

                        <label className="fs-field">
                            <span className="fs-field-label">
                                Reference (optional)
                            </span>
                            <input
                                type="text"
                                placeholder="Receipt, slip or transaction no."
                                value={payForm.reference}
                                onChange={(event) =>
                                    setPayForm((previous) => ({
                                        ...previous,
                                        reference: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <button
                            type="submit"
                            className="fs-btn-primary"
                            disabled={
                                loadingStudents ||
                                !payForm.studentId
                            }
                        >
                            Record payment
                        </button>

                        <p className="fs-hint">
                            Payment entries are currently temporary and will reset when this page is refreshed.
                        </p>
                    </form>
                </div>

                {/* FEEDBACK */}
                {message && (
                    <div
                        className={`fs-message fs-message--${message.type}`}
                        role={
                            message.type === "error"
                                ? "alert"
                                : "status"
                        }
                    >
                        {message.text}
                    </div>
                )}

                {/* CLASS FEE STRUCTURE */}
                <section className="fs-table-card">
                    <div className="fs-table-header">
                        <h3 className="fs-table-title">
                            Class Fees: {term}, {year}
                        </h3>

                        {previousFees.length > 0 && (
                            <button
                                type="button"
                                className="fs-btn-dark"
                                onClick={handleCopyPreviousFees}
                                disabled={copying}
                            >
                                <FaCopy />{" "}
                                {copying
                                    ? "Copying..."
                                    : `Copy fees from ${previous.term}, ${previous.year}`}
                            </button>
                        )}
                    </div>

                    <div className="fs-table-scroll">
                        <table className="fs-table">
                            <thead>
                            <tr>
                                <th>Class</th>
                                <th>Fee per student</th>
                                <th>Students</th>
                                <th className="fs-actions-col">
                                    Actions
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {periodFees.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="fs-empty-row"
                                    >
                                        {loadingFees
                                            ? "Loading class fees..."
                                            : feesError
                                                ? feesError
                                                : `No class fees set for ${term}, ${year} yet.`}
                                    </td>
                                </tr>
                            )}

                            {periodFees.map((fee) => (
                                <tr key={fee.id}>
                                    <td className="fs-strong">
                                        {fee.level}
                                    </td>
                                    <td>{money(fee.amount)}</td>
                                    <td>
                                        {studentCounts[fee.level] ?? 0}
                                    </td>
                                    <td>
                                        <div className="fs-row-actions">
                                            <button
                                                type="button"
                                                className="fs-icon-btn fs-icon-btn--edit"
                                                onClick={() =>
                                                    handleEditFee(fee)
                                                }
                                                aria-label={`Edit ${fee.level} fee`}
                                            >
                                                <FaEdit />
                                            </button>

                                            <button
                                                type="button"
                                                className="fs-icon-btn fs-icon-btn--delete"
                                                onClick={() =>
                                                    handleDeleteFee(fee)
                                                }
                                                disabled={
                                                    deletingId === fee.id
                                                }
                                                aria-label={`Delete ${fee.level} fee`}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* STUDENT PAYMENTS — REAL STUDENTS */}
                <section className="fs-table-card">
                    <div className="fs-table-header">
                        <h3 className="fs-table-title">
                            Student Payments: {term}, {year}
                        </h3>

                        <div className="fs-controls">
                            <label className="fs-control">
                                <span className="fs-control-label">
                                    Search
                                </span>
                                <div className="fs-search">
                                    <FaSearch className="fs-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Student name or ID"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>
                            </label>

                            <label className="fs-control">
                                <span className="fs-control-label">
                                    Class
                                </span>
                                <SelectBox
                                    value={classFilter}
                                    onChange={(event) =>
                                        setClassFilter(event.target.value)
                                    }
                                >
                                    <option value="">
                                        All classes
                                    </option>
                                    {CLASS_OPTIONS.map((item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    ))}
                                </SelectBox>
                            </label>

                            <label className="fs-control">
                                <span className="fs-control-label">
                                    Method
                                </span>
                                <SelectBox
                                    value={methodFilter}
                                    onChange={(event) =>
                                        setMethodFilter(event.target.value)
                                    }
                                >
                                    <option value="">
                                        All methods
                                    </option>
                                    {METHODS.map((method) => (
                                        <option
                                            key={method}
                                            value={method}
                                        >
                                            {method}
                                        </option>
                                    ))}
                                </SelectBox>
                            </label>

                            <label className="fs-control">
                                <span className="fs-control-label">
                                    Status
                                </span>
                                <SelectBox
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value)
                                    }
                                >
                                    <option value="">All</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="No fee">No fee</option>
                                </SelectBox>
                            </label>
                        </div>
                    </div>

                    <div className="fs-table-scroll">
                        <table className="fs-table">
                            <thead>
                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Fee due</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th className="fs-actions-col">
                                    Actions
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {loadingStudents && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="fs-empty-row"
                                    >
                                        Loading real SchoolOS students...
                                    </td>
                                </tr>
                            )}

                            {!loadingStudents &&
                                filteredRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="fs-empty-row"
                                        >
                                            {studentsError
                                                ? studentsError
                                                : "No students match your search or filters."}
                                        </td>
                                    </tr>
                                )}

                            {!loadingStudents &&
                                filteredRows.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <div className="fs-student-cell">
                                                <div className="fs-avatar">
                                                    {row.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <span className="fs-strong">
                                                        {row.name}
                                                    <small
                                                        style={{
                                                            display: "block",
                                                        }}
                                                    >
                                                            {row.id}
                                                        </small>
                                                    </span>
                                            </div>
                                        </td>

                                        <td>{classLabel(row)}</td>

                                        <td>
                                            {money(row.due)}

                                            {row.special && (
                                                <span
                                                    className="fs-badge fs-badge--special"
                                                    title={
                                                        row.special.reason
                                                    }
                                                >
                                                        Special
                                                    </span>
                                            )}
                                        </td>

                                        <td className="fs-paid">
                                            {money(row.paid)}
                                        </td>

                                        <td
                                            className={
                                                row.balance > 0
                                                    ? "fs-owed"
                                                    : "fs-paid"
                                            }
                                        >
                                            {money(row.balance)}
                                        </td>

                                        <td>
                                            <div className="fs-badges">
                                                {row.methods.length === 0 &&
                                                    "—"}

                                                {row.methods.map(
                                                    (method) => (
                                                        <span
                                                            key={method}
                                                            className={`fs-badge fs-badge--${METHOD_CLASS[method] || "navy"}`}
                                                        >
                                                                {method}
                                                            </span>
                                                    )
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                                <span
                                                    className={`fs-status fs-status--${row.status.replace(" ", "").toLowerCase()}`}
                                                >
                                                    {row.status}
                                                </span>
                                        </td>

                                        <td>
                                            <div className="fs-row-actions">
                                                <button
                                                    type="button"
                                                    className="fs-icon-btn fs-icon-btn--delete"
                                                    onClick={() =>
                                                        handleDeletePayments(
                                                            row
                                                        )
                                                    }
                                                    disabled={
                                                        row.paid === 0
                                                    }
                                                    title={
                                                        row.paid === 0
                                                            ? "No local payments to delete"
                                                            : "Delete local payment records"
                                                    }
                                                    aria-label={`Delete local payments for ${row.name}`}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default FeeSetPage;