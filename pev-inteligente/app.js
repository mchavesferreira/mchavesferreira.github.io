'use strict';
/**
 * PEV Inteligente v2.0. A constante API_URL vazia ativa a demonstração.
 * Para usar a API PHP: servir por HTTP e definir API_URL = 'api/containers.php'.
 */
const API_URL = '';
const REFRESH_MS = 60_000;
const CENTER = [-21.1355937, -48.9737280];
const demoContainers = [
  {id:1,name:'PEV Centro',address:'Praça da República, Centro',lat:-21.1355937,lng:-48.9737280,level:45,capacity_l:1000,battery:92,signal_dbm:-87,temperature_c:29.1,tilt:false,vibration:false,online:true,updated_at:'2026-11-17T20:50:00-03:00'},
  {id:2,name:'PEV São Francisco',address:'Bairro São Francisco, Catanduva',lat:-21.1490,lng:-48.9880,level:87,capacity_l:1000,battery:74,signal_dbm:-101,temperature_c:31.5,tilt:false,vibration:true,online:true,updated_at:'2026-11-17T20:47:00-03:00'},
  {id:3,name:'PEV Jardim Soto',address:'Jardim Soto, Catanduva',lat:-21.1215,lng:-48.9615,level:23,capacity_l:1000,battery:38,signal_dbm:-96,temperature_c:27.8,tilt:false,vibration:false,online:true,updated_at:'2026-11-17T20:45:00-03:00'}
];
let containers = [];
let map, markersLayer, historyChart, loading = false, toastTimer;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate = date => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? 'Sem informação' : new Intl.DateTimeFormat('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(d);
};
const levelStatus = level => level >= 80 ? 'prioritario' : level >= 60 ? 'atencao' : 'regular';
const statusTitle = s => ({regular:'Regular',atencao:'Atenção',prioritario:'Prioritário'}[s]);
const colorFor = s => ({regular:'#14a17a',atencao:'#e8ac3e',prioritario:'#dc6263'}[s]);
function getAlerts(c) {
  const a=[];
  if(c.level>=80)a.push({kind:'capacity',title:'Coleta prioritária',message:`${c.name} atingiu ${c.level}% da capacidade.`,severity:'danger',date:c.updated_at});
  if(c.tilt)a.push({kind:'tilt',title:'Inclinação detectada',message:`Verificar a posição do contêiner ${c.name}.`,severity:'danger',date:c.updated_at});
  if(c.vibration)a.push({kind:'vibration',title:'Vibração detectada',message:`Evento de vibração registrado em ${c.name}.`,severity:'warning',date:c.updated_at});
  if(c.battery<=40)a.push({kind:'battery',title:'Bateria baixa',message:`${c.name} está com ${c.battery}% de bateria.`,severity:'warning',date:c.updated_at});
  if(!c.online)a.push({kind:'offline',title:'Unidade sem comunicação',message:`${c.name} não está transmitindo dados.`,severity:'danger',date:c.updated_at});
  return a;
}
function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);
}
function parseContainer(c) {
  const n={...c};
  n.id=Number(c.id);
  n.name=String(c.name ?? `PEV ${n.id}`);
  n.address=String(c.address ?? 'Localização não informada');
  n.lat=Number(c.lat);n.lng=Number(c.lng);
  n.level=clamp(c.level,0,100);
  n.capacity_l=Number(c.capacity_l)||1000;
  n.battery=clamp(c.battery,0,100);
  n.signal_dbm=Number(c.signal_dbm)||0;
  n.temperature_c=c.temperature_c == null?null:Number(c.temperature_c);
  n.tilt=c.tilt===true||c.tilt===1||c.tilt==='1';
  n.vibration=c.vibration===true||c.vibration===1||c.vibration==='1';
  n.online=c.online===true||c.online===1||c.online==='1';
  n.updated_at=c.updated_at||new Date().toISOString();
  return n;
}
async function loadData(manual=false){
  if(loading)return;
  loading=true;
  $('refreshBtn').disabled=true;
  try {
    let data;
    if(API_URL){
      const res=await fetch(API_URL,{cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      data=await res.json();
      if(!Array.isArray(data))throw new Error('A API deve retornar um array JSON');
    } else data=demoContainers;
    containers=data.map(parseContainer);
    renderAll();
    $('updatedAt').textContent='Atualizado em '+new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date());
    if(manual)showToast('Painel atualizado.');
  }catch(e){
    console.error('Falha ao obter leituras:',e);
    $('updatedAt').textContent='Falha na última atualização';
    showToast('Não foi possível consultar a API: '+e.message);
  }finally{loading=false;$('refreshBtn').disabled=false;}
}
function renderAll(){renderMetrics();renderMap();renderAlerts();renderTable();renderSelect();renderChart();$('modeBadge').textContent=API_URL?'● API conectada':'● Modo demonstração';}
function renderMetrics(){
  const alerts=containers.flatMap(getAlerts);
  $('metricTotal').textContent=containers.length;
  $('metricAverage').textContent=containers.length?Math.round(containers.reduce((s,c)=>s+c.level,0)/containers.length)+'%':'—';
  $('metricCritical').textContent=containers.filter(c=>c.level>=80).length;
  $('metricAlerts').textContent=alerts.length;
  $('alertCount').textContent=alerts.length;
}
function initMap(){
  if(typeof L==='undefined'){$('map').textContent='Mapa indisponível. Verifique a conexão com a internet.';return;}
  map=L.map('map',{scrollWheelZoom:false}).setView(CENTER,13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  markersLayer=L.layerGroup().addTo(map);
}
function renderMap(){
  if(!map)return;
  markersLayer.clearLayers();
  const bounds=[];
  containers.forEach(c=>{
    if(!Number.isFinite(c.lat)||!Number.isFinite(c.lng))return;
    const status=levelStatus(c.level),icon=L.divIcon({className:'',html:`<div class="pev-marker" style="background:${colorFor(status)}">${Math.round(c.level)}%</div>`,iconSize:[36,36],iconAnchor:[18,18]});
    const marker=L.marker([c.lat,c.lng],{icon}).addTo(markersLayer);
    // Apenas dados escapados entram no HTML do popup.
    marker.bindPopup(`<strong>${escapeHTML(c.name)}</strong><p>${escapeHTML(c.address)}</p><b>${c.level}% cheio</b> · ${statusTitle(status)}<br><small>Última leitura: ${formatDate(c.updated_at)}</small>`);
    bounds.push([c.lat,c.lng]);
  });
  if(bounds.length)map.fitBounds(bounds,{padding:[32,32],maxZoom:14});
}
function renderAlerts(){
  const alerts=containers.flatMap(getAlerts).sort((a,b)=>(a.severity==='danger'?-1:1)-(b.severity==='danger'?-1:1));
  $('alertList').innerHTML=alerts.length?alerts.map(a=>`<div class="alert-item"><div class="alert-symbol ${a.severity==='danger'?'danger':''}">${a.severity==='danger'?'!':'⚑'}</div><div class="alert-text"><b>${escapeHTML(a.title)}</b><p>${escapeHTML(a.message)}</p><small>${formatDate(a.date)}</small></div></div>`).join(''):'<div class="alert-item"><div class="alert-text"><b>Nenhum alerta ativo</b><p>Todas as unidades estão dentro dos limites configurados.</p></div></div>';
}
function filteredContainers(){
  const query=$('searchInput').value.toLocaleLowerCase('pt-BR').trim();
  const filter=$('statusFilter').value;
  return containers.filter(c=>(filter==='all'||levelStatus(c.level)===filter)&&(!query||(c.name+' '+c.address).toLocaleLowerCase('pt-BR').includes(query)));
}
function renderTable(){
  const rows=filteredContainers();
  $('unitRows').innerHTML=rows.map(c=>{
    const status=levelStatus(c.level),color=colorFor(status);
    return `<tr><td><div class="unit-name"><span class="unit-avatar">♻</span>${escapeHTML(c.name)}</div></td><td>${escapeHTML(c.address)}</td><td><div class="progress-wrap"><span class="progress"><span class="progress-fill" style="display:block;width:${c.level}%;background:${color}"></span></span><b>${c.level}%</b></div></td><td>${c.battery}%</td><td>${formatDate(c.updated_at)}</td><td><span class="status ${status}">${statusTitle(status)}</span></td><td><button class="link-btn" data-detail-id="${c.id}">Visualizar</button></td></tr>`;
  }).join('')||'<tr><td colspan="7">Nenhuma unidade encontrada.</td></tr>';
  $('rowCount').textContent=`Exibindo ${rows.length} de ${containers.length} unidades`;
}
function renderSelect(){
  const previous=$('historySelect').value;
  $('historySelect').innerHTML=containers.map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  if(containers.some(c=>String(c.id)===previous))$('historySelect').value=previous;
}
function historyFor(c){
  // Demonstração sintética: NÃO é histórico medido. Para dados reais, consultar backend de leituras.
  const start=Math.max(0,c.level-30);
  return Array.from({length:7},(_,i)=>Math.round(start+(c.level-start)*i/6));
}
function renderChart(){
  const selected=containers.find(c=>String(c.id)===$('historySelect').value);
  const canvas=$('historyChart');
  if(!selected||typeof Chart==='undefined')return;
  const now=new Date();
  const labels=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(now.getTime()-(6-i)*86400000)));
  const values=historyFor(selected),isDark=document.body.classList.contains('dark');
  if(historyChart)historyChart.destroy();
  historyChart=new Chart(canvas,{type:'line',data:{labels,datasets:[{label:'Nível (%) — simulação',data:values,borderColor:'#189b77',backgroundColor:'rgba(34,172,125,.1)',fill:true,tension:.35,pointRadius:4,pointBackgroundColor:'#189b77'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.y}% (simulado)`}}},scales:{y:{min:0,max:100,ticks:{stepSize:25,color:isDark?'#9fb3aa':'#82928b',callback:v=>v+'%'},grid:{color:isDark?'#354841':'#edf1ef'}},x:{ticks:{color:isDark?'#9fb3aa':'#82928b'},grid:{display:false}}}}});
}
function openDetails(id){
  const c=containers.find(v=>v.id===id);if(!c)return;
  $('detailTitle').textContent=c.name;
  const stat=(label,val)=>`<div class="dialog-stat"><small>${escapeHTML(label)}</small><b>${escapeHTML(val)}</b></div>`;
  $('detailContent').innerHTML=`<p>${escapeHTML(c.address)}</p><div class="dialog-grid">${stat('Enchimento',c.level+'%')}${stat('Capacidade nominal',c.capacity_l+' L')}${stat('Bateria',c.battery+'%')}${stat('Sinal',c.signal_dbm+' dBm')}${stat('Temperatura',c.temperature_c===null?'Não disponível':c.temperature_c+' °C')}${stat('Conexão',c.online?'Online':'Offline')}${stat('Inclinação',c.tilt?'Detectada':'Normal')}${stat('Vibração',c.vibration?'Detectada':'Normal')}</div><p><small>Última leitura: ${formatDate(c.updated_at)}</small></p>`;
  $('detailDialog').showModal();
}
function exportCSV(){
  const headings=['ID','Nome','Endereço','Latitude','Longitude','Nível (%)','Capacidade (L)','Bateria (%)','Sinal (dBm)','Temperatura (°C)','Inclinação','Vibração','Online','Atualização'];
  const data=filteredContainers().map(c=>[c.id,c.name,c.address,c.lat,c.lng,c.level,c.capacity_l,c.battery,c.signal_dbm,c.temperature_c??'',c.tilt,c.vibration,c.online,c.updated_at]);
  const safeField=x=>{let s=String(x??'');if(/^[\s]*[=+@\-\t\r]/.test(s)&&typeof x==='string')s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const csv='\ufeff'+[headings,...data].map(row=>row.map(safeField).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='pev-inteligente-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);
  showToast('Arquivo CSV gerado.');
}
document.addEventListener('DOMContentLoaded',()=>{
  try{if(localStorage.getItem('pev-theme')==='dark')document.body.classList.add('dark');}catch{}
  $('themeBtn').textContent=document.body.classList.contains('dark')?'☀':'☾';
  $('themeBtn').addEventListener('click',()=>{document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');$('themeBtn').textContent=dark?'☀':'☾';try{localStorage.setItem('pev-theme',dark?'dark':'light');}catch{}renderChart();});
  $('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('.nav-item').forEach(a=>a.addEventListener('click',()=>$('sidebar').classList.remove('open')));
  $('refreshBtn').addEventListener('click',()=>loadData(true));
  $('exportBtn').addEventListener('click',exportCSV);
  $('searchInput').addEventListener('input',renderTable);
  $('statusFilter').addEventListener('change',renderTable);
  $('historySelect').addEventListener('change',renderChart);
  $('unitRows').addEventListener('click',e=>{const button=e.target.closest('[data-detail-id]');if(button)openDetails(Number(button.dataset.detailId));});
  $('dialogClose').addEventListener('click',()=>$('detailDialog').close());
  $('dialogOk').addEventListener('click',()=>$('detailDialog').close());
  initMap();loadData();if(API_URL)setInterval(()=>loadData(),REFRESH_MS);
});
