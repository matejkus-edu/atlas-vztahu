/**
 * ATLAS VZTAHŮ – backend v Google Apps Scriptu
 * ------------------------------------------------------------
 * 1) Vytvoř novou Google tabulku, otevři Rozšíření → Apps Script
 *    a vlož sem celý tento soubor.
 * 2) Spusť jednou funkci setup() (vytvoří listy items/types/sections
 *    a výchozí typy a oddíly). Při prvním spuštění povol přístup.
 * 3) Nastav heslo pro admin: Nastavení projektu (ozubené kolo) →
 *    Vlastnosti skriptu → přidej ADMIN_KEY = tvoje heslo.
 * 4) Nasadit → Nové nasazení → Webová aplikace:
 *      Spustit jako: Já · Kdo má přístup: Kdokoli
 *    Zkopíruj URL končící /exec do site/js/config.js (API_URL).
 * Po každé úpravě kódu: Nasadit → Spravovat nasazení → upravit →
 * Verze: Nová verze (URL zůstane stejná).
 */

var CLASSES = ['L1A', 'L1B', 'L1C'];
var AXES = ['closeness', 'symmetry', 'formality', 'choice'];

var ITEM_COLS = ['id', 'section', 'text', 'text2', 'mark', 'types', 'classes', 'weight', 'status', 'source', 'created', 'updated'];
var TYPE_COLS = ['id', 'name', 'en', 'color', 'order', 'description',
  'closeness_lo', 'closeness_hi', 'symmetry_lo', 'symmetry_hi',
  'formality_lo', 'formality_hi', 'choice_lo', 'choice_hi'];
var SECTION_COLS = ['id', 'order', 'kind', 'open', 'visible', 'title', 'en', 'subtitle'];

// ── nastavení tabulky ───────────────────────────────────────
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, 'items', ITEM_COLS);
  var types = ensureSheet_(ss, 'types', TYPE_COLS);
  var sections = ensureSheet_(ss, 'sections', SECTION_COLS);

  if (types.getLastRow() < 2) {
    DEFAULT_TYPES.forEach(function (t) { types.appendRow(typeToRow_(t)); });
  }
  if (sections.getLastRow() < 2) {
    DEFAULT_SECTIONS.forEach(function (s) { sections.appendRow(objToRow_(s, SECTION_COLS)); });
  }
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')) {
    Logger.log('POZOR: Nastav ve Vlastnostech skriptu ADMIN_KEY (heslo pro admin stránku).');
  }
  Logger.log('Hotovo. Listy items, types a sections jsou připravené.');
}

function ensureSheet_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(cols);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  }
  return sh;
}

