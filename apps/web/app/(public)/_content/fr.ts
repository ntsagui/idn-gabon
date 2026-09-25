/**
 * Textes des pages publiques en français.
 * Centralisé ici pour faciliter l'extraction future vers une lib i18n
 * (next-intl ou équivalent) sans toucher aux composants.
 */

export const navTabs = [
  { href: "/about", label: "À propos" },
  { href: "/souverainete", label: "Souveraineté" },
  { href: "/services", label: "Services" },
  { href: "/admins", label: "Administrations" },
  { href: "/help", label: "Aide" },
  { href: "/status", label: "Transparence" },
] as const;

export const navActions = {
  signIn: "Se connecter",
  signUp: "Créer un compte",
  republic: "RÉPUBLIQUE GABONAISE",
  brand: "Identité Numérique",
} as const;

export const mobileNav = {
  menuLabel: "Ouvrir le menu",
  menuTitle: "Menu",
  menuDescription: "Navigation et actions du compte IDN.",
  closeLabel: "Fermer le menu",
  themeLabel: "Apparence",
} as const;

export const mobileFooter = {
  copyright: "Ntsagui digital",
} as const;

export const footer = {
  copyright: "Ntsagui digital",
  links: [
    { href: "/legal/mentions", label: "Mentions légales" },
    { href: "/legal/privacy", label: "Confidentialité" },
    { href: "/legal/terms", label: "Conditions d'utilisation" },
    { href: "/legal/accessibilite", label: "Accessibilité" },
    { href: "/contact", label: "Contact" },
    { href: "/verifier", label: "Vérifier un acte officiel" },
  ],
  skipToMain: "Aller au contenu principal",
} as const;

export const welcome = {
  meta: {
    title: "Accueil",
    description:
      "Identité Numérique du Gabon — un compte unique pour accéder à tous les services administratifs en ligne. Authentifiez-vous une fois, accédez à tout.",
  },
  eyebrow: "RÉPUBLIQUE GABONAISE · IDENTITÉ NUMÉRIQUE",
  title: {
    line1: "Un citoyen,",
    line2: "une identité numérique",
    line3: "et un portefeuille souverain.",
  },
  sub: "Authentifiez-vous une fois, accédez aux services administratifs raccordés. Votre vérification d'identité est traitée sur une infrastructure maîtrisée : aucune image, aucun gabarit biométrique n'est transmis à un tiers.",
  ctaPrimary: "Créer un compte IDN",
  ctaSecondary: "Se connecter",
  loa: {
    eyebrow: "NIVEAUX DE GARANTIE",
    items: [
      {
        level: 1,
        name: "Faible",
        description: "Email vérifié — services informatifs.",
      },
      {
        level: 2,
        name: "Substantiel",
        description:
          "Document lu optiquement et comparaison faciale avec détection de présentation frauduleuse.",
      },
      {
        level: 3,
        name: "Élevé",
        description:
          "Entretien vidéo avec un contrôleur habilité — décision humaine consignée.",
      },
    ] as const,
  },
} as const;

export const about = {
  meta: {
    title: "À propos",
    description:
      "L'IDN est l'infrastructure de confiance qui relie chaque citoyen, résident et visiteur aux services administratifs en ligne du Gabon.",
  },
  hero: {
    eyebrow: "À PROPOS D'IDN",
    title: "Une identité numérique souveraine pour chaque Gabonais·e.",
    sub: "L'IDN est l'infrastructure de confiance qui relie chaque citoyen, résident et visiteur aux services administratifs raccordés — sans recréer un compte à chaque fois, et sans qu'aucune donnée biométrique ne quitte l'infrastructure.",
  },
  /**
   * Grandeurs d'architecture, vraies indépendamment de toute adoption.
   * Interdit d'y publier un chiffre d'usage ou un taux de disponibilité qui
   * ne serait pas lu depuis le système — cf. doctrine de communication
   * publique (ADMINISTRATION.GA, docs/00_Transverse/06_Communication_Publique).
   */
  stats: [
    {
      value: "3",
      label: "Niveaux de garantie",
      hint: "alignés sur l'échelle eIDAS",
    },
    {
      value: "5",
      label: "Applications",
      hint: "citoyen, mobile, admin, contrôleur, développeur",
    },
    {
      value: "4",
      label: "Moteurs biométriques",
      hint: "auto-hébergés, vérifiés à chaque déploiement",
    },
    {
      value: "0",
      label: "Dépendance SaaS",
      hint: "aucune donnée biométrique ne sort de l'infrastructure",
    },
  ],
  principles: {
    eyebrow: "NOS PRINCIPES",
    items: [
      {
        title: "Souveraineté des données",
        description:
          "Les données et les clés restent la propriété de l'administration détentrice. Le retrait de la plateforme ne rend aucun dossier illisible.",
      },
      {
        title: "Vérification sans tiers",
        description:
          "Lecture du document, comparaison faciale et détection de présentation frauduleuse s'exécutent sur des modèles embarqués. Aucune image, aucun gabarit n'est transmis.",
      },
      {
        title: "Consentement explicite et révocable",
        description:
          "Chaque service obtient votre accord pour les seules données nécessaires. Vos consentements sont listables et révocables à tout moment.",
      },
      {
        title: "Niveaux de garantie appliqués",
        description:
          "Trois niveaux calibrés sur la sensibilité des services. Le niveau exigé est réellement vérifié : sans lui, vous êtes orienté vers le parcours de vérification, puis ramené à votre démarche.",
      },
      {
        title: "Réversibilité et non-dépendance",
        description:
          "Export en formats ouverts à tout moment, dépôt du code compilable, et aucun dispositif d'arrêt à distance — le format d'échange rejette à la validation tout paramètre de ce type.",
      },
      {
        title: "Conformité au droit gabonais",
        description:
          "Loi n° 001/2011 modifiée par la loi n° 025/2023, loi n° 025/2021 sur les transactions électroniques, ordonnance n° 0006/PR/2025 sur la digitalisation.",
      },
    ],
  },
  governance: {
    eyebrow: "GOUVERNANCE",
    body: "L'IDN est éditée par NTSAGUI DIGITAL SARL, société de droit gabonais. Le code du socle institutionnel est remis à l'État sous licence gouvernementale perpétuelle, avec droit d'auto-hébergement, d'adaptation et de maintenance par un tiers habilité. Nous proposons que chaque garantie énoncée ici fasse l'objet d'un test de réception exécuté devant l'administration — démarrer la plateforme réseau coupé, désinstaller un module et constater que les dossiers restent lisibles et exportables, reconstruire le socle depuis les sources remises sur une infrastructure vierge.",
  },
} as const;

