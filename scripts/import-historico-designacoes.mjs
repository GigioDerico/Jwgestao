import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT_DIR = path.resolve(process.cwd());
const HIST_DIR = path.join(ROOT_DIR, 'docs', 'Historico');
const MIDWEEK_DIR = path.join(HIST_DIR, 'Reunião de meio de semana');
const WEEKEND_DIR = path.join(HIST_DIR, 'Reunião de final de semana');
const AUDIO_VIDEO_DIR = path.join(HIST_DIR, 'Audio e Video');
const DRY_RUN = process.argv.includes('--dry-run');

const MONTH_PT = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const WEEKDAY_TOKENS = ['domingo', 'segunda', 'terca', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'sábado'];
const NAME_ALIAS_TARGETS = {
  ademir: 'ademir souza',
  'andersom paim': 'anderson paim',
  carlos: 'ed carlos pinheiro',
  daiani: 'daiani pedroso',
  dionas: 'dionas assis',
  edvan: 'edvan poscai',
  'elizabeth silva': 'elisabeth silva',
  'josenildo novais': 'josenildo novaes',
  jossival: 'jossival santos',
  luciana: 'luciana poscai',
  mateus: 'matheus silva',
  'paloma brandao': 'paloma matos',
  'sergio batista': 'jose sergio batista',
  silmara: 'silmara turquetti passos',
  'joao v': 'joao vitor boemer',
  'joao v.': 'joao vitor boemer',
};

