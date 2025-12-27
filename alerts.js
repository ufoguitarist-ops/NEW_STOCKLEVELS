// Phase 2: read global alerts if present (Option A: repo-controlled JSON)
export async function loadGlobalAlerts(){
  try{
    const res = await fetch('./data/lowStockAlerts.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Bad response');
    const json = await res.json();
    if (!json || typeof json !== 'object') throw new Error('Invalid JSON');
    return json;
  }catch(_){
    return {}; // no alerts available
  }
}

export function makeAlertKey(make, model){
  return `${String(make ?? '').trim().toUpperCase()}|${String(model ?? '').trim().toUpperCase()}`;
}

export function getThreshold(alerts, make, model){
  const key = makeAlertKey(make, model);
  const val = alerts[key];
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
