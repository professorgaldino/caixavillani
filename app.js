import {
  db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from "./firebase-config.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = v => Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const localDate = d => {
  if (!d) return "-";
  const x = d?.toDate ? d.toDate() : new Date(d);
  return x.toLocaleString("pt-BR");
};
const dateValue = d => d?.toDate ? d.toDate() : new Date(d);

let eventos=[], produtos=[], vendas=[], carrinho=[], pagamentoSelecionado=null, salvando=false;

function toast(msg,error=false){
  const el=$("#toast"); el.textContent=msg; el.classList.toggle("error",error); el.classList.remove("hidden");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.add("hidden"),3000);
}
function setStatus(text,type=""){const e=$("#statusFirebase");e.textContent=text;e.className="status "+type}
function activeSales(){return vendas.filter(v=>v.status!=="cancelada")}
function normalizeDoc(d){return {id:d.id,...d.data()}}
function optionEventos(all=true){
  const list=eventos.filter(e=>all||e.ativo);
  return `<option value="">${all?"Todos os eventos":"Selecione um evento"}</option>`+
    list.map(e=>`<option value="${e.id}">${esc(e.nome)}</option>`).join("");
}
async function loadAll(){
  try{
    setStatus("Sincronizando...");
    const [ev,pr,ve]=await Promise.all([
      getDocs(collection(db,"eventos")),
      getDocs(collection(db,"produtos")),
      getDocs(query(collection(db,"vendas"),orderBy("criadoEm","desc")))
    ]);
    eventos=ev.docs.map(normalizeDoc).sort((a,b)=>a.nome.localeCompare(b.nome));
    produtos=pr.docs.map(normalizeDoc).sort((a,b)=>a.nome.localeCompare(b.nome));
    vendas=ve.docs.map(normalizeDoc);
    renderAll(); setStatus("Firebase conectado","ok");
  }catch(err){console.error(err);setStatus("Erro de conexão","error");toast("Não foi possível carregar os dados. Confira as regras do banco.",true)}
}
function renderAll(){
  const caixaAtual=$("#eventoCaixa").value, h=$("#histEvento").value, r=$("#relEvento").value;
  $("#eventoCaixa").innerHTML=optionEventos(false);
  $("#histEvento").innerHTML=optionEventos(true);
  $("#relEvento").innerHTML=optionEventos(true);
  if(eventos.some(e=>e.id===caixaAtual&&e.ativo)) $("#eventoCaixa").value=caixaAtual;
  if(eventos.some(e=>e.id===h)) $("#histEvento").value=h;
  if(eventos.some(e=>e.id===r)) $("#relEvento").value=r;
  renderEventos();renderProdutos();renderProdutosCaixa();renderCarrinho();renderHistorico();gerarRelatorio();
}
function renderEventos(){
  $("#listaEventos").innerHTML=eventos.length?eventos.map(e=>`
    <div class="list-item"><div><strong>${esc(e.nome)}</strong><p>${e.ativo?"Ativo":"Inativo"}</p></div>
    <div class="list-actions"><button class="btn ghost edit-event" data-id="${e.id}">Editar</button><button class="btn danger del-event" data-id="${e.id}">Excluir</button></div></div>`).join(""):`<div class="empty">Nenhum evento cadastrado.</div>`;
}
function renderProdutos(){
  $("#listaProdutos").innerHTML=produtos.length?produtos.map(p=>`
    <div class="list-item"><div><strong>${esc(p.nome)}</strong><p>${money(p.preco)} · ${p.ativo?"Ativo":"Inativo"}</p></div>
    <div class="list-actions"><button class="btn ghost edit-product" data-id="${p.id}">Editar</button><button class="btn danger del-product" data-id="${p.id}">Excluir</button></div></div>`).join(""):`<div class="empty">Nenhum produto cadastrado.</div>`;
}
function renderProdutosCaixa(){
  const busca=$("#buscaProduto").value.trim().toLowerCase();
  const list=produtos.filter(p=>p.ativo&&p.nome.toLowerCase().includes(busca));
  $("#produtosCaixa").innerHTML=list.length?list.map(p=>`<button class="product-card add-product" data-id="${p.id}"><strong>${esc(p.nome)}</strong><span>${money(p.preco)}</span></button>`).join(""):`<div class="empty">Nenhum produto disponível.</div>`;
}
function renderCarrinho(){
  $("#carrinhoVazio").classList.toggle("hidden",carrinho.length>0);
  $("#carrinho").innerHTML=carrinho.map(i=>`<div class="cart-item"><div><strong>${esc(i.nome)}</strong><small>${money(i.preco)} × ${i.qtd} = ${money(i.preco*i.qtd)}</small></div><div class="qty"><button data-cart="${i.id}" data-delta="-1">−</button><b>${i.qtd}</b><button data-cart="${i.id}" data-delta="1">+</button></div></div>`).join("");
  $("#totalCarrinho").textContent=money(total());
  $("#btnFinalizar").disabled=!carrinho.length;
}
function total(){return carrinho.reduce((s,i)=>s+i.preco*i.qtd,0)}
function addCart(id){
  const p=produtos.find(x=>x.id===id); if(!p)return;
  const i=carrinho.find(x=>x.id===id); if(i)i.qtd++; else carrinho.push({id:p.id,nome:p.nome,preco:Number(p.preco),qtd:1});
  renderCarrinho();
}
function resetEventForm(){$("#formEvento").reset();$("#eventoId").value="";$("#eventoAtivo").checked=true;$("#tituloFormEvento").textContent="Novo evento"}
function resetProductForm(){$("#formProduto").reset();$("#produtoId").value="";$("#produtoAtivo").checked=true;$("#tituloFormProduto").textContent="Novo produto"}

