# Refonte de l'app mobile — suivi

Cible : le prototype cliquable de la charte (`apps/web/app/(public)/identite-graphique/_components/mobile-prototype.tsx`),
avec une seule différence demandée : **4 onglets (Accueil, iCarte, iBoîte, Profil)**, le Scanner passe dans l'en-tête de l'Accueil.
Règle : rien de factice. Chaque écran lit et écrit le vrai backend Convex de dev (`flexible-eel-807`).

## Environnement de test

- Dev client iOS construit localement (`expo prebuild` + `xcodebuild`, Xcode 27 : il faut
  `IPHONEOS_DEPLOYMENT_TARGET=15.1` en ligne de commande, et `expo run:ios` ne reconnaît pas le
  Simulator d'Xcode 27, d'où l'appel direct à `xcodebuild`).
- Simulateur dédié : iPhone 17 (iOS 26.5) `2DD72271-…` (l'iPhone 15 Pro est occupé par une autre session).
- Metro : `bunx expo start --dev-client` (pas `CI=1`, qui coupe le rechargement).

## Guide du design system (à respecter pour tout écran)

- **Texte** : toujours `import { Text, TextInput } from '@/design/text'` (IBM Plex appliqué selon `fontWeight`).
  Mono (identifiants, NIP, adresses, références) : `fontFamily: t.mono`.
- **Thème** : `const t = useIdnTheme()` ; couleurs `t.ink`, `t.ink2`, `t.muted`, `t.border`, `t.surface`, `t.surface2`,
  `t.bg`, `t.green` (fond d'action), `t.greenText`/`t.blueText`/`t.redText` (texte coloré),
  `t.greenBadge`/`t.blueBadge`/`t.yellowBadge`/`t.redBadge`/`t.neutralBadge` (fonds). **Aucune ombre** (ADR-0008),
  pas de dégradé : relief par la bordure (1 px `t.border`).
- **Squelette** : `Screen` (`@/design/components/screen`) avec `header={<AppBar title onBack />}`, `footer` (boutons),
  `keyboard` pour les formulaires, `inTabs` pour les racines d'onglets. `AppBar` / `IconButton` : `@/design/components/app-bar`.
- **Listes** : `Card` (bordée, séparateurs) + `Row` (icon, tone, title, sub, right, chevron, onPress, unread),
  `SectionTitle`, `Overline`, `ScreenTitle`, `Note`, `ErrorNote`, `DetailRow`, `IconTile` : `@/design/components/list`.
- **Boutons** : `IdnButton` variants `primary` (50 px, rayon 14), `secondary`, `ghost`, `danger`, `dangerGhost`, `loading`.
- **Statuts** : `Badge` (tone green/blue/yellow/red/neutral, icon) et `LevelBadge` : `@/design/components/badge`.
- **Saisie** : `IdnInput`, `IdnDateInput`, `OtpInput`, `PinDots` + `Keypad`.
- **Animations** : `IdnLottie name=… size=…` (respecte « Réduire les animations ») pour attentes, succès, états vides.
- **Icônes** : `Icon` (Lucide, trait 1,8) — noms dans `src/design/icons.tsx`.
- **Rédaction** : français, **tutoiement**, ton institutionnel, aucun emoji, apostrophe typographique ’.
- **Interdits** : prettier / `bun run format` ; données factices ; boutons sans effet ; `Alert` « Bientôt ».

## Écarts assumés avec le prototype

| Prototype | App réelle | Pourquoi |
|---|---|---|
| Inscription par e-mail personnel + code OTP | Profil → Identité (état civil) → Adresse @idn.ga → PIN → Face ID | Le backend et le web n'ont pas d'e-mail personnel : le compte Better Auth **est** l'adresse @idn.ga, la récupération passe par SMS. Ajouter un e-mail personnel est une décision produit (donnée personnelle supplémentaire) : non tranchée ici, signalée. |
| Bouton « Simuler la réception du code », « Simuler la lecture », « Réinitialiser démo » | Supprimés | Artefacts de démonstration. Le scanner lit un vrai QR (caméra) ou un code saisi. |
| Données d'Awa Mboumba | Données du compte connecté | — |

## Plan par lots

1. **Design system et navigation** — polices IBM Plex, composants (AppBar, boutons, badges, rangées, stepper,
   clavier PIN, Lottie avec « réduire les animations »), barre à 4 onglets, iCarte/iBoîte deviennent des onglets,
   iDocument et Services sortent des onglets.
2. **Accès** — lancement (Lottie logo), bienvenue + choix du profil, inscription, connexion PIN + Face ID/passkey,
   verrouillage au démarrage, PIN oublié (SMS), 2FA.
3. **Identité** — accueil, carte d'identité numérique (QR renouvelé `presentation.mintToken`), KYC (recto, verso,
   selfie, envoi, statut), Niveau 3 (créneau `level3/scheduling`, salle d'attente, visio LiveKit, résultat),
   consentement OAuth.
4. **Services** — iCarte, iBoîte, iDocument, iCV, notifications, scanner d'acte officiel.
5. **Compte et sécurité** — profil, appareils/sessions, passkeys, PIN, téléphone, apps autorisées, préférences,
   suppression du compte.

## Bugs trouvés et corrigés en route

- **Plantage à la création du compte** : le `VaultProvider` du layout racine interrogeait `vault.keys.status`
  dès l'ouverture de session ; pendant l'inscription l'adresse n'est pas encore vérifiée → `EMAIL_NOT_VERIFIED`
  levée au rendu. Le coffre n'est plus utilisé par aucun écran : provider retiré (code du coffre conservé).
- **Visio Niveau 3 sans image du contrôleur** : Hermes n'a pas de constructeur `Event` global, utilisé par les
  correctifs webrtc-adapter de livekit-client à la réception d'une piste → polyfill minimal avant `registerGlobals()`.
- **Fin d'entretien affichée comme une erreur** (« Client initiated disconnect », en anglais, alertes empilées) : les
  déconnexions normales sont ignorées.
- **Consentement OAuth inopérant** : l'écran mobile postait `{client_id, scopes, action}` à `/oauth2/consent`, qui
  attend `{accept, consent_code}` ; réécrit selon le contrat Better Auth (même logique que le web).
- **E-mails affichant `<p></p>` en clair** : l'éditeur riche produit « texte<p></p> » et la détection HTML ne
  regardait que le premier caractère ; corrigé et testé.
- **Feuilles vides dans iBoîte/iCarte** : les `formSheet` présentés depuis une pile imbriquée dans les onglets
  s'affichaient vides ; remplacés par des écrans pleins avec barre de titre.
- **Action « favori » inatteignable** au lecteur d'écran (imbriquée dans la ligne cliquable) : `Row` sort désormais
  l'élément de droite de la zone cliquable.
- **Ajout de document impossible** (iDocument) et **pièces jointes iBoîte cassées** : `readAsStringAsync` n'est plus
  exporté par `expo-file-system` (SDK 55), et React Native ne sait pas créer un `Blob` à partir d'octets ; envoi
  désormais depuis l'URI du fichier (`lib/storage-upload`, `lib/attachment-upload`).
- **Session révoquée = écran rouge** : une requête `UNAUTHENTICATED` faisait planter le rendu ; `ErrorBoundary` racine
  qui ferme la session locale et renvoie vers la connexion.
- **Modales et feuilles chevauchées sous iOS 26** : `react-native-screens` étire la première vue défilante sous la
  barre ; notifications et consentement passent en écrans poussés.
- **Photo de profil** : demande d'accès à toute la photothèque inutile (le sélecteur système suffit) ; retirée.
- **Boutons muets pour TalkBack** : `IdnButton` expose désormais son texte comme libellé d'accessibilité.
- **« Face ID » sur Android** : libellé de biométrie selon la plateforme.
- **Salle visio trompeuse hors connexion** : l'écran affichait « En attente du contrôleur · connexion chiffrée »
  alors que LiveKit n'arrivait pas à joindre le serveur. Il suit maintenant l'état réel (`useConnectionState`) :
  « Connexion à la salle… » puis, au-delà de 15 s, « Le serveur d'entretien ne répond pas ».
- **Libellés du journal manquants** : 24 actions d'audit s'affichaient en code brut ; test de couverture ajouté.
- Avertissement dev `findHostInstance_DEPRECATED` : vient de `react-native-keyboard-controller` (tiers) ; filtré dans LogBox, sans effet en production.

## Avancement

Voir la matrice de validation en bas de fichier (mise à jour à chaque lot).

## Matrice de validation

| Écran / fonctionnalité | Comment testé | Résultat |
|---|---|---|
| Lancement (Lottie logo, « Passer ») | Démarrage à froid dans le simulateur, capture | OK |
| Bienvenue + choix du profil | Sélection, « Créer mon compte » → étape Identité | OK |
| Inscription · Identité (état civil) | Saisie réelle (clavier, sélecteur de date natif), bouton désactivé tant qu'incomplet | OK |
| Inscription · Adresse @idn.ga | Propositions de `onboarding.suggestIdnHandles` + `checkIdnHandleAvailability` | OK |
| Inscription · PIN ×2 + création du compte | Compte `nadia.ekomie@idn.ga` créé sur le dev (`completeSignup`) | OK (voir bug coffre corrigé) |
| Verrou au démarrage (PIN) | Mauvais PIN → « Code PIN incorrect » (backend) ; bon PIN → accueil | OK |
| Accueil | Données réelles (profil, compteurs iCarte/iBoîte/iDocument/iCV, activité) | OK |
| Carte d'identité + QR | QR signé `presentation.mintToken`, renouvelé à 30 s (code changé constaté) | OK |
| KYC · présentation Niveau 2 | Ouverture depuis l'accueil (« Vérifie ton identité ») | OK |
| KYC · recto / verso / selfie | Viseur `expo-camera` (permission réelle accordée) ; sur simulateur sans caméra, import galerie d'images SPÉCIMEN → `kyc.generateUploadUrl` + `setDocumentImage` / `setSelfie` | OK (prise de vue caméra : non testable sur simulateur) |
| KYC · envoi + statut | `kyc.submit` → écran « Dossier envoyé », frise mise à jour en temps réel | OK |
| KYC · complément demandé | Contrôleur (portail dev, Playwright) demande un complément → message affiché en direct → reprise du recto → `respondComplement` | OK |
| KYC · approbation | Contrôleur approuve → « Identité vérifiée », Niveau 2 sur l'accueil et la carte | OK |
| Niveau 3 · présentation | Durée réelle tirée des créneaux publiés | OK |
| Niveau 3 · créneau | Créneau publié depuis le portail contrôleur apparu en direct, réservé (`level3.scheduling.book`) | OK |
| Niveau 3 · confirmation | Détails réels (date, heure, durée, référence = format contrôleur) ; « Ajouter au calendrier » ouvre l'éditeur natif (`expo-calendar`) | OK |
| Niveau 3 · salle d'attente | Ouverture automatique à H-15 ; permissions caméra/micro réellement demandées, réseau testé (`expo-network`) | OK |
| Niveau 3 · visio | `level3.livekit.issueJoinToken` → connexion à la salle LiveKit réelle, contrôleur présent (portail dev) ; contrôles micro/caméra/raccrocher | Partiel : vidéo distante non affichée au 1er essai (bug `Event` absent sous Hermes, corrigé). Re-test Android le 05/10 : le serveur LiveKit `207-175-147-164.sslip.io` ne répondait plus (délai dépassé sur le port 443, depuis le Mac comme depuis l'émulateur), donc l'affichage de la vidéo distante **reste non vérifié**. Caméra locale indisponible sur simulateur iOS |
| Niveau 3 · résultat | Contrôleur accorde le Niveau 3 → la salle se ferme, accueil « Niveau 3 · Élevé », écran « Niveau 3 atteint » (iOS, puis Android pour Paul Moussavou) | OK |
| Notifications | Ouvertes depuis l'accueil, groupées par période, « Tout lire » ; routage vers l'écran concerné (`notificationRoute`, testé) | OK |
| iCarte · pile de cartes | Ajout réel d'un permis et d'une CNI (`wallet.create`), empilement, sélection, détail (mention, numéro masqué, validité) | OK |
| iCarte · détail, QR, organisation | QR hors ligne de la carte, masquage du profil public (`wallet.setFeatured`), modèles d'ajout | OK |
| iBoîte · e-mails | Envoi réel à soi-même, réception, non-lus, favori (`toggleStar`), lecture, réponse | OK (bug d'affichage HTML corrigé) |
| iBoîte · courriers | Rédaction et envoi d'un courrier à soi-même, réception, lecture | OK |
| iBoîte · adresse postale | Géolocalisation simulée (Libreville), permission réelle, enregistrement (`accounts.setAddress`) | OK |
| iBoîte · colis | Compteurs et code iBoîte réels | OK (aucun colis de test disponible : liste vide vérifiée) |
| Profil (« Sécurité et profil ») | Identité, connexion, appareils (`sessions.listMine`, libellé d'appareil corrigé), apps autorisées, préférences, déconnexion | OK |
| Sécurité · changement de PIN | 482915 → 135792 (`onboarding.changePin`), puis reconnexion réelle avec le nouveau PIN sur iOS et Android | OK |
| Sécurité · NIP | Modale de saisie (`profile.updateNip`) | Affichage OK ; enregistrement non exercé (pas de NIP réel de test) |
| Sécurité · Face ID / clés d'accès | Liste `GET /passkey/list-user-passkeys` | KO serveur : le composant Better Auth déployé n'a pas de table `passkey` (500). L'app l'affiche honnêtement (« pas encore disponible ») |
| Confidentialité · export | `privacy.requestDataExport` accepté | Partiel : l'e-mail part vers l'adresse @idn.ga réelle (MX de production), il n'arrive pas dans l'iBoîte de dev |
| Confidentialité · suppression | Programmée (`requestAccountDeletion`), rappel dans « À traiter », puis annulée (`cancelAccountDeletion`) | OK |
| Session révoquée à distance | `revoke-other-sessions` depuis une autre session → l'app ouverte affiche « Ta session a été fermée » puis reconnexion | OK (après correctif `ErrorBoundary`) |
| Connexion · adresse + PIN | Android : saisie de l'adresse, PIN, accueil ; iOS : « Bon retour, Nadia » (compte mémorisé) | OK |
| Consentement OAuth | Vrai `consent_code` (`/oauth2/authorize`, app `demarche-ga_prd`), lien `idn://consent?…`, « Autoriser » → redirection fournisseur ; app de bac à sable refusée avec message clair | OK |
| Applications autorisées | Démarche.ga listée avec ses données partagées, « Retirer l'accès » (`revokeForClient`) | OK |
| iDocument | Ajout réel d'un PDF (Fichiers iOS), dossier, fiche, ouverture du fichier (lecteur intégré) | OK (2 bugs corrigés) |
| iCV | CV principal, nom d'état civil appliqué, thème, partage du PDF généré par le serveur | OK |
| Réglages (notifications, apparence, langue, mises à jour, à propos, aide, pièces) | Ouverts et vérifiés ; thème sombre appliqué et retrouvé sur Android via le compte | OK (langue : seul le français est réellement disponible) |
| Services publics, journal d'activité | Données réelles (liste vide de services, journal complet et libellé) | OK |
| Thème sombre | Accueil, iCarte, réglages, iBoîte, profil en sombre | OK |
| Mises à jour OTA (`expo-updates`) | Build **Release** simulateur (runtime `3293286d…`) : recherche réelle sur `preview` → « à jour » ; mise à jour publiée sur le canal isolé `ota-test` → téléchargée à l'ouverture, « Mise à jour prête » dans « À traiter », redémarrage confirmé, « Mise à jour installée : du 5 octobre 2026 », nouvelle recherche → « à jour » | OK |
| **Android** (Pixel 10 Pro, émulateur) | APK de debug compilé ; bienvenue, connexion, onglets, inscription complète d'un 2ᵉ compte, KYC avec **vraie caméra** (caméra virtuelle de l'émulateur) | OK |
| Scanner · vérification d'acte | Saisie d'un code bien formé → appel réel de la route publique d'administration.ga → « Code inconnu » | OK (acte authentique : pas de code réel disponible pour le test) |
| Scanner · connexion d'un autre appareil | Session créée (`crossDevice.createSession`), ouverte via `idn://scanner?qr=…`, approuvée → statut `approved` côté backend | OK (lecture caméra du QR : non testable sur simulateur) |
