/* ================================================================
   Fonti — da dove arrivano i dati, e come diventano tutti uguali
   ================================================================

   Simkl, Trakt e AniList parlano tre lingue diverse. Qui dentro le voci di
   tutti e tre vengono tradotte nella stessa forma, così il resto del sito
   non sa nemmeno da dove sono arrivate.

   La forma comune di una voce:
     _fonte    undefined per Simkl, 'anilist', 'trakt'
     _type     'shows' | 'anime' | 'movies'
     _id       l'id sul servizio di provenienza
     status    watching | hold | completed | dropped | plantowatch
     e i contatori degli episodi, che per i film restano a zero.
*/

'use strict';

/* ---------------- chiamate a Simkl ---------------- */

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

/* ---------------- collegamento Simkl (flusso PIN) ---------------- */

async function startPin(alPronto) {
  let init;
  try {
    init = await api('/oauth/pin', {}, { auth: false });
  } catch (e) {
    throw erroreUtente(t('err.noSimkl', { x: e.message }));
  }
  if (!init || init.result !== 'OK' || !init.user_code) throw erroreUtente(t('err.noCodice'));

  const scadenza = Date.now() + (init.expires_in || 900) * 1000;
  const ogni = (init.interval || 5) * 1000;

  clearInterval(ui.pinTimer);
  ui.pinTimer = setInterval(async () => {
    if (Date.now() > scadenza) { stopPin(); return alPronto(erroreUtente(t('coll.scaduto'))); }
    try {
      const r = await api('/oauth/pin/' + encodeURIComponent(init.user_code), {}, { auth: false });
      // Se il codice è già stato consumato Simkl ne restituisce uno nuovo: non è un token.
      if (r && r.result === 'OK' && r.access_token) {
        stopPin();
        S.token = r.access_token;
        S.act = null;
        for (const k of Object.keys(S.lib)) if (!S.lib[k]._fonte) delete S.lib[k];
        save();
        alPronto(null);
      }
    } catch (e) {
      console.warn('Attesa PIN:', e.message);
    }
  }, ogni);

  return { codice: init.user_code, url: init.verification_url || init.verification_uri || 'https://simkl.com/pin' };
}

function stopPin() {
  clearInterval(ui.pinTimer);
  ui.pinTimer = null;
}

/* ---------------- sincronizzazione ---------------- */

/*
   Regole imposte da Simkl, rispettate qui alla lettera:
   - fase 1 (primo avvio): una chiamata per tipo, in sequenza, senza date_from;
   - fase 2 (sempre dopo): prima /sync/activities, e solo se qualcosa è cambiato
     una sola chiamata combinata con date_from.
*/
const TIPI_SIMKL = ['shows', 'anime', 'movies'];

async function sync({ full = false, quando } = {}) {
  if (ui.busy) return;
  ui.busy = true;

  try {
    /* Dentro al try, non prima: 'inizio' fa ridisegnare la pagina, e se il
       disegno inciampa fuori di qui ui.busy resta acceso per sempre e non si
       sincronizza piu' niente fino a che non ricarichi. */
    quando?.('inizio');
    // senza Simkl restano le altre fonti: giro più corto
    if (!S.token) {
      await syncAniList();
      await syncTrakt();
      await refreshCalendar({ force: true });
      S.lastSync = Date.now();
      save();
      quando?.('disegna');
      refreshConsigli().then(() => quando?.('disegna'));
      return t('msg.aggiornato');
    }

    const act = await api('/sync/activities');
    const prev = S.act;
    const first = full || !prev || !prev.all || Object.keys(S.lib).length === 0
                  || S.syncVer !== SYNC_VER;

    if (!first && act && act.all && act.all === prev.all) {
      S.lastSync = Date.now();
      save();
      await refreshCalendar();
      await syncAniList();
      await syncTrakt();
      await refreshDetails(chiaviDaApprofondire(), quando);
      quando?.('disegna');
      completaTitoli(quando);
      refreshConsigli().then(() => quando?.('disegna'));
      return t('msg.giaAggiornato');
    }

    if (first) {
      // fase 1 — libreria completa, un tipo alla volta
      for (const tipo of TIPI_SIMKL) {
        const res = await api(`/sync/all-items/${tipo}/all`, { next_watch_info: 'yes' });
        merge(res);
      }
    } else {
      // fase 2 — solo il delta, tutti i tipi in una chiamata sola
      const res = await api('/sync/all-items', { date_from: prev.all, next_watch_info: 'yes' });
      merge(res);

      // se qualcosa è stato tolto dalle liste, riallineo gli id
      const tolto = ['tv_shows', 'anime', 'movies']
        .some(k => (prev?.[k]?.removed_from_list ?? null) !== (act?.[k]?.removed_from_list ?? null));
      if (tolto) await reconcile();
    }

    S.act = act;
    if (first) S.syncVer = SYNC_VER;      // giro completo fatto: non lo rifaccio piu'
    S.lastSync = Date.now();
    save();

    await syncAniList();
    await syncTrakt();
    await refreshCalendar({ force: true });
    quando?.('disegna');                        // disegno subito con quello che ho
    await refreshDetails(chiaviDaApprofondire(), quando);
    quando?.('disegna');                        // e ridisegno quando so quali serie sono vive
    completaTitoli(quando);                     // e intanto, in sottofondo, sistemo i titoli
    refreshConsigli().then(() => quando?.('disegna'));
    return t(first ? 'msg.scaricata' : 'msg.aggiornato');

  } finally {
    ui.busy = false;
    quando?.('fine');
  }
}