$("#formEvento").addEventListener("submit",async e=>{
  e.preventDefault(); const id=$("#eventoId").value;
  const data={nome:$("#eventoNome").value.trim(),ativo:$("#eventoAtivo").checked,atualizadoEm:serverTimestamp()};
  try{
    if(id) await updateDoc(doc(db,"eventos",id),data);
    else await addDoc(collection(db,"eventos"),{...data,criadoEm:serverTimestamp()});
    resetEventForm();toast("Evento salvo.");await loadAll();
  }catch(err){console.error(err);toast("Erro ao salvar evento.",true)}
});
$("#formProduto").addEventListener("submit",async e=>{
  e.preventDefault(); const id=$("#produtoId").value, preco=Number($("#produtoPreco").value);
  if(!(preco>0)) return toast("Informe um preço válido.",true);
  const data={nome:$("#produtoNome").value.trim(),preco,ativo:$("#produtoAtivo").checked,atualizadoEm:serverTimestamp()};
  try{
    if(id) await updateDoc(doc(db,"produtos",id),data);
    else await addDoc(collection(db,"produtos"),{...data,criadoEm:serverTimestamp()});
    resetProductForm();toast("Produto salvo.");await loadAll();
  }catch(err){console.error(err);toast("Erro ao salvar produto.",true)}
});
$("#cancelarEvento").onclick=resetEventForm; $("#cancelarProduto").onclick=resetProductForm;

document.addEventListener("click",async e=>{
  const t=e.target.closest("button"); if(!t)return;
  if(t.matches(".add-product")) addCart(t.dataset.id);
  if(t.dataset.cart){
    const i=carrinho.find(x=>x.id===t.dataset.cart); if(!i)return;
    i.qtd+=Number(t.dataset.delta); if(i.qtd<=0)carrinho=carrinho.filter(x=>x.id!==i.id); renderCarrinho();
  }
  if(t.matches(".edit-event")){
    const x=eventos.find(v=>v.id===t.dataset.id);$("#eventoId").value=x.id;$("#eventoNome").value=x.nome;$("#eventoAtivo").checked=!!x.ativo;$("#tituloFormEvento").textContent="Editar evento";window.scrollTo({top:0,behavior:"smooth"});
  }
  if(t.matches(".edit-product")){
    const x=produtos.find(v=>v.id===t.dataset.id);$("#produtoId").value=x.id;$("#produtoNome").value=x.nome;$("#produtoPreco").value=x.preco;$("#produtoAtivo").checked=!!x.ativo;$("#tituloFormProduto").textContent="Editar produto";window.scrollTo({top:0,behavior:"smooth"});
  }
  if(t.matches(".del-event")){
    if(!confirm("Excluir este evento? Vendas antigas continuarão preservadas."))return;
    try{await deleteDoc(doc(db,"eventos",t.dataset.id));toast("Evento excluído.");await loadAll()}catch(err){toast("Erro ao excluir.",true)}
  }
  if(t.matches(".del-product")){
    if(!confirm("Excluir este produto? Vendas antigas continuarão preservadas."))return;
    try{await deleteDoc(doc(db,"produtos",t.dataset.id));toast("Produto excluído.");await loadAll()}catch(err){toast("Erro ao excluir.",true)}
  }
  if(t.matches(".cancel-sale")){
    if(!confirm("Cancelar esta venda? Ela continuará no histórico, mas não entrará nos totais."))return;
    try{await updateDoc(doc(db,"vendas",t.dataset.id),{status:"cancelada",canceladaEm:serverTimestamp()});toast("Venda cancelada.");await loadAll()}catch(err){toast("Erro ao cancelar venda.",true)}
  }
});
$("#buscaProduto").addEventListener("input",renderProdutosCaixa);
$("#btnLimpar").onclick=()=>{if(carrinho.length&&confirm("Limpar a venda atual?")){carrinho=[];renderCarrinho()}};

