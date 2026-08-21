/* ================================================================
   Esempio — cosa vede chi non ha ancora collegato niente
   ================================================================

   Prima chi arrivava senza account veniva rimbalzato sulla home e non
   capiva cosa fosse questo sito: leggeva una descrizione e doveva fidarsi.
   Adesso gli spazi si aprono lo stesso, pieni di titoli finti, con una
   fascia in cima che dice chiaramente che è un esempio.

   I titoli sono veri, i numeri no: sono inventati per far cadere ogni
   titolo in una sezione diversa, così si vede a colpo d'occhio a cosa
   servono tutte quante.

   In modo esempio non si salva niente (vedi MODO_ESEMPIO in stato.js):
   la roba finta non deve finire nella memoria del browser.
*/

'use strict';

const ESEMPIO_TITOLI = {
  anime: [
    ['Frieren: Beyond Journey\'s End', 28, 'watch',    { arretrati: 3, uscitoDa: 2 }],
    ['Vinland Saga',                  48, 'watch',     { arretrati: 7, uscitoDa: 52 }],
    ['Jujutsu Kaisen',                47, 'pari',      { traGiorni: 4 }],
    ['Monster',                       74, 'inizia',    {} ],
    ['Vagabond',                      36, 'pausa',     { arretrati: 22, fermoDa: 240, mortaDa: 700 }],
    ['Cowboy Bebop',                  26, 'archivio',  {} ]
  ],
  shows: [
    ['Severance',                     19, 'watch',     { arretrati: 2, uscitoDa: 1 }],
    ['The Bear',                      38, 'watch',     { arretrati: 11, uscitoDa: 64 }],
    ['The Last of Us',                16, 'pari',      { traGiorni: 11 }],
    ['Better Call Saul',              63, 'inizia',    {} ],
    ['Westworld',                     36, 'pausa',     { arretrati: 18, fermoDa: 300, mortaDa: 900 }],
    ['Chernobyl',                      5, 'archivio',  {} ]
  ],
  movies: [
    ['Dune: Part Two',                 0, 'daVedere',  { anno: 2024 }],
    ['Perfect Blue',                   0, 'daVedere',  { anno: 1997 }],
    ['Il seguito che aspetti',         0, 'inArrivo',  { traGiorni: 120 }],
    ['Parasite',                       0, 'visti',     { anno: 2019 }],
    ['Blade Runner 2049',              0, 'visti',     { anno: 2017 }],
    ['Un film lasciato a metà',        0, 'lasciato',  { anno: 2015 }]
  ]
};

const ESEMPIO_SUGGERITI = [
  { id: 9001, tipo: 'anime',  title: 'Frieren: Beyond Journey\'s End 2nd Season', anno: 2026, da: 'Frieren: Beyond Journey\'s End', certo: true, episodi: 24, fascia: 'seguiti' },
  { id: 9002, tipo: 'shows',  title: 'Severance: la terza stagione',              anno: 2026, da: 'Severance',                     episodi: 10, fascia: 'seguiti' },
  { id: 9003, tipo: 'anime',  title: 'Vinland Saga Season 3',                     traGiorni: 9, da: 'Vinland Saga', episodio: 1,   fascia: 'nuove' },
  { id: 9004, tipo: 'shows',  title: 'Dark',                                      quante: 4, da: 'Severance',                      fascia: 'simili' },
  { id: 9005, tipo: 'anime',  title: 'Made in Abyss',                             quante: 3, da: 'Frieren: Beyond Journey\'s End', fascia: 'simili' },
  { id: 9006, tipo: 'movies', title: 'Memories of Murder',                        quante: 2, da: 'Parasite',                       fascia: 'simili' },
  { id: 9007, tipo: 'movies', title: 'Arrival',                                   quante: 2, da: 'Blade Runner 2049',              fascia: 'simili' },
  { id: 9008, tipo: 'shows',  title: 'Una serie appena partita',                  traGiorni: -3, fascia: 'novita' },
  { id: 9009, tipo: 'anime',  title: 'Un anime appena partito',                   traGiorni: -6, fascia: 'novita' }
];

