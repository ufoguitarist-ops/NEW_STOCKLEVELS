import { parseCSV, detectHeaderRow, rowsToObjects } from './csvParser.js';
import { loadGlobalAlerts } from './alerts.js';
import { buildIndex, listMakes, listModelsForMake } from './models.js';

const $ = (s) => document.querySelector(s);

const ui = {
  fileInput: $('#fileInput'),
  btnUpload: $('#btnUpload'),
  btnLowOnly: $('#btnLowOnly'),
  btnReset: $('#btnReset'),
  makesList: $('#makesList'),
  modelsList: $('#modelsList'),
  makePill: $('#makePill'),
  selectedMakePill: $('#selectedMakePill'),
  alertSourcePill: $('#alertSourcePill'),
  itemModal: $('#itemModal'),
  itemModalTitle: $('#itemModalTitle'),
  itemModalSubtitle: $('#itemModalSubtitle'),
  itemTableBody: $('#itemTableBody')
};

let alerts = {};
let state = {
  data: null,
  headerRow: null,
  mapping: null,
  index: null,
  selectedMakeKey: null,
  lowOnly: false
};

function openModal(){
  ui.itemModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  ui.itemModal.hidden = true;
  document.body.style.overflow = '';
}
ui.itemModal.addEventListener('click', e=>{
  if(e.target.dataset.close) closeModal();
});

function renderMakes(){
  const makes = listMakes(state.index);
  ui.makesList.innerHTML = '';
  makes.forEach(m=>{
    const b = document.createElement('button');
    b.className = 'make-btn';
    b.textContent = m.displayMake;
    b.onclick = ()=>{
      state.selectedMakeKey = m.makeKey;
      renderModels();
    };
    ui.makesList.appendChild(b);
  });
}

function renderModels(){
  ui.modelsList.innerHTML = '';
  if(!state.selectedMakeKey) return;
  const models = listModelsForMake(state.index, state.selectedMakeKey, alerts, state.lowOnly);
  if(!models.length){
    ui.modelsList.innerHTML = '<div class="empty muted">No models match this view.</div>';
    return;
  }
  models.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'model-card';
    card.innerHTML = `<div class="model-name">${m.displayModel}</div>`;
    card.onclick = ()=>showItems(m.displayModel);
    ui.modelsList.appendChild(card);
  });
}

function showItems(modelName){
  ui.itemModalTitle.textContent = modelName;
  ui.itemTableBody.innerHTML = '';
  const modelKey = modelName.toUpperCase();
  const rows = [];

  for(const obj of state.data){
    const make = String(obj[state.headerRow[state.mapping.make]]||'').trim().toUpperCase();
    const model = String(obj[state.headerRow[state.mapping.model]]||'').trim().toUpperCase();
    const condition = String(obj[state.headerRow[state.mapping.condition]]||'').trim().toUpperCase();
    if(make===state.selectedMakeKey && model===modelKey && condition==='NEW'){
      rows.push(obj);
    }
  }

  ui.itemModalSubtitle.textContent = `${rows.length} item(s) in stock`;

  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r[state.headerRow[state.mapping.stock]]||'—'}</td>
      <td>${r[state.headerRow[state.mapping.serial]]||'—'}</td>
      <td>${r[state.headerRow[state.mapping.calibre]]||'—'}</td>
    `;
    ui.itemTableBody.appendChild(tr);
  });

  openModal();
}

async function handleFile(file){
  const text = await file.text();
  const rows = parseCSV(text);
  const hIdx = detectHeaderRow(rows);
  const { data, mapping, headerRow } = rowsToObjects(rows, hIdx);
  state.data = data;
  state.mapping = mapping;
  state.headerRow = headerRow;
  state.index = buildIndex(data, mapping, headerRow);
  state.selectedMakeKey = null;
  ui.btnLowOnly.disabled = false;
  renderMakes();
}

ui.btnUpload.onclick = ()=>ui.fileInput.click();
ui.fileInput.onchange = e=>{
  const f = e.target.files[0];
  if(f) handleFile(f);
};
ui.btnLowOnly.onclick = ()=>{
  state.lowOnly = !state.lowOnly;
  ui.btnLowOnly.classList.toggle('toggled', state.lowOnly);
  ui.btnLowOnly.textContent = state.lowOnly ? 'Showing low stock' : 'Low stock only';
  renderModels();
};
ui.btnReset.onclick = ()=>location.reload();

alerts = await loadGlobalAlerts();
ui.alertSourcePill.textContent = Object.keys(alerts).length
  ? 'Global alerts loaded'
  : 'No alerts configured';
