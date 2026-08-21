/* ================================================================
   Spazio — il motore di anime.html, serie.html e film.html
   ================================================================

   Le tre pagine sono identiche tranne una riga: quale spazio sono.
   Tutto il resto — menù, sezioni, fasce, filtri — nasce da qui, così una
   modifica alla schermata degli anime arriva da sola anche a quella dei film.

   Le sezioni sono dichiarate in una tabella invece che scritte nell'HTML:
   era proprio la parte che si era incrostata a forza di aggiunte, con id
   nel codice che non esistevano più nella pagina.
*/

'use strict';

/* L'ordine e' quello in cui uno le usa davvero: prima le cose su cui puoi
   fare qualcosa stasera (guardare, cominciare, riprendere), poi quelle da
   scoprire, e in fondo quelle dove non c'e' niente da fare (sei in pari,
   oppure e' finita). Prima "In pari" stava seconda e "Da iniziare" quinta,
   che e' l'ordine con cui erano state scritte, non quello con cui si usano. */
const SEZIONI_SERIE = [
  { id: 'watch',    nome: 'sez.watch',    aiuto: 'sez.watch.aiuto',    vuoto: 'sez.watch.vuoto',    principale: true, fasce: 'freschezza' },
  { id: 'inizia',   nome: 'sez.inizia',   aiuto: 'sez.inizia.aiuto',   vuoto: 'sez.inizia.vuoto',   aperta: false },
  { id: 'pausa',    nome: 'sez.pausa',    aiuto: 'sez.pausa.aiuto',    vuoto: 'sez.pausa.vuoto',    aperta: false },
  { id: 'scoprire', nome: 'sez.scoprire', aiuto: 'sez.scoprire.aiuto', vuoto: 'sez.scoprire.vuoto', aperta: true, suggerimenti: true },
  { id: 'pari',     nome: 'sez.pari',     aiuto: 'sez.pari.aiuto',     vuoto: 'sez.pari.vuoto',     aperta: true },
  { id: 'archivio', nome: 'sez.archivio', aiuto: 'sez.archivio.aiuto', vuoto: 'sez.archivio.vuoto', aperta: false, fasce: 'motivo' }
];

const SEZIONI_FILM = [
  { id: 'daVedere', nome: 'sezF.daVedere', aiuto: 'sezF.daVedere.aiuto', vuoto: 'sezF.daVedere.vuoto', principale: true },
  { id: 'scoprire', nome: 'sez.scoprire',  aiuto: 'sez.scoprire.aiuto',  vuoto: 'sez.scoprire.vuoto',  aperta: true, suggerimenti: true },
  { id: 'inArrivo', nome: 'sezF.inArrivo', aiuto: 'sezF.inArrivo.aiuto', vuoto: 'sezF.inArrivo.vuoto', aperta: true },
  { id: 'visti',    nome: 'sezF.visti',    aiuto: 'sezF.visti.aiuto',    vuoto: 'sezF.visti.vuoto',    aperta: false, fasce: 'filmMotivo' }
];

let SP = null;          // lo spazio di questa pagina
let SEZIONI = [];

function avviaSpazio(nome) {
  load();
  SP = { ...SPAZI[nome], nome };      // il nome dello spazio va messo per ultimo
  SEZIONI = SP.serie ? SEZIONI_SERIE : SEZIONI_FILM;

  /* Chi arriva senza aver collegato niente vedeva una pagina vuota, o veniva
     rimbalzato sulla home. Adesso vede lo spazio pieno di titoli d'esempio:
     capisce a cosa serve in due secondi, invece di doversi fidare. */
  if (!collegato()) caricaEsempio();

  costruisciPagina();
  montaTelaio({ attiva: nome, alSync: () => aggiornaOra({ alDisegno: disegna }) });
  collegaControlli();
  disegna();

  if (!MODO_ESEMPIO) {
    aggiornaOra({ alDisegno: disegna });
    programmaAggiornamento();
  }

  document.addEventListener('lingua-cambiata', () => { costruisciPagina(); collegaControlli(); disegna(); });
}

/* ---------------- la pagina, costruita una volta ---------------- */

