import LegacyAdminPanel from "../legacy/LegacyAdminPanel";
import BookingOperationalControlLauncher from "../modules/clinic-operations/BookingOperationalControlLauncher";
import AdminExperienceV2Launcher from "../modules/admin-v2/AdminExperienceV2Launcher";
import { MODULE_REGISTRY } from "./module-registry";

const POLIBON_DISPLAY_NAME = "POLICLÍNICA BONFIGLIOLI";

/**
 * Casca de transição Polibon-only.
 *
 * O painel legado permanece intacto enquanto recursos novos são montados em
 * módulos isolados para homologação e comparação antes da substituição final.
 */
export default function AppShell() {
  const legacyModule = MODULE_REGISTRY.find((module) => module.id === "legacy-admin");

  if (!legacyModule?.enabled) {
    return (
      <main role="main" aria-label={POLIBON_DISPLAY_NAME}>
        <h1>{POLIBON_DISPLAY_NAME}</h1>
        <p>O painel administrativo está temporariamente indisponível.</p>
      </main>
    );
  }

  return (
    <>
      <LegacyAdminPanel />
      <BookingOperationalControlLauncher />
      <AdminExperienceV2Launcher />
    </>
  );
}
