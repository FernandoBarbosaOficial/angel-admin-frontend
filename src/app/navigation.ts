export type NavigationSectionId =
  | "clinic-operations"
  | "clinical-management"
  | "technical-administration"
  | "legacy";

export type NavigationItem = {
  id: string;
  label: string;
  section: NavigationSectionId;
  capability?: string;
  enabled: boolean;
};

/**
 * Catálogo Polibon-only. Nesta primeira etapa apenas o painel legado está
 * habilitado; os demais itens serão ativados módulo a módulo.
 */
export const POLIBON_NAVIGATION: NavigationItem[] = [
  { id: "today", label: "Visão do dia", section: "clinic-operations", capability: "operations.read", enabled: false },
  { id: "attendances", label: "Atendimentos", section: "clinic-operations", capability: "operations.read", enabled: false },
  { id: "appointments", label: "Consultas", section: "clinic-operations", capability: "appointments.read", enabled: false },
  { id: "confirmations", label: "Confirmações", section: "clinic-operations", capability: "confirmations.read", enabled: false },
  { id: "operational-pendencies", label: "Pendências", section: "clinic-operations", capability: "operations.read", enabled: false },

  { id: "indicators", label: "Indicadores de atendimento", section: "clinical-management", capability: "operations.read", enabled: false },
  { id: "professionals", label: "Profissionais e especialidades", section: "clinical-management", capability: "coverage.read", enabled: false },
  { id: "coverage", label: "Convênios, produtos e planos", section: "clinical-management", capability: "coverage.read", enabled: false },
  { id: "medical-coverages", label: "Coberturas médicas", section: "clinical-management", capability: "coverage.read", enabled: true },
  { id: "crosswalk", label: "Crosswalk Feegow", section: "clinical-management", capability: "coverage.read", enabled: false },
  { id: "schedule-modality", label: "Modalidades e grades", section: "clinical-management", capability: "schedule-modality.read", enabled: false },
  { id: "configuration-pendencies", label: "Pendências de configuração", section: "clinical-management", capability: "coverage.read", enabled: false },
  { id: "validations", label: "Validações", section: "clinical-management", capability: "coverage.validate", enabled: false },
  { id: "publications", label: "Publicações e rollback", section: "clinical-management", capability: "coverage.publish", enabled: false },

  { id: "feegow", label: "Integração Feegow", section: "technical-administration", capability: "technical.feegow", enabled: false },
  { id: "whatsapp", label: "WhatsApp da Polibon", section: "technical-administration", capability: "technical.whatsapp", enabled: false },
  { id: "anti-abuse", label: "Antiabuso e allowlist", section: "technical-administration", capability: "technical.whatsapp", enabled: false },
  { id: "users", label: "Usuários, perfis e permissões", section: "technical-administration", capability: "users.manage", enabled: false },
  { id: "audit", label: "Auditoria", section: "technical-administration", capability: "technical.audit", enabled: false },
  { id: "logs", label: "Logs", section: "technical-administration", capability: "technical.audit", enabled: false },
  { id: "go-live-diagnostics", label: "Diagnóstico de go-live", section: "technical-administration", capability: "technical.feegow", enabled: false },

  { id: "legacy-admin", label: "Painel administrativo atual", section: "legacy", enabled: true },
];