function merge(res) {
  if (!res) return;
  const adesso = new Date().toISOString();

  for (const tipo of TIPI_SIMKL) {
    for (const e of res[tipo] || []) {
      // le serie stanno sotto "show", i film sotto "movie": stessa forma, nome diverso
      const scheda = e.show || e.movie;
      const id = scheda?.ids?.simkl;
      if (!id) continue;
      const key = tipo + ':' + id;

      const m = S.meta[key] || (S.meta[key] = {});
      const totale = e.total_episodes_count || 0;
      // il totale che cresce = stagione nuova annunciata o uscita
      if (tipo !== 'movies' && m.prevTotal != null && totale > m.prevTotal) m.growthAt = adesso;
      m.prevTotal = totale;

      e._type = tipo;
      e._id = id;
      e.show = scheda;                        // dentro al sito si chiama sempre "show"
      delete e.movie;                         // era lo stesso oggetto due volte, salvato due volte
      S.lib[key] = e;
    }
  }
}

// Toglie dalla libreria locale i titoli che hai rimosso dalle liste.
async function reconcile() {
  const vivi = new Set();
  for (const tipo of TIPI_SIMKL) {
    const res = await api(`/sync/all-items/${tipo}/all`, { extended: 'simkl_ids_only' });
    for (const e of res?.[tipo] || []) {
      const id = (e.show || e.movie)?.ids?.simkl;
      if (id) vivi.add(tipo + ':' + id);
    }
  }
  if (!vivi.size) return;
  for (const key of Object.keys(S.lib)) {
    if (S.lib[key]._fonte) continue;                    // le altre fonti si riallineano da sole
    if (!vivi.has(key)) { delete S.lib[key]; delete S.meta[key]; }
  }
}

/* ---------------- calendario (file pubblico su CDN, non consuma quota) ---------------- */

// Gli id di servizi diversi possono coincidere: nel calendario vanno tenuti separati.
const chiaveCal = e => (e._fonte === 'anilist' ? 'al:' : e._fonte === 'trakt' ? 'tk:' : 'sk:') + e._id;

/* La "radice" di un titolo: quello che resta togliendo sottotitolo, parole di
   stagione e numeri. Serve sia a riconoscere una stagione nuova, sia a cercare
   i seguiti. Gli ordinali ("2nd Season") li tolgo apposta: senza, "7SEEDS" e
   "7SEEDS 2nd Season" risultavano due serie diverse, ed era proprio il caso che
   faceva sfuggire il seguito. */
function radice(titoloGrezzo) {
  let x = decodifica(titoloGrezzo || '').toLowerCase();
  x = x.split(/:| - |–|—/)[0];                                     // taglio al primo sottotitolo
  x = x.replace(/\b(season|stagione|part|parte|cour|final|movie|special|ova|ona|tv|series)\b.*$/, '');
  x = x.replace(/\s+\d+\s*(st|nd|rd|th)\b.*$/, '');                // "2nd", "3rd"
  x = x.replace(/\s+(\d+|[ivx]+)\s*$/, '');                        // numero o numero romano finale
  x = x.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return x;
}

const CAL_VER = 4;   // sale quando cambia cosa ricavo dal calendario, così la cache si rifà

