import { useEffect, useMemo, useState } from "react";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const TOKEN_KEY="agendai_admin_token";
const CLIENTE_ID=1;
const MAX_SAFE_BATCH=500;

const PRIORITY_GROUPS=[
  {key:"CNU",match:(value:string)=>value.includes("CENTRAL NACIONAL UNIMED")||value==="CNU"||value.startsWith("CNU ")},
  {key:"HAPVIDA / INTERMÉDICA / NOTRE DAME",match:(value:string)=>value.includes("HAPVIDA")||value.includes("HAP VIDA")||value.includes("INTERMEDICA")||value.includes("NOTRE DAME")},
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

type MappingCenter={summary?:Record<string,number>;items?:MappingItem[]};

type FormaAtendimento={
  id:number;
  nome?:string|null;
  tipo?:string|null;
  ativo?:boolean;
  permite_agendamento_online?:boolean;
  convenio_global?:string|null;
};

type CatalogProduct={
  id:number;
  nome?:string|null;
  ativo?:boolean;
  booking_ready?:boolean;
  resolucao_status?:string|null;
  resolucao_criterio?:string|null;
  resolucao_candidatos?:Array<{feegow_plano_id:number;nome?:string|null}>;
};

type CatalogEntry={
  group:string;
  formaId:number;
  convenio:string;
  produtoId:number;
  produto:string;
  status:string;
  criterio:string;
  bookingReady:boolean;
  candidates:Array<{feegow_plano_id:number;nome?:string|null}>;
};

type PriorityCatalog={
  entries:CatalogEntry[];
  safe:CatalogEntry[];
  byGroup:Array<{name:string;total:number;resolved:number;safe:number;ambiguous:number;notFound:number;noInsurerLink:number;inactive:number}>;
};

function normalize(value:unknown){
  return String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ")
    .trim()
    .toUpperCase();
}

function groupFor(value:unknown){
  const normalized=normalize(value);
  return PRIORITY_GROUPS.find(group=>group.match(normalized))?.key||null;
}

function authHeaders(json=false){
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token)throw new Error("Sessão administrativa não encontrada.");
  return json
    ? {Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"}
    : {Authorization:`Bearer ${token}`,Accept:"application/json"};
}

async function apiJson(path:string,init?:RequestInit){
  const response=await fetch(`${API_BASE}${path}`,{...init,headers:authHeaders(Boolean(init?.body)),cache:"no-store"});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.ok===false)throw new Error(payload?.details||payload?.error||`HTTP ${response.status}`);
  return payload?.data??payload;
}

async function loadMappingCenter(){
  return apiJson(`/api/admin/clientes/${CLIENTE_ID}/convenios/correspondencias-feegow?t=${Date.now()}`) as Promise<MappingCenter>;
}

