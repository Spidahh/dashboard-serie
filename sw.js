/* Service worker: tiene la pagina apribile anche senza rete.
   I dati arrivano sempre dalla rete o dalla memoria del browser, mai da qui. */

const CACHE = 'dashboard-serie-v6';
// gli stessi indirizzi che chiede la pagina, numero di versione compreso
const SHELL = ['./', './index.html', './app.css?v=6', './app.js?v=6', './icon.svg', './manifest.webmanifest'];

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
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
