/* ================================================================
   Regole — dove finisce ogni titolo, e in che ordine
   ================================================================

   Questa è la parte che non ho toccato riorganizzando il sito, e apposta:
   ogni riga qui dentro è nata da un caso vero che finiva nel posto sbagliato.
   L'interfaccia si può rifare, queste no.

   Per ogni serie si contano gli ARRETRATI:
       arretrati = episodi totali − episodi non ancora usciti − episodi visti
   e poi si decide:
     - arretrati ≥ 1 e l'hai guardata di recente        → da guardare
     - arretrati ≥ 1, sei fermo, ma la serie è calda    → da guardare
     - arretrati ≥ 1, sei fermo e la serie è fredda     → in pausa
     - ...a meno che non ci sia un segnale recente      → da guardare, "tornata"
     - zero arretrati                                   → in pari
     - abbandonata e senza novità                       → archivio

   I film non hanno arretrati: o li hai visti, o li devi vedere, o non sono
   ancora usciti.
*/

'use strict';

function analizza(key, e, adesso) {
  return e._type === 'movies' ? analizzaFilm(key, e, adesso) : analizzaSerie(key, e, adesso);
}

/* ---------------- serie e anime ---------------- */

function analizzaSerie(key, e, adesso) {
  const st = S.settings;
  const P = st.pauseDays * DAY;      // da quanto non guardi tu
  const R = st.returnDays * DAY;     // quanto dev'essere fresca la novità per dire "è tornata"
  const A = st.abandonDays * DAY;    // oltre questo l'hai abbandonata, in onda o no

  const totali = e.total_episodes_count || 0;
  const nonUsciti = e.not_aired_episodes_count || 0;
  const visti = e.watched_episodes_count || 0;

  const stato = e.status;
  const viva = stato === 'watching' || stato === 'hold';

  /* Gli arretrati si contano così: usciti meno visti. Ma i contatori di Simkl
     a volte restano indietro, e su una serie lunghissima basta poco per far
     comparire episodi che in realtà hai già visto. Quando il servizio dice che
     non c'è un prossimo episodio, quella è la parola definitiva: sei in pari. */
  const inPari = viva && !e.next_to_watch && !e.next_to_watch_info;
  const arretrati = inPari ? 0 : Math.max(0, totali - nonUsciti - visti);

  const guardatoIl = e.last_watched_at ? Date.parse(e.last_watched_at) : null;
  const prossimoT = e.next_to_watch_info?.date ? Date.parse(e.next_to_watch_info.date) : null;
  const cresciutoIl = S.meta[key]?.growthAt ? Date.parse(S.meta[key].growthAt) : null;
  const cal = S.cal[chiaveCal(e)] || null;

  const fermoDa = guardatoIl ? adesso - guardatoIl : Infinity;

  // "è tornata": c'è un segnale recente, di qualunque provenienza
  const fresca =
    (prossimoT != null && prossimoT <= adesso && adesso - prossimoT <= R) ||
    (cresciutoIl != null && adesso - cresciutoIl <= R) ||
    (cal != null && cal.t >= adesso - 2 * DAY);

  /* Data che conta per la fascia, per l'ordinamento e per la scritta sotto al
     poster. Deve essere sempre una data di USCITA: ripiegare su quando avevi
     guardato tu faceva comparire fra le "appena uscite" una serie ripresa ieri. */
  const ultimaUscita = S.det[key]?.lastAired ? Date.parse(S.det[key].lastAired) : null;
  const uscitoIl = prossimoT != null && prossimoT <= adesso ? prossimoT : (cresciutoIl || ultimaUscita || null);
  const inArrivoIl = cal && cal.t > adesso ? cal.t : (prossimoT != null && prossimoT > adesso ? prossimoT : null);

  const parcheggiata = stato === 'completed' || stato === 'dropped';

  let sezione, tornata = false;

  if (stato === 'plantowatch') {
    sezione = 'inizia';

  } else if (arretrati >= 1) {
    // Solo qui ha senso parlare di pausa: ci sono episodi usciti che non hai visto.
    // "calda" non c'entra con quanto tempo fa l'hai guardata tu: c'entra con
    // quanto è attuale la serie.
    const calda = serieCalda(S.det[key], adesso, st.hotDays * DAY);

    if (viva) {
      if (fermoDa <= P) sezione = 'watch';
      else if (fresca) { sezione = 'watch'; tornata = true; }         // roba nuova: torna su comunque
      else if (calda !== false && fermoDa <= A) sezione = 'watch';
      else sezione = 'pausa';
    } else if (parcheggiata && st.showDropped && (fresca || (stato === 'completed' && calda === true))) {
      sezione = 'watch'; tornata = true;                              // finita due anni fa, ora è tornata
    } else {
      sezione = 'archivio';
    }

  } else {
    // Zero arretrati: sei in pari. Non è mai "in pausa", non c'è niente da recuperare.
    // Una serie che hai abbandonato non è "in attesa": non stai aspettando niente.
    if (stato === 'dropped') sezione = 'archivio';
    else if (viva || (stato === 'completed' && inArrivoIl)) sezione = 'pari';
    else sezione = 'archivio';
  }

  /* Zero episodi visti non vuol dire "messa in pausa": vuol dire mai cominciata.
     Se invece è appena uscita resta in griglia, perché lì la sezione non è 'pausa'. */
  if (sezione === 'pausa' && visti === 0) sezione = 'inizia';

  const scelto = S.meta[key]?.override;
  if (scelto === 'watch' && sezione !== 'watch') sezione = 'watch';
  if (scelto === 'pausa' && sezione === 'watch') { sezione = 'pausa'; tornata = false; }

  return { key, e, arretrati, sezione, tornata, guardatoIl, uscitoIl, inArrivoIl, cal };
}

