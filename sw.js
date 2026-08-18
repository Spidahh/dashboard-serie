/* Service worker: tiene la pagina apribile anche senza rete.
   I dati arrivano sempre dalla rete o dalla memoria del browser, mai da qui. */

const CACHE = 'dashboard-serie-v1';
const SHELL = ['./', './index.html', './app.css', './app.js', './icon.svg', './manifest.webmanifest'];

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

  // prima la rete: così le modifiche ai file si vedono subito; la cache è solo la rete di sicurezza
  ev.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