/**
 * Page « Souveraineté ».
 *
 * Matière publiable de la note NTSAGUI-2026-SI-001 : capacités de protection,
 * limites de conception, réserves assumées. ⚠️ La section « État d'exposition »
 * de cette note est à diffusion restreinte et n'a rien à faire ici, sous aucune
 * formulation. Cf. ADMINISTRATION.GA, docs/00_Transverse/06_Communication_Publique.
 */
export const sovereignty = {
  meta: {
    title: "Souveraineté",
    description:
      "Ce que l'Identité Numérique protège, ce qu'elle ne fait pas, et ce que nous refusons d'affirmer. Vérification biométrique sans tiers, traçabilité opposable, réversibilité et non-dépendance.",
  },
  hero: {
    eyebrow: "SOUVERAINETÉ",
    title: "Une capacité que l'on ne peut ni localiser, ni auditer, ni interrompre soi-même n'est pas une capacité nationale.",
    sub: "La donnée administrative d'un État est un actif stratégique : elle dit qui sont ses agents, ce que ses institutions décident, comment ses ressources circulent. Cette page expose ce que l'infrastructure protège, ce qu'elle refuse de faire, et ce que nous nous interdisons d'affirmer.",
  },
  thesis: {
    eyebrow: "LE PRINCIPE",
    quote:
      "Une administration garde ses données, ses clés et son autorité.",
    body: "La plateforme fournit l'identité, le transport, la traçabilité et les outils de travail. Elle n'est jamais propriétaire du dossier administratif, et son retrait ne rend aucun document illisible. La sécurité informationnelle ne se pense plus comme un périmètre à défendre, mais comme une chaîne de dépendances à maîtriser : où s'exécute le code, où réside la donnée, qui détient les clés, qui peut interrompre le service.",
  },
  protections: {
    eyebrow: "CE QUE L'INFRASTRUCTURE PROTÈGE",
    items: [
      {
        title: "L'intégrité de l'identité",
        description:
          "Un État qui ne peut pas établir avec certitude qu'une personne est bien celle qu'elle prétend être ne peut sécuriser ni sa fonction publique, ni ses frontières, ni ses prestations. La vérification est entièrement souveraine : les modèles d'analyse sont embarqués dans une infrastructure maîtrisée, et ni image de document, ni gabarit facial de citoyen gabonais n'est transmis à un tiers, à aucun moment.",
      },
      {
        title: "La décision humaine au niveau le plus fort",
        description:
          "Le niveau de garantie le plus élevé n'est délivré qu'après un entretien vidéo avec un agent habilité, en salle chiffrée, avec décision consignée. La machine propose, l'État dispose. Une tentative d'usurpation détectée entraîne un rejet automatique quels que soient les autres résultats, et tout cas incertain part en revue humaine plutôt qu'en acceptation.",
      },
      {
        title: "La traçabilité opposable",
        description:
          "Le journal d'accès est conçu en ajout seul : aucune fonction du système ne permet de modifier ni de supprimer une entrée. Plus de quarante types d'événements sont typés — authentification, consultation de dossier, contrôle d'identité, modification de droits, révocation de consentement, tentative de captation d'identité — chacun portant son auteur, son origine et son horodatage.",
      },
      {
        title: "La protection contre la captation d'identité",
        description:
          "Une identité créée au guichet ne peut être revendiquée qu'avec un code à usage unique, conservé sous forme d'empreinte, expirant, à tentatives plafonnées et avec verrouillage. Connaître un numéro d'identification imprimé sur une carte ne suffit pas à s'emparer d'une identité. Les échecs répétés sur une même identité sont journalisés comme signal spécifique.",
      },
      {
        title: "Des communications qui ne sortent pas de l'État",
        description:
          "Courrier administratif, messagerie interne, annuaire institutionnel, appels et réunions fonctionnent sur infrastructure maîtrisée. Le point aveugle le plus fréquent n'est pas l'effraction : c'est l'usage. Aucun pare-feu ne corrige un agent qui transmet un projet d'acte par une application de messagerie personnelle, parce que l'État ne lui en a pas fourni d'autre. Une interdiction sans substitut n'est jamais respectée ; un substitut plus commode rend l'interdiction superflue.",
      },
      {
        title: "Le secret administratif face à l'IA",
        description:
          "L'assistant affiche à l'agent l'objet réel des courriers et dossiers, mais ne transmet jamais cet objet au modèle de langage : la vue servie à l'intelligence artificielle est caviardée, la phrase utile est composée par le serveur, et l'historique de conversation ne rejoue pas les objets. Trois barrières indépendantes, appliquées par défaut en mode fermé. Le secret administratif ne dépend pas de la bonne volonté d'un fournisseur de modèle.",
      },
    ],
  },
  bothWays: {
    title: "Une traçabilité qui protège dans les deux sens",
    body: "Le même journal établit l'imputabilité de l'agent — utile en matière de menace interne et de contrôle hiérarchique — et la protection du citoyen, qui consulte l'historique des accès à son propre dossier et reçoit une notification immédiate lorsque son identité est présentée à un contrôleur. Un dispositif de traçabilité qui ne bénéficie qu'à l'administration est contesté ; celui qui bénéficie aussi à la personne est accepté, donc effectif.",
  },
  limits: {
    eyebrow: "CE QUE LA PLATEFORME NE FAIT PAS",
    intro:
      "Un outil dont les limites ne sont pas écrites est un outil dont l'usage sera un jour contesté. Poser ces limites protège l'État autant que le citoyen, et conditionne la solidité juridique des actes produits.",
    items: [
      {
        capability: "Interception de communications privées",
        position:
          "Absente du produit et hors de son objet. La plateforme sécurise les communications de l'administration, sur des comptes professionnels, dans un cadre de service public.",
      },
      {
        capability: "Recherche biométrique de masse (un-vers-plusieurs)",
        position:
          "N'existe pas. La reconnaissance faciale est employée exclusivement en comparaison un-à-un entre un document et son porteur, au moment d'une vérification sollicitée par la personne.",
      },
      {
        capability: "Profilage politique, syndical, ethnique ou confessionnel",
        position:
          "Exclu. La loi gabonaise range ces données parmi les données sensibles, et l'autorité de protection a déjà sanctionné un fichage délibéré de cette nature.",
      },
      {
        capability: "Agrégation de dossiers entre administrations sans base légale",
        position:
          "Architecturalement empêchée : chaque administration reste détentrice de sa donnée, et l'interconnexion de fichiers est soumise à autorisation préalable de l'autorité de protection.",
      },
      {
        capability: "Exploitation secondaire des données par l'éditeur",
        position:
          "Interdite par contrat et par conception. Les seules données techniques transmises à l'éditeur sont des compteurs pseudonymisés, sans contenu ni identifiant nominatif.",
      },
    ],
  },
  continuity: {
    eyebrow: "CONTINUITÉ ET NON-DÉPENDANCE",
    intro:
      "Une infrastructure d'État doit continuer de fonctionner quand son fournisseur est injoignable, en litige, ou soumis à une décision étrangère. Ces garanties sont inscrites dans le produit, non dans une promesse commerciale.",
    items: [
      {
        guarantee: "Aucun arrêt à distance",
        implementation:
          "Le format d'échange rejette à la validation tout paramètre d'interruption, de désactivation de nœud ou de commande distante. La garantie est appliquée par le code, pas seulement écrite.",
      },
      {
        guarantee: "Fonctionnement en réseau coupé",
        implementation:
          "Les droits d'usage sont mis en cache avec période de grâce ; le travail local continue, les échanges se remettent en file et se rejouent sans double effet au retour du réseau. Dans un pays dont la connectivité est inégale, un système exigeant une liaison permanente n'est pas déployable là où il serait le plus utile.",
      },
      {
        guarantee: "Réversibilité",
        implementation:
          "Export en formats ouverts à tout moment ; le retrait d'un module laisse les dossiers lisibles, classables et exportables. La procédure de restitution est contractualisée.",
      },
      {
        guarantee: "Séquestre du code",
        implementation:
          "Dépôt du code compilable, libéré en cas de défaillance ou de refus de maintenance du fournisseur, avec droit de continuité interne.",
      },
      {
        guarantee: "Rapatriement sans reconstruction",
        implementation:
          "Mêmes conteneurs, mêmes interfaces, mêmes données : le passage à une infrastructure nationale est un déplacement d'exécution, non une reconstruction. C'est ce qui permet à l'État de décider du calendrier sans être prisonnier d'une architecture.",
      },
    ],
  },
  reserves: {
    eyebrow: "CE QUE NOUS N'AFFIRMONS PAS",
    intro:
      "Par souci d'exactitude devant l'autorité publique et devant les personnes. La crédibilité d'un dispositif technique se mesure à ce qu'il refuse d'affirmer.",
    items: [
      {
        title: "La signature n'est pas une signature qualifiée",
        body: "Ce qui est produit est une attestation cryptographique vérifiable par un tiers, non une signature qualifiée au sens réglementaire — aucun prestataire de certification n'étant à ce jour agréé au Gabon, faute du décret d'application de la loi n° 025/2021.",
      },
      {
        title: "Le numéro d'identification personnel est déclaratif",
        body: "Son adossement au registre biométrique national suppose une convention avec l'administration détentrice de ce registre et de l'état civil.",
      },
      {
        title: "Aucun taux de performance biométrique n'est avancé",
        body: "Aucun chiffre de performance ne sera publié tant qu'une campagne de calibrage sur documents réels gabonais n'aura pas été conduite. Un taux mesuré ailleurs, sur d'autres documents, ne dit rien de ce qui se passera ici.",
      },
      {
        title: "Aucun taux de disponibilité n'est garanti à ce jour",
        body: "Un engagement de niveau de service se mesure sur une période d'exploitation réelle et se contractualise avec l'autorité publique. Les indicateurs constatés seront publiés dès que l'exploitation en régime nominal le permettra, y compris lorsqu'ils seront défavorables.",
      },
    ],
  },
  proof: {
    title: "La souveraineté ne se décrète pas dans un contrat : elle se vérifie.",
    body: "Nous proposons que chaque garantie énoncée sur cette page fasse l'objet d'un test de réception exécuté devant l'administration : démarrer la plateforme réseau coupé, désinstaller un module et constater que les dossiers restent lisibles et exportables, reconstruire le socle depuis les sources remises sur une infrastructure vierge. Ce qui ne se prouve pas ne devrait pas être acheté.",
  },
  legal: {
    eyebrow: "FONDEMENTS JURIDIQUES",
    intro:
      "Ces références sont reproduites telles que publiées au Journal officiel de la République Gabonaise, afin que chaque affirmation de cette page puisse être vérifiée directement par les services compétents.",
    items: [
      {
        reference: "Constitution du 19 décembre 2024, art. 14 al. 4",
        scope:
          "Protection de l'intimité de la vie privée à l'égard des traitements informatiques.",
      },
      {
        reference:
          "Loi n° 001/2011 du 25 septembre 2011, modifiée par la loi n° 025/2023 du 9 juillet 2023",
        scope:
          "Protection des données à caractère personnel : autorisation préalable pour la biométrie et l'interconnexion de fichiers (art. 81), encadrement des transferts (art. 87 et 88), sanctions (art. 199 à 204).",
      },
      {
        reference: "Loi n° 025/2021 du 28 décembre 2021",
        scope:
          "Transactions électroniques : force probante et scellement (art. 40, 65, 70, 71), horodatage (art. 42 et 97), conservation minimale de dix ans (art. 78 et 80), copie hébergée sur le territoire national (art. 138).",
      },
      {
        reference: "Loi n° 027/2023 du 11 juillet 2023",
        scope:
          "Cybersécurité et lutte contre la cybercriminalité : standards de sécurité imposés aux organisations publiques et privées, régime de la cryptologie (art. 47 à 62).",
      },
      {
        reference: "Ordonnance n° 0006/PR/2025 du 11 août 2025",
        scope:
          "Digitalisation en République Gabonaise : souveraineté (art. 6), confidentialité, intégrité, disponibilité et authenticité des données (art. 10), interconnexion obligatoire des administrations (art. 18).",
      },
      {
        reference: "Ordonnance n° 0011/PR/2026 du 26 février 2026",
        scope:
          "Réseaux sociaux, plateformes numériques et intelligence artificielle : interdiction des contenus falsifiés, sanction de l'usurpation d'identité par voie technologique.",
      },
      {
        reference: "Convention de Malabo",
        scope:
          "Convention de l'Union africaine sur la cybersécurité et la protection des données à caractère personnel — ratifiée par le Gabon le 17 octobre 2024.",
      },
      {
        reference: "Avis motivé n° 026/APDVP du 14 novembre 2023",
        scope:
          "Grille d'exigences applicable aux traitements biométriques d'État : précision des données collectées, limitation des accès par profil, authentification renforcée, interdiction du stockage non sécurisé.",
      },
    ],
  },
} as const;

