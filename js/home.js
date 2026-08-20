/* ================================================================
   Home — il benvenuto, e il quadro d'insieme
   ================================================================

   Due pagine in una, a seconda di come ti trova:
   - se non hai ancora collegato niente, spiega cos'è e ti fa collegare;
   - se sei già collegato, dice in una riga a testa come stanno i tre spazi.

   Prima il benvenuto esisteva solo la prima volta e poi spariva per sempre:
   se volevi rileggere com'era fatto, o aggiungere Trakt sei mesi dopo, non
   c'era una porta per tornarci.
*/

'use strict';

function avviaHome() {
  load();
  montaTelaio({ attiva: null, alSync: () => aggiornaOra({ alDisegno: disegnaHome }) });
  disegnaHome();

  if (collegato()) {
    aggiornaOra({ alDisegno: disegnaHome });
    programmaAggiornamentoHome();
  }

  document.addEventListener('lingua-cambiata', disegnaHome);
}

function disegnaHome() {
  applicaLingua();
  disegnaAzioni();
  disegnaSpazi();
  disegnaServiziHome();
  aggiornaInfoSync();
  show('#btnSync', collegato());
  document.title = t('app.nome');
}

/* ---------------- il pulsante grosso in cima ---------------- */

function disegnaAzioni() {
  const host = $('#heroAzioni');
  host.replaceChildren();

  if (!collegato()) {
    const avviso = document.createElement('p');
    avviso.className = 'hero-avviso';
    avviso.textContent = t('home.nonCollegato');
    host.appendChild(avviso);

    const b = document.createElement('button');
    b.className = 'btn btn-big';
    b.textContent = t('home.collegaOra');
    b.onclick = () => apriCollegamento(() => { disegnaHome(); if (collegato()) aggiornaOra({ alDisegno: disegnaHome }); });
    host.appendChild(b);

    const g = document.createElement('a');
    g.className = 'btn btn-alt';
    g.href = 'guida.html';
    g.textContent = t('home.leggiGuida');
    host.appendChild(g);
    return;
  }

  // già collegato: la scorciatoia utile è entrare nello spazio più pieno
  const conti = contaSpazi();
  const migliore = Object.entries(conti).sort((a, b) => b[1].episodi - a[1].episodi)[0];
  if (migliore && migliore[1].titoli) {
    const b = document.createElement('a');
    b.className = 'btn btn-big';
    b.href = SPAZI[migliore[0]].pagina;
    b.textContent = `${t('nav.apri')} ${t(SPAZI[migliore[0]].eti)} · ${migliore[1].titoli} ${t('home.daVedere')}`;
    host.appendChild(b);
  }
}

/* ---------------- le tre carte degli spazi ---------------- */

function disegnaSpazi() {
  const host = $('#spaziCarte');
  host.replaceChildren();
  const conti = collegato() ? contaSpazi() : null;
  const note = { anime: 'home.spazioAnime', serie: 'home.spazioSerie', film: 'home.spazioFilm' };

  for (const [nome, sp] of Object.entries(SPAZI)) {
    const a = document.createElement('a');
    a.className = 'spazio-carta';
    a.href = sp.pagina;

    const h = document.createElement('h3');
    h.textContent = t(sp.eti);
    a.appendChild(h);

    const n = document.createElement('div');
    n.className = 'spazio-n';
    const c = conti?.[nome];
    if (!c || !c.titoli) {
      n.classList.add('vuoto');
      n.textContent = t('home.vuoto');
    } else {
      n.textContent = c.titoli;
      const eti = document.createElement('span');
      eti.textContent = ' ' + t('home.daVedere');
      n.appendChild(eti);
    }
    a.appendChild(n);

    const d = document.createElement('p');
    d.textContent = t(note[nome]);
    a.appendChild(d);

    host.appendChild(a);
  }
}

/* ---------------- i servizi ---------------- */

function disegnaServiziHome() {
  const host = $('#homeServizi');
  host.replaceChildren();
  for (const s of SERVIZI) {
    host.appendChild(rigaServizio(s, () => { disegnaHome(); if (collegato()) aggiornaOra({ alDisegno: disegnaHome }); }));
  }
}

function programmaAggiornamentoHome() {
  clearInterval(ui.refreshTimer);
  if (!S.settings.autoRefresh) return;
  ui.refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && collegato()) aggiornaOra({ alDisegno: disegnaHome });
  }, CFG.autoRefreshMs);
}

avviaHome();
