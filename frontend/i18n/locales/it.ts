export default {
  common: {
    email: "Email",
    password: "Password",
    submit: "Invia",
    save: "Salva",
    saveChanges: "Salva modifiche",
    success: "Operazione riuscita",
    yes: "Sì",
    no: "No",
    error: "Errore {code}",
    pageNotFound: "Pagina non trovata",
  },
  nav: {
    home: "Home",
    docs: "Documentazione",
    gettingStarted: "Introduzione",
    installation: "Installazione",
    blog: "Blog",
    chat: "Chat",
    bpmn: "BPMN",
    contact: "Contatti",
    settings: "Impostazioni",
    account: "Account",
    security: "Sicurezza",
    moderation: "Moderazione",
    login: "Accedi",
    logout: "Esci",
  },
  footer: {
    privacyPolicy: "Informativa sulla privacy.",
  },
  validation: {
    stringRequired: "Richiesto",
    invalidEmail: "Email non valida",
    minCharacters: "Deve contenere almeno {count} caratteri",
    maxCharacters: "Deve contenere al massimo {count} caratteri",
    passwordsMatch: "Le password devono coincidere",
    nameMinCharacters: "Il nome deve contenere almeno {count} caratteri",
    codeLength: "Deve contenere {count} cifre",
  },
  auth: {
    login: {
      title: "Accedi",
      description: "Non hai un account?",
      emailPlaceholder: "Inserisci la tua email",
      passwordPlaceholder: "Inserisci la tua password",
      forgotPassword: "Hai dimenticato la password?",
      usePassword: "Usare la password?",
    },
    magic: {
      title: "Controlla la tua email",
      sent: "Ti abbiamo inviato un'email con un link di accesso. Aprilo, oppure copialo in questo browser, per accedere.",
      sameBrowser:
        "Usa lo stesso browser da cui hai richiesto l'accesso, altrimenti il link non funzionerà.",
      usePassword: "Se preferisci, usa la password.",
    },
    recover: {
      title: "Recupera il tuo account",
    },
    reset: {
      title: "Reimposta la password",
      repeatPassword: "Ripeti la password",
    },
    signup: {
      title: "Registrati",
      description: "Hai già un account?",
      namePlaceholder: "Inserisci il tuo nome",
      emailPlaceholder: "Inserisci la tua email",
      passwordPlaceholder: "Crea una password",
    },
    totp: {
      title: "Autenticazione a due fattori",
      description:
        "Inserisci il codice di verifica a 6 cifre generato dall'app.",
      verificationCode: "Codice di verifica",
    },
  },
  contact: {
    title: "Contattaci",
    description: "Saremo felici di ricevere un tuo messaggio.",
    address: "Indirizzo",
    addressValue: "545 Mavis Island, Chicago, IL 99191",
    phone: "Numero di telefono",
    phoneValue: "+39333",
    emailAddress: "Indirizzo email",
    emailValue: "hello{'@'}example.com",
    message: "Messaggio",
    emailSubject: "Contatto dal sito web da: {email}",
    sentTitle: "Messaggio inviato",
    sentDescription: "Grazie per averci contattato.",
    errorTitle: "Errore di contatto",
    errorDescription:
      "Si è verificato un problema con l'email. Controlla i dati o la connessione internet e riprova.",
  },
  home: {
    integrationsTitle: "Collega tutto",
    integrationsDescription:
      "Invia i tuoi dati alla nostra piattaforma e sfruttali al massimo.",
  },
  blog: {
    title: "Articoli recenti",
    description: "Pensieri dal mio mondo.",
    notFound: "Articoli non trovati",
    authorAvatar: "Avatar dell'autore",
  },
  docs: {
    search: "Cerca...",
    navigation: "Navigazione",
  },
  pageHeaderLinks: {
    copyPage: "Copia pagina",
    copyMarkdownLink: "Copia link Markdown",
    viewAsMarkdown: "Visualizza come Markdown",
    openInChatGPT: "Apri in ChatGPT",
    openInClaude: "Apri in Claude",
    openCopyActionsMenu: "Apri menu azioni di copia",
    copiedToClipboard: "Copiato negli appunti",
    aiPrompt: "Leggi {url} così posso farti domande al riguardo.",
  },
  settings: {
    title: "Impostazioni",
    profile: {
      title: "Profilo",
      description: "Queste informazioni saranno visibili pubblicamente.",
      name: "Nome",
      nameDescription: "Apparirà su ricevute, fatture e altre comunicazioni.",
      emailDescription:
        "Utilizzata per accedere, ricevere ricevute e aggiornamenti sul prodotto.",
      currentPassword: "Inserisci la password attuale.",
      validateEmailTitle: "Verifica l'indirizzo email",
      validateEmailDescription:
        "Ricevi un'email per verificare il tuo account.",
      sendEmail: "Invia email",
    },
    security: {
      title: "Sicurezza",
      descriptionWithoutPassword:
        "Proteggi il tuo account aggiungendo una password, attivando l'autenticazione a due fattori o entrambe.",
      descriptionWithPassword:
        "Proteggi ulteriormente il tuo account attivando l'autenticazione a due fattori. Per ogni modifica è richiesta la password attuale.",
      originalPassword: "Password attuale",
      useTotp: "Usa l'autenticazione a due fattori",
      newPassword: "Nuova password",
      repeatNewPassword: "Ripeti la nuova password",
      enableTitle: "Attiva 2FA",
      enableStepDownload:
        "Scarica sul dispositivo mobile un'app di autenticazione che supporti le password monouso temporanee (TOTP).",
      enableStepScan:
        "Apri l'app e scansiona il codice QR qui sotto per associare il dispositivo al tuo account.",
      manualKey:
        "Se non riesci a scansionare il codice, inserisci questa chiave:",
      enableStepVerify:
        "Inserisci il codice generato dall'app di autenticazione per associare l'account:",
      sixDigitCode: "Codice di verifica a 6 cifre",
      enable: "Attiva",
    },
  },
  moderation: {
    users: "Utenti",
    name: "Nome",
    status: "Stato",
    moderator: "Moderatore",
    passwordAuthentication: "Autenticazione con password",
    validated: "Verificata",
    twoFactor: "2FA",
    display: "Visualizza",
    newUser: "Nuovo utente",
    newUserDescription: "Crea un nuovo utente e inviagli una notifica.",
    profileName: "Nome del profilo",
    userCreated: "Utente creato",
    userCreatedDescription:
      "È stata inviata un'email all'utente con i nuovi dati di accesso.",
  },
  bpmn: {
    properties: "Proprietà",
    elements: "Elementi",
    start: "Inizio",
    startEvent: "Evento iniziale",
    end: "Fine",
    endEvent: "Evento finale",
    task: "Attività",
    taskNumber: "Attività {number}",
    userTask: "Attività utente",
    decision: "Decisione?",
    gateway: "Gateway",
    exclusiveGateway: "Gateway esclusivo",
    id: "ID",
    type: "Tipo",
    label: "Etichetta",
    deleteElement: "Elimina elemento",
    update: "Aggiorna",
    addElement: "Aggiungi elemento",
    zoomIn: "Ingrandisci",
    zoomOut: "Riduci",
    fitView: "Adatta alla vista",
  },
  notifications: {
    loginError: "Errore di accesso",
    loginErrorDescription:
      "Controlla i dati o la connessione internet e riprova.",
    sameBrowserDescription:
      "Assicurati di usare lo stesso browser e che il token non sia scaduto.",
    profileUpdated: "Profilo aggiornato",
    profileUpdatedDescription: "Le impostazioni sono state aggiornate.",
    profileUpdateError: "Errore nell'aggiornamento del profilo",
    submissionErrorDescription:
      "Controlla i dati inviati o la connessione internet e riprova.",
    twoFactor: "Autenticazione a due fattori",
    enableTwoFactorError:
      "Errore durante l'attivazione dell'autenticazione a due fattori",
    disableTwoFactorError:
      "Errore durante la disattivazione dell'autenticazione a due fattori",
    validationSent: "Email di verifica inviata",
    validationError: "Errore di verifica",
    validationErrorDescription: "Controlla la tua email e riprova.",
    invalidTokenDescription:
      "Token non valido. Controlla il link ricevuto via email e riprova.",
    recoveryDescription:
      "Se l'account esiste, riceverai un'email per reimpostare la password.",
    twoFactorError: "Errore di autenticazione a due fattori",
    twoFactorErrorDescription:
      "Impossibile verificare il codice. Assicurati che sia il più recente.",
    permissionDenied: "Permesso negato",
    permissionDeniedDescription:
      "Non hai il permesso di accedere a questa risorsa.",
    updateError: "Errore di aggiornamento",
    invalidRequest: "Richiesta non valida.",
  },
}
