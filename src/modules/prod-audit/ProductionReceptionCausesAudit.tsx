import { useEffect, useState } from "react";
import "./productionCoverageAudit.css";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const TOKEN_KEY="agendai_admin_token";
const CLIENTE_ID=1;

type Cause={key:string;label:string;total:number;high:number;medium:number;low:number};
type Data={totals:Record<string,number>;causes:Cause[];methodology:{source:string;privacy:string;caution:string}};

async function apiGet(path:string,token:string){const r=await fetch(`${API_BASE}${path}?t=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},cache:"no-store"});const p=await r.json().catch(()=>null);if(!r.ok||!p?.ok)throw new Error(p?.details||p?.error||`HTTP ${r.status}`);return p.data as Data;}

export default function ProductionReceptionCausesAudit(){
  const[data,setData]=useState<Data|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;(async()=>{try{const token=localStorage.getItem(TOKEN_KEY);if(!token)throw new Error("Sessão administrativa não encontrada.");const next=await apiGet(`/api/admin/clientes/${CLIENTE_ID}/prod-audit/whatsapp-reception-causes-v1`,token);if(!cancelled)setData(next);}catch(e){if(!cancelled)setError(e instanceof Error?e.message:String(e));}finally{if(!cancelled)setLoading(false);}})();return()=>{cancelled=true};},[]);
  return <main className="prod-audit-page"><header className="prod-audit-header"><div><span className="prod-audit-kicker">PRODUÇÃO · SOMENTE LEITURA</span><h1>Causas de encaminhamento à recepção</h1><p>Classificação agregada dos encaminhamentos canônicos. Nenhum dado é alterado.</p></div><button type="button" onClick={()=>window.location.href="/?audit=history-canonical"}>Voltar ao histórico</button></header>{loading&&<section className="prod-audit-card">Classificando encaminhamentos reais…</section>}{error&&<section className="prod-audit-error"><strong>Falha ao carregar.</strong><br/>{error}</section>}{data&&<><section className="prod-audit-grid"><article className="prod-audit-card"><small>Sessões analisadas</small><strong>{data.totals.sessions||0}</strong></article><article className="prod-audit-card"><small>Encaminhadas à recepção</small><strong>{data.totals.receptionSessions||0}</strong></article><article className="prod-audit-card"><small>Confiança alta</small><strong>{data.totals.classifiedHighConfidence||0}</strong></article><article className="prod-audit-card"><small>Confiança média</small><strong>{data.totals.classifiedMediumConfidence||0}</strong></article><article className="prod-audit-card"><small>Baixa / inconclusiva</small><strong>{data.totals.unclassifiedLowConfidence||0}</strong></article></section><section className="prod-audit-card"><h2>Distribuição das causas</h2><p>{data.methodology.caution}</p><div className="prod-audit-table-wrap"><table><thead><tr><th>Causa provável</th><th>Total</th><th>Alta confiança</th><th>Média</th><th>Baixa</th><th>% recepção</th></tr></thead><tbody>{data.causes.map(c=><tr key={c.key}><td>{c.label}</td><td>{c.total}</td><td>{c.high}</td><td>{c.medium}</td><td>{c.low}</td><td>{data.totals.receptionSessions?Math.round((c.total/data.totals.receptionSessions)*1000)/10:0}%</td></tr>)}</tbody></table></div><p><b>Fonte:</b> {data.methodology.source}</p><p>{data.methodology.privacy}</p></section></>}</main>;
}