/* ---------------- film ---------------- */

/* Un film non ha episodi arretrati: le domande sono solo due, l'hai visto? e
   se non l'hai visto, è già uscito? Il "già uscito" lo so dalla scheda quando
   ce l'ho, e dall'anno quando la scheda non serve scaricarla. */
function analizzaFilm(key, e, adesso) {
  const stato = e.status;
  const uscita = S.det[key]?.released ? Date.parse(S.det[key].released) : null;
  const anno = e.show?.year || null;
  const annoOra = new Date(adesso).getFullYear();

  let uscito;
  if (uscita != null && isFinite(uscita)) uscito = uscita <= adesso;
  else if (anno) uscito = anno <= annoOra;
  else uscito = true;                                   // se non so niente, do per uscito

  const guardatoIl = e.last_watched_at ? Date.parse(e.last_watched_at) : null;
  const uscitoIl = uscita != null && isFinite(uscita) && uscita <= adesso ? uscita
                 : (anno ? Date.parse(anno + '-01-01') : null);
  const inArrivoIl = uscita != null && isFinite(uscita) && uscita > adesso ? uscita : null;

  let sezione;
  if (stato === 'completed' || stato === 'dropped') sezione = 'visti';
  else if (stato === 'notinteresting') sezione = null;  // hai detto tu che non ti interessa
  else sezione = uscito ? 'daVedere' : 'inArrivo';

  const scelto = S.meta[key]?.override;
  if (scelto === 'watch' && sezione === 'visti') sezione = 'daVedere';
  if (scelto === 'pausa' && sezione === 'daVedere') sezione = 'visti';

  return { key, e, arretrati: 0, sezione, tornata: false, guardatoIl, uscitoIl, inArrivoIl, cal: null, film: true };
}

/* ---------------- l'etichetta del prossimo episodio ---------------- */

function etichettaProssimo(a) {
  const info = a.e.next_to_watch_info;
  if (info && info.episode != null) {
    return info.season != null ? `S${pad(info.season)}E${pad(info.episode)}` : t('data.ep', { n: info.episode });
  }
  if (a.e.next_to_watch) return a.e.next_to_watch;
  if (a.cal && a.cal.episode != null) {
    return a.cal.season != null ? `S${pad(a.cal.season)}E${pad(a.cal.episode)}` : t('data.ep', { n: a.cal.episode });
  }
  if (a.e.last_watched) return t('data.dopo', { x: a.e.last_watched });
  return '';
}

/* ---------------- ordinamenti ---------------- */

/* L'ordinamento scelto vale per TUTTE le sezioni dello spazio, non solo per la
   prima: prima cambiava il menù e sotto non si muoveva niente. */
const ORDINI_SERIE = ['recent', 'oldest', 'backlog', 'lastwatch', 'title'];
const ORDINI_FILM  = ['recent', 'oldest', 'lastwatch', 'title'];

function ordina(lista, modo) {
  const per = {
    recent:    (x, y) => (y.uscitoIl || 0) - (x.uscitoIl || 0),
    oldest:    (x, y) => (x.uscitoIl || Infinity) - (y.uscitoIl || Infinity),
    backlog:   (x, y) => y.arretrati - x.arretrati || (y.uscitoIl || 0) - (x.uscitoIl || 0),
    lastwatch: (x, y) => (y.guardatoIl || 0) - (x.guardatoIl || 0),
    title:     (x, y) => titolo(x.key, x.e).localeCompare(titolo(y.key, y.e))
  };
  lista.sort(per[modo] || per.recent);
}

/* Le due fasce della schermata principale: quello uscito nell'ultimo mese e
   quello che ti trascini da prima. */
function dividiInFasce(lista) {
  const adesso = Date.now();
  const b = [[], []];
  for (const a of lista) {
    const giorni = a.uscitoIl ? (adesso - a.uscitoIl) / DAY : Infinity;
    b[giorni <= 31 ? 0 : 1].push(a);
  }
  return [
    { chiave: 'fascia.freschi', items: b[0] },
    { chiave: 'fascia.vecchi', items: b[1] }
  ];
}
