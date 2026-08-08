import LegacyAdminPanel from "../legacy/LegacyAdminPanel";
import BookingOperationalControlLauncher from "../modules/clinic-operations/BookingOperationalControlLauncher";
import ProductionCoverageAudit from "../modules/prod-audit/ProductionCoverageAudit";
import ProductionCanonicalHistoryAudit from "../modules/prod-audit/ProductionCanonicalHistoryAudit";
import ProductionReceptionCausesAudit from "../modules/prod-audit/ProductionReceptionCausesAudit";
import { MODULE_REGISTRY } from "./module-registry";

const POLIBON_DISPLAY_NAME = "POLICLÍNICA BONFIGLIOLI";

/**
 * Casca de transição Polibon-only.
 *
 * Nesta etapa o shell preserva o painel legado e permite montar recursos novos
 * de forma isolada. O launcher do controle de agendamento injeta somente o
 * acesso no menu existente; Tempo Real e Visão do Dia não são alterados.
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
    </>
  );
}
