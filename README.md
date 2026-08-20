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

## Le sezioni

| Sezione | Cosa contiene |
|---|---|
| **Da guardare ora** | Episodi usciti e non ancora visti. È la schermata principale. |
| **In arrivo** | Sei in pari e c'è già una data per il prossimo episodio. |
| **Stagioni nuove che non hai** | Stanno uscendo, sembrano seguiti di roba che segui, ma su Simkl non ce le hai. |
| **In attesa** | Sei in pari, ma la data non è ancora stata annunciata. |
| **In pausa** | Hanno arretrati, ma sei fermo da troppo tempo. |
| **Da iniziare** | Il tuo "Plan to watch", più le serie che hai in lista ma non hai mai aperto. |
| **Archivio** | Completate e abbandonate senza novità. |

Tutte tranne la prima sono chiuse: si aprono con un clic sul titolo, e restano
come le lasci anche dopo aver ricaricato.

### Il menù a sinistra

Ogni voce porta il suo conteggio. Cliccandola **la pagina mostra solo quella
sezione**, già aperta: è il modo rapido per andare in Archivio o in Pausa senza
scorrere. "Tutto" rimette a posto tutto com'era.

Sotto "Da guardare ora" compaiono le due fasce (*Appena usciti*, *Più indietro*):
quelle non filtrano, portano il punto giusto sotto gli occhi.

Su schermi stretti il menù diventa una barra orizzontale sopra al contenuto.

### Come è disposta la pagina

Due zone: il menù stretto a sinistra, il contenuto a destra che si prende tutto il
resto dello spazio.

Con **Tutto** selezionato il riquadro grande contiene tutte le categorie, una sotto
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
| **NUOVO** (blu) | un episodio solo, uscito negli ultimi 7 giorni |
| **+7** (rosso) | quanti episodi hai arretrati |
| **TORNATA** (verde) | era ferma, ma è uscita roba nuova |
| **tra 3 giorni** | quando esce il prossimo |

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
- zero arretrati e una data nota → **In arrivo**
- zero arretrati e nessuna data → **In attesa**
- abbandonata e senza novità → **Archivio**, sempre

Con zero arretrati non finisce **mai** in pausa: non c'è niente da recuperare.
E una serie che hai abbandonato non compare mai tra quelle in attesa o in arrivo:
non stai aspettando niente.

**Zero episodi visti** non vuol dire "messa in pausa": vuol dire mai cominciata.
Quelle vanno in *Da iniziare*, non in *In pausa*. Se però è appena uscita resta in
griglia, come qualunque altra cosa fresca.

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

### Le tre soglie, e perché sono tre

Sono cose diverse e vanno tenute separate.

| Cursore | Misura | Predefinito |
|---|---|---|
| **Pausa** | da quanto non guardi **tu** | 60 giorni |
| **Calda** | da quanto la **serie** non manda in onda niente | 90 giorni |
| **Abbandono** | oltre questo l'hai mollata, in onda o no | 365 giorni |

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

La dashboard le scarica a 5 richieste al secondo, metà del limite consentito, dando
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
| `app.css` | aspetto |
| `app.js` | tutta la logica: login, sincronizzazione, regole, disegno |
| `sw.js` | fa aprire la pagina anche senza rete |
| `manifest.webmanifest` | serve per installarla come app |
| `avvia.cmd` | avvia il server locale |

Niente librerie esterne, niente compilazione, niente server tuo, nessun costo.
I dati stanno solo nel browser (`localStorage`).

---

## Dati tecnici

- Endpoint usati: `/oauth/pin`, `/sync/activities`, `/sync/all-items`,
  e i file pubblici `data.simkl.in/calendar/*.json`
- Autenticazione: OAuth 2.0, flusso PIN. Il `client_secret` non serve e non è nel codice.
- Il `client_id` è in `app.js`. Non è un segreto: viaggia in ogni URL dell'API.
