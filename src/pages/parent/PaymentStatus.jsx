import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  FiCheckCircle, FiClock, FiAlertCircle, FiCalendar, FiCreditCard,
  FiInbox, FiHash, FiSmartphone, FiLock, FiX, FiArrowRight,
  FiCopy, FiPhone, FiMail, FiRefreshCw,
} from "react-icons/fi";

import Layout from "../../Layout";
import "./PaymentStatus.css";

/* =========================================================
   PAYMENT STATUS (parent view)
   One parent = one child. The parent can pay here, see the
   payments already made, and what is still to pay.

   FRONT-END ONLY: dummy data. Paying adds an
   "Awaiting confirmation" payment to the list. Replace the
   marked spots with real fetch calls when the backend is live.
========================================================= */

const CHILD = { student_id: "s1", student_name: "Amina Nakato", class_name: "P.2", term: "Term 3, 2026" };

const DUMMY_RECORD = {
  total_fees: 1200000,
  items: [
    { id: "i1", name: "Tuition", amount: 800000, paid: 600000, due: "2026-10-20" },
    { id: "i2", name: "Lunch programme", amount: 250000, paid: 250000, due: "2026-09-15" },
    { id: "i3", name: "Transport", amount: 150000, paid: 0, due: "2026-10-01" },
  ],
  payments: [
    { id: "p1", date: "2026-08-28", amount: 450000, method: "Mobile Money", reference: "MM-48213907", status: "Confirmed" },
    { id: "p2", date: "2026-09-22", amount: 400000, method: "Airtel Money", reference: "AM-110582", status: "Confirmed" },
    { id: "p3", date: "2026-10-06", amount: 100000, method: "Mobile Money", reference: "MM-50917736", status: "Awaiting confirmation" },
  ],
};

const PAY_INFO = {
  provider: "PayHub",
  ussd: "*284*77#",
  studentCode: "PS-2026-0142",
  networks: ["MTN MoMo", "Airtel Money"],
  steps: [
    "Dial the code and choose School fees.",
    "Enter the student code shown above.",
    "Enter the amount you want to pay.",
    "Approve with your Mobile Money PIN.",
  ],
};

const BURSAR = {
  name: "Mrs. Namukasa, School Bursar",
  phone: "0772 000 111",
  email: "bursar@school.example",
  hours: "Mon to Fri, 8:00 am to 4:30 pm",
};

const METHODS = {
  mobile: { label: "Mobile Money", icon: <FiSmartphone />, prefix: "MM" },
  card: { label: "Card", icon: <FiCreditCard />, prefix: "CD" },
};

/* ===================== HELPERS ===================== */

