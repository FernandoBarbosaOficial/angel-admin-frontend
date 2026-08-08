import { useEffect, useState } from "react";
import LegacyAdminPanel from "../legacy/LegacyAdminPanel";
import BookingOperationalControlLauncher from "../modules/clinic-operations/BookingOperationalControlLauncher";
import AdminExperienceV2Launcher from "../modules/admin-v2/AdminExperienceV2Launcher";
import AdminV3OperationalPreview from "../modules/admin-v3/AdminV3OperationalPreview";
import "../modules/admin-v3/adminV3Overrides.css";
import { MODULE_REGISTRY } from "./module-registry";

const POLIBON_DISPLAY_NAME = "POLICLÍNICA BONFIGLIOLI";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const ADMIN_V3_RETURN_KEY = "agendai_admin_v3_return";
const ADMIN_V3_INVALID_TOKEN_KEY = "agendai_admin_v3_invalid_token";

type AdminV3Section = "coverage" | "conversations";

function isAdminV3Section(value: string | null): value is AdminV3Section {
  return value === "coverage" || value === "conversations";
}

export default function AppShell() {
  const legacyModule = MODULE_REGISTRY.find((module) => module.id === "legacy-admin");
  const previewParam = new URLSearchParams(window.location.search).get("adminv3");
  const preview = isAdminV3Section(previewParam) ? previewParam : null;
  const [previewAuthState, setPreviewAuthState] = useState<"checking" | "ok">(preview ? "checking" : "ok");

  useEffect(() => {
    if (!preview) return;
    const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!token) {
      sessionStorage.setItem(ADMIN_V3_RETURN_KEY, preview);
      sessionStorage.setItem(ADMIN_V3_INVALID_TOKEN_KEY, "");
      window.location.replace("/");
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/admin/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (cancelled) return;
        if (response.ok) {
          setPreviewAuthState("ok");
          return;
        }
        sessionStorage.setItem(ADMIN_V3_RETURN_KEY, preview);
        sessionStorage.setItem(ADMIN_V3_INVALID_TOKEN_KEY, token);
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        window.location.replace("/");
      })
      .catch(() => { if (!cancelled) setPreviewAuthState("ok"); });
    return () => { cancelled = true; };
  }, [preview]);

  useEffect(() => {
    if (preview) return;
    const returnSection = sessionStorage.getItem(ADMIN_V3_RETURN_KEY);
    if (!isAdminV3Section(returnSection)) return;
    const invalidToken = sessionStorage.getItem(ADMIN_V3_INVALID_TOKEN_KEY) || "";
    const timer = window.setInterval(() => {
      const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
      if (!token || token === invalidToken) return;
      sessionStorage.removeItem(ADMIN_V3_RETURN_KEY);
      sessionStorage.removeItem(ADMIN_V3_INVALID_TOKEN_KEY);
      window.location.assign(`/?adminv3=${returnSection}`);
    }, 400);
    return () => window.clearInterval(timer);
  }, [preview]);

  if (preview) {
    if (previewAuthState === "checking") {
      return <main role="main" aria-label="Validando sessão administrativa" style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}><p>Validando sua sessão administrativa…</p></main>;
    }
    return <AdminV3OperationalPreview initialSection={preview} />;
  }

  if (!legacyModule?.enabled) {
    return <main role="main" aria-label={POLIBON_DISPLAY_NAME}><h1>{POLIBON_DISPLAY_NAME}</h1><p>O painel administrativo está temporariamente indisponível.</p></main>;
  }

  return <><LegacyAdminPanel /><BookingOperationalControlLauncher /><AdminExperienceV2Launcher /></>;
}