export const administrations = {
  meta: {
    title: "Pour les administrations",
    description:
      "Raccordez votre service à l'IDN par un protocole standard. Serveur OpenID Connect complet, aucun développement spécifique, et aucune base métier absorbée.",
  },
  hero: {
    eyebrow: "POUR LES ADMINISTRATIONS",
    title: "Votre administration garde ses données, ses clés et son autorité.",
    sub: "L'IDN fournit l'identité et la preuve du niveau de garantie. Elle ne recopie jamais votre dossier administratif : vous conservez la définition du service, les règles d'éligibilité, la décision et l'acte. Raccordement par protocole standard, conforme à la loi n° 001/2011 modifiée et à l'ordonnance n° 0006/PR/2025.",
  },
  steps: [
    {
      n: "01",
      title: "Demande de raccordement",
      description:
        "Constituez un dossier technique et fonctionnel. L'interconnexion de fichiers, lorsqu'elle est nécessaire, relève du régime d'autorisation préalable de l'article 81 de la loi n° 001/2011.",
    },
    {
      n: "02",
      title: "Qualification du niveau de garantie",
      description:
        "Le niveau minimum (1, 2 ou 3) est arrêté selon la sensibilité du service. Il est transmis dans la demande d'authentification et réellement appliqué.",
    },
    {
      n: "03",
      title: "Mise en production",
      description:
        "Test sur bac à sable, revue de sécurité, déploiement progressif puis bascule. Vos administrateurs techniques sont formés — le transfert de compétences est contractualisé.",
    },
  ],
  cta: {
    title: "Vous êtes développeur·se intégrant un service public ?",
    sub: "Le portail développeur expose les SDK, la sandbox et les clés OAuth.",
    primary: "Portail développeur",
    secondary: "Documentation",
  },
} as const;

