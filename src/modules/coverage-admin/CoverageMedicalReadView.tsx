import { useEffect, useMemo, useState } from "react";
import type { CoverageDoctor, MedicalCoverage } from "./types";

type Props = {
  doctors: CoverageDoctor[];
  coverages: Array<MedicalCoverage & { insurerGloballyActive?: boolean }>;
  selectedDoctorId: number | null;
  focusInsurer?: string | null;
  loading: boolean;
  canEdit: boolean;
  updatingCoverageId: number | null;
  onSelectDoctor: (doctorId: number | null) => void;
  onToggleCoverage: (coverage: MedicalCoverage) => void;
};

function statusClass(kind: "ok" | "blocker") {
  return `coverageStatus coverageStatus--${kind}`;
}

export default function CoverageMedicalReadView({
  doctors,
  coverages,
  selectedDoctorId,
  focusInsurer,
  loading,
  canEdit,
  updatingCoverageId,
  onSelectDoctor,
  onToggleCoverage,
}: Props) {
  const PAGE_SIZE = 20;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [insurerStatus, setInsurerStatus] = useState<"all" | "active" | "inactive">("all");
  const [insurer, setInsurer] = useState("all");
  const [detail, setDetail] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setQuery("");
    setStatus("all");
    setInsurerStatus("all");
    setInsurer("all");
    setDetail("all");
    setSpecialty("all");
    setPage(1);
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!focusInsurer) return;
    setInsurer(focusInsurer);
    setInsurerStatus("all");
    setDetail("all");
    setSpecialty("all");
    setPage(1);
  }, [focusInsurer]);

  const visibleDoctorCoverages = useMemo(
    () => {
      if (selectedDoctorId === null) return coverages;
      return coverages.filter(
        (coverage) => Number(coverage.doctorId) === Number(selectedDoctorId),
      );
    },
    [coverages, selectedDoctorId],
  );

  const insurers = useMemo(
    () =>
      Array.from(
        new Set(visibleDoctorCoverages.map((coverage) => coverage.insurer).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [visibleDoctorCoverages],
  );

  const details = useMemo(
    () =>
      Array.from(
        new Set(
          visibleDoctorCoverages
            .filter((coverage) => insurer === "all" || coverage.insurer === insurer)
            .map((coverage) => coverage.product || "Convênio inteiro"),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [insurer, visibleDoctorCoverages],
  );

  const specialties = useMemo(
    () =>
      Array.from(
        new Set(
          visibleDoctorCoverages
            .filter((coverage) => insurer === "all" || coverage.insurer === insurer)
            .filter(
              (coverage) =>
                detail === "all" ||
                (coverage.product || "Convênio inteiro") === detail,
            )
            .map((coverage) => coverage.specialty || "Sem especialidade"),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [detail, insurer, visibleDoctorCoverages],
  );

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return visibleDoctorCoverages
      .filter((coverage) => {
        if (insurerStatus === "active" && coverage.insurerGloballyActive === false) {
          return false;
        }
        if (insurerStatus === "inactive" && coverage.insurerGloballyActive !== false) {
          return false;
        }
        if (status === "active" && !coverage.active) return false;
        if (status === "suspended" && coverage.active) return false;
        if (insurer !== "all" && coverage.insurer !== insurer) return false;
        if (
          detail !== "all" &&
          (coverage.product || "Convênio inteiro") !== detail
        ) {
          return false;
        }
        if (
          specialty !== "all" &&
          (coverage.specialty || "Sem especialidade") !== specialty
        ) {
          return false;
        }
        if (!normalizedQuery) return true;
        return [
          coverage.doctor,
          coverage.specialty,
          coverage.insurer,
          coverage.product,
          coverage.productType,
          coverage.operatorCode,
          coverage.networkOrAccommodation,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(normalizedQuery));
      });
  }, [
    detail,
    insurer,
    insurerStatus,
    query,
    visibleDoctorCoverages,
    specialty,
    status,
  ]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [detail, insurer, insurerStatus, query, selectedDoctorId, specialty, status]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="coverageModule">
      <div className="coverageModuleHeader">
        <div>
          <span className="coverageEyebrow">GESTÃO ASSISTENCIAL</span>
          <h3>Coberturas médicas</h3>
          <p>
            Consulte os aceites comerciais e ative ou suspenda sua utilização no
            atendimento da Polibon.
          </p>
        </div>
        <span className="coverageReadOnlyBadge">
          {canEdit ? "Gestão operacional" : "Somente leitura"}
        </span>
      </div>

      <div className="coverageOperationalNote">
        <strong>Regra atual:</strong>
        <span>
          uma cobertura ativa só é oferecida quando o convênio também está publicado
          no WhatsApp. Suspender o convênio prevalece sobre todas as coberturas.
        </span>
      </div>

      <div className="coverageFilters coverageFilters--medical">
        <label className="coverageFilter--doctor">
          Médico
          <select
            value={selectedDoctorId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onSelectDoctor(value ? Number(value) : null);
            }}
          >
            <option value="">Todos os médicos</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} · {doctor.specialties || "sem especialidade"}
              </option>
            ))}
          </select>
        </label>
        <label className="coverageFilter--insurer">
          Convênio
          <select
            value={insurer}
            onChange={(event) => {
              setInsurer(event.target.value);
              setDetail("all");
              setSpecialty("all");
            }}
          >
            <option value="all">Todos</option>
            {insurers.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="coverageFilter--insurerStatus">
          Status do convênio
          <select
            value={insurerStatus}
            onChange={(event) =>
              setInsurerStatus(event.target.value as typeof insurerStatus)
            }
          >
            <option value="all">Todos os convênios</option>
            <option value="active">Convênios ativos</option>
            <option value="inactive">Convênios desativados</option>
          </select>
        </label>
        <label className="coverageFilter--detail">
          Plano / produto / rede
          <select
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value);
              setSpecialty("all");
            }}
          >
            <option value="all">Todos</option>
            {details.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="coverageFilter--specialty">
          Especialidade
          <select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
            <option value="all">Todas</option>
            {specialties.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="coverageFilter--status">
          Situação
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">Todas</option>
            <option value="active">Aceites ativos</option>
            <option value="suspended">Aceites suspensos</option>
          </select>
        </label>
        <label className="coverageFilter--search">
          Busca livre
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Código, rede, plano ou especialidade"
          />
        </label>
      </div>

      {loading && <div className="coverageEmpty">Carregando coberturas…</div>}

      {!loading && rows.length === 0 && (
        <div className="coverageEmpty">Nenhuma cobertura encontrada para os filtros selecionados.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="coverageTableWrap">
          <table className="coverageTable">
            <thead>
              <tr>
                <th>Médico / especialidade</th>
                <th>Convênio / produto</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((coverage) => {
                const coverageDoctor = doctors.find(
                  (doctor) => Number(doctor.id) === Number(coverage.doctorId),
                );
                return (
                  <tr key={coverage.id}>
                    <td>
                      <strong>{coverage.doctor}</strong>
                      <span>{coverage.specialty || "Especialidade não vinculada"}</span>
                      <small>{coverageDoctor?.registry || "CRM/registro não informado"}</small>
                    </td>
                    <td>
                      <strong>{coverage.insurer}</strong>
                      <span>{coverage.product || "Convênio inteiro"}</span>
                      <small>
                        {[coverage.productType, coverage.operatorCode, coverage.networkOrAccommodation]
                          .filter(Boolean)
                          .join(" · ") || "Sem detalhamento de produto/plano/rede"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={statusClass(
                          coverage.insurerGloballyActive !== false && coverage.active
                            ? "ok"
                            : "blocker",
                        )}
                      >
                        {coverage.insurerGloballyActive === false
                          ? "Convênio desativado"
                          : coverage.active
                            ? "Aceite ativo"
                            : "Aceite suspenso"}
                      </span>
                      <small>
                        {coverage.insurerGloballyActive === false
                          ? "Prevalece sobre os aceites médicos vinculados"
                          : coverage.active
                            ? "Disponível para o fluxo de atendimento"
                            : "Não será oferecido ao paciente"}
                      </small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={coverage.active ? "small danger" : "small success"}
                        disabled={
                          !canEdit ||
                          updatingCoverageId === coverage.id
                        }
                        onClick={() => onToggleCoverage(coverage)}
                        title={
                          !canEdit
                            ? "Seu perfil não possui permissão para alterar coberturas"
                            : undefined
                        }
                      >
                        {updatingCoverageId === coverage.id
                          ? "Salvando..."
                          : coverage.active
                            ? "Suspender"
                            : "Ativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="coveragePagination">
            <span>
              {rows.length} aceite{rows.length === 1 ? "" : "s"} · página {page} de{" "}
              {totalPages}
            </span>
            <div>
              <button
                type="button"
                className="small"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="small"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
