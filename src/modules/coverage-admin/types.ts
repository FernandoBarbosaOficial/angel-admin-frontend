export type CoverageDoctor = {
  id: number;
  name: string;
  registry?: string | null;
  specialties: string;
  active: boolean;
};

export type MedicalCoverage = {
  id: number;
  doctorId: number;
  doctor: string;
  specialtyId: number | null;
  specialty: string | null;
  insurer: string;
  insurerGloballyActive: boolean;
  product: string | null;
  productType: string | null;
  operatorCode?: string | null;
  networkOrAccommodation?: string | null;
  active: boolean;
  ruleSource?: string | null;
  ruleNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CoverageDiagnostic = {
  bookingReady: boolean;
  blockers: string[];
  warnings: string[];
};