export const help = {
  meta: {
    title: "Aide & FAQ",
    description:
      "Réponses aux questions fréquentes sur IDN, les niveaux de garantie, la sécurité et la confidentialité.",
  },
  hero: {
    eyebrow: "AIDE & FAQ",
    title: "Questions fréquentes.",
    sub: "Vous ne trouvez pas votre réponse ? Écrivez-nous par le formulaire de contact.",
  },
  faqs: [
    {
      q: "Qu'est-ce qu'un niveau de garantie (LoA) ?",
      a: "Le niveau de garantie indique le degré de certitude avec lequel l'IDN connaît votre identité. Niveau 1 (faible) : email vérifié. Niveau 2 (substantiel) : lecture de votre pièce d'identité et comparaison faciale avec détection de présentation frauduleuse. Niveau 3 (élevé) : entretien vidéo avec un contrôleur habilité et décision humaine consignée. Le niveau le plus fort passe par un agent, jamais par une machine seule.",
    },
    {
      q: "Comment passer du Niveau 1 au Niveau 2 ?",
      a: "Depuis votre tableau de bord, lancez la vérification d'identité. Vous serez guidé pour photographier votre CNI ou votre passeport, puis effectuer un selfie animé. Si un service exige un niveau que vous n'avez pas encore, vous êtes orienté vers ce parcours puis ramené à votre démarche.",
    },
    {
      q: "Ma photo et mes données biométriques sortent-elles du pays ?",
      a: "Non. Le moteur de vérification est un service auto-hébergé : lecture optique du document, lecture de la bande de lecture automatique du passeport selon la norme ICAO 9303, comparaison faciale et détection de présentation frauduleuse s'exécutent sur des modèles embarqués dans l'infrastructure. Aucune image et aucun gabarit biométrique n'est transmis à un tiers, à aucun moment.",
    },
    {
      q: "La reconnaissance faciale me recherche-t-elle dans une base ?",
      a: "Non. La comparaison est faite un-à-un, entre le document que vous présentez et vous-même, au moment d'une vérification que vous avez sollicitée. Aucune recherche biométrique de masse — un visage comparé à une base entière — n'existe dans le produit.",
    },
    {
      q: "Qui a consulté mon dossier, et comment le savoir ?",
      a: "Le journal d'accès est en ajout seul : aucune fonction du système ne permet d'en modifier ou d'en supprimer une entrée. Vous consultez l'historique des accès à votre propre dossier, et vous recevez une notification immédiate lorsque votre identité est présentée à un contrôleur. La traçabilité protège dans les deux sens : elle établit l'imputabilité de l'agent et votre propre protection.",
    },
    {
      q: "Que se passe-t-il si quelqu'un crée une identité à ma place ?",
      a: "Un organisme habilité peut créer une identité pour vous — cas de l'enrôlement au guichet ou en zone rurale. Vous la réclamez ensuite au moyen d'un code à usage unique, conservé sous forme d'empreinte, expirant, à tentatives plafonnées et avec verrouillage. Connaître un numéro d'identification imprimé sur une carte ne suffit pas à s'emparer d'une identité, et les échecs répétés sur une même identité sont journalisés comme signal spécifique.",
    },
    {
      q: "Mes données sont-elles partagées avec les administrations ?",
      a: "Uniquement avec votre consentement explicite, et seulement les champs nécessaires au service demandé. Vos consentements sont listables et révocables à tout moment. L'administration qui vous rend le service reste propriétaire de son dossier : l'IDN ne recopie pas les bases métier.",
    },
    {
      q: "Que faire si j'ai perdu mon téléphone ?",
      a: "Connectez-vous depuis un autre appareil, allez dans Paramètres → Appareils & sessions, et révoquez la session de l'appareil perdu. Si vous avez entièrement perdu l'accès au compte, contactez le support avec votre code de récupération.",
    },
    {
      q: "Comment supprimer mon compte ?",
      a: "Paramètres → Données & confidentialité → Supprimer mon compte. Les journaux d'audit sont ensuite conservés sous forme anonymisée pendant la durée prévue par la réglementation, sans lien possible avec votre identité.",
    },
  ],
  callCenter: {
    title: "Besoin d'aide ?",
    sub: "Écrivez à support@identite.ga — nous répondons sous 48 heures ouvrées.",
    cta: "Formulaire",
  },
} as const;

/**
 * Index `/legal` — liste des sous-pages obligatoires.
 * Les sous-pages dédiées (privacy, terms, mentions, accessibilite,
 * delete-account, licenses) ont des URLs stables linkables depuis les
 * stores et l'app mobile.
 */
export const legal = {
  meta: {
    title: "Informations légales",
    description:
      "Politique de confidentialité, conditions d'utilisation, mentions légales, accessibilité et suppression de compte pour la plateforme IDN.",
  },
  hero: {
    eyebrow: "INFORMATIONS LÉGALES",
    title: "Vos droits, nos engagements.",
    sub: "Toutes les informations légales et de conformité de la plateforme Identité Numérique du Gabon.",
  },
  items: [
    {
      href: "/legal/privacy",
      title: "Politique de confidentialité",
      description:
        "Données collectées, finalités, durée de conservation, droits RGPD et loi 001/2011.",
    },
    {
      href: "/legal/terms",
      title: "Conditions d'utilisation",
      description:
        "Règles d'usage de la plateforme, engagements de l'utilisateur, responsabilités.",
    },
    {
      href: "/legal/mentions",
      title: "Mentions légales",
      description:
        "Éditeur, hébergeur, contact, responsable de traitement.",
    },
    {
      href: "/legal/accessibilite",
      title: "Accessibilité",
      description:
        "Déclaration de conformité au référentiel RGAA 4.1.2.",
    },
    {
      href: "/legal/delete-account",
      title: "Suppression de compte",
      description:
        "Comment supprimer votre compte IDN et toutes vos données personnelles.",
    },
    {
      href: "/legal/licenses",
      title: "Licences open source",
      description:
        "Composants logiciels tiers utilisés et leurs licences.",
    },
  ],
} as const;

