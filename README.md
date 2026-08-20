# Dashboard Serie

Un sito che legge i tuoi account e ti mostra **cosa devi guardare adesso**.

Simkl, Trakt e AniList restano i tracker: le loro estensioni continuano a segnare
gli episodi visti come sempre. Questo sito si limita a leggere e a riordinare.

**Non scrive mai niente sui tuoi account.** Nessun episodio segnato, nessuna serie
spostata di lista, nessuna valutazione. Sola lettura, su tutti e tre.

---

## Dove sta

**https://spidahh.github.io/dashboard-serie/**

Aprilo e basta. Niente da installare, niente server da far partire.

La home spiega cosa serve e da lì si collega un account. La prima volta compare un
codice di pochi caratteri, lo inserisci sul sito del servizio e hai finito.

Il collegamento vale per quel dispositivo: sul telefono lo rifai una volta.

Il sito è in **italiano e inglese**. Le due lettere in alto a destra cambiano lingua
senza ricaricare la pagina, e la scelta resta.

---

## Com'è fatto

Sei pagine, un codice solo.

| Pagina | Cosa c'è |
|---|---|
| `index.html` | la home: cosa è, come collegarsi, e i tre spazi con i loro conti |
| `anime.html` | lo spazio **Anime** |
| `serie.html` | lo spazio **Serie TV** |
| `film.html` | lo spazio **Film** |
| `impostazioni.html` | servizi, lingua, soglie, manutenzione |
| `guida.html` | la guida per chi parte da zero |

### I tre spazi

**Anime, serie TV e film sono tenuti separati.** Ognuno ha la sua pagina, il suo menù
e i suoi conti; quando apri gli anime, le serie TV non ci sono proprio. Prima erano
tutti nello stesso elenco con un filtro in alto, e i numeri nel menù cambiavano sotto
gli occhi ogni volta che lo toccavi.

Le tre pagine sono lo stesso codice: cambia una riga, quale spazio sono. Una modifica
alla schermata degli anime arriva da sola anche a quella dei film.

### Le sezioni delle serie

| Sezione | Cosa contiene |
|---|---|
| **Da guardare ora** | Episodi usciti e non ancora visti. È la schermata principale. |
| **In pari** | Hai visto tutti gli episodi usciti. Dove si sa, c'è la data del prossimo. |
| **Da scoprire** | Roba che non hai in lista: seguiti, stagioni nuove, consigli, novità. |
| **In pausa** | Hanno arretrati, ma sei fermo da troppo tempo. |
| **Da iniziare** | Quello che hai in lista ma non hai mai aperto. |
| **Archivio** | Niente di nuovo in vista. Diviso in *Finite* e *Abbandonate*. |

Al primo avvio *Da guardare ora*, *In pari* e *Da scoprire* sono aperte; le altre
chiuse. Si aprono con un clic sul titolo e restano come le lasci.

### Le sezioni dei film

Un film non ha episodi arretrati, quindi le domande sono due sole: l'hai visto? e se
non l'hai visto, è già uscito?

| Sezione | Cosa contiene |
|---|---|
| **Da vedere** | In lista e già usciti. È la schermata principale dei film. |
| **In arrivo** | In lista ma non ancora usciti, con la data. |
| **Da scoprire** | Consigliati da chi ha visto i tuoi stessi film. |
| **Visti** | Quelli visti, e in fondo quelli **lasciati a metà**, che non sono la stessa cosa. |

I film segnati "non mi interessa" non compaiono da nessuna parte: l'hai già detto tu.

---

## Da dove arrivano i dati

**Stato oggi:** l'unica sorgente accesa è **Simkl**. AniList e Trakt sono scritti e
funzionanti, ma spenti: in `js/stato.js` mancano i loro `client_id`, e finché mancano
il pulsante compare come *non configurato* invece di dare errore. Le istruzioni per
accenderli sono più sotto.

**Simkl** è la sorgente principale: serie TV, anime e film, col tracciamento automatico.

**AniList** copre i soli anime, ed entra senza server perché il suo login non richiede
nessun segreto: rimanda il token dentro l'indirizzo. È anche l'unico dei tre che
**dichiara i seguiti** di una serie, invece di farmeli indovinare dal titolo.