async function loadPriorityCatalog():Promise<PriorityCatalog>{
  const formas=await apiJson(`/api/admin/clientes/${CLIENTE_ID}/formas-atendimento?t=${Date.now()}`) as FormaAtendimento[];
  const selected=(Array.isArray(formas)?formas:[]).filter(forma=>
    forma.tipo==="convenio"&&
    forma.ativo!==false&&
    forma.permite_agendamento_online!==false&&
    Boolean(groupFor(forma.convenio_global||forma.nome)),
  );

  const payloads=await Promise.all(selected.map(async forma=>({
    forma,
    detail:await apiJson(`/api/admin/formas-atendimento/${forma.id}/produtos?t=${Date.now()}`) as {forma?:Record<string,unknown>;produtos?:CatalogProduct[]},
  })));

  const dedupe=new Map<number,CatalogEntry>();
  for(const payload of payloads){
    const convenio=String(payload.forma.convenio_global||payload.detail.forma?.convenio_nome||payload.forma.nome||"");
    const group=groupFor(convenio);
    if(!group)continue;
    for(const product of payload.detail.produtos||[]){
      if(product.ativo===false)continue;
      const id=Number(product.id);
      if(!Number.isInteger(id)||id<=0||dedupe.has(id))continue;
      dedupe.set(id,{
        group,
        formaId:Number(payload.forma.id),
        convenio,
        produtoId:id,
        produto:String(product.nome||`Produto ${id}`),
        status:String(product.resolucao_status||"sem_classificacao"),
        criterio:String(product.resolucao_criterio||""),
        bookingReady:product.booking_ready===true,
        candidates:Array.isArray(product.resolucao_candidatos)?product.resolucao_candidatos:[],
      });
    }
  }

  const entries=[...dedupe.values()];
  const safe=entries.filter(item=>item.status==="resolvivel_automaticamente"&&item.candidates.length===1);
  const byGroup=PRIORITY_GROUPS.map(group=>{
    const rows=entries.filter(item=>item.group===group.key);
    const count=(status:string)=>rows.filter(item=>item.status===status).length;
    return {
      name:group.key,
      total:rows.length,
      resolved:count("resolvido_automaticamente")+count("confirmado_clinica"),
      safe:count("resolvivel_automaticamente"),
      ambiguous:count("ambiguo"),
      notFound:count("nao_encontrado"),
      noInsurerLink:count("sem_vinculo_convenio"),
      inactive:count("mapeamento_inativo"),
    };
  });
  return {entries,safe,byGroup};
}