function costruisciPagina() {
  const nav = $('#nav');
  const main = $('#main');
  nav.replaceChildren();
  main.replaceChildren();

  const tutte = document.createElement('button');
  tutte.className = 'nav-item';
  tutte.dataset.vista = 'tutto';
  tutte.textContent = t('ctrl.tutte');
  tutte.title = t('ctrl.tutteAiuto');
  nav.appendChild(tutte);

  for (const sez of SEZIONI) {
    const b = document.createElement('button');
    b.className = 'nav-item';
    b.dataset.vista = sez.id;
    b.append(document.createTextNode(t(sez.nome)));
    const n = document.createElement('span');
    n.className = 'nav-n';
    n.id = 'n-' + sez.id;
    n.textContent = '0';
    b.appendChild(n);
    b.title = t(sez.aiuto);
    nav.appendChild(b);

    // sotto la sezione principale compaiono le fasce, che portano al punto giusto
    if (sez.fasce === 'freschezza') {
      const fasce = document.createElement('div');
      fasce.className = 'nav-fasce';
      fasce.id = 'navFasce';
      nav.appendChild(fasce);
    }
  }

  // fascia dell'esempio: dice chiaramente che quei titoli sono finti
  const esempio = document.createElement('div');
  esempio.className = 'avviso-esempio hidden';
  esempio.id = 'avvisoEsempio';
  const testoEsempio = document.createElement('span');
  testoEsempio.innerHTML = t('demo.avviso');
  const bColl = document.createElement('button');
  bColl.className = 'btn btn-piccolo';
  bColl.textContent = t('demo.collega');
  bColl.onclick = () => apriCollegamento(() => { if (collegato()) location.reload(); });
  esempio.append(testoEsempio, bColl);
  main.appendChild(esempio);

  // fascia dello scaricamento: la prima volta ci vuole qualche minuto e va detto
  const caricamento = document.createElement('div');
  caricamento.className = 'avviso-carico hidden';
  caricamento.id = 'avvisoCarico';
  caricamento.innerHTML = `<b>${escapeHtml(t('msg.scaricando'))}</b> ${escapeHtml(t('msg.scaricandoNota'))}`;
  main.appendChild(caricamento);

  const avviso = document.createElement('div');
  avviso.className = 'filtro-attivo hidden';
  avviso.id = 'avvisoRicerca';
  avviso.innerHTML = '<span id="avvisoTesto"></span>';
  const azzera = document.createElement('button');
  azzera.className = 'btn-lino';
  azzera.textContent = t('ctrl.mostraTutto');
  azzera.onclick = () => { ui.search = ''; $('#cerca').value = ''; applicaAperte(); disegna(); };
  avviso.appendChild(azzera);
  main.appendChild(avviso);

  for (const sez of SEZIONI) {
    const s = document.createElement('section');
    s.className = 'block' + (sez.principale ? '' : ' collapsible');
    s.id = 'sec-' + sez.id;

    const h = document.createElement('h2');
    h.className = 'block-title' + (sez.principale ? '' : ' toggle');
    h.append(document.createTextNode(t(sez.nome)));
    const c = document.createElement('span');
    c.className = 'count';
    c.id = 'c-' + sez.id;
    c.textContent = '0';
    h.appendChild(c);
    if (!sez.principale) {
      const caret = document.createElement('span');
      caret.className = 'caret';
      caret.textContent = '▾';
      h.appendChild(caret);
      h.onclick = () => {
        s.classList.toggle('closed');
        S.settings.aperte[s.id] = !s.classList.contains('closed');
        save();
      };
    }
    s.appendChild(h);

    const aiuto = document.createElement('p');
    aiuto.className = 'hint';
    aiuto.textContent = t(sez.aiuto);
    s.appendChild(aiuto);

    const corpo = document.createElement('div');
    corpo.id = 'corpo-' + sez.id;
    s.appendChild(corpo);

    const vuoto = document.createElement('p');
    vuoto.className = 'empty hidden';
    vuoto.id = 'vuoto-' + sez.id;
    vuoto.textContent = t(sez.vuoto);
    s.appendChild(vuoto);

    main.appendChild(s);
  }

  applicaAperte();
}

/* Le sezioni restano come le hai lasciate. Quelle che non hai mai toccato
   partono da quello che dice la tabella qui sopra. */