// ── HTTP ────────────────────────────────────────────────────
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'data';
    if (action === 'data') {
      return json_({
        ok: true,
        types: readTypes_(),
        sections: readSections_(),
        items: readItems_().filter(function (i) { return i.status === 'approved'; }).map(publicItem_),
      });
    }
    return json_({ ok: false, error: 'Neznámá akce.' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    lock.waitLock(10000);
    if (body.action === 'submit') return json_(submit_(body.item || {}));
    if (body.action === 'vote') return json_(vote_(body.id));
    if (body.action === 'admin') return json_(admin_(body));
    return json_({ ok: false, error: 'Neznámá akce.' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ── veřejné akce ────────────────────────────────────────────
function submit_(raw) {
  var item = clean_(raw);
  if (!item.text) throw new Error('Chybí text příspěvku.');
  if (!item.classes.length) throw new Error('Vyber svou třídu.');
  var section = readSections_().filter(function (s) { return s.id === item.section; })[0];
  if (!section || !section.open || !section.visible) throw new Error('Do tohoto oddílu teď nejde přispívat.');
  if (section.kind === 'pairs' && !item.text2) throw new Error('Doplň i druhou stranu (co tě vztah stojí).');
  item.id = 'i' + Utilities.getUuid().slice(0, 8);
  item.weight = 1;
  item.status = 'pending';
  item.source = 'student';
  item.created = new Date().toISOString();
  item.updated = '';
  sheet_('items').appendRow(itemToRow_(item));
  return { ok: true };
}

function vote_(id) {
  var sh = sheet_('items');
  var row = findRow_(sh, id);
  if (!row) throw new Error('Položka neexistuje.');
  var data = rowToObj_(sh.getRange(row, 1, 1, ITEM_COLS.length).getValues()[0], ITEM_COLS);
  if (data.status !== 'approved') throw new Error('Položka není zveřejněná.');
  var w = (Number(data.weight) || 0) + 1;
  sh.getRange(row, ITEM_COLS.indexOf('weight') + 1).setValue(w);
  return { ok: true, weight: w };
}

// ── admin ───────────────────────────────────────────────────
function admin_(b) {
  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || b.key !== key) throw new Error('Špatné heslo.');
  var sh = sheet_('items');
  switch (b.op) {
    case 'list':
      return { ok: true, items: readItems_(), types: readTypes_(), sections: readSections_() };

    case 'saveItem': {
      var it = clean_(b.item || {});
      it.weight = Number(b.item.weight) || 1;
      it.status = ['approved', 'pending', 'hidden'].indexOf(b.item.status) >= 0 ? b.item.status : 'approved';
      it.updated = new Date().toISOString();
      if (b.item.id) {
        var r = findRow_(sh, b.item.id);
        if (!r) throw new Error('Položka neexistuje.');
        var old = rowToObj_(sh.getRange(r, 1, 1, ITEM_COLS.length).getValues()[0], ITEM_COLS);
        it.id = old.id; it.source = old.source; it.created = old.created;
        sh.getRange(r, 1, 1, ITEM_COLS.length).setValues([itemToRow_(it)]);
      } else {
        it.id = 'i' + Utilities.getUuid().slice(0, 8);
        it.source = b.item.source || 'teacher';
        it.created = it.updated;
        sh.appendRow(itemToRow_(it));
      }
      return { ok: true, id: it.id };
    }

    case 'setStatus':
      (b.ids || []).forEach(function (id) {
        var r = findRow_(sh, id);
        if (r) {
          sh.getRange(r, ITEM_COLS.indexOf('status') + 1).setValue(b.status);
          sh.getRange(r, ITEM_COLS.indexOf('updated') + 1).setValue(new Date().toISOString());
        }
      });
      return { ok: true };

    case 'deleteItems':
      deleteRows_(sh, b.ids || []);
      return { ok: true };

    case 'merge': {
      var tr = findRow_(sh, b.targetId);
      if (!tr) throw new Error('Cílová položka neexistuje.');
      var target = parseItem_(rowToObj_(sh.getRange(tr, 1, 1, ITEM_COLS.length).getValues()[0], ITEM_COLS));
      var others = readItems_().filter(function (i) { return b.ids.indexOf(i.id) >= 0 && i.id !== b.targetId; });
      others.forEach(function (o) {
        target.weight = (Number(target.weight) || 0) + (Number(o.weight) || 1);
        target.types = uniq_(target.types.concat(o.types));
        target.classes = uniq_(target.classes.concat(o.classes));
      });
      target.status = 'approved';
      target.updated = new Date().toISOString();
      sh.getRange(tr, 1, 1, ITEM_COLS.length).setValues([itemToRow_(target)]);
      deleteRows_(sh, others.map(function (o) { return o.id; }));
      return { ok: true };
    }

    case 'saveType':
      upsert_(sheet_('types'), typeToRow_(b.type), TYPE_COLS);
      return { ok: true };

    case 'deleteType':
      deleteRows_(sheet_('types'), [b.id]);
      return { ok: true };

    case 'saveSection':
      upsert_(sheet_('sections'), objToRow_(b.section, SECTION_COLS), SECTION_COLS);
      return { ok: true };

    case 'deleteSection':
      deleteRows_(sheet_('sections'), [b.id]);
      return { ok: true };
  }
  throw new Error('Neznámá operace.');
}

// ── čtení / zápis ───────────────────────────────────────────
function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Chybí list „' + name + '“. Spusť funkci setup().');
  return sh;
}

function readRows_(name, cols) {
  var sh = sheet_(name);
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, cols.length).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) { return rowToObj_(r, cols); });
}

