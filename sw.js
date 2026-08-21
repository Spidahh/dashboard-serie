/* Service worker: tiene la pagina apribile anche senza rete.
   I dati arrivano sempre dalla rete o dalla memoria del browser, mai da qui. */

/* UNICO posto dove il numero di versione compare in questo file: da qui escono
   sia il nome della cache sia gli indirizzi dello shell.
   Va tenuto uguale al ?v= di index.html e guida.html. Se qualcuno se ne dimentica
   uno, app.js se ne accorge da solo e lo scrive nella console. */
const VERSIONE = '30';

const CACHE = 'dashboard-serie-v' + VERSIONE;
// gli stessi indirizzi che chiedono le pagine, numero di versione compreso
const PAGINE = ['./', './index.html', './anime.html', './serie.html', './film.html',
                './impostazioni.html', './guida.html'];
const CODICE = ['lingua', 'stato', 'fonti', 'regole', 'carte', 'telaio', 'spazio', 'esempio', 'home', 'impostazioni']
                 .map(n => `./js/${n}.js?v=${VERSIONE}`);
const SHELL = [...PAGINE, `./app.css?v=${VERSIONE}`, ...CODICE,
               './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // API e immagini passano dritte alla rete

  /* Prima la rete, e con revalidazione forzata: GitHub Pages dichiara i file
     validi per 10 minuti, quindi senza `no-cache` il browser continuerebbe a
     servire la versione vecchia anche dopo una modifica. La cache qui sotto
     resta solo come rete di sicurezza per quando manca la connessione. */
  ev.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      /* caches.match(richiesta, opzioni): il secondo argomento sono le opzioni,
         non un secondo indirizzo. guida.html sta gia' nello shell, quindi la
         trova la riga qui sopra; l'ultimo ripiego e' la pagina principale. */
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