function applicaAperte() {
  for (const sez of SEZIONI) {
    if (sez.principale) continue;
    const el = $('#sec-' + sez.id);
    if (!el) continue;
    const scelta = S.settings.aperte['sec-' + sez.id];
    el.classList.toggle('closed', !(scelta !== undefined ? scelta : sez.aperta));
  }
}

/* ---------------- disegno ---------------- */

function disegna() {
  const adesso = Date.now();
  const q = ui.search.trim().toLowerCase();

  const gruppi = {};
  for (const sez of SEZIONI) gruppi[sez.id] = [];

  /* Se hai collegato più servizi lo stesso titolo può arrivare due volte:
     tengo quello di Simkl, che porta più dati, e salto i gemelli. */
  const daSimkl = insiemeSimkl();

  for (const [key, e] of Object.entries(S.lib)) {
    if (e._type !== SP.tipo) continue;                       // ogni spazio vede solo il suo
    if (e._fonte && daSimkl.size && chiaviTitolo(key, e).some(c => daSimkl.has(c))) continue;
    if (q && !cercabile(key, e).includes(q)) continue;
    const a = analizza(key, e, adesso);
    if (a.sezione && gruppi[a.sezione]) gruppi[a.sezione].push(a);
  }

  const modo = S.settings.sort[SP.nome] || 'recent';
  for (const id of Object.keys(gruppi)) {
    if (id === 'pari' && modo === 'recent') {
      // in pari l'ordine utile è "chi esce prima"; chi non ha una data va in fondo
      gruppi[id].sort((x, y) => (x.inArrivoIl || Infinity) - (y.inArrivoIl || Infinity));
    } else if (id === 'inArrivo' && modo === 'recent') {
      gruppi[id].sort((x, y) => (x.inArrivoIl || Infinity) - (y.inArrivoIl || Infinity));
    } else {
      ordina(gruppi[id], modo);
    }
  }

  const conti = {};
  for (const sez of SEZIONI) {
    conti[sez.id] = sez.suggerimenti
      ? disegnaSuggerimenti(sez)
      : disegnaSezione(sez, gruppi[sez.id], modo);
  }

  aggiornaMenu(conti, gruppi[SEZIONI[0].id] || []);
  avvisoRicerca(q);
  show('#avvisoEsempio', MODO_ESEMPIO);
  show('#avvisoCarico', !MODO_ESEMPIO && ui.busy && !Object.keys(S.lib).length);
  applicaVista(conti);
  aggiornaTestata(gruppi);
}

function disegnaSezione(sez, lista, modo) {
  const corpo = $('#corpo-' + sez.id);
  $('#c-' + sez.id).textContent = lista.length;

  const rifai = () => disegna();
  const fabbrica = a => carta(a, !sez.principale, rifai);

  if (sez.fasce === 'freschezza' && modo === 'recent') {
    disegnaFasce(corpo, dividiInFasce(lista), fabbrica, false);
  } else if (sez.fasce === 'motivo') {
    const finite = [], mollate = [], altro = [];
    for (const a of lista) {
      if (a.e.status === 'completed') finite.push(a);
      else if (a.e.status === 'dropped') mollate.push(a);
      else altro.push(a);
    }
    disegnaFasce(corpo, [
      { chiave: 'fascia.finite', items: finite, nota: 'fascia.finite.nota' },
      { chiave: 'fascia.mollate', items: mollate, nota: 'fascia.mollate.nota' },
      { chiave: 'fascia.altro', items: altro }
    ], fabbrica);
  } else if (sez.fasce === 'filmMotivo') {
    const visti = lista.filter(a => a.e.status !== 'dropped');
    const lasciati = lista.filter(a => a.e.status === 'dropped');
    disegnaFasce(corpo, [
      { chiave: lasciati.length ? 'sezF.visti' : null, items: visti },
      { chiave: 'fascia.mollate', items: lasciati, nota: 'fascia.mollate.nota' }
    ], fabbrica);
  } else {
    disegnaFasce(corpo, [{ chiave: null, items: lista }], fabbrica, !!sez.principale);
  }
  return lista.length;
}

