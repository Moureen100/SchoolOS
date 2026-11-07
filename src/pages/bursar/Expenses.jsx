
import { useState, useEffect, useCallback } from "react";
import {
    FaPlus,
    FaSyncAlt,
    FaEdit,
    FaTrash,
    FaTimes,
    FaSave
} from "react-icons/fa";

import {
    Page,
    Card,
    Field,
    Message,
    Stat,
    money
} from "./BursarUI";

import "./Expenses.css";


const CATEGORIES = [
    "Salaries",
    "Utilities",
    "Food & Lunch",
    "Stationery",
    "Repairs",
    "Transport",
    "Other"
];

const API = `${import.meta.env.VITE_API_URL}/api/bursar/expenses`;

const today = () => new Date().toISOString().slice(0, 10);


const getToken = () => {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("access_token")
    );
};


export default function Expenses() {

    const [items, setItems] = useState([]);

    const [form, setForm] = useState({
        date: today(),
        category: "",
        note: "",
        amount: ""
    });

    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [summary, setSummary] = useState({
        today_total: 0,
        all_total: 0,
        count: 0
    });

    // =========================================
    // EDIT STATE
    // =========================================

    const [editingId, setEditingId] = useState(null);

    const [editForm, setEditForm] = useState({
        date: "",
        category: "",
        note: "",
        amount: ""
    });

    const [updating, setUpdating] = useState(false);
    const [deletingId, setDeletingId] = useState(null);


    // =========================================
    // LOAD EXPENSES
    // =========================================

    const fetchExpenses = useCallback(async () => {

        setLoading(true);
        setError("");

        try {

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Your login session has expired. Please log in again."
                );
            }

            const response = await fetch(API, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to load expenses."
                );
            }

            setItems(result.expenses || []);

            setSummary({
                today_total: Number(result.summary?.today_total || 0),
                all_total: Number(result.summary?.all_total || 0),
                count: Number(result.summary?.count || 0)
            });

        } catch (err) {

            setError(err.message || "Unable to load expenses.");

        } finally {

            setLoading(false);

        }

    }, []);


    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);


    // =========================================
    // FORM HANDLING
    // =========================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    // =========================================
    // ADD EXPENSE
    // =========================================

    const add = async (e) => {

        e.preventDefault();

        setNotice("");
        setError("");

        if (!form.category || !form.date || !form.amount) {
            setError("Please complete all required fields.");
            return;
        }

        const amount = Number(form.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Enter a valid expense amount.");
            return;
        }

        setSaving(true);

        try {

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Your login session has expired. Please log in again."
                );
            }

            const response = await fetch(API, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    date: form.date,
                    category: form.category,
                    note: form.note.trim(),
                    amount
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to record expense."
                );
            }

            setForm({
                date: today(),
                category: "",
                note: "",
                amount: ""
            });

            setNotice("Expense recorded successfully.");

            await fetchExpenses();

        } catch (err) {

            setError(err.message || "Failed to record expense.");

        } finally {

            setSaving(false);

        }

    };


    // =========================================
    // OPEN EDIT FORM
    // =========================================

    const startEdit = (item) => {

        setNotice("");
        setError("");

        setEditingId(item.id);

        setEditForm({
            date: item.date || "",
            category: item.category || "",
            note: item.note || "",
            amount: String(item.amount || "")
        });

    };


    // =========================================
    // HANDLE EDIT FORM
    // =========================================

    const handleEditChange = (e) => {

        const { name, value } = e.target;

        setEditForm((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    // =========================================
    // CANCEL EDIT
    // =========================================

    const cancelEdit = () => {

        setEditingId(null);

        setEditForm({
            date: "",
            category: "",
            note: "",
            amount: ""
        });

    };


    // =========================================
    // UPDATE EXPENSE
    // PUT /api/bursar/expenses/<expense_id>
    // =========================================

    const updateExpense = async (e) => {

        e.preventDefault();

        setNotice("");
        setError("");

        if (
            !editForm.date ||
            !editForm.category ||
            !editForm.amount
        ) {
            setError("Please complete all required fields.");
            return;
        }

        const amount = Number(editForm.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Enter a valid expense amount.");
            return;
        }

        setUpdating(true);

        try {

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Your login session has expired. Please log in again."
                );
            }

            const response = await fetch(
                `${API}/${editingId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        date: editForm.date,
                        category: editForm.category,
                        note: editForm.note.trim(),
                        amount
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to update expense."
                );
            }

            setEditingId(null);

            setEditForm({
                date: "",
                category: "",
                note: "",
                amount: ""
            });

            setNotice("Expense updated successfully.");

            await fetchExpenses();

        } catch (err) {

            setError(err.message || "Failed to update expense.");

        } finally {

            setUpdating(false);

        }

    };


    // =========================================
    // DELETE EXPENSE
    // DELETE /api/bursar/expenses/<expense_id>
    // =========================================

    const deleteExpense = async (item) => {

        const confirmed = window.confirm(
            `Are you sure you want to delete this expense?\n\n${item.category} - ${money(Number(item.amount))}`
        );

        if (!confirmed) {
            return;
        }

        setNotice("");
        setError("");

        setDeletingId(item.id);

        try {

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Your login session has expired. Please log in again."
                );
            }

            const response = await fetch(
                `${API}/${item.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to delete expense."
                );
            }

            if (editingId === item.id) {
                cancelEdit();
            }

            setNotice("Expense deleted successfully.");

            await fetchExpenses();

        } catch (err) {

            setError(err.message || "Failed to delete expense.");

        } finally {

            setDeletingId(null);

        }

    };


    // =========================================
    // DASHBOARD
    // =========================================

    return (

        <Page
            className="expenses-content"
            title="Expenses"
            subtitle="Record and monitor what the school spends"
        >

            <Message text={notice} />

            {error && (
                <div
                    style={{
                        padding: "12px 16px",
                        marginBottom: "16px",
                        borderRadius: "10px",
                        background: "#FEE2E2",
                        color: "#991B1B",
                        fontSize: "14px"
                    }}
                >
                    {error}
                </div>
            )}


            <div className="bs-grid">

                {/* TODAY'S EXPENDITURE */}

                <Stat
                    label="Spent today"
                    value={money(summary.today_total)}
                    accent="navy"
                />


                {/* TOTAL EXPENDITURE */}

                <Stat
                    label="Total recorded"
                    value={money(summary.all_total)}
                    accent="blue"
                />


                {/* ADD EXPENSE */}

                <Card
                    title="Add Expense"
                    accent="yellow"
                    wide
                >

                    <form
                        onSubmit={add}
                        style={{ display: "contents" }}
                    >

                        <div className="bs-row">

                            <Field label="Date">

                                <input
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                />

                            </Field>


                            <Field label="Category">

                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    required
                                >

                                    <option value="">
                                        Select category
                                    </option>

                                    {CATEGORIES.map((category) => (

                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>

                                    ))}

                                </select>

                            </Field>

                        </div>


                        <div className="bs-row">

                            <Field label="Amount (UGX)">

                                <input
                                    type="number"
                                    name="amount"
                                    min="1"
                                    step="0.01"
                                    placeholder="Enter amount"
                                    value={form.amount}
                                    onChange={handleChange}
                                    required
                                />

                            </Field>


                            <Field label="Note">

                                <input
                                    type="text"
                                    name="note"
                                    maxLength="500"
                                    placeholder="Expense description"
                                    value={form.note}
                                    onChange={handleChange}
                                />

                            </Field>

                        </div>


                        <button
                            type="submit"
                            className="bs-primary"
                            style={{ alignSelf: "flex-start" }}
                            disabled={
                                saving ||
                                !form.category ||
                                !form.amount ||
                                Number(form.amount) <= 0
                            }
                        >

                            <FaPlus />

                            {saving
                                ? "Recording..."
                                : "Add Expense"}

                        </button>

                    </form>

                </Card>


                {/* EXPENSE LIST */}

                <Card
                    title="Expense List"
                    accent="green"
                    wide
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px",
                            gap: "12px"
                        }}
                    >

                        <span
                            style={{
                                fontSize: "13px",
                                color: "#64748B"
                            }}
                        >
                            {summary.count} recorded expenses
                        </span>


                        <button
                            type="button"
                            onClick={fetchExpenses}
                            disabled={loading}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "9px 13px",
                                border: "1px solid #E2E8F0",
                                borderRadius: "8px",
                                background: "#fff",
                                cursor: "pointer"
                            }}
                        >

                            <FaSyncAlt />

                            Refresh

                        </button>

                    </div>


                    <div className="bs-scroll">

                        <table className="bs-table">

                            <thead>

                            <tr>

                                <th>Date</th>

                                <th>Category</th>

                                <th>Note</th>

                                <th className="bs-num">
                                    Amount (UGX)
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                            </thead>


                            <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        style={{
                                            textAlign: "center",
                                            padding: "25px"
                                        }}
                                    >
                                        Loading expenses...
                                    </td>

                                </tr>

                            ) : items.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        style={{
                                            textAlign: "center",
                                            padding: "25px"
                                        }}
                                    >
                                        No expenses recorded yet.
                                    </td>

                                </tr>

                            ) : (

                                items.map((item) => (

                                    <tr key={item.id}>

                                        <td>
                                            {item.date}
                                        </td>

                                        <td>
                                            {item.category}
                                        </td>

                                        <td>
                                            {item.note || "—"}
                                        </td>

                                        <td className="bs-num">
                                            {money(Number(item.amount))}
                                        </td>

                                        <td>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px"
                                                }}
                                            >

                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(item)}
                                                    title="Edit expense"
                                                    disabled={
                                                        updating ||
                                                        deletingId !== null
                                                    }
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "6px",
                                                        padding: "8px 10px",
                                                        border: "1px solid #DBEAFE",
                                                        borderRadius: "7px",
                                                        background: "#EFF6FF",
                                                        color: "#1D4ED8",
                                                        cursor: "pointer"
                                                    }}
                                                >

                                                    <FaEdit />

                                                    Edit

                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={() => deleteExpense(item)}
                                                    title="Delete expense"
                                                    disabled={
                                                        deletingId !== null ||
                                                        updating
                                                    }
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "6px",
                                                        padding: "8px 10px",
                                                        border: "1px solid #FECACA",
                                                        borderRadius: "7px",
                                                        background: "#FEF2F2",
                                                        color: "#DC2626",
                                                        cursor: "pointer"
                                                    }}
                                                >

                                                    <FaTrash />

                                                    {deletingId === item.id
                                                        ? "Deleting..."
                                                        : "Delete"}

                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))

                            )}

                            </tbody>

                        </table>

                    </div>


                    {/* ================================= */}
                    {/* EDIT EXPENSE FORM */}
                    {/* ================================= */}

                    {editingId !== null && (

                        <div
                            style={{
                                marginTop: "22px",
                                padding: "20px",
                                border: "1px solid #E2E8F0",
                                borderRadius: "12px",
                                background: "#F8FAFC"
                            }}
                        >

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginBottom: "18px"
                                }}
                            >

                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: "16px",
                                        color: "#0F172A"
                                    }}
                                >
                                    Edit Expense
                                </h3>


                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={updating}
                                    title="Close edit form"
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor: "pointer",
                                        color: "#64748B",
                                        fontSize: "17px"
                                    }}
                                >

                                    <FaTimes />

                                </button>

                            </div>


                            <form onSubmit={updateExpense}>

                                <div className="bs-row">

                                    <Field label="Date">

                                        <input
                                            type="date"
                                            name="date"
                                            value={editForm.date}
                                            onChange={handleEditChange}
                                            required
                                        />

                                    </Field>


                                    <Field label="Category">

                                        <select
                                            name="category"
                                            value={editForm.category}
                                            onChange={handleEditChange}
                                            required
                                        >

                                            <option value="">
                                                Select category
                                            </option>

                                            {CATEGORIES.map((category) => (

                                                <option
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </option>

                                            ))}

                                        </select>

                                    </Field>

                                </div>


                                <div className="bs-row">

                                    <Field label="Amount (UGX)">

                                        <input
                                            type="number"
                                            name="amount"
                                            min="1"
                                            step="0.01"
                                            placeholder="Enter amount"
                                            value={editForm.amount}
                                            onChange={handleEditChange}
                                            required
                                        />

                                    </Field>


                                    <Field label="Note">

                                        <input
                                            type="text"
                                            name="note"
                                            maxLength="500"
                                            placeholder="Expense description"
                                            value={editForm.note}
                                            onChange={handleEditChange}
                                        />

                                    </Field>

                                </div>


                                <div
                                    style={{
                                        display: "flex",
                                        gap: "10px",
                                        flexWrap: "wrap",
                                        marginTop: "12px"
                                    }}
                                >

                                    <button
                                        type="submit"
                                        className="bs-primary"
                                        disabled={
                                            updating ||
                                            !editForm.category ||
                                            !editForm.date ||
                                            !editForm.amount ||
                                            Number(editForm.amount) <= 0
                                        }
                                    >

                                        <FaSave />

                                        {updating
                                            ? "Saving Changes..."
                                            : "Save Changes"}

                                    </button>


                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        disabled={updating}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "10px 16px",
                                            border: "1px solid #CBD5E1",
                                            borderRadius: "8px",
                                            background: "#fff",
                                            color: "#475569",
                                            cursor: "pointer"
                                        }}
                                    >

                                        <FaTimes />

                                        Cancel

                                    </button>

                                </div>

                            </form>

                        </div>

                    )}

                </Card>

            </div>

        </Page>

    );

}
