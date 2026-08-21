/* ================================================================
   Telaio — quello che è uguale in tutte le pagine
   ================================================================

   Testata, passaggio da uno spazio all'altro, cambio lingua, aggiornamento,
   messaggi a comparsa e la finestra per collegare un servizio.

   La finestra di collegamento la costruisco qui invece di scriverla dentro a
   ogni pagina: serve nella home, nelle impostazioni e in mezzo agli spazi, e
   averla in un posto solo vuol dire che il giorno che cambia, cambia una volta.
*/

'use strict';

/* ---------------- messaggi a comparsa ---------------- */

let toastTimer = null;
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast hidden';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  show(el, true);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => show(el, false), 2600);
}

/* ---------------- testata ---------------- */

function montaTelaio({ attiva = null, alSync = null } = {}) {
  applicaLingua();

  for (const a of document.querySelectorAll('.spazi a')) {
    a.classList.toggle('on', a.dataset.spazio === attiva);
  }

  for (const b of document.querySelectorAll('[data-lingua]')) {
    b.classList.toggle('on', b.dataset.lingua === LINGUA);
    b.onclick = () => cambiaLingua(b.dataset.lingua);
  }

  const sync = $('#btnSync');
  if (sync) {
    sync.onclick = () => alSync ? alSync() : aggiornaOra();
    show(sync, collegato());
  }
  aggiornaInfoSync();

  // se torno da AniList il token è nell'indirizzo: lo raccolgo e ripulisco
  if (alRaccogliToken()) {
    toast(t('msg.aggiornato'));
    setTimeout(() => location.reload(), 300);
  }

  controllaVersioni();
  registraServiceWorker();
}

/* Cambiare lingua non ricarica la pagina: riscrivo i testi e ridisegno.
   Ricaricare avrebbe perso la ricerca e la sezione aperta. */
function cambiaLingua(l) {
  impostaLingua(l);
  S.settings.lingua = LINGUA;
  save();
  applicaLingua();
  for (const b of document.querySelectorAll('[data-lingua]')) b.classList.toggle('on', b.dataset.lingua === LINGUA);
  // le righe dei servizi sono costruite a mano: applicaLingua non le raggiunge
  if (finestraColl && !finestraColl.classList.contains('hidden')) disegnaServiziColl();
  document.dispatchEvent(new CustomEvent('lingua-cambiata'));
}

function aggiornaInfoSync() {
  const el = $('#syncInfo');
  if (!el) return;
  if (!S.lastSync || !collegato()) { el.textContent = ''; return; }
  const min = Math.round((Date.now() - S.lastSync) / 60e3);
  el.textContent = min < 1 ? t('msg.aggiornatoOra')
    : min < 60 ? t('msg.aggiornatoMin', { n: min })
    : t('msg.aggiornatoQuando', { x: when(S.lastSync) });
}

/* ---------------- aggiornamento ---------------- */

async function aggiornaOra({ full = false, alDisegno = null } = {}) {
  if (!collegato()) return toast(t('msg.serveCollegare'));
  const bottone = $('#btnSync');
  bottone?.classList.add('spin');
  try {
    const esito = await sync({
      full,
      quando: (che, testo) => {
        // 'inizio' serve a far comparire la fascia "sto scaricando": senza un
        // ridisegno qui, quella fascia non si vedeva mai al primo avvio, che e'
        // esattamente l'unico momento in cui serviva.
        if (che === 'disegna' || che === 'inizio') alDisegno?.();
        else if (che === 'avanzamento' && $('#syncInfo')) $('#syncInfo').textContent = testo;
        else if (che === 'fine') { bottone?.classList.remove('spin'); aggiornaInfoSync(); }
      }
    });
    if (esito) toast(esito);
  } catch (e) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_TOKEN') {
      scollegaSimkl();
      toast(t('msg.scadutoSimkl'));
      alDisegno?.();
    } else {
      toast(e.tradotto ? e.message : t('msg.errore', { x: e.message }));
      console.error(e);
    }
  } finally {
    // se un altro aggiornamento e' ancora in corso la rotella deve continuare a girare
    if (!ui.busy) bottone?.classList.remove('spin');
    aggiornaInfoSync();
  }
}

