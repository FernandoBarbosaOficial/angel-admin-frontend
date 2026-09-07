import LegacyAdminPanel from "../legacy/LegacyAdminPanel";
import BookingOperationalControlLauncher from "../modules/clinic-operations/BookingOperationalControlLauncher";
import WhatsAppBillingLauncher from "../modules/technical-admin/WhatsAppBillingLauncher";
import ProductionCoverageAudit from "../modules/prod-audit/ProductionCoverageAudit";
import ProductionCanonicalHistoryAudit from "../modules/prod-audit/ProductionCanonicalHistoryAudit";
import ProductionReceptionCausesAudit from "../modules/prod-audit/ProductionReceptionCausesAudit";
import ProductionCorrectionCandidatesAudit from "../modules/prod-audit/ProductionCorrectionCandidatesAudit";
import { MODULE_REGISTRY } from "./module-registry";

const POLIBON_DISPLAY_NAME = "POLICLÍNICA BONFIGLIOLI";

/**
 * Casca de transição Polibon-only.
 *
 * O shell preserva o painel legado e monta recursos novos de forma isolada.
 * Os launchers apenas injetam acessos no menu existente; não alteram Tempo Real,
 * Visão do Dia nem a jornada operacional do paciente.
 */
export default function AppShell() {
  const auditMode = new URLSearchParams(window.location.search).get("audit");
  if (auditMode === "coverage") {
    return <ProductionCoverageAudit />;
  }
  if (auditMode === "history-canonical") {
    return <ProductionCanonicalHistoryAudit />;
  }
  if (auditMode === "reception-causes") {
    return <ProductionReceptionCausesAudit />;
  }
  if (auditMode === "correction-candidates") {
    return <ProductionCorrectionCandidatesAudit />;
  }

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
      <WhatsAppBillingLauncher />
    </>
  );
}
