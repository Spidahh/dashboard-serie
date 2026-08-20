/* ================================================================
   Lingua — italiano e inglese, senza ricaricare la pagina
   ================================================================

   Come funziona, in due righe: ogni pezzo di testo del sito ha una chiave,
   e qui sotto ci sono le due traduzioni. Nell'HTML si scrive
   data-t="chiave" e il testo lo mette questo file.

   Perché non tre file di traduzione separati: il dizionario sta tutto qui
   perché così le due lingue si vedono una accanto all'altra, e quando ne
   cambio una mi accorgo subito se ho dimenticato l'altra.
*/

'use strict';

const DIZIONARIO = {

  /* ---------------- nomi delle cose, uguali ovunque ---------------- */
  'app.nome':            ['Dashboard Serie', 'Series Dashboard'],
  'app.motto':           ['Cosa devi guardare adesso', 'What to watch right now'],

  'nav.home':            ['Home', 'Home'],
  'nav.anime':           ['Anime', 'Anime'],
  'nav.serie':           ['Serie TV', 'TV Shows'],
  'nav.film':            ['Film', 'Movies'],
  'nav.guida':           ['Guida', 'Guide'],
  'nav.impostazioni':    ['Impostazioni', 'Settings'],
  'nav.torna':           ['Torna alla home', 'Back to home'],
  'nav.apri':            ['Apri', 'Open'],

  'lingua.eti':          ['Lingua', 'Language'],
  'lingua.it':           ['Italiano', 'Italian'],
  'lingua.en':           ['Inglese', 'English'],

  /* ---------------- home / benvenuto ---------------- */
  'home.titolo':         ['Cosa devi guardare', 'What to watch'],
  'home.sotto':          ['Una pagina che legge i tuoi account e ti dice cosa è uscito e non hai ancora visto. Gli episodi che guardi spariscono da soli, le serie che tornano dopo anni risalgono da sole.',
                          'One page that reads your accounts and tells you what came out that you have not watched yet. Episodes you watch disappear on their own, shows that return after years come back up on their own.'],
  'home.iniziaQui':      ['Comincia da qui', 'Start here'],
  'home.nonCollegato':   ['Non hai ancora collegato nessun servizio.', 'You have not connected any service yet.'],
  'home.collegaOra':     ['Collega un servizio', 'Connect a service'],
  'home.leggiGuida':     ['Non so cos\'è, spiegamelo', 'I have no idea what this is, explain it'],
  'home.spaziTitolo':    ['I tuoi tre spazi', 'Your three spaces'],
  'home.spaziSotto':     ['Anime, serie TV e film sono tenuti separati: ognuno ha il suo elenco, i suoi conti e il suo menù. Non si mescolano mai.',
                          'Anime, TV shows and movies are kept apart: each has its own list, its own counts and its own menu. They never mix.'],
  'home.spazioAnime':    ['Anime, con i seguiti e le stagioni nuove.', 'Anime, with sequels and new seasons.'],
  'home.spazioSerie':    ['Serie TV, dagli episodi arretrati all\'archivio.', 'TV shows, from your backlog to the archive.'],
  'home.spazioFilm':     ['Film da vedere, visti e in arrivo.', 'Movies to watch, watched and coming soon.'],
  'home.vuoto':          ['niente ancora', 'nothing yet'],
  'home.daVedere':       ['da vedere', 'to watch'],
  'home.serviziTitolo':  ['I servizi collegati', 'Connected services'],
  'home.serviziSotto':   ['Puoi collegarne anche più di uno: quello che compare in due posti lo conto una volta sola.',
                          'You can connect more than one: anything that shows up twice is counted once.'],
  'home.gestisci':       ['Gestisci i collegamenti', 'Manage connections'],
  'home.comeFunziona':   ['Come funziona, in breve', 'How it works, in short'],
  'home.p1t':            ['Non tiene lei il conto', 'It does not keep score'],
  'home.p1d':            ['Il conto degli episodi lo tengono Simkl, Trakt o AniList, che segnano da soli quello che guardi su Netflix, Crunchyroll e gli altri. Questa pagina legge quei dati e li rimette in ordine.',
                          'Simkl, Trakt or AniList keep track of episodes, marking on their own what you watch on Netflix, Crunchyroll and the rest. This page reads that data and puts it back in order.'],
  'home.p2t':            ['Non scrive mai niente', 'It never writes anything'],
  'home.p2d':            ['Sola lettura, su tutti i servizi. Nessun episodio segnato, nessuna serie spostata di lista, nessun voto.',
                          'Read only, on every service. No episode marked, no show moved between lists, no ratings.'],
  'home.p3t':            ['I tuoi dati restano qui', 'Your data stays here'],
  'home.p3d':            ['Non c\'è nessun server che li riceve: il collegamento e la tua libreria stanno nella memoria di questo browser, su questo dispositivo.',
                          'There is no server receiving them: the connection and your library live in this browser\'s memory, on this device.'],

  /* ---------------- collegamento ai servizi ---------------- */
  'coll.titolo':         ['Collega un servizio', 'Connect a service'],
  'coll.sotto':          ['Basta uno per cominciare. Puoi aggiungerne altri quando vuoi.', 'One is enough to start. You can add others whenever you like.'],
  'coll.simkl':          ['Collega Simkl', 'Connect Simkl'],
  'coll.simklNota':      ['Serie TV, anime e film. È il più completo, ed è quello da cui partire.', 'TV shows, anime and movies. The most complete one, and the one to start with.'],
  'coll.trakt':          ['Collega Trakt', 'Connect Trakt'],
  'coll.traktNota':      ['Serie TV e film. Le serie che nascondi dal progresso su Trakt qui diventano abbandonate.', 'TV shows and movies. Shows you hide from progress on Trakt become dropped here.'],
  'coll.anilist':        ['Collega AniList', 'Connect AniList'],
  'coll.anilistNota':    ['Solo anime, ma sa quali sono i seguiti veri di ogni serie.', 'Anime only, but it knows the real sequels of every series.'],
  'coll.collega':        ['Collega', 'Connect'],
  'coll.scollega':       ['Scollega', 'Disconnect'],
  'coll.attivo':         ['collegato', 'connected'],
  'coll.spento':         ['non collegato', 'not connected'],
  'coll.nonConfig':      ['non configurato', 'not set up'],
  'coll.nonConfigAiuto': ['Chi gestisce il sito non ha ancora messo le chiavi di questo servizio.', 'Whoever runs this site has not added this service\'s keys yet.'],
  'coll.passo1':         ['Apri questa pagina', 'Open this page'],
  'coll.passo2':         ['Scrivi questo codice', 'Type this code'],
  'coll.attesa':         ['Aspetto che tu confermi…', 'Waiting for you to confirm…'],
  'coll.annulla':        ['Annulla', 'Cancel'],
  'coll.scaduto':        ['Il codice è scaduto. Riprova.', 'The code has expired. Try again.'],
  'coll.durata':         ['Il collegamento vale per questo dispositivo. Sul telefono lo rifai una volta.', 'The connection is for this device. On your phone you do it once more.'],

  /* ---------------- sezioni delle serie ---------------- */
  'sez.watch':           ['Da guardare ora', 'Watch now'],
  'sez.watch.aiuto':     ['Episodi già usciti che non hai ancora visto. Spariscono da soli quando vengono segnati come visti.',
                          'Episodes already out that you have not watched. They disappear on their own once marked as watched.'],
  'sez.watch.vuoto':     ['Sei in pari: non c\'è niente da recuperare.', 'You are all caught up: nothing to catch up on.'],
  'sez.pari':            ['In pari', 'Caught up'],
  'sez.pari.aiuto':      ['Hai visto tutti gli episodi usciti. Dove la data del prossimo si sa già, è scritta sul poster; dove non si sa, c\'è la spunta.',
                          'You have watched every episode released. Where the next date is known it is on the poster; where it is not, there is a checkmark.'],
  'sez.pari.vuoto':      ['Nessuna serie in pari.', 'Nothing caught up.'],
  'sez.scoprire':        ['Da scoprire', 'Discover'],
  'sez.scoprire.aiuto':  ['Roba che non hai in lista: seguiti di quello che hai già finito, stagioni nuove, titoli consigliati da chi guarda le tue stesse cose, e novità appena partite.',
                          'Things not in your list: sequels to what you finished, new seasons, titles recommended by people who watch what you watch, and brand new releases.'],
  'sez.scoprire.vuoto':  ['Niente di nuovo da segnalarti per ora.', 'Nothing new to point out right now.'],
  'sez.pausa':           ['In pausa', 'Paused'],
  'sez.pausa.aiuto':     ['Hanno episodi arretrati, ma sei fermo da troppo tempo e la serie non manda in onda niente di nuovo. Se esce roba nuova tornano su da sole.',
                          'They have a backlog, but you have been away too long and nothing new is airing. If something new comes out they come back up on their own.'],
  'sez.pausa.vuoto':     ['Niente in pausa: non hai roba lasciata a metà.', 'Nothing paused: nothing left half-finished.'],
  'sez.inizia':          ['Da iniziare', 'To start'],
  'sez.inizia.aiuto':    ['Quello che hai messo in lista ma non hai mai aperto.', 'What you added to your list but never opened.'],
  'sez.inizia.vuoto':    ['Niente da iniziare.', 'Nothing to start.'],
  'sez.archivio':        ['Archivio', 'Archive'],
  'sez.archivio.aiuto':  ['Niente di nuovo in vista. Se una torna con episodi nuovi, la ritrovi in cima con la pastiglia TORNATA.',
                          'Nothing new in sight. If one returns with new episodes, you find it at the top with the BACK badge.'],
  'sez.archivio.vuoto':  ['L\'archivio è vuoto.', 'The archive is empty.'],

  /* ---------------- sezioni dei film ---------------- */
  'sezF.daVedere':       ['Da vedere', 'To watch'],
  'sezF.daVedere.aiuto': ['Li hai messi in lista e sono già usciti. Questa è la schermata principale dei film.',
                          'You added them to your list and they are already out. This is the main movie screen.'],
  'sezF.daVedere.vuoto': ['Nessun film in attesa: la lista è vuota.', 'No movies waiting: the list is empty.'],
  'sezF.inArrivo':       ['In arrivo', 'Coming soon'],
  'sezF.inArrivo.aiuto': ['Li hai in lista ma non sono ancora usciti. Quando escono passano in "Da vedere".',
                          'In your list but not out yet. When they are released they move to "To watch".'],
  'sezF.inArrivo.vuoto': ['Nessun film in arrivo fra quelli che segui.', 'No upcoming movies among the ones you follow.'],
  'sezF.visti':          ['Visti', 'Watched'],
  'sezF.visti.aiuto':    ['Quelli che hai già visto.', 'The ones you have already watched.'],
  'sezF.visti.vuoto':    ['Non hai ancora segnato nessun film come visto.', 'You have not marked any movie as watched yet.'],

  /* ---------------- fasce ---------------- */
  'fascia.freschi':      ['Appena usciti', 'Just out'],
  'fascia.vecchi':       ['Più indietro', 'Further back'],
  'fascia.finite':       ['Finite', 'Finished'],
  'fascia.finite.nota':  ['Le hai viste tutte e la serie è conclusa.', 'You watched them all and the series is over.'],
  'fascia.mollate':      ['Abbandonate', 'Dropped'],
  'fascia.mollate.nota': ['Le hai messe fra le abbandonate sul servizio.', 'You put them among the dropped ones on the service.'],
  'fascia.altro':        ['Altro', 'Other'],
  'fascia.seguiti':      ['Il seguito di quello che hai finito', 'Sequels to what you finished'],
  'fascia.seguiti.nota': ['Esiste già e non ce l\'hai in lista.', 'It already exists and it is not in your list.'],
  'fascia.stagioni':     ['Stagioni nuove di roba che segui', 'New seasons of what you follow'],
  'fascia.stagioni.nota':['Stanno uscendo adesso e non le hai in lista.', 'They are airing now and they are not in your list.'],
  'fascia.simili':       ['Ti potrebbero piacere', 'You might like'],
  'fascia.simili.nota':  ['Le guarda chi ha visto le stesse cose che hai visto tu.', 'Watched by people who watched what you watched.'],
  'fascia.novita':       ['Appena uscite', 'Brand new'],
  'fascia.novita.nota':  ['Partite da poco, e non le hai in lista.', 'Started recently, and not in your list.'],

  /* ---------------- controlli ---------------- */
  'ctrl.cerca':          ['Cerca un titolo…  (premi /)', 'Search a title…  (press /)'],
  'ctrl.cercaAiuto':     ['Cerca fra tutti i tuoi titoli, anche in Archivio', 'Search across all your titles, archive included'],
  'ctrl.ordina':         ['Ordina', 'Sort'],
  'ctrl.ordinaAiuto':    ['In che ordine mettere i titoli', 'What order to put titles in'],
  'ord.recent':          ['Uscito da meno tempo', 'Released most recently'],
  'ord.oldest':          ['Uscito da più tempo', 'Released longest ago'],
  'ord.backlog':         ['Quanti episodi arretrati', 'Biggest backlog'],
  'ord.lastwatch':       ['Guardati di recente', 'Watched recently'],
  'ord.title':           ['Titolo, dalla A alla Z', 'Title, A to Z'],
  'ord.added':           ['Aggiunti di recente', 'Added recently'],
  'ctrl.aggiorna':       ['Aggiorna', 'Refresh'],
  'ctrl.tutte':          ['Tutte le categorie', 'All categories'],
  'ctrl.tutteAiuto':     ['Mostra tutte le categorie una sotto l\'altra', 'Show every category one below the other'],
  'ctrl.mostraTutto':    ['Mostra tutto', 'Show everything'],
  'ctrl.stoCercando':    ['Stai cercando', 'You are searching for'],
  'ctrl.contanoSolo':    ['Anche i numeri nel menù contano solo questi.', 'The numbers in the menu count only these too.'],
  'ctrl.provaSvuotare':  ['Prova a svuotare la ricerca.', 'Try clearing the search.'],
  'ctrl.nascondi':       ['nascondi', 'hide'],
  'ctrl.nascondiAiuto':  ['Non segnalarmela più', 'Stop suggesting this to me'],
  'ctrl.inPausa':        ['in pausa', 'pause'],
  'ctrl.riprendi':       ['riprendi', 'resume'],
  'ctrl.inPausaAiuto':   ['Togli questo titolo dalla schermata principale. Vale solo qui: sul tuo account non cambia niente.',
                          'Take this title off the main screen. Only here: nothing changes on your account.'],
  'ctrl.riprendiAiuto':  ['Rimettilo fra quelli da guardare. Vale solo qui: sul tuo account non cambia niente.',
                          'Put it back among the ones to watch. Only here: nothing changes on your account.'],

  /* ---------------- pastiglie ---------------- */
  'bad.nuovo':           ['NUOVO', 'NEW'],
  'bad.tornata':         ['TORNATA', 'BACK'],
  'bad.anime':           ['ANIME', 'ANIME'],
  'bad.conteggio':       ['Quanti episodi usciti non hai ancora visto', 'How many released episodes you have not watched'],
  'bad.nuovoAiuto':      ['Un episodio solo, uscito negli ultimi 7 giorni', 'A single episode, out in the last 7 days'],
  'bad.tornataAiuto':    ['Era ferma da un pezzo, ma è uscita roba nuova', 'It had been still for a while, but something new came out'],
  'bad.prossimoAiuto':   ['Quando esce il prossimo', 'When the next one is out'],
  'bad.fattoAiuto':      ['Hai visto tutto quello che è uscito finora', 'You have watched everything out so far'],
  'bad.animeAiuto':      ['È un anime', 'It is an anime'],
  'bad.completo':        ['Completo', 'All caught up'],
  'bad.visto':           ['Visto', 'Watched'],
  'bad.lasciato':        ['Lasciato a metà', 'Left unfinished'],

  /* ---------------- testata ---------------- */
  'test.inPari':         ['Sei in pari: non c\'è niente da recuperare.', 'You are caught up: nothing to catch up on.'],
  'test.episodio':       ['episodio', 'episode'],
  'test.episodi':        ['episodi', 'episodes'],
  'test.daVedere':       ['da vedere, su', 'to watch, across'],
  'test.serie':          ['serie', 'shows'],
  'test.serie1':         ['serie', 'show'],
  'test.film':           ['film', 'movies'],
  'test.film1':          ['film', 'movie'],
  'test.appenaUscito':   ['appena uscito', 'just out'],
  'test.appenaUsciti':   ['appena usciti', 'just out'],
  'test.filmDaVedere':   ['film da vedere', 'movies to watch'],
  'test.filmDaVedere1':  ['film da vedere', 'movie to watch'],

  /* ---------------- impostazioni ---------------- */
  'imp.titolo':          ['Impostazioni', 'Settings'],
  'imp.sotto':           ['Da qui si collegano i servizi, si sceglie la lingua e si spostano le soglie che decidono dove finisce ogni titolo.',
                          'From here you connect services, choose the language, and move the thresholds that decide where each title ends up.'],
  'imp.servizi':         ['Servizi', 'Services'],
  'imp.lingua':          ['Lingua', 'Language'],
  'imp.linguaSotto':     ['Vale per tutto il sito, anche per la guida.', 'Applies to the whole site, guide included.'],
  'imp.soglie':          ['Le soglie', 'Thresholds'],
  'imp.soglieSotto':     ['Queste decidono dove finisce ogni serie. Sposta un cursore e gli elenchi si riordinano subito, così vedi l\'effetto mentre scegli.',
                          'These decide where each show ends up. Move a slider and the lists reorder right away, so you see the effect as you choose.'],
  'imp.pausa':           ['Metti in pausa dopo <b>{n}</b> giorni senza guardare', 'Pause after <b>{n}</b> days without watching'],
  'imp.calda':           ['Una serie è ancora "calda" se ha mandato in onda un episodio negli ultimi <b>{n}</b> giorni',
                          'A show is still "hot" if it aired an episode in the last <b>{n}</b> days'],
  'imp.caldaNota':       ['Finché è calda resta in griglia anche se tu sei fermo da mesi: c\'è ancora poco da recuperare.',
                          'While it is hot it stays on the grid even if you have been away for months: there is still little to catch up on.'],
  'imp.abbandono':       ['Dopo <b>{n}</b> giorni senza guardarla la considero abbandonata', 'After <b>{n}</b> days without watching I consider it dropped'],
  'imp.abbandonoNota':   ['Vale anche per le serie ancora in onda: solo un episodio davvero nuovo la riporta in griglia.',
                          'This applies to shows still airing too: only a genuinely new episode brings it back.'],
  'imp.tornata':         ['Considera "tornata" se il nuovo episodio è uscito da meno di <b>{n}</b> giorni', 'Consider it "back" if the new episode came out less than <b>{n}</b> days ago'],
  'imp.scelte':          ['Come mostrare le cose', 'How to show things'],
  'imp.enTitoli':        ['Usa il titolo ufficiale in inglese quando esiste', 'Use the official English title when it exists'],
  'imp.enTitoliNota':    ['<i>Tomb Raider King</i> invece di <i>Dogul Wang</i>. La ricerca funziona con tutti e due.',
                          '<i>Tomb Raider King</i> instead of <i>Dogul Wang</i>. Search works with both.'],
  'imp.riemergi':        ['Fai riemergere anche le serie finite o abbandonate quando escono episodi nuovi', 'Bring finished or dropped shows back up when new episodes come out'],
  'imp.auto':            ['Controlla se ci sono novità ogni 15 minuti mentre la pagina è aperta', 'Check for news every 15 minutes while the page is open'],
  'imp.inLibreria':      ['{n} titoli in libreria', '{n} titles in your library'],
  'imp.manutenzione':    ['Manutenzione', 'Maintenance'],
  'imp.risincronizza':   ['Risincronizza tutto', 'Resync everything'],
  'imp.risincAiuto':     ['Riscarica da zero tutta la libreria. Serve se i conteggi sembrano sbagliati.', 'Redownload the whole library from scratch. Useful if the counts look wrong.'],
  'imp.esporta':         ['Esporta impostazioni', 'Export settings'],
  'imp.esportaAiuto':    ['Salva un file con le tue soglie e le scelte fatte a mano', 'Save a file with your thresholds and manual choices'],
  'imp.importa':         ['Importa impostazioni', 'Import settings'],
  'imp.importaAiuto':    ['Rimetti a posto le soglie da un file esportato prima', 'Restore thresholds from a file you exported earlier'],
  'imp.mostraNascosti':  ['Rimetti in gioco i titoli nascosti', 'Bring hidden titles back'],
  'imp.mostraNascostiN': ['Hai nascosto {n} suggerimenti.', 'You have hidden {n} suggestions.'],
  'imp.scollegaTutto':   ['Scollega tutto', 'Disconnect everything'],
  'imp.scollegaAiuto':   ['Toglie ogni collegamento da questo dispositivo. Gli account non vengono toccati.', 'Removes every connection from this device. Accounts are not touched.'],
  'imp.chiudi':          ['Chiudi', 'Close'],

  /* ---------------- messaggi ---------------- */
  'msg.aggiornato':      ['Aggiornato', 'Updated'],
  'msg.giaAggiornato':   ['Già aggiornato', 'Already up to date'],
  'msg.scaricata':       ['Libreria scaricata', 'Library downloaded'],
  'msg.errore':          ['Errore: {x}', 'Error: {x}'],
  'msg.scadutoSimkl':    ['Il collegamento con Simkl è scaduto. Ricollega l\'account.', 'The Simkl connection has expired. Reconnect the account.'],
  'msg.scadutoAl':       ['Il collegamento con AniList è scaduto', 'The AniList connection has expired'],
  'msg.scadutoTk':       ['Il collegamento con Trakt è scaduto', 'The Trakt connection has expired'],
  'msg.confermaScollega':['Scollegare tutto da questo dispositivo? Gli account restano come sono.', 'Disconnect everything from this device? The accounts stay as they are.'],
  'msg.confermaServizio':['Scollegare {x}? I titoli presi da lì spariscono dalla dashboard.', 'Disconnect {x}? Titles taken from there disappear from the dashboard.'],
  'msg.importate':       ['Impostazioni importate', 'Settings imported'],
  'msg.fileStorto':      ['Quel file non contiene delle impostazioni valide', 'That file does not contain valid settings'],
  'msg.nascostiTolti':   ['Rimessi in gioco {n} titoli', '{n} titles brought back'],
  'msg.schede':          ['schede {a}/{b}…', 'details {a}/{b}…'],
  'msg.titoli':          ['titoli {a}/{b}…', 'titles {a}/{b}…'],
  'msg.aggiornatoOra':   ['aggiornato ora', 'updated just now'],
  'msg.aggiornatoMin':   ['aggiornato {n} min fa', 'updated {n} min ago'],
  'msg.aggiornatoQuando':['aggiornato {x}', 'updated {x}'],
  'msg.serveCollegare':  ['Collega prima un servizio', 'Connect a service first'],

  /* ---------------- date in parole ---------------- */
  'data.oggi':           ['oggi', 'today'],
  'data.domani':         ['domani', 'tomorrow'],
  'data.ieri':           ['ieri', 'yesterday'],
  'data.tra':            ['tra {x}', 'in {x}'],
  'data.fa':             ['{x} fa', '{x} ago'],
  'data.giorni':         ['{n} giorni', '{n} days'],
  'data.settimana':      ['{n} settimana', '{n} week'],
  'data.settimane':      ['{n} settimane', '{n} weeks'],
  'data.mese':           ['{n} mese', '{n} month'],
  'data.mesi':           ['{n} mesi', '{n} months'],
  'data.anno':           ['{n} anno', '{n} year'],
  'data.anni':           ['{n} anni', '{n} years'],
  'data.uscito':         ['uscito {x}', 'out {x}'],
  'data.esce':           ['esce {x}', 'out {x}'],
  'data.esceIl':         ['Esce {x}', 'Out {x}'],
  'data.epNuovo':        ['1 episodio nuovo', '1 new episode'],
  'data.epNuovi':        ['{n} episodi nuovi', '{n} new episodes'],
  'data.dopo':           ['dopo {x}', 'after {x}'],
  'data.ep':             ['Ep. {n}', 'Ep. {n}'],
  'data.perche':         ['perché hai visto: {x}', 'because you watched: {x}'],
  'data.segui':          ['segui: {x}', 'you follow: {x}'],
  'data.seguitoDi':      ['seguito di: {x}', 'sequel to: {x}'],
  // neutra apposta: la stessa frase deve funzionare per una serie e per un film
  'data.consigliataDa':  ['Te lo consigliano {n} dei tuoi titoli', 'Recommended by {n} of your titles'],

  /* ---------------- guida ---------------- */
  'g.titolo':            ['Come si usa', 'How to use it'],
  'g.occhiello':         ['Questa pagina mostra <b>cosa devi guardare adesso</b>. Non tiene lei il conto degli episodi: quello lo fa un servizio esterno, che segna in automatico quello che guardi su Netflix, Crunchyroll e gli altri. La dashboard legge quei dati e li rimette in ordine.',
                          'This page shows <b>what to watch right now</b>. It does not keep track of episodes itself: an external service does that, marking automatically what you watch on Netflix, Crunchyroll and the rest. The dashboard reads that data and puts it back in order.'],
  'g.trePassi':          ['Servono tre passaggi, una volta sola. Dopo non ci pensi più.', 'Three steps, once. After that you never think about it again.'],
  'g.p1':                ['Fatti un account', 'Get an account'],
  'g.p2':                ['Fai segnare in automatico quello che guardi', 'Let it mark what you watch automatically'],
  'g.p3':                ['Collega la dashboard', 'Connect the dashboard'],
  'g.qualeServizio':     ['Quale servizio scegliere', 'Which service to pick'],
  'g.domande':           ['Domande', 'Questions'],
  'g.vaiAllaDash':       ['Vai alla dashboard', 'Go to the dashboard'],
  'g.cosaVedi':          ['Cosa vedi, sezione per sezione', 'What you see, section by section'],
  'g.pastiglie':         ['Le pastiglie sul poster', 'The badges on the poster'],
  'g.soglie':            ['Le soglie, se vuoi metterci mano', 'The thresholds, if you want to tweak them'],

  /* ---------------- guida, i testi lunghi ---------------- */
  'g.qualeSotto':        ['Ne basta uno. Se non ne hai nessuno, prendi Simkl: copre tutto e segna da solo quello che guardi.',
                          'One is enough. If you have none, take Simkl: it covers everything and marks what you watch on its own.'],
  'g.simklD':            ['Serie TV, anime <b>e film</b>. Gratis. Ha le estensioni per il browser e le app per il telefono che segnano in automatico. È la scelta giusta se parti da zero.',
                          'TV shows, anime <b>and movies</b>. Free. It has browser extensions and phone apps that mark things automatically. The right choice if you start from scratch.'],
  'g.traktD':            ['Serie TV e film. Se lo usi già, collegalo: le serie che nascondi dal progresso su Trakt qui diventano abbandonate.',
                          'TV shows and movies. If you already use it, connect it: shows you hide from progress on Trakt become dropped here.'],
  'g.anilistD':          ['Solo anime, ma è l\'unico che sa quali sono i <b>seguiti veri</b> di una serie. Se guardi anime, collegalo anche insieme a Simkl.',
                          'Anime only, but it is the only one that knows the <b>real sequels</b> of a series. If you watch anime, connect it alongside Simkl.'],
  'g.p1d':               ['Vai sul sito del servizio che hai scelto e iscriviti. È gratis. Se hai già le tue serie da un\'altra parte non ricominci da zero: Simkl importa da TV Time, Trakt, MyAnimeList e altri.',
                          'Go to the site of the service you picked and sign up. It is free. If you already have your shows somewhere else you do not start over: Simkl imports from TV Time, Trakt, MyAnimeList and others.'],
  'g.p2d':               ['Questo è il passaggio che cambia tutto. Se lo salti, dovrai segnare gli episodi a mano e la dashboard resterà indietro.',
                          'This is the step that changes everything. Skip it and you will have to mark episodes by hand, and the dashboard will fall behind.'],
  'g.p2pc':              ['Sul computer', 'On your computer'],
  'g.p2pcD':             ['Installa l\'estensione per il browser. Da quel momento, quando guardi un episodio su Netflix, Crunchyroll, Prime Video, Disney+ e altri, viene segnato da solo.',
                          'Install the browser extension. From then on, when you watch an episode on Netflix, Crunchyroll, Prime Video, Disney+ and others, it gets marked on its own.'],
  'g.p2tel':             ['Sul telefono', 'On your phone'],
  'g.p2telD':            ['Ci sono le app per Android e iPhone.', 'There are apps for Android and iPhone.'],
  'g.p2media':           ['Se hai un media server', 'If you have a media server'],
  'g.p2mediaD':          ['Si collega anche a Plex, Kodi, Emby e Jellyfin: quello che guardi da lì viene segnato allo stesso modo.',
                          'It also connects to Plex, Kodi, Emby and Jellyfin: what you watch there gets marked the same way.'],
  'g.p3d':               ['Torna qui e premi <b>Collega un servizio</b>. Compare un codice di pochi caratteri: apri il sito del servizio, lo scrivi, e hai finito.',
                          'Come back here and press <b>Connect a service</b>. A short code appears: open the service page, type it in, and you are done.'],
  'g.p3nota':            ['La prima volta ci mette qualche minuto: scarica la tua libreria e le schede. Puoi già usarla mentre finisce, si sistema da sé.',
                          'The first time takes a few minutes: it downloads your library and the details. You can already use it while it finishes, it sorts itself out.'],
  'g.spaziT':            ['Tre spazi separati', 'Three separate spaces'],
  'g.spaziD':            ['Anime, serie TV e film hanno ognuno la sua pagina, il suo menù e i suoi conti. Non si mescolano mai: quando apri gli anime, le serie TV non ci sono proprio.',
                          'Anime, TV shows and movies each have their own page, menu and counts. They never mix: when you open Anime, TV shows simply are not there.'],
  'g.filmT':             ['Come funzionano i film', 'How movies work'],
  'g.filmD':             ['Un film non ha episodi arretrati, quindi le domande sono due sole: l\'hai visto? e se non l\'hai visto, è già uscito? Da lì escono le tre sezioni: <b>Da vedere</b>, <b>In arrivo</b> e <b>Visti</b>.',
                          'A movie has no backlog, so there are only two questions: have you watched it? and if not, is it out yet? That gives the three sections: <b>To watch</b>, <b>Coming soon</b> and <b>Watched</b>.'],
  'g.seguitiT':          ['I seguiti', 'Sequels'],
  'g.seguitiD':          ['Se finisci una serie e il seguito esiste già, te lo dico. Sembra ovvio, e invece era il buco più grosso: prima guardavo solo cosa stava uscendo nei trenta giorni successivi, quindi un seguito uscito anni fa non lo trovavo mai. Su AniList il legame è dichiarato ed è esatto; sugli altri lo cerco dal nome, quindi qualche accostamento storto ci sarà: su ogni segnalazione c\'è <b>nascondi</b>.',
                          'If you finish a series and the sequel already exists, I tell you. It sounds obvious, but it was the biggest hole: I used to look only at what was airing in the next thirty days, so a sequel released years ago was never found. On AniList the link is declared and exact; elsewhere I search by name, so some wrong matches will happen: every suggestion has a <b>hide</b> button.'],
  'g.q1':                ['Questo sito vede i miei dati?', 'Does this site see my data?'],
  'g.q1d':               ['No. È fatto di soli file statici: non c\'è nessun server che riceve qualcosa. Il collegamento e la tua libreria restano nella memoria del browser che stai usando. Chi apre lo stesso indirizzo vede solo i propri.',
                          'No. It is made of static files only: there is no server receiving anything. The connection and your library stay in the memory of the browser you are using. Anyone opening the same address sees only their own.'],
  'g.q2':                ['Cambia qualcosa sul mio account?', 'Does anything change on my account?'],
  'g.q2d':               ['Mai. La dashboard <b>legge soltanto</b>: non segna episodi, non sposta niente di lista, non mette voti.',
                          'Never. The dashboard <b>only reads</b>: it does not mark episodes, does not move anything between lists, does not rate.'],
  'g.q3':                ['Funziona sul telefono?', 'Does it work on a phone?'],
  'g.q3d':               ['Sì, e si può installare come app: dal menù del browser scegli <b>Aggiungi a schermata Home</b>. Da lì si apre a schermo intero e resta apribile anche senza rete. Il collegamento va rifatto una volta su ogni dispositivo.',
                          'Yes, and it can be installed as an app: from the browser menu pick <b>Add to Home Screen</b>. From there it opens full screen and stays openable without a connection. The connection has to be redone once on each device.'],
  'g.q4':                ['Quanto spesso si aggiorna?', 'How often does it update?'],
  'g.q4d':               ['All\'apertura, quando torni sulla scheda, ogni quindici minuti mentre la pagina è aperta, e col pulsante di aggiornamento. Prima di scaricare qualsiasi cosa chiede se è cambiato qualcosa: se non è cambiato niente, si ferma lì.',
                          'On open, when you come back to the tab, every fifteen minutes while the page is open, and with the refresh button. Before downloading anything it asks whether something changed: if nothing changed, it stops there.'],
  'g.q5':                ['Un titolo sta nella sezione sbagliata.', 'A title is in the wrong section.'],
  'g.q5d':               ['Passa il mouse sul poster: compare un pulsantino che vale solo per quello. Oppure sposta le soglie nelle impostazioni, che valgono per tutti.',
                          'Hover the poster: a small button appears that applies only to that one. Or move the thresholds in settings, which apply to everything.'],
  'g.q6':                ['I conteggi sembrano sbagliati.', 'The counts look wrong.'],
  'g.q6d':               ['Impostazioni, poi <b>Risincronizza tutto</b>. Riscarica la libreria da zero.',
                          'Settings, then <b>Resync everything</b>. It redownloads the library from scratch.'],
  'g.q7':                ['Voglio scollegarmi.', 'I want to disconnect.'],
  'g.q7d':               ['Impostazioni, poi <b>Scollega tutto</b>. Toglie il collegamento da questo dispositivo e basta: gli account non vengono toccati.',
                          'Settings, then <b>Disconnect everything</b>. It removes the connection from this device only: accounts are not touched.'],

  /* ---------------- errori ---------------- */
  'err.noSimkl':         ['Non riesco a contattare Simkl: {x}', 'I cannot reach Simkl: {x}'],
  'err.noCodice':        ['Il servizio non ha restituito un codice. Riprova tra poco.', 'The service did not return a code. Try again shortly.'],
  'err.noTrakt':         ['Non riesco a contattare Trakt', 'I cannot reach Trakt'],
  'err.traktSpento':     ['Trakt non è configurato su questo sito', 'Trakt is not set up on this site'],
  'err.anilistSpento':   ['AniList non è configurato su questo sito', 'AniList is not set up on this site']
};