export const privacy = {
  meta: {
    title: "Politique de confidentialité",
    description:
      "Données collectées, finalités, durée de conservation et droits des personnes pour la plateforme IDN.",
  },
  hero: {
    eyebrow: "POLITIQUE DE CONFIDENTIALITÉ",
    title: "Protection de vos données personnelles.",
    sub: "Mise à jour le 11 août 2026 · loi n° 001/2011 du 25 septembre 2011, modifiée par la loi n° 025/2023 du 9 juillet 2023",
  },
  sections: [
    {
      title: "Responsable de traitement",
      body: "NTSAGUI DIGITAL SARL, Rue des Résidences, Batterie IV, BP 638, Libreville, République Gabonaise. RCCM GA-LBV-01-2025-B12-01029. Délégué à la protection des données : privacy@identite.ga.",
    },
    {
      title: "Données collectées",
      body: "Identité pivot (nom, prénom, date et lieu de naissance, sexe, nationalité), email, numéro de téléphone, données biométriques (empreinte du visage), pièces d'identité scannées, journaux d'authentification, adresse postale (iBoîte), métadonnées de connexion (IP, type d'appareil).",
    },
    {
      title: "Finalités",
      body: "Authentification unifiée aux services administratifs, vérification d'identité (KYC), prévention de la fraude, audit légal, courrier numérique iBoîte, archivage personnel iDocument.",
    },
    {
      title: "Base légale",
      body: "Loi n° 001/2011 du 25 septembre 2011 relative à la protection des données à caractère personnel, modifiée par la loi n° 025/2023 du 9 juillet 2023 : exécution d'une mission de service public, consentement explicite pour les fonctionnalités optionnelles, obligation légale pour les journaux d'audit. Les traitements biométriques et les interconnexions de fichiers relèvent du régime d'autorisation préalable de l'article 81.",
    },
    {
      title: "Durée de conservation",
      body: "Données du compte : tant que le compte est actif, plus 30 jours après demande de suppression. Logs d'audit : 5 ans après suppression (obligation légale). Données biométriques : non conservées après vérification — seul un hash irréversible est gardé. Pièces d'identité scannées : 90 jours après vérification puis suppression.",
    },
    {
      title: "Destinataires",
      body: "Aucune donnée n'est transférée à des tiers commerciaux. Les administrations partenaires ne reçoivent que les champs strictement nécessaires au service demandé, et uniquement après votre consentement explicite (OAuth scopes).",
    },
    {
      title: "Hébergement et transferts",
      body: "La plateforme est conçue pour être exploitée sur infrastructure nationale : mêmes images logicielles, mêmes conteneurs, mêmes interfaces — le déploiement sur le centre de données souverain est un déplacement d'exécution, non une reconstruction. Le rapatriement effectif des données régaliennes relève d'une décision d'affectation de l'autorité publique ; l'article 138 de la loi n° 025/2021 impose la conservation d'une copie sur le territoire national. Tout transfert hors du Gabon relève des articles 87 et 88 de la loi n° 001/2011 modifiée. Aucune donnée biométrique n'est transmise à un tiers, en aucune circonstance.",
    },
    {
      title: "Droits des personnes",
      body: "Vous disposez d'un droit d'accès, de rectification, de portabilité, d'opposition et de suppression. Exercer vos droits : depuis l'app Identité Numérique → Paramètres → Confidentialité, ou par email à privacy@identite.ga, ou par courrier à Ntsagui digital avec copie de la pièce d'identité.",
    },
    {
      title: "Suppression de compte",
      body: "Vous pouvez supprimer votre compte à tout moment depuis Paramètres → Confidentialité → Supprimer mon compte. La suppression est effective après un délai de 30 jours (annulable pendant cette période en vous reconnectant). Voir aussi /legal/delete-account.",
    },
    {
      title: "Cookies",
      body: "IDN utilise uniquement des cookies de session strictement nécessaires au fonctionnement. Aucun traceur publicitaire ou analytique tiers. Aucun consentement n'est requis pour ces cookies essentiels.",
    },
    {
      title: "Ce que nous ne faisons pas",
      body: "Aucune recherche biométrique de masse : la comparaison faciale est faite un-à-un, entre un document et son porteur, au moment d'une vérification que vous avez sollicitée. Aucun profilage politique, syndical, ethnique ou confessionnel — la loi gabonaise range ces données parmi les données sensibles. Aucune agrégation de dossiers entre administrations sans base légale. Aucune exploitation secondaire de vos données par l'éditeur : les seules données techniques qui lui sont transmises sont des compteurs pseudonymisés, sans contenu ni identifiant nominatif.",
    },
    {
      title: "Réclamation",
      body: "En cas de litige, vous pouvez saisir l'Autorité de protection des données à caractère personnel et de la vie privée (APDVP) de la République Gabonaise.",
    },
  ],
} as const;

