# Dashboard Serie

Una pagina sola che legge il tuo account Simkl e ti mostra **cosa devi guardare adesso**.

Simkl resta il database e il tracker automatico: le estensioni continuano a segnare
gli episodi visti come sempre. Questa dashboard si limita a leggere e a riordinare.

**Non scrive mai niente sul tuo account Simkl.** Nessun episodio segnato, nessuna
serie spostata di lista, nessuna valutazione. Sola lettura.

---

## Dove sta

**https://spidahh.github.io/dashboard-serie/**

Aprilo e basta. Niente da installare, niente server da far partire.

La prima volta ti chiede di collegare Simkl: compare un codice di 5 caratteri, lo
inserisci su [simkl.com/pin](https://simkl.com/pin) e hai finito. Il collegamento
dura circa 5 anni.

Il collegamento vale per quel dispositivo: sul telefono lo rifai una volta.

### Installarlo come app

Sul telefono: menù del browser → *Aggiungi a schermata Home*.
Sul computer: l'icona di installazione nella barra degli indirizzi.

Da lì in poi si apre a schermo intero come un'app, e resta apribile anche senza rete.

### Lavorarci in locale

Serve solo per modificare il codice: doppio clic su **`avvia.cmd`**, che apre
`http://localhost:5173`. La finestra nera del server deve restare aperta.

In locale il service worker è disattivato apposta, altrimenti continuerebbe a
servire i file vecchi mentre lavori.

---

## Da dove arrivano i dati

**Stato oggi:** l'unica sorgente accesa è **Simkl**. AniList e Trakt sono scritti e
funzionanti, ma spenti: in `app.js` mancano i loro `client_id`, e finché mancano il
pulsante non compare nemmeno. Le istruzioni per accenderli sono qui sotto.

**Simkl** è la sorgente principale: serie TV e anime, col tracciamento automatico.
I film restano fuori: la dashboard legge solo le liste `shows` e `anime`, e nessuna
sezione li conta.

**AniList** si può collegare come seconda sorgente, e copre i soli anime. Entra senza
bisogno di un server perché il suo login non richiede nessun segreto: AniList rimanda
il token dentro l'indirizzo. Le sue voci vengono tradotte nella stessa forma di quelle
Simkl, quindi tutte le regole valgono uguali.

Se colleghi tutti e due, uno stesso anime presente in entrambi compare una volta sola:
tengo quello di Simkl, che porta più dati.

Per attivarlo serve un `client_id` di AniList, da creare su
[anilist.co/settings/developer](https://anilist.co/settings/developer) mettendo come
indirizzo di ritorno quello del sito. Finché manca, il pulsante non compare.

**Trakt** copre le serie TV. È l'unica sorgente che ha bisogno di un pezzetto di
server, perché consegna il token solo dietro un segreto. Il file
[`worker/trakt-token.js`](worker/trakt-token.js) è quel pezzetto: venti righe su
Cloudflare che fanno *solo* lo scambio del token. Tutte le altre chiamate partono dal
browser come per gli altri.

**MyAnimeList** resta fuori: il suo server non accetta chiamate dal browser, quindi ci
vorrebbe un proxy per ogni singola richiesta, cioè un server vero da mantenere.

**TV Time** ha chiuso il 15 luglio 2026.

### Come si accende una sorgente

Tutte e due si spengono da sole se non sono configurate: il pulsante non compare
nemmeno, invece di dare errore.

**AniList** — due minuti, niente server.

1. vai su [anilist.co/settings/developer](https://anilist.co/settings/developer) e crea
   un client
2. come indirizzo di ritorno metti quello del sito, per esempio
   `https://spidahh.github.io/dashboard-serie/`
3. copia il numero del client in `CFG.anilist.clientId` dentro `app.js`

**Trakt** — serve anche il Worker.

1. registra l'app su [trakt.tv/oauth/applications/new](https://trakt.tv/oauth/applications/new),
   con redirect URI `urn:ietf:wg:oauth:2.0:oob`
2. segui le istruzioni in cima a [`worker/trakt-token.js`](worker/trakt-token.js) per
   metterlo su Cloudflare (piano gratuito)
3. copia Client ID e indirizzo del Worker in `CFG.trakt` dentro `app.js`

Il `client_secret` di Trakt **non** va mai in `app.js`: vive solo dentro il Worker, come
variabile cifrata.

## Le sezioni

| Sezione | Cosa contiene |
|---|---|
| **Da guardare ora** | Episodi usciti e non ancora visti. È la schermata principale. |
| **In pari** | Hai visto tutti gli episodi usciti. Dove si sa, c'è la data del prossimo. |
| **Da scoprire** | Roba che non hai in lista: stagioni nuove, consigli, novità appena partite. |
| **In pausa** | Hanno arretrati, ma sei fermo da troppo tempo. |
| **Da iniziare** | Il tuo "Plan to watch", più le serie che hai in lista ma non hai mai aperto. |
| **Archivio** | Niente di nuovo in vista. Diviso in *Finite* e *Abbandonate*. |

Al primo avvio *Da guardare ora*, *In pari* e *Da scoprire* sono aperte; *In pausa*,
*Da iniziare* e *Archivio* sono chiuse. Si aprono e si chiudono con un clic sul
titolo, e restano come le lasci anche dopo aver ricaricato.

### La riga in testata

Sotto al titolo c'è il dato che riassume tutto: **quanti episodi ti aspettano, su
quante serie**, e quanti sono appena usciti. È la riga da leggere aprendo la pagina.

### Ordinamento e filtri

**Tipo** e **ricerca** restringono tutta la libreria, non solo la sezione che stai
guardando. Perciò cambiano anche i numeri nel menù: con "Anime" acceso, *In pausa*
passa da 99 a 10 perché sta contando i soli anime.

Quando un filtro è acceso compare una fascia azzurra che lo dice, con il pulsante
**Mostra tutto** per toglierlo.

**Ordina** invece non toglie niente: cambia solo l'ordine. Vale per **tutte** le
sezioni, non solo per la prima.

In *In pari* l'ordine predefinito mette davanti le serie con una data, dalla più
vicina; quelle senza data vanno in fondo.

### Scorciatoie

| Tasto | Cosa fa |
|---|---|
| `/` | porta il cursore nella ricerca |
| `Esc` | svuota la ricerca, o chiude le impostazioni |

Ogni voce del menù, ogni pastiglia sul poster e ogni pulsante hanno una spiegazione
che compare passandoci sopra il mouse.

### Il menù a sinistra

Ogni voce porta il suo conteggio. Cliccandola **la pagina mostra solo quella
sezione**, già aperta: è il modo rapido per andare in Archivio o in Pausa senza
scorrere. "Tutte le categorie" rimette a posto tutto com'era.

Sotto "Da guardare ora" compaiono le due fasce (*Appena usciti*, *Più indietro*):
quelle non filtrano, portano il punto giusto sotto gli occhi.

Su schermi stretti il menù diventa una barra orizzontale sopra al contenuto.

### Come è disposta la pagina

Due zone: il menù stretto a sinistra, il contenuto a destra che si prende tutto il
resto dello spazio.

Con **Tutte le categorie** selezionato il riquadro grande contiene tutte le categorie, una sotto
l'altra, ognuna col suo titolo apribile. Cliccando una singola voce del menù, a
destra resta **solo quella schermata**.

Sotto i 1100px il menù passa sopra al contenuto, in orizzontale.

**Regola di fondo:** una serie finisce **In pausa** solo se ci sono episodi usciti
che non hai visto. Se sei in pari e stai solo aspettando la stagione nuova, va in
**In attesa** — non è roba da recuperare, quindi non ti sporca la schermata.

### La schermata principale

Le serie sono divise in due fasce, per quanto è fresco l'episodio:
**Appena usciti** (nell'ultimo mese) e **Più indietro** (da prima). Così vedi
subito cosa è arrivato di recente e cosa ti stai trascinando.

Le fasce compaiono con l'ordinamento predefinito. Con gli altri ordinamenti la
griglia torna unica.

### Le pastiglie sul poster

| Pastiglia | Vuol dire |
|---|---|
| **✓** (verde) | hai visto tutti gli episodi usciti finora |
| **NUOVO** (blu) | un episodio solo, uscito negli ultimi 7 giorni |
| **+7** (rosso) | quanti episodi hai arretrati |
| **TORNATA** (verde) | era ferma, ma è uscita roba nuova |
| **tra 3 giorni** | quando esce il prossimo |
| **ANIME** | è un anime (in basso a sinistra; sul telefono non compare) |

### Il badge TORNATA

Verde, in alto a sinistra. Vuol dire: **questa serie era ferma, ma è uscita roba nuova.**

Scatta in tre casi:
1. il prossimo episodio da vedere è uscito da meno di 45 giorni;
2. il numero totale di episodi è cresciuto negli ultimi 45 giorni (stagione nuova);
3. la serie compare nel calendario dei prossimi 33 giorni.

Il caso 2 vale anche per le serie che avevi **completato** anni fa. È quello che
riporta a galla una serie che torna dopo due anni.

---

## Le regole, in chiaro

Per ogni titolo la dashboard calcola gli **arretrati**:

```
arretrati = episodi totali − episodi non ancora usciti − episodi visti
```

Poi decide dove metterlo:

- arretrati ≥ 1 e l'hai guardata di recente → **Da guardare ora**
- arretrati ≥ 1, sei fermo da un pezzo, ma **la serie è ancora calda** → **Da guardare ora**
- arretrati ≥ 1, sei fermo da un pezzo e la serie è fredda → **In pausa**
- ...a meno che non ci sia un segnale recente → **Da guardare ora** con badge TORNATA
- zero arretrati → **In pari**, con la data del prossimo episodio se si sa
- abbandonata e senza novità → **Archivio**, sempre

Con zero arretrati non finisce **mai** in pausa: non c'è niente da recuperare.

Quando hai visto tutti gli episodi usciti, sotto al poster c'è scritto **Completo**
e sulla copertina compare una spunta verde. Prima diceva "visto fino a S02E10", che
faceva sembrare che fossi rimasto indietro.
E una serie che hai abbandonato non compare mai tra quelle in attesa o in arrivo:
non stai aspettando niente.

**Zero episodi visti** non vuol dire "messa in pausa": vuol dire mai cominciata.
Quelle vanno in *Da iniziare*, non in *In pausa*. Se però è appena uscita resta in
griglia, come qualunque altra cosa fresca.

### Da scoprire

Tre fasce, tutte con roba che **non hai in lista su Simkl**.

**Stagioni nuove di serie che segui** — vedi sotto come le trova.

**Ti potrebbero piacere** — Simkl, dentro la scheda di ogni serie, tiene la lista
di cosa guarda chi ha visto quella. La dashboard parte dai tuoi dieci titoli
migliori (prima quelli con il voto più alto, poi i più recenti) e mette insieme i
loro consigli. Un titolo solo non può portare più di quattro consigli, altrimenti
una serie sola riempirebbe tutta la lista.

**Appena uscite** — serie e anime partiti da poco, presi dalle premiere di Simkl.

Si aggiorna una volta a settimana e costa una dozzina di chiamate. Quello che hai
già in lista non compare mai, e il pulsante **nascondi** toglie per sempre un
consiglio che non c'entra niente.

### Stagioni nuove che non hai in libreria

Su Simkl ogni stagione di un anime è spesso una **voce separata**, e il tracker
automatico la aggiunge solo quando ne guardi un episodio. Finché non lo fai, la
stagione nuova per la dashboard non esiste: legge le tue liste, e lì non c'è.

Per pescarla lo stesso, la dashboard confronta il calendario dei prossimi 33 giorni
con quello che hai già. Se sta uscendo un titolo che non hai ma che ha la stessa
radice di uno che segui, te lo segnala:

```
Bleach: Sennen Kessen Hen - Kashin Tan   →  radice "bleach"  →  ce l'hai: Bleach
```

La radice si ricava tagliando il sottotitolo dopo i due punti e togliendo in coda
le parole di stagione e i numeri, romani compresi.

**Se una stagione l'hai mollata a metà, la successiva non te la propongo.** Non
avrebbe senso consigliarti la quarta stagione di una serie che hai abbandonato alla
terza senza finirla. Serve che con quella serie tu sia in buoni rapporti: almeno una
completata, o una che stai guardando davvero.

**È un confronto sui nomi, non su un collegamento ufficiale.** Simkl non espone il
legame fra le stagioni di una stessa serie. Sugli anime funziona bene perché il
prefisso resta uguale, ma qualche accostamento sbagliato ci sarà: su ogni
segnalazione c'è il pulsante **nascondi**, e quella non torna più.

Il calendario è un file pubblico su CDN: non consuma quota API.

### Quando i contatori di Simkl sbagliano

Gli arretrati si contano con una sottrazione, ma i contatori di Simkl a volte
restano indietro, e su una serie da mille episodi basta poco per far comparire
roba che hai già visto. Quando Simkl dice che non c'è un prossimo episodio, la
dashboard crede a quello e non alla sottrazione.

### Le quattro soglie, e perché sono quattro

Sono cose diverse e vanno tenute separate.

| Cursore | Misura | Predefinito |
|---|---|---|
| **Pausa** | da quanto non guardi **tu** | 60 giorni |
| **Calda** | da quanto la **serie** non manda in onda niente | 90 giorni |
| **Abbandono** | oltre questo l'hai mollata, in onda o no | 365 giorni |
| **Tornata** | quanto dev'essere fresca la novità per farla risalire | 45 giorni |

Il caso che ha reso necessaria la seconda soglia — due serie che sei fermo da
tre mesi su entrambe:

```
serie A   ultimo episodio uscito     53 giorni fa   → c'è poco da recuperare
serie B   ultimo episodio uscito   1362 giorni fa   → è morta e sepolta
```

Guardando solo da quanto tempo sei fermo **tu**, quelle due sono identiche. Sono
diversissime. Serve sapere quando è uscito l'ultimo episodio **della serie**.

Il caso che ha reso necessaria la terza: i programmi che non finiscono mai —
telegiornali, reality, talent — restano `airing` per sempre. Uno mollato due anni
fa, con duecento episodi arretrati, resterebbe in griglia in eterno. Oltre la
soglia di abbandono ci vuole un episodio davvero nuovo per tornare su.

### Da dove arriva "quando è uscito l'ultimo episodio"

`/sync/all-items` non ce l'ha: sa solo quando hai guardato tu. Il dato sta nella
scheda della singola serie (`/tv/{id}` o `/anime/{id}`), che pesa 3,5 KB e contiene
`status` e `last_aired`.

La dashboard le scarica a 3 richieste al secondo, meno di un terzo del limite
consentito — il limite vale per `client_id`, non per persona, quindi se il sito lo
usano in tanti i primi avvii si sommano — dando
la precedenza ai titoli con arretrati — gli unici dove la scheda cambia una
decisione. Poi tiene tutto in cache: 60 giorni per le serie concluse, 3 giorni per
quelle ancora in onda. Il grosso succede una volta sola; dopo è istantaneo.

L'alternativa era scaricare l'archivio mensile del calendario: 12 MB contro 600 KB.

### I titoli degli anime

Simkl restituisce il titolo romanizzato — *Tongari Boushi no Atelier* invece di
*Witch Hat Atelier*, *Kenpuu Denki Berserk* invece di *Berserk*.

Il titolo ufficiale in inglese non c'è in `/sync/all-items`: sta solo nella scheda
della serie, campo `en_title`, e riguarda i soli anime (le serie TV hanno già il
titolo giusto). Per averlo ovunque la dashboard scarica la scheda di **tutti** i
titoli, non solo di quelli con arretrati.

Lo fa in due tempi:

1. prima le schede che servono a decidere dove va una serie (quelle con arretrati);
2. poi, **in sottofondo e senza bloccare niente**, tutte le altre, solo per i titoli.

La pagina è utilizzabile da subito e i titoli si sistemano mentre la usi. Succede
una volta sola: un titolo non cambia più, quindi resta in cache per sempre.

Se preferisci i titoli originali, c'è l'interruttore nelle impostazioni.
La ricerca funziona con entrambi: cerchi il romaji o l'inglese, trovi lo stesso titolo.

In più Simkl codifica i caratteri speciali (`Howl&#039;s Moving Castle`): la
dashboard li riporta in chiaro.

Tutte e quattro le soglie si cambiano con i cursori nelle impostazioni, e il
risultato si aggiorna mentre trascini.

Se una singola serie finisce nel posto sbagliato, passa il mouse sul poster:
compare un pulsantino **in pausa** / **riprendi** che vale solo per quella.

---

## Aggiornamento dati

Simkl impone regole precise a chi usa le sue API, e questa dashboard le rispetta:

1. chiede sempre prima `/sync/activities`, che è una risposta minuscola;
2. se niente è cambiato, si ferma lì;
3. solo se qualcosa è cambiato scarica il **delta**, con `date_from`;
4. la libreria intera la scarica una volta sola, al primo avvio.

Quando aggiorna: all'apertura, quando torni sulla scheda, ogni 15 minuti mentre la
pagina è aperta e visibile, e con il pulsante ↻. Nessun timer cieco in sottofondo.

Sono circa 2 chiamate per aggiornamento contro un limite di 10 al secondo.

---

## Sul telefono

I file sono statici: se li metti su GitHub Pages, Cloudflare Pages o Netlify, la
pagina diventa installabile come app. Su Android e iOS: menù del browser →
"Aggiungi a schermata Home".

Il collegamento a Simkl va rifatto su ogni dispositivo (sempre col codice PIN).

---

## Se qualcosa non va

**"Il collegamento con Simkl è scaduto"** — hai revocato l'accesso da
[Connected Apps](https://simkl.com/settings/connected-apps/). Ricollega.

**Una serie sta nella sezione sbagliata** — usa il pulsantino sul poster, oppure
sposta i cursori nelle impostazioni.

**I conteggi sembrano sbagliati** — Impostazioni → *Risincronizza tutto*. Riscarica
la libreria da zero.

**Poster mancanti** — passano da `wsrv.nl`, il proxy immagini raccomandato da Simkl.
Se è irraggiungibile compare il titolo al posto della copertina.

---

## I file

| File | Cosa fa |
|---|---|
| `index.html` | struttura della pagina |
| `guida.html` | la guida per chi parte da zero |
| `app.css` | aspetto, per tutte e due le pagine |
| `app.js` | tutta la logica: login, sincronizzazione, regole, disegno |
| `sw.js` | fa aprire la pagina anche senza rete |
| `manifest.webmanifest` | serve per installarla come app |
| `icon.svg` | l'icona, unica per sito e app |
| `avvia.cmd` | avvia il server locale |
| `worker/trakt-token.js` | il Cloudflare Worker di Trakt, l'unico pezzo di server |

Il numero di versione negli indirizzi (`?v=`) sta in tre posti: `index.html`,
`guida.html` e la costante `VERSIONE` di `sw.js`. Vanno tenuti uguali; se uno resta
indietro, `app.js` lo scrive nella console del browser invece di lasciarti indovinare.

Niente librerie esterne, niente compilazione, niente server tuo, nessun costo.
I dati stanno solo nel browser (`localStorage`).

---

## Dati tecnici

- Endpoint Simkl usati: `/oauth/pin` e `/oauth/pin/{codice}` per il collegamento;
  `/sync/activities` e `/sync/all-items` per la libreria; `/tv/{id}` e `/anime/{id}`
  per la scheda della singola serie (stato, ultima uscita, titolo inglese, consigli);
  `/tv/premieres/new` e `/anime/premieres/new` per le novità; e i file pubblici
  `data.simkl.in/calendar/*.json`, che non consumano quota
- Autenticazione: OAuth 2.0, flusso PIN. Il `client_secret` non serve e non è nel codice.
- Il `client_id` è in `app.js`. Non è un segreto: viaggia in ogni URL dell'API.
