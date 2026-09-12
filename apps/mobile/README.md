# `@idn/mobile` — Identité Numérique (Expo)

App mobile React Native / Expo SDK 55. Cible : iOS 16+ et Android 9+
(API 28). Distribution prévue via TestFlight + Google Play Open Testing.

## Stack

- Expo SDK 55 · React 19.2 · React Native 0.83 (new arch + react-compiler)
- expo-router (typed routes), expo-updates (OTA, fingerprint runtime)
- Convex (`@repo/backend/convex/_generated/api`)
- Better Auth + `@better-auth/expo` + `expo-better-auth-passkey`

## Démarrage local

```bash
# Depuis la racine du monorepo
bun install

# Configurer l'environnement
cp apps/mobile/.env.local.example apps/mobile/.env.local
# Renseigner EXPO_PUBLIC_CONVEX_URL et EXPO_PUBLIC_SENTRY_DSN (optionnel)

# Lancer Convex en parallèle
cd packages/backend && bunx convex dev
# (laisser tourner)

# Démarrer Expo
cd apps/mobile
bunx expo start
```

Pour tester sur device réel avec passkey natif (Face ID / Credential
Manager), un dev client est requis (Expo Go ne supporte pas
`expo-better-auth-passkey`). Voir [PASSKEY_SETUP.md](./PASSKEY_SETUP.md).

```bash
bunx expo prebuild --clean
bunx expo run:ios     # ou run:android
```

## Build production (TestFlight + Play Open Testing)

Configuré via `eas.json` :

```bash
# Build sur EAS, profile preview (TestFlight External + Play Open)
bunx eas build --profile preview --platform all

# Submit après build
bunx eas submit --profile preview --platform all --latest
```

Le workflow GitHub Actions `.github/workflows/deploy-mobile.yml` automatise
ce flux. Trigger manuel (`workflow_dispatch`) ou via tag `mobile-vX.Y.Z`.

## Secrets requis

### GitHub Actions
- `EXPO_TOKEN` — depuis https://expo.dev/accounts/<org>/settings/access-tokens
- `EXPO_APPLE_APP_SPECIFIC_PASSWORD` — depuis https://appleid.apple.com/account/manage
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` — JSON encodé base64, depuis Play
  Console → Configuration → API Access

### Local
- `apps/mobile/.env.local` (non commité) — Convex URLs (cf. `.env.local.example`)
- `apps/mobile/credentials/play-service-account.json` (non commité) — pour
  `eas submit android` en local

### Convex (à fixer une fois prod déployé)
```bash
bunx convex env set PASSKEY_RP_ID identite.ga
bunx convex env set PASSKEY_RP_ORIGINS "https://identite.ga,android:apk-key-hash:<BASE64_SHA256>"
```

## Domaines

- `identite.ga` doit servir `/.well-known/apple-app-site-association` et
  `/.well-known/assetlinks.json` (cf. `apps/web/app/.well-known/`).
- Bundle iOS : `ga.idn.mobile` · Team ID : `5Y39TTNCM7`
- Package Android : `ga.idn.mobile`

## Mises à jour à distance (Expo Update)

Dans l’application : **Profil → Mises à jour**. Le bouton recherche et télécharge
une mise à jour compatible, puis propose de redémarrer. Un téléchargement ne
redémarre jamais l’application sans action de l’utilisateur. Expo recherche
également les mises à jour à l’ouverture ; une mise à jour téléchargée sera
utilisée au démarrage suivant.

- Les builds TestFlight utilisent le profil, le canal et l’environnement EAS
  `preview`. Les builds de production utilisent `production`.
- Un push sur `main` touchant l’application mobile, les dépendances ou les types
  Convex générés lance le workflow Expo `.eas/workflows/update-preview.yml` pour iOS sur
  `preview`. Il est exécuté par EAS Workflows, sans runner GitHub Actions.
- Pour publier manuellement sur TestFlight, exécuter depuis `apps/mobile` :
  `eas workflow:run .eas/workflows/update-preview.yml --ref main`.
  Le workflow GitHub `Publish Mobile Update (Expo)` reste disponible en secours
  (y compris Android) avec choix du canal et de la plateforme. La production n’est
  jamais mise à jour automatiquement par un push sur `main`.
- La publication utilise les variables de l’environnement EAS correspondant au
  build, notamment les URL Convex. Ne pas publier avec les variables locales de
  développement.
- La politique `fingerprint` protège la compatibilité native. Une mise à jour
  JavaScript, HTML, CSS ou des images peut passer par Expo ; un changement du
  runtime natif (module, SDK, permissions, configuration native) nécessite un
  nouveau build. Une publication réussie ne prouve pas à elle seule que les
  appareils ont un runtime compatible.

### Nouvelle version TestFlight

Lancer `Build & Submit Mobile (EAS)` avec `profile=preview`, `platform=ios`,
`submit=true`, `skip_build=false`. Le numéro de build augmente automatiquement.
Le workflow vérifie dans l’IPA l’activation d’Expo Updates, l’URL du projet, le
canal et le runtime. Il conserve ces informations dans l’artefact
`mobile-build-preview-<commit>` et dans le résumé de l’exécution. L’envoi à Apple
vient ensuite ; le traitement Apple et, pour les testeurs externes, une éventuelle
revue bêta restent distincts de la compilation et de l’envoi.

### Registre et contrôle

Les exécutions EAS Workflows conservent le commit et le résultat de publication.
Le workflow GitHub de secours conserve également le commit, le canal et le résultat de publication
(`expo-update-<canal>-<commit>`). Comparer le `runtimeVersion` de la mise à jour
avec celui de l’artefact du build installé. L’historique Expo est consultable ici :
https://expo.dev/accounts/okatechs-organization/projects/identite-ga/updates

Après installation du nouveau build TestFlight, publier une mise à jour sur
`preview` depuis le même environnement, puis vérifier sur un appareil réel :
recherche, téléchargement, annulation du redémarrage, installation et relance.
Tester aussi hors connexion : l’application doit conserver la version installée
et proposer de réessayer.

Pour revenir à la version embarquée, utiliser `eas update:roll-back-to-embedded`
avec le canal et le runtime concernés ; pour republier une mise à jour précédente,
utiliser `eas update:republish`. Les versions natives incompatibles ne doivent pas
être contournées en forçant le runtime.