export const terms = {
  meta: {
    title: "Conditions d'utilisation",
    description:
      "Règles d'usage de la plateforme Identité Numérique du Gabon : compte, sécurité, engagements et responsabilités.",
  },
  hero: {
    eyebrow: "CONDITIONS D'UTILISATION",
    title: "Règles d'usage de la plateforme.",
    sub: "Mise à jour le 11 août 2026 · acceptées à la création du compte",
  },
  sections: [
    {
      title: "Objet",
      body: "Les présentes conditions régissent l'utilisation de la plateforme Identité Numérique du Gabon (IDN), éditée par NTSAGUI DIGITAL SARL. La création d'un compte vaut acceptation pleine et entière.",
    },
    {
      title: "Éligibilité",
      body: "Le compte IDN est ouvert à toute personne physique citoyenne, résidente ou visiteuse du Gabon, âgée d'au moins 16 ans. Les mineurs de moins de 16 ans nécessitent l'accord d'un représentant légal.",
    },
    {
      title: "Identité réelle",
      body: "Vous vous engagez à fournir des informations exactes et à jour. Toute fausse déclaration peut entraîner la suspension du compte et des poursuites pénales conformément au code pénal gabonais.",
    },
    {
      title: "Sécurité du compte",
      body: "Vous êtes responsable de la confidentialité de vos moyens d'authentification (mot de passe, code PIN, passkey). Toute opération réalisée avec vos identifiants est réputée effectuée par vous. Signalez immédiatement toute utilisation frauduleuse à security@identite.ga.",
    },
    {
      title: "Usage acceptable",
      body: "Il est interdit d'utiliser IDN pour des activités illégales, de tenter de contourner les mesures de sécurité, d'usurper l'identité d'un tiers ou de perturber le service. Toute violation entraîne la suspension immédiate.",
    },
    {
      title: "Disponibilité",
      body: "Les interruptions programmées et les incidents sont annoncés sur identite.ga/status. Aucun taux de disponibilité n'est ici garanti : un engagement de niveau de service se mesure sur une période d'exploitation réelle et se contractualise avec l'autorité publique concernée. Nous publierons les indicateurs constatés dès que l'exploitation en régime nominal le permettra, y compris lorsqu'ils seront défavorables.",
    },
    {
      title: "Continuité",
      body: "La plateforme ne comporte aucun dispositif d'arrêt à distance : le format d'échange rejette à la validation tout paramètre d'interruption, de désactivation de nœud ou de commande distante. Le travail local se poursuit en réseau coupé, les échanges se remettent en file et se rejouent sans double effet au retour du réseau.",
    },
    {
      title: "Responsabilité",
      body: "NTSAGUI DIGITAL SARL n'est pas responsable des contenus, services ou actions des administrations tierces accessibles via l'IDN. Sa responsabilité est limitée aux dommages directs résultant d'une faute prouvée.",
    },
    {
      title: "Évolution",
      body: "Ces conditions peuvent être modifiées. Les utilisateurs sont notifiés 30 jours avant entrée en vigueur. La poursuite d'utilisation vaut acceptation des nouvelles conditions.",
    },
    {
      title: "Droit applicable",
      body: "Les présentes conditions sont régies par le droit gabonais. Tout litige relève des tribunaux compétents de Libreville.",
    },
  ],
} as const;

export const mentions = {
  meta: {
    title: "Mentions légales",
    description:
      "Éditeur, hébergeur, directeur de publication et coordonnées de la plateforme Identité Numérique du Gabon.",
  },
  hero: {
    eyebrow: "MENTIONS LÉGALES",
    title: "Éditeur et hébergeur.",
    sub: "Conformément à la loi n° 001/2011 modifiée et à l'ordonnance n° 0006/PR/2025",
  },
  sections: [
    {
      title: "Éditeur",
      body: "NTSAGUI DIGITAL SARL, société à responsabilité limitée de droit gabonais au capital de 5 000 000 FCFA. RCCM GA-LBV-01-2025-B12-01029 · NIF 2025 0102 2429 R · enregistrement ANPI-Gabon n° ANPI2420833915011 du 15 décembre 2025. Siège : Rue des Résidences, Batterie IV, BP 638, Libreville, République Gabonaise.",
    },
    {
      title: "Directeur de la publication",
      body: "M. Yoann ETENO-MBOUROU, gérant de NTSAGUI DIGITAL SARL.",
    },
    {
      title: "Contact",
      body: "Téléphone : 066 83 06 73. Support : support@identite.ga. Confidentialité : privacy@identite.ga. Sécurité : security@identite.ga.",
    },
    {
      title: "Hébergement",
      body: "La plateforme est conçue pour être exploitée sur infrastructure nationale, au moyen des mêmes images logicielles. L'affectation au centre de données souverain et ses conditions d'exploitation relèvent d'une décision de l'autorité publique. Nous ne revendiquons pas un hébergement que l'État n'a pas décidé.",
    },
    {
      title: "Propriété intellectuelle",
      body: "Le code du socle institutionnel est remis à l'État sous licence gouvernementale perpétuelle, avec droit d'auto-hébergement, d'adaptation et de maintenance par un tiers habilité, et fait l'objet d'un dépôt de code compilable libérable en cas de défaillance ou de refus de maintenance de l'éditeur. Les composants tiers utilisés et leurs licences sont listés sur /legal/licenses. Les marques, logos et identité visuelle de la République Gabonaise sont la propriété de l'État.",
    },
    {
      title: "Responsable de traitement",
      body: "NTSAGUI DIGITAL SARL. Délégué à la protection des données : privacy@identite.ga. Autorité de contrôle : Autorité de protection des données à caractère personnel et de la vie privée (APDVP).",
    },
  ],
} as const;

export const accessibility = {
  meta: {
    title: "Accessibilité",
    description:
      "Déclaration de conformité au référentiel RGAA 4.1.2 pour la plateforme Identité Numérique du Gabon.",
  },
  hero: {
    eyebrow: "ACCESSIBILITÉ",
    title: "Engagement d'accessibilité numérique.",
    sub: "Référentiel WCAG 2.1 niveau AA · conformité partielle, audit externe non encore conduit",
  },
  sections: [
    {
      title: "Engagement",
      body: "NTSAGUI DIGITAL SARL s'engage à rendre la plateforme Identité Numérique accessible à toutes et tous, en prenant pour référence le référentiel WCAG 2.1 niveau AA. Un service d'identité qui exclut une partie de la population manque son objet même.",
    },
    {
      title: "État de conformité",
      body: "La plateforme est en conformité partielle. Les contrôles conduits à ce jour sont internes : navigation au clavier, noms accessibles, contrastes, structure des titres, absence de débordement horizontal. Aucun audit externe n'a encore été conduit — nous ne publions donc aucun taux de conformité, un chiffre de cette nature n'ayant de valeur que mesuré par un tiers selon une méthode opposable.",
    },
    {
      title: "Technologies utilisées",
      body: "HTML5, CSS3, JavaScript (React), ARIA. Compatible avec les lecteurs d'écran VoiceOver (iOS), TalkBack (Android), NVDA et JAWS (Windows).",
    },
    {
      title: "Tests et navigateurs",
      body: "Testée sur Safari 17+, Chrome 120+, Firefox 120+, Edge 120+. Sur iOS 16+ et Android 9+. Avec VoiceOver, TalkBack et clavier seul.",
    },
    {
      title: "Limitations connues",
      body: "Certaines pages dynamiques (tableau de bord, scanner QR) ne sont pas encore 100 % conformes. Le module iCV studio est partiellement accessible. Ces points seront corrigés d'ici fin 2026.",
    },
    {
      title: "Signaler un problème",
      body: "Vous rencontrez un obstacle ? Écrivez à accessibilite@identite.ga en décrivant la page et la difficulté rencontrée. Nous répondons sous 5 jours ouvrés.",
    },
    {
      title: "Recours",
      body: "Si une réponse satisfaisante n'est pas apportée, vous pouvez saisir l'Autorité de protection des données à caractère personnel et de la vie privée (APDVP) lorsque la difficulté touche à l'exercice de vos droits sur vos données.",
    },
  ],
} as const;

