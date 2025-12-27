import { norm } from './csvParser.js';

export function findDuplicateSerials(data, mapping, headerRow){
  const serialIdx = mapping.serial;
  if (serialIdx == null) {
    return { duplicates: [], serialKey: null };
  }

  const serialHeader = headerRow[serialIdx];
  const bySerial = new Map();

  for (const obj of data){
    const raw = obj[serialHeader];
    const key = norm(raw).toUpperCase();
    if (!key) continue; // ignore blanks
    const arr = bySerial.get(key) || [];
    arr.push(obj);
    bySerial.set(key, arr);
  }

  const duplicates = [];
  for (const [serial, arr] of bySerial.entries()){
    if (arr.length > 1) duplicates.push({ serial, rows: arr });
  }
  duplicates.sort((a,b) => a.serial.localeCompare(b.serial));
  return { duplicates, serialKey: serialHeader };
}