async function refreshCalendar({ force = false } = {}) {
  const aggiornato = Date.now() - S.calAt < CFG.calendarTtl && Object.keys(S.cal).length && S.calVer === CAL_VER;
  if (!force && aggiornato) return;

  const mie = new Set(Object.values(S.lib).filter(e => !e._fonte).map(e => String(e._id)));
  const gia = giaInLibreria();

  /* Le radici di quello che hai già. Ma una stagione nuova ha senso proporla
     solo se con quella serie sei in buoni rapporti: se ne hai mollata una a
     metà, consigliarti la successiva è inutile. */
  const buone = new Map(), mollate = new Set();
  for (const [k, e] of Object.entries(S.lib)) {
    if (e._type === 'movies') continue;
    const arretrati = (e.total_episodes_count || 0) - (e.not_aired_episodes_count || 0) - (e.watched_episodes_count || 0);
    const visti = e.watched_episodes_count || 0;
    const promossa = e.status === 'completed' || ((e.status === 'watching' || e.status === 'hold') && visti > 0);
    const abbandonataAMeta = e.status === 'dropped' && arretrati > 0;

    for (const r of [radice(titolo(k, e)), radice(e.show?.title)]) {
      if (r.length < 5) continue;
      if (abbandonataAMeta) mollate.add(r);
      if (promossa && !buone.has(r)) buone.set(r, titolo(k, e));
    }
  }
  const radici = new Map([...buone].filter(([r]) => !mollate.has(r)));

  const out = {};
  const trovate = new Map();
  const pavimento = Date.now() - 2 * DAY;

  for (const [file, tipo] of [['tv', 'shows'], ['anime', 'anime']]) {
    try {
      const res = await fetch(`${CFG.calendar}/${file}.json`);
      if (!res.ok) continue;
      const arr = await res.json();

      for (const x of arr) {
        const id = x?.ids?.simkl_id;
        if (!id) continue;
        const quando = Date.parse(x.date);
        if (!isFinite(quando) || quando < pavimento) continue;

        if (mie.has(String(id))) {                      // ce l'hai: mi serve solo la data
          const ck = 'sk:' + id;
          const cur = out[ck];
          if (!cur || quando < cur.t) {
            out[ck] = { t: quando, season: x.episode?.season ?? null, episode: x.episode?.episode ?? null };
          }
          continue;
        }

        if (gia.titoli.has(tipo + '|' + normalizza(x.title))) continue;   // ce l'hai su un altro servizio

        const r = radice(x.title);                      // non ce l'hai: è roba che segui?
        if (r.length < 5 || !radici.has(r)) continue;
        const prima = trovate.get(id);
        if (!prima || quando < prima.t) {
          trovate.set(id, {
            id, tipo, t: quando,
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

  for (const [k, v] of Object.entries(S.cal)) if (k.startsWith('al:') || k.startsWith('tk:')) out[k] = v;
  S.cal = out;
  S.nuove = [...trovate.values()].sort((a, b) => a.t - b.t).slice(0, 60);
  S.calVer = CAL_VER;
  S.calAt = Date.now();
  save();
}

/* ---------------- schede: è ancora viva? quando è uscita? ---------------- */

const STATO_CALDO = new Set(['airing', 'ongoing', 'continuing', 'returning series', 'in production', 'upcoming', 'tba']);
const STATO_FREDDO = new Set(['ended', 'canceled', 'cancelled', 'released', 'finished']);

// true = ancora viva · false = ferma da un pezzo · null = non lo so ancora
function serieCalda(det, adesso, finestra) {
  if (!det) return null;
  const s = (det.status || '').toLowerCase();
  if (STATO_CALDO.has(s)) return true;
  const quando = det.lastAired ? Date.parse(det.lastAired) : null;
  if (quando && adesso - quando <= finestra) return true;
  if (STATO_FREDDO.has(s) || quando) return false;
  return null;
}

function schedaScaduta(det, adesso) {
  if (!det) return true;
  if (det.enTitle === undefined) return true;      // scheda vecchia, senza il titolo inglese
  const viva = STATO_CALDO.has((det.status || '').toLowerCase());
  return adesso - (det.at || 0) > (viva ? 3 * DAY : 60 * DAY);
}

/* La scheda serve solo dove c'è una scelta da fare: le serie con episodi
   arretrati, e i film di quest'anno o del prossimo, dove non so ancora se sono
   già usciti o no. Per tutto il resto la scheda serve solo al titolo, e quella
   arriva dopo in sottofondo. */
function chiaviDaApprofondire() {
  const out = [];
  const annoOra = new Date().getFullYear();
  for (const [key, e] of Object.entries(S.lib)) {
    if (e._fonte) continue;                                 // le schede sono di Simkl
    if (e._type === 'movies') {
      if ((e.show?.year || 0) >= annoOra - 1) out.push(key);
      continue;
    }
    if (e.status === 'plantowatch') continue;
    const arretrati = (e.total_episodes_count || 0) - (e.not_aired_episodes_count || 0) - (e.watched_episodes_count || 0);
    if (arretrati >= 1) out.push(key);
  }
  return out;
}

async function scaricaScheda(key) {
  const e = S.lib[key];
  if (!e) return;
  const percorso = e._type === 'anime' ? 'anime' : e._type === 'movies' ? 'movies' : 'tv';
  try {
    const d = await api(`/${percorso}/${e._id}`, {}, { auth: false });
    S.det[key] = {
      status: d?.status ?? null,
      lastAired: d?.last_aired ?? null,
      released: d?.released ?? null,               // solo i film
      enTitle: d?.en_title || null,
      at: Date.now()
    };
  } catch (err) {
    S.det[key] = { status: null, lastAired: null, released: null, enTitle: null, at: Date.now() };
  }
  /* 3 al secondo. Il limite di Simkl è 10, ma vale per client_id, non per
     persona: se il sito lo usano in tanti, i primi avvii si sommano. */
  await sleep(330);
}

// Fase 1: le schede che servono a decidere dove va un titolo. Blocca il disegno.
async function refreshDetails(chiavi, quando) {
  const adesso = Date.now();
  const todo = chiavi.filter(k => schedaScaduta(S.det[k], adesso)).slice(0, 400);
  if (!todo.length) return;

  let n = 0;
  for (const key of todo) {
    await scaricaScheda(key);
    if (++n % 10 === 0) { quando?.('avanzamento', t('msg.schede', { a: n, b: todo.length })); save(); }
  }
  save();
}

/* Fase 2: le schede di tutto il resto, solo per avere i titoli giusti.
   Gira in sottofondo e non blocca niente: la pagina è già utilizzabile. */
let titoliInCorso = false;
async function completaTitoli(quando) {
  if (titoliInCorso) return;
  titoliInCorso = true;
  try {
    const mancanti = Object.keys(S.lib)
      .filter(k => !S.lib[k]._fonte)
      .filter(k => !S.det[k] || S.det[k].enTitle === undefined);
    let n = 0;
    for (const key of mancanti) {
      await scaricaScheda(key);
      if (++n % 25 === 0) {
        quando?.('avanzamento', t('msg.titoli', { a: n, b: mancanti.length }));
        save();
        if (n % 100 === 0) quando?.('disegna');   // ridisegnare tutto ogni 25 schede ingolfava la pagina
      }
    }
    if (n) { save(); quando?.('disegna'); quando?.('fine'); }
  } finally {
    titoliInCorso = false;
  }
}

/* ================================================================
   AniList — anime, e i seguiti veri
   ================================================================

   Entra senza server perché il suo login è l'"implicit grant": AniList
   rimanda qui il token dentro l'indirizzo, senza chiedere nessun segreto.

   E soprattutto: è l'unico dei tre che dichiara il legame fra una serie e il
   suo seguito. Sugli altri quel legame lo devo indovinare dal nome.
*/

const AL_STATI = {
  CURRENT: 'watching', REPEATING: 'watching', PLANNING: 'plantowatch',
  COMPLETED: 'completed', DROPPED: 'dropped', PAUSED: 'hold'
};

const AL_QUERY = `query($id:Int){
  MediaListCollection(userId:$id, type:ANIME){
    lists{ entries{
      progress status updatedAt
      media{
        id title{romaji english} episodes status
        endDate{year month day}
        nextAiringEpisode{episode airingAt}
        coverImage{large}
        relations{ edges{ relationType node{ id type title{romaji english} coverImage{large} startDate{year} } } }
      }
    } }
  }
}`;

function alLogin() {
  const id = CFG.anilist.clientId;
  if (!id) throw erroreUtente(t('err.anilistSpento'));
  location.href = `${CFG.anilist.auth}?client_id=${encodeURIComponent(id)}&response_type=token`;
}

// Al ritorno raccolgo il token e ripulisco l'indirizzo.
function alRaccogliToken() {
  if (!location.hash.includes('access_token')) return false;
  const p = new URLSearchParams(location.hash.slice(1));
  const tok = p.get('access_token');
  history.replaceState(null, '', location.pathname + location.search);
  if (!tok) return false;
  S.al = { token: tok, user: null };
  save();
  return true;
}

function alScollega() {
  S.al = { token: null, user: null };
  for (const k of Object.keys(S.lib)) if (S.lib[k]._fonte === 'anilist') delete S.lib[k];
  for (const k of Object.keys(S.cal)) if (k.startsWith('al:')) delete S.cal[k];
  save();
}

async function alChiedi(query, variables) {
  const res = await fetch(CFG.anilist.api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(S.al?.token ? { Authorization: 'Bearer ' + S.al.token } : {})
    },
    body: JSON.stringify({ query, variables })
  });
  if (res.status === 401 || res.status === 400) {
    const testo = await res.text();
    if (/invalid_token|unauthorized/i.test(testo)) throw new Error('AL_SCADUTO');
    throw new Error('AniList ' + res.status);
  }
  if (!res.ok) throw new Error('AniList ' + res.status);
  const d = await res.json();
  if (d.errors?.length) throw new Error(d.errors[0].message || 'AniList');
  return d.data;
}

async function syncAniList() {
  if (!alCollegato()) return;
  try {
    if (!S.al.user) {
      const d = await alChiedi('query{Viewer{id name}}');
      S.al.user = d?.Viewer || null;
      if (!S.al.user) return;
    }
    const d = await alChiedi(AL_QUERY, { id: S.al.user.id });
    const liste = d?.MediaListCollection?.lists || [];

    // riparto pulito: AniList manda sempre tutta la lista, non un delta
    for (const k of Object.keys(S.lib)) if (S.lib[k]._fonte === 'anilist') delete S.lib[k];

    const seguiti = [];
    for (const lista of liste) {
      for (const v of lista.entries || []) {
        alAggiungi(v);
        raccogliSeguitiAniList(v, seguiti);
      }
    }
    S.al.at = Date.now();
    S.al.seguiti = seguiti;                 // li filtro dopo, quando so cosa hai già
    save();

  } catch (err) {
    if (err.message === 'AL_SCADUTO') {
      S.al = { token: null, user: null };
      save();
      throw erroreUtente(t('msg.scadutoAl'));
    }
    console.warn('AniList:', err.message);
  }
}

/* Traduce una voce AniList nella forma comune. */
function alAggiungi(v) {
  const m = v.media;
  if (!m?.id) return false;

  const prossimo = m.nextAiringEpisode || null;
  // quanti episodi sono già usciti: se ne sta arrivando uno, tutti quelli prima
  const usciti = prossimo ? Math.max(0, prossimo.episode - 1) : (m.episodes || v.progress || 0);
  const totali = m.episodes || usciti;
  const visti = Math.min(v.progress || 0, totali || v.progress || 0);

  const key = 'al:' + m.id;
  const inOnda = m.status === 'RELEASING' || m.status === 'HIATUS';
  const fine = m.endDate?.year
    ? new Date(Date.UTC(m.endDate.year, (m.endDate.month || 1) - 1, m.endDate.day || 1)).toISOString()
    : null;

  S.lib[key] = {
    _fonte: 'anilist',
    _type: 'anime',
    _id: m.id,
    // AniList mostra l'inglese, Simkl manda il romanizzato: tengo da parte anche
    // quello, altrimenti lo stesso anime preso da tutti e due compare due volte.
    _altTitolo: m.title?.romaji || null,
    status: AL_STATI[v.status] || 'watching',
    watched_episodes_count: visti,
    total_episodes_count: totali,
    not_aired_episodes_count: Math.max(0, totali - usciti),
    last_watched_at: v.updatedAt ? new Date(v.updatedAt * 1000).toISOString() : null,
    last_watched: visti ? 'E' + visti : null,
    next_to_watch: visti < usciti ? 'E' + (visti + 1) : null,
    next_to_watch_info: visti < usciti ? { title: '', episode: visti + 1, date: null } : undefined,
    show: {
      title: m.title?.english || m.title?.romaji || '(senza titolo)',
      poster: m.coverImage?.large || null,
      ids: { simkl: m.id, slug: '' }
    }
  };

  /* AniList non ha una "scheda" come Simkl, ma dice la stessa cosa in altro modo:
     se è in onda, e quando è finita. L'ultima uscita la ricavo dal prossimo
     episodio meno una settimana, che per un anime settimanale è esatto. */
  S.det[key] = {
    status: inOnda ? 'airing' : (m.status === 'FINISHED' ? 'ended' : null),
    lastAired: prossimo ? new Date(prossimo.airingAt * 1000 - 7 * DAY).toISOString() : fine,
    released: null,
    enTitle: m.title?.english || null,
    at: Date.now()
  };

  if (prossimo) S.cal['al:' + m.id] = { t: prossimo.airingAt * 1000, season: null, episode: prossimo.episode };
  return true;
}

/* Il pezzo che risolve il caso "ho finito una serie e nessuno mi ha detto che
   esisteva il seguito". Qui il legame è dichiarato da AniList, non indovinato:
   SEQUEL vuol dire seguito, punto. Lo raccolgo solo per le serie che hai
   davvero finito o che stai guardando, perché consigliare il seguito di una
   roba che hai mollato non ha senso. */
function raccogliSeguitiAniList(v, dentro) {
  const stato = AL_STATI[v.status];
  if (stato !== 'completed' && stato !== 'watching') return;
  for (const arco of v.media?.relations?.edges || []) {
    if (arco.relationType !== 'SEQUEL') continue;
    const n = arco.node;
    if (!n?.id || n.type !== 'ANIME') continue;
    dentro.push({
      id: n.id, fonte: 'anilist', tipo: 'anime',
      title: n.title?.english || n.title?.romaji || '',
      altTitolo: n.title?.romaji || null,
      poster: n.coverImage?.large || null,
      anno: n.startDate?.year || null,
      da: v.media.title?.english || v.media.title?.romaji || ''
    });
  }
}

/* ================================================================
   Trakt — serie TV e film
   ================================================================

   Le chiamate ai dati partono dal browser: Trakt le accetta. L'unica cosa che
   non può passare di qui è lo scambio del token, che richiede il segreto: per
   quello c'è il Worker (vedi worker/trakt-token.js).

   Trakt non ha gli stati "in pausa" e "abbandonata". In compenso ha le serie
   nascoste dal progresso, che è la stessa cosa detta in altro modo.
*/

function tkIntestazioni() {
  return {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': CFG.trakt.clientId,
    ...(S.tk && S.tk.token ? { Authorization: 'Bearer ' + S.tk.token } : {})
  };
}

async function tkChiedi(percorso, params = {}) {
  const u = new URL(CFG.trakt.api + percorso);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: tkIntestazioni() });
  if (r.status === 401) throw new Error('TK_SCADUTO');
  if (!r.ok) throw new Error('Trakt ' + r.status);
  return r.json();
}

// Chiedo un codice. Questa chiamata non ha bisogno di segreti.
async function tkLogin(alPronto) {
  if (!tkDisponibile()) throw erroreUtente(t('err.traktSpento'));
  let init;
  try {
    const r = await fetch(CFG.trakt.api + '/oauth/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CFG.trakt.clientId })
    });
    init = await r.json();
  } catch (e) { throw erroreUtente(t('err.noTrakt')); }
  if (!init || !init.user_code) throw erroreUtente(t('err.noCodice'));

  const fine = Date.now() + (init.expires_in || 600) * 1000;
  const ogni = (init.interval || 5) * 1000;

  clearInterval(ui.pinTimer);
  ui.pinTimer = setInterval(async () => {
    if (Date.now() > fine) { stopPin(); return alPronto(erroreUtente(t('coll.scaduto'))); }
    try {
      const r = await fetch(CFG.trakt.worker, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: init.device_code })
      });
      if (r.status === 400) return;                 // non hai ancora confermato
      const d = await r.json();
      if (!d.access_token) return;
      stopPin();
      S.tk = { token: d.access_token, refresh: d.refresh_token || null,
               scade: Date.now() + (d.expires_in || 7 * 86400) * 1000 };
      save();
      alPronto(null);
    } catch (e) { /* riprovo al giro dopo */ }
  }, ogni);

  return { codice: init.user_code, url: init.verification_url || 'https://trakt.tv/activate' };
}

