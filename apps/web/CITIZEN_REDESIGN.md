# Refonte de l'espace citoyen web — suivi

Objectif : sur `apps/web`, de la connexion à la déconnexion, l'expérience doit être **la même que l'app
mobile** (`apps/mobile`, plan dans `apps/mobile/REDESIGN.md`), adaptée au navigateur (360 px → desktop).
Règle : rien de factice. Chaque bouton agit sur le backend Convex de **dev** (`flexible-eel-807`).

Références : écrans `apps/mobile/src/app/**` (source de vérité des libellés, parcours et états), prototype
mobile de la charte (`identite-graphique/_components/mobile-prototype.tsx`), prototype web
(`web-prototype.tsx`) pour la transposition au navigateur, charte et ADR-0008 / ADR-0009.

## Inventaire (5 oct. 2026)

### Écarts constatés sur le web actuel

| Sujet | Web actuel | Mobile (cible) |
|---|---|---|
| Ton | Vouvoiement partout (`_content/fr.ts`) | Tutoiement, ton institutionnel |
| Navigation | En-tête horizontal à 7 entrées + menu utilisateur | 4 entrées : Accueil, iCarte, iBoîte, Profil ; scanner et notifications dans l'en-tête de l'accueil |
| Accueil | Carte profil, promo KYC, grille de modules | Résumé d'identité vert + « Présenter ma carte », 4 raccourcis chiffrés, carte de montée de niveau, « À traiter », activité récente, Démarches |
| Carte d'identité | Absente | Écran dédié, QR signé `presentation.mintToken` renouvelé toutes les 30 s |
| Notifications | Menu déroulant | Écran avec filtres (Tout, Non lues, Sécurité, Documents), groupement par période, « Tout lire » |
| Journal d'activité | Bloc sur le tableau de bord | Écran avec filtres et groupement par jour |
| Profil | Fiche + page Paramètres à onglets | Onglet « Sécurité et profil » : Identité, Connexion, Appareils, Apps autorisées, Préférences, Aide et informations, Se déconnecter, Supprimer mon compte ; chaque rangée ouvre un sous-écran |
| KYC | `/kyc` + `/kyc/request` (formulaire d'upload) | Parcours pas à pas : présentation, recto, verso, selfie, envoi, statut avec frise ; Niveau 3 : créneau, confirmation, salle d'attente, visio, résultat |
| Connexion | Identifiant → PIN ; mot de passe ; QR | Adresse IDN → « Bon retour, Prénom » + PIN, Face ID / clé d'accès, 2FA (TOTP ou code de secours), PIN oublié par SMS |
| Inscription | 4 étapes (profil, identité, adresse, PIN) | Bienvenue + choix du profil → Identité → Adresse @idn.ga → PIN ×2 → Face ID → Bienvenue |
| Déconnexion | Menu utilisateur, sans confirmation | Bas du Profil, confirmation « Se déconnecter ? » |

### Fonctions Convex partagées (mêmes appels que le mobile)

`profile.getCurrentUser`, `notifications.{unreadCount,listMine,markRead,markAllRead}`, `activity.listMine`,
`wallet.*`, `iboite.accounts.listMine` (+ modules iBoîte), `idoc.summary`, `cv.cvs.listMine`,
`kyc.{getMyLatest,getActiveRequest,generateUploadUrl,setDocumentImage,setSelfie,submit,respondComplement}`,
`verification.request`, `level3.{getMine,cancel}`, `level3.scheduling.{listAvailable,book}`,
`level3.livekit.issueJoinToken`, `presentation.mintToken`, `privacy.{getDeletionStatus,requestDataExport,
requestAccountDeletion,cancelAccountDeletion}`, `sessions.{listMine,revoke,revokeAllOthers}`,
`oauthConsents.{listMine,revokeForClient}`, `onboarding.{suggestIdnHandles,checkIdnHandleAvailability,
completeSignup,abandonIncompleteSignup,changePin,verifyPin}`, `pinRecovery.{requestReset,verifyCode,resetPin}`,
`preferences.*`, `services.{listForCurrentUser,listCategories,get}`, `crossDevice.*`, `documents.listMine`,
`profile.updateNip`. Better Auth : `/sign-in/pin`, `twoFactor.verifyTotp|verifyBackupCode`, `signOut`.

### Contraintes connues

- **Clés d'accès (passkeys)** : le serveur répond 500 à toute route passkey (composant Better Auth sans table
  `passkey`, constat de la session mobile). Le web affiche « Pas encore disponible » comme le mobile, sans
  bouton qui échoue. Correction serveur hors périmètre (migration du composant).