/* ---------------- finestra "collega un servizio" ---------------- */

let finestraColl = null;

function apriCollegamento(alFatto) {
  if (!finestraColl) finestraColl = costruisciFinestraColl();
  finestraColl._alFatto = alFatto || (() => location.reload());
  disegnaServiziColl();
  mostraPassoColl('elenco');
  show(finestraColl, true);
}

function chiudiCollegamento() {
  stopPin();
  show(finestraColl, false);
}

function costruisciFinestraColl() {
  const box = document.createElement('div');
  box.className = 'modal hidden';
  box.id = 'modaleColl';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', t('coll.titolo'));
  box.innerHTML = `
    <div class="modal-box">
      <h2 data-t="coll.titolo"></h2>
      <p class="modal-intro" data-t="coll.sotto"></p>

      <div data-passo="elenco">
        <div class="servizi" id="colServizi"></div>
        <p class="muted small" data-t="coll.durata"></p>
        <a class="btn btn-ghost btn-largo" href="guida.html" data-t="home.leggiGuida"></a>
      </div>

      <div data-passo="pin" class="hidden">
        <p class="login-passo"><span class="login-n">1</span> <span data-t="coll.passo1"></span></p>
        <a id="colUrl" class="pin-url" target="_blank" rel="noopener"></a>
        <p class="login-passo"><span class="login-n">2</span> <span data-t="coll.passo2"></span></p>
        <div id="colCodice" class="pin-code">-----</div>
        <p class="muted" data-t="coll.attesa"></p>
      </div>

      <p class="err hidden" id="colErr"></p>
      <button class="btn btn-big" id="colChiudi" data-t="coll.annulla"></button>
    </div>`;
  document.body.appendChild(box);
  box.onclick = ev => { if (ev.target === box) chiudiCollegamento(); };
  box.querySelector('#colChiudi').onclick = chiudiCollegamento;

  /* Esc chiude, da qualunque pagina. Prima lo gestiva solo il codice degli
     spazi, quindi sulla home, nelle impostazioni e nella guida la finestra
     restava li'. Dentro agli spazi questo scatta dopo, e trova gia' chiuso. */
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !box.classList.contains('hidden')) chiudiCollegamento();
  });

  applicaLingua(box);
  return box;
}

function mostraPassoColl(passo) {
  for (const el of finestraColl.querySelectorAll('[data-passo]')) {
    show(el, el.dataset.passo === passo);
  }
  show('#colErr', false);
  finestraColl.querySelector('#colChiudi').textContent = t(passo === 'pin' ? 'coll.annulla' : 'imp.chiudi');
}

function erroreColl(msg) {
  const el = finestraColl.querySelector('#colErr');
  el.textContent = msg;
  show(el, true);
  mostraPassoColl('elenco');
}

/* L'elenco dei servizi lo disegno da SERVIZI: tre volte lo stesso blocco
   scritto a mano voleva dire tre punti dove dimenticarsi una modifica. */
function disegnaServiziColl() {
  const host = finestraColl.querySelector('#colServizi');
  host.replaceChildren();
  for (const s of SERVIZI) {
    host.appendChild(rigaServizio(s, () => { disegnaServiziColl(); finestraColl._alFatto(); }));
  }
}

/* Una riga "servizio": nome, cosa copre, e il pulsante giusto secondo lo stato.
   La usano sia la finestra di collegamento sia la pagina delle impostazioni. */