// Il token dura una settimana: lo rinnovo prima che scada.
async function tkRinnova() {
  if (!S.tk || !S.tk.refresh) return false;
  try {
    const r = await fetch(CFG.trakt.worker, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'rinnova', refresh_token: S.tk.refresh })
    });
    const d = await r.json();
    if (!d.access_token) return false;
    S.tk = { token: d.access_token, refresh: d.refresh_token || S.tk.refresh,
             scade: Date.now() + (d.expires_in || 7 * 86400) * 1000 };
    save();
    return true;
  } catch (e) { return false; }
}

function tkScollega() {
  S.tk = { token: null, refresh: null, scade: 0 };
  for (const k of Object.keys(S.lib)) if (S.lib[k]._fonte === 'trakt') delete S.lib[k];
  for (const k of Object.keys(S.cal)) if (k.startsWith('tk:')) delete S.cal[k];
  save();
}

async function syncTrakt({ giaRinnovato = false } = {}) {
  if (!tkCollegato()) return;
  if (S.tk.scade && Date.now() > S.tk.scade - DAY) await tkRinnova();

  try {
    const oggi = new Date().toISOString().slice(0, 10);
    const [viste, inLista, nascoste, calendario, filmVisti, filmInLista] = await Promise.all([
      tkChiedi('/sync/watched/shows', { extended: 'full' }),
      tkChiedi('/sync/watchlist/shows', { extended: 'full' }).catch(() => []),
      tkChiedi('/users/hidden/progress_watched', { type: 'show', limit: 500 }).catch(() => []),
      tkChiedi('/calendars/my/shows/' + oggi + '/33').catch(() => []),
      tkChiedi('/sync/watched/movies', { extended: 'full' }).catch(() => []),
      tkChiedi('/sync/watchlist/movies', { extended: 'full' }).catch(() => [])
    ]);

    for (const k of Object.keys(S.lib)) if (S.lib[k]._fonte === 'trakt') delete S.lib[k];

    const mollate = new Set((nascoste || []).map(x => x.show?.ids?.trakt).filter(Boolean));

    // il calendario dice quando esce il prossimo episodio di ogni serie
    const prossimi = new Map();
    for (const v of calendario || []) {
      const id = v.show?.ids?.trakt;
      const quando = Date.parse(v.first_aired);
      if (!id || !isFinite(quando)) continue;
      const prima = prossimi.get(id);
      if (!prima || quando < prima.t) {
        prossimi.set(id, { t: quando, episode: v.episode?.number ?? null, season: v.episode?.season ?? null });
      }
    }

    for (const v of viste || []) tkAggiungi(v, mollate, prossimi, false);
    for (const v of inLista || []) tkAggiungi(v, mollate, prossimi, true);
    for (const v of filmVisti || []) tkAggiungiFilm(v, false);
    for (const v of filmInLista || []) tkAggiungiFilm(v, true);

    S.tk.at = Date.now();
    save();

  } catch (err) {
    if (err.message === 'TK_SCADUTO') {
      /* Un solo tentativo di rinnovo. Se il token nuovo viene rifiutato di
         nuovo non ha senso insistere: prima si richiamava all'infinito. */
      if (!giaRinnovato && await tkRinnova()) return syncTrakt({ giaRinnovato: true });
      S.tk = { token: null, refresh: null, scade: 0 };
      save();
      throw erroreUtente(t('msg.scadutoTk'));
    }
    console.warn('Trakt:', err.message);
  }
}