- **E-mail personnel** : comme sur mobile, le compte est l'adresse @idn.ga (pas d'OTP e-mail à l'inscription).
- **« Mises à jour de l'application »** (mobile, mises à jour OTA) : sans objet sur le web, non transposé.
- **Logique pure dupliquée** : `home-tasks`, `activity-format`, `device-label`, `nip-format`,
  `notification-route`, `kyc-timeline`, `level3-view`, `consent-scopes` sont copiés de `apps/mobile/src/lib`
  vers `apps/web/lib/citizen/` (interdiction de toucher `apps/mobile`). À extraire plus tard dans un paquet
  partagé (signalé pour nettoyage).
- **Règle 6 du CLAUDE.md (budget 4 000 / 30 000 jetons)** : incompatible avec l'ampleur de la mission
  (≈ 40 écrans). Dépassement assumé et signalé ; travail découpé en lots avec point d'étape à chaque lot.

## Architecture cible

- **Design system web** `apps/web/app/_components/idn/` : transposition fidèle de `apps/mobile/src/design`
  (Card, Row, IconTile, SectionTitle, Overline, ScreenTitle, Note, ErrorNote, DetailRow, Badge, LevelBadge,
  IdnButton, IdnInput, OtpInput, PinDots + Keypad, Stepper, AppBar, Screen, Lottie, Icon, ConfirmDialog).
  Mêmes dimensions (ligne 56 px, tuile 36 px rayon 10, carte rayon 14, bouton 50 px rayon 14), aucune ombre.
- **Coquille** `(citizen)/layout.tsx` : ≥ md barre latérale (Accueil, iCarte, iBoîte, Profil + raccourcis
  iDocument, iCV) ; < md barre d'onglets en bas (4 onglets, comme le mobile). Colonne de contenu ≤ 720 px
  pour les écrans « liste », pleine largeur pour iBoîte et iCV.
