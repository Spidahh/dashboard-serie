/* ================================================================
   Stato — la configurazione, quello che sappiamo, e il salvataggio
   ================================================================

   Tutto quello che il sito ricorda sta qui dentro e finisce in un'unica
   voce di localStorage. Non c'è nessun server: se svuoti la memoria del
   browser, riparti dal collegamento.
*/

'use strict';

const CFG = {
  clientId: 'ee08e3adabdcf5b669ded35b6d2c3f291c29a8e7233ccb41408f34977dab420b',
  appName: 'dashboard-serie',
  appVersion: '2.0',
  api: 'https://api.simkl.com',
  calendar: 'https://data.simkl.in/calendar',
  img: 'https://wsrv.nl/?url=https://simkl.in/posters/',
  storeKey: 'dashboard-serie-v1',

  /* Seconda sorgente: AniList. Copre solo gli anime, ma entra senza server
     perché il suo login non richiede nessun segreto, e in più è l'unico che
     sa quali sono i seguiti veri di una serie invece di farmeli indovinare.
     Il client_id si crea in due minuti su https://anilist.co/settings/developer
     mettendo come indirizzo di ritorno questo stesso sito. */
  anilist: {
    clientId: '',                                   // <-- da riempire
    api: 'https://graphql.anilist.co',
    auth: 'https://anilist.co/api/v2/oauth/authorize'
  },

  /* Terza sorgente: Trakt. È l'unica che ha bisogno di un pezzetto di server,
     perché consegna il token solo dietro un segreto, e un segreto in una pagina
     web non ci può stare. Il file worker/trakt-token.js spiega come metterlo su.
     Senza questi due valori il pulsante non compare. */
  trakt: {
    clientId: '',                                   // <-- da riempire
    worker: '',                                     // <-- indirizzo del Worker
    api: 'https://api.trakt.tv'
  },

  calendarTtl: 5 * 3600e3,      // il CDN di Simkl tiene il calendario 5 ore
  autoRefreshMs: 15 * 60e3      // limite consigliato da Simkl: 15-30 minuti
};

const DAY = 864e5;

/* I tre spazi. Ognuno ha la sua pagina, il suo menù e i suoi conti, e non si
   mescolano mai: è il punto di tutta la riorganizzazione. Il "tipo" è la stessa
   parola che usano le API, così non devo tradurre avanti e indietro. */
const SPAZI = {
  anime:  { tipo: 'anime',  pagina: 'anime.html', eti: 'nav.anime', serie: true  },
  serie:  { tipo: 'shows',  pagina: 'serie.html', eti: 'nav.serie', serie: true  },
  film:   { tipo: 'movies', pagina: 'film.html',  eti: 'nav.film',  serie: false }
};

const DEFAULTS = {
  lingua: null,        // null = decide il browser la prima volta
  pauseDays: 60,
  returnDays: 45,
  hotDays: 90,
  abandonDays: 365,
  showDropped: true,
  enTitles: true,
  autoRefresh: true,
  aperte: {},          // quali sezioni tieni aperte, per id
  vista: {},           // per spazio: 'tutto' oppure una sola sezione
  sort: {}             // per spazio: come ordinare
};

let S = {
  token: null,
  act: null,        // ultimo /sync/activities salvato
  lib: {},          // "shows:1648964" -> voce, nella forma comune a tutte le fonti
  meta: {},         // "shows:1648964" -> { prevTotal, growthAt, override }
  cal: {},          // "sk:1648964"    -> { t, season, episode }
  calAt: 0,
  det: {},          // "shows:1648964" -> { status, lastAired, enTitle, at }
  al: { token: null, user: null },
  tk: { token: null, refresh: null, scade: 0 },
  seguiti: [],      // seguiti che esistono già e non hai in lista
  nuove: [],        // stagioni nuove che stanno uscendo e che non hai in lista
  simili: [],       // consigliate da chi ha visto le stesse cose che hai visto tu
  novita: [],       // appena uscite, che non hai in lista
  consigliAt: 0,
  nascoste: {},     // id -> true, segnalazioni tolte a mano
  lastSync: 0,
  settings: { ...DEFAULTS }
};

let ui = { search: '', busy: false, pinTimer: null, refreshTimer: null };

/* ---------------- salvataggio locale ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(CFG.storeKey);
    if (raw) {
      const saved = JSON.parse(raw);
      S = { ...S, ...saved, settings: { ...DEFAULTS, ...(saved.settings || {}) } };
    }
  } catch (e) {
    console.warn('Dati locali illeggibili, riparto da zero.', e);
  }
  /* Chi arriva dalla versione a pagina sola aveva sort e vista come stringhe,
     adesso sono uno per spazio. Se trovo la roba vecchia la converto invece di
     buttarla: erano scelte sue. */
  for (const campo of ['sort', 'vista']) {
    if (typeof S.settings[campo] === 'string') {
      const vecchio = S.settings[campo];
      S.settings[campo] = {};
      for (const k of Object.keys(SPAZI)) S.settings[campo][k] = vecchio;
    }
    if (!S.settings[campo] || typeof S.settings[campo] !== 'object') S.settings[campo] = {};
  }
  if (!S.settings.aperte || typeof S.settings.aperte !== 'object') S.settings.aperte = {};
  impostaLingua(linguaIniziale(S.settings.lingua));
}

