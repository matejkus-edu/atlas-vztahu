/**
 * Kauza Vypnutý mikrofon – webová aplikace pro H-PMC (komunikace, varianta B).
 * Skript patří k tabulce Google Sheets (Rozšíření → Apps Script).
 * Hra běží na GitHub Pages (atlas-vztahu/kauza/), tento skript jen ukládá odpovědi a vrací přehled.
 * Webová aplikace: Spustit jako já, přístup Kdokoli. URL končící /exec vložte do API_URL v kauza/index.html.
 */

const PIN = '2114';                 // ← změňte si PIN pro učitelský přehled
const SHEET_NAME = 'Odpovědi';
const HEADERS = ['Čas', 'Datum', 'Třída', 'Skupina', 'Členové', 'Relace', 'Typ', 'Etapa', 'Čas ve hře', 'Pokusy', 'Data'];

const KEY = [
  ['Etapa 1', '6', 'Všech šest věcí je komunikace (Watzlawick: nelze nekomunikovat).'],
  ['Etapa 2', 'BCA', 'Rozhoduje jen jeden: B (táta). Spolupráce + soutěž: C (Discord). Soutěž bez moci: A (sestra).'],
  ['Etapa 3a', 'XYYX', '1 stejná věc, jiný vztah · 2 jiná věc, stejný vztah · 3 jiná věc, stejný vztah · 4 stejná věc, jiný vztah.'],
  ['Etapa 3b', '3', '„Ty seš fakt nejhorší support…“ – první útok na osobu.']
];

/** GET: ?action=dashboard&pin=…&datum=… vrací JSON pro učitelský přehled na GitHubu; jinak stránku hry. */
function doGet(e) {
  const prm = (e && e.parameter) || {};
  if (prm.action === 'dashboard') {
    try {
      const d = getDashboard(prm.pin, prm.datum);
      return json_({ ok: true, events: d.events, key: d.key });
    } catch (err) {
      return json_({ ok: false, error: err.message });
    }
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Kauza Vypnutý mikrofon')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** POST z hry na GitHubu: tělo je JSON jedné události. */
function doPost(e) {
  try {
    logEvent(JSON.parse(e.postData.contents));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Jednorázově spusťte z editoru: vytvoří list s hlavičkou. */
function setup() {
  getSheet_();
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

/** Volá stránka žáků při každé události (start, chyba, žeton, etapa, konec, bonus). */
function logEvent(p) {
  p = p || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const now = new Date();
    const day = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    getSheet_().appendRow([
      now, day,
      clip_(p.trida, 10), txt_(clip_(p.skupina, 80)), txt_(clip_(p.clenove, 200)), txt_(clip_(p.session, 20)),
      clip_(p.typ, 20), p.etapa || '', txt_(clip_(p.cas, 10)), p.pokusy || '',
      clip_(JSON.stringify(p.data || {}), 20000)
    ]);
  } finally {
    lock.releaseLock();
  }
  return true;
}

/** Učitelský přehled: vrátí události z vybraného dne a klíč. */
function getDashboard(pin, datum) {
  if (String(pin) !== PIN) throw new Error('Špatný PIN.');
  const values = getSheet_().getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const day = datum || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const events = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    const d = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') : String(r[1]);
    if (d !== day) continue;
    events.push({
      trida: String(r[2]), skupina: String(r[3]), clenove: String(r[4]), session: String(r[5]),
      typ: String(r[6]), etapa: r[7], cas: r[8] instanceof Date ? Utilities.formatDate(r[8], tz, 'm:ss') : String(r[8]),
      pokusy: r[9], data: String(r[10])
    });
  }
  return { events: events, key: KEY };
}

/** Apostrof zabrání tabulce převést „5:12“ na čas nebo jméno na vzorec. */
function txt_(s) {
  return s ? "'" + s : '';
}

function clip_(v, n) {
  const s = v == null ? '' : String(v);
  return s.length > n ? s.slice(0, n) : s;
}
