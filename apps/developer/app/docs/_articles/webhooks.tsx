import { A, C, Callout, Code, H2, OL, P, Table, UL } from "../_components/prose"

export default function WebhooksArticle() {
  return (
    <>
      <P>
        Les webhooks informent votre serveur d’un changement côté IDN, sans interrogation périodique. Ils se
        configurent par application et par environnement, dans l’onglet « Webhooks » de l’application.
      </P>

      <H2 id="evenements">Événements disponibles</H2>
      <Table
        head={["Type", "Livré si…", "data"]}
        mono={[0, 2]}
        rows={[
          ["iboite.account.updated", "l’usager a consenti au scope idn:iboite.read", "{ accountVersion, counters: { unreadLetters, pendingLetters, availablePackages, unreadMessages } }"],
          ["identity.verification.created", "une clé API active de l’application porte idn:verification:list", "{ verificationId, updatedAt }"],
          ["identity.verification.updated", "idem", "{ verificationId, updatedAt }"],
          ["identity.verification.deleted", "idem", "{ verificationId, updatedAt }"],
        ]}
      />
      <P>
        En sandbox, seuls les événements concernant le propriétaire et les comptes de test de l’application sont livrés.
        Les droits sont réévalués juste avant chaque envoi : un consentement retiré arrête les livraisons.
      </P>

      <H2 id="mise-en-place">Mise en place</H2>
      <OL>
        <li>
          Ajoutez un endpoint : nom, URL https publique (port 443, ni identifiants ni fragment, réseaux privés refusés) et
          événements. Trois endpoints au plus en sandbox, dix en production.
        </li>
        <li>Copiez le secret de signature <C>whsec_…</C> : il n’est affiché qu’une fois.</li>
        <li>
          Cliquez sur « Vérifier l’endpoint ». IDN envoie un événement <C>webhook.endpoint.verification</C> dont{" "}
          <C>data.challenge</C> doit être renvoyé tel quel, en texte brut ou en JSON <C>{'{ "challenge": "…" }'}</C>, avec
          un statut 2xx.
        </li>
        <li>Une fois l’endpoint actif, « Envoyer un événement de test » livre un <C>webhook.test</C> signé et affiche la réponse de votre serveur.</li>
      </OL>

      <H2 id="format">Format d’une requête</H2>
      <Code
        title="POST https://votre-service.ga/webhooks/idn"
        code={`Content-Type: application/json
User-Agent: IDN-Webhooks/1.0
X-IDN-Event-Id: evt_3f9c…
X-IDN-Event-Type: iboite.account.updated
X-IDN-Timestamp: 1791148800
X-IDN-Signature: v1=5d41402abc4b2a76b9719d911017c592…

{
  "id": "evt_3f9c…",
  "type": "iboite.account.updated",
  "apiVersion": "1",
  "createdAt": 1791148800000,
  "subject": "…",
  "data": { "accountVersion": 12, "counters": { "unreadLetters": 2, "pendingLetters": 0, "availablePackages": 1, "unreadMessages": 0 } }
}`}
      />

      <H2 id="signature">Vérifier la signature</H2>
      <P>
        La signature est <C>v1=</C> suivi du HMAC SHA-256 hexadécimal de <C>{"`${X-IDN-Timestamp}.${corps brut}`"}</C>,
        calculé avec le secret de l’endpoint. Pendant les 24 heures qui suivent une rotation du secret, l’en-tête porte
        deux signatures séparées par une virgule : acceptez la requête si l’une correspond.
      </P>
      <Code
        title="verifier.ts (Node.js)"
        code={`import { createHmac, timingSafeEqual } from "node:crypto"

export function verifierSignature(rawBody: string, headers: Headers, secret: string): boolean {
  const timestamp = headers.get("x-idn-timestamp") ?? ""
  const received = (headers.get("x-idn-signature") ?? "").split(",").map((s) => s.trim())
  // Refuser les requêtes trop anciennes (rejeu)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const expected = "v1=" + createHmac("sha256", secret).update(\`\${timestamp}.\${rawBody}\`).digest("hex")
  return received.some(
    (sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)),
  )
}`}
      />
      <Callout tone="attention" title="Corps brut">
        Calculez la signature sur le corps exact reçu, avant tout parsing JSON. Dédupliquez sur{" "}
        <C>X-IDN-Event-Id</C> : un même événement peut être livré plusieurs fois.
      </Callout>

      <H2 id="reessais">Réessais et pause</H2>
      <UL>
        <li>Toute réponse hors 2xx, ou un délai de plus de 10 secondes, est un échec.</li>
        <li>Huit tentatives au plus : immédiate, puis après 1 min, 5 min, 30 min, 2 h, 6 h, 12 h et 24 h. Un en-tête Retry-After sur une réponse 429 est respecté (24 h au plus).</li>
        <li>Une réponse 410 met l’endpoint en pause : modifiez son URL puis relancez la vérification.</li>
        <li>Après 20 échecs consécutifs, l’endpoint est mis en pause ; réactivez-le depuis le portail.</li>
        <li>Les livraisons en échec peuvent être rejouées depuis le portail. Elles sont conservées 30 jours.</li>
      </UL>
      <P>
        Suivez les livraisons et leurs échecs dans l’onglet Webhooks et dans <A href="/usage">Usage</A>.
      </P>
    </>
  )
}