const money = (n) => `UGX ${Number(n || 0).toLocaleString("en-US")}`;
const parseDay = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDate = (iso) =>
    parseDay(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const EMPTY_FORM = { itemId: "all", amount: "", method: "mobile", phone: "", error: "" };

/* ===================== PAGE ===================== */

export default function PaymentStatus() {
  const rootRef = useRef(null);
  const [cssMissing, setCssMissing] = useState(false);

  const [record, setRecord] = useState(DUMMY_RECORD);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/payments/status")
    //   .then((res) => res.json())
    //   .then((data) => setRecord(data));
  }, []);

  useEffect(() => {
    const v = rootRef.current && getComputedStyle(rootRef.current).getPropertyValue("--payx-navy").trim();
    setCssMissing(!v);
  }, []);

  const summary = useMemo(() => {
    const confirmed = record.payments.filter((p) => p.status === "Confirmed");
    const awaiting = record.payments.filter((p) => p.status !== "Confirmed");
    const paid = confirmed.reduce((s, p) => s + p.amount, 0);
    const awaitingTotal = awaiting.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, record.total_fees - paid);
    const payable = Math.max(0, balance - awaitingTotal);
    const percent = record.total_fees ? Math.min(100, Math.round((paid / record.total_fees) * 100)) : 0;
    const today = startOfToday();
    const pending = record.items
        .map((i) => ({ ...i, outstanding: i.amount - i.paid, overdue: parseDay(i.due) < today }))
        .filter((i) => i.outstanding > 0)
        .sort((a, b) => parseDay(a.due) - parseDay(b.due));
    const history = [...record.payments].sort((a, b) => parseDay(b.date) - parseDay(a.date));
    const overdueItems = pending.filter((i) => i.overdue);
    const overdueTotal = overdueItems.reduce((s, i) => s + i.outstanding, 0);
    const nextDue = pending.find((i) => !i.overdue) || null;
    const lastPayment = [...confirmed].sort((a, b) => parseDay(b.date) - parseDay(a.date))[0] || null;
    return {
      paid, awaitingTotal, awaitingCount: awaiting.length, balance, payable, percent, pending, history,
      overdueTotal, overdueCount: overdueItems.length, nextDue, lastPayment,
    };
  }, [record]);

  const shownHistory = summary.history.filter((p) =>
      filter === "all" ? true : filter === "confirmed" ? p.status === "Confirmed" : p.status !== "Confirmed");

  /* ---------- payment form ---------- */
  const selectedItem = summary.pending.find((i) => i.id === form.itemId);
  const maxAmount = selectedItem ? Math.min(selectedItem.outstanding, summary.payable) : summary.payable;
  const amountNum = Number(form.amount);

  const setField = (patch) => setForm((f) => ({ ...f, ...patch, error: "" }));

  const startPay = (e) => {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) return setForm({ ...form, error: "Enter the amount you want to pay." });
    if (amountNum > maxAmount) return setForm({ ...form, error: `The most you can pay now is ${money(maxAmount)}.` });
    if (form.method === "mobile" && !/^(\+?256|0)\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
      return setForm({ ...form, error: "Enter a valid Mobile Money number, e.g. 0772 123 456." });
    }
    setConfirming(true);
  };

  const confirmPay = () => {
    setPaying(true);
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/payments/pay", { method: "POST", ... })
    setTimeout(() => {
      const m = METHODS[form.method];
      const payment = {
        id: `p${Date.now()}`,
        date: todayIso(),
        amount: amountNum,
        method: m.label,
        reference: `${m.prefix}-${Math.floor(10000000 + Math.random() * 89999999)}`,
        status: "Awaiting confirmation",
        itemId: form.itemId,
      };
      setRecord((r) => ({ ...r, payments: [...r.payments, payment] }));
      setNotice(`Payment of ${money(amountNum)} started. Reference ${payment.reference}. ` + (form.method === "mobile" ? "Check your phone and approve with your Mobile Money PIN." : "Complete the secure card step to finish."));
      setForm(EMPTY_FORM);
      setPaying(false);
      setConfirming(false);
      setFilter("all");
    }, 1200);
  };

  /* Re-check awaiting payments. On the real system the aggregator calls
     your backend when a payment succeeds, and this just reloads the data. */
  const checkStatus = () => {
    setChecking(true);
    // ---- Ready to enable once the backend is live. ----
    // fetch("http://localhost:5000/api/payments/status").then((res) => res.json()).then(setRecord);
    setTimeout(() => {
      setRecord((r) => {
        const items = r.items.map((i) => ({ ...i }));
        const payments = r.payments.map((p) => {
          if (p.status === "Confirmed") return p;
          let left = p.amount;
          const targets = p.itemId && p.itemId !== "all"
              ? items.filter((i) => i.id === p.itemId)
              : items.filter((i) => i.paid < i.amount).sort((a, b) => parseDay(a.due) - parseDay(b.due));
          targets.forEach((i) => {
            const take = Math.min(left, i.amount - i.paid);
            i.paid += take;
            left -= take;
          });
          return { ...p, status: "Confirmed" };
        });
        return { ...r, items, payments };
      });
      setChecking(false);
      setNotice("Payment confirmed. Your balance has been updated.");
    }, 1000);
  };

  const copyText = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const payForItem = (item) => {
    setForm((f) => ({ ...f, itemId: item.id, amount: String(Math.min(item.outstanding, summary.payable)), error: "" }));
    document.getElementById("payx-pay")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
      <Layout role="parent">
        <div className="payx-page" ref={rootRef}>
          {cssMissing && (
              <div style={{ padding: 16, margin: "0 0 16px", background: "#fff3cd", border: "1px solid #e0b100", borderRadius: 12, color: "#5c4400", fontFamily: "sans-serif", fontSize: 14 }}>
                <strong>Stylesheet not loaded.</strong> Make sure <code>PaymentStatus.css</code> is in the
                same folder as this file, then restart <code>npm run dev</code>.
              </div>
          )}

          {/* HEADER */}
          <header className="payx-header">
            <div className="payx-header-text">
              <h1 className="payx-title">Payment Status</h1>
              <p className="payx-sub">{CHILD.student_name} · {CHILD.class_name} · {CHILD.term}</p>
            </div>
            <div className="payx-header-chip">
              <span>{summary.percent}%</span>
              <small>of fees paid</small>
            </div>
          </header>

          {notice && (
              <div className="payx-message">
                <FiCheckCircle />
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><FiX /></button>
              </div>
          )}

          {/* STAT CARDS */}
          <section className="payx-stats">
            <Stat tone="blue" label="Total fees" value={money(record.total_fees)} note={CHILD.term} />
            <Stat tone="green" label="Paid so far" value={money(summary.paid)} note={`${summary.percent}% of total`} />
            <Stat
                tone={summary.balance > 0 ? "amber" : "green"}
                label="Balance to pay"
                value={money(summary.balance)}
                note={summary.balance > 0 ? "Still outstanding" : "Fully paid"}
            />
          </section>

          {/* EXTRA INFO TILES */}
          <section className="payx-tiles">
            <Tile
                tone="blue"
                icon={<FiCalendar />}
                label="Next due"
                value={summary.nextDue ? fmtDate(summary.nextDue.due) : "None"}
                note={summary.nextDue ? `${summary.nextDue.name} · ${money(summary.nextDue.outstanding)}` : "Nothing coming up"}
            />
            <Tile
                tone={summary.overdueCount > 0 ? "red" : "green"}
                icon={<FiAlertCircle />}
                label="Overdue"
                value={money(summary.overdueTotal)}
                note={summary.overdueCount > 0 ? `${summary.overdueCount} item${summary.overdueCount === 1 ? "" : "s"} past the due date` : "Nothing overdue"}
            />
            <Tile
                tone="amber"
                icon={<FiClock />}
                label="Awaiting confirmation"
                value={money(summary.awaitingTotal)}
                note={summary.awaitingCount > 0 ? `${summary.awaitingCount} payment${summary.awaitingCount === 1 ? "" : "s"} being checked` : "No payments waiting"}
            />
            <Tile
                tone="green"
                icon={<FiCheckCircle />}
                label="Last payment"
                value={summary.lastPayment ? money(summary.lastPayment.amount) : "None yet"}
                note={summary.lastPayment ? `${fmtDate(summary.lastPayment.date)} · ${summary.lastPayment.method}` : "No confirmed payment yet"}
            />
          </section>

          {/* PROGRESS */}
          <section className="payx-progress">
            <div className="payx-progress-top">
              <strong>Fee progress</strong>
              <span>{money(summary.paid)} of {money(record.total_fees)}</span>
            </div>
            <div className="payx-bar"><div className="payx-bar-fill" style={{ width: `${summary.percent}%` }} /></div>
            {summary.awaitingTotal > 0 && (
                <p className="payx-awaiting">
                  <FiClock /> {money(summary.awaitingTotal)} is awaiting confirmation and is not yet counted above.
                  <button type="button" className="payx-refresh" onClick={checkStatus} disabled={checking}>
                    <FiRefreshCw className={checking ? "payx-spin" : ""} /> {checking ? "Checking..." : "Check status"}
                  </button>
                </p>
            )}
          </section>

          <div className="payx-columns">
            <div className="payx-main">
              {/* HISTORY */}
              <section className="payx-card payx-card--history">
                <div className="payx-card-head">
                  <h2>Payments made</h2>
                  <div className="payx-pills small">
                    {[["all", "All"], ["confirmed", "Confirmed"], ["awaiting", "Awaiting"]].map(([key, label]) => (
                        <button type="button" key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
                          {label}
                        </button>
                    ))}
                  </div>
                </div>

                {shownHistory.length === 0 ? (
                    <Empty icon={<FiInbox />} title="Nothing here" text="No payments match this filter." />
                ) : (
                    <ul className="payx-list">
                      {shownHistory.map((p) => (
                          <li key={p.id} className="payx-receipt-wrap">
                            <div className={`payx-receipt ${p.status === "Confirmed" ? "ok" : "wait"}`}>
                              <div className="payx-date">
                                <FiCalendar />
                                <span>{fmtDate(p.date)}</span>
                              </div>
                              <div className="payx-receipt-main">
                                <strong>{money(p.amount)}</strong>
                                <span><FiCreditCard /> {p.method}</span>
                                <span><FiHash /> {p.reference}</span>
                              </div>
                              <span className={`payx-status ${p.status === "Confirmed" ? "ok" : "wait"}`}>
                                                {p.status === "Confirmed" ? <FiCheckCircle /> : <FiClock />}
                                {p.status}
                                            </span>
                            </div>
                          </li>
                      ))}
                    </ul>
                )}
              </section>

              {/* FEE BREAKDOWN */}
              <section className="payx-card payx-card--fees">
                <div className="payx-card-head">
                  <h2>Fee breakdown</h2>
                  <span className="payx-count">{record.items.length} items</span>
                </div>
                <ul className="payx-list">
                  {record.items.map((i) => {
                    const pct = Math.min(100, Math.round((i.paid / i.amount) * 100));
                    const state = i.paid >= i.amount ? "paid" : i.paid > 0 ? "part" : "unpaid";
                    return (
                        <li key={i.id} className="payx-fee-wrap">
                          <div className={`payx-fee ${state}`}>
                            <div className="payx-fee-top">
                              <strong>{i.name}</strong>
                              <span className={`payx-chip ${state}`}>
                                                    {state === "paid" ? "Paid" : state === "part" ? "Part paid" : "Unpaid"}
                                                </span>
                            </div>
                            <div className="payx-fee-bar"><div style={{ width: `${pct}%` }} /></div>
                            <div className="payx-fee-nums">
                              <span>Paid <b>{money(i.paid)}</b></span>
                              <span>Total <b>{money(i.amount)}</b></span>
                            </div>
                          </div>
                        </li>
                    );
                  })}
                </ul>
                <div className="payx-fee-total">
                  <span>Total fees for {CHILD.term}</span>
                  <b>{money(record.total_fees)}</b>
                </div>
              </section>


            </div>

            <div className="payx-side">
              {/* MAKE A PAYMENT */}
              <section className="payx-card payx-card--pay" id="payx-pay">
                <div className="payx-card-head">
                  <h2>Make a payment</h2>
                  <span className="payx-secure"><FiLock /> Secured by {PAY_INFO.provider}</span>
                </div>

                {summary.payable <= 0 ? (
                    <Empty
                        icon={<FiCheckCircle />}
                        title={summary.balance > 0 ? "Payment in progress" : "All fees paid"}
                        text={summary.balance > 0
                            ? "Your recent payment is awaiting confirmation. You can pay again once it is confirmed."
                            : "Nothing is outstanding. Thank you."}
                    />
                ) : (
                    <form className="payx-form" onSubmit={startPay} noValidate>
                      <label className="payx-field">
                        <span>Pay towards</span>
                        <select value={form.itemId} onChange={(e) => setField({ itemId: e.target.value, amount: "" })}>
                          <option value="all">All outstanding fees</option>
                          {summary.pending.map((i) => (
                              <option key={i.id} value={i.id}>{i.name} ({money(i.outstanding)} left)</option>
                          ))}
                        </select>
                      </label>

                      <label className="payx-field">
                        <span>Amount (UGX)</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder={`Up to ${maxAmount.toLocaleString("en-US")}`}
                            value={form.amount}
                            onChange={(e) => setField({ amount: e.target.value })}
                        />
                      </label>

                      <div className="payx-quick">
                        <button type="button" onClick={() => setField({ amount: String(maxAmount) })}>
                          Full {selectedItem ? "amount" : "balance"}
                        </button>
                        <button type="button" onClick={() => setField({ amount: String(Math.round(maxAmount / 2)) })}>Half</button>
                      </div>

                      <div className="payx-field">
                        <span>Payment method</span>
                        <div className="payx-methods">
                          {Object.entries(METHODS).map(([key, m]) => (
                              <button type="button" key={key} className={form.method === key ? "active" : ""} onClick={() => setField({ method: key })}>
                                {m.icon} {m.label}
                              </button>
                          ))}
                        </div>
                      </div>

                      {form.method === "mobile" ? (
                          <label className="payx-field">
                            <span>Mobile Money number</span>
                            <input
                                type="tel"
                                placeholder="0772 123 456"
                                value={form.phone}
                                onChange={(e) => setField({ phone: e.target.value })}
                            />
                            <small className="payx-field-note">You will get a prompt on this phone. Enter your PIN to approve.</small>
                          </label>
                      ) : (
                          <p className="payx-hint">You will enter your card details on the next secure step.</p>
                      )}

                      {form.error && <p className="payx-error"><FiAlertCircle /> {form.error}</p>}

                      <div className="payx-paywrap">
                        <button type="submit" className="payx-pay-btn">
                          Pay {amountNum > 0 ? money(amountNum) : "now"} <FiArrowRight />
                        </button>
                      </div>
                    </form>
                )}
              </section>

              {/* PENDING */}
              <section className="payx-card payx-card--pending">
                <div className="payx-card-head">
                  <h2>Still to pay</h2>
                  <span className="payx-count">{summary.pending.length} item{summary.pending.length === 1 ? "" : "s"}</span>
                </div>

                {summary.pending.length === 0 ? (
                    <Empty icon={<FiCheckCircle />} title="All clear" text="Nothing is outstanding. All fees are paid." />
                ) : (
                    <ul className="payx-list">
                      {summary.pending.map((i) => {
                        const pct = Math.round((i.paid / i.amount) * 100);
                        return (
                            <li key={i.id} className="payx-due-wrap">
                              <div className={`payx-due ${i.overdue ? "overdue" : ""}`}>
                                <div className="payx-due-top">
                                  <strong>{i.name}</strong>
                                  <b>{money(i.outstanding)}</b>
                                </div>
                                <div className="payx-mini"><div style={{ width: `${pct}%` }} /></div>
                                <div className="payx-due-bottom">
                                  <span>{money(i.paid)} of {money(i.amount)} paid</span>
                                  <span className={i.overdue ? "late" : ""}>
                                                            {i.overdue ? <FiAlertCircle /> : <FiCalendar />}
                                    {i.overdue ? "Overdue since " : "Due "}{fmtDate(i.due)}
                                                        </span>
                                </div>
                                {summary.payable > 0 && (
                                    <button type="button" className="payx-due-pay" onClick={() => payForItem(i)}>
                                      Pay this <FiArrowRight />
                                    </button>
                                )}
                              </div>
                            </li>
                        );
                      })}
                    </ul>
                )}
              </section>
            </div>
          </div>

          {/* OTHER WAYS TO PAY (full width) */}
          <section className="payx-ways-card">
            <div className="payx-ways-head">
              <div>
                <h2>Other ways to pay</h2>
                <p>Two quick options, both handled by {PAY_INFO.provider}. No bank visit needed.</p>
              </div>
              <span className="payx-secure"><FiCheckCircle /> No bank visit needed</span>
            </div>

            <div className="payx-ways-grid">
              {/* Option 1 */}
              <article className="payx-option payx-option--web">
                <div className="payx-option-face">
                  <div className="payx-option-top">
                    <span className="payx-option-icon"><FiCreditCard /></span>
                    <div>
                      <span className="payx-option-tag">Option 1</span>
                      <h3>Pay on this page</h3>
                    </div>
                  </div>
                  <p className="payx-option-text">The fastest way. Use the Make a payment form and approve the prompt on your phone.</p>
                  <ul className="payx-option-list">
                    <li>Choose what to pay and enter the amount</li>
                    <li>Pick Mobile Money or Card</li>
                    <li>Press Pay and approve with your PIN</li>
                  </ul>
                  <button
                      type="button"
                      className="payx-option-btn"
                      onClick={() => document.getElementById("payx-pay")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Go to payment form <FiArrowRight />
                  </button>
                </div>
              </article>

              {/* Option 2 */}
              <article className="payx-option payx-option--ussd">
                <div className="payx-option-face">
                  <div className="payx-option-top">
                    <span className="payx-option-icon"><FiPhone /></span>
                    <div>
                      <span className="payx-option-tag">Option 2</span>
                      <h3>Dial to pay (USSD)</h3>
                    </div>
                  </div>
                  <p className="payx-option-text">Works on any phone, even without internet. Dial this code on your phone:</p>

                  <div className="payx-dial">
                    <div>
                      <span className="payx-dial-label">Dial</span>
                      <strong className="payx-dial-code">{PAY_INFO.ussd}</strong>
                    </div>
                    <button type="button" className={`payx-copy light ${copied === "ussd" ? "done" : ""}`} onClick={() => copyText(PAY_INFO.ussd, "ussd")}>
                      {copied === "ussd" ? <><FiCheckCircle /> Copied</> : <><FiCopy /> Copy</>}
                    </button>
                  </div>

                  <div className="payx-code-row">
                    <div>
                      <span>Student code</span>
                      <strong>{PAY_INFO.studentCode}</strong>
                    </div>
                    <button type="button" className={`payx-copy ${copied === "code" ? "done" : ""}`} onClick={() => copyText(PAY_INFO.studentCode, "code")}>
                      {copied === "code" ? <><FiCheckCircle /> Copied</> : <><FiCopy /> Copy</>}
                    </button>
                  </div>

                  <div className="payx-networks">
                    <span className="payx-net payx-net--mtn">MTN MoMo</span>
                    <span className="payx-net payx-net--airtel">Airtel Money</span>
                  </div>
                </div>
              </article>
            </div>

            <h3 className="payx-timeline-title">How the dial option works</h3>
            <ol className="payx-timeline">
              {PAY_INFO.steps.map((step, i) => (
                  <li key={i}>
                    <span className="payx-tl-num">{i + 1}</span>
                    <p>{step}</p>
                  </li>
              ))}
            </ol>

            <div className="payx-ways-note">
              <FiCheckCircle />
              <span>Payments are confirmed automatically, usually within a few minutes. You do not need to send proof or visit the bank.</span>
            </div>
          </section>

          {/* HELP BANNER */}
          <section className="payx-help">
            <div className="payx-help-text">
              <h2>Need help with a payment?</h2>
              <p>{BURSAR.name} can check a payment, fix a mistake or explain a fee.</p>
            </div>
            <div className="payx-help-contacts">
              <a href={`tel:${BURSAR.phone.replace(/\s/g, "")}`}><FiPhone /> {BURSAR.phone}</a>
              <a href={`mailto:${BURSAR.email}`}><FiMail /> {BURSAR.email}</a>
              <span><FiClock /> {BURSAR.hours}</span>
            </div>
          </section>

          {/* CONFIRM MODAL */}
          {confirming && (
              <ConfirmModal
                  busy={paying}
                  onCancel={() => !paying && setConfirming(false)}
                  onConfirm={confirmPay}
                  amount={money(amountNum)}
                  method={METHODS[form.method].label}
                  target={selectedItem ? selectedItem.name : "All outstanding fees"}
                  phone={form.method === "mobile" ? form.phone : ""}
              />
          )}
        </div>
      </Layout>
  );
}

