export type Capability =
  | "operations.read"
  | "operations.manage"
  | "appointments.read"
  | "appointments.manage"
  | "confirmations.read"
  | "confirmations.manage"
  | "coverage.read"
  | "coverage.edit"
  | "coverage.validate"
  | "coverage.publish"
  | "schedule-modality.read"
  | "schedule-modality.edit"
  | "schedule-modality.publish"
  | "technical.whatsapp"
  | "technical.feegow"
  | "technical.audit"
  | "users.manage"
  | "ai-operations.propose"
  | "ai-operations.approve"
  | "ai-operations.publish";

export function hasCapability(
  capabilities: readonly string[] | null | undefined,
  capability?: string,
): boolean {
  if (!capability) return true;
  return Boolean(capabilities?.includes(capability));
}
