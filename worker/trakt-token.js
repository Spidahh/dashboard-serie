/* ================================================================
   Cloudflare Worker — l'unico pezzo di server di tutto il progetto
   ================================================================

   A cosa serve, e solo a questo: Trakt consegna il token di accesso
   soltanto a chi presenta il client_secret. In una pagina web il codice lo
   legge chiunque, quindi lì un segreto non ci può stare.

   Questo pezzetto sta in mezzo: la pagina gli manda il codice del dispositivo,
   lui aggiunge il segreto (che vive solo qui) e restituisce il token.
   Non vede la tua libreria, non tiene niente, non scrive da nessuna parte.
   Tutto il resto delle chiamate a Trakt parte direttamente dal tuo browser.

   ----------------------------------------------------------------
   Come si mette su, una volta sola:

   1. Registra l'app su https://trakt.tv/oauth/applications/new
      - Redirect URI: urn:ietf:wg:oauth:2.0:oob
      - segnati Client ID e Client Secret

   2. Su https://dash.cloudflare.com  →  Workers & Pages  →  Create Worker
      - incolla questo file
      - Settings → Variables → aggiungi tre variabili:
          TRAKT_CLIENT_ID       il Client ID
          TRAKT_CLIENT_SECRET   il Client Secret   (spunta "Encrypt")
          ORIGINE_CONSENTITA    https://spidahh.github.io
      - Deploy

   3. Copia l'indirizzo del Worker in CFG.trakt.worker dentro app.js

   Il piano gratuito di Cloudflare basta e avanza: questo viene chiamato
   una volta al collegamento e una volta a settimana per il rinnovo.
   ================================================================ */

const TRAKT = 'https://api.trakt.tv';

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ORIGINE_CONSENTITA || '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400'
    };

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return risposta({ error: 'usa POST' }, 405, cors);

    if (!env.TRAKT_CLIENT_ID || !env.TRAKT_CLIENT_SECRET) {
      return risposta({ error: 'worker non configurato: mancano TRAKT_CLIENT_ID o TRAKT_CLIENT_SECRET' }, 500, cors);
    }

    let corpo;
    try { corpo = await req.json(); } catch { return risposta({ error: 'corpo non valido' }, 400, cors); }

    // Due sole operazioni: prendere il token, e rinnovarlo quando scade.
    const comune = { client_id: env.TRAKT_CLIENT_ID, client_secret: env.TRAKT_CLIENT_SECRET };
    let percorso, dati;

    if (corpo.azione === 'rinnova') {
      if (!corpo.refresh_token) return risposta({ error: 'manca refresh_token' }, 400, cors);
      percorso = '/oauth/token';
      dati = { ...comune, refresh_token: corpo.refresh_token,
               redirect_uri: 'urn:ietf:wg:oauth:2.0:oob', grant_type: 'refresh_token' };
    } else {
      if (!corpo.code) return risposta({ error: 'manca code' }, 400, cors);
      percorso = '/oauth/device/token';
      dati = { ...comune, code: corpo.code };
    }

    const r = await fetch(TRAKT + percorso, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    });

    /* Il 400 durante l'attesa vuol dire "l'utente non ha ancora confermato":
       lo lascio passare così com'è, la pagina sa cosa farci. */
    const testo = await r.text();
    return new Response(testo || '{}', {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
};

function risposta(oggetto, stato, cors) {
  return new Response(JSON.stringify(oggetto), {
    status: stato,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}
