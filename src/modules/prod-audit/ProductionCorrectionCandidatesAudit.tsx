import { useEffect, useState } from "react";
import "./productionCoverageAudit.css";
import FeegowCrosswalkAuditPanel from "./FeegowCrosswalkAuditPanel";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const TOKEN_KEY="agendai_admin_token";
const CLIENTE_ID=1;
const ORTOPEDIA_CONFIRM_TOKEN="APLICAR_RECONCILIACAO_ORTOPEDIA_V1";

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

type ReconciliationItem={
  medicoId:number;medicoNome:string;crm:string;especialidadeId:number;especialidadeNome:string;
  convenioId:number;convenio:string;convenioTarget:string;convenioProdutoId:number;produto:string;
  aceiteId?:number;reason?:string;
};
type ReconciliationPlan={
  mode:string;
  specialty:{id:number;nome:string};
  totals:{
    expectedDoctors:number;expectedConvenios:number;expectedDoctorConvenioPairs:number;
    mappedAllowedAlreadyActive:number;insertCandidates:number;explicitInactiveConflicts:number;
    unmappedProducts:number;businessExcludedProducts:number;existingGeneralAcceptances:number;
  };
  candidates:ReconciliationItem[];
  conflicts:ReconciliationItem[];
  unmapped:ReconciliationItem[];
  excluded:ReconciliationItem[];
  alreadyActive:ReconciliationItem[];
  rules:{segurosUnimed:string;cnu:string;metrus:string;carePlus:string};
  safety:{writesPerformed:boolean;strategy:string;confirmToken:string};
};
type ReconciliationApplyResult={
  applied:boolean;inserted:number;preservedInactiveConflicts:number;
  before:ReconciliationPlan["totals"];
  after:ReconciliationPlan["totals"];
  safety:string;
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

async function loadOrtopediaReconciliation(){
  return apiJson(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/ortopedia-reconciliation-v1?t=${Date.now()}`,{headers:authHeaders()}) as Promise<ReconciliationPlan>;
}

async function applyOrtopediaReconciliation(expectedCandidateCount:number){
  return apiJson(`${API_BASE}/api/admin/clientes/${CLIENTE_ID}/prod-audit/ortopedia-reconciliation-v1/apply`,{
    method:"POST",
    headers:authHeaders({"Content-Type":"application/json"}),
    body:JSON.stringify({confirm:ORTOPEDIA_CONFIRM_TOKEN,expectedCandidateCount}),
  }) as Promise<ReconciliationApplyResult>;
}

function label(value:string){
  const labels:Record<string,string>={
    provavel_crosswalk_incompleto:"Provável crosswalk incompleto",
    provavel_gap_crosswalk_atual:"Provável gap de crosswalk atual",
    identificacao_comercial_carteirinha:"Carteirinha / identificação comercial",
    forma_atendimento_nao_resolvida:"Forma de atendimento não resolvida",
    resolucao_comercial_pendente:"Resolução comercial pendente",
    resolver_comercial_sem_gap_crosswalk_atual:"Resolver comercial sem gap atual de crosswalk",
    produto_plano_pendente_sem_gap_crosswalk_atual:"Produto/plano pendente sem gap atual de crosswalk",
    provavel_subcobertura_atual:"Provável subcobertura atual",
    cobertura_existe_hoje_revisar_parser_regra:"Cobertura existe hoje — revisar parser/regra",
    retry_real_resolucao_paciente:"Retry real na resolução do paciente",
    resolucao_paciente_requer_revisao:"Resolução do paciente requer revisão",
    preflight_ambiguo:"Preflight ambíguo",
    preflight_nao_encontrado:"Paciente não encontrado no preflight",
    preflight_resolvido_nao_e_causa_raiz:"Preflight resolvido — não é causa raiz",
    preflight_sem_evidencia_de_falha:"Preflight sem evidência de falha",
    identificacao_insuficiente:"Identificação histórica insuficiente",
    inconclusivo:"Inconclusivo",
  };
  return labels[value]||value;
}

function percent(value:number,total:number){return total?Math.round((value/total)*1000)/10:0}

function ActionableCard({item}:{item:ActionablePair}){
  return <article style={{border:"1px solid rgba(148,163,184,.35)",borderRadius:18,padding:18,display:"grid",gap:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}><div><strong style={{fontSize:20}}>{label(item.diagnosis)}</strong><div>{item.convenio} · {item.especialidade}</div></div><strong>{item.total} caso{item.total===1?"":"s"} · prioridade {item.priority}</strong></div>
    <div><b>Produto/plano/rede:</b> {item.produtoPlanoRede}</div>
    <div><b>Médico:</b> {item.medico}</div>
    <div><b>Subsinal:</b> {item.signal}</div>
    <div><b>Snapshot atual:</b> {item.currentSnapshot.activeAcceptances} aceite(s) · {item.currentSnapshot.activeDoctors} médico(s) · {item.currentSnapshot.activeProducts} produto(s) · {item.currentSnapshot.unmappedProducts} sem crosswalk.</div>
    <div><b>Ação sugerida:</b> {item.action}</div>
  </article>
}

function OrtopediaReconciliationPanel(){
  const[plan,setPlan]=useState<ReconciliationPlan|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[armed,setArmed]=useState(false);
  const[applying,setApplying]=useState(false);
  const[result,setResult]=useState<ReconciliationApplyResult|null>(null);

  const refresh=async()=>{
    setLoading(true);setError("");
    try{setPlan(await loadOrtopediaReconciliation())}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}
  };
  useEffect(()=>{void refresh()},[]);

  const apply=async()=>{
    if(!plan||!armed||applying||plan.totals.insertCandidates<=0)return;
    setApplying(true);setError("");setResult(null);
    try{
      const applied=await applyOrtopediaReconciliation(plan.totals.insertCandidates);
      setResult(applied);setArmed(false);
      setPlan(await loadOrtopediaReconciliation());
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setApplying(false)}
  };

  return <section className="prod-audit-card" style={{border:"2px solid rgba(37,99,235,.45)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div><span className="prod-audit-kicker">ETAPA 4/4 · ORTOPEDIA</span><h2 style={{marginTop:8}}>Reconciliação controlada com o caderno</h2><p>4 ortopedistas × 8 convênios. Só entram vínculos específicos inexistentes de produtos ativos, permitidos e com plano.id Feegow mapeado.</p></div>
      <button type="button" onClick={()=>void refresh()} disabled={loading||applying}>{loading?"Atualizando…":"Atualizar preview"}</button>
    </div>
    {error&&<div className="prod-audit-error" style={{marginTop:14}}><strong>Reconciliação não executada.</strong><br/>{error}</div>}
    {loading&&!plan&&<p>Carregando estado real dos aceites…</p>}
    {plan&&<>
      <div className="prod-audit-counts" style={{marginTop:16}}>
        <span>Pares médico × convênio: <b>{plan.totals.expectedDoctorConvenioPairs}</b></span>
        <span>Vínculos específicos já ativos: <b>{plan.totals.mappedAllowedAlreadyActive}</b></span>
        <span>Candidatos seguros para inclusão: <b>{plan.totals.insertCandidates}</b></span>
        <span>Exceções inativas preservadas: <b>{plan.totals.explicitInactiveConflicts}</b></span>
        <span>Produtos sem plano.id: <b>{plan.totals.unmappedProducts}</b></span>
        <span>Produtos excluídos pelo caderno: <b>{plan.totals.businessExcludedProducts}</b></span>
        <span>Aceites gerais já existentes: <b>{plan.totals.existingGeneralAcceptances}</b></span>
      </div>
      <div style={{display:"grid",gap:6,marginTop:16}}>
        <div><b>Seguros Unimed:</b> {plan.rules.segurosUnimed}</div>
        <div><b>CNU:</b> {plan.rules.cnu}</div>
        <div><b>Metrus:</b> {plan.rules.metrus}</div>
        <div><b>Care Plus:</b> {plan.rules.carePlus}</div>
      </div>
      {plan.totals.unmappedProducts>0&&<p style={{marginTop:14}}><b>Atenção:</b> os itens sem plano.id não serão liberados por esta correção; permanecem na fila técnica de crosswalk.</p>}
      {plan.totals.explicitInactiveConflicts>0&&<p><b>Exceções preservadas:</b> vínculos específicos já existentes como inativos não serão reativados.</p>}
      <div style={{marginTop:18,padding:16,border:"1px solid rgba(148,163,184,.35)",borderRadius:14}}>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:plan.totals.insertCandidates>0?"pointer":"default"}}>
          <input type="checkbox" checked={armed} disabled={plan.totals.insertCandidates<=0||applying} onChange={e=>setArmed(e.target.checked)} style={{marginTop:4}}/>
          <span>Confirmo a aplicação somente dos <b>{plan.totals.insertCandidates}</b> vínculos classificados acima como seguros. Nenhuma linha existente será removida ou reativada.</span>
        </label>
        <button type="button" onClick={()=>void apply()} disabled={!armed||applying||plan.totals.insertCandidates<=0} style={{marginTop:14,fontWeight:800}}>
          {applying?"Aplicando e conferindo…":plan.totals.insertCandidates>0?`Aplicar ${plan.totals.insertCandidates} vínculo(s) seguro(s)`:"Nenhuma inclusão necessária"}
        </button>
      </div>
      {result&&<div style={{marginTop:16,padding:16,border:"1px solid rgba(34,197,94,.45)",borderRadius:14}}><strong>Reconciliação aplicada.</strong><p>Inseridos: <b>{result.inserted}</b> · conflitos inativos preservados: <b>{result.preservedInactiveConflicts}</b> · candidatos restantes após conferência: <b>{result.after.insertCandidates}</b>.</p><p>{result.safety}</p></div>}
      <p style={{marginTop:14,fontSize:13,opacity:.8}}>{plan.safety.strategy}</p>
    </>}
  </section>;
}

export default function ProductionCorrectionCandidatesAudit(){
  const[data,setData]=useState<Data|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;loadData().then(v=>{if(!cancelled)setData(v)}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:String(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true};},[]);
  const identification=data?.identification;
  return <main className="prod-audit-page">
    <header className="prod-audit-header"><div><span className="prod-audit-kicker">PRODUÇÃO · AUDITORIA + RECONCILIAÇÃO CONTROLADA</span><h1>Candidatos a correção</h1><p>Histórico real cruzado com o estado atual. A reconciliação de Ortopedia exige confirmação explícita e é estritamente aditiva.</p></div><button type="button" onClick={()=>window.location.href="/?audit=reception-causes"}>Voltar às causas</button></header>
    <OrtopediaReconciliationPanel/>
    <FeegowCrosswalkAuditPanel/>
    {loading&&<section className="prod-audit-card">Cruzando histórico, cobertura e Feegow…</section>}
    {error&&<section className="prod-audit-error"><strong>Falha ao carregar.</strong><br/>{error}</section>}
    {data&&<>
      <section className={data.calibration.ok?"prod-audit-card":"prod-audit-error"}><h2>{data.calibration.ok?"Calibração: OK":"Calibração: DIVERGENTE"}</h2><p>Recepção no snapshot: <b>{data.calibration.canonicalReceptionInThisSnapshot}</b> · Referência: <b>{data.calibration.canonicalReceptionReference}</b> · Sessões nos 3 grupos prioritários: <b>{data.calibration.focusSessions}</b>.</p></section>
      <section className="prod-audit-card"><h2>Capacidades do cruzamento</h2><p>Aceites atuais: <b>{data.capabilities.acceptanceSnapshot?"disponível":"indisponível"}</b> · Mapeamentos Feegow: <b>{data.capabilities.mappingSnapshot?"disponível":"indisponível"}</b>.</p>{data.capabilities.acceptanceError&&<p>{data.capabilities.acceptanceError}</p>}{data.capabilities.mappingError&&<p>{data.capabilities.mappingError}</p>}</section>
      {identification&&<>
        <section className="prod-audit-card"><h2>Identificação concreta do histórico</h2><div className="prod-audit-counts"><span>Grupo prioritário: <b>{identification.focusSessions}</b></span><span>Convênio identificado: <b>{identification.identifiedConvenio} ({percent(identification.identifiedConvenio,identification.focusSessions)}%)</b></span><span>Especialidade identificada: <b>{identification.identifiedEspecialidade} ({percent(identification.identifiedEspecialidade,identification.focusSessions)}%)</b></span><span>Convênio + especialidade: <b>{identification.identifiedBoth} ({percent(identification.identifiedBoth,identification.focusSessions)}%)</b></span><span>Produto/plano/rede identificado: <b>{identification.identifiedProduct}</b></span><span>Médico identificado: <b>{identification.identifiedDoctor}</b></span><span>Ainda sem convênio + especialidade: <b>{identification.unidentifiedBoth}</b></span></div><p>{identification.methodology}</p></section>
        <section className="prod-audit-card"><h2>Resumo acionável</h2><div className="prod-audit-counts">{identification.summary.map(item=><span key={item.diagnosis}>{label(item.diagnosis)}: <b>{item.total}</b></span>)}</div></section>
        <section className="prod-audit-card"><h2>Casos concretos priorizados</h2><p>Esta é a fila para decisão. Ela já combina o histórico recuperado com o snapshot atual de cobertura/crosswalk.</p><div style={{display:"grid",gap:14}}>{identification.actionablePairs.slice(0,40).map((item,i)=><ActionableCard key={`${item.cause}-${item.convenio}-${item.especialidade}-${item.produtoPlanoRede}-${item.signal}-${i}`} item={item}/>)}</div></section>
      </>}
      <section className="prod-audit-card"><h2>Resumo legado por diagnóstico</h2><div className="prod-audit-counts">{data.summary.map(item=><span key={item.diagnosis}>{label(item.diagnosis)}: <b>{item.total}</b></span>)}</div></section>
      <section className="prod-audit-card"><h2>Fila técnica completa</h2><p>{data.methodology.caution}</p><div className="prod-audit-table-wrap"><table><thead><tr><th>Casos</th><th>Diagnóstico</th><th>Convênio</th><th>Especialidade</th><th>Subsinal</th><th>Confiança</th><th>Aceites ativos</th><th>Médicos</th><th>Gerais</th><th>Específicos</th><th>Produtos ativos</th><th>Mapeados</th><th>Não mapeados</th><th>Ação sugerida</th></tr></thead><tbody>{data.candidates.map((c,i)=><tr key={`${c.cause}-${c.convenio}-${c.especialidade}-${c.signal}-${i}`}><td><b>{c.total}</b></td><td><b>{label(c.diagnosis)}</b></td><td>{c.convenio}</td><td>{c.especialidade}</td><td>{c.signal}</td><td>{c.confidence}</td><td>{c.currentSnapshot.activeAcceptances}</td><td>{c.currentSnapshot.activeDoctors}</td><td>{c.currentSnapshot.generalAcceptances}</td><td>{c.currentSnapshot.specificAcceptances}</td><td>{c.currentSnapshot.activeProducts}</td><td>{c.currentSnapshot.mappedProducts}</td><td>{c.currentSnapshot.unmappedProducts??"—"}</td><td>{c.recommendedAction}</td></tr>)}</tbody></table></div></section>
      <section className="prod-audit-card"><p><b>Histórico:</b> {data.methodology.historicalEvidence}</p><p><b>Snapshot atual:</b> {data.methodology.currentSnapshot}</p><p>{data.methodology.safety}</p></section>
    </>}
  </main>;
}