function rigaServizio(s, alCambio) {
  const box = document.createElement('div');
  box.className = 'servizio';
  const acceso = s.collegato();
  const disponibile = s.disponibile();
  box.classList.toggle('on', acceso);

  const testo = document.createElement('div');
  const nome = document.createElement('b');
  nome.textContent = s.nome;
  const nota = document.createElement('span');
  nota.className = 'servizio-nota';
  nota.textContent = t(s.nota);
  testo.append(nome, nota);

  const b = document.createElement('button');
  b.className = 'btn btn-ghost btn-piccolo';

  if (!disponibile) {
    b.disabled = true;
    b.textContent = t('coll.nonConfig');
    b.title = t('coll.nonConfigAiuto');
  } else if (acceso) {
    b.textContent = t('coll.scollega');
    b.onclick = () => {
      if (!confirm(t('msg.confermaServizio', { x: s.nome }))) return;
      if (s.id === 'simkl') scollegaSimkl();
      if (s.id === 'trakt') tkScollega();
      if (s.id === 'anilist') alScollega();
      alCambio();
    };
  } else {
    b.textContent = t('coll.collega');
    b.onclick = () => avviaCollegamento(s.id, alCambio);
  }

  box.append(testo, b);
  return box;
}

async function avviaCollegamento(id, alCambio) {
  try {
    if (id === 'anilist') return alLogin();     // se ne va e torna col token nell'indirizzo

    const pronto = err => {
      if (err) return erroreColl(err.message);
      chiudiCollegamento();
      alCambio();
    };
    const avvio = id === 'trakt' ? await tkLogin(pronto) : await startPin(pronto);

    if (finestraColl) {
      finestraColl.querySelector('#colCodice').textContent = avvio.codice;
      const link = finestraColl.querySelector('#colUrl');
      link.href = avvio.url;
      link.textContent = avvio.url.replace(/^https?:\/\//, '');
      mostraPassoColl('pin');
    }
  } catch (e) {
    if (finestraColl && !finestraColl.classList.contains('hidden')) erroreColl(e.message);
    else toast(e.message);
  }
}

/* ---------------- manutenzione della pagina ---------------- */

/* Il numero di versione negli indirizzi (?v=) vive nelle pagine HTML e in
   sw.js. Aggiornarne uno solo fa girare il CSS nuovo col JS vecchio, e i
   sintomi non somigliano alla causa. Qui me ne accorgo e lo dico. */
function controllaVersioni() {
  const ver = url => { try { return new URL(url, location.href).searchParams.get('v') || ''; } catch (_) { return ''; } };
  const js = [...document.scripts].map(s => s.src).find(s => s.includes('/js/'));
  const css = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href).find(h => h.includes('app.css'));
  if (!js || !css || ver(js) === ver(css)) return;
  console.warn(`Dashboard Serie: versioni disallineate — script ?v=${ver(js)} contro app.css?v=${ver(css)}. ` +
               'Il numero va tenuto uguale in tutte le pagine e in sw.js.');
}

/* In locale il service worker servirebbe solo a restituire file vecchi mentre
   lavoriamo: lo attivo unicamente sul sito vero. */
function registraServiceWorker() {
  const inLocale = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !inLocale) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  }
}

/* ---------------- conti veloci, per la home e i menù ---------------- */

/* Quanti titoli e quanti episodi ti aspettano, spazio per spazio.
   Serve alla home per dire "Anime: 12 da vedere" senza disegnare niente. */
function contaSpazi() {
  const adesso = Date.now();
  const out = {};
  for (const [nome, sp] of Object.entries(SPAZI)) out[nome] = { titoli: 0, episodi: 0 };

  const daSimkl = insiemeSimkl();
  for (const [key, e] of Object.entries(S.lib)) {
    if (e._fonte && daSimkl.size && chiaviTitolo(key, e).some(c => daSimkl.has(c))) continue;
    const nome = Object.keys(SPAZI).find(n => SPAZI[n].tipo === e._type);
    if (!nome) continue;
    const a = analizza(key, e, adesso);
    if (a.sezione === 'watch' || a.sezione === 'daVedere') {
      out[nome].titoli++;
      out[nome].episodi += a.arretrati;
    }
  }
  return out;
}

/* Le chiavi dei titoli che arrivano da Simkl: servono a saltare i gemelli
   quando lo stesso titolo arriva anche da Trakt o AniList. */
function insiemeSimkl() {
  const set = new Set();
  if (!S.token) return set;
  for (const [k, e] of Object.entries(S.lib)) {
    if (!e._fonte) for (const c of chiaviTitolo(k, e)) set.add(c);
  }
  return set;
}
