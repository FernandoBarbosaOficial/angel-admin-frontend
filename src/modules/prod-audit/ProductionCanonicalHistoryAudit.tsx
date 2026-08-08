import { useEffect, useState } from "react";
import "./productionCoverageAudit.css";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const TOKEN_KEY="agendai_admin_token";
const CLIENTE_ID=1;

type Summary={sessoesNoEscopo:number;iniciaramAgendamento:number;agendadosFeegow:number;taxaConclusao:number;encerradosSemAgendamento:number;orientadosRecepcao:number;falhasTecnicas:number;semDesfechoRegistrado:number};
type Funnel={key:string;label:string;total:number;lossFromPrevious:number|null;conversionFromPrevious:number|null;evidenceDefinition:string};
type Outcome={key:string;label:string;total:number;terminal:boolean};
type Block={period:{startAt:string;endAt:string;label:string};summary:Summary;funnel:Funnel[];outcomes:Outcome[];dataQuality:{rowsRead:number;sessionsRead:number;sessionsWithBookingEvidence:number;sessionsWithFinalBookingPayload:number;limitations:string[]}};
type CanonicalData={authority:{source:string;semantics:string;privacy:string};calibration30Days:Block;historicalAvailable:Block};

async function loadCanonical(){
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token)throw new Error("Sessão administrativa não encontrada. Entre no painel e abra novamente a auditoria.");
  const response=await fetch(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/whatsapp-history-canonical-v1?t=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},cache:"no-store"});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok)throw new Error(payload?.details||payload?.error||`HTTP ${response.status}`);
  return payload.data as CanonicalData;
}

function SummaryBlock({title,block}:{title:string;block:Block}){
  const s=block.summary;
  return <section className="prod-audit-card">
    <h2>{title}</h2><p>{block.period.label}</p>
    <div className="prod-audit-counts">
      <span>Sessões no escopo: <b>{s.sessoesNoEscopo}</b></span>
      <span>Iniciaram agendamento: <b>{s.iniciaramAgendamento}</b></span>
      <span>Agendados Feegow: <b>{s.agendadosFeegow}</b></span>
      <span>Taxa de conclusão: <b>{s.taxaConclusao}%</b></span>
      <span>Encerrados sem agendamento: <b>{s.encerradosSemAgendamento}</b></span>
      <span>Orientados à recepção: <b>{s.orientadosRecepcao}</b></span>
      <span>Falhas técnicas: <b>{s.falhasTecnicas}</b></span>
      <span>Sem desfecho registrado: <b>{s.semDesfechoRegistrado}</b></span>
    </div>
    <h2>Funil canônico</h2>
    <div className="prod-audit-table-wrap"><table><thead><tr><th>Etapa</th><th>Total</th><th>Perda da etapa anterior</th><th>Conversão</th></tr></thead><tbody>{block.funnel.map(item=><tr key={item.key}><td>{item.label}</td><td>{item.total}</td><td>{item.lossFromPrevious??"—"}</td><td>{item.conversionFromPrevious==null?"—":`${item.conversionFromPrevious}%`}</td></tr>)}</tbody></table></div>
    <h2>Desfechos canônicos</h2>
    <div className="prod-audit-table-wrap"><table><thead><tr><th>Desfecho</th><th>Total</th><th>Terminal</th></tr></thead><tbody>{block.outcomes.map(item=><tr key={item.key}><td>{item.label}</td><td>{item.total}</td><td>{item.terminal?"Sim":"Não"}</td></tr>)}</tbody></table></div>
    <p><b>Qualidade:</b> {block.dataQuality.rowsRead} logs · {block.dataQuality.sessionsRead} sessões · {block.dataQuality.sessionsWithBookingEvidence} sessões com evidência de booking.</p>
  </section>;
}

export default function ProductionCanonicalHistoryAudit(){
  const[data,setData]=useState<CanonicalData|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;loadCanonical().then(v=>{if(!cancelled)setData(v)}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:String(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true};},[]);
  return <main className="prod-audit-page">
    <header className="prod-audit-header"><div><span className="prod-audit-kicker">PRODUÇÃO · SOMENTE LEITURA</span><h1>Calibração histórica Angel</h1><p>Esta tela reutiliza o mesmo motor de evidência da Visão do dia.</p></div><button type="button" onClick={()=>{window.location.href="/?audit=coverage";}}>Voltar à auditoria</button></header>
    {loading&&<section className="prod-audit-card">Calculando referência canônica…</section>}
    {error&&<section className="prod-audit-error"><strong>Falha na calibração.</strong><br/>{error}</section>}
    {data&&!loading&&<><section className="prod-audit-card"><h2>Fonte autoritativa da calibração</h2><p><b>{data.authority.source}</b> — {data.authority.semantics}</p><p>{data.authority.privacy}</p></section><SummaryBlock title="Calibração — últimos 30 dias" block={data.calibration30Days}/><SummaryBlock title="Histórico canônico disponível" block={data.historicalAvailable}/></>}
  </main>;
}
