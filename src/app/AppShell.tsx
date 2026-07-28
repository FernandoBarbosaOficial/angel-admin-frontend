import LegacyAdminPanel from "../legacy/LegacyAdminPanel";
import { MODULE_REGISTRY } from "./module-registry";

const POLIBON_DISPLAY_NAME = "POLICLÍNICA BONFIGLIOLI";

/**
 * Casca de transição Polibon-only.
 *
 * Nesta etapa o shell não altera autenticação, APIs, permissões ou fluxos do
 * painel atual. Ele apenas estabelece o ponto estável onde os novos módulos
 * serão montados de forma incremental.
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

  return <LegacyAdminPanel />;
}
