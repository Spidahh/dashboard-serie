/* ================================================================
   Dashboard Serie — legge l'account Simkl e mostra cosa guardare.
   Sola lettura: non scrive mai niente sull'account Simkl.
   ================================================================ */

'use strict';

/* ---------------- configurazione ---------------- */

const CFG = {
  clientId: 'ee08e3adabdcf5b669ded35b6d2c3f291c29a8e7233ccb41408f34977dab420b',
  appName: 'dashboard-serie',
  appVersion: '1.0',
  api: 'https://api.simkl.com',
  calendar: 'https://data.simkl.in/calendar',
  img: 'https://wsrv.nl/?url=https://simkl.in/posters/',
  storeKey: 'dashboard-serie-v1',
  calendarTtl: 5 * 3600e3,      // il CDN di Simkl tiene il calendario 5 ore
  autoRefreshMs: 15 * 60e3      // limite consigliato da Simkl: 15-30 minuti
};

const DAY = 864e5;

const DEFAULTS = {
  pauseDays: 60,
  returnDays: 45,
  hotDays: 90,
  abandonDays: 365,
  showDropped: true,
  enTitles: true,
  aperte: null,        // quali sezioni tieni aperte; null = come le trova all'inizio
  vista: 'tutto',      // 'tutto' oppure una sola sezione alla volta
  autoRefresh: true,
  sort: 'recent',
  type: 'all'
};

/* ---------------- stato ---------------- */

let S = {
  token: null,
  act: null,        // ultimo /sync/activities salvato
  lib: {},          // "shows:1648964" -> voce API
  meta: {},         // "shows:1648964" -> { prevTotal, growthAt, override }
  cal: {},          // "1648964" -> { t, season, episode }   (solo titoli in libreria)
  calAt: 0,
  det: {},          // "shows:1648964" -> { status, lastAired, at }  scheda della serie
  nuove: [],        // stagioni nuove che stanno uscendo e che non hai in libreria
  nascoste: {},     // id -> true, segnalazioni che hai tolto a mano
  lastSync: 0,
  settings: { ...DEFAULTS }
};

let ui = { search: '', busy: false, pinTimer: null, refreshTimer: null };

/* ---------------- salvataggio locale ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(CFG.storeKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    S = { ...S, ...saved, settings: { ...DEFAULTS, ...(saved.settings || {}) } };
  } catch (e) {
    console.warn('Dati locali illeggibili, riparto da zero.', e);
  }
}

function save() {
  try {
    localStorage.setItem(CFG.storeKey, JSON.stringify(S));
  } catch (e) {
    // se lo spazio finisce, la cache del calendario è la prima cosa sacrificabile
    console.warn('Spazio locale esaurito, svuoto la cache del calendario.', e);
    S.cal = {}; S.calAt = 0;
    try { localStorage.setItem(CFG.storeKey, JSON.stringify(S)); } catch (_) {}
  }
}

/* ---------------- chiamate API ---------------- */

function apiUrl(path, params = {}) {
  const u = new URL(CFG.api + path);
  u.searchParams.set('client_id', CFG.clientId);
  u.searchParams.set('app-name', CFG.appName);
  u.searchParams.set('app-version', CFG.appVersion);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  }
  return u.toString();
}

// Nota: User-Agent non è impostabile da una pagina web, il browser lo mette da sé.
async function api(path, params = {}, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json', 'simkl-api-key': CFG.clientId };
  if (auth) {
    if (!S.token) throw new Error('NO_TOKEN');
    headers['Authorization'] = 'Bearer ' + S.token;
  }

  let wait = 1000;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(apiUrl(path, params), { headers });

    if (res.status === 429 || res.status >= 500) {       // sovraccarico: aspetto e riprovo
      if (attempt === 3) throw new Error('API ' + res.status);
      await sleep(wait); wait *= 2;
      continue;
    }
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    if (res.status === 412) throw new Error('CLIENT_ID_RIFIUTATO');
    if (!res.ok) throw new Error('API ' + res.status);

    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- collegamento account (flusso PIN) ---------------- */

async function startPin() {
  show('#loginErr', false);
  let init;
  try {
    init = await api('/oauth/pin', {}, { auth: false });
  } catch (e) {
    return loginError('Non riesco a contattare Simkl: ' + e.message);
  }
  if (!init || init.result !== 'OK' || !init.user_code) {
    return loginError('Simkl non ha restituito un codice. Riprova tra poco.');
  }

  $('#pinCode').textContent = init.user_code;
  const url = init.verification_url || init.verification_uri || 'https://simkl.com/pin';
  const link = $('#pinUrl');
  link.href = url;
  link.textContent = url.replace(/^https?:\/\//, '');
  show('#loginStep1', false);
  show('#loginStep2', true);

  const deadline = Date.now() + (init.expires_in || 900) * 1000;
  const every = (init.interval || 5) * 1000;

  ui.pinTimer = setInterval(async () => {
    if (Date.now() > deadline) {
      stopPin();
      return loginError('Il codice è scaduto. Premi di nuovo "Collega Simkl".');
    }
    try {
      const r = await api('/oauth/pin/' + encodeURIComponent(init.user_code), {}, { auth: false });
      // Se il codice è già stato consumato Simkl ne restituisce uno nuovo: non è un token.
      if (r && r.result === 'OK' && r.access_token) {
        stopPin();
        S.token = r.access_token;
        S.act = null; S.lib = {}; S.meta = {};
        save();
        await boot();
      }
    } catch (e) {
      console.warn('Attesa PIN:', e.message);
    }
  }, every);
}

function stopPin() {
  clearInterval(ui.pinTimer);
  ui.pinTimer = null;
  show('#loginStep2', false);
  show('#loginStep1', true);
}

function loginError(msg) {
  const el = $('#loginErr');
  el.textContent = msg;
  show('#loginErr', true);
}

/* ---------------- sincronizzazione ---------------- */

/*
   Regole imposte da Simkl, rispettate qui alla lettera:
   - fase 1 (primo avvio): una chiamata per tipo, in sequenza, senza date_from;
   - fase 2 (sempre dopo): prima /sync/activities, e solo se qualcosa è cambiato
     una sola chiamata combinata con date_from.
*/
async function sync({ full = false } = {}) {
  if (ui.busy) return;
  ui.busy = true;
  $('#btnSync').classList.add('spin');

  try {
    const act = await api('/sync/activities');
    const prev = S.act;
    const first = full || !prev || !prev.all || Object.keys(S.lib).length === 0;

    if (!first && act && act.all && act.all === prev.all) {
      S.lastSync = Date.now();
      save();
      await refreshCalendar();
      await refreshDetails(chiaviDaApprofondire());
      render();
      completaTitoli();
      toast('Già aggiornato');
      return;
    }

    if (first) {
      // fase 1 — libreria completa, un tipo alla volta
      for (const type of ['shows', 'anime']) {
        const res = await api(`/sync/all-items/${type}/all`, { next_watch_info: 'yes' });
        merge(res);
      }
    } else {
      // fase 2 — solo il delta, tutti i tipi in una chiamata sola
      const res = await api('/sync/all-items', { date_from: prev.all, next_watch_info: 'yes' });
      merge(res);

      // se qualcosa è stato tolto dalle liste, riallineo gli id
      const removed = ['tv_shows', 'anime'].some(k => (prev?.[k]?.removed_from_list ?? null) !== (act?.[k]?.removed_from_list ?? null));
      if (removed) await reconcile();
    }

    S.act = act;
    S.lastSync = Date.now();
    save();

    await refreshCalendar({ force: true });
    render();                                   // disegno subito con quello che ho
    await refreshDetails(chiaviDaApprofondire());
    render();                                   // e ridisegno quando so quali serie sono ancora vive
    completaTitoli();                           // e intanto, in sottofondo, sistemo i titoli
    toast(first ? 'Libreria scaricata' : 'Aggiornato');

  } catch (e) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_TOKEN') {
      logout('Il collegamento con Simkl è scaduto. Ricollega l\'account.');
    } else {
      toast('Errore: ' + e.message);
      console.error(e);
    }
  } finally {
    ui.busy = false;
    $('#btnSync').classList.remove('spin');
    updateSyncInfo();
  }
}