function normalizeWhitespace(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cleanName(raw) {
  const value = normalizeWhitespace(raw)
    .replace(/\s*-\s*A DEFINIR\s*$/i, '')
    .replace(/^[\-\u2022•]+/, '')
    .trim();
  if (!value) return null;
  const key = normalizeKey(value);
  if (value.length < 2) return null;
  if (!/[a-zA-ZÀ-ÿ]/.test(value)) return null;
  if (/^\d+\./.test(value)) return null;
  if (/:$/.test(value)) return null;
  if (/[(){}\[\]]/.test(value) && !/[a-zA-ZÀ-ÿ]/.test(value.replace(/[(){}\[\]\s]/g, ''))) return null;
  if (/\d/.test(value) && !/\b(?:joao|joão|vitor|vítor)\b/i.test(value)) return null;
  if (
    key === 'a definir' ||
    key === 'assembleia' ||
    key === 'assembléia' ||
    key === 'conferencia' ||
    key === 'conferência' ||
    key === 'visita' ||
    key === '(' ||
    key === ')' ||
    key === 'dirigente/leitor' ||
    key === 'estudante' ||
    key === 'estudante/ajudante' ||
    key === 'locais' ||
    key.startsWith('locais ') ||
    key.startsWith('estudo biblico') ||
    key.startsWith('estudo bíblico') ||
    key.startsWith('comentarios') ||
    key.startsWith('comentários') ||
    key.startsWith('presidente') ||
    key.startsWith('orador') ||
    key.startsWith('tema') ||
    key.startsWith('leitor') ||
    key.startsWith('oracao') ||
    key.startsWith('oração')
  ) {
    return null;
  }
  return value;
}

function pickSingleName(raw) {
  const names = splitPotentialNames(raw);
  if (names.length > 0) return names[0];
  return cleanName(raw);
}

function stripXmlTags(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&#xA;/g, '\n');
}

function unzipEntry(filePath, entryPath) {
  return execFileSync('unzip', ['-p', filePath, entryPath], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function parseSharedStrings(xml) {
  const output = [];
  const match = xml.matchAll(/<si[\s\S]*?<\/si>/g);
  for (const item of match) {
    const fragment = item[0];
    const texts = [...fragment.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => stripXmlTags(m[1]));
    output.push(normalizeWhitespace(texts.join('')));
  }
  return output;
}

function parseWorkbookSheets(workbookXml, relsXml) {
  const sheetByRid = new Map();
  for (const m of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    sheetByRid.set(m[2], m[1]);
  }

  const targetByRid = new Map();
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    targetByRid.set(m[1], m[2]);
  }

  const sheets = [];
  for (const [rid, name] of sheetByRid.entries()) {
    const target = targetByRid.get(rid);
    if (!target || !target.includes('worksheets/')) continue;
    sheets.push({
      name,
      entryPath: `xl/${target.replace(/^\//, '')}`,
    });
  }
  return sheets;
}

function excelSerialToIso(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(epoch.getTime() + Math.round(serial) * 24 * 60 * 60 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function colLetters(ref) {
  const m = ref.match(/^([A-Z]+)/);
  return m ? m[1] : null;
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = { rowNumber: Number(rowMatch[1]) };
    const rowXml = rowMatch[2];
    for (const cellMatch of rowXml.matchAll(/<c\b[\s\S]*?<\/c>/g)) {
      const cellXml = cellMatch[0];
      const ref = (cellXml.match(/ r="([A-Z]+\d+)"/) || [])[1];
      if (!ref) continue;
      const col = colLetters(ref);
      if (!col) continue;
      const type = (cellXml.match(/ t="([^"]+)"/) || [])[1];
      const rawValue = ((cellXml.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '').trim();
      let value = '';
      if (type === 's') {
        value = sharedStrings[Number(rawValue)] || '';
      } else if (type === 'inlineStr') {
        value = normalizeWhitespace(stripXmlTags((cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || ''));
      } else if (type === 'str') {
        value = normalizeWhitespace(rawValue);
      } else {
        value = normalizeWhitespace(rawValue);
      }
      row[col] = value;
    }
    rows.push(row);
  }
  return rows;
}

function splitPotentialNames(raw) {
  const value = cleanName(raw);
  if (!value) return [];
  return value
    .replace(/\s*\([^)]+\)\s*/g, ' ')
    .split(/[\/,-]/)
    .map((part) => cleanName(part))
    .filter(Boolean);
}

function readDocxLines(filePath) {
  const xml = unzipEntry(filePath, 'word/document.xml');
  const text = xml
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return text
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0);
}

function parseMonthFromText(text) {
  const normalized = normalizeKey(text);
  for (const [name, value] of Object.entries(MONTH_PT)) {
    if (normalized.includes(name)) return value;
  }
  return null;
}

function chooseYearForMonthDay(day, month, startDate, endDate) {
  const candidates = [];
  for (let year = startDate.getFullYear() - 1; year <= endDate.getFullYear() + 1; year += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) continue;
    if (date < startDate || date > endDate) continue;
    candidates.push(date);
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].getUTCFullYear();
  const preferred = candidates.find((date) => date.getUTCDay() === 3 || date.getUTCDay() === 4);
  return (preferred || candidates[candidates.length - 1]).getUTCFullYear();
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateText(raw, defaultYear) {
  const value = normalizeWhitespace(raw);
  const dateSlash = value.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateSlash) {
    const day = Number(dateSlash[1]);
    const month = Number(dateSlash[2]);
    let year = dateSlash[3] ? Number(dateSlash[3]) : defaultYear;
    if (year && year < 100) year += 2000;
    if (!year) return null;
    return { day, month, year };
  }
  const dateText = value.match(/(\d{1,2})\s+de\s+([A-Za-zÇçãõáàâéêíóôú]+)/i);
  if (dateText) {
    const day = Number(dateText[1]);
    const month = parseMonthFromText(dateText[2]);
    if (!month || !defaultYear) return null;
    return { day, month, year: defaultYear };
  }
  return null;
}

function firstNonEmptyAfter(lines, startIndex, maxLookahead = 8) {
  for (let index = startIndex + 1; index <= Math.min(lines.length - 1, startIndex + maxLookahead); index += 1) {
    const current = normalizeWhitespace(lines[index]);
    if (!current) continue;
    if (/^\d{1,2}:\d{2}$/.test(current)) continue;
    if (/^c[âa]ntico/i.test(current)) continue;
    if (/^coment[aá]rios/i.test(current)) continue;
    if (/^\d+\.\s/.test(current)) continue;
    if (/^(tesouros|fa[çc]a seu melhor|nossa vida crist[aã])/i.test(normalizeKey(current))) continue;
    if (/^(estudante|estudante\/ajudante|dirigente\/leitor|presidente|orador|tema|leitor|oração|oracao)/i.test(normalizeKey(current))) continue;
    return current;
  }
  return null;
}

function firstLikelyNameAfter(lines, startIndex, maxLookahead = 10) {
  for (let index = startIndex + 1; index <= Math.min(lines.length - 1, startIndex + maxLookahead); index += 1) {
    const current = normalizeWhitespace(lines[index]);
    if (!current) continue;
    if (/^\d{1,2}:\d{2}$/.test(current)) continue;
    if (/^\d+\.\s/.test(current)) continue;
    if (/^c[âa]ntico/i.test(current)) continue;
    if (/^coment[aá]rios/i.test(current)) continue;
    if (/^(tesouros|fa[çc]a seu melhor|nossa vida crist[aã])/i.test(normalizeKey(current))) continue;
    const names = splitPotentialNames(current);
    if (names.length > 0) {
      return current;
    }
  }
  return null;
}

function parseMidweekDocx(filePath, startDate, endDate) {
  const lines = readDocxLines(filePath);
  const meetingIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\d{1,2}\s+DE\s+[A-ZÇÃÕÁÉÍÓÚÂÊÔ]+/i.test(lines[index])) {
      meetingIndexes.push(index);
    }
  }
  if (meetingIndexes.length === 0) return [];

  const meetings = [];
  for (let i = 0; i < meetingIndexes.length; i += 1) {
    const start = meetingIndexes[i];
    const end = i + 1 < meetingIndexes.length ? meetingIndexes[i + 1] : lines.length;
    const section = lines.slice(start, end);
    const heading = section[0];
    const dateMatch = heading.match(/^(\d{1,2})\s+DE\s+([A-ZÇÃÕÁÉÍÓÚÂÊÔ]+)/i);
    if (!dateMatch) continue;

    const day = Number(dateMatch[1]);
    const month = parseMonthFromText(dateMatch[2]);
    if (!month) continue;
    const year = chooseYearForMonthDay(day, month, startDate, endDate);
    if (!year) continue;

    const dateIso = toIsoDate(year, month, day);
    const dateObj = new Date(`${dateIso}T12:00:00.000Z`);
    if (dateObj < startDate || dateObj > endDate) continue;

    const meeting = {
      date: dateIso,
      bible_reading: normalizeWhitespace((heading.split('|')[1] || '').trim()) || null,
      president: null,
      opening_prayer: null,
      closing_prayer: null,
      treasure_talk_title: null,
      treasure_talk_speaker: null,
      treasure_gems_speaker: null,
      treasure_reading_student: null,
      cbs_conductor: null,
      cbs_reader: null,
      ministry_parts: [],
      christian_life_parts: [],
    };

    const prayerNames = [];
    for (let idx = 0; idx < section.length; idx += 1) {
      const line = section[idx];
      const key = normalizeKey(line);
      if (key === 'presidente:') {
        meeting.president = pickSingleName(firstNonEmptyAfter(section, idx));
      }
      if (key.startsWith('oração:') || key.startsWith('oracao:')) {
        const prayerName = pickSingleName(firstNonEmptyAfter(section, idx));
        if (prayerName) prayerNames.push(prayerName);
      }
      if (/^1\./.test(line)) {
        meeting.treasure_talk_title = normalizeWhitespace(line.replace(/^1\.\s*/, '').replace(/\(\d+\s*min\)/i, '').trim()) || null;
        meeting.treasure_talk_speaker = pickSingleName(firstNonEmptyAfter(section, idx));
      }
      if (/^2\./.test(line) && /joias|jóias/i.test(normalizeKey(line))) {
        meeting.treasure_gems_speaker = pickSingleName(firstNonEmptyAfter(section, idx));
      }
      if (/^3\./.test(line) && /leitura/i.test(normalizeKey(line))) {
        let readingStudent = null;
        for (let j = idx; j < Math.min(section.length, idx + 8); j += 1) {
          if (/estudante/i.test(normalizeKey(section[j]))) {
            const next = firstLikelyNameAfter(section, j, 6) || firstNonEmptyAfter(section, j, 6);
            readingStudent = splitPotentialNames(next)[0] || cleanName(next);
            break;
          }
        }
        meeting.treasure_reading_student = cleanName(readingStudent);
      }
      if (/dirigente\/leitor:/i.test(line)) {
        const pair = firstLikelyNameAfter(section, idx, 6) || firstNonEmptyAfter(section, idx, 6);
        const names = splitPotentialNames(pair);
        meeting.cbs_conductor = names[0] || null;
        meeting.cbs_reader = names[1] || null;
      }
    }

    if (prayerNames.length > 0) {
      meeting.opening_prayer = prayerNames[0] || null;
      meeting.closing_prayer = prayerNames[prayerNames.length - 1] || null;
    }

    const ministryStart = section.findIndex((line) => /fa[çc]a seu melhor no minist[eé]rio/i.test(normalizeKey(line)));
    const christianStart = section.findIndex((line) => /nossa vida crist[aã]/i.test(normalizeKey(line)));
    if (ministryStart >= 0 && christianStart > ministryStart) {
      for (let idx = ministryStart; idx < christianStart; idx += 1) {
        const line = section[idx];
        const item = line.match(/^(\d+)\.\s*(.+)$/);
        if (!item) continue;
        const number = Number(item[1]);
        if (number < 4 || number > 6) continue;
        const title = normalizeWhitespace(item[2].replace(/\(\d+\s*min\)/i, '').trim());
        let student = null;
        let assistant = null;
        for (let j = idx; j < Math.min(section.length, idx + 8); j += 1) {
          if (/estudante/i.test(normalizeKey(section[j]))) {
            const pairLine = firstLikelyNameAfter(section, j, 6) || firstNonEmptyAfter(section, j, 6);
            const names = splitPotentialNames(pairLine);
            student = names[0] || null;
            assistant = names[1] || null;
            break;
          }
        }
        meeting.ministry_parts.push({
          title: title || 'Faça seu melhor no ministério',
          duration: 5,
          student,
          assistant,
        });
      }
    }

    if (christianStart >= 0) {
      const christianEnd = section.findIndex((line, idx) => idx > christianStart && /coment[aá]rios finais/i.test(normalizeKey(line)));
      const limit = christianEnd >= 0 ? christianEnd : section.length;
      for (let idx = christianStart; idx < limit; idx += 1) {
        const line = section[idx];
        const item = line.match(/^(\d+)\.\s*(.+)$/);
        if (!item) continue;
        const number = Number(item[1]);
        if (number < 7 || /estudo b[ií]blico de congrega[cç][aã]o/i.test(normalizeKey(line))) continue;
        const title = normalizeWhitespace(item[2].replace(/\(\d+\s*min\)/i, '').trim());
        const speaker = pickSingleName(firstLikelyNameAfter(section, idx, 8) || firstNonEmptyAfter(section, idx, 8));
        if (speaker) {
          meeting.christian_life_parts.push({
            title,
            duration: 10,
            speaker,
          });
        }
      }
    }

    meetings.push(meeting);
  }

  return meetings;
}

