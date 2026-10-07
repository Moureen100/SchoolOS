import { useNavigate } from "react-router-dom";
import { colors } from "../theme";
import { FaUserShield, FaChalkboardTeacher, FaUserGraduate, FaUserFriends, FaMoneyBillWave } from "react-icons/fa";
import classroomImg from "../assets/img2/1.jpg";
import buildingImg from "../assets/img2/2.jpg";
import "./RoleSelect.css";

export default function RoleSelect() {
  const navigate = useNavigate();

  const roles = [
    { key: "admin", title: "Admin", description: "Manage students and school records.", icon: <FaUserShield />, tone: "coral" },
    { key: "teacher", title: "Teacher", description: "Marks, lesson plans, timetable, attendance.", icon: <FaChalkboardTeacher />, tone: "teal" },
    { key: "class-teacher", title: "Class Teacher", description: "Compile class reports, grading, position.", icon: <FaUserGraduate />, tone: "violet" },
    { key: "parent", title: "Parent", description: "Results, announcements, payments.", icon: <FaUserFriends />, tone: "accent" },
    { key: "bursar", title: "Bursar", description: "Fees, payments, pupil records.", icon: <FaMoneyBillWave />, tone: "amber" },
  ];

  return (
      <div className="role-page">
        {/* ============ Left: Geometric Branding & Slanted Hero Panel ============ */}
        <aside className="role-hero">
          {/* Layer 1: Dark Blue Outer Background Cloned Shape */}
          <div className="brand-geometric-layer brand-geometric-layer--primary"></div>
          {/* Layer 2: Cyan Inner Cloned Accent Ribbon Shape */}
          <div className="brand-geometric-layer brand-geometric-layer--accent"></div>

          <div className="role-hero__content">
            <h1>SchoolOS</h1>
            <p>One platform, every role in your school.</p>
          </div>

          {/* Circular window frames placed dynamically within the geometric layout */}
          <div className="role-hero__window role-hero__window--large">
            <img src={buildingImg} alt="School Building" />
          </div>
          <div className="role-hero__window role-hero__window--small">
            <img src={classroomImg} alt="Classroom Activity" />
          </div>
        </aside>

        {/* ============ Right: Role Picker Dashboard Grid ============ */}
        <main className="role-select" style={{ background: colors?.background || "#f8fafc" }}>
          <div className="role-select__hero">
            <h2>Select Your Portal</h2>
            <p>Choose your corresponding administrative or academic profile option below to gain access.</p>
          </div>

          <div className="role-select__grid">
            {roles.map((role) => (
                <button
                    key={role.key}
                    className={`role-card role-card--${role.tone}`}
                    onClick={() => navigate(`/login/${role.key}`)}
                >
                  <div className="role-card__porthole">
                    <span className="role-card__icon">{role.icon}</span>
                  </div>
                  <div className="role-card__text">
                    <div className="role-card__title">{role.title}</div>
                    <div className="role-card__blurb">{role.description}</div>
                  </div>
                </button>
            ))}
          </div>
        </main>
      </div>
  );
}