function merge(res) {
  if (!res) return;
  const now = new Date().toISOString();

  for (const type of ['shows', 'anime']) {
    for (const e of res[type] || []) {
      const id = e?.show?.ids?.simkl;
      if (!id) continue;
      const key = type + ':' + id;

      const m = S.meta[key] || (S.meta[key] = {});
      const total = e.total_episodes_count || 0;
      // il totale che cresce = stagione nuova annunciata o uscita
      if (m.prevTotal != null && total > m.prevTotal) m.growthAt = now;
      m.prevTotal = total;

      e._type = type;
      e._id = id;
      S.lib[key] = e;
    }
  }
}

// Toglie dalla libreria locale i titoli che l'utente ha rimosso su Simkl.
async function reconcile() {
  const alive = new Set();
  for (const type of ['shows', 'anime']) {
    const res = await api(`/sync/all-items/${type}/all`, { extended: 'simkl_ids_only' });
    for (const e of res?.[type] || []) {
      const id = e?.show?.ids?.simkl;
      if (id) alive.add(type + ':' + id);
    }
  }
  if (!alive.size) return;
  for (const key of Object.keys(S.lib)) {
    if (!alive.has(key)) { delete S.lib[key]; delete S.meta[key]; }
  }
}

/* ---------------- calendario (file pubblico su CDN, non consuma quota) ---------------- */

/*
   Su Simkl ogni stagione di un anime è spesso una voce separata, e il tracker
   automatico la aggiunge alla tua libreria solo quando ne guardi un episodio.
   Finché non lo fai, la stagione nuova non esiste per la dashboard.

   Per pescarla confronto il calendario dei prossimi 33 giorni con quello che
   hai già: se sta uscendo un titolo che non hai in libreria ma che ha la stessa
   radice di uno che segui, te lo segnalo.

   È un confronto sui nomi, non su un collegamento ufficiale: Simkl non espone
   il legame fra le stagioni di una stessa serie. Sugli anime funziona bene
   perché il prefisso resta uguale; qualche caso storto è messo in conto, e per
   quello c'è il pulsante "nascondi" su ogni segnalazione.
*/
function radice(titolo) {
  let t = decodifica(titolo || '').toLowerCase();
  t = t.split(/:| - |–|—/)[0];                                   // taglio al primo sottotitolo
  t = t.replace(/\b(season|stagione|part|parte|cour|final|movie|special|ova|ona|tv)\b.*$/, '');
  t = t.replace(/\s+(\d+|[ivx]+)\s*$/, '');                       // numero o numero romano finale
  t = t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return t;
}

const CAL_VER = 2;   // sale quando cambia cosa ricavo dal calendario, così la cache si rifà