function parseWeekendXlsx(filePath, startDate, endDate) {
  const workbookXml = unzipEntry(filePath, 'xl/workbook.xml');
  const relsXml = unzipEntry(filePath, 'xl/_rels/workbook.xml.rels');
  const sharedStrings = parseSharedStrings(unzipEntry(filePath, 'xl/sharedStrings.xml'));
  const sheets = parseWorkbookSheets(workbookXml, relsXml);
  const meetingsByDate = new Map();

  const fileYearMatch = path.basename(filePath).match(/(\d{2,4})/);
  const fallbackYear = fileYearMatch
    ? Number(fileYearMatch[1].length === 2 ? `20${fileYearMatch[1]}` : fileYearMatch[1])
    : null;

  for (const sheet of sheets) {
    const lowerSheet = normalizeKey(sheet.name);
    if (lowerSheet.includes('conferencia publica') || lowerSheet.includes('conferência pública')) {
      continue;
    }

    const sheetXml = unzipEntry(filePath, sheet.entryPath);
    const rows = parseWorksheetRows(sheetXml, sharedStrings);
    let defaultYear = null;
    for (const row of rows.slice(0, 20)) {
      for (const value of Object.values(row)) {
        if (typeof value !== 'string') continue;
        const yearMatch = value.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          defaultYear = Number(yearMatch[1]);
          break;
        }
      }
      if (defaultYear) break;
    }

    if (!defaultYear) {
      defaultYear = fallbackYear;
    }

    let currentDate = null;
    let inClosingPrayerSection = false;
    const closingPrayerByDate = new Map();
    for (const row of rows) {
      const colB = normalizeWhitespace(row.B || '');
      const colC = normalizeWhitespace(row.C || '');
      if (/designados para a orac[aã]o final/i.test(normalizeKey(colB))) {
        inClosingPrayerSection = true;
        continue;
      }

      const parsedDate = parseDateText(colB, defaultYear);
      if (parsedDate) {
        const maybeDate = new Date(Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day));
        if (maybeDate >= startDate && maybeDate <= endDate) {
          currentDate = toIsoDate(parsedDate.year, parsedDate.month, parsedDate.day);
          if (!meetingsByDate.has(currentDate)) {
            meetingsByDate.set(currentDate, {
              date: currentDate,
              president: null,
              talk_theme: null,
              talk_speaker_name: null,
              talk_congregation: null,
              watchtower_reader: null,
              closing_prayer: null,
            });
          }
          if (inClosingPrayerSection && colC) {
            closingPrayerByDate.set(currentDate, cleanName(colC));
          }
        } else {
          currentDate = null;
        }
        continue;
      }

      if (!currentDate) continue;
      const meeting = meetingsByDate.get(currentDate);
      if (!meeting) continue;
      const keyB = normalizeKey(colB);
      if (keyB === 'presidente:') {
        meeting.president = pickSingleName(colC);
      } else if (keyB.startsWith('tema')) {
        meeting.talk_theme = colC || null;
      } else if (keyB === 'orador:') {
        meeting.talk_speaker_name = pickSingleName(colC) || meeting.talk_speaker_name;
        const congregationMatch = colC.match(/\(([^)]+)\)/);
        if (congregationMatch) {
          meeting.talk_congregation = normalizeWhitespace(congregationMatch[1]) || null;
        }
      } else if (keyB === 'leitor:') {
        meeting.watchtower_reader = pickSingleName(colC);
      }
    }

    for (const [date, name] of closingPrayerByDate.entries()) {
      const meeting = meetingsByDate.get(date);
      if (meeting && name) {
        meeting.closing_prayer = name;
      }
    }
  }

  return [...meetingsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function parseAudioVideoXlsx(filePath, startDate, endDate) {
  const workbookXml = unzipEntry(filePath, 'xl/workbook.xml');
  const relsXml = unzipEntry(filePath, 'xl/_rels/workbook.xml.rels');
  const sharedStrings = parseSharedStrings(unzipEntry(filePath, 'xl/sharedStrings.xml'));
  const sheets = parseWorkbookSheets(workbookXml, relsXml);
  const byDate = new Map();

  for (const sheet of sheets) {
    const sheetXml = unzipEntry(filePath, sheet.entryPath);
    const rows = parseWorksheetRows(sheetXml, sharedStrings);

    for (const row of rows) {
      const weekday = normalizeWhitespace(row.C || '');
      const weekdayKey = normalizeKey(weekday);
      if (!WEEKDAY_TOKENS.some((token) => weekdayKey.includes(token))) {
        continue;
      }
      const isoDate = excelSerialToIso(row.B);
      if (!isoDate) continue;
      const dateObj = new Date(`${isoDate}T12:00:00.000Z`);
      if (dateObj < startDate || dateObj > endDate) continue;

      const soundRaw = splitPotentialNames(row.D || '')[0] || cleanName(row.D || '');
      const imageRaw = splitPotentialNames(row.E || '')[0] || cleanName(row.E || '');
      const stageRaw = splitPotentialNames(row.F || '')[0] || cleanName(row.F || '');
      const roving1Raw = splitPotentialNames(row.G || '')[0] || cleanName(row.G || '');
      const roving2Raw = splitPotentialNames(row.H || '')[0] || cleanName(row.H || '');
      const attendants = [
        ...splitPotentialNames(row.I || ''),
      ];

      if (!soundRaw || !imageRaw || !stageRaw || !roving1Raw || !roving2Raw) {
        continue;
      }

      byDate.set(isoDate, {
        date: isoDate,
        weekday: weekday || 'Quinta',
        sound: soundRaw,
        image: imageRaw,
        stage: stageRaw,
        roving_mic_1: roving1Raw,
        roving_mic_2: roving2Raw,
        attendants,
      });
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function collectFiles(dir, extension) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(extension)) continue;
    files.push(path.join(dir, entry.name));
  }
  return files.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function buildWindow() {
  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return { windowStart, windowEnd };
}

function resolveSpeakerCongregation(raw) {
  const cleaned = normalizeWhitespace(raw || '');
  const match = cleaned.match(/\(([^)]+)\)/);
  return {
    speakerName: cleanName(cleaned.replace(/\s*\([^)]+\)\s*/g, ' ').trim()),
    congregation: match ? normalizeWhitespace(match[1]) : null,
  };
}