function tkAggiungi(v, mollate, prossimi, daIniziare) {
  const sh = v.show;
  const id = sh?.ids?.trakt;
  if (!id) return;

  const key = 'tk:' + id;
  if (S.lib[key]) return;                      // già preso dalle viste

  // gli episodi visti si contano dalle stagioni, saltando gli speciali (stagione 0)
  let visti = 0;
  for (const st of v.seasons || []) {
    if ((st.number == null ? 0 : st.number) < 1) continue;
    visti += (st.episodes || []).length;
  }
  const usciti = sh.aired_episodes || visti;
  const inOnda = /returning|continuing|in production|planned|upcoming/i.test(sh.status || '');
  const prossimo = prossimi.get(id) || null;

  let stato;
  if (daIniziare) stato = 'plantowatch';
  else if (mollate.has(id)) stato = 'dropped';
  else if (visti >= usciti && !inOnda) stato = 'completed';
  else stato = 'watching';

  S.lib[key] = {
    _fonte: 'trakt',
    _type: 'shows',
    _id: id,
    status: stato,
    watched_episodes_count: visti,
    total_episodes_count: usciti,
    not_aired_episodes_count: 0,               // aired_episodes conta solo quelli usciti
    last_watched_at: v.last_watched_at || null,
    last_watched: visti ? 'E' + visti : null,
    next_to_watch: visti < usciti ? 'E' + (visti + 1) : null,
    next_to_watch_info: visti < usciti ? { title: '', episode: visti + 1, date: null } : undefined,
    show: {
      title: sh.title || '(senza titolo)',
      poster: null,                            // Trakt non manda immagini: resta il titolo
      year: sh.year || null,
      ids: { simkl: id, slug: sh.ids?.slug || '' }
    }
  };

  S.det[key] = {
    status: inOnda ? 'airing' : 'ended',
    lastAired: prossimo ? new Date(prossimo.t - 7 * DAY).toISOString() : (v.last_watched_at || null),
    released: null,
    enTitle: null,
    at: Date.now()
  };

  if (prossimo) S.cal['tk:' + id] = { t: prossimo.t, season: prossimo.season, episode: prossimo.episode };
}