export const deleteAccount = {
  meta: {
    title: "Supprimer mon compte",
    description:
      "Comment supprimer définitivement votre compte Identité Numérique et toutes vos données personnelles.",
  },
  hero: {
    eyebrow: "SUPPRESSION DE COMPTE",
    title: "Supprimer votre compte IDN.",
    sub: "Vous pouvez supprimer votre compte et toutes vos données à tout moment, gratuitement.",
  },
  inAppTitle: "Depuis l'application mobile",
  inAppSteps: [
    "Ouvrez l'application Identité Numérique sur votre téléphone.",
    "Allez dans Profil → Confidentialité → Supprimer mon compte.",
    "Confirmez en saisissant votre adresse email.",
    "Un délai de 30 jours vous est accordé pour annuler (reconnectez-vous pendant cette période).",
    "Au-delà de 30 jours, vos données sont anonymisées de manière irréversible.",
  ] as const,
  byEmailTitle: "Si vous n'avez plus accès à l'application",
  byEmailBody:
    "Envoyez un email à privacy@identite.ga avec pour objet « Demande de suppression de compte » et en pièce jointe une copie de votre pièce d'identité. Nous traiterons votre demande sous 7 jours ouvrés.",
  whatIsDeletedTitle: "Ce qui est supprimé",
  whatIsDeleted: [
    "Vos informations personnelles (nom, email, téléphone, adresse).",
    "Vos pièces d'identité scannées et vérifications KYC.",
    "Votre courrier iBoîte et vos pièces jointes.",
    "Vos cartes iCarte et vos CV iCV.",
    "Vos documents archivés dans iDocument.",
    "Vos passkeys et sessions actives.",
  ] as const,
  whatIsKeptTitle: "Ce qui est conservé (obligation légale)",
  whatIsKeptBody:
    "Conformément à la loi n° 001/2011 modifiée et à la réglementation gabonaise, les journaux d'audit (horodatage des connexions et des opérations) sont conservés de manière anonymisée, sans lien possible avec votre identité personnelle. Le journal étant en ajout seul, il ne peut être ni modifié ni effacé — c'est ce qui en fait une preuve opposable, y compris en votre faveur.",
  contactTitle: "Une question ?",
  contactBody:
    "Pour toute question sur la suppression de votre compte ou l'exercice de vos droits sur vos données, écrivez à privacy@identite.ga.",
} as const;

export const licenses = {
  meta: {
    title: "Licences open source",
    description:
      "Composants logiciels tiers utilisés par la plateforme Identité Numérique du Gabon et leurs licences respectives.",
  },
  hero: {
    eyebrow: "LICENCES OPEN SOURCE",
    title: "Composants tiers utilisés.",
    sub: "IDN s'appuie sur l'écosystème open source. Nous remercions les communautés.",
  },
  intro:
    "La plateforme Identité Numérique utilise des composants logiciels open source publiés sous licences permissives (MIT, Apache 2.0, BSD, ISC) compatibles avec un usage en service public. Les modèles d'analyse employés par le moteur de vérification d'identité sont eux aussi des modèles ouverts, embarqués dans l'image logicielle : c'est ce qui permet à la chaîne biométrique de fonctionner sans aucune dépendance à un prestataire étranger. La liste complète et exhaustive est disponible sur demande à legal@identite.ga.",
  groups: [
    {
      title: "Framework & runtime",
      items: [
        { name: "React", license: "MIT", url: "https://reactjs.org" },
        { name: "React Native", license: "MIT", url: "https://reactnative.dev" },
        { name: "Expo", license: "MIT", url: "https://expo.dev" },
        { name: "Next.js", license: "MIT", url: "https://nextjs.org" },
        { name: "Node.js", license: "MIT", url: "https://nodejs.org" },
      ],
    },
    {
      title: "Sécurité & authentification",
      items: [
        { name: "Better Auth", license: "MIT", url: "https://better-auth.com" },
        { name: "@noble/ciphers", license: "MIT", url: "https://github.com/paulmillr/noble-ciphers" },
        { name: "@noble/hashes", license: "MIT", url: "https://github.com/paulmillr/noble-hashes" },
      ],
    },
    {
      title: "UI & design",
      items: [
        { name: "shadcn/ui", license: "MIT", url: "https://ui.shadcn.com" },
        { name: "Tailwind CSS", license: "MIT", url: "https://tailwindcss.com" },
        { name: "Lucide Icons", license: "ISC", url: "https://lucide.dev" },
        { name: "Radix UI", license: "MIT", url: "https://radix-ui.com" },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { name: "Convex", license: "Apache 2.0", url: "https://convex.dev" },
        { name: "Turborepo", license: "MPL 2.0", url: "https://turbo.build" },
      ],
    },
  ],
} as const;

export const status = {
  meta: {
    title: "Transparence de service",
    description:
      "Les composants de la plateforme IDN, les indicateurs que nous publierons et la méthode retenue — des grandeurs constatables dans le système, pas des déclarations d'avancement.",
  },
  hero: {
    eyebrow: "TRANSPARENCE DE SERVICE",
    title: "Ce qui se mesure, et comment nous le publierons.",
    sub: "Un programme de digitalisation se juge à des grandeurs vérifiables dans le système lui-même, non à des déclarations d'avancement. Cette page expose les composants de la plateforme et les indicateurs que nous nous engageons à publier.",
  },
  componentsLabel: "COMPOSANTS DE LA PLATEFORME",
  componentsIntro:
    "L'instrumentation publique de la disponibilité est en cours de mise en place. Tant qu'elle ne produit pas de mesure sur une période d'exploitation réelle, aucun taux n'est affiché ici : un chiffre de disponibilité inventé vaudrait moins que son absence.",
  indicatorsLabel: "INDICATEURS QUE NOUS PUBLIERONS",
  indicatorsIntro:
    "Ces indicateurs sont produits automatiquement par la plateforme et peuvent être audités contradictoirement. Nous proposons qu'ils soient publiés à échéance régulière pour l'administration pilote, y compris lorsqu'ils sont défavorables — un programme qui n'accepte de publier que ses succès ne permet ni le pilotage, ni la correction, ni la confiance des partenaires financiers.",
  indicators: [
    {
      domain: "Identité",
      metric: "Identités vérifiées par niveau de garantie",
      shows: "Progression de l'identité légale",
    },
    {
      domain: "Identité",
      metric: "Part des vérifications traitées sans intervention humaine",
      shows: "Efficience du dispositif et coût marginal réel de l'enrôlement",
    },
    {
      domain: "Services au citoyen",
      metric: "Démarches déposées et instruites de bout en bout",
      shows: "Passage effectif du papier au numérique, par service",
    },
    {
      domain: "Services au citoyen",
      metric: "Délai moyen entre dépôt et décision",
      shows: "La mesure la plus directe de la qualité du service rendu",
    },
    {
      domain: "Administration",
      metric: "Courriers transmis par voie numérique entre institutions",
      shows: "Substitution mesurable de la transmission physique de parapheurs",
    },
    {
      domain: "Administration",
      metric: "Agents actifs par semaine, par structure",
      shows: "Adoption réelle, seul juge de l'utilité d'un outil administratif",
    },
    {
      domain: "Souveraineté",
      metric: "Part des données régaliennes hébergées sur le territoire national",
      shows: "Progression concrète vers la souveraineté annoncée",
    },
  ],
  closing:
    "Ce qui ne se mesure pas dans le système ne devrait pas être facturé au budget de l'État.",
  incidentsLabel: "INCIDENTS RÉCENTS",
} as const;