/* Costruisce la libreria finta. I numeri sono scelti a ritroso partendo dalla
   sezione in cui il titolo deve finire, così l'esempio mostra davvero tutte le
   sezioni invece di riempirne una sola. */
function caricaEsempio() {
  MODO_ESEMPIO = true;
  const ora = Date.now();
  const iso = giorni => new Date(ora - giorni * DAY).toISOString();

  S.token = null;
  S.lib = {};
  S.det = {};
  S.meta = {};
  S.cal = {};
  S.nascoste = {};
  S.lastSync = ora;

  for (const [tipo, righe] of Object.entries(ESEMPIO_TITOLI)) {
    righe.forEach(([nome, totali, dove, o], i) => {
      const id = 8000 + i + (tipo === 'anime' ? 0 : tipo === 'shows' ? 100 : 200);
      const key = tipo + ':' + id;
      const anno = o.anno || 2023;

      if (tipo === 'movies') {
        S.lib[key] = voceEsempio(tipo, id, nome, {
          status: dove === 'visti' ? 'completed' : dove === 'lasciato' ? 'dropped' : 'plantowatch',
          totali: 0, visti: 0, nonUsciti: 0, anno,
          guardatoIl: (dove === 'visti' || dove === 'lasciato') ? iso(30 + i * 20) : null
        });
        S.det[key] = { status: null, lastAired: null, enTitle: null, at: ora,
                       released: o.traGiorni ? new Date(ora + o.traGiorni * DAY).toISOString() : null };
        return;
      }

      const visti = dove === 'inizia' ? 0
                  : dove === 'archivio' ? totali
                  : dove === 'pari' ? totali - 2
                  : totali - (o.arretrati || 1);
      const nonUsciti = dove === 'pari' ? 2 : 0;

      S.lib[key] = voceEsempio(tipo, id, nome, {
        status: dove === 'inizia' ? 'plantowatch' : dove === 'archivio' ? 'completed' : 'watching',
        totali, visti: Math.max(0, visti), nonUsciti, anno,
        guardatoIl: dove === 'inizia' ? null : iso(o.fermoDa ?? 4),
        uscitoIl: o.uscitoDa != null ? iso(o.uscitoDa) : null
      });

      S.det[key] = {
        status: dove === 'pausa' || dove === 'archivio' ? 'ended' : 'airing',
        lastAired: iso(o.mortaDa ?? o.uscitoDa ?? 10),
        released: null, enTitle: null, at: ora
      };
      if (o.traGiorni) S.cal['sk:' + id] = { t: ora + o.traGiorni * DAY, season: 2, episode: 1 };
    });
  }

  // i suggerimenti, uno per fascia e per spazio
  const per = f => ESEMPIO_SUGGERITI.filter(x => x.fascia === f).map(x => ({
    ...x,
    poster: null,
    t: x.traGiorni != null ? ora + x.traGiorni * DAY : null
  }));
  S.seguiti = per('seguiti');
  S.nuove = per('nuove');
  S.simili = per('simili');
  S.novita = per('novita');
  S.consigliAt = ora;
}

function voceEsempio(tipo, id, nome, o) {
  const arretrati = Math.max(0, o.totali - o.nonUsciti - o.visti);
  return {
    _type: tipo,
    _id: id,
    _esempio: true,
    status: o.status,
    total_episodes_count: o.totali,
    not_aired_episodes_count: o.nonUsciti,
    watched_episodes_count: o.visti,
    last_watched_at: o.guardatoIl,
    last_watched: o.visti ? 'E' + o.visti : null,
    next_to_watch: arretrati ? 'E' + (o.visti + 1) : null,
    next_to_watch_info: arretrati
      ? { title: '', episode: o.visti + 1, season: 1, date: o.uscitoIl }
      : undefined,
    show: { title: nome, poster: null, year: o.anno, ids: { simkl: id, slug: '' } }
  };
}