function tkAggiungiFilm(v, daVedere) {
  const f = v.movie;
  const id = f?.ids?.trakt;
  if (!id) return;
  const key = 'tk:' + id;
  if (S.lib[key]) return;

  S.lib[key] = {
    _fonte: 'trakt',
    _type: 'movies',
    _id: id,
    status: daVedere ? 'plantowatch' : 'completed',
    watched_episodes_count: 0,
    total_episodes_count: 0,
    not_aired_episodes_count: 0,
    last_watched_at: v.last_watched_at || null,
    show: {
      title: f.title || '(senza titolo)',
      poster: null,
      year: f.year || null,
      ids: { simkl: id, slug: f.ids?.slug || '' }
    }
  };
  S.det[key] = { status: null, lastAired: null, released: f.released || null, enTitle: null, at: Date.now() };
}

/* ================================================================
   Cosa guardare dopo
   ================================================================

   Quattro fasce, in ordine di quanto probabilmente ti interessano:

   1. i SEGUITI di quello che hai finito. Questa è la novità, ed è nata da un
      caso preciso: 7 Seeds. Prima guardavo solo il calendario dei prossimi 33
      giorni, quindi trovavo una stagione nuova solo mentre stava andando in
      onda. Un seguito uscito nel 2020 non lo vedevo, e non lo avrei visto mai.
      Adesso i seguiti li cerco: su AniList col legame dichiarato, altrove
      cercando per radice del titolo.
   2. le stagioni nuove che stanno uscendo adesso (dal calendario).
   3. quello che guarda chi ha visto le stesse cose che hai visto tu.
   4. le serie appena partite.
*/