function readItems_() { return readRows_('items', ITEM_COLS).map(parseItem_); }

function readTypes_() {
  return readRows_('types', TYPE_COLS).map(function (t) {
    var o = { id: String(t.id), name: t.name, en: t.en, color: t.color, order: Number(t.order) || 0, description: t.description };
    AXES.forEach(function (a) { o[a] = [Number(t[a + '_lo']) || 0, Number(t[a + '_hi']) || 0]; });
    return o;
  }).sort(function (a, b) { return a.order - b.order; });
}

function readSections_() {
  return readRows_('sections', SECTION_COLS).map(function (s) {
    s.id = String(s.id);
    s.order = Number(s.order) || 0;
    s.open = bool_(s.open);
    s.visible = bool_(s.visible);
    return s;
  }).sort(function (a, b) { return a.order - b.order; });
}

function parseItem_(i) {
  i.id = String(i.id);
  i.types = split_(i.types);
  i.classes = split_(i.classes);
  i.weight = Number(i.weight) || 1;
  i.created = i.created instanceof Date ? i.created.toISOString() : String(i.created || '');
  i.updated = i.updated instanceof Date ? i.updated.toISOString() : String(i.updated || '');
  return i;
}

function publicItem_(i) {
  return { id: i.id, section: i.section, text: i.text, text2: i.text2, mark: i.mark,
    types: i.types, classes: i.classes, weight: i.weight, source: i.source };
}

