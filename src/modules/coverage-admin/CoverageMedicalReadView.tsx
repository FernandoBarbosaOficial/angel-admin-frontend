import { useEffect, useMemo, useState } from "react";
import type { CoverageDoctor, MedicalCoverage } from "./types";

type Props = {
  doctors: CoverageDoctor[];
  coverages: Array<MedicalCoverage & { insurerGloballyActive?: boolean }>;
  selectedDoctorId: number | null;
  loading: boolean;
  canEdit: boolean;
  updatingCoverageId: number | null;
  onSelectDoctor: (doctorId: number) => void;
  onToggleCoverage: (coverage: MedicalCoverage) => void;
};

function statusClass(kind: "ok" | "blocker") {
  return `coverageStatus coverageStatus--${kind}`;
}

export default function CoverageMedicalReadView({
  doctors,
  coverages,
  selectedDoctorId,
  loading,
  canEdit,
  updatingCoverageId,
  onSelectDoctor,
  onToggleCoverage,
}: Props) {
  const PAGE_SIZE = 20;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [insurerStatus, setInsurerStatus] = useState<"active" | "inactive">("active");
  const [insurer, setInsurer] = useState("all");
  const [detail, setDetail] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [page, setPage] = useState(1);

  const selectedDoctor = doctors.find(
    (doctor) => Number(doctor.id) === Number(selectedDoctorId),
  );

  useEffect(() => {
    setQuery("");
    setStatus("all");
    setInsurerStatus("active");
    setInsurer("all");
    setDetail("all");
    setSpecialty("all");
    setPage(1);
  }, [selectedDoctorId]);

  const selectedDoctorCoverages = useMemo(
    () =>
      coverages.filter(
        (coverage) => Number(coverage.doctorId) === Number(selectedDoctorId),
      ),
    [coverages, selectedDoctorId],
  );

  const insurers = useMemo(
    () =>
      Array.from(
        new Set(selectedDoctorCoverages.map((coverage) => coverage.insurer).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [selectedDoctorCoverages],
  );

  const details = useMemo(
    () =>
      Array.from(
        new Set(
          selectedDoctorCoverages
            .filter((coverage) => insurer === "all" || coverage.insurer === insurer)
            .map((coverage) => coverage.product || "Convênio inteiro"),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [insurer, selectedDoctorCoverages],
  );

  const specialties = useMemo(
    () =>
      Array.from(
        new Set(
          selectedDoctorCoverages
            .filter((coverage) => insurer === "all" || coverage.insurer === insurer)
            .filter(
              (coverage) =>
                detail === "all" ||
                (coverage.product || "Convênio inteiro") === detail,
            )
            .map((coverage) => coverage.specialty || "Sem especialidade"),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [detail, insurer, selectedDoctorCoverages],
  );

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return selectedDoctorCoverages
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
    selectedDoctorCoverages,
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
          aceite ativo é oferecido no fluxo; aceite suspenso deixa de ser oferecido,
          sem alterar cadastros ou agendas da Feegow.
        </span>
      </div>

      <div className="coverageFilters">
        <label>
          Médico
          <select
            value={selectedDoctorId || ""}
            onChange={(event) => onSelectDoctor(Number(event.target.value))}
          >
            <option value="">Selecione um médico</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} · {doctor.specialties || "sem especialidade"}
              </option>
            ))}
          </select>
        </label>
        <label>
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
        <label>
          Status do convênio
          <select
            value={insurerStatus}
            onChange={(event) =>
              setInsurerStatus(event.target.value as typeof insurerStatus)
            }
          >
            <option value="active">Convênios ativos</option>
            <option value="inactive">Convênios desativados</option>
          </select>
        </label>
        <label>
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
        <label>
          Especialidade
          <select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
            <option value="all">Todas</option>
            {specialties.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Situação
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">Todas</option>
            <option value="active">Aceites ativos</option>
            <option value="suspended">Aceites suspensos</option>
          </select>
        </label>
        <label>
          Busca livre
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Código, rede, plano ou especialidade"
          />
        </label>
      </div>

      {!selectedDoctor && (
        <div className="coverageEmpty">
          Selecione um médico para consultar suas coberturas.
        </div>
      )}

      {selectedDoctor && loading && <div className="coverageEmpty">Carregando coberturas…</div>}

      {selectedDoctor && !loading && rows.length === 0 && (
        <div className="coverageEmpty">Nenhuma cobertura encontrada para os filtros selecionados.</div>
      )}

      {selectedDoctor && !loading && rows.length > 0 && (
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
              {pageRows.map((coverage) => (
                <tr key={coverage.id}>
                  <td>
                    <strong>{coverage.doctor}</strong>
                    <span>{coverage.specialty || "Especialidade não vinculada"}</span>
                    <small>{selectedDoctor.registry || "CRM/registro não informado"}</small>
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
                        coverage.insurerGloballyActive === false ||
                        updatingCoverageId === coverage.id
                      }
                      onClick={() => onToggleCoverage(coverage)}
                      title={
                        !canEdit
                          ? "Seu perfil não possui permissão para alterar coberturas"
                          : coverage.insurerGloballyActive === false
                            ? "Reative o convênio no cadastro global antes de alterar seus aceites"
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
              ))}
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