const CONSIGLI_TTL = 7 * DAY;

// I titoli da cui partire: quelli che hai amato di più, prima i voti alti.
function semiPerConsigli() {
  const semi = [];
  for (const [k, e] of Object.entries(S.lib)) {
    if (e._fonte) continue;                    // le schede dei consigli sono di Simkl
    if (e._type === 'movies') continue;
    if (e.status !== 'completed' && e.status !== 'watching') continue;
    if ((e.watched_episodes_count || 0) < 3) continue;
    const voto = e.user_rating || 0;
    const quando = e.last_watched_at ? Date.parse(e.last_watched_at) : 0;
    if (!voto && !quando) continue;
    semi.push({ k, e, punti: voto * 1e12 + quando });
  }
  semi.sort((a, b) => b.punti - a.punti);
  return semi.slice(0, 10);
}

/* I film da cui partire per i consigli: quelli che hai visto.
   Prima pretendevo che avessero un voto o una data di visione, ma su Simkl
   moltissimi film segnati come visti non hanno ne' l'uno ne' l'altra: il
   risultato era zero semi, quindi zero consigli. Adesso vanno bene tutti,
   e voto e data servono solo a decidere quali provare per primi. */
function semiFilm() {
  const semi = [];
  for (const [k, e] of Object.entries(S.lib)) {
    if (e._fonte || e._type !== 'movies') continue;
    if (e.status !== 'completed') continue;
    const voto = e.user_rating || 0;
    const quando = e.last_watched_at ? Date.parse(e.last_watched_at) : 0;
    semi.push({ k, e, punti: voto * 1e12 + quando });
  }
  semi.sort((a, b) => b.punti - a.punti);
  return semi.slice(0, 8);
}

async function refreshConsigli({ force = false } = {}) {
  if (!force && Date.now() - (S.consigliAt || 0) < CONSIGLI_TTL && (S.simili?.length || S.seguiti?.length)) return;
  if (!S.token) { fondiSeguitiAniList(); return; }

  const mie = giaInLibreria();
  const punteggi = new Map();
  const semi = semiPerConsigli();

  for (const seme of semi) {
    const percorso = seme.e._type === 'anime' ? 'anime' : 'tv';
    try {
      const d = await api(`/${percorso}/${seme.e._id}`, {}, { auth: false });
      let presi = 0;
      for (const r of d?.users_recommendations || []) {
        if (presi >= 4) break;        // un titolo solo non deve riempire tutta la lista
        const id = r.ids?.simkl;
        const tipo = r.type === 'anime' ? 'anime' : 'shows';
        if (!id || mie.ha(id, tipo, r.en_title || r.title)) continue;
        presi++;
        const perc = parseInt(String(r.users_percent || '0'), 10) || 0;
        const prima = punteggi.get(id);
        if (prima) { prima.punti += perc; prima.quante++; }
        else punteggi.set(id, {
          id, tipo,
          title: r.en_title || r.title, slug: r.ids?.slug || '',
          poster: r.poster || null, punti: perc, quante: 1,
          da: titolo(seme.k, seme.e), anno: r.year || null
        });
      }
    } catch (err) { /* un seme che non risponde non ferma gli altri */ }
    await sleep(200);
  }

  /* Anche i film hanno i loro consigli, presi allo stesso modo dalla scheda di
     quelli che hai visto. Senza questo pezzo lo spazio Film avrebbe avuto un
     "Da scoprire" perennemente vuoto. */
  for (const seme of semiFilm()) {
    try {
      const d = await api(`/movies/${seme.e._id}`, {}, { auth: false });
      let presi = 0;
      for (const r of d?.users_recommendations || []) {
        if (presi >= 4) break;
        const id = r.ids?.simkl;
        if (!id || mie.ha(id, 'movies', r.en_title || r.title)) continue;
        presi++;
        const perc = parseInt(String(r.users_percent || '0'), 10) || 0;
        const prima = punteggi.get(id);
        if (prima) { prima.punti += perc; prima.quante++; }
        else punteggi.set(id, {
          id, tipo: 'movies',
          title: r.en_title || r.title, slug: r.ids?.slug || '',
          poster: r.poster || null, punti: perc, quante: 1,
          da: titolo(seme.k, seme.e), anno: r.year || null
        });
      }
    } catch (err) { /* pazienza */ }
    await sleep(200);
  }

  /* Il taglio va fatto PER TIPO, non su tutto insieme. Prima tenevo i primi 40
     e basta: chi ha tante serie si ritrovava quaranta serie e zero film, quindi
     "Da scoprire" nello spazio Film restava vuoto anche avendo dei consigli. */
  const ordinati = [...punteggi.values()].sort((a, b) => b.quante - a.quante || b.punti - a.punti);
  const quanti = {};
  S.simili = ordinati.filter(x => {
    quanti[x.tipo] = (quanti[x.tipo] || 0) + 1;
    return quanti[x.tipo] <= 20;
  });

  await cercaSeguiti([...semi, ...semiFilm()], mie);

  // le appena uscite
  const novita = [];
  for (const [percorso, tipo] of [['tv', 'shows'], ['anime', 'anime']]) {
    try {
      const arr = await api(`/${percorso}/premieres/new`, {}, { auth: false });
      for (const x of arr || []) {
        const id = x.ids?.simkl_id ?? x.ids?.simkl;
        if (!id || mie.ha(id, tipo, x.title)) continue;
        const quando = Date.parse(x.date);
        novita.push({ id, tipo, title: x.title, slug: x.ids?.slug || '',
                      poster: x.poster || null, t: isFinite(quando) ? quando : null, anno: x.year || null });
      }
    } catch (err) { /* pazienza */ }
    await sleep(200);
  }
  novita.sort((a, b) => (b.t || 0) - (a.t || 0));
  S.novita = novita.slice(0, 30);

  S.consigliAt = Date.now();
  save();
}

