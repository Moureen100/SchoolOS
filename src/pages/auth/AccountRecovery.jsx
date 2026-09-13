import { useParams, Link } from "react-router-dom";
import { colors } from "../../theme";
import { AUTH_CONFIG } from "./authConfig";

export default function AccountRecovery() {
  const { role } = useParams();
  const config = AUTH_CONFIG[role];

  return (
    <div style={{ minHeight: "100vh", background: colors.background, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ width: 380, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 28 }}>
        <h2 style={{ color: colors.primary, marginTop: 0 }}>Account recovery</h2>
        <p style={{ color: colors.textSecondary, fontSize: 14 }}>
          {config?.label || "This"} is a single-account role. If that person becomes unavailable and can't
          log in, the school needs a pre-agreed way to regain access — for example a recovery email on file,
          a backup admin code generated at setup, or a secondary "super admin" who can reset it.
        </p>
        <p style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12, fontStyle: "italic" }}>
          This exact mechanism still needs to be decided with your backend developer — this page is a
          placeholder until that's built.
        </p>
        <Link to={`/login/${role}`} style={{ color: colors.accent, fontSize: 13 }}>← Back to login</Link>
      </div>
    </div>
  );
}