async function refreshCalendar({ force = false } = {}) {
  const aggiornato = Date.now() - S.calAt < CFG.calendarTtl && Object.keys(S.cal).length && S.calVer === CAL_VER;
  if (!force && aggiornato) return;

  const mie = new Set(Object.values(S.lib).map(e => String(e._id)));
  if (!mie.size) return;

  // le "radici" di quello che hai già, sia col titolo inglese sia con l'originale
  const radici = new Map();
  for (const [k, e] of Object.entries(S.lib)) {
    for (const r of [radice(titolo(k, e)), radice(e.show?.title)]) {
      if (r.length >= 5 && !radici.has(r)) radici.set(r, titolo(k, e));
    }
  }

  const out = {};
  const trovate = new Map();
  const floor = Date.now() - 2 * DAY;

  for (const [file, tipo] of [['tv', 'shows'], ['anime', 'anime']]) {
    try {
      const res = await fetch(`${CFG.calendar}/${file}.json`);
      if (!res.ok) continue;
      const arr = await res.json();

      for (const x of arr) {
        const id = x?.ids?.simkl_id;
        if (!id) continue;
        const t = Date.parse(x.date);
        if (!isFinite(t) || t < floor) continue;

        if (mie.has(String(id))) {                      // ce l'hai: mi serve solo la data
          const cur = out[id];
          if (!cur || t < cur.t) {
            out[id] = { t, season: x.episode?.season ?? null, episode: x.episode?.episode ?? null };
          }
          continue;
        }

        const r = radice(x.title);                      // non ce l'hai: è roba che segui?
        if (r.length < 5 || !radici.has(r)) continue;
        const gia = trovate.get(id);
        if (!gia || t < gia.t) {
          trovate.set(id, {
            id, tipo, t,
            title: x.title,
            slug: x.ids?.slug || '',
            poster: x.poster || null,
            episode: x.episode?.episode ?? null,
            season: x.episode?.season ?? null,
            da: radici.get(r)
          });
        }
      }
    } catch (e) {
      console.warn('Calendario non raggiungibile:', file, e.message);
    }
  }

  S.cal = out;
  S.nuove = [...trovate.values()].sort((a, b) => a.t - b.t).slice(0, 60);
  S.calVer = CAL_VER;
  S.calAt = Date.now();
  save();
}

/* ---------------- schede delle serie: è ancora in onda? ---------------- */

/*
   /sync/all-items dice quando hai guardato TU, non quando è uscito l'ultimo
   episodio della serie. Senza quel dato una stagione finita due mesi fa e una
   finita quattro anni fa sembrano identiche. La scheda della singola serie pesa
   3,5 KB e contiene status e last_aired: la scarico una volta e la tengo in cache.
*/

const STATO_CALDO = new Set(['airing', 'ongoing', 'continuing', 'returning series', 'in production', 'upcoming', 'tba']);
const STATO_FREDDO = new Set(['ended', 'canceled', 'cancelled', 'released', 'finished']);

// true = ancora viva · false = ferma da un pezzo · null = non lo so ancora
function serieCalda(det, now, finestra) {
  if (!det) return null;
  const s = (det.status || '').toLowerCase();
  if (STATO_CALDO.has(s)) return true;
  const t = det.lastAired ? Date.parse(det.lastAired) : null;
  if (t && now - t <= finestra) return true;
  if (STATO_FREDDO.has(s) || t) return false;
  return null;
}

function schedaScaduta(det, now) {
  if (!det) return true;
  if (det.enTitle === undefined) return true;      // scheda vecchia, senza il titolo inglese
  const viva = STATO_CALDO.has((det.status || '').toLowerCase());
  return now - (det.at || 0) > (viva ? 3 * DAY : 60 * DAY);
}

// La scheda serve solo dove c'è una scelta da fare: titoli con episodi arretrati.
function chiaviDaApprofondire() {
  const out = [];
  for (const [key, e] of Object.entries(S.lib)) {
    if (e.status === 'plantowatch') continue;
    const backlog = (e.total_episodes_count || 0) - (e.not_aired_episodes_count || 0) - (e.watched_episodes_count || 0);
    if (backlog >= 1) out.push(key);
  }
  return out;
}

async function scaricaScheda(key) {
  const e = S.lib[key];
  if (!e) return;
  const tipo = e._type === 'anime' ? 'anime' : 'tv';
  try {
    const d = await api(`/${tipo}/${e._id}`, {}, { auth: false });
    S.det[key] = { status: d?.status ?? null, lastAired: d?.last_aired ?? null,
                   enTitle: d?.en_title || null, at: Date.now() };
  } catch (err) {
    S.det[key] = { status: null, lastAired: null, enTitle: null, at: Date.now() };  // non insisto subito
  }
  await sleep(200);                                     // 5 al secondo: metà del limite consentito
}

// Fase 1: le schede che servono a decidere dove va una serie. Blocca il disegno.
async function refreshDetails(keys) {
  const now = Date.now();
  const todo = keys.filter(k => schedaScaduta(S.det[k], now)).slice(0, 400);
  if (!todo.length) return;

  const info = $('#syncInfo');
  let n = 0;
  for (const key of todo) {
    await scaricaScheda(key);
    if (++n % 10 === 0) { if (info) info.textContent = `schede ${n}/${todo.length}…`; save(); }
  }
  save();
}

/* Fase 2: le schede di tutto il resto, solo per avere i titoli giusti.
   Gira in sottofondo e non blocca niente: la pagina è già utilizzabile. */
let titoliInCorso = false;
async function completaTitoli() {
  if (titoliInCorso) return;
  titoliInCorso = true;
  try {
    const mancanti = Object.keys(S.lib).filter(k => !S.det[k] || S.det[k].enTitle === undefined);
    let n = 0;
    for (const key of mancanti) {
      await scaricaScheda(key);
      if (++n % 25 === 0) {
        const info = $('#syncInfo');
        if (info) info.textContent = `titoli ${n}/${mancanti.length}…`;
        save(); render();
      }
    }
    if (n) { save(); render(); updateSyncInfo(); }
  } finally {
    titoliInCorso = false;
  }
}

/* ---------------- titoli ---------------- */

/*
   Simkl restituisce il titolo romanizzato: "Dogul Wang" invece di "Tomb Raider King".
   Il titolo ufficiale in inglese sta solo nella scheda della serie, campo en_title.
   Lo prendo da lì e lo tengo in cache per sempre: un titolo non cambia.
*/
function titolo(key, e) {
  if (S.settings.enTitles !== false) {
    const en = S.det[key]?.enTitle;
    if (en) return decodifica(en);
  }
  return decodifica(e.show?.title) || '(senza titolo)';
}

/* Simkl restituisce i titoli con i caratteri speciali codificati:
   "Howl&#039;s Moving Castle", "Death &amp; Rebirth". Vanno riportati in chiaro.
   Il textarea scollegato dal documento è il modo sicuro: quello che ci finisce
   dentro viene letto come testo, mai eseguito. */