/* I seguiti su Simkl vanno cercati, perché Simkl non dichiara il legame fra le
   stagioni. Cerco la radice del titolo e tengo quello che ha la stessa radice,
   non ce l'hai, ed è uscito dopo. È un confronto sui nomi: qualche accostamento
   storto ci sarà, e per quello su ogni segnalazione c'è "nascondi". */
async function cercaSeguiti(semi, mie) {
  const trovati = new Map();

  // prima quelli certi, dichiarati da AniList
  for (const s of S.al?.seguiti || []) {
    if (mie.ha(s.id, 'anime', s.title) || mie.titoli.has('anime|' + normalizza(s.altTitolo))) continue;
    trovati.set('al:' + s.id, { ...s, certo: true });
  }

  /* poi quelli cercati per nome. Vale anche per i film: "Dune: Part Two" e'
     il seguito di "Dune" esattamente come una seconda stagione lo e' della
     prima, e prima i film restavano fuori perche' i semi erano solo serie. */
  for (const seme of semi) {
    const r = radice(titolo(seme.k, seme.e));
    if (r.length < 5) continue;
    const percorso = seme.e._type === 'anime' ? 'anime' : seme.e._type === 'movies' ? 'movie' : 'tv';
    const annoSeme = seme.e.show?.year || 0;
    try {
      const arr = await api(`/search/${percorso}`, { q: r, limit: 12 }, { auth: false });
      let presi = 0;
      for (const x of arr || []) {
        if (presi >= 3) break;
        const id = x.ids?.simkl_id ?? x.ids?.simkl;
        const nome = x.en_title || x.title;
        if (!id || !nome) continue;
        if (radice(nome) !== r) continue;                       // non è la stessa serie
        if (normalizza(nome) === normalizza(titolo(seme.k, seme.e))) continue;   // è lei stessa
        if (mie.ha(id, seme.e._type, nome)) continue;           // ce l'hai già
        if (annoSeme && x.year && x.year < annoSeme) continue;  // è il prequel, non il seguito
        presi++;
        trovati.set('sk:' + id, {
          id, tipo: seme.e._type, title: nome, slug: x.ids?.slug || '',
          poster: x.poster || null, anno: x.year || null,
          da: titolo(seme.k, seme.e), certo: false
        });
      }
    } catch (err) { /* la ricerca che non risponde non ferma le altre */ }
    await sleep(200);
  }

  // prima i legami dichiarati, poi i più recenti
  S.seguiti = [...trovati.values()]
    .sort((a, b) => (b.certo ? 1 : 0) - (a.certo ? 1 : 0) || (b.anno || 0) - (a.anno || 0))
    .slice(0, 30);
}

// Senza Simkl restano i soli seguiti dichiarati da AniList, che non costano chiamate.
function fondiSeguitiAniList() {
  const mie = giaInLibreria();
  S.seguiti = (S.al?.seguiti || [])
    .filter(s => !mie.ha(s.id, 'anime', s.title))
    .map(s => ({ ...s, certo: true }))
    .slice(0, 30);
  S.consigliAt = Date.now();
  save();
}

/* ---------------- scollegare ---------------- */

function scollegaTutto() {
  S = { token: null, act: null, lib: {}, meta: {}, cal: {}, calAt: 0, det: {},
        al: { token: null, user: null }, tk: { token: null, refresh: null, scade: 0 },
        seguiti: [], nuove: [], simili: [], novita: [], consigliAt: 0,
        nascoste: S.nascoste || {}, lastSync: 0, settings: S.settings };
  save();
}

function scollegaSimkl() {
  S.token = null; S.act = null;
  for (const k of Object.keys(S.lib)) if (!S.lib[k]._fonte) delete S.lib[k];
  for (const k of Object.keys(S.cal)) if (k.startsWith('sk:')) delete S.cal[k];
  save();
}