async function mapCatalogItem(item:CatalogEntry){
  const candidate=item.candidates[0];
  if(!candidate?.feegow_plano_id)throw new Error(`Produto ${item.produtoId} perdeu o candidato seguro.`);
  return apiJson(`/api/admin/formas-atendimento/${item.formaId}/produtos/${item.produtoId}/mapeamento-feegow`,{
    method:"PUT",
    body:JSON.stringify({feegow_plano_id:Number(candidate.feegow_plano_id)}),
  });
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
  const[catalog,setCatalog]=useState<PriorityCatalog|null>(null);
  const[loading,setLoading]=useState(true);
  const[resolvingCatalog,setResolvingCatalog]=useState(false);
  const[exporting,setExporting]=useState(false);
  const[catalogArmed,setCatalogArmed]=useState(false);
  const[error,setError]=useState("");
  const[notice,setNotice]=useState("");

  const refresh=async()=>{
    setLoading(true);setError("");
    try{
      const [center,priorityCatalog]=await Promise.all([loadMappingCenter(),loadPriorityCatalog()]);
      setData(center);setCatalog(priorityCatalog);
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}
  };

  useEffect(()=>{void refresh()},[]);

  const usagePriority=useMemo(()=>{
    const items=data?.items||[];
    return PRIORITY_GROUPS.map(group=>{
      const rows=items.filter(item=>group.match(normalize(item.convenio_nome)));
      const byStatus=new Map<string,number>();
      for(const row of rows){const key=String(row.resolucao_status||"sem_classificacao");byStatus.set(key,(byStatus.get(key)||0)+1)}
      return {name:group.key,total:rows.length,resolvable:byStatus.get("resolvivel_automaticamente")||0,review:(byStatus.get("ambiguo")||0)+(byStatus.get("nao_encontrado")||0)+(byStatus.get("sem_vinculo_convenio")||0)+(byStatus.get("mapeamento_inativo")||0)};
    });
  },[data]);

  const catalogSafeCount=catalog?.safe.length||0;
  const canApplyCatalog=catalogSafeCount>0&&catalogSafeCount<=MAX_SAFE_BATCH;

  const resolveCatalog=async()=>{
    if(resolvingCatalog||!catalogArmed||!canApplyCatalog)return;
    setResolvingCatalog(true);setError("");setNotice("");
    try{
      const current=await loadPriorityCatalog();
      if(current.safe.length!==catalogSafeCount){
        setCatalog(current);setCatalogArmed(false);
        throw new Error(`O preview mudou antes da gravação: eram ${catalogSafeCount} correspondências seguras e agora são ${current.safe.length}. Revise o novo preview.`);
      }

      let success=0;
      const failures:Array<{produtoId:number;produto:string;error:string}>=[];
      for(let i=0;i<current.safe.length;i+=4){
        const chunk=current.safe.slice(i,i+4);
        const results=await Promise.allSettled(chunk.map(item=>mapCatalogItem(item)));
        results.forEach((result,index)=>{
          if(result.status==="fulfilled")success+=1;
          else failures.push({produtoId:chunk[index].produtoId,produto:chunk[index].produto,error:result.reason instanceof Error?result.reason.message:String(result.reason)});
        });
      }

      const [afterCenter,afterCatalog]=await Promise.all([loadMappingCenter(),loadPriorityCatalog()]);
      setData(afterCenter);setCatalog(afterCatalog);setCatalogArmed(false);
      setNotice(`${success} correspondência(s) exata(s) e única(s) gravada(s) no catálogo prioritário. ${failures.length} falha(s) permaneceram sem alteração para revisão.`);
      if(failures.length)downloadJson(`Angel_Crosswalk_Falhas_${new Date().toISOString().replace(/[:.]/g,"-")}.json`,failures);
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setResolvingCatalog(false)}
  };

  const exportAll=async()=>{
    if(exporting)return;
    setExporting(true);setError("");
    try{
      const [historico,ortopedia,crosswalk,priorityCatalog]=await Promise.all([
        apiJson(`/api/admin/clientes/${CLIENTE_ID}/prod-audit/reception-correction-candidates-v1?t=${Date.now()}`),
        apiJson(`/api/admin/clientes/${CLIENTE_ID}/prod-audit/ortopedia-reconciliation-v1?t=${Date.now()}`),
        loadMappingCenter(),
        loadPriorityCatalog(),
      ]);
      const now=new Date();
      downloadJson(`Angel_Auditoria_Completa_${now.toISOString().replace(/[:.]/g,"-")}.json`,{
        generatedAt:now.toISOString(),clienteId:CLIENTE_ID,
        historicalCorrectionCandidates:historico,
        ortopediaReconciliation:ortopedia,
        feegowMappingCenter:crosswalk,
        priorityCatalogCrosswalk:priorityCatalog,
      });
      setNotice("Auditoria completa exportada em um único JSON. Use esse arquivo no lugar de dezenas de prints.");
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setExporting(false)}
  };

  return <section className="prod-audit-card" style={{border:"2px solid rgba(16,185,129,.38)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div><span className="prod-audit-kicker">CROSSWALK FEEGOW · CATÁLOGO + MOTOR EXISTENTE</span><h2 style={{marginTop:8}}>Correspondências técnicas seguras</h2><p>Crosswalk técnico separado da cobertura médica. Nenhum plano.id descobre o convênio: cada produto é comparado somente com planos ativos do mesmo convênio Feegow.</p></div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" onClick={()=>void refresh()} disabled={loading||resolvingCatalog}>{loading?"Atualizando…":"Atualizar crosswalk"}</button><button type="button" onClick={()=>void exportAll()} disabled={exporting||resolvingCatalog}>{exporting?"Gerando arquivo…":"Exportar auditoria completa"}</button></div>
    </div>

    {error&&<div className="prod-audit-error" style={{marginTop:14}}><strong>Operação não concluída.</strong><br/>{error}</div>}
    {notice&&<div style={{marginTop:14,padding:14,border:"1px solid rgba(34,197,94,.45)",borderRadius:14}}>{notice}</div>}
    {loading&&!catalog&&<p>Carregando catálogo comercial e correspondências Feegow…</p>}

    {catalog&&<>
      <h3 style={{marginTop:20}}>Catálogo completo dos convênios prioritários</h3>
      <p>Esta camada independe de aceite específico por produto. É a camada correta para CNU e demais convênios que podem usar cobertura geral do médico.</p>
      <div style={{display:"grid",gap:10,marginTop:14}}>{catalog.byGroup.map(item=><div key={item.name} style={{border:"1px solid rgba(148,163,184,.3)",borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{item.name}</strong><span><b>{item.total}</b> produto(s) ativo(s)</span></div><div style={{marginTop:7,fontSize:14}}>Já resolvidos: <b>{item.resolved}</b> · seguros agora: <b>{item.safe}</b> · ambíguos: <b>{item.ambiguous}</b> · não encontrados: <b>{item.notFound}</b> · sem vínculo convênio: <b>{item.noInsurerLink}</b> · inativos: <b>{item.inactive}</b></div></div>)}</div>

      <div style={{marginTop:18,padding:16,border:"1px solid rgba(16,185,129,.45)",borderRadius:14}}>
        <p style={{marginTop:0}}>O catálogo prioritário possui <b>{catalogSafeCount}</b> correspondência(s) com <b>nome normalizado exato + um único candidato + mesmo convênio Feegow</b>.</p>
        {catalogSafeCount>MAX_SAFE_BATCH&&<p><b>Aplicação bloqueada:</b> o volume excede {MAX_SAFE_BATCH}. A auditoria permanece disponível, mas a escrita em massa não será liberada.</p>}
        <label style={{display:"flex",alignItems:"flex-start",gap:10,margin:"12px 0",cursor:canApplyCatalog?"pointer":"default"}}><input type="checkbox" checked={catalogArmed} disabled={!canApplyCatalog||resolvingCatalog} onChange={e=>setCatalogArmed(e.target.checked)} style={{marginTop:4}}/><span>Confirmo aplicar somente as <b>{catalogSafeCount}</b> correspondências revalidadas pelo Backend. Ambíguas, não encontradas e mapeamentos existentes ficam intocados.</span></label>
        <button type="button" onClick={()=>void resolveCatalog()} disabled={!catalogArmed||!canApplyCatalog||resolvingCatalog} style={{fontWeight:800}}>{resolvingCatalog?"Mapeando em lotes e conferindo…":canApplyCatalog?`Mapear ${catalogSafeCount} correspondência(s) seguras do catálogo prioritário`:"Nenhuma aplicação segura disponível"}</button>
      </div>
    </>}

    {data&&<>
      <h3 style={{marginTop:24}}>Produtos já usados por aceites específicos</h3>
      <div className="prod-audit-counts" style={{marginTop:12}}><span>Opções usadas: <b>{Number(data.summary?.total_opcoes_usadas||data.items?.length||0)}</b></span><span>Já automáticas: <b>{Number(data.summary?.resolvidas_automaticamente||0)}</b></span><span>Confirmadas pela clínica: <b>{Number(data.summary?.confirmadas_clinica||0)}</b></span><span>Ainda seguras: <b>{Number(data.summary?.resolutiveis_automaticamente||0)}</b></span><span>Exceções reais: <b>{Number(data.summary?.excecoes_reais||0)}</b></span></div>
      <div style={{display:"grid",gap:8,marginTop:12}}>{usagePriority.map(item=><div key={item.name}><b>{item.name}:</b> {item.total} opção(ões) em uso · {item.resolvable} seguras · {item.review} exigem revisão.</div>)}</div>
      <details style={{marginTop:16}}><summary>Ver itens do centro operacional que ainda precisam de revisão</summary><div style={{display:"grid",gap:8,marginTop:12}}>{(data.items||[]).filter(item=>item.resolucao_status!=="resolvido_automaticamente"&&item.resolucao_status!=="confirmado_clinica").slice(0,120).map((item,i)=><div key={`${item.convenio_nome}-${item.produto_nome}-${i}`} style={{padding:10,borderBottom:"1px solid rgba(148,163,184,.2)"}}><b>{item.convenio_nome||"Convênio não identificado"}</b> · {item.produto_nome||item.plano_nome||"Produto não identificado"} — {statusLabel(String(item.resolucao_status||""))}</div>)}</div></details>
    </>}
  </section>;
}
