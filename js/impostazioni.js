/* ================================================================
   Impostazioni — pagina vera, non più un pannellino stretto
   ================================================================

   Prima era una finestra sopra alla dashboard: ci stava a stento, e i
   collegamenti ai servizi erano schiacciati in fondo. Adesso è una pagina
   normale, con un indirizzo suo, che si può mettere nei preferiti.
*/

'use strict';

function avviaImpostazioni() {
  load();
  montaTelaio({ attiva: null, alSync: () => aggiornaOra() });
  disegnaImpostazioni();
  collega();
  document.addEventListener('lingua-cambiata', disegnaImpostazioni);
}

function disegnaImpostazioni() {
  applicaLingua();
  const st = S.settings;

  const host = $('#impServizi');
  host.replaceChildren();
  for (const s of SERVIZI) host.appendChild(rigaServizio(s, disegnaImpostazioni));

  for (const b of document.querySelectorAll('#chipsLingua .chip')) {
    b.classList.toggle('on', b.dataset.lingua === LINGUA);
  }

  cursore('sPause', 'lPause', 'imp.pausa', st.pauseDays);
  cursore('sHot', 'lHot', 'imp.calda', st.hotDays);
  cursore('sAbandon', 'lAbandon', 'imp.abbandono', st.abandonDays);
  cursore('sReturn', 'lReturn', 'imp.tornata', st.returnDays);

  $('#sEnTitles').checked = st.enTitles !== false;
  $('#sDropped').checked = st.showDropped;
  $('#sAutoRefresh').checked = st.autoRefresh;

  const nascosti = Object.keys(S.nascoste || {}).length;
  const bn = $('#btnNascosti');
  show(bn, nascosti > 0);
  if (nascosti) bn.textContent = `${t('imp.mostraNascosti')} (${nascosti})`;

  const titoli = Object.keys(S.lib).length;
  const perTipo = {};
  for (const e of Object.values(S.lib)) perTipo[e._type] = (perTipo[e._type] || 0) + 1;
  $('#statsLine').textContent = [
    t('imp.inLibreria', { n: titoli }),
    `${perTipo.anime || 0} ${t('nav.anime')}`,
    `${perTipo.shows || 0} ${t('nav.serie')}`,
    `${perTipo.movies || 0} ${t('nav.film')}`
  ].join(' · ');

  show('#btnSync', collegato());
  aggiornaInfoSync();
  document.title = t('imp.titolo') + ' · ' + t('app.nome');
}

/* L'etichetta del cursore contiene il numero: la riscrivo mentre trascini,
   così il valore si legge dove lo stai cambiando e non da un'altra parte. */
function cursore(idInput, idEtichetta, chiave, valore) {
  const input = $('#' + idInput);
  input.value = valore;
  $('#' + idEtichetta).innerHTML = t(chiave, { n: valore });
}

function collega() {
  for (const b of document.querySelectorAll('#chipsLingua .chip')) {
    b.onclick = () => cambiaLingua(b.dataset.lingua);
  }

  const soglie = [
    ['sPause', 'lPause', 'imp.pausa', 'pauseDays'],
    ['sHot', 'lHot', 'imp.calda', 'hotDays'],
    ['sAbandon', 'lAbandon', 'imp.abbandono', 'abandonDays'],
    ['sReturn', 'lReturn', 'imp.tornata', 'returnDays']
  ];
  for (const [idInput, idEti, chiave, campo] of soglie) {
    $('#' + idInput).oninput = ev => {
      const n = +ev.target.value;
      S.settings[campo] = n;
      $('#' + idEti).innerHTML = t(chiave, { n });
      save();
    };
  }

  $('#sEnTitles').onchange = ev => { S.settings.enTitles = ev.target.checked; save(); };
  $('#sDropped').onchange = ev => { S.settings.showDropped = ev.target.checked; save(); };
  $('#sAutoRefresh').onchange = ev => { S.settings.autoRefresh = ev.target.checked; save(); };

  $('#btnFullSync').onclick = () => aggiornaOra({ full: true });
  $('#btnExport').onclick = esporta;
  $('#btnImport').onclick = () => $('#fileImport').click();
  $('#fileImport').onchange = importa;

  $('#btnNascosti').onclick = () => {
    const n = Object.keys(S.nascoste || {}).length;
    S.nascoste = {};
    save();
    toast(t('msg.nascostiTolti', { n }));
    disegnaImpostazioni();
  };

  $('#btnLogout').onclick = () => {
    if (!confirm(t('msg.confermaScollega'))) return;
    scollegaTutto();
    location.href = 'index.html';
  };
}

/* Esportare serviva già; importare no, ed era una mancanza vera: potevi
   salvare le tue soglie e poi non c'era modo di rimetterle. */
function esporta() {
  const blob = new Blob([JSON.stringify({
    versione: 2, settings: S.settings, meta: S.meta, nascoste: S.nascoste
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dashboard-serie-impostazioni.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importa(ev) {
  const file = ev.target.files?.[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!d || typeof d !== 'object' || !d.settings) throw new Error('storto');
    // tengo solo i campi che conosco: un file manomesso non deve poter
    // infilare roba a caso dentro allo stato
    for (const k of Object.keys(DEFAULTS)) {
      if (d.settings[k] !== undefined) S.settings[k] = d.settings[k];
    }
    if (d.meta && typeof d.meta === 'object') S.meta = { ...S.meta, ...d.meta };
    if (d.nascoste && typeof d.nascoste === 'object') S.nascoste = { ...S.nascoste, ...d.nascoste };
    impostaLingua(linguaIniziale(S.settings.lingua));
    save();
    toast(t('msg.importate'));
    disegnaImpostazioni();
  } catch (e) {
    toast(t('msg.fileStorto'));
  }
}

avviaImpostazioni();