const memoTitoli = new Map();
function decodifica(txt) {
  if (!txt) return '';
  if (!txt.includes('&')) return txt;
  const gia = memoTitoli.get(txt);
  if (gia !== undefined) return gia;
  const box = document.createElement('textarea');
  box.innerHTML = txt;
  const chiaro = box.value;
  memoTitoli.set(txt, chiaro);
  return chiaro;
}

// La ricerca deve funzionare sia col titolo inglese sia con quello romanizzato.
function cercabile(key, e) {
  return (decodifica(S.det[key]?.enTitle) + ' ' + decodifica(e.show?.title)).toLowerCase();
}

/* ---------------- la logica: dove finisce ogni serie ---------------- */

function analyse(key, e, now) {
  const st = S.settings;
  const P = st.pauseDays * DAY;      // da quanto non guardi tu
  const R = st.returnDays * DAY;     // quanto dev'essere fresca la novità per dire "è tornata"
  const A = st.abandonDays * DAY;    // oltre questo l'hai abbandonata, in onda o no

  const total = e.total_episodes_count || 0;
  const notAired = e.not_aired_episodes_count || 0;
  const watched = e.watched_episodes_count || 0;

  const status = e.status;
  const live = status === 'watching' || status === 'hold';

  /* Gli arretrati si contano così: usciti meno visti. Ma i contatori di Simkl
     a volte restano indietro, e su una serie lunghissima basta poco per far
     comparire episodi che in realtà hai già visto. Quando Simkl dice che non
     c'è un prossimo episodio, quella è la parola definitiva: sei in pari. */
  const inPari = live && !e.next_to_watch && !e.next_to_watch_info;
  const backlog = inPari ? 0 : Math.max(0, total - notAired - watched);

  const lastAt = e.last_watched_at ? Date.parse(e.last_watched_at) : null;
  const nextT = e.next_to_watch_info?.date ? Date.parse(e.next_to_watch_info.date) : null;
  const growAt = S.meta[key]?.growthAt ? Date.parse(S.meta[key].growthAt) : null;
  const cal = S.cal[String(e._id)] || null;

  const inactivity = lastAt ? now - lastAt : Infinity;

  // "è tornata": c'è un segnale recente, di qualunque provenienza
  const fresh =
    (nextT != null && nextT <= now && now - nextT <= R) ||   // il prossimo episodio è uscito da poco
    (growAt != null && now - growAt <= R) ||                 // il totale episodi è cresciuto da poco
    (cal != null && cal.t >= now - 2 * DAY);                 // è nel calendario dei prossimi 33 giorni

  /* Data che conta per la fascia, per l'ordinamento e per la scritta sotto al poster.
     Deve essere sempre una data di USCITA. Prima ripiegava su last_watched_at, cioè
     su quando avevi guardato tu: bastava riprendere una serie ieri per vederla
     comparire fra quelle "appena uscite", e la fascia diceva il falso.
     L'ultima uscita vera ce l'ho già in cache nella scheda della serie. */
  const ultimaUscita = S.det[key]?.lastAired ? Date.parse(S.det[key].lastAired) : null;
  const airedAt = nextT != null && nextT <= now ? nextT : (growAt || ultimaUscita || null);
  const upcomingAt = cal && cal.t > now ? cal.t : (nextT != null && nextT > now ? nextT : null);

  const parked = status === 'completed' || status === 'dropped';

  let bucket, back = false;

  if (status === 'plantowatch') {
    bucket = 'start';

  } else if (backlog >= 1) {
    // Ci sono episodi usciti che non hai visto: solo qui ha senso parlare di pausa.
    // "calda" = la serie sta ancora uscendo, o ha finito da poco. Non c'entra
    // con quanto tempo fa l'hai guardata tu: c'entra con quanto è attuale la serie.
    const calda = serieCalda(S.det[key], now, st.hotDays * DAY);

    if (live) {
      if (inactivity <= P) bucket = 'watch';
      else if (fresh) { bucket = 'watch'; back = true; }      // roba nuova: torna su comunque
      else if (calda !== false && inactivity <= A) bucket = 'watch';
      else bucket = 'paused';
    } else if (parked && st.showDropped && (fresh || (status === 'completed' && calda === true))) {
      bucket = 'watch'; back = true;                          // finita due anni fa, ora è tornata
    } else {
      bucket = 'archive';
    }

  } else {
    // Zero arretrati: sei in pari. Non è mai "in pausa", non c'è niente da recuperare.
    // Una serie che hai abbandonato non è "in attesa": non stai aspettando niente.
    if (status === 'dropped') bucket = 'archive';
    else if (upcomingAt && (live || status === 'completed')) bucket = 'soon';
    else if (live) bucket = 'waiting';
    else bucket = 'archive';
  }

  /* Zero episodi visti non vuol dire "messa in pausa": vuol dire mai cominciata.
     Il posto giusto è "Da iniziare", insieme alle altre che devi ancora aprire.
     Se invece è appena uscita resta in griglia, perché lì il bucket non è 'paused'. */
  if (bucket === 'paused' && watched === 0) bucket = 'start';

  const ov = S.meta[key]?.override;
  if (ov === 'watch' && bucket !== 'watch') bucket = 'watch';
  if (ov === 'paused' && bucket === 'watch') { bucket = 'paused'; back = false; }

  return { key, e, backlog, bucket, back, lastAt, airedAt, upcomingAt, cal };
}

function nextLabel(a) {
  const info = a.e.next_to_watch_info;
  if (info && info.episode != null) {
    return info.season != null ? `S${pad(info.season)}E${pad(info.episode)}` : `Ep. ${info.episode}`;
  }
  if (a.e.next_to_watch) return a.e.next_to_watch;
  if (a.cal && a.cal.episode != null) {
    return a.cal.season != null ? `S${pad(a.cal.season)}E${pad(a.cal.episode)}` : `Ep. ${a.cal.episode}`;
  }
  if (a.e.last_watched) return 'dopo ' + a.e.last_watched;
  return '';
}

