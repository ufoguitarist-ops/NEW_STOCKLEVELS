import { collapseSpaces, norm } from './csvParser.js';
import { getThreshold } from './alerts.js';

export function strictIsNew(value){
  return value != null && String(value).trim().toUpperCase() === 'NEW';
}

// Build NEW-only index: make -> modelKey -> {displayModel, byCalibre: Map(calibreDisplay -> count), total}
export function buildIndex(data, mapping, headerRow){
  const required = ['condition','make','model','calibre'];
  for (const k of required){
    if (mapping[k] == null) throw new Error(`Missing required column: ${k}`);
  }

  const h = {
    condition: headerRow[mapping.condition],
    make: headerRow[mapping.make],
    model: headerRow[mapping.model],
    calibre: headerRow[mapping.calibre],
  };

  const byMake = new Map();

  for (const obj of data){
    if (!strictIsNew(obj[h.condition])) continue;

    const makeRaw = collapseSpaces(obj[h.make]);
    const modelRaw = collapseSpaces(obj[h.model]);
    const calRaw = collapseSpaces(obj[h.calibre]);

    if (!makeRaw || !modelRaw) continue;

    const makeKey = makeRaw.trim().toUpperCase();
    const modelKey = modelRaw.trim().toUpperCase(); // unify by case/spacing
    const calKey = calRaw ? calRaw : '—';

    if (!byMake.has(makeKey)){
      byMake.set(makeKey, { displayMake: makeRaw, models: new Map() });
    }
    const makeBucket = byMake.get(makeKey);

    if (!makeBucket.models.has(modelKey)){
      makeBucket.models.set(modelKey, {
        displayModel: modelRaw,
        byCalibre: new Map(),
        total: 0
      });
    }

    const m = makeBucket.models.get(modelKey);
    m.displayModel = chooseBetterDisplay(m.displayModel, modelRaw);

    const prev = m.byCalibre.get(calKey) || 0;
    m.byCalibre.set(calKey, prev + 1);
    m.total += 1;
  }

  return { byMake };
}

// Prefer a "nicer" display form (keeps original but avoids all-caps if mixed exists)
function chooseBetterDisplay(existing, incoming){
  const e = String(existing ?? '');
  const i = String(incoming ?? '');
  if (!e) return i;
  // If existing is ALL CAPS and incoming isn't, prefer incoming
  if (e === e.toUpperCase() && i !== i.toUpperCase()) return i;
  // Otherwise keep existing
  return e;
}

export function listMakes(index){
  const out = [];
  for (const [makeKey, bucket] of index.byMake.entries()){
    out.push({
      makeKey,
      displayMake: bucket.displayMake,
      modelCount: bucket.models.size
    });
  }
  out.sort((a,b) => a.displayMake.localeCompare(b.displayMake));
  return out;
}

export function listModelsForMake(index, makeKey, alerts, lowOnly=false){
  const bucket = index.byMake.get(makeKey);
  if (!bucket) return [];

  const models = [];
  for (const [modelKey, m] of bucket.models.entries()){
    const calibres = Array.from(m.byCalibre.entries())
      .map(([calibre, count]) => ({ calibre, count }))
      .sort((a,b) => a.calibre.localeCompare(b.calibre));

    const threshold = getThreshold(alerts, bucket.displayMake, m.displayModel);
    const isLow = threshold != null && m.total <= threshold;

    if (lowOnly && !isLow) continue;

    models.push({
      modelKey,
      displayModel: m.displayModel,
      total: m.total,
      calibres,
      threshold,
      isLow
    });
  }

  models.sort((a,b) => a.displayModel.localeCompare(b.displayModel));
  return models;
}