$$(".tab").forEach(b=>b.onclick=()=>{
  $$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  $$(".page").forEach(x=>x.classList.remove("active"));$("#page-"+b.dataset.page).classList.add("active");
  if(b.dataset.page==="historico")renderHistorico();if(b.dataset.page==="relatorios")gerarRelatorio();
});

function openPayment(){
  if(!$("#eventoCaixa").value)return toast("Selecione um evento antes de receber.",true);
  if(!carrinho.length)return;
  pagamentoSelecionado=null;$$(".payment").forEach(x=>x.classList.remove("selected"));
  $("#dinheiroBox").classList.add("hidden");$("#valorRecebido").value="";$("#troco").textContent=money(0);
  $("#confirmarPagamento").disabled=true;$("#modalTotal").textContent=money(total());$("#modalPagamento").classList.remove("hidden");
}
$("#btnFinalizar").onclick=openPayment;
$("#fecharModal").onclick=()=>$("#modalPagamento").classList.add("hidden");
$$(".payment").forEach(b=>b.onclick=()=>{
  pagamentoSelecionado=b.dataset.payment;$$(".payment").forEach(x=>x.classList.toggle("selected",x===b));
  $("#dinheiroBox").classList.toggle("hidden",pagamentoSelecionado!=="Dinheiro");
  $("#confirmarPagamento").disabled=false;
});
$("#valorRecebido").addEventListener("input",()=>$("#troco").textContent=money(Math.max(0,Number($("#valorRecebido").value)-total())));
$("#confirmarPagamento").onclick=async()=>{
  if(salvando||!pagamentoSelecionado)return;
  const evento=eventos.find(e=>e.id===$("#eventoCaixa").value); if(!evento)return toast("Evento inválido.",true);
  let recebido=null,troco=null;
  if(pagamentoSelecionado==="Dinheiro"){
    recebido=Number($("#valorRecebido").value);
    if(!recebido||recebido<total())return toast("O valor recebido é menor que o total.",true);
    troco=recebido-total();
  }
  salvando=true;$("#confirmarPagamento").disabled=true;$("#confirmarPagamento").textContent="Salvando...";
  try{
    await addDoc(collection(db,"vendas"),{
      eventoId:evento.id,eventoNome:evento.nome,
      itens:carrinho.map(i=>({produtoId:i.id,nome:i.nome,preco:i.preco,qtd:i.qtd,subtotal:i.preco*i.qtd})),
      total:total(),formaPagamento:pagamentoSelecionado,valorRecebido:recebido,troco,status:"concluida",
      criadoEm:serverTimestamp()
    });
    carrinho=[];renderCarrinho();$("#modalPagamento").classList.add("hidden");toast("Pagamento registrado com sucesso.");await loadAll();
  }catch(err){console.error(err);toast("Erro ao registrar o pagamento.",true)}
  finally{salvando=false;$("#confirmarPagamento").textContent="Confirmar recebimento";$("#confirmarPagamento").disabled=false}
};