const pad = n => String(n).padStart(2, '0');

/* ---------------- disegno della pagina ---------------- */

function render() {
  const now = Date.now();
  const st = S.settings;
  const q = ui.search.trim().toLowerCase();

  const groups = { watch: [], soon: [], waiting: [], paused: [], start: [], archive: [] };

  for (const [key, e] of Object.entries(S.lib)) {
    if (st.type !== 'all' && e._type !== st.type) continue;
    if (q && !cercabile(key, e).includes(q)) continue;
    const a = analyse(key, e, now);
    groups[a.bucket].push(a);
  }

  sortList(groups.watch, st.sort);
  groups.soon.sort((x, y) => (x.upcomingAt || Infinity) - (y.upcomingAt || Infinity));
  sortList(groups.waiting, 'lastwatch');
  sortList(groups.paused, 'lastwatch');
  groups.start.sort((x, y) => titolo(x.key, x.e).localeCompare(titolo(y.key, y.e)));
  sortList(groups.archive, 'lastwatch');

  paintWatch(groups.watch);
  paint('gridSoon', groups.soon, 'cSoon', true);
  const nuove = paintNuove();
  paint('gridWaiting', groups.waiting, 'cWaiting', true);
  paint('gridPaused', groups.paused, 'cPaused', true);
  paint('gridStart', groups.start, 'cStart', true);
  paint('gridArchive', groups.archive, 'cArchive', true);

  const conteggi = {
    watch: groups.watch.length, soon: groups.soon.length, nuove,
    waiting: groups.waiting.length, paused: groups.paused.length,
    start: groups.start.length, archive: groups.archive.length
  };
  aggiornaMenu(conteggi, groups.watch);

  // La vista decide cosa resta in pagina: "tutto" oppure una sola sezione.
  const v = S.settings.vista || 'tutto';
  const pieno = v === 'tutto';
  const sezioni = {
    watch: '#secWatch', soon: '#secSoon', nuove: '#secNuove', waiting: '#secWaiting',
    paused: '#secPaused', start: '#secStart', archive: '#secArchive'
  };
  for (const [chiave, sel] of Object.entries(sezioni)) {
    const visibile = (pieno || v === chiave) && (chiave === 'watch' || conteggi[chiave] > 0);
    show(sel, visibile);
    // guardando una sezione sola, o cercando, non ha senso tenerla chiusa:
    // prima i risultati finivano dentro sezioni chiuse e non si vedevano
    if ((!pieno && v === chiave) || (q && conteggi[chiave] > 0)) $(sel)?.classList.remove('closed');
  }
  show('#emptyWatch', (pieno || v === 'watch') && groups.watch.length === 0);

  const VUOTE = {
    soon: 'Nessuna serie con una data già fissata.',
    nuove: 'Nessuna stagione nuova in uscita fra quelle che segui.',
    waiting: 'Nessuna serie in attesa di una data.',
    paused: 'Niente in pausa: non hai serie lasciate a metà.',
    start: 'Niente da iniziare.',
    archive: "L'archivio è vuoto."
  };
  const vuotaVista = !pieno && v !== 'watch' && !conteggi[v];
  const eV = $('#emptyVista');
  if (eV) eV.textContent = vuotaVista ? (VUOTE[v] || "Qui non c'è niente.") +
    (ui.search.trim() ? ' Prova a svuotare la ricerca.' : '') : '';
  show('#emptyVista', vuotaVista);


  const tot = Object.keys(S.lib).length;
  const arretrati = groups.watch.reduce((s, a) => s + a.backlog, 0);
  const oggi = groups.watch.filter(a => a.airedAt && Date.now() - a.airedAt <= 2 * DAY)
                           .reduce((s, a) => s + a.backlog, 0);

  const sub = $('#brandSub');
  if (sub) {
    if (!arretrati) sub.textContent = "Sei in pari: non c'è niente da recuperare.";
    else {
      const ep = arretrati === 1 ? '1 episodio' : arretrati + ' episodi';
      const se = groups.watch.length === 1 ? '1 serie' : groups.watch.length + ' serie';
      sub.innerHTML = `<b>${escapeHtml(ep)}</b> da vedere, su ${escapeHtml(se)}` +
        (oggi ? ` · <span class="oggi">${oggi === 1 ? '1 appena uscito' : oggi + ' appena usciti'}</span>` : '');
    }
  }

  $('#statsLine').textContent = `${tot} titoli in libreria · ${arretrati} episodi arretrati da vedere`;
  document.title = arretrati ? `(${arretrati}) Dashboard Serie` : 'Dashboard Serie';
}

function sortList(list, mode) {
  const by = {
    recent: (x, y) => (y.airedAt || 0) - (x.airedAt || 0),
    oldest: (x, y) => (x.airedAt || Infinity) - (y.airedAt || Infinity),
    backlog: (x, y) => y.backlog - x.backlog || (y.airedAt || 0) - (x.airedAt || 0),
    lastwatch: (x, y) => (y.lastAt || 0) - (x.lastAt || 0),
    title: (x, y) => titolo(x.key, x.e).localeCompare(titolo(y.key, y.e))
  };
  list.sort(by[mode] || by.recent);
}

/* La schermata principale è divisa per quanto è fresco l'episodio:
   così si vede al volo cosa è appena uscito e cosa si trascina da settimane. */
function paintWatch(list) {
  const host = $('#watchBands');
  $('#cWatch').textContent = list.length;
  host.replaceChildren();
  if (!list.length) return;

  const bands = S.settings.sort === 'recent' ? splitBands(list) : [{ label: null, items: list }];
  const frag = document.createDocumentFragment();

  for (const b of bands) {
    if (!b.items.length) continue;
    if (b.label) {
      const h = document.createElement('h3');
      h.className = 'band-title';
      h.appendChild(document.createTextNode(b.label));
      const n = document.createElement('span');
      n.className = 'band-n';
      n.textContent = b.items.length;
      h.appendChild(n);
      frag.appendChild(h);
    }
    const g = document.createElement('div');
    g.className = 'grid';
    for (const a of b.items) g.appendChild(card(a, false));
    frag.appendChild(g);
  }
  host.appendChild(frag);
}

