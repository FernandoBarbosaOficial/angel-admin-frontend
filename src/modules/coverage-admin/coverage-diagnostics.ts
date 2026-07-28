import type { CoverageDiagnostic, CoverageDoctor, MedicalCoverage } from "./types";

export function diagnoseCoverage(
  coverage: MedicalCoverage,
  doctor?: CoverageDoctor,
): CoverageDiagnostic {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!doctor?.active) blockers.push("Médico inativo para atendimento via WhatsApp.");
  if (!coverage.specialtyId || !coverage.specialty?.trim()) {
    blockers.push("Especialidade obrigatória não vinculada ao aceite.");
  }
  if (!coverage.active) blockers.push("Aceite suspenso.");

  // O contrato legado de aceites ainda não devolve o mapeamento Feegow.
  // Até que esse vínculo seja exposto e validado, a interface não pode afirmar
  // que a cobertura está pronta para booking.
  blockers.push("Crosswalk e plano Feegow ainda não expostos pelo contrato administrativo.");

  if (!coverage.product) {
    warnings.push("Aceite cadastrado para o convênio inteiro, sem produto/plano/rede.");
  }
  if (!coverage.ruleSource) {
    warnings.push("Origem da regra comercial não informada.");
  }

  return {
    bookingReady: blockers.length === 0,
    blockers,
    warnings,
  };
}