/* ===================== PIECES ===================== */

function Stat({ tone, label, value, note }) {
  return (
      <div className={`payx-stat payx-stat--${tone}`}>
        <div className="payx-stat-face">
          <span className="payx-stat-label">{label}</span>
          <strong className="payx-stat-value">{value}</strong>
          <span className="payx-stat-note">{note}</span>
        </div>
      </div>
  );
}

function Tile({ tone, icon, label, value, note }) {
  return (
      <div className={`payx-tile payx-tile--${tone}`}>
        <div className="payx-tile-face">
          <span className="payx-tile-icon">{icon}</span>
          <div className="payx-tile-text">
            <span className="payx-tile-label">{label}</span>
            <strong className="payx-tile-value">{value}</strong>
            <span className="payx-tile-note">{note}</span>
          </div>
        </div>
      </div>
  );
}

function Empty({ icon, title, text }) {
  return (
      <div className="payx-empty">
        {icon}
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
  );
}

function ConfirmModal({ busy, onCancel, onConfirm, amount, method, target, phone }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
      <div className="payx-overlay" onClick={onCancel}>
        <div className="payx-modal-shadow" onClick={(e) => e.stopPropagation()}>
          <div className="payx-modal" role="dialog" aria-modal="true" aria-label="Confirm payment">
            <div className="payx-modal-head">
              <h2>Confirm payment</h2>
              <p>Please check the details before you pay.</p>
            </div>
            <dl className="payx-summary">
              <div><dt>Amount</dt><dd className="big">{amount}</dd></div>
              <div><dt>Paying towards</dt><dd>{target}</dd></div>
              <div><dt>Method</dt><dd>{method}</dd></div>
              {phone && <div><dt>Number</dt><dd>{phone}</dd></div>}
            </dl>
            <p className="payx-modal-note">
              {phone ? "You will get a prompt on your phone. Enter your PIN to approve." : "You will be taken to a secure card page."}{" "}
              The payment provider may add a small transaction charge.
            </p>
            <div className="payx-modal-foot">
              <button type="button" className="payx-btn-text" onClick={onCancel} disabled={busy}>Cancel</button>
              <div className="payx-paywrap">
                <button type="button" className="payx-pay-btn" onClick={onConfirm} disabled={busy}>
                  {busy ? "Processing..." : "Confirm & pay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}