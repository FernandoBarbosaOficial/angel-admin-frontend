import { useEffect, useState } from "react";
import "./productionCoverageAudit.css";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const TOKEN_KEY="agendai_admin_token";
const CLIENTE_ID=1;
const ORTOPEDIA_GENERAL_CONFIRM_TOKEN="APLICAR_COBERTURA_GERAL_ORTOPEDIA_V1";

type Candidate={
  cause:string;convenio:string;especialidade:string;signal:string;total:number;diagnosis:string;confidence:string;recommendedAction:string;
  currentSnapshot:{activeAcceptances:number;activeDoctors:number;generalAcceptances:number;specificAcceptances:number;activeProducts:number;mappedProducts:number;unmappedProducts:number|null};
};
type ActionablePair={
  cause:string;convenio:string;especialidade:string;produtoPlanoRede:string;medico:string;signal:string;total:number;diagnosis:string;priority:"alta"|"media"|"baixa";action:string;
  currentSnapshot:{activeAcceptances:number;activeDoctors:number;activeProducts:number;mappedProducts:number;unmappedProducts:number};
};
type Identification={
  focusSessions:number;identifiedConvenio:number;identifiedEspecialidade:number;identifiedBoth:number;identifiedProduct:number;identifiedDoctor:number;unidentifiedBoth:number;
  reconstructedFocusSessions?:number;reconstructionGap?:number;reconstructionRate?:number;
  summary:Array<{diagnosis:string;total:number}>;
  actionablePairs:ActionablePair[];
  methodology:string;
};
type Data={
  calibration:{canonicalReceptionInThisSnapshot:number;canonicalReceptionReference:number;focusSessions:number;ok:boolean};
  capabilities:{acceptanceSnapshot:boolean;mappingSnapshot:boolean;acceptanceError?:string|null;mappingError?:string|null};
  summary:Array<{diagnosis:string;total:number}>;
  candidates:Candidate[];
  methodology:{historicalEvidence:string;currentSnapshot:string;safety:string;caution:string};
  identification?:Identification;
};

type GeneralPair={
  medicoId:number;medicoNome:string;crm:string;especialidadeId:number;especialidadeNome:string;
  convenioId:number;convenio:string;status:string;bookingTargetReady:boolean;bookingTargetId:number|null;
  feegowConvenioId:number|null;feegowPlanoId:number|null;feegowPlanoNome:string|null;
};
type GeneralPlan={
  mode:string;
  specialty:{id:number;nome:string};
  totals:{
    expectedDoctors:number;expectedConvenios:number;expectedDoctorConvenioPairs:number;
    existingGeneralAcceptances:number;generalInsertCandidates:number;generalConflicts:number;
    bookingTargetProblems:number;bookingTargetsReady:number;
  };
  candidates:GeneralPair[];conflicts:GeneralPair[];targetProblems:GeneralPair[];alreadyActive:GeneralPair[];pairSummary:GeneralPair[];
  rules:Record<string,string>;
  safety:{writesPerformed:boolean;maxGeneralInserts:number;confirmToken:string;strategy:string};
};
type GeneralApplyResult={
  applied:boolean;inserted:number;before:GeneralPlan["totals"];after:GeneralPlan["totals"];safety:string;
};

