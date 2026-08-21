/* ================================================================
   Carte — il poster, le pastiglie, la riga sotto
   ================================================================

   Una carta non è un <a> che avvolge tutto: il collegamento è un velo
   trasparente steso sopra al poster, e il titolo ha il suo. Così i pulsanti
   non finiscono dentro a un link (che non è HTML valido e da tastiera
   intrappola il pulsante), e restano cliccabili perché stanno un piano più
   in alto del velo.
*/

'use strict';

/* ---------------- i due collegamenti ---------------- */

function veloLink(href) {
  const a = document.createElement('a');
  a.className = 'poster-link';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.tabIndex = -1;                       // il titolo qui sotto porta allo stesso posto
  a.setAttribute('aria-hidden', 'true');
  return a;
}

function linkTitolo(href, nome) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = nome;
  return a;
}

function linkScheda(e, slug) {
  if (e._fonte === 'anilist') return `https://anilist.co/anime/${e._id}`;
  if (e._fonte === 'trakt') {
    return e._type === 'movies'
      ? `https://trakt.tv/movies/${slug || e._id}`
      : `https://trakt.tv/shows/${slug || e._id}`;
  }
  const tipo = e._type === 'anime' ? 'anime' : e._type === 'movies' ? 'movies' : 'tv';
  return `https://simkl.com/${tipo}/${e._id}/${slug || ''}`;
}