export const contact = {
  meta: {
    title: "Contact",
    description:
      "Formulaire de contact et canaux directs pour les citoyens, les administrations, la presse et le signalement de sécurité.",
  },
  hero: {
    eyebrow: "NOUS CONTACTER",
    title: "Comment pouvons-nous vous aider ?",
    sub: "Choisissez le canal le plus adapté à votre demande.",
  },
  channels: [
    {
      title: "Support",
      description: "support@identite.ga\nRéponse sous 48 heures ouvrées",
      cta: "Écrire",
      href: "mailto:support@identite.ga",
    },
    {
      title: "Signalement de sécurité",
      description:
        "security@identite.ga\nFaille, fraude, usurpation d'identité — traitement prioritaire",
      cta: "Signaler",
      href: "mailto:security@identite.ga",
    },
    {
      title: "Éditeur",
      description:
        "NTSAGUI DIGITAL SARL\nRue des Résidences, Batterie IV, BP 638, Libreville\n066 83 06 73",
      cta: "Appeler",
      href: "tel:+24166830673",
    },
  ],
  form: {
    title: "Envoyer un message",
    sub: "Nous répondons sous 48 heures ouvrées. Pour une faille de sécurité ou une usurpation d'identité, écrivez directement à security@identite.ga.",
    categoryLabel: "Catégorie",
    categories: [
      { value: "citoyen", label: "Citoyen" },
      { value: "administration", label: "Administration" },
      { value: "presse", label: "Presse" },
      { value: "securite", label: "Sécurité (faille, fraude)" },
    ],
    nameLabel: "Nom complet",
    emailLabel: "Email",
    subjectLabel: "Sujet",
    messageLabel: "Message",
    submit: "Envoyer le message",
    submitting: "Envoi en cours…",
    successTitle: "Message envoyé",
    successDescription:
      "Nous accusons réception de votre demande. Une réponse vous parviendra par email sous 48h ouvrées.",
    errorTitle: "Échec de l'envoi",
    errorDescription:
      "Une erreur est survenue. Réessayez dans un instant ou contactez le 1407.",
    validation: {
      nameMin: "Le nom doit contenir au moins 2 caractères.",
      emailInvalid: "Adresse email invalide.",
      subjectMin: "Le sujet doit contenir au moins 3 caractères.",
      messageMin: "Le message doit contenir au moins 10 caractères.",
    },
  },
} as const;

export const services = {
  meta: {
    title: "Annuaire des services",
    description:
      "Les démarches administratives accessibles avec votre compte IDN — état civil, fiscalité, éducation, santé, justice — selon votre niveau de garantie.",
  },
  hero: {
    eyebrow: "ANNUAIRE",
    title: "Les services raccordés.",
    sub: "Chaque service exige un niveau de garantie calibré sur sa sensibilité. Le service reste rendu par l'administration compétente : l'IDN vous identifie, elle n'instruit pas votre dossier à sa place.",
  },
  filters: [
    { value: "all", label: "Tous" },
    { value: "1", label: "Niveau 1" },
    { value: "2", label: "Niveau 2" },
    { value: "3", label: "Niveau 3" },
  ] as const,
} as const;

/**
 * Lecteur des actes officiels de l'administration (QR code). Les actes sont
 * émis par administration.ga ; identite.ga les lit par sa route publique.
 */
export const verifier = {
  meta: {
    title: "Vérifier un acte officiel",
    description:
      "Vérifiez l'authenticité d'un acte officiel de l'administration gabonaise à partir du code imprimé sous son QR code.",
  },
  hero: {
    eyebrow: "ACTES OFFICIELS",
    title: "Vérifier un acte officiel",
    sub: "Chaque acte officiel porte un QR code et un code de vérification. Scannez le QR code, ou saisissez le code : vous verrez l'acte tel qu'il a été émis, pour le comparer à celui que vous avez en main.",
  },
  entry: {
    note: "La vérification ne demande aucun compte et n'affiche aucune donnée personnelle : seulement le numéro de l'acte, l'administration émettrice, ses dates et le document lui-même.",
  },
  form: {
    label: "Code de vérification",
    placeholder: "ABCD-EFGH-JKMN…",
    help: "Le code figure sous le QR code, au bas de l'acte.",
    submit: "Vérifier l'acte",
    validation: {
      required: "Saisissez le code imprimé sous le QR code de l'acte.",
      format: "Ce code n'a pas le bon format : 12 caractères, par exemple ABCD-EFGH-JKMN.",
    },
  },
  result: {
    meta: {
      title: "Vérification d'un acte officiel",
      description: "Authenticité d'un acte officiel de l'administration gabonaise.",
    },
    title: "Vérification d'un acte officiel",
    another: "Vérifier un autre code",
  },
  reader: {
    loading: "Vérification du document en cours…",
    compare: "Comparez ce document à celui que vous avez en main.",
    frameTitle: "Document officiel",
    openPdf: "Ouvrir le PDF dans un nouvel onglet",
    unknownHelp:
      "Ce code ne correspond à aucun acte émis. Vérifiez le code imprimé sous le QR code, ou scannez-le à nouveau.",
    unavailableHelp: "Réessayez dans un instant.",
    errorHelp: "La vérification n'a pas pu aboutir : la connexion a été interrompue.",
    retry: "Réessayer",
    fields: {
      number: "Numéro d'acte",
      type: "Type",
      issuer: "Administration émettrice",
      issuedAt: "Émis le",
      signature: "Signature",
      signedPrefix: "Signé",
      notSigned: "Non signé à ce jour",
      fingerprint: "Empreinte du contenu",
      revokedReason: "Motif de révocation",
      supersededBy: "Remplacé par l'acte",
    },
  },
} as const;