function authHeaders(extra?:Record<string,string>){
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token)throw new Error("Sessão administrativa não encontrada.");
  return {Authorization:`Bearer ${token}`,Accept:"application/json",...(extra||{})};
}
async function apiJson(url:string,init?:RequestInit){
  const response=await fetch(url,{...init,cache:"no-store"});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok)throw new Error(payload?.details||payload?.error||`HTTP ${response.status}`);
  return payload.data;
}
async function loadData(){
  return apiJson(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/reception-correction-candidates-v1?t=${Date.now()}`,{headers:authHeaders()}) as Promise<Data>;
}
async function loadGeneralPlan(){
  return apiJson(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/ortopedia-general-reconciliation-v1?t=${Date.now()}`,{headers:authHeaders()}) as Promise<GeneralPlan>;
}
async function applyGeneralPlan(expectedCandidateCount:number){
  return apiJson(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/ortopedia-general-reconciliation-v1/apply`,{
    method:"POST",
    headers:authHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({confirm:ORTOPEDIA_GENERAL_CONFIRM_TOKEN,expectedCandidateCount}),
  }) as Promise<GeneralApplyResult>;
}

function downloadJson(name:string,value:unknown){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
function label(value:string){
  const labels:Record<string,string>={
    provavel_crosswalk_incompleto:"Provável crosswalk incompleto",provavel_gap_crosswalk_atual:"Provável gap de crosswalk atual",identificacao_comercial_carteirinha:"Carteirinha / identificação comercial",forma_atendimento_nao_resolvida:"Forma de atendimento não resolvida",resolucao_comercial_pendente:"Resolução comercial pendente",resolver_comercial_sem_gap_crosswalk_atual:"Resolver comercial sem gap atual de crosswalk",produto_plano_pendente_sem_gap_crosswalk_atual:"Produto/plano pendente sem gap atual de crosswalk",provavel_subcobertura_atual:"Provável subcobertura atual",cobertura_existe_hoje_revisar_parser_regra:"Cobertura existe hoje — revisar parser/regra",retry_real_resolucao_paciente:"Retry real na resolução do paciente",resolucao_paciente_requer_revisao:"Resolução do paciente requer revisão",preflight_ambiguo:"Preflight ambíguo",preflight_nao_encontrado:"Paciente não encontrado no preflight",preflight_resolvido_nao_e_causa_raiz:"Preflight resolvido — não é causa raiz",preflight_sem_evidencia_de_falha:"Preflight sem evidência de falha",identificacao_insuficiente:"Identificação histórica insuficiente",inconclusivo:"Inconclusivo",
  };
  return labels[value]||value;
}
function percent(value:number,total:number){return total?Math.round((value/total)*1000)/10:0}

function GeneralOrtopediaPanel(){
  const[plan,setPlan]=useState<GeneralPlan|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const[armed,setArmed]=useState(false);const[applying,setApplying]=useState(false);const[result,setResult]=useState<GeneralApplyResult|null>(null);
  const refresh=async()=>{setLoading(true);setError("");try{setPlan(await loadGeneralPlan())}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}};
  useEffect(()=>{void refresh()},[]);
  const canApply=Boolean(plan&&plan.totals.generalInsertCandidates>0&&plan.totals.generalConflicts===0&&plan.totals.bookingTargetProblems===0);
  const apply=async()=>{if(!plan||!armed||!canApply||applying)return;setApplying(true);setError("");setResult(null);try{const applied=await applyGeneralPlan(plan.totals.generalInsertCandidates);setResult(applied);setArmed(false);setPlan(await loadGeneralPlan())}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setApplying(false)}};

  return <section className="prod-audit-card" style={{border:"2px solid rgba(37,99,235,.45)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}><div><span className="prod-audit-kicker">ORTOPEDIA · COBERTURA GERAL</span><h2 style={{marginTop:8}}>4 médicos × 8 convênios</h2><p>Planos comerciais ficam separados do destino técnico Feegow. Nenhuma expansão produto × médico é executada.</p></div><button type="button" onClick={()=>void refresh()} disabled={loading||applying}>{loading?"Atualizando…":"Atualizar"}</button></div>
    {error&&<div className="prod-audit-error" style={{marginTop:14}}><strong>Reconciliação não disponível.</strong><br/>{error}</div>}
    {loading&&!plan&&<p>Conferindo coberturas gerais e booking targets…</p>}
    {plan&&<>
      <div className="prod-audit-counts" style={{marginTop:16}}><span>Pares esperados: <b>{plan.totals.expectedDoctorConvenioPairs}</b></span><span>Gerais já ativos: <b>{plan.totals.existingGeneralAcceptances}</b></span><span>Gerais faltantes: <b>{plan.totals.generalInsertCandidates}</b></span><span>Conflitos: <b>{plan.totals.generalConflicts}</b></span><span>Targets técnicos prontos: <b>{plan.totals.bookingTargetsReady}/{plan.totals.expectedConvenios}</b></span><span>Problemas de target: <b>{plan.totals.bookingTargetProblems}</b></span></div>
      {plan.totals.bookingTargetProblems>0&&<div className="prod-audit-error" style={{marginTop:14}}><strong>Aplicação bloqueada.</strong> Há convênio sem um único booking target default ativo e validado.</div>}
      {plan.totals.generalConflicts>0&&<div className="prod-audit-error" style={{marginTop:14}}><strong>Aplicação bloqueada.</strong> Existem exceções/inativos que precisam ser preservados e revisados.</div>}
      {plan.totals.generalInsertCandidates===0?<div style={{marginTop:16,padding:14,border:"1px solid rgba(34,197,94,.45)",borderRadius:14}}><strong>Cobertura geral de Ortopedia completa.</strong></div>:<div style={{marginTop:16,padding:16,border:"1px solid rgba(148,163,184,.35)",borderRadius:14}}>
        <p style={{marginTop:0}}>Faltam <b>{plan.totals.generalInsertCandidates}</b> cobertura(s) geral(is). O apply só insere linhas com <code>convenio_produto_id = NULL</code>; não altera crosswalk, booking target ou linhas existentes.</p>
        <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:canApply?"pointer":"default"}}><input type="checkbox" checked={armed} disabled={!canApply||applying} onChange={e=>setArmed(e.target.checked)} style={{marginTop:4}}/><span>Confirmo aplicar somente as <b>{plan.totals.generalInsertCandidates}</b> coberturas gerais faltantes validadas pelo caderno e pelos targets técnicos.</span></label>
        <button type="button" onClick={()=>void apply()} disabled={!armed||!canApply||applying} style={{marginTop:14,fontWeight:800}}>{applying?"Aplicando e conferindo…":`Aplicar ${plan.totals.generalInsertCandidates} cobertura(s) geral(is)`}</button>
      </div>}
      <details style={{marginTop:14}}><summary>Ver pares faltantes e regras preservadas</summary><div style={{marginTop:12,display:"grid",gap:8}}>{plan.candidates.map(item=><div key={`${item.medicoId}-${item.convenioId}`}><b>{item.medicoNome}</b> → {item.convenio} · target técnico {item.feegowPlanoNome||"não identificado"}</div>)}</div><div style={{marginTop:14,display:"grid",gap:5}}>{Object.entries(plan.rules).map(([key,value])=><div key={key}><b>{key}:</b> {value}</div>)}</div></details>
      {result&&<div style={{marginTop:16,padding:16,border:"1px solid rgba(34,197,94,.45)",borderRadius:14}}><strong>Reconciliação aplicada.</strong><p>Inseridas: <b>{result.inserted}</b> · gerais restantes: <b>{result.after.generalInsertCandidates}</b>.</p><p>{result.safety}</p></div>}
    </>}
  </section>;
}

export default function ProductionCorrectionCandidatesAudit(){
  const[data,setData]=useState<Data|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);const[exporting,setExporting]=useState(false);
  useEffect(()=>{let cancelled=false;loadData().then(v=>{if(!cancelled)setData(v)}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:String(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[]);
  const identification=data?.identification;
  const exportAudit=async()=>{if(exporting)return;setExporting(true);try{const[history,general]=await Promise.all([loadData(),loadGeneralPlan()]);downloadJson(`Angel_Auditoria_Compacta_${new Date().toISOString().replace(/[:.]/g,"-")}.json`,{generatedAt:new Date().toISOString(),clienteId:CLIENTE_ID,history,generalOrtopedia:general})}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setExporting(false)}};
  return <main className="prod-audit-page">
    <header className="prod-audit-header"><div><span className="prod-audit-kicker">PRODUÇÃO · AUDITORIA CONTROLADA</span><h1>Candidatos a correção</h1><p>Visão compacta. A cobertura comercial e o destino técnico Feegow são tratados em camadas separadas.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" onClick={()=>void exportAudit()} disabled={exporting}>{exporting?"Gerando…":"Exportar JSON"}</button><button type="button" onClick={()=>window.location.href="/?audit=reception-causes"}>Voltar às causas</button></div></header>
    <GeneralOrtopediaPanel/>
    <section className="prod-audit-card"><h2>Destino técnico Feegow</h2><p>Para os convênios com <code>convenio_booking_targets</code> validado, o plano técnico <code>*_ANGEL</code> é a autoridade do booking após a cobertura comercial. A correção em massa de <code>feegow_plano_mapeamentos</code> ficou suspensa nesta tela para não confundir crosswalk histórico com requisito atual de booking.</p></section>
    {loading&&<section className="prod-audit-card">Cruzando histórico e cobertura…</section>}
    {error&&<section className="prod-audit-error"><strong>Falha ao carregar.</strong><br/>{error}</section>}
    {data&&<>
      <section className={data.calibration.ok?"prod-audit-card":"prod-audit-error"}><h2>{data.calibration.ok?"Calibração: OK":"Calibração: DIVERGENTE"}</h2><div className="prod-audit-counts"><span>Recepção: <b>{data.calibration.canonicalReceptionInThisSnapshot}</b></span><span>Referência: <b>{data.calibration.canonicalReceptionReference}</b></span><span>3 grupos prioritários: <b>{data.calibration.focusSessions}</b></span><span>Aceites: <b>{data.capabilities.acceptanceSnapshot?"OK":"indisponível"}</b></span><span>Crosswalk histórico: <b>{data.capabilities.mappingSnapshot?"disponível":"indisponível"}</b></span></div></section>
      {identification&&<>
        <section className="prod-audit-card"><h2>Identificação concreta do histórico</h2><div className="prod-audit-counts"><span>Universo: <b>{identification.focusSessions}</b></span>{identification.reconstructedFocusSessions!==undefined&&<span>Reconstruídas: <b>{identification.reconstructedFocusSessions}</b></span>}{identification.reconstructionGap!==undefined&&<span>Sem reconstrução acionável: <b>{identification.reconstructionGap}</b></span>}<span>Convênio: <b>{identification.identifiedConvenio} ({percent(identification.identifiedConvenio,identification.focusSessions)}%)</b></span><span>Especialidade: <b>{identification.identifiedEspecialidade} ({percent(identification.identifiedEspecialidade,identification.focusSessions)}%)</b></span><span>Convênio + especialidade: <b>{identification.identifiedBoth} ({percent(identification.identifiedBoth,identification.focusSessions)}%)</b></span></div></section>
        <section className="prod-audit-card"><h2>Resumo acionável</h2><div className="prod-audit-counts">{identification.summary.map(item=><span key={item.diagnosis}>{label(item.diagnosis)}: <b>{item.total}</b></span>)}</div></section>
        <section className="prod-audit-card"><details><summary style={{fontSize:20,fontWeight:800,cursor:"pointer"}}>Casos concretos priorizados — {identification.actionablePairs.length} grupos (recolhido)</summary><div style={{display:"grid",gap:8,marginTop:12}}>{identification.actionablePairs.slice(0,40).map((item,i)=><div key={`${item.cause}-${item.convenio}-${item.especialidade}-${i}`} style={{padding:12,border:"1px solid rgba(148,163,184,.3)",borderRadius:12}}><b>{item.total} · {label(item.diagnosis)}</b><div>{item.convenio} · {item.especialidade}</div><div>{item.action}</div></div>)}</div></details></section>
      </>}
      <section className="prod-audit-card"><details><summary style={{fontSize:20,fontWeight:800,cursor:"pointer"}}>Fila técnica histórica — {data.candidates.length} grupos (recolhida)</summary><p>{data.methodology.caution}</p><div className="prod-audit-table-wrap"><table><thead><tr><th>Casos</th><th>Diagnóstico</th><th>Convênio</th><th>Especialidade</th><th>Subsinal</th><th>Aceites</th><th>Produtos</th><th>Não mapeados</th></tr></thead><tbody>{data.candidates.map((c,i)=><tr key={`${c.cause}-${c.convenio}-${c.especialidade}-${i}`}><td><b>{c.total}</b></td><td>{label(c.diagnosis)}</td><td>{c.convenio}</td><td>{c.especialidade}</td><td>{c.signal}</td><td>{c.currentSnapshot.activeAcceptances}</td><td>{c.currentSnapshot.activeProducts}</td><td>{c.currentSnapshot.unmappedProducts??"—"}</td></tr>)}</tbody></table></div></details></section>
    </>}
  </main>;
}
