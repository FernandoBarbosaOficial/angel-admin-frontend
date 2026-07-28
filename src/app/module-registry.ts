export type AngelModuleId =
  | "clinic-operations"
  | "appointments"
  | "confirmations"
  | "coverage-admin"
  | "technical-admin"
  | "legacy-admin";

export type AngelModuleRegistration = {
  id: AngelModuleId;
  enabled: boolean;
  legacy: boolean;
};

/**
 * Registro incremental. Nenhum módulo novo assume autoridade operacional até
 * possuir API, autorização e validação aprovadas.
 */
export const MODULE_REGISTRY: AngelModuleRegistration[] = [
  { id: "clinic-operations", enabled: false, legacy: false },
  { id: "appointments", enabled: false, legacy: false },
  { id: "confirmations", enabled: false, legacy: false },
  { id: "coverage-admin", enabled: false, legacy: false },
  { id: "technical-admin", enabled: false, legacy: false },
  { id: "legacy-admin", enabled: true, legacy: true },
];