function getEnv(name) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function getNameTokens(value) {
  return normalizeKey(value)
    .replace(/\s*\([^)]+\)\s*/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getSurnameTokens(tokens) {
  const skip = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  return tokens.slice(1).filter((token) => token.length >= 2 && !skip.has(token));
}

function tokenDistanceAtMostOne(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length < 4 || b.length < 4) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  if (i < a.length || j < b.length) edits += 1;
  return edits <= 1;
}

async function main() {
  const { windowStart, windowEnd } = buildWindow();
  const report = {
    midweek: { inserted: 0, updated: 0, skipped: 0, invalid: 0 },
    weekend: { inserted: 0, updated: 0, skipped: 0, invalid: 0 },
    audio_video: { inserted: 0, updated: 0, skipped: 0, invalid: 0 },
    notFoundMembers: new Set(),
    parseErrors: [],
  };

  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Variaveis obrigatorias ausentes: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: members, error: membersError } = await supabase.from('members').select('id, full_name');
  if (membersError) {
    throw new Error(`Falha ao carregar membros: ${membersError.message}`);
  }

  const memberByFull = new Map();
  const membersByFirst = new Map();
  const memberTokenRows = [];
  const aliasByInput = new Map();
  for (const member of members || []) {
    const tokens = getNameTokens(member.full_name);
    if (tokens.length === 0) continue;
    const key = tokens.join(' ');
    memberByFull.set(key, member);
    const first = tokens[0];
    const row = {
      member,
      tokens,
      surnames: getSurnameTokens(tokens),
    };
    if (!membersByFirst.has(first)) {
      membersByFirst.set(first, []);
    }
    membersByFirst.get(first).push(row);
    memberTokenRows.push(row);
  }

  for (const [inputAlias, targetFull] of Object.entries(NAME_ALIAS_TARGETS)) {
    const targetMember = memberByFull.get(normalizeKey(targetFull));
    if (targetMember) {
      aliasByInput.set(normalizeKey(inputAlias), targetMember);
    }
  }

  const resolveMember = (name, options = { allowFirstName: false }) => {
    const cleaned = cleanName(name);
    if (!cleaned) return null;
    const tokens = getNameTokens(cleaned);
    if (tokens.length === 0) return null;
    const normalized = tokens.join(' ');
    const byAlias = aliasByInput.get(normalized) || aliasByInput.get(normalized.replace(/\./g, ''));
    if (byAlias) return byAlias;
    const byFull = memberByFull.get(normalized);
    if (byFull) return byFull;

    const first = tokens[0];
    const inputSurnames = getSurnameTokens(tokens);
    const firstCandidates = membersByFirst.get(first) || [];

    if (inputSurnames.length > 0 && firstCandidates.length > 0) {
      const bySurnameOverlap = firstCandidates.filter((candidate) =>
        candidate.surnames.some((surname) => inputSurnames.includes(surname))
      );
      if (bySurnameOverlap.length === 1) {
        return bySurnameOverlap[0].member;
      }
      if (bySurnameOverlap.length > 1) {
        const strict = bySurnameOverlap.filter((candidate) =>
          inputSurnames.every((surname) => candidate.tokens.includes(surname))
        );
        if (strict.length === 1) {
          return strict[0].member;
        }
      }
    }

    if (tokens.length >= 2) {
      const subsetMatches = memberTokenRows.filter((candidate) =>
        tokens.every((inputToken) =>
          candidate.tokens.some((candidateToken) =>
            candidateToken === inputToken || tokenDistanceAtMostOne(candidateToken, inputToken)
          )
        )
      );
      if (subsetMatches.length === 1) {
        return subsetMatches[0].member;
      }
    }

    if (options.allowFirstName && firstCandidates.length === 1) {
      return firstCandidates[0].member;
    }

    if (options.allowFirstName && firstCandidates.length > 1) {
      const bestByLongest = firstCandidates
        .filter((candidate) => candidate.tokens.length > 1)
        .sort((a, b) => b.tokens.length - a.tokens.length);
      if (bestByLongest.length === 1) {
        return bestByLongest[0].member;
      }
    }

    report.notFoundMembers.add(cleaned);
    return null;
  };

  const midweekFiles = collectFiles(MIDWEEK_DIR, '.docx');
  const weekendFiles = collectFiles(WEEKEND_DIR, '.xlsx');
  const audioFiles = collectFiles(AUDIO_VIDEO_DIR, '.xlsx');

  const midweekMeetings = [];
  for (const file of midweekFiles) {
    try {
      midweekMeetings.push(...parseMidweekDocx(file, windowStart, windowEnd));
    } catch (error) {
      report.parseErrors.push(`Midweek parse ${path.basename(file)}: ${error.message}`);
    }
  }

  const weekendMeetings = [];
  for (const file of weekendFiles) {
    try {
      weekendMeetings.push(...parseWeekendXlsx(file, windowStart, windowEnd));
    } catch (error) {
      report.parseErrors.push(`Weekend parse ${path.basename(file)}: ${error.message}`);
    }
  }

  const audioAssignments = [];
  for (const file of audioFiles) {
    try {
      audioAssignments.push(...parseAudioVideoXlsx(file, windowStart, windowEnd));
    } catch (error) {
      report.parseErrors.push(`Audio parse ${path.basename(file)}: ${error.message}`);
    }
  }

  const dedupeByDate = (rows) => {
    const map = new Map();
    for (const row of rows) map.set(row.date, row);
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  };

  const midweekUnique = dedupeByDate(midweekMeetings);
  const weekendUnique = dedupeByDate(weekendMeetings);
  const audioUnique = dedupeByDate(audioAssignments);

  if (!DRY_RUN) {
    const { data: existingMidweek } = await supabase
      .from('midweek_meetings')
      .select('id, date')
      .gte('date', `${windowStart.getUTCFullYear()}-${String(windowStart.getUTCMonth() + 1).padStart(2, '0')}-01`)
      .lte('date', `${windowEnd.getUTCFullYear()}-${String(windowEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(windowEnd.getUTCDate()).padStart(2, '0')}`);
    const existingMidweekByDate = new Map((existingMidweek || []).map((item) => [item.date, item]));

    for (const meeting of midweekUnique) {
      const president = resolveMember(meeting.president);
      const openingPrayer = resolveMember(meeting.opening_prayer);
      const closingPrayer = resolveMember(meeting.closing_prayer);
      const treasureTalk = resolveMember(meeting.treasure_talk_speaker);
      const treasureGems = resolveMember(meeting.treasure_gems_speaker);
      const treasureReading = resolveMember(meeting.treasure_reading_student);
      const cbsConductor = resolveMember(meeting.cbs_conductor);
      const cbsReader = resolveMember(meeting.cbs_reader);

      const payload = {
        date: meeting.date,
        bible_reading: meeting.bible_reading,
        president_id: president?.id || null,
        opening_prayer_id: openingPrayer?.id || null,
        closing_prayer_id: closingPrayer?.id || null,
        treasure_talk_title: meeting.treasure_talk_title || null,
        treasure_talk_speaker_id: treasureTalk?.id || null,
        treasure_gems_speaker_id: treasureGems?.id || null,
        treasure_reading_student_id: treasureReading?.id || null,
        cbs_conductor_id: cbsConductor?.id || null,
        cbs_reader_id: cbsReader?.id || null,
      };

      const existing = existingMidweekByDate.get(meeting.date);
      let meetingId = null;
      if (existing) {
        const { error } = await supabase.from('midweek_meetings').update(payload).eq('id', existing.id);
        if (error) {
          report.midweek.invalid += 1;
          continue;
        }
        meetingId = existing.id;
        report.midweek.updated += 1;
      } else {
        const { data, error } = await supabase.from('midweek_meetings').insert(payload).select('id').single();
        if (error || !data?.id) {
          report.midweek.invalid += 1;
          continue;
        }
        meetingId = data.id;
        report.midweek.inserted += 1;
        existingMidweekByDate.set(meeting.date, { id: meetingId, date: meeting.date });
      }

      await supabase.from('midweek_ministry_parts').delete().eq('meeting_id', meetingId);
      await supabase.from('midweek_christian_life_parts').delete().eq('meeting_id', meetingId);

      const ministryRows = [];
      meeting.ministry_parts.forEach((part, index) => {
        const student = resolveMember(part.student);
        const assistant = resolveMember(part.assistant);
        if (!student) {
          report.midweek.skipped += 1;
          return;
        }
        ministryRows.push({
          meeting_id: meetingId,
          part_number: index + 1,
          title: part.title,
          duration: part.duration || 5,
          student_id: student.id,
          assistant_id: assistant?.id || null,
          room: null,
          scheduled_time: null,
        });
      });
      if (ministryRows.length > 0) {
        const { error } = await supabase.from('midweek_ministry_parts').insert(ministryRows);
        if (error) report.midweek.invalid += 1;
      }

      const christianRows = [];
      meeting.christian_life_parts.forEach((part, index) => {
        const speaker = resolveMember(part.speaker);
        if (!speaker) {
          report.midweek.skipped += 1;
          return;
        }
        christianRows.push({
          meeting_id: meetingId,
          part_number: index + 1,
          title: part.title,
          duration: part.duration || 10,
          speaker_id: speaker.id,
          scheduled_time: null,
        });
      });
      if (christianRows.length > 0) {
        const { error } = await supabase.from('midweek_christian_life_parts').insert(christianRows);
        if (error) report.midweek.invalid += 1;
      }
    }

    const { data: existingWeekend } = await supabase
      .from('weekend_meetings')
      .select('id, date')
      .gte('date', `${windowStart.getUTCFullYear()}-${String(windowStart.getUTCMonth() + 1).padStart(2, '0')}-01`)
      .lte('date', `${windowEnd.getUTCFullYear()}-${String(windowEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(windowEnd.getUTCDate()).padStart(2, '0')}`);
    const existingWeekendByDate = new Map((existingWeekend || []).map((item) => [item.date, item]));

    for (const meeting of weekendUnique) {
      const president = resolveMember(meeting.president);
      const reader = resolveMember(meeting.watchtower_reader);
      const closingPrayer = resolveMember(meeting.closing_prayer);
      const speakerData = resolveSpeakerCongregation(meeting.talk_speaker_name || '');
      if (!speakerData.speakerName) {
        report.weekend.skipped += 1;
        continue;
      }

      const payload = {
        date: meeting.date,
        president_id: president?.id || null,
        closing_prayer_id: closingPrayer?.id || null,
        talk_theme: meeting.talk_theme || null,
        talk_speaker_name: speakerData.speakerName,
        talk_congregation: meeting.talk_congregation || speakerData.congregation || null,
        watchtower_conductor_id: null,
        watchtower_reader_id: reader?.id || null,
      };
      const existing = existingWeekendByDate.get(meeting.date);
      if (existing) {
        const { error } = await supabase.from('weekend_meetings').update(payload).eq('id', existing.id);
        if (error) {
          report.weekend.invalid += 1;
          continue;
        }
        report.weekend.updated += 1;
      } else {
        const { data, error } = await supabase.from('weekend_meetings').insert(payload).select('id').single();
        if (error || !data?.id) {
          report.weekend.invalid += 1;
          continue;
        }
        report.weekend.inserted += 1;
        existingWeekendByDate.set(meeting.date, { id: data.id, date: meeting.date });
      }
    }

    const { data: existingAudio } = await supabase
      .from('audio_video_assignments')
      .select('id, date')
      .gte('date', `${windowStart.getUTCFullYear()}-${String(windowStart.getUTCMonth() + 1).padStart(2, '0')}-01`)
      .lte('date', `${windowEnd.getUTCFullYear()}-${String(windowEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(windowEnd.getUTCDate()).padStart(2, '0')}`);
    const existingAudioByDate = new Map((existingAudio || []).map((item) => [item.date, item]));

    for (const assignment of audioUnique) {
      const sound = resolveMember(assignment.sound, { allowFirstName: true });
      const image = resolveMember(assignment.image, { allowFirstName: true });
      const stage = resolveMember(assignment.stage, { allowFirstName: true });
      const roving1 = resolveMember(assignment.roving_mic_1, { allowFirstName: true });
      const roving2 = resolveMember(assignment.roving_mic_2, { allowFirstName: true });

      if (!sound || !image || !stage || !roving1 || !roving2) {
        report.audio_video.skipped += 1;
        continue;
      }

      const attendants = [];
      const attendantsMemberIds = [];
      for (const rawName of assignment.attendants) {
        const member = resolveMember(rawName, { allowFirstName: true });
        if (!member) continue;
        attendants.push(member.full_name);
        attendantsMemberIds.push(member.id);
      }

      const payload = {
        date: assignment.date,
        weekday: assignment.weekday,
        sound: sound.full_name,
        sound_member_id: sound.id,
        image: image.full_name,
        image_member_id: image.id,
        stage: stage.full_name,
        stage_member_id: stage.id,
        roving_mic_1: roving1.full_name,
        roving_mic_1_member_id: roving1.id,
        roving_mic_2: roving2.full_name,
        roving_mic_2_member_id: roving2.id,
        attendants,
        attendants_member_ids: attendantsMemberIds,
      };

      const existing = existingAudioByDate.get(assignment.date);
      if (existing) {
        const { error } = await supabase.from('audio_video_assignments').update(payload).eq('id', existing.id);
        if (error) {
          report.audio_video.invalid += 1;
          continue;
        }
        report.audio_video.updated += 1;
      } else {
        const { data, error } = await supabase.from('audio_video_assignments').insert(payload).select('id').single();
        if (error || !data?.id) {
          report.audio_video.invalid += 1;
          continue;
        }
        report.audio_video.inserted += 1;
        existingAudioByDate.set(assignment.date, { id: data.id, date: assignment.date });
      }
    }
  }

  console.log('\n=== Importacao de Historico de Designacoes ===');
  console.log(`Modo: ${DRY_RUN ? 'dry-run' : 'execucao'}`);
  console.log(`Janela: ${windowStart.toISOString().slice(0, 10)} ate ${windowEnd.toISOString().slice(0, 10)}`);
  console.log('');
  console.log(`Midweek  -> inseridos: ${report.midweek.inserted}, atualizados: ${report.midweek.updated}, pulados: ${report.midweek.skipped}, invalidos: ${report.midweek.invalid}`);
  console.log(`Weekend  -> inseridos: ${report.weekend.inserted}, atualizados: ${report.weekend.updated}, pulados: ${report.weekend.skipped}, invalidos: ${report.weekend.invalid}`);
  console.log(`Audio/V  -> inseridos: ${report.audio_video.inserted}, atualizados: ${report.audio_video.updated}, pulados: ${report.audio_video.skipped}, invalidos: ${report.audio_video.invalid}`);

  if (report.notFoundMembers.size > 0) {
    console.log('\nMembros nao encontrados (registro/funcao pulada):');
    [...report.notFoundMembers]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((name) => console.log(`- ${name}`));
  }

  if (report.parseErrors.length > 0) {
    console.log('\nErros de parse:');
    report.parseErrors.forEach((item) => console.log(`- ${item}`));
  }

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'execution',
    window: {
      start: windowStart.toISOString().slice(0, 10),
      end: windowEnd.toISOString().slice(0, 10),
    },
    summary: {
      midweek: report.midweek,
      weekend: report.weekend,
      audio_video: report.audio_video,
    },
    notFoundMembers: [...report.notFoundMembers].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    parseErrors: report.parseErrors,
  };

  const reportFile = path.join(HIST_DIR, `import-report-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  fs.writeFileSync(reportFile, `${JSON.stringify(reportPayload, null, 2)}\n`, 'utf8');
  console.log(`\nRelatorio salvo em: ${reportFile}`);
}

main().catch((error) => {
  console.error(`\nFalha na importacao: ${error.message}`);
  process.exit(1);
});