/* Due fasce sole: quello uscito nell'ultimo mese e quello che ti trascini da prima.
   Le fasce intermedie mescolavano lo stesso concetto in tre etichette. */
function splitBands(list) {
  const now = Date.now();
  const b = [[], []];
  for (const a of list) {
    const d = a.airedAt ? (now - a.airedAt) / DAY : Infinity;
    b[d <= 31 ? 0 : 1].push(a);
  }
  return [
    { label: 'Appena usciti', items: b[0] },
    { label: 'Più indietro', items: b[1] }
  ];
}

/* Le stagioni nuove segnalate dal calendario: non sono voci della libreria,
   quindi hanno una card tutta loro con il pulsante per toglierle di mezzo. */
function paintNuove() {
  const q = ui.search.trim().toLowerCase();
  const lista = (S.nuove || []).filter(x =>
    !S.nascoste[x.id] &&
    (S.settings.type === 'all' || S.settings.type === x.tipo) &&
    (!q || decodifica(x.title).toLowerCase().includes(q) || decodifica(x.da).toLowerCase().includes(q))
  );

  const grid = $('#gridNuove');
  $('#cNuove').textContent = lista.length;
  grid.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const x of lista) frag.appendChild(cardNuova(x));
  grid.appendChild(frag);
  return lista.length;
}

function cardNuova(x) {
  const kind = x.tipo === 'anime' ? 'anime' : 'tv';
  const nome = decodifica(x.title);

  const el = document.createElement('a');
  el.className = 'card';
  el.href = `https://simkl.com/${kind}/${x.id}/${x.slug}`;
  el.target = '_blank';
  el.rel = 'noopener';
  el.title = nome;

  const poster = document.createElement('div');
  poster.className = 'poster';
  if (x.poster) {
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
    img.src = `${CFG.img}${x.poster}_ca.webp&q=90`;
    poster.appendChild(img);
  } else {
    const f = document.createElement('div');
    f.className = 'poster-fallback';
    f.textContent = nome;
    poster.appendChild(f);
  }
  poster.appendChild(badge('badge-soon', when(x.t)));

  const b = document.createElement('button');
  b.className = 'card-act';
  b.textContent = 'nascondi';
  b.title = 'Non segnalarmela più';
  b.onclick = ev => {
    ev.preventDefault(); ev.stopPropagation();
    S.nascoste[x.id] = true;
    save(); render();
  };
  poster.appendChild(b);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const t = document.createElement('div');
  t.className = 'title';
  t.textContent = nome;
  meta.appendChild(t);
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = x.episode != null ? `Ep. ${x.episode} · ${when(x.t)}` : when(x.t);
  meta.appendChild(sub);
  const da = document.createElement('div');
  da.className = 'ep';
  da.textContent = 'segui: ' + decodifica(x.da);
  meta.appendChild(da);

  el.appendChild(poster);
  el.appendChild(meta);
  return el;
}

function paint(gridId, list, countId, small) {
  const grid = document.getElementById(gridId);
  $('#' + countId).textContent = list.length;
  grid.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const a of list) frag.appendChild(card(a, small));
  grid.appendChild(frag);
}

function card(a, small) {
  const e = a.e;
  const show_ = e.show || {};
  const slug = show_.ids?.slug || '';
  const kind = e._type === 'anime' ? 'anime' : 'tv';

  const el = document.createElement('a');
  el.className = 'card';
  el.href = `https://simkl.com/${kind}/${e._id}/${slug}`;
  el.target = '_blank';
  el.rel = 'noopener';
  const nome = titolo(a.key, e);
  el.title = nome;

  const poster = document.createElement('div');
  poster.className = 'poster';

  if (show_.poster) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = `${CFG.img}${show_.poster}${small ? '_ca' : '_m'}.webp&q=90`;
    poster.appendChild(img);
  } else {
    const f = document.createElement('div');
    f.className = 'poster-fallback';
    f.textContent = nome;
    poster.appendChild(f);
  }

  // Un episodio solo e appena uscito è una cosa diversa da sette arretrati.
  if (a.backlog >= 2) {
    poster.appendChild(badge('badge-count', '+' + a.backlog));
  } else if (a.backlog === 1) {
    const fresco = a.airedAt && Date.now() - a.airedAt <= 7 * DAY;
    poster.appendChild(badge(fresco ? 'badge-new' : 'badge-count', fresco ? 'NUOVO' : '+1'));
  }
  if (a.back) poster.appendChild(badge('badge-back', 'TORNATA'));
  else if (a.bucket === 'soon' && a.upcomingAt) poster.appendChild(badge('badge-soon', when(a.upcomingAt)));
  if (e._type === 'anime') poster.appendChild(badge('badge-type', 'ANIME'));

  // pulsantino per spostare a mano una serie tra "da guardare" e "in pausa"
  if (a.bucket === 'watch' || a.bucket === 'paused') {
    const b = document.createElement('button');
    b.className = 'card-act';
    b.textContent = a.bucket === 'watch' ? 'in pausa' : 'riprendi';
    b.title = a.bucket === 'watch'
      ? 'Togli questa serie dalla schermata principale. Vale solo qui: su Simkl non cambia niente.'
      : 'Rimettila fra quelle da guardare. Vale solo qui: su Simkl non cambia niente.';
    b.onclick = ev => {
      ev.preventDefault(); ev.stopPropagation();
      const m = S.meta[a.key] || (S.meta[a.key] = {});
      m.override = a.bucket === 'watch' ? 'paused' : 'watch';
      save(); render();
    };
    poster.appendChild(b);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';

  const t = document.createElement('div');
  t.className = 'title';
  t.textContent = nome;
  meta.appendChild(t);

  const sub = document.createElement('div');
  sub.className = 'sub';

  let lbl, date;
  if (a.bucket === 'waiting') {
    // Sei in pari: la cosa utile è fin dove sei arrivato, non un episodio da vedere.
    lbl = e.last_watched ? 'visto fino a ' + e.last_watched : 'sei in pari';
    date = a.lastAt;
  } else {
    lbl = nextLabel(a);
    // Sulle serie completate o abbandonate Simkl non dà il "prossimo episodio":
    // in quel caso dico almeno quanta roba nuova c'è.
    if (!lbl && a.backlog > 0) lbl = a.backlog === 1 ? '1 episodio nuovo' : a.backlog + ' episodi nuovi';
    date = a.bucket === 'soon' ? a.upcomingAt : a.airedAt;
  }
  // "uscito" / "esce" evita il dubbio fra quando è uscito l'episodio e quando l'hai visto tu
  const verbo = a.bucket === 'soon' ? 'esce ' : (a.bucket === 'waiting' ? '' : 'uscito ');
  if (lbl && date) sub.innerHTML = `<b>${escapeHtml(lbl)}</b> ${escapeHtml(verbo + when(date))}`;
  else if (lbl) sub.textContent = lbl;
  else if (date) sub.textContent = when(date);
  else sub.textContent = show_.year ? String(show_.year) : '';
  meta.appendChild(sub);

  /* Il titolo dell'episodio, solo nella griglia grande dove c'è spazio.
     Se ripete soltanto il numero ("Episode 8") non aggiunge niente a "Ep. 8": lo salto. */
  const epTitle = e.next_to_watch_info?.title;
  if (!small && epTitle && !/^(episode|episodio|ep\.?)\s*\d+$/i.test(epTitle.trim())) {
    const ep = document.createElement('div');
    ep.className = 'ep';
    ep.textContent = epTitle;
    meta.appendChild(ep);
  }

  el.appendChild(poster);
  el.appendChild(meta);
  return el;
}