// Simkl manda un pezzo di percorso, AniList un indirizzo intero.
function posterUrl(poster, piccolo) {
  if (!poster) return '';
  if (/^https?:\/\//.test(poster)) return poster;
  return `${CFG.img}${poster}${piccolo ? '_ca' : '_m'}.webp&q=90`;
}

/* ---------------- pastiglie ---------------- */

const SPIEGA_PASTIGLIA = {
  'badge-count': 'bad.conteggio',
  'badge-new': 'bad.nuovoAiuto',
  'badge-back': 'bad.tornataAiuto',
  'badge-soon': 'bad.prossimoAiuto',
  'badge-done': 'bad.fattoAiuto'
};

function badge(cls, testo, spiega) {
  const b = document.createElement('span');
  b.className = 'badge ' + cls;
  b.textContent = testo;
  const chiave = SPIEGA_PASTIGLIA[cls];
  const aiuto = spiega || (chiave ? t(chiave) : '');
  if (aiuto) b.title = aiuto;
  return b;
}

/* ---------------- titoli che si chiamano uguale ---------------- */

/* Su Simkl la seconda stagione di una serie ha lo STESSO titolo della prima:
   nella libreria di prova erano 25 gruppi, fra cui sei card tutte chiamate
   "Kingdom". Dove capita, aggiungo l'anno; e dove nemmeno l'anno basta (due
   stagioni dello stesso anno) aggiungo quanti episodi ha.
   La mappa la riempie chi disegna la pagina, perche' solo li' si sa quali
   titoli sono davvero in ballo in questo spazio. */
let NOMI_AMBIGUI = new Map();

function segnalaOmonimi(mappa) { NOMI_AMBIGUI = mappa; }

/* Trova i titoli che compaiono piu' di una volta, e decide come distinguerli. */
function trovaOmonimi(voci) {
  const per = new Map();
  for (const [key, e] of voci) {
    const n = normalizza(titolo(key, e));
    if (!n) continue;
    if (!per.has(n)) per.set(n, []);
    per.get(n).push(e);
  }
  const out = new Map();
  for (const [n, lista] of per) {
    if (lista.length < 2) continue;
    const anni = new Set(lista.map(e => e.show?.year));
    out.set(n, anni.size === lista.length ? 'anno' : 'episodi');
  }
  return out;
}

function nomeCarta(key, e) {
  const n = titolo(key, e);
  const come = NOMI_AMBIGUI.get(normalizza(n));
  if (!come) return n;
  const pezzi = [];
  if (e.show?.year) pezzi.push(e.show.year);
  if (come === 'episodi' && e.total_episodes_count) pezzi.push(e.total_episodes_count + ' ep');
  return pezzi.length ? `${n} (${pezzi.join(' \u00b7 ')})` : n;
}

/* ---------------- la carta di un titolo che hai ---------------- */

function carta(a, piccola, alCambio) {
  const e = a.e;
  const scheda = e.show || {};
  const slug = scheda.ids?.slug || '';
  const nome = nomeCarta(a.key, e);
  const dove = linkScheda(e, slug);

  const el = document.createElement('div');
  el.className = 'card';
  el.title = nome;

  const poster = document.createElement('div');
  poster.className = 'poster';

  if (scheda.poster) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = posterUrl(scheda.poster, piccola);
    poster.appendChild(img);
  } else {
    const f = document.createElement('div');
    f.className = 'poster-fallback';
    f.textContent = nome;
    poster.appendChild(f);
  }
  poster.appendChild(veloLink(dove));

  if (a.film) pastiglieFilm(poster, a);
  else pastiglieSerie(poster, a);

  // pulsantino per spostare a mano un titolo fra "da guardare" e "in pausa"
  const spostabile = a.sezione === 'watch' || a.sezione === 'pausa' || a.sezione === 'daVedere' || a.sezione === 'visti';
  if (spostabile && alCambio) {
    const versoPausa = a.sezione === 'watch' || a.sezione === 'daVedere';
    const b = document.createElement('button');
    b.className = 'card-act';
    /* "in pausa" su un film non vuol dire niente: un film non lo metti in pausa,
       semmai lo rimandi. Parole diverse per una cosa diversa. */
    const parole = a.film
      ? (versoPausa ? 'ctrl.nonOra' : 'ctrl.rimetti')
      : (versoPausa ? 'ctrl.inPausa' : 'ctrl.riprendi');
    b.textContent = t(parole);
    b.title = t(versoPausa ? 'ctrl.inPausaAiuto' : 'ctrl.riprendiAiuto');
    b.onclick = () => {
      const m = S.meta[a.key] || (S.meta[a.key] = {});
      m.override = versoPausa ? 'pausa' : 'watch';
      save();
      alCambio();
    };
    poster.appendChild(b);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';

  const tit = document.createElement('div');
  tit.className = 'title';
  tit.appendChild(linkTitolo(dove, nome));
  meta.appendChild(tit);

  const sub = document.createElement('div');
  sub.className = 'sub';
  if (a.film) rigaFilm(sub, a, scheda);
  else rigaSerie(sub, a, scheda);
  meta.appendChild(sub);

  /* Il titolo dell'episodio, solo nella griglia grande dove c'è spazio.
     Se ripete soltanto il numero ("Episode 8") non aggiunge niente a "Ep. 8". */
  const titoloEp = e.next_to_watch_info?.title;
  if (!piccola && !a.film && titoloEp && !/^(episode|episodio|ep\.?)\s*\d+$/i.test(titoloEp.trim())) {
    const ep = document.createElement('div');
    ep.className = 'ep';
    ep.textContent = titoloEp;
    meta.appendChild(ep);
  }

  el.appendChild(poster);
  el.appendChild(meta);
  return el;
}

function pastiglieSerie(poster, a) {
  // Un episodio solo e appena uscito è una cosa diversa da sette arretrati.
  if (a.arretrati >= 2) {
    poster.appendChild(badge('badge-count', '+' + a.arretrati));
  } else if (a.arretrati === 1) {
    const fresco = a.uscitoIl && Date.now() - a.uscitoIl <= 7 * DAY;
    poster.appendChild(badge(fresco ? 'badge-new' : 'badge-count', fresco ? t('bad.nuovo') : '+1'));
  }
  if (a.tornata) poster.appendChild(badge('badge-back', t('bad.tornata')));
  else if (a.sezione === 'pari') {
    // Hai visto tutto quello che è uscito: si deve vedere a colpo d'occhio.
    if (a.inArrivoIl) poster.appendChild(badge('badge-soon', when(a.inArrivoIl)));
    else poster.appendChild(badge('badge-done', '✓'));
  }
  /* Il bollino ANIME non c'e' piu': serviva quando anime e serie TV stavano
     nello stesso elenco. Adesso lo spazio Anime contiene solo anime, quindi
     scriverlo su ognuno era una parola ripetuta dodici volte per niente. */
}

function pastiglieFilm(poster, a) {
  /* Le spiegazioni dei film devono parlare di film. Prima ereditavano quelle
     delle serie: sotto la spunta di un film c'era scritto "hai visto tutti gli
     episodi usciti", e sotto la data "quando esce il prossimo episodio". */
  if (a.sezione === 'visti' && a.e.status !== 'dropped') {
    poster.appendChild(badge('badge-done', '\u2713', t('bad.filmVistoAiuto')));
  } else if (a.sezione === 'inArrivo' && a.inArrivoIl) {
    poster.appendChild(badge('badge-soon', when(a.inArrivoIl), t('bad.escoAiuto')));
  }
}

function rigaSerie(sub, a, scheda) {
  /* Se hai visto tutti gli episodi usciti la parola giusta è "Completo".
     Scrivere "visto fino a S02E10" faceva sembrare che fossi rimasto indietro. */
  if (a.sezione === 'pari' && !a.inArrivoIl) {
    sub.innerHTML = `<b class="fatto">${escapeHtml(t('bad.completo'))}</b>`;
    return;
  }
  if (a.sezione === 'pari') {
    const eti = etichettaProssimo(a);
    sub.innerHTML = eti
      ? `<b>${escapeHtml(eti)}</b> ${escapeHtml(t('data.esce', { x: when(a.inArrivoIl) }))}`
      : escapeHtml(t('data.esceIl', { x: when(a.inArrivoIl) }));
    return;
  }
  let eti = etichettaProssimo(a);
  // Sulle serie completate o abbandonate il "prossimo episodio" non c'è:
  // in quel caso dico almeno quanta roba nuova ti aspetta.
  if (!eti && a.arretrati > 0) {
    eti = a.arretrati === 1 ? t('data.epNuovo') : t('data.epNuovi', { n: a.arretrati });
  }
  if (eti && a.uscitoIl) sub.innerHTML = `<b>${escapeHtml(eti)}</b> ${escapeHtml(t('data.uscito', { x: when(a.uscitoIl) }))}`;
  else if (eti) sub.textContent = eti;
  else if (a.uscitoIl) sub.textContent = t('data.uscito', { x: when(a.uscitoIl) });
  else sub.textContent = scheda.year ? String(scheda.year) : '';
}

function rigaFilm(sub, a, scheda) {
  if (a.sezione === 'visti') {
    // un film mollato a meta' non e' un film visto: dirlo uguale era una bugia
    const mollato = a.e.status === 'dropped';
    const parola = t(mollato ? 'bad.lasciato' : 'bad.visto');
    sub.innerHTML = `<b class="${mollato ? 'lasciato' : 'fatto'}">${escapeHtml(parola)}</b>` +
                    (scheda.year ? ' · ' + escapeHtml(String(scheda.year)) : '');
  } else if (a.sezione === 'inArrivo' && a.inArrivoIl) {
    sub.textContent = t('data.esceIl', { x: when(a.inArrivoIl) });
  } else {
    sub.textContent = scheda.year ? String(scheda.year) : '';
  }
}

/* ---------------- la carta di un suggerimento ---------------- */

function cartaSuggerita(x, alCambio) {
  const nome = decodifica(x.title);
  const dove = x.fonte === 'anilist'
    ? `https://anilist.co/anime/${x.id}`
    : `https://simkl.com/${x.tipo === 'anime' ? 'anime' : x.tipo === 'movies' ? 'movies' : 'tv'}/${x.id}/${x.slug || ''}`;

  const el = document.createElement('div');
  el.className = 'card';
  el.title = nome;

  const poster = document.createElement('div');
  poster.className = 'poster';
  if (x.poster) {
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
    img.src = posterUrl(x.poster, true);
    poster.appendChild(img);
  } else {
    const f = document.createElement('div');
    f.className = 'poster-fallback';
    f.textContent = nome;
    poster.appendChild(f);
  }
  poster.appendChild(veloLink(dove));

  /* Le pastiglie dicono in un colpo d'occhio perche' un suggerimento e' li'.
     Due regole imparate misurandole:

     - un angolo, un bollino. In alto a sinistra ci vanno sia il seguito sia la
       data, e quando un titolo aveva tutti e due si stampavano uno sopra
       all'altro. Adesso vince il seguito, e la data resta scritta qui sotto.
     - il rosso vuol dire "hai roba arretrata". Usarlo anche per "te lo
       consigliano in quattro" faceva sembrare urgente un consiglio: quello ha
       un colore suo, neutro. */
  const quanti = x.quante > 1 ? '\u00d7' + x.quante : (x.episodi ? x.episodi + ' ep' : null);
  if (quanti) {
    poster.appendChild(badge('badge-info', quanti, t(x.quante > 1 ? 'bad.quanteAiuto' : 'bad.episodiAiuto')));
  }
  if (x.certo) {
    // "TORNATA" e' la parola per una serie tua che riparte: questo non ce l'hai
    poster.appendChild(badge('badge-back', t('bad.seguito'), t('bad.seguitoAiuto')));
  } else if (x.t) {
    poster.appendChild(badge('badge-soon', when(x.t), t(x.t > Date.now() ? 'bad.escoAiuto' : 'bad.uscitoAiuto')));
  }

  const b = document.createElement('button');
  b.className = 'card-act';
  b.textContent = t('ctrl.nascondi');
  b.title = t('ctrl.nascondiAiuto');
  b.onclick = () => { S.nascoste[chiaveNascosta(x)] = true; save(); alCambio?.(); };
  poster.appendChild(b);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const tit = document.createElement('div');
  tit.className = 'title';
  tit.appendChild(linkTitolo(dove, nome));
  meta.appendChild(tit);

  const sub = document.createElement('div');
  sub.className = 'sub';
  if (x.episode != null && x.t) sub.textContent = t('data.ep', { n: x.episode }) + ' · ' + when(x.t);
  else if (x.t) sub.textContent = when(x.t);
  else if (x.quante > 1) sub.textContent = t('data.consigliataDa', { n: x.quante });
  else if (x.anno) sub.textContent = String(x.anno);
  meta.appendChild(sub);

  if (x.da) {
    const da = document.createElement('div');
    da.className = 'ep';
    const chiave = x.quante ? 'data.perche' : (x.certo || x.anno) ? 'data.seguitoDi' : 'data.segui';
    da.textContent = t(chiave, { x: decodifica(x.da) });
    meta.appendChild(da);
  }

  el.appendChild(poster);
  el.appendChild(meta);
  return el;
}

/* ---------------- fasce ---------------- */

/* Disegna una lista divisa in fasce, con l'intestazione di ognuna.
   Le fasce servono a spezzare i cassoni grandi: la schermata principale per
   quanto è fresco l'episodio, l'archivio per il motivo, i suggerimenti per
   la provenienza. */
function disegnaFasce(host, fasce, fabbrica, piccola = true) {
  host.replaceChildren();
  const frag = document.createDocumentFragment();
  let totale = 0;

  for (const f of fasce) {
    if (!f.items.length) continue;
    totale += f.items.length;

    if (f.chiave !== null) {
      const h = document.createElement('h3');
      h.className = 'band-title';
      h.appendChild(document.createTextNode(t(f.chiave)));
      const n = document.createElement('span');
      n.className = 'band-n';
      n.textContent = f.items.length;
      h.appendChild(n);
      if (f.nota) h.title = t(f.nota);
      frag.appendChild(h);
    }

    const g = document.createElement('div');
    g.className = piccola ? 'grid grid-sm' : 'grid';
    for (const x of f.items) g.appendChild(fabbrica(x));
    frag.appendChild(g);
  }

  host.appendChild(frag);
  return totale;
}
