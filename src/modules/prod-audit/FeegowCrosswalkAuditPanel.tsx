import { useEffect, useMemo, useState } from "react";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const TOKEN_KEY="agendai_admin_token";
const CLIENTE_ID=1;

const PRIORITY_GROUPS=[
  {key:"CNU",match:(value:string)=>value.includes("CENTRAL NACIONAL UNIMED")||value==="CNU"||value.startsWith("CNU ")},
  {key:"HAPVIDA / INTERMÉDICA / NOTRE DAME",match:(value:string)=>value.includes("HAPVIDA")||value.includes("INTERMEDICA")||value.includes("NOTRE DAME")},
  {key:"ITAÚ SAÚDE",match:(value:string)=>value.includes("ITAU SAUDE")||value.includes("ITAU")},
  {key:"BRADESCO",match:(value:string)=>value.includes("BRADESCO")},
];

type MappingItem={
  convenio_nome?:string|null;
  produto_nome?:string|null;
  plano_nome?:string|null;
  rede_nome?:string|null;
  resolucao_status?:string|null;
  resolucao_criterio?:string|null;
  booking_ready?:boolean;
  mapeamento_origem?:string|null;
  necessita_revisao?:boolean;
  resolucao_candidatos?:Array<{feegow_plano_id:number;nome?:string|null}>;
};

type MappingCenter={
  summary?:Record<string,number>;
  items?:MappingItem[];
};

type ResolveResult=MappingCenter&{resolvidos_agora?:number};

function normalize(value:unknown){
  return String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ")
    .trim()
    .toUpperCase();
}

function authHeaders(json=false){
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token)throw new Error("Sessão administrativa não encontrada.");
  return json
    ? {Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"}
    : {Authorization:`Bearer ${token}`,Accept:"application/json"};
}

async function apiJson(path:string,init?:RequestInit){
  const isJson=Boolean(init?.body);
  const response=await fetch(`${API_BASE}${path}`,{...init,headers:authHeaders(isJson),cache:"no-store"});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.ok===false)throw new Error(payload?.details||payload?.error||`HTTP ${response.status}`);
  return payload?.data??payload;
}

async function loadMappingCenter(){
  return apiJson(`/api/admin/clientes/${CLIENTE_ID}/convenios/correspondencias-feegow?t=${Date.now()}`) as Promise<MappingCenter>;
}

async function resolveSafeMappings(){
  return apiJson(`/api/admin/clientes/${CLIENTE_ID}/convenios/correspondencias-feegow/resolver-seguras`,{
    method:"POST",
    body:"{}",
  }) as Promise<ResolveResult>;
}