const SPIEGA_PASTIGLIA = {
  'badge-count': 'Quanti episodi usciti non hai ancora visto',
  'badge-new': 'Un episodio solo, uscito negli ultimi 7 giorni',
  'badge-back': 'Era ferma da un pezzo, ma è uscita roba nuova',
  'badge-soon': 'Quando esce il prossimo episodio',
  'badge-type': 'È un anime'
};

function badge(cls, txt, spiega) {
  const b = document.createElement('span');
  b.className = 'badge ' + cls;
  b.textContent = txt;
  const t = spiega || SPIEGA_PASTIGLIA[cls];
  if (t) b.title = t;
  return b;
}

/* ---------------- il menù di sinistra ---------------- */

const FASCE_NAV = ['Appena usciti', 'Più indietro'];

function aggiornaMenu(conteggi, watch) {
  for (const [chiave, id] of Object.entries({
    watch: 'nWatch', soon: 'nSoon', nuove: 'nNuove', waiting: 'nWaiting',
    paused: 'nPaused', start: 'nStart', archive: 'nArchive'
  })) {
    const el = document.getElementById(id);
    if (el) el.textContent = conteggi[chiave] || 0;
  }

  // le fasce compaiono nel menù solo quando esistono davvero
  const host = $('#navFasce');
  if (!host) return;
  const mostra = (S.settings.vista || 'tutto') !== 'archive' && S.settings.sort === 'recent';
  host.replaceChildren();
  if (!mostra || !watch.length) return;

  const dentro = new Set(splitBands(watch).filter(b => b.items.length).map(b => b.label));
  for (const nome of FASCE_NAV) {
    if (!dentro.has(nome)) continue;
    const b = document.createElement('button');
    b.className = 'nav-fascia';
    b.textContent = nome;
    b.onclick = () => {
      const t = [...document.querySelectorAll('.band-title')].find(h => h.firstChild?.textContent === nome);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    host.appendChild(b);
  }
}

function cambiaVista(v) {
  S.settings.vista = v;
  for (const b of document.querySelectorAll('.nav-item')) b.classList.toggle('on', b.dataset.vista === v);
  // tornando alla vista completa le sezioni riprendono lo stato che avevi scelto tu
  if (v === 'tutto') applicaSezioni();
  save();
  render();
  scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- date in parole ---------------- */

function when(t) {
  const d = Math.round((t - Date.now()) / DAY);
  if (d === 0) return 'oggi';
  if (d === 1) return 'domani';
  if (d === -1) return 'ieri';
  if (d > 1) return 'tra ' + human(d);
  const n = -d;
  return human(n) + ' fa';
}

function human(days) {
  if (days < 7) return days + ' giorni';
  if (days < 31) { const w = Math.round(days / 7); return w + (w === 1 ? ' settimana' : ' settimane'); }
  if (days < 365) { const m = Math.round(days / 30); return m + (m === 1 ? ' mese' : ' mesi'); }
  const y = Math.round(days / 365);
  return y + (y === 1 ? ' anno' : ' anni');
}

/* ---------------- utilità ---------------- */

const $ = sel => document.querySelector(sel);

function show(sel, on) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.classList.toggle('hidden', !on);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  show(el, true);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => show(el, false), 2600);
}

function updateSyncInfo() {
  const el = $('#syncInfo');
  if (!el) return;
  if (!S.lastSync) { el.textContent = ''; return; }
  const min = Math.round((Date.now() - S.lastSync) / 60e3);
  el.textContent = min < 1 ? 'aggiornato ora'
    : min < 60 ? `aggiornato ${min} min fa`
    : 'aggiornato ' + when(S.lastSync);
}

/* ---------------- impostazioni ---------------- */

function openSettings() {
  const st = S.settings;
  $('#sPause').value = st.pauseDays;   $('#vPause').textContent = st.pauseDays;
  $('#sHot').value = st.hotDays;       $('#vHot').textContent = st.hotDays;
  $('#sAbandon').value = st.abandonDays; $('#vAbandon').textContent = st.abandonDays;
  $('#sReturn').value = st.returnDays; $('#vReturn').textContent = st.returnDays;
  $('#sEnTitles').checked = st.enTitles !== false;
  $('#sDropped').checked = st.showDropped;
  $('#sAutoRefresh').checked = st.autoRefresh;
  show('#settings', true);
}