- **Routes** (URL existantes conservées quand elles existent, pour les liens d'e-mails et redirections) :
  `/dashboard` (Accueil), `/id-card`, `/notifications`, `/activity`, `/mes-services` (liste ; `/services` est
  déjà une page publique), `/service/[id]` (comme le mobile), `/scanner`, `/icarte…`, `/iboite…`, `/idoc…`,
  `/icv…`, `/profile`, `/profile/edit`, `/settings/{security,sessions,privacy,notifications,appearance,
  language,documents,support,about}`, `/consents`, `/kyc/intro`, `/kyc/doc`, `/kyc/selfie`, `/kyc/review`,
  `/kyc/level3` ; `/kyc`, `/kyc/request`, `/settings`, `/settings/notification-preferences`,
  `/icv/dashboard` et les anciennes URL iBoîte / iDocument à paramètres redirigent.

## Plan par lots

0. Inventaire et plan — **fait**.
1. Design system web + coquille + logique partagée + compte de test.
2. Accès : connexion (adresse → PIN, 2FA, PIN oublié, QR multi-appareil), inscription, déconnexion.
3. Identité : accueil, carte d'identité + QR, notifications, activité.
4. Compte : profil, édition, sécurité (PIN, NIP, clés d'accès), appareils, confidentialité/suppression,
   préférences (notifications, apparence, langue), pièces, aide, à propos, apps autorisées.
5. KYC Niveau 2 et Niveau 3 (créneau, salle d'attente, visio LiveKit, résultat).
6. Services : iCarte, iBoîte, iDocument, iCV, services publics, scanner, consentement OAuth.
7. Recette complète Playwright 1440 / 390 px, zéro erreur console, matrice ci-dessous.

## Avancement

- **Lot 1 — fait (5 oct.)** : design system `app/_components/idn/` (icons, list, badge, button, input,
  otp-input, pin, stepper, app-bar, screen, lottie, dialog), jetons de statut du mobile dans
  `app/globals.css`, logique partagée `lib/citizen/`, coquille `(citizen)/_components/citizen-shell.tsx`
  (barre latérale ≥ md, 4 onglets < md à la racine des onglets), accueil `/dashboard` transposé.
  Typage et lint propres ; accueil vérifié à 1440 et 390 px (zéro erreur console, pas de débordement).
- **Comptes de test (dev)**, créés par l'inscription web : un par lot pour isoler les tests destructifs
  (révocation de sessions, suppression, changement de PIN). Identifiants dans
  `~/Library/Caches/idn-shots/creds.json` (`citizen`, `citizen_auth`, `citizen_compte`, `citizen_kyc`,
  `citizen_services`, `citizen_docs`).
- **Lot 2 Accès — fait** : `/sign-in` (adresse → « Bon retour » + PIN, 2FA TOTP/secours, QR multi-appareil,
  mot de passe pour les comptes sans PIN, `redirect_to`), `/sign-up` (bienvenue → identité → adresse → PIN ×2 →
  biométrie → bienvenue), `/forgot-pin` (5 phases), `/forgot-password`, `/reset-password`, `/claim`,
  `/auth-continue`. Backend : `_dev/pinRecoveryTestCode` (code SMS de recette, refusé en prod, ignoré en prod
  par `pinRecovery.verifyCode`, champ `testCodeHash` ajouté au schéma).
- **Lot 3/4 Compte — fait** : `/profile`, `/profile/edit`, `/id-card`, `/notifications`, `/activity`,
  `/consents`, `/settings/{security,sessions,privacy,notifications,appearance,language,documents,support,about}`,
  déconnexion confirmée. Backend : `_dev/phoneChange.simulateVerifiedChange` (recette, refusé en prod).
- **Lot 6a iCarte / iBoîte — fait** : pile de cartes, modèles, carte personnalisée, profil public, QR ;
  iBoîte en volets ≥ 1024 px, routes `/iboite/email/[id]`, `/iboite/courrier/[id]`, `compose`,
  `courrier/compose`, `address-setup`. Faille corrigée : le HTML d'un courrier reçu était injecté sans filtrage.
- **Correctifs transverses (coordinateur)** :
  - `authCapabilities.get` (+ tests) : dit si le serveur gère les clés d'accès ; le web ne sollicite plus les
    routes `/passkey/*` en 500 → plus d'erreur console sur Profil, Sécurité, inscription, connexion.
  - Export RGPD : l'empreinte du PIN (`pinHash`) n'est plus incluse dans l'archive (lien non authentifié ;
    PIN à 6 chiffres cassable hors ligne). Test `privacy/exportRun.test.ts`.
  - `/api/claim/*` : en-têtes CORS des origines de confiance + préflight (le parcours « Récupérer mon
    compte » était bloqué par le navigateur, y compris en production). Test `claimCors.test.ts`.
  - `PreferenceSync` monté dans la coquille : le thème enregistré sur le compte s'applique à la connexion.
- **Lot 5 KYC / Niveau 3 — fait** : `/kyc/intro`, `/kyc/doc` (recto, verso), `/kyc/selfie`, `/kyc/review`
  (frise en direct, complément, refus, approbation), `/kyc/level3` (présentation, créneau, confirmation avec
  .ics, salle d'attente caméra/micro réels, visio LiveKit, résultat). Capture par `getUserMedia` + import de
  fichier. Backend : `_dev/level3Retest.reopen` (recette, refusé en prod).
- **Lot 6b iDocument, iCV, services, scanner, OAuth — fait** : `/idoc` (+ `folder/[id]`, `preview/[id]`, `add`,
  `add-success`), `/icv` (+ list, create, rename, themes, import, optimize, ats, studio, edit), `/mes-services`,
  `/service/[id]`, `/scanner` (caméra + `BarcodeDetector`, saisie, vérification d'acte, approbation d'une
  connexion d'appareil), `/oauth/authorize` (consentement au tutoiement, même contrat).
- **Intégration et recette (coordinateur)** :
  - Revue de code indépendante, constats corrigés : **XSS** `iboite/compose?body=` (corps de l'URL injecté
    sans filtrage → toujours converti en texte et échappé) ; **redirection ouverte** après connexion
    (`redirect_to=/\evil.com`, `/\t/evil.com`) → validateur unique `lib/safe-path.ts` (+ 12 tests) utilisé par
    `safeRedirectTo` et `oauth-flow` ; refus OAuth limité aux `redirect_uri` déclarés ; `return_to` KYC :
    localhost seulement hors production et https obligatoire ailleurs (+ tests) ; `/scanner?qr=` n'accepte plus
    par lien qu'un code d'acte (une connexion d'appareil exige un vrai scan) ; la query est conservée lors du
    renvoi vers la connexion ; déconnexion du menu public robuste aux erreurs réseau ; garde de production
    commune dans `_dev/phoneChange`.
  - Suggestions iCV du backend (`cv/score.ts`) passées au tutoiement (affichées aussi par le mobile) + test.
  - Aperçu A4 du CV : titres décalés (le nom du CV n'est plus un second `h1` de la page).
  - `AppBar` : `headingLevel` facultatif (iBoîte sur grand écran : un seul `h1` visible).
  - Colonne de connexion : promesses inexactes du prototype retirées (« coffre-fort chiffré de bout en bout »
    alors que le coffre est en sommeil, « vérifiée par la DGDI »).
  - Code mort supprimé : anciens en-têtes citoyens, cartes de modules, `compact-wallet`, `card-art-icon`,
    `notifications-bell`, `(citizen)/_content/fr.ts`.

## Matrice de validation

Scripts Playwright dans `~/Library/Caches/idn-shots` (`citizen-*.mjs`), captures dans `citizen/`.

| Écran / fonctionnalité | Comment testé | Résultat |
|---|---|---|
| **Recette transversale** : 37 écrans connectés × 1440 / 390 / 360 px | `citizen-recette.mjs` : zéro erreur console, pas de débordement, un seul `h1`, aucun vouvoiement | OK 111/111 |
| Écrans d'accès (sign-in, sign-up, forgot-pin, forgot-password, reset-password, claim) × 3 largeurs | idem, sans session | OK 18/18 |
| Écrans de détail et comptes riches en données (carte, e-mail, courrier, dossier, aperçu, fiche service, Niveau 3) × 3 largeurs | `citizen-recette-dyn.mjs` + `citizen-courrier-check.mjs`, identifiants réels lus dans les listes | OK 57/57 |
| Création de compte (6 comptes de test + 1 par le nouveau parcours) | Inscription web réelle | OK |
| Inscription : bienvenue, profil, identité, adresse (propositions, saisie libre, adresse prise), PIN ×2, biométrie indisponible, « Bienvenue, Prénom », accueil / « Vérifier mon identité » | Nouveau compte `citizen_signup_new` créé au clic | OK |
| Connexion : adresse → PIN, « Bon retour », mauvais PIN, « Autre compte », PIN oublié pré-rempli, `redirect_to`, demande OIDC directe, clé d'accès (service indisponible annoncé) | `citizen-acces-login.mjs` (43 contrôles) | OK |
| Double authentification TOTP et code de secours | TOTP activé par l'API, code calculé en Node | OK |
| PIN oublié (5 phases), ancien PIN refusé, nouveau accepté | Code SMS armé par `_dev/pinRecoveryTestCode` | OK |
| QR multi-appareil | Affichage, annulation ; approbation réelle depuis `/scanner` d'un second contexte → connexion | OK |
| Connexion par mot de passe (compte sans PIN) | Réponse « compte sans PIN » simulée, connexion réelle | Partiel |
| Récupérer mon compte (`/claim`) | CORS corrigé et testé (préflight + réponse) ; aucun compte délégué de test pour aller au bout | Partiel |
| Accueil : données réelles, raccourcis chiffrés, « À traiter », carte de montée de niveau, activité | Comptes N1, N2, N3 | OK |
| Carte d'identité + QR | Code changé après 31 s, « Régénérer maintenant », QR lu et vérifié par le portail contrôleur | OK |
| Notifications : filtres, groupement, ouverture + lecture, « Tout lire », effacer | Notification réelle | OK |
| Journal d'activité : filtres, groupement par jour | Compte de test | OK |
| Profil : rangées, sous-écrans, déconnexion confirmée (dernier compte oublié) | Clic réel | OK |
| Changement de PIN puis reconnexion avec le nouveau PIN | Clic réel, PIN rétabli | OK |
| NIP (saisie, masquage, affichage) | Clic réel | OK |
| Appareils : révocation d'une 2e session réelle, « Déconnecter tous les autres » | Deux navigateurs | OK |
| Apps autorisées : vrai consentement OAuth (PKCE), révocation depuis Profil et `/consents` | Client du dev | OK |
| Préférences de notifications, thème (persistés côté serveur), langue | Rechargement | OK |
| Export des données | Archive produite et téléchargeable ; limite d'une par 24 h | Partiel (e-mail non reçu dans l'iBoîte sur le dev) |
| Suppression du compte programmée puis annulée | Clic réel | OK |
| Modifier le profil, photo recadrée | Clic réel | OK |
| Changement de téléphone par SMS | Code détenu par Bird ; changement confirmé par `_dev/phoneChange` | Partiel |
| KYC Niveau 2 : recto caméra, verso import, selfie, envoi, complément demandé par le contrôleur, réponse, approbation | Portail contrôleur réel (Playwright, 2 navigateurs) | OK |
| KYC : caméra refusée / absente, anciennes URL, `return_to` | Simulé (headless ne refuse pas l'invite) | OK |
| Niveau 3 : créneau publié par le contrôleur, réservation, confirmation, .ics, replanification, annulation | Portail contrôleur réel | OK |
| Niveau 3 : salle d'attente (H-15, caméra, niveau sonore, réseau) | Fausse caméra Chromium | OK |
| Niveau 3 : visio citoyen ↔ contrôleur | Jeton émis, écran de visio ; **serveur LiveKit de dev injoignable** (ports 443 et 7880 fermés) | Partiel |
| Niveau 3 : panne du serveur vidéo signalée, résultat « Niveau 3 atteint » en direct | Contrôleur accorde le Niveau 3 | OK |
| iCarte : modèles, carte personnalisée, modification, suppression, profil public (masquer, réordonner, limite 6), QR, partage | `citizen-services-*.mjs` | OK |
| iBoîte : e-mail à soi et à un autre compte, lecture, non-lu, favori, archive, corbeille, recherche, réponse, transfert, pièces jointes | idem | OK |
| iBoîte : courrier (éditeur, envoi, PDF, impression), adresse postale (saisie, GPS), copie d'adresse, colis (vide) | idem | OK |
| iDocument : ajout PDF/JPEG, aperçu, expiration proche, suppression | `citizen-docs-*.mjs` | OK |
| iCV : création, rubriques, thèmes, PDF, renommer/dupliquer/principal/supprimer, outils IA | idem (IA réelle sur le dev) | OK |
| iCV : score ATS | Score affiché en rouvrant l'écran (rechargement du serveur pendant le test) | Partiel |
| Services publics : liste, recherche, filtre, fiche | Consentement réel | OK |
| Scanner : caméra + `BarcodeDetector`, saisie manuelle, vérification d'acte réelle | Vidéo factice portant un QR | OK (code inconnu seulement ; un 404 réseau est journalisé par le navigateur) |
| Consentement OAuth : accord et refus, application fermée, niveau insuffisant | Vrai flux PKCE | OK |
| Backend | `bunx vitest run` : 67 fichiers, 481 tests + nouveaux tests | OK |
| Web : logique de sécurité | `bunx vitest run lib/` (safe-path, kyc-flow) | OK 15/15 |
| Typage / lint web | `tsc --noEmit`, `eslint` sur tout le périmètre | OK |

## Reste à faire / limites connues

- **Visio Niveau 3** non vérifiée de bout en bout : le serveur LiveKit de dev est arrêté. À rejouer quand il
  sera relancé (`bunx convex run _dev/level3Retest:reopen '{"email":"rodrigue.moussavou@idn.ga"}'`).
- **`LiveVideoRoom` (`packages/ui`)** : contrôles en anglais (Leave, Microphone…), chat et partage d'écran que
  le mobile n'a pas, `onError` inline (cause probable de reconnexions côté contrôleur). Hors périmètre.
- **Clés d'accès** : le composant Better Auth n'a pas de table `passkey` ; il faut migrer vers une installation
  locale du composant pour activer Face ID / Touch ID (web et mobile). `authCapabilities.get` passera seul à `true`.
- **`onboarding.verifyPin`** n'a pas de limite de tentatives (appelé par le verrou mobile et le changement de PIN).
- **Refus OAuth** : Better Auth n'ajoute pas `state` à la redirection d'erreur (RFC 6749).
- **E-mail d'export RGPD** non reçu dans l'iBoîte sur le dev ; **variables du dev** `IDN_LOGIN_PAGE` et
  `IDN_CONSENT_PAGE` pointent vers `localhost:5001`.
- **Mobile** (signalé, non modifié) : nationalité « Gabonaise » non reconnue par `normalizeRecoveryPhone` ;
  couleurs bleue/jaune des cartes iCarte (`wallet-adapter.ts`).
- **Écarts assumés avec le mobile** : case CGU à l'inscription, nationalité par liste, voie « code agent » du PIN
  oublié, 6 thèmes de CV (au lieu de 12 couleurs), PDF du CV à mise en page unique, pas de « Mises à jour de
  l'application », libellés propres au navigateur (« Importer une photo », .ics, « Biométrie »). Fonctions web
  conservées : connexion par mot de passe, notifications push du navigateur, aperçu intégré iDocument.
- **Logique dupliquée** web/mobile dans `lib/citizen/` : à extraire dans un paquet partagé ; les tests web
  (`lib/*.test.ts`) se lancent par `bunx vitest run` dans `apps/web` (pas encore de script `test`).
- **Données de recette** laissées sur le dev : comptes de test, application « Mairie de recette (lot docs) »,
  cartes, e-mails, courriers, CV, documents.