/* Le quattro fasce dei suggerimenti, in ordine di quanto probabilmente ti
   interessano. I seguiti stanno per primi apposta: sono la risposta a
   "ho finito una serie e nessuno mi ha detto che il seguito esiste". */
function disegnaSuggerimenti(sez) {
  const q = ui.search.trim().toLowerCase();
  const ok = x => !eNascosto(x) &&
    (x.tipo === SP.tipo) &&
    (!q || decodifica(x.title).toLowerCase().includes(q));

  const fasce = [
    { chiave: 'fascia.seguiti',  items: (S.seguiti || []).filter(ok), nota: 'fascia.seguiti.nota' },
    { chiave: 'fascia.stagioni', items: (S.nuove || []).filter(ok),   nota: 'fascia.stagioni.nota' },
    { chiave: 'fascia.simili',   items: (S.simili || []).filter(ok),  nota: 'fascia.simili.nota' },
    { chiave: 'fascia.novita',   items: (S.novita || []).filter(ok),  nota: 'fascia.novita.nota' }
  ];

  const totale = disegnaFasce($('#corpo-' + sez.id), fasce, x => cartaSuggerita(x, () => disegna()));
  $('#c-' + sez.id).textContent = totale;
  return totale;
}

function aggiornaMenu(conti, principale) {
  for (const sez of SEZIONI) {
    const el = $('#n-' + sez.id);
    if (el) el.textContent = conti[sez.id] || 0;
  }

  const host = $('#navFasce');
  if (!host) return;
  host.replaceChildren();
  const vista = S.settings.vista[SP.nome] || 'tutto';
  const modo = S.settings.sort[SP.nome] || 'recent';
  if (modo !== 'recent' || !principale.length || (vista !== 'tutto' && vista !== SEZIONI[0].id)) return;

  for (const f of dividiInFasce(principale)) {
    if (!f.items.length) continue;
    const b = document.createElement('button');
    b.className = 'nav-fascia';
    b.textContent = t(f.chiave);
    b.onclick = () => {
      const h = [...document.querySelectorAll('.band-title')].find(x => x.firstChild?.textContent === t(f.chiave));
      h?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    host.appendChild(b);
  }
}

/* La vista decide cosa resta in pagina: tutto, oppure una sezione sola.
   Guardando una sezione sola, o cercando, non ha senso tenerla chiusa: prima
   i risultati finivano dentro sezioni chiuse e non si vedevano. */
function applicaVista(conti) {
  const vista = S.settings.vista[SP.nome] || 'tutto';
  const tutto = vista === 'tutto';
  const q = ui.search.trim();

  for (const b of document.querySelectorAll('.nav-item')) b.classList.toggle('on', b.dataset.vista === vista);

  for (const sez of SEZIONI) {
    const el = $('#sec-' + sez.id);
    /* Se hai scelto questa sezione dal menu' resta in pagina anche se e' vuota:
       sparendo lasciava lo schermo bianco, e sembrava un guasto invece di una
       sezione senza niente dentro. */
    const scelta = !tutto && vista === sez.id;
    const visibile = scelta || (tutto && (sez.principale || conti[sez.id] > 0));
    show(el, visibile);
    if (scelta || (q && conti[sez.id] > 0)) el.classList.remove('closed');

    const vuoto = $('#vuoto-' + sez.id);
    const mostraVuoto = visibile && !conti[sez.id] && (sez.principale || scelta);
    if (vuoto) {
      vuoto.textContent = t(sez.vuoto) + (mostraVuoto && q ? ' ' + t('ctrl.provaSvuotare') : '');
      show(vuoto, mostraVuoto);
    }
  }
}

/* I filtri restringono tutta la libreria dello spazio, quindi cambiano anche i
   numeri nel menù. È giusto che sia così, ma va detto: senza avviso sembra un
   guasto. Adesso l'unico filtro è la ricerca, perché il tipo lo decide la pagina. */
function avvisoRicerca(q) {
  const box = $('#avvisoRicerca');
  if (!box) return;
  if (!q) return show(box, false);
  $('#avvisoTesto').innerHTML =
    `${escapeHtml(t('ctrl.stoCercando'))} <b>${escapeHtml(q)}</b>. ${escapeHtml(t('ctrl.contanoSolo'))}`;
  show(box, true);
}

function aggiornaTestata(gruppi) {
  const sub = $('#brandSub');
  if (!sub) return;
  const principale = gruppi[SEZIONI[0].id] || [];

  if (SP.serie) {
    const arretrati = principale.reduce((s, a) => s + a.arretrati, 0);
    if (!arretrati) { sub.textContent = t('test.inPari'); document.title = t('app.nome'); return; }
    const freschi = principale
      .filter(a => a.uscitoIl && Date.now() - a.uscitoIl <= 2 * DAY)
      .reduce((s, a) => s + a.arretrati, 0);
    const ep = `${arretrati} ${t(arretrati === 1 ? 'test.episodio' : 'test.episodi')}`;
    const se = `${principale.length} ${t(principale.length === 1 ? 'test.serie1' : 'test.serie')}`;
    sub.innerHTML = `<b>${escapeHtml(ep)}</b> ${escapeHtml(t('test.daVedere'))} ${escapeHtml(se)}` +
      (freschi ? ` · <span class="oggi">${escapeHtml(freschi + ' ' + t(freschi === 1 ? 'test.appenaUscito' : 'test.appenaUsciti'))}</span>` : '');
    document.title = `(${arretrati}) ${t(SP.eti)} · ${t('app.nome')}`;
  } else {
    const n = principale.length;
    sub.innerHTML = n
      ? `<b>${escapeHtml(String(n))}</b> ${escapeHtml(t(n === 1 ? 'test.filmDaVedere1' : 'test.filmDaVedere'))}`
      : escapeHtml(t('sezF.daVedere.vuoto'));
    document.title = n ? `(${n}) ${t(SP.eti)} · ${t('app.nome')}` : `${t(SP.eti)} · ${t('app.nome')}`;
  }
}

/* ---------------- controlli ---------------- */

let attesaDisegno = null;
function disegnaTraPoco(ms = 140) {
  clearTimeout(attesaDisegno);
  attesaDisegno = setTimeout(disegna, ms);
}

function collegaControlli() {
  const cerca = $('#cerca');
  cerca.value = ui.search;
  cerca.oninput = ev => {
    ui.search = ev.target.value;
    if (!ui.search.trim()) applicaAperte();   // finita la ricerca, le sezioni tornano come le tenevi
    disegnaTraPoco();
  };

  const sel = $('#ordina');
  sel.replaceChildren();
  for (const modo of (SP.serie ? ORDINI_SERIE : ORDINI_FILM)) {
    const o = document.createElement('option');
    o.value = modo;
    o.textContent = t('ord.' + modo);
    sel.appendChild(o);
  }
  sel.value = S.settings.sort[SP.nome] || 'recent';
  sel.onchange = ev => { S.settings.sort[SP.nome] = ev.target.value; save(); disegna(); };

  $('#nav').onclick = ev => {
    const b = ev.target.closest('.nav-item');
    if (!b) return;
    S.settings.vista[SP.nome] = b.dataset.vista;
    if (b.dataset.vista === 'tutto') applicaAperte();
    save();
    disegna();
    scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Scorciatoie: "/" porta nella ricerca, Esc la svuota. */
  document.onkeydown = ev => {
    const dentroUnCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
    if (ev.key === '/' && !dentroUnCampo && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      cerca.focus(); cerca.select();
    } else if (ev.key === 'Escape') {
      const modale = $('#modaleColl');
      if (modale && !modale.classList.contains('hidden')) return chiudiCollegamento();
      if (ui.search) {
        cerca.value = ''; ui.search = '';
        applicaAperte(); disegna(); cerca.blur();
      }
    }
  };

  // aggiorno quando torno sulla scheda, non con un timer cieco in sottofondo
  document.onvisibilitychange = () => {
    if (document.visibilityState !== 'visible' || !collegato()) return;
    aggiornaInfoSync();
    if (S.settings.autoRefresh && Date.now() - S.lastSync > CFG.autoRefreshMs) aggiornaOra({ alDisegno: disegna });
  };
}

function programmaAggiornamento() {
  clearInterval(ui.refreshTimer);
  if (!S.settings.autoRefresh) return;
  ui.refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && collegato()) aggiornaOra({ alDisegno: disegna });
  }, CFG.autoRefreshMs);
}