function logout(msg) {
  S = { token: null, act: null, lib: {}, meta: {}, cal: {}, calAt: 0, det: {},
        nuove: [], nascoste: S.nascoste || {}, lastSync: 0, settings: S.settings };
  save();
  show('#app', false);
  show('#settings', false);
  show('#login', true);
  if (msg) loginError(msg);
}

// Le sezioni restano come le hai lasciate l'ultima volta.
const APERTE_INIZIALI = {
  secSoon: true, secNuove: true,
  secWaiting: false, secPaused: false, secStart: false, secArchive: false
};

function applicaSezioni() {
  const scelte = S.settings.aperte || APERTE_INIZIALI;
  for (const sez of document.querySelectorAll('.collapsible')) {
    if (scelte[sez.id] === undefined) continue;
    sez.classList.toggle('closed', !scelte[sez.id]);
  }
}

/* ---------------- avvio ---------------- */

function wire() {
  $('#btnLogin').onclick = startPin;
  $('#btnCancelPin').onclick = stopPin;
  $('#btnSync').onclick = () => sync();
  $('#btnSettings').onclick = openSettings;
  $('#btnCloseSettings').onclick = () => show('#settings', false);
  $('#settings').onclick = ev => { if (ev.target.id === 'settings') show('#settings', false); };

  $('#search').oninput = ev => {
    ui.search = ev.target.value;
    if (!ui.search.trim()) applicaSezioni();   // finita la ricerca, le sezioni tornano come le tenevi
    render();
  };

  $('#typeChips').onclick = ev => {
    const b = ev.target.closest('.chip');
    if (!b) return;
    for (const c of $('#typeChips').children) c.classList.toggle('on', c === b);
    S.settings.type = b.dataset.type;
    save(); render();
  };

  $('#sort').onchange = ev => { S.settings.sort = ev.target.value; save(); render(); };

  $('#nav').onclick = ev => {
    const b = ev.target.closest('.nav-item');
    if (b) cambiaVista(b.dataset.vista);
  };

  $('#sPause').oninput = ev => {
    S.settings.pauseDays = +ev.target.value;
    $('#vPause').textContent = ev.target.value;
    save(); render();
  };
  $('#sHot').oninput = ev => {
    S.settings.hotDays = +ev.target.value;
    $('#vHot').textContent = ev.target.value;
    save(); render();
  };
  $('#sAbandon').oninput = ev => {
    S.settings.abandonDays = +ev.target.value;
    $('#vAbandon').textContent = ev.target.value;
    save(); render();
  };
  $('#sReturn').oninput = ev => {
    S.settings.returnDays = +ev.target.value;
    $('#vReturn').textContent = ev.target.value;
    save(); render();
  };
  $('#sEnTitles').onchange = ev => { S.settings.enTitles = ev.target.checked; save(); render(); };
  $('#sDropped').onchange = ev => { S.settings.showDropped = ev.target.checked; save(); render(); };
  $('#sAutoRefresh').onchange = ev => { S.settings.autoRefresh = ev.target.checked; save(); scheduleRefresh(); };

  $('#btnFullSync').onclick = () => { show('#settings', false); sync({ full: true }); };
  $('#btnLogout').onclick = () => { if (confirm('Scollegare l\'account Simkl da questa dashboard?')) logout(); };
  $('#btnExport').onclick = exportSettings;

  for (const h of document.querySelectorAll('.block-title.toggle')) {
    h.onclick = () => {
      const sez = h.closest('.collapsible');
      sez.classList.toggle('closed');
      if (!S.settings.aperte) S.settings.aperte = {};
      S.settings.aperte[sez.id] = !sez.classList.contains('closed');
      save();
    };
  }

  /* Scorciatoie: "/" porta nella ricerca, Esc la svuota. */
  document.addEventListener('keydown', ev => {
    const dentroUnCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
    if (ev.key === '/' && !dentroUnCampo && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      $('#search').focus();
      $('#search').select();
    } else if (ev.key === 'Escape') {
      if (!$('#settings').classList.contains('hidden')) return show('#settings', false);
      if (ui.search) {
        $('#search').value = '';
        ui.search = '';
        applicaSezioni();
        render();
        $('#search').blur();
      }
    }
  });

  // aggiorno quando torno sulla scheda, non con un timer cieco in sottofondo
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !S.token) return;
    updateSyncInfo();
    if (S.settings.autoRefresh && Date.now() - S.lastSync > CFG.autoRefreshMs) sync();
  });
}

function scheduleRefresh() {
  clearInterval(ui.refreshTimer);
  if (!S.settings.autoRefresh) return;
  ui.refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && S.token) sync();
  }, CFG.autoRefreshMs);
}

function exportSettings() {
  const blob = new Blob([JSON.stringify({ settings: S.settings, meta: S.meta }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dashboard-serie-impostazioni.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function boot() {
  if (!S.token) {
    show('#login', true);
    show('#app', false);
    return;
  }
  show('#login', false);
  show('#app', true);
  applicaSezioni();

  if (Object.keys(S.lib).length) { await refreshCalendar(); render(); }
  updateSyncInfo();

  $('#sort').value = S.settings.sort;
  for (const b of document.querySelectorAll('.nav-item')) {
    b.classList.toggle('on', b.dataset.vista === (S.settings.vista || 'tutto'));
  }
  for (const c of $('#typeChips').children) c.classList.toggle('on', c.dataset.type === S.settings.type);

  await sync();
  scheduleRefresh();
}

load();
wire();
boot();

// In locale il service worker serve solo a restituire file vecchi mentre lavoriamo:
// lo attivo unicamente sul sito vero, dove serve a far aprire la pagina senza rete.
const inLocale = ['localhost', '127.0.0.1', ''].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !inLocale) {
  // updateViaCache:'none' — il service worker stesso non deve mai arrivare dalla cache
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}
