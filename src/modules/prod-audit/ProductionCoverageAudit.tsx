import { useEffect, useMemo, useState } from "react";
import "./productionCoverageAudit.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "agendai_admin_token";
const CLIENTE_ID = 1;

type Doctor = {
  medicoId: number;
  nome: string;
  ativo: boolean;
  specialties: number;
  activeTotal: number;
  inactiveTotal: number;
  generalActive: number;
  specificActive: number;
  distinctInsurers: number;
  distinctProducts: number;
  model: string;
};

type AuditData = {
  generatedAt: string;
  totals: Record<string, number>;
  doctors: Doctor[];
  professionalPriorityFieldCandidates: Array<{ table: string; column: string; dataType: string }>;
  tableCounts: Record<string, number | null>;
  whatsappHistory: {
    firstAt: string | null;
    lastAt: string | null;
    total: number | null;
    byMonth: Array<{ month: string; total: number }>;
  };
};

export default function ProductionCoverageAudit() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) throw new Error("Sessão administrativa não encontrada. Entre no painel e abra novamente a auditoria.");
        const response = await fetch(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/coverage-v1?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.details || payload?.error || `HTTP ${response.status}`);
        }
        if (!cancelled) setData(payload.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const doctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.doctors || [];
    return (data?.doctors || []).filter((doctor) => doctor.nome.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <main className="prod-audit-page">
      <header className="prod-audit-header">
        <div>
          <span className="prod-audit-kicker">PRODUÇÃO · SOMENTE LEITURA</span>
          <h1>Auditoria de cobertura Angel</h1>
          <p>Nenhum controle desta tela altera aceites, WhatsApp, Feegow ou banco de dados.</p>
        </div>
        <button type="button" onClick={() => { window.location.href = window.location.pathname; }}>Voltar ao painel</button>
      </header>

      {loading && <section className="prod-audit-card">Carregando dados reais de produção…</section>}
      {error && <section className="prod-audit-error"><strong>Falha ao carregar auditoria.</strong><br />{error}</section>}

      {data && !loading && (
        <>
          <section className="prod-audit-grid">
            <article className="prod-audit-card"><small>Médicos</small><strong>{data.totals.doctors ?? 0}</strong></article>
            <article className="prod-audit-card"><small>Aceites ativos</small><strong>{data.totals.activeAcceptanceRows ?? 0}</strong></article>
            <article className="prod-audit-card"><small>Regras gerais</small><strong>{data.totals.generalAcceptanceRows ?? 0}</strong></article>
            <article className="prod-audit-card"><small>Vínculos específicos</small><strong>{data.totals.specificAcceptanceRows ?? 0}</strong></article>
            <article className="prod-audit-card"><small>Logs WhatsApp persistidos</small><strong>{data.whatsappHistory.total ?? "—"}</strong></article>
          </section>

          <section className="prod-audit-card">
            <h2>Histórico disponível</h2>
            <p>Primeiro log: {data.whatsappHistory.firstAt ? new Date(data.whatsappHistory.firstAt).toLocaleString("pt-BR") : "não identificado"}</p>
            <p>Último log: {data.whatsappHistory.lastAt ? new Date(data.whatsappHistory.lastAt).toLocaleString("pt-BR") : "não identificado"}</p>
            <div className="prod-audit-months">
              {data.whatsappHistory.byMonth.map((item) => <span key={item.month}>{item.month}: <b>{item.total}</b></span>)}
            </div>
          </section>

          <section className="prod-audit-card">
            <div className="prod-audit-title-row">
              <div><h2>Distribuição real por profissional</h2><p>Regra geral = aceite sem produto específico. Específico = aceite ligado a produto/plano/rede.</p></div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar médico" />
            </div>
            <div className="prod-audit-table-wrap">
              <table>
                <thead><tr><th>Médico</th><th>Esp.</th><th>Ativos</th><th>Inativos</th><th>Gerais</th><th>Específicos</th><th>Convênios</th><th>Produtos</th><th>Modelo</th></tr></thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.medicoId}>
                      <td>{doctor.nome}</td><td>{doctor.specialties}</td><td>{doctor.activeTotal}</td><td>{doctor.inactiveTotal}</td><td>{doctor.generalActive}</td><td>{doctor.specificActive}</td><td>{doctor.distinctInsurers}</td><td>{doctor.distinctProducts}</td><td>{doctor.model}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="prod-audit-card">
            <h2>Campos candidatos a prioridade / sócio / agregado</h2>
            {data.professionalPriorityFieldCandidates.length === 0 ? <p>Nenhum campo candidato foi encontrado nas tabelas pesquisadas.</p> : (
              <ul>{data.professionalPriorityFieldCandidates.map((field) => <li key={`${field.table}.${field.column}`}><code>{field.table}.{field.column}</code> · {field.dataType}</li>)}</ul>
            )}
          </section>

          <section className="prod-audit-card">
            <h2>Contagem das tabelas críticas</h2>
            <div className="prod-audit-counts">{Object.entries(data.tableCounts).map(([name, total]) => <span key={name}><code>{name}</code>: <b>{total ?? "não disponível"}</b></span>)}</div>
          </section>
        </>
      )}
    </main>
  );
}