function downloadJson(name:string,value:unknown){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function statusLabel(value:string){
  const labels:Record<string,string>={
    resolvido_automaticamente:"Resolvido automaticamente",
    confirmado_clinica:"Confirmado pela clínica",
    resolvivel_automaticamente:"Resolvível automaticamente",
    ambiguo:"Ambíguo",
    nao_encontrado:"Não encontrado",
    sem_vinculo_convenio:"Convênio sem vínculo Feegow",
    mapeamento_inativo:"Mapeamento inativo",
  };
  return labels[value]||value||"Sem classificação";
}

export default function FeegowCrosswalkAuditPanel(){
  const[data,setData]=useState<MappingCenter|null>(null);
  const[loading,setLoading]=useState(true);
  const[resolving,setResolving]=useState(false);
  const[exporting,setExporting]=useState(false);
  const[armed,setArmed]=useState(false);
  const[error,setError]=useState("");
  const[notice,setNotice]=useState("");

  const refresh=async()=>{
    setLoading(true);setError("");
    try{setData(await loadMappingCenter())}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}
  };

  useEffect(()=>{void refresh()},[]);

  const priority=useMemo(()=>{
    const items=data?.items||[];
    return PRIORITY_GROUPS.map(group=>{
      const rows=items.filter(item=>group.match(normalize(item.convenio_nome)));
      const byStatus=new Map<string,number>();
      for(const row of rows){
        const key=String(row.resolucao_status||"sem_classificacao");
        byStatus.set(key,(byStatus.get(key)||0)+1);
      }
      return {
        name:group.key,
        total:rows.length,
        automatic:byStatus.get("resolvido_automaticamente")||0,
        confirmed:byStatus.get("confirmado_clinica")||0,
        resolvable:byStatus.get("resolvivel_automaticamente")||0,
        ambiguous:byStatus.get("ambiguo")||0,
        notFound:byStatus.get("nao_encontrado")||0,
        noInsurerLink:byStatus.get("sem_vinculo_convenio")||0,
        inactive:byStatus.get("mapeamento_inativo")||0,
      };
    });
  },[data]);

  const safeCount=Number(data?.summary?.resolutiveis_automaticamente||0);

  const resolve=async()=>{
    if(resolving||!armed||safeCount<=0)return;
    setResolving(true);setError("");setNotice("");
    try{
      const result=await resolveSafeMappings();
      setData(result);setArmed(false);
      setNotice(`${Number(result.resolvidos_agora||0)} correspondência(s) segura(s) resolvida(s). Somente nome normalizado exato + candidato único dentro do mesmo convênio Feegow.`);
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setResolving(false)}
  };

  const exportAll=async()=>{
    if(exporting)return;
    setExporting(true);setError("");
    try{
      const [historico,ortopedia,crosswalk]=await Promise.all([
        apiJson(`/api/admin/clientes/${CLIENTE_ID}/prod-audit/reception-correction-candidates-v1?t=${Date.now()}`),
        apiJson(`/api/admin/clientes/${CLIENTE_ID}/prod-audit/ortopedia-reconciliation-v1?t=${Date.now()}`),
        loadMappingCenter(),
      ]);
      const now=new Date();
      const stamp=now.toISOString().replace(/[:.]/g,"-");
      downloadJson(`Angel_Auditoria_Completa_${stamp}.json`,{
        generatedAt:now.toISOString(),
        clienteId:CLIENTE_ID,
        historicalCorrectionCandidates:historico,
        ortopediaReconciliation:ortopedia,
        feegowMappingCenter:crosswalk,
      });
      setNotice("Auditoria completa exportada em um único JSON. Use esse arquivo no lugar de dezenas de prints.");
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setExporting(false)}
  };

  return <section className="prod-audit-card" style={{border:"2px solid rgba(16,185,129,.38)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div>
        <span className="prod-audit-kicker">CROSSWALK FEEGOW · MOTOR EXISTENTE</span>
        <h2 style={{marginTop:8}}>Correspondências técnicas seguras</h2>
        <p>O resolver automático não descobre convênio por plano.id. Ele trabalha dentro do mesmo convênio Feegow e só grava quando o nome normalizado é exato e existe um único candidato.</p>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button type="button" onClick={()=>void refresh()} disabled={loading||resolving}>{loading?"Atualizando…":"Atualizar crosswalk"}</button>
        <button type="button" onClick={()=>void exportAll()} disabled={exporting||resolving}>{exporting?"Gerando arquivo…":"Exportar auditoria completa"}</button>
      </div>
    </div>

    {error&&<div className="prod-audit-error" style={{marginTop:14}}><strong>Operação não concluída.</strong><br/>{error}</div>}
    {notice&&<div style={{marginTop:14,padding:14,border:"1px solid rgba(34,197,94,.45)",borderRadius:14}}>{notice}</div>}
    {loading&&!data&&<p>Carregando centro de correspondências Feegow…</p>}

    {data&&<>
      <div className="prod-audit-counts" style={{marginTop:16}}>
        <span>Opções usadas: <b>{Number(data.summary?.total_opcoes_usadas||data.items?.length||0)}</b></span>
        <span>Já automáticas: <b>{Number(data.summary?.resolvidas_automaticamente||0)}</b></span>
        <span>Confirmadas pela clínica: <b>{Number(data.summary?.confirmadas_clinica||0)}</b></span>
        <span>Seguras para resolver agora: <b>{safeCount}</b></span>
        <span>Ambíguas: <b>{Number(data.summary?.ambiguas||0)}</b></span>
        <span>Não encontradas: <b>{Number(data.summary?.nao_encontradas||0)}</b></span>
        <span>Sem vínculo do convênio: <b>{Number(data.summary?.sem_vinculo_convenio||0)}</b></span>
        <span>Mapeamentos inativos: <b>{Number(data.summary?.mapeamentos_inativos||0)}</b></span>
      </div>

      <div style={{display:"grid",gap:10,marginTop:18}}>
        {priority.map(item=><div key={item.name} style={{border:"1px solid rgba(148,163,184,.3)",borderRadius:14,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{item.name}</strong><span><b>{item.total}</b> opção(ões) em uso</span></div>
          <div style={{marginTop:7,fontSize:14}}>Seguras agora: <b>{item.resolvable}</b> · já resolvidas: <b>{item.automatic+item.confirmed}</b> · ambíguas: <b>{item.ambiguous}</b> · não encontradas: <b>{item.notFound}</b> · sem vínculo convênio: <b>{item.noInsurerLink}</b> · inativas: <b>{item.inactive}</b></div>
        </div>)}
      </div>

      <div style={{marginTop:18,padding:16,border:"1px solid rgba(148,163,184,.35)",borderRadius:14}}>
        <p style={{marginTop:0}}>Há <b>{safeCount}</b> correspondência(s) que o próprio motor atual considera resolvíveis automaticamente no catálogo Polibon inteiro. Ambíguas, não encontradas e vínculos já confirmados ficam intocados.</p>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,margin:"12px 0",cursor:safeCount>0?"pointer":"default"}}>
          <input type="checkbox" checked={armed} disabled={resolving||safeCount<=0} onChange={e=>setArmed(e.target.checked)} style={{marginTop:4}}/>
          <span>Confirmo executar somente o critério <b>nome normalizado exato + candidato único + mesmo convênio Feegow</b> para as {safeCount} correspondência(s) acima.</span>
        </label>
        <button type="button" onClick={()=>void resolve()} disabled={resolving||safeCount<=0||!armed} style={{fontWeight:800}}>{resolving?"Resolvendo e auditando…":safeCount>0?`Resolver ${safeCount} correspondência(s) segura(s)`:"Nenhuma correspondência segura pendente"}</button>
      </div>

      <details style={{marginTop:16}}><summary>Ver itens que ainda precisam de revisão</summary><div style={{display:"grid",gap:8,marginTop:12}}>{(data.items||[]).filter(item=>item.resolucao_status!=="resolvido_automaticamente"&&item.resolucao_status!=="confirmado_clinica").slice(0,120).map((item,i)=><div key={`${item.convenio_nome}-${item.produto_nome}-${i}`} style={{padding:10,borderBottom:"1px solid rgba(148,163,184,.2)"}}><b>{item.convenio_nome||"Convênio não identificado"}</b> · {item.produto_nome||item.plano_nome||"Produto não identificado"} — {statusLabel(String(item.resolucao_status||""))}</div>)}</div></details>
    </>}
  </section>;
}
