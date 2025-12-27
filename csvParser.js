// Robust CSV parser (handles quotes, commas, CRLF, blank lines)
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"'; // escaped quote
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        if (!row.every(v => String(v ?? '').trim() === '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }

  row.push(field);
  if (!row.every(v => String(v ?? '').trim() === '')) rows.push(row);

  return rows;
}

export function norm(s) {
  return String(s ?? '').trim().toLowerCase();
}

export function titleish(s){
  const t = String(s ?? '').trim();
  return t.length ? t : '—';
}

export function collapseSpaces(s){
  return String(s ?? '').trim().replace(/\s+/g, ' ');
}

const CANDIDATES = {
  condition: ['condition','cond','status','state'],
  serial: ['serial','serial number','serial no','serialno','s/n','sn'],
  stock: ['stock#','stock #','stock number','stock no','stockno','stock','sku','item','item no','item number','code'],
  make: ['make','brand','manufacturer'],
  model: ['model','rifle model','product model','product'],
  calibre: ['calibre','caliber','cal']
};

// Detect header row by finding a row that contains "condition" plus at least one other known column
export function detectHeaderRow(rows){
  let best = {idx: -1, score: -1};

  for (let i = 0; i < Math.min(rows.length, 30); i++){
    const r = rows[i].map(norm);
    const hasCondition = r.some(h => CANDIDATES.condition.includes(h));
    if (!hasCondition) continue;

    let score = 1;
    for (const key of ['serial','stock','make','model','calibre']){
      if (r.some(h => CANDIDATES[key].includes(h))) score++;
    }
    if (score > best.score){
      best = {idx: i, score};
    }
  }

  return best.idx;
}

export function mapColumns(headerRow){
  const headers = headerRow.map(norm);

  const mapping = {};
  for (const [k, list] of Object.entries(CANDIDATES)){
    mapping[k] = null;
    for (let i=0;i<headers.length;i++){
      if (list.includes(headers[i])) { mapping[k] = i; break; }
    }
  }

  return mapping;
}

export function rowsToObjects(rows, headerIdx){
  const header = rows[headerIdx];
  const mapping = mapColumns(header);

  const data = [];
  for (let i = headerIdx + 1; i < rows.length; i++){
    const r = rows[i];
    const obj = {};
    for (let c=0;c<header.length;c++){
      obj[header[c]] = r[c] ?? '';
    }
    obj.__rowIndex = i + 1; // 1-based
    data.push(obj);
  }

  return { data, mapping, headerRow: header, headerIdx };
}