**Trakt** copre serie TV e film. È l'unica sorgente che ha bisogno di un pezzetto di
server, perché consegna il token solo dietro un segreto. Il file
[`worker/trakt-token.js`](worker/trakt-token.js) è quel pezzetto: venti righe su
Cloudflare che fanno *solo* lo scambio del token.

**MyAnimeList** resta fuori: il suo server non accetta chiamate dal browser, quindi ci
vorrebbe un proxy per ogni singola richiesta, cioè un server vero da mantenere.

**TV Time** ha chiuso il 15 luglio 2026.

Se colleghi più servizi, lo stesso titolo presente in due posti compare una volta
sola: tengo quello di Simkl, che porta più dati. Il confronto guarda tutti i nomi che
un titolo ha, non solo quello mostrato, perché Simkl manda il romanizzato e gli altri
l'inglese.

### Come si accende una sorgente

**AniList** — due minuti, niente server.

1. vai su [anilist.co/settings/developer](https://anilist.co/settings/developer) e crea
   un client
2. come indirizzo di ritorno metti quello del sito, per esempio
   `https://spidahh.github.io/dashboard-serie/`
3. copia il numero del client in `CFG.anilist.clientId` dentro `js/stato.js`

**Trakt** — serve anche il Worker.

1. registra l'app su [trakt.tv/oauth/applications/new](https://trakt.tv/oauth/applications/new),
   con redirect URI `urn:ietf:wg:oauth:2.0:oob`
2. segui le istruzioni in cima a [`worker/trakt-token.js`](worker/trakt-token.js) per
   metterlo su Cloudflare (piano gratuito)
3. copia Client ID e indirizzo del Worker in `CFG.trakt` dentro `js/stato.js`

Il `client_secret` di Trakt **non** va mai nel codice della pagina: vive solo dentro
il Worker, come variabile cifrata.

---

## Le regole, in chiaro

Per ogni serie si calcolano gli **arretrati**:

```
arretrati = episodi totali − episodi non ancora usciti − episodi visti
```

Poi si decide dove metterla:

- arretrati ≥ 1 e l'hai guardata di recente → **Da guardare ora**
- arretrati ≥ 1, sei fermo da un pezzo, ma **la serie è ancora calda** → **Da guardare ora**
- arretrati ≥ 1, sei fermo da un pezzo e la serie è fredda → **In pausa**
- ...a meno che non ci sia un segnale recente → **Da guardare ora** con badge TORNATA
- zero arretrati → **In pari**, con la data del prossimo episodio se si sa
- abbandonata e senza novità → **Archivio**, sempre

Con zero arretrati non finisce **mai** in pausa: non c'è niente da recuperare.
**Zero episodi visti** non vuol dire "messa in pausa": vuol dire mai cominciata, e
quelle vanno in *Da iniziare*.

Queste regole stanno tutte in [`js/regole.js`](js/regole.js), e sono l'unica parte che
la riorganizzazione del sito non ha toccato: ogni riga è nata da un caso vero che
finiva nel posto sbagliato.

### Le quattro soglie, e perché sono quattro

| Cursore | Misura | Predefinito |
|---|---|---|
| **Pausa** | da quanto non guardi **tu** | 60 giorni |
| **Calda** | da quanto la **serie** non manda in onda niente | 90 giorni |
| **Abbandono** | oltre questo l'hai mollata, in onda o no | 365 giorni |
| **Tornata** | quanto dev'essere fresca la novità per farla risalire | 45 giorni |

Il caso che ha reso necessaria la seconda — due serie che sei fermo da tre mesi su
entrambe:

```
serie A   ultimo episodio uscito     53 giorni fa   → c'è poco da recuperare
serie B   ultimo episodio uscito   1362 giorni fa   → è morta e sepolta
```

Guardando solo da quanto tempo sei fermo **tu**, quelle due sono identiche. Sono
diversissime.

Il caso che ha reso necessaria la terza: i programmi che non finiscono mai —
telegiornali, reality, talent — restano `airing` per sempre. Uno mollato due anni fa,
con duecento episodi arretrati, resterebbe in griglia in eterno.

Si spostano dalle impostazioni, e gli elenchi si riordinano mentre trascini.
Se un singolo titolo finisce nel posto sbagliato, passa il mouse sul poster: compare
un pulsantino che vale solo per quello.

---

## Da scoprire

Quattro fasce, in ordine di quanto probabilmente ti interessano.

### 1. Il seguito di quello che hai finito

**Questo è il pezzo nuovo, ed è nato da un caso preciso: 7 Seeds.**

Prima i seguiti li cercavo **solo nel calendario dei prossimi 33 giorni**. Vuol dire
che trovavo una stagione nuova soltanto mentre stava andando in onda: un seguito
uscito nel 2020 non lo vedevo, e non lo avrei visto mai.

Adesso i seguiti li cerco davvero, in due modi:

- **su AniList**, col legame dichiarato (`SEQUEL`). È esatto, non è un'ipotesi.
- **su Simkl**, cercando la radice del titolo fra quello che non hai in lista, e
  tenendo solo quello uscito **dopo** la serie da cui parto.

La radice si ricava tagliando il sottotitolo dopo i due punti e togliendo in coda le
parole di stagione, gli ordinali e i numeri, romani compresi:

```
7SEEDS 2nd Season   →  radice "7seeds"  →  ce l'hai: 7SEEDS
```

Gli ordinali (`2nd`, `3rd`) prima non li toglievo, ed era proprio quello che spezzava
il caso 7 Seeds.

**È un confronto sui nomi, non su un collegamento ufficiale** — tranne su AniList.
Qualche accostamento sbagliato ci sarà: su ogni segnalazione c'è il pulsante
**nascondi**, e quella non torna più. Dalle impostazioni si rimettono in gioco tutte.

### 2. Stagioni nuove di roba che segui

Su Simkl ogni stagione di un anime è spesso una **voce separata**, e il tracker la
aggiunge solo quando ne guardi un episodio. Finché non lo fai, per la dashboard non
esiste. Per pescarla lo stesso confronto il calendario dei prossimi 33 giorni con
quello che hai già.

**Se una stagione l'hai mollata a metà, la successiva non te la propongo.**

Il calendario è un file pubblico su CDN: non consuma quota API.

### 3. Ti potrebbero piacere

Simkl, dentro la scheda di ogni titolo, tiene la lista di cosa guarda chi ha visto
quello. Parto dai tuoi dieci titoli migliori (prima i voti alti, poi i più recenti) e
metto insieme i loro consigli. Un titolo solo non può portarne più di quattro.
Vale anche per i film, partendo da quelli che hai visto.

### 4. Appena uscite

Serie e anime partiti da poco, presi dalle premiere di Simkl.

Tutta la sezione si aggiorna una volta a settimana. Quello che hai già in lista non
compare mai.

---

## Dettagli che si notano solo quando mancano

**Quando i contatori di Simkl sbagliano.** Gli arretrati si contano con una
sottrazione, ma i contatori a volte restano indietro, e su una serie da mille episodi
basta poco per far comparire roba già vista. Quando Simkl dice che non c'è un prossimo
episodio, la dashboard crede a quello e non alla sottrazione.

**Da dove arriva "quando è uscito l'ultimo episodio".** `/sync/all-items` non ce l'ha:
sa solo quando hai guardato tu. Il dato sta nella scheda del singolo titolo, che pesa
3,5 KB e contiene `status` e `last_aired`. Le scarico a 3 richieste al secondo — meno
di un terzo del limite, che vale per `client_id` e non per persona, quindi se il sito
lo usano in tanti i primi avvii si sommano — dando la precedenza ai titoli con
arretrati. Poi tengo tutto in cache: 60 giorni per le serie concluse, 3 giorni per
quelle in onda.

**I titoli degli anime.** Simkl restituisce il romanizzato (*Kenpuu Denki Berserk*
invece di *Berserk*). Quello ufficiale in inglese sta solo nella scheda, campo
`en_title`. Lo scarico in sottofondo per tutti, senza bloccare niente: la pagina è
utilizzabile da subito e i titoli si sistemano mentre la usi. La ricerca funziona con
tutti e due i nomi.

**Quando lo spazio del browser finisce.** Il salvataggio sacrifica in ordine: prima i
consigli (si rifanno in una settimana), poi il calendario (5 ore), e per ultime le
schede, che costano una chiamata a testa. La libreria non si tocca mai.

---

## Aggiornamento dati

Simkl impone regole precise a chi usa le sue API, e questo sito le rispetta:

1. chiede sempre prima `/sync/activities`, che è una risposta minuscola;
2. se niente è cambiato, si ferma lì;
3. solo se qualcosa è cambiato scarica il **delta**, con `date_from`;
4. la libreria intera la scarica una volta sola, al primo avvio.

Quando aggiorna: all'apertura, quando torni sulla scheda, ogni 15 minuti mentre la
pagina è aperta e visibile, e col pulsante ↻. Nessun timer cieco in sottofondo.

---

## Se qualcosa non va

**"Il collegamento è scaduto"** — hai revocato l'accesso da
[Connected Apps](https://simkl.com/settings/connected-apps/). Ricollega dalla home o
dalle impostazioni.

**Un titolo sta nella sezione sbagliata** — il pulsantino sul poster, oppure i cursori
nelle impostazioni.

**I conteggi sembrano sbagliati** — Impostazioni → *Risincronizza tutto*.

**Poster mancanti** — passano da `wsrv.nl`, il proxy immagini raccomandato da Simkl.
Se è irraggiungibile compare il titolo al posto della copertina. Trakt non manda
immagini del tutto: lì il titolo è normale.

---

## I file

| File | Cosa fa |
|---|---|
| `index.html` `anime.html` `serie.html` `film.html` `impostazioni.html` `guida.html` | le sei pagine |
| `app.css` | l'aspetto, per tutte |
| `js/lingua.js` | il dizionario italiano/inglese e il motore delle traduzioni |
| `js/stato.js` | configurazione, memoria locale, utilità comuni |
| `js/fonti.js` | Simkl, AniList, Trakt, calendario, schede, consigli e seguiti |
| `js/regole.js` | dove finisce ogni titolo, e in che ordine |
| `js/carte.js` | il disegno delle card |
| `js/spazio.js` | il motore delle tre pagine degli spazi |
| `js/telaio.js` | testata, cambio lingua, finestra di collegamento |
| `js/home.js` `js/impostazioni.js` | le due pagine che non sono spazi |
| `sw.js` | fa aprire il sito anche senza rete |
| `manifest.webmanifest` `icon.svg` | servono per installarlo come app |
| `avvia.cmd` | avvia il server locale |
| `worker/trakt-token.js` | il Cloudflare Worker di Trakt, l'unico pezzo di server |

Niente librerie esterne, niente compilazione, niente server tuo, nessun costo.
I dati stanno solo nel browser (`localStorage`).

### Lavorarci in locale

Doppio clic su **`avvia.cmd`**, che apre `http://localhost:5173`. La finestra nera del
server deve restare aperta. In locale il service worker è disattivato apposta.

**Il numero di versione** negli indirizzi (`?v=`) sta in tutte le pagine HTML e nella
costante `VERSIONE` di `sw.js`, e vanno tenuti uguali. Se uno resta indietro, il sito
lo scrive nella console del browser. Cambiando un file JS **senza** alzare il numero,
in locale il browser può servirti il file vecchio insieme a quelli nuovi: alza sempre
il numero, o fai un ricaricamento forzato.

---

## Dati tecnici

- Endpoint Simkl usati: `/oauth/pin` e `/oauth/pin/{codice}` per il collegamento;
  `/sync/activities` e `/sync/all-items` per la libreria (serie, anime e film);
  `/tv/{id}`, `/anime/{id}` e `/movies/{id}` per la scheda del singolo titolo (stato,
  ultima uscita, titolo inglese, consigli); `/search/tv` e `/search/anime` per i
  seguiti; `/tv/premieres/new` e `/anime/premieres/new` per le novità; e i file
  pubblici `data.simkl.in/calendar/*.json`, che non consumano quota
- AniList: una sola query GraphQL, che porta anche le relazioni fra le serie
- Trakt: `/sync/watched/*`, `/sync/watchlist/*`, `/users/hidden/progress_watched`,
  `/calendars/my/shows`
- Autenticazione: OAuth 2.0, flusso PIN per Simkl e Trakt, implicit grant per AniList
- Il `client_id` di Simkl è nel codice. Non è un segreto: viaggia in ogni URL dell'API.