function save() {
  try {
    localStorage.setItem(CFG.storeKey, JSON.stringify(S));
    return;
  } catch (e) {
    console.warn('Spazio locale esaurito, butto via a partire dal meno importante.', e);
  }

  /* In ordine di sacrificabilità. I consigli si rifanno da soli una volta a
     settimana, il calendario ogni 5 ore: buttarli non costa niente. Le schede
     costano una chiamata a testa e sono l'ultima cosa da mollare. La libreria
     non si tocca mai: senza quella la pagina è vuota. */
  const sacrifici = [
    ['consigli',   () => { S.simili = []; S.novita = []; S.nuove = []; S.seguiti = []; S.consigliAt = 0; }],
    ['calendario', () => { S.cal = {}; S.calAt = 0; }],
    ['schede',     () => { S.det = {}; }]
  ];
  for (const [cosa, butta] of sacrifici) {
    butta();
    try {
      localStorage.setItem(CFG.storeKey, JSON.stringify(S));
      console.warn('Salvato dopo aver svuotato:', cosa);
      return;
    } catch (_) { /* non basta ancora */ }
  }
  console.warn('Non riesco a salvare nemmeno la sola libreria: lo spazio del browser è pieno.');
}

/* ---------------- chi è collegato ---------------- */

const alDisponibile = () => !!CFG.anilist.clientId;
const alCollegato   = () => !!(S.al && S.al.token);
const tkDisponibile = () => !!(CFG.trakt.clientId && CFG.trakt.worker);
const tkCollegato   = () => !!(S.tk && S.tk.token);
const collegato     = () => !!S.token || alCollegato() || tkCollegato();

/* I servizi, in un elenco solo: le impostazioni e la home disegnano da qui
   invece di ripetere tre volte lo stesso pezzo di pagina. */
const SERVIZI = [
  { id: 'simkl',   nome: 'Simkl',   nota: 'coll.simklNota',   disponibile: () => true,          collegato: () => !!S.token },
  { id: 'trakt',   nome: 'Trakt',   nota: 'coll.traktNota',   disponibile: tkDisponibile,       collegato: tkCollegato },
  { id: 'anilist', nome: 'AniList', nota: 'coll.anilistNota', disponibile: alDisponibile,       collegato: alCollegato }
];

/* ---------------- utilità comuni ---------------- */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = sel => document.querySelector(sel);
const pad = n => String(n).padStart(2, '0');

function show(sel, on) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.classList.toggle('hidden', !on);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Simkl restituisce i titoli con i caratteri speciali codificati:
   "Howl&#039;s Moving Castle". Il textarea scollegato dal documento è il modo
   sicuro: quello che ci finisce dentro viene letto come testo, mai eseguito. */
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

/* Titolo ridotto all'osso: niente maiuscole, niente punteggiatura. Serve a
   riconoscere lo stesso titolo arrivato da due servizi diversi. Tenuto in
   memoria perché viene ricalcolato a ogni tasto premuto, su tutta la libreria. */
const memoNorm = new Map();
function normalizza(txt) {
  if (!txt) return '';
  const gia = memoNorm.get(txt);
  if (gia !== undefined) return gia;
  const n = decodifica(txt).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  memoNorm.set(txt, n);
  return n;
}

/* Il titolo da mostrare. Simkl manda il romanizzato ("Kenpuu Denki Berserk"),
   quello ufficiale in inglese sta solo nella scheda: lo prendo da lì. */
function titolo(key, e) {
  if (S.settings.enTitles !== false) {
    const en = S.det[key]?.enTitle;
    if (en) return decodifica(en);
  }
  return decodifica(e.show?.title) || '(senza titolo)';
}

/* Le forme sotto cui lo stesso titolo può presentarsi. Simkl manda il
   romanizzato, AniList e Trakt l'inglese: confrontare solo il nome mostrato
   faceva sfuggire i doppioni ogni volta che due servizi sceglievano lingue
   diverse. Il tipo entra nella chiave, perché un anime e un film omonimi non
   sono la stessa cosa. */
function chiaviTitolo(key, e) {
  const out = [];
  for (const forma of [S.det[key]?.enTitle, e.show?.title, e._altTitolo]) {
    const n = normalizza(forma);
    if (n) out.push(e._type + '|' + n);
  }
  return out;
}

/* Quello che hai già, per non proportelo come novità.
   Gli id valgono solo per Simkl: quelli di AniList e Trakt sono numerazioni
   diverse e possono coincidere per puro caso. Per le altre fonti il confronto
   giusto è sul titolo. */
function giaInLibreria() {
  const ids = new Set(), titoli = new Set();
  for (const [k, e] of Object.entries(S.lib)) {
    if (!e._fonte) ids.add(String(e._id));
    for (const c of chiaviTitolo(k, e)) titoli.add(c);
  }
  return {
    ids, titoli,
    ha: (id, tipo, nome) => ids.has(String(id)) || titoli.has(tipo + '|' + normalizza(nome))
  };
}

// La ricerca deve funzionare con tutti i nomi che un titolo ha.
function cercabile(key, e) {
  return [S.det[key]?.enTitle, e.show?.title, e._altTitolo].map(decodifica).join(' ').toLowerCase();
}

/* ---------------- date in parole ---------------- */

// il parametro NON si può chiamare t: quello è il nome della funzione delle traduzioni
function when(quando) {
  const d = Math.round((quando - Date.now()) / DAY);
  if (d === 0) return t('data.oggi');
  if (d === 1) return t('data.domani');
  if (d === -1) return t('data.ieri');
  return d > 1 ? t('data.tra', { x: human(d) }) : t('data.fa', { x: human(-d) });
}

function human(days) {
  if (days < 7) return t('data.giorni', { n: days });
  if (days < 31) { const n = Math.round(days / 7); return t(n === 1 ? 'data.settimana' : 'data.settimane', { n }); }
  if (days < 365) { const n = Math.round(days / 30); return t(n === 1 ? 'data.mese' : 'data.mesi', { n }); }
  const n = Math.round(days / 365);
  return t(n === 1 ? 'data.anno' : 'data.anni', { n });
}