function clean_(raw) {
  function s(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
  var validTypes = readTypes_().map(function (t) { return t.id; });
  var classes = [].concat(raw.classes || []).filter(function (c) { return CLASSES.indexOf(c) >= 0; });
  return {
    section: s(raw.section, 40),
    text: s(raw.text, 220),
    text2: s(raw.text2, 220),
    mark: ['pair', 'cross'].indexOf(raw.mark) >= 0 ? raw.mark : '',
    types: [].concat(raw.types || []).map(String).filter(function (t) { return validTypes.indexOf(t) >= 0; }),
    classes: classes,
  };
}

function itemToRow_(i) {
  var o = {};
  for (var k in i) o[k] = i[k];
  o.types = (i.types || []).join(',');
  o.classes = (i.classes || []).join(',');
  return objToRow_(o, ITEM_COLS);
}

function typeToRow_(t) {
  var o = { id: t.id, name: t.name, en: t.en, color: t.color, order: t.order, description: t.description };
  AXES.forEach(function (a) {
    var v = t[a] || [0, 0];
    o[a + '_lo'] = Number(v[0]) || 0;
    o[a + '_hi'] = Number(v[1]) || 0;
  });
  return objToRow_(o, TYPE_COLS);
}

function objToRow_(o, cols) { return cols.map(function (c) { return o[c] == null ? '' : o[c]; }); }
function rowToObj_(r, cols) { var o = {}; cols.forEach(function (c, i) { o[c] = r[i]; }); return o; }
function split_(v) { return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(String); }
function uniq_(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
function bool_(v) { return v === true || String(v).toLowerCase() === 'true' || v === 1 || v === '1'; }

function findRow_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function deleteRows_(sh, ids) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  var all = sh.getRange(2, 1, n, 1).getValues();
  for (var i = all.length - 1; i >= 0; i--) {
    if (ids.indexOf(String(all[i][0])) >= 0) sh.deleteRow(i + 2);
  }
}

function upsert_(sh, row, cols) {
  var r = findRow_(sh, row[0]);
  if (r) sh.getRange(r, 1, 1, cols.length).setValues([row]);
  else sh.appendRow(row);
}

// ── výchozí obsah (stejný jako site/js/seed.js) ─────────────
var DEFAULT_TYPES = [
  { id: 'rodina', name: 'Rodina', en: 'family', color: '#FF6C2F', order: 1,
    description: 'Rodiče, sourozenci, prarodiče. Vztahy, které si nevybíráme, ale často trvají celý život.',
    closeness: [-1, -0.4], symmetry: [-0.4, 0.8], formality: [-1, -0.6], choice: [0.6, 1] },
  { id: 'pratelstvi', name: 'Přátelství', en: 'friendship', color: '#E8B900', order: 2,
    description: 'Kamarádi a přátelé. Vztahy, které si volíme a které stojí na vzájemnosti.',
    closeness: [-0.9, 0.1], symmetry: [-1, -0.5], formality: [-1, -0.7], choice: [-1, -0.6] },
  { id: 'partnersky', name: 'Partnerský vztah', en: 'romantic', color: '#FF48B0', order: 3,
    description: 'Chození, láska, partnerství. Nejvíc blízkosti, a proto i nejvíc zranitelnosti.',
    closeness: [-1, -0.7], symmetry: [-0.9, -0.3], formality: [-0.9, -0.4], choice: [-1, -0.7] },
  { id: 'skola', name: 'Škola a práce', en: 'school & work', color: '#0078BF', order: 4,
    description: 'Spolužáci, učitelé, kolegové, šéf na brigádě. Vztahy, které vymezuje role.',
    closeness: [-0.2, 0.8], symmetry: [-0.6, 0.9], formality: [0, 0.9], choice: [0.2, 0.9] },
  { id: 'komunita', name: 'Komunita a sousedé', en: 'community', color: '#00A95C', order: 5,
    description: 'Sousedé, oddíl, kroužek, sportovní klub. Vztahy spojené s místem nebo s aktivitami.',
    closeness: [0.3, 0.9], symmetry: [-0.6, 0.2], formality: [-0.2, 0.5], choice: [0.1, 0.7] },
  { id: 'sluzby', name: 'Instituce a služby', en: 'services', color: '#00838A', order: 6,
    description: 'Lékař, prodavačka, řidič autobusu. Krátké, formální, ale každodenní setkání.',
    closeness: [0.7, 1], symmetry: [0.2, 0.8], formality: [0.5, 1], choice: [-0.4, 0.6] },
  { id: 'online', name: 'Online a jednostranné', en: 'online & parasocial', color: '#765BA7', order: 7,
    description: 'Kamarádi z online her, youtubeři, postavy ze seriálů. Někdy o nás druhá strana ani neví.',
    closeness: [-0.3, 1], symmetry: [0.4, 1], formality: [-0.8, -0.1], choice: [-1, -0.4] },
];

var DEFAULT_SECTIONS = [
  { id: 'ocekavame', order: 1, kind: 'bubbles', open: true, visible: true,
    title: 'Co od vztahů čekáme a co nám dávají', en: 'what we expect and receive',
    subtitle: 'Proč vztahy potřebujeme. Čím větší kruh, tím víc lidí to zmínilo.' },
  { id: 'davame', order: 2, kind: 'bubbles', open: true, visible: true,
    title: 'Co pro vztahy děláme', en: 'what we do',
    subtitle: 'Konkrétní činy: co uděláš, aby vztah fungoval. Čím větší kruh, tím víc lidí to zmínilo.' },
  { id: 'nici', order: 3, kind: 'bubbles', open: true, visible: true,
    title: 'Co vztahy ničí', en: 'what harms relationships',
    subtitle: 'Chování a situace, které vztahy oslabují nebo rozbíjejí.' },
  { id: 'pilire', order: 4, kind: 'pillars', open: true, visible: true,
    title: 'Na čem vztahy stojí', en: 'pillars',
    subtitle: 'Principy, na kterých vztah stojí: jedno slovo a k němu, co znamená. Čím vyšší sloup, tím víc žáků pilíř zmínilo. U jedné třídy je každý kruh jeden žák.' },
  { id: 'ambivalence', order: 5, kind: 'pairs', open: true, visible: true,
    title: 'Rub a líc', en: 'ambivalence',
    subtitle: 'Co nám vztah dává a co nás tentýž vztah stojí. ⟷ znamená, že jde o dvě strany jedné mince, ✕ že spolu nesouvisí.' },
];