function inRange(v,inicio,fim){
  const d=dateValue(v.criadoEm); if(!d||isNaN(d))return false;
  if(inicio){const a=new Date(inicio+"T00:00:00");if(d<a)return false}
  if(fim){const b=new Date(fim+"T23:59:59.999");if(d>b)return false}
  return true;
}
function filteredHistory(){
  return vendas.filter(v=>(!$("#histEvento").value||v.eventoId===$("#histEvento").value)&&
    (!$("#histPagamento").value||v.formaPagamento===$("#histPagamento").value)&&inRange(v,$("#histInicio").value,$("#histFim").value));
}
function renderHistorico(){
  const list=filteredHistory();
  $("#tabelaHistorico").innerHTML=list.length?list.map(v=>`<tr>
    <td>${localDate(v.criadoEm)}</td><td>${esc(v.eventoNome)}</td>
    <td>${(v.itens||[]).map(i=>`${i.qtd}× ${esc(i.nome)}`).join("<br>")}</td>
    <td>${esc(v.formaPagamento)}</td><td><span class="badge ${v.status==="cancelada"?"cancel":"ok"}">${v.status==="cancelada"?"Cancelada":"Concluída"}</span></td>
    <td><strong>${money(v.total)}</strong></td><td>${v.status!=="cancelada"?`<button class="btn danger cancel-sale" data-id="${v.id}">Cancelar</button>`:"-"}</td>
  </tr>`).join(""):`<tr><td colspan="7" class="empty">Nenhuma venda encontrada.</td></tr>`;
}
["histEvento","histPagamento","histInicio","histFim"].forEach(id=>$("#"+id).addEventListener("change",renderHistorico));
$("#atualizarHistorico").onclick=loadAll;

function reportSales(){
  return activeSales().filter(v=>(!$("#relEvento").value||v.eventoId===$("#relEvento").value)&&inRange(v,$("#relInicio").value,$("#relFim").value));
}
function gerarRelatorio(){
  const list=reportSales(), sum=list.reduce((s,v)=>s+Number(v.total||0),0);
  const qtdItens=list.reduce((s,v)=>s+(v.itens||[]).reduce((a,i)=>a+Number(i.qtd||0),0),0);
  $("#rTotal").textContent=money(sum);$("#rVendas").textContent=list.length;$("#rItens").textContent=qtdItens;$("#rTicket").textContent=money(list.length?sum/list.length:0);
  const pays={"Pix":0,"Dinheiro":0,"Débito":0,"Crédito":0};
  list.forEach(v=>pays[v.formaPagamento]=(pays[v.formaPagamento]||0)+Number(v.total||0));
  $("#relPagamentos").innerHTML=Object.entries(pays).map(([k,v])=>`<div class="report-row"><span>${k}</span><strong>${money(v)}</strong></div>`).join("");
  const ps={};list.forEach(v=>(v.itens||[]).forEach(i=>{ps[i.nome]??={qtd:0,total:0};ps[i.nome].qtd+=Number(i.qtd);ps[i.nome].total+=Number(i.subtotal??i.preco*i.qtd)}));
  const prod=Object.entries(ps).sort((a,b)=>b[1].qtd-a[1].qtd);
  $("#relProdutos").innerHTML=prod.length?prod.map(([n,x])=>`<div class="report-row"><span>${esc(n)} (${x.qtd})</span><strong>${money(x.total)}</strong></div>`).join(""):`<div class="empty">Sem produtos no período.</div>`;
  $("#relVendasTabela").innerHTML=list.length?list.map(v=>`<tr><td>${localDate(v.criadoEm)}</td><td>${esc(v.eventoNome)}</td><td>${esc(v.formaPagamento)}</td><td>${(v.itens||[]).reduce((s,i)=>s+Number(i.qtd),0)}</td><td>${money(v.total)}</td></tr>`).join(""):`<tr><td colspan="5">Nenhuma venda.</td></tr>`;
  const ev=eventos.find(e=>e.id===$("#relEvento").value);
  const parts=[];if(ev)parts.push("Evento: "+ev.nome);if($("#relInicio").value)parts.push("De: "+$("#relInicio").value.split("-").reverse().join("/"));if($("#relFim").value)parts.push("Até: "+$("#relFim").value.split("-").reverse().join("/"));
  $("#relPeriodoTexto").textContent=parts.join(" · ")||"Todos os eventos e períodos";
}
["relEvento","relInicio","relFim"].forEach(id=>$("#"+id).addEventListener("change",gerarRelatorio));
$("#gerarRelatorio").onclick=gerarRelatorio;$("#btnImprimir").onclick=()=>{gerarRelatorio();window.print()};

loadAll();