/* ---------------- il motore ---------------- */

const LINGUE = ['it', 'en'];

/* Quale lingua al primo avvio: quella del browser se la conosco, sennò italiano.
   La scelta fatta a mano vince sempre e resta salvata. */
function linguaIniziale(salvata) {
  if (LINGUE.includes(salvata)) return salvata;
  const b = (navigator.language || 'it').slice(0, 2).toLowerCase();
  return LINGUE.includes(b) ? b : 'it';
}

let LINGUA = 'it';

function impostaLingua(l) {
  LINGUA = LINGUE.includes(l) ? l : 'it';
  document.documentElement.lang = LINGUA;
}

/* Il testo di una chiave, con i buchi riempiti: t('data.giorni', {n: 5}).
   Se una chiave non c'è la restituisco così com'è invece di lasciare un vuoto:
   in pagina si vede subito qual è, e si aggiusta. */
function t(chiave, valori) {
  const riga = DIZIONARIO[chiave];
  let s = riga ? (riga[LINGUE.indexOf(LINGUA)] ?? riga[0]) : chiave;
  if (valori) for (const [k, v] of Object.entries(valori)) s = s.split('{' + k + '}').join(v);
  return s;
}

/* Riempie l'HTML. Tre modi, perché servono tutti e tre:
     data-t          il testo dentro all'elemento
     data-t-html     idem, ma con dentro <b> e <i> (le stringhe sono mie, non tue)
     data-t-attr     attributi, es. "title:ctrl.cercaAiuto;placeholder:ctrl.cerca" */
function applicaLingua(radice = document) {
  for (const el of radice.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of radice.querySelectorAll('[data-t-html]')) el.innerHTML = t(el.dataset.tHtml);
  for (const el of radice.querySelectorAll('[data-t-attr]')) {
    for (const pezzo of el.dataset.tAttr.split(';')) {
      const [attr, chiave] = pezzo.split(':');
      if (attr && chiave) el.setAttribute(attr.trim(), t(chiave.trim()));
    }
  }
}
