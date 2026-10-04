import type { Metadata } from "next"
import {
  ArrowRight,
  Ban,
  Bell,
  Check,
  Download,
  FileText,
  Fingerprint,
  FolderLock,
  Inbox,
  KeyRound,
  Landmark,
  LockKeyhole,
  Mail,
  Package,
  QrCode,
  ScanFace,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Wallet,
  X,
} from "lucide-react"

import { Button } from "@repo/ui/components/button"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { LoABadge } from "@repo/ui/components/loa-badge"

import { CopyButton } from "./_components/copy-button"
import { LottiePlayer, type BrandAnimation } from "./_components/lottie-player"
import { MobilePrototype } from "./_components/mobile-prototype"
import { PartnerKit } from "./_components/partner-kit"
import { PrintSupports } from "./_components/print-supports"
import { WebPrototype } from "./_components/web-prototype"
import biometric from "./_lottie/biometric.json"
import loader from "./_lottie/loader.json"
import logoReveal from "./_lottie/logo-reveal.json"
import scan from "./_lottie/scan.json"
import shield from "./_lottie/shield.json"
import success from "./_lottie/success.json"
import styles from "./brand.module.css"

export const metadata: Metadata = {
  title: "Identité graphique",
  description:
    "Charte graphique de l'Identité Numérique du Gabon : logo, couleurs, typographie, mouvement et maquettes des applications web et mobile.",
  robots: { index: false, follow: false },
}

const SECTIONS = [
  ["fondements", "Fondements"],
  ["logo", "Logo"],
  ["couleurs", "Couleurs"],
  ["typographie", "Typographie"],
  ["composants", "Composants"],
  ["mouvement", "Mouvement"],
  ["services", "Services"],
  ["mobile", "App mobile"],
  ["web", "App web"],
  ["partenaires", "Partenaires"],
  ["supports", "Imprimés"],
  ["applications", "Déclinaisons"],
  ["kit", "Kit de marque"],
] as const

// ── Couleurs ──────────────────────────────────────────────────────────────

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Ratio de contraste WCAG 2.1 entre deux couleurs. */
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}

const INK = "#16170F"

const PRIMARY_COLORS = [
  {
    name: "Vert Forêt",
    token: "--idn-green",
    hex: "#0E7C3A",
    story: "La forêt équatoriale, qui couvre près de 90 % du territoire.",
    role: "Couleur institutionnelle : actions principales, sceau, état vérifié.",
  },
  {
    name: "Jaune Équateur",
    token: "--idn-yellow",
    hex: "#F2C811",
    story: "L'équateur qui traverse le pays et la lumière qu'il porte.",
    role: "Accent uniquement : barres du drapeau, signal d'attention. Jamais pour du texte.",
  },
  {
    name: "Bleu Océan",
    token: "--idn-blue",
    hex: "#2563AC",
    story: "L'Atlantique et ses 885 km de côtes, de Cocobeach à Mayumba.",
    role: "Information, Niveau de garantie 2, liens secondaires.",
  },
]

const NEUTRALS = {
  clair: [
    ["Fond", "--idn-bg", "#FAFAF8"],
    ["Surface", "--idn-surface", "#FFFFFF"],
    ["Surface 2", "--idn-surface-2", "#F4F3EE"],
    ["Bordure", "--idn-border", "#E6E4DD"],
    ["Atténué", "--idn-muted", "#5E6058"],
    ["Encre", "--idn-ink", "#16170F"],
  ],
  sombre: [
    ["Fond", "--idn-bg", "#0E110D"],
    ["Surface", "--idn-surface", "#181C16"],
    ["Surface 2", "--idn-surface-2", "#22271F"],
    ["Bordure", "--idn-border", "#2C3128"],
    ["Atténué", "--idn-muted", "#B0B2A4"],
    ["Encre", "--idn-ink", "#F2F0E8"],
  ],
} as const

const TOKENS_CSS = `:root {
  --idn-green: #0e7c3a;   /* Vert Forêt */
  --idn-yellow: #f2c811;  /* Jaune Équateur */
  --idn-blue: #2563ac;    /* Bleu Océan */
  --idn-bg: #fafaf8;
  --idn-surface: #ffffff;
  --idn-border: #e6e4dd;
  --idn-ink: #16170f;
  --idn-muted: #5e6058;
  --radius: 0.625rem;     /* 6 · 10 · 14 · 20 px */
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}`

// ── Typographie ───────────────────────────────────────────────────────────

const TYPE_SCALE = [
  { name: "Affiche", spec: "40 / 44 · 600 · -0.02em", size: 40, weight: 600, sample: "Ton identité, en toute confiance." },
  { name: "Titre 1", spec: "28 / 34 · 600 · -0.01em", size: 28, weight: 600, sample: "Vérifie ton identité" },
  { name: "Titre 2", spec: "22 / 28 · 600", size: 22, weight: 600, sample: "Applications connectées" },
  { name: "Titre 3", spec: "17 / 24 · 600", size: 17, weight: 600, sample: "Niveau de garantie substantiel" },
  { name: "Corps", spec: "15 / 24 · 400", size: 15, weight: 400, sample: "Gabon Connect pourra lire ton nom, ton NIP et ton adresse de contact." },
  { name: "Note", spec: "13 / 20 · 400", size: 13, weight: 400, sample: "Dernière connexion il y a 2 heures depuis Libreville." },
]

// ── Mouvement ─────────────────────────────────────────────────────────────

const ANIMATIONS: {
  key: BrandAnimation
  data: { op: number; fr: number }
  name: string
  usage: string
  loop?: boolean
}[] = [
  { key: "logo", data: logoReveal, name: "Révélation du sceau", usage: "Lancement de l'app, écran de connexion. Une seule fois par session." },
  { key: "loader", data: loader, name: "Chargement", usage: "Attente réseau supérieure à 400 ms. Remplace les spinners génériques.", loop: true },
  { key: "biometric", data: biometric, name: "Lecture biométrique", usage: "Connexion par passkey, Face ID ou empreinte.", loop: true },
  { key: "scan", data: scan, name: "Capture d'identité", usage: "Prise de vue de la pièce et du selfie pendant la vérification.", loop: true },
  { key: "success", data: success, name: "Validation", usage: "Fin d'une démarche : dossier soumis, accès accordé." },
  { key: "shield", data: shield, name: "Identité vérifiée", usage: "Niveau de garantie atteint, acte officiel authentique." },
]

const EASINGS = [
  ["Sortie", "cubic-bezier(0.16, 1, 0.3, 1)", "Apparitions, entrées d'écran"],
  ["Transition", "cubic-bezier(0.65, 0, 0.35, 1)", "Déplacements, boucles"],
  ["Rebond", "cubic-bezier(0.34, 1.56, 0.64, 1)", "Sceau et validation uniquement"],
]

// ── Services ──────────────────────────────────────────────────────────────

const SERVICES: { key: BrandAnimation; name: string; promise: string; detail: string }[] = [
  { key: "icarte", name: "iCarte", promise: "Toutes tes cartes, au même endroit.", detail: "CNI, permis, CNAMGS, carte d'électeur, cartes bancaires et de fidélité." },
  { key: "iboite", name: "iBoîte", promise: "Ton adresse officielle en @idn.ga.", detail: "Courriers numérisés, avis de colis et e-mails de l'administration." },
  { key: "idocument", name: "iDocument", promise: "Ton coffre-fort, chiffré de bout en bout.", detail: "Huit dossiers officiels, de l'état civil au véhicule. Personne d'autre ne peut les lire." },
  { key: "icv", name: "iCV", promise: "Un CV dont les diplômes sont vérifiés.", detail: "Douze thèmes, un lien de partage, des titres certifiés par iDocument." },
  { key: "partage", name: "Présentation", promise: "Prouve qui tu es sans rien remettre.", detail: "QR code renouvelé toutes les 30 secondes, lu par un agent ou le vérificateur public." },
  { key: "notification", name: "Alertes", promise: "Les alertes qui comptent, rien de plus.", detail: "Sécurité, démarches, courriers : jamais de publicité, jamais d'urgence inventée." },
]

const KIT: { title: string; note: string; files: [label: string, path: string][] }[] = [
  {
    title: "Symbole",
    note: "SVG vectoriel, 32 unités",
    files: [
      ["Principal", "logo/idn-symbole.svg"],
      ["Inversé", "logo/idn-symbole-inverse.svg"],
      ["Monochrome", "logo/idn-symbole-monochrome.svg"],
    ],
  },
  {
    title: "Signature",
    note: "SVG, texte en IBM Plex",
    files: [
      ["Sur fond clair", "logo/idn-signature.svg"],
      ["Sur fond sombre", "logo/idn-signature-inverse.svg"],
    ],
  },
  {
    title: "Animations Lottie",
    note: "JSON bodymovin 5.7, sans expressions",
    files: [
      ["Révélation du sceau", "lottie/logo-reveal.json"],
      ["Chargement", "lottie/loader.json"],
      ["Lecture biométrique", "lottie/biometric.json"],
      ["Capture d'identité", "lottie/scan.json"],
      ["Validation", "lottie/success.json"],
      ["Identité vérifiée", "lottie/shield.json"],
      ["iCarte", "lottie/icarte.json"],
      ["iBoîte", "lottie/iboite.json"],
      ["iDocument", "lottie/idocument.json"],
      ["iCV", "lottie/icv.json"],
      ["Présentation", "lottie/partage.json"],
      ["Alertes", "lottie/notification.json"],
    ],
  },
  {
    title: "Jetons de design",
    note: "Couleurs, rayons, polices, mouvement",
    files: [
      ["JSON", "jetons/idn-tokens.json"],
      ["CSS", "jetons/idn-tokens.css"],
    ],
  },
]

// ── Composants locaux ─────────────────────────────────────────────────────

function SectionHead({
  index,
  kicker,
  title,
  lead,
}: {
  index: string
  kicker: string
  title: string
  lead: string
}) {
  return (
    <header className={styles.sectionHead}>
      <span className={styles.kicker}>
        {index} · {kicker}
      </span>
      <h2>{title}</h2>
      <p>{lead}</p>
    </header>
  )
}

function Lockup({ tone = "default" }: { tone?: "default" | "inverse" }) {
  return (
    <div className={styles.lockup} data-tone={tone}>
      <IdnMark size={52} className={tone === "inverse" ? styles.markInverse : undefined} />
      <div>
        <strong>Identité Numérique</strong>
        <span className={styles.lockupLabel}>République Gabonaise</span>
        <IdnFlagBars width={84} />
      </div>
    </div>
  )
}

function ContrastTag({ ratio }: { ratio: number }) {
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Décor"
  return (
    <span className={styles.contrastTag} data-pass={ratio >= 4.5}>
      {ratio.toFixed(1).replace(".", ",")}:1 · {level}
    </span>
  )
}

function SignInWithIdn({ variant }: { variant: "plein" | "contour" | "sombre" }) {
  return (
    <button type="button" className={styles.idnButton} data-variant={variant}>
      <IdnMark size={22} className={variant === "plein" ? styles.markInverse : undefined} />
      Se connecter avec IDN
    </button>
  )
}

export default function IdentiteGraphiquePage() {
  return (
    <div className={styles.page}>
      {/* ── Ouverture ─────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.heroKicker}>
              <IdnFlagBars width={42} /> Charte graphique · version 2.0 · octobre 2026
            </span>
            <h1 id="hero-title">
              Un sceau.
              <br />
              Une empreinte.
              <br />
              <span>Une République.</span>
            </h1>
            <p>
              L&apos;identité visuelle d&apos;IDN, l&apos;Identité Numérique du Gabon. Elle doit
              inspirer la confiance qu&apos;on accorde à un document officiel, avec la clarté
              d&apos;un service qu&apos;on utilise tous les jours.
            </p>
            <div className={styles.heroActions}>
              <a href="#mobile" className={styles.heroPrimary}>
                Ouvrir les maquettes <ArrowRight size={16} aria-hidden />
              </a>
              <a href="#logo" className={styles.heroSecondary}>
                Découvrir le logo
              </a>
            </div>
          </div>
          <div className={styles.heroStage}>
            <LottiePlayer
              animation="logo"
              label="Animation du logo IDN : le sceau vert apparaît puis l'empreinte se trace"
              replayable
              className={styles.heroLottie}
            />
            <div className={styles.heroCaption}>
              <span>IDN</span>
              <span>Sceau numérique · 2,5 s</span>
            </div>
          </div>
        </div>
        <nav className={styles.toc} aria-label="Sommaire de la charte">
          {SECTIONS.map(([id, label], i) => (
            <a key={id} href={`#${id}`}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {label}
            </a>
          ))}
        </nav>
      </section>

      {/* ── 01 Fondements ─────────────────────────────────────────── */}
      <section id="fondements" className={styles.section}>
        <SectionHead
          index="01"
          kicker="Fondements"
          title="Le sceau numérique"
          lead="Le logo réunit trois symboles. Chacun dit une chose simple sur ce que fait IDN."
        />
        <div className={styles.pillars}>
          <article>
            <div className={styles.pillarVisual}>
              <span className={styles.sealSquare} />
            </div>
            <h3>Le sceau</h3>
            <p>
              Le carré aux angles adoucis rappelle le cachet de l&apos;administration. Il dit :
              « ceci est officiel ».
            </p>
          </article>
          <article>
            <div className={styles.pillarVisual}>
              <Fingerprint size={64} strokeWidth={1.6} aria-hidden />
            </div>
            <h3>L&apos;empreinte</h3>
            <p>
              Chaque citoyen est unique, et son identité lui appartient. L&apos;empreinte en est
              le signe le plus universel.
            </p>
          </article>
          <article>
            <div className={styles.pillarVisual}>
              <IdnFlagBars width={120} height={8} />
            </div>
            <h3>Les trois barres</h3>
            <p>
              Le vert, le jaune et le bleu du drapeau, posés en signature, discrets. Ils sont la
              marque de la République sur chaque écran.
            </p>
          </article>
        </div>

        <h3 className={styles.subTitle}>Le ton : l&apos;État, sans la distance</h3>
        <div className={styles.voice}>
          {[
            ["Sobre", "On dit ce qui se passe, sans emphase ni emoji.", "Ton identité est vérifiée.", "Bravo !! Tu es vérifié 🎉"],
            ["Factuel", "Chiffres, délais et conséquences explicites.", "Réponse sous 48 h ouvrées.", "Réponse très rapide !"],
            ["Rassurant", "On explique pourquoi on demande une donnée.", "Ton NIP sert uniquement à confirmer que ce compte est le tien.", "Entre ton NIP pour continuer."],
            ["Proche", "On tutoie et on parle simplement, sans jargon technique.", "Ton code a expiré. Demande-en un nouveau.", "Erreur 401 : jeton OTP invalide."],
          ].map(([title, rule, good, bad]) => (
            <article key={title}>
              <h4>{title}</h4>
              <p>{rule}</p>
              <div className={styles.doDont}>
                <span data-ok="true">
                  <Check size={14} aria-hidden /> <span className="sr-only">À faire : </span>
                  {good}
                </span>
                <span data-ok="false">
                  <X size={14} aria-hidden /> <span className="sr-only">À éviter : </span>
                  {bad}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 02 Logo ───────────────────────────────────────────────── */}
      <section id="logo" className={styles.section}>
        <SectionHead
          index="02"
          kicker="Logo"
          title="Un symbole, quatre usages"
          lead="Le symbole se dessine sur une grille de 32 unités. Il ne se redessine pas : on choisit la version qui convient au fond."
        />
        <div className={styles.logoGrid}>
          <div className={styles.construction}>
            <div className={styles.constructionCanvas}>
              <IdnMark size={256} />
              <span className={styles.clearSpace} aria-hidden />
            </div>
            <dl>
              <div>
                <dt>Grille</dt>
                <dd>32 × 32 u, rayon 7 u</dd>
              </div>
              <div>
                <dt>Trait</dt>
                <dd>1,8 u, extrémités rondes</dd>
              </div>
              <div>
                <dt>Zone de protection</dt>
                <dd>8 u (¼ du symbole)</dd>
              </div>
              <div>
                <dt>Taille minimale</dt>
                <dd>16 px · 8 mm</dd>
              </div>
            </dl>
          </div>
          <div className={styles.lockups}>
            <div className={styles.lockupCard}>
              <Lockup />
              <span className={styles.caption}>Signature horizontale · usage par défaut</span>
            </div>
            <div className={styles.lockupCard} data-bg="forest">
              <Lockup tone="inverse" />
              <span className={styles.caption}>Version inversée · fonds verts et sombres</span>
            </div>
          </div>
        </div>

        <div className={styles.variants}>
          {[
            ["Principale", "Sur fond clair", "light", undefined],
            ["Inversée", "Sur Vert Forêt", "green", styles.markInverse],
            ["Monochrome", "Fax, tampon, gravure", "paper", styles.markInk],
            ["Mode sombre", "Interfaces sombres", "dark", undefined],
          ].map(([name, use, bg, cls]) => (
            <figure key={name} className={styles.variant} data-bg={bg}>
              <IdnMark size={72} className={cls} />
              <figcaption>
                <strong>{name}</strong>
                <span>{use}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <h3 className={styles.subTitle}>À ne pas faire</h3>
        <div className={styles.donts}>
          {[
            ["Déformer", styles.dontStretch],
            ["Faire pivoter", styles.dontRotate],
            ["Ajouter une ombre", styles.dontShadow],
            ["Changer la couleur", styles.dontRecolor],
            ["Poser sur le jaune", styles.dontYellow],
          ].map(([label, cls]) => (
            <figure key={label} className={styles.dont}>
              <div className={cls}>
                <IdnMark size={56} />
              </div>
              <figcaption>
                <Ban size={14} aria-hidden /> {label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── 03 Couleurs ───────────────────────────────────────────── */}
      <section id="couleurs" className={styles.section}>
        <SectionHead
          index="03"
          kicker="Couleurs"
          title="Les couleurs du drapeau, avec mesure"
          lead="Les trois couleurs nationales sont utilisées pour leur sens, pas pour décorer. Les neutres, légèrement chauds, font la plus grande part de l'interface."
        />
        <div className={styles.primaries}>
          {PRIMARY_COLORS.map((color) => (
            <article key={color.hex} className={styles.primary}>
              <div className={styles.primarySwatch} style={{ background: color.hex }}>
                <CopyButton value={color.hex} label={`la couleur ${color.name}`} className={styles.copyChip}>
                  {color.hex}
                </CopyButton>
              </div>
              <div className={styles.primaryBody}>
                <h3>{color.name}</h3>
                <code>{color.token}</code>
                <p className={styles.story}>{color.story}</p>
                <p>{color.role}</p>
                <div className={styles.contrastRow}>
                  <span>Texte blanc</span>
                  <ContrastTag ratio={contrast(color.hex, "#FFFFFF")} />
                </div>
                <div className={styles.contrastRow}>
                  <span>Texte encre</span>
                  <ContrastTag ratio={contrast(color.hex, INK)} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.proportion} role="img" aria-label="Répartition des couleurs : 70 % neutres, 18 % vert, 8 % bleu, 4 % jaune">
          <span style={{ flex: 70 }} data-c="neutral">Neutres 70 %</span>
          <span style={{ flex: 18 }} data-c="green">Vert 18 %</span>
          <span style={{ flex: 8 }} data-c="blue">8 %</span>
          <span style={{ flex: 4 }} data-c="yellow" />
        </div>

        <div className={styles.neutrals}>
          {(Object.keys(NEUTRALS) as (keyof typeof NEUTRALS)[]).map((mode) => (
            <div key={mode} className={styles.neutralRow} data-mode={mode}>
              <h3>Neutres · mode {mode}</h3>
              <div>
                {NEUTRALS[mode].map(([name, token, hex]) => (
                  <CopyButton key={token} value={hex} label={`${name} ${mode}`} className={styles.neutral}>
                    <span className={styles.neutralChip} style={{ background: hex }} />
                    <span className={styles.neutralMeta}>
                      <strong>{name}</strong>
                      <code>{hex}</code>
                    </span>
                  </CopyButton>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.assurance}>
          <div>
            <h3>Niveaux de garantie</h3>
            <p>
              Le niveau de confiance d&apos;un compte se lit d&apos;un coup d&apos;œil : gris, bleu,
              puis vert quand l&apos;identité a été confirmée en entretien vidéo.
            </p>
          </div>
          <div className={styles.loaList}>
            <LoABadge level={1} />
            <LoABadge level={2} />
            <LoABadge level={3} />
          </div>
        </div>
      </section>

      {/* ── 04 Typographie ────────────────────────────────────────── */}
      <section id="typographie" className={styles.section}>
        <SectionHead
          index="04"
          kicker="Typographie"
          title="IBM Plex, la lisibilité d'abord"
          lead="Une famille libre, robuste sur les écrans d'entrée de gamme, avec les accents du français et une mono pour les identifiants."
        />
        <div className={styles.typeGrid}>
          <div className={styles.specimen}>
            <span className={styles.specimenGlyph}>Aa</span>
            <div>
              <strong>IBM Plex Sans</strong>
              <span>Regular 400 · Medium 500 · Semibold 600 · Bold 700</span>
              <p>ABCDÉÈFGHIJKLMNOPQRSTUVWXYZ</p>
              <p>abcdéèêfghijklmnopqrstuvwxyzàçœ</p>
            </div>
          </div>
          <div className={styles.specimen} data-mono="true">
            <span className={styles.specimenGlyph}>0O</span>
            <div>
              <strong>IBM Plex Mono</strong>
              <span>NIP, codes, références, libellés</span>
              <p>1990 0312 0045 87</p>
              <p>ACT-2026-0418-7Q3K</p>
            </div>
          </div>
        </div>
        <ol className={styles.scale}>
          {TYPE_SCALE.map((row) => (
            <li key={row.name}>
              <div className={styles.scaleMeta}>
                <strong>{row.name}</strong>
                <code>{row.spec}</code>
              </div>
              <p style={{ fontSize: row.size, fontWeight: row.weight }}>{row.sample}</p>
            </li>
          ))}
          <li>
            <div className={styles.scaleMeta}>
              <strong>Libellé</strong>
              <code>Mono 11 · 500 · +0.08em</code>
            </div>
            <p className={styles.labelSample}>Niveau de garantie · République Gabonaise</p>
          </li>
        </ol>
      </section>

      {/* ── 05 Composants ─────────────────────────────────────────── */}
      <section id="composants" className={styles.section}>
        <SectionHead
          index="05"
          kicker="Composants"
          title="Relief par la bordure, jamais par l'ombre"
          lead="Les composants affichés ici sont ceux de la bibliothèque partagée (packages/ui) : ce qui est montré est ce qui est livré."
        />
        <div className={styles.components}>
          <article className={styles.componentCard}>
            <h3>Boutons</h3>
            <div className={styles.row}>
              <Button>Continuer</Button>
              <Button variant="outline">Plus tard</Button>
              <Button variant="secondary">Modifier</Button>
              <Button variant="ghost">Annuler</Button>
              <Button variant="destructive">Révoquer l&apos;accès</Button>
            </div>
          </article>
          <article className={styles.componentCard}>
            <h3>Champs</h3>
            <div className={styles.fieldStack}>
              <div className={styles.field}>
                <Label htmlFor="demo-email">Adresse e-mail</Label>
                <Input id="demo-email" type="email" defaultValue="awa.mboumba@idn.ga" />
              </div>
              <div className={styles.field}>
                <Label htmlFor="demo-nip">NIP</Label>
                <Input id="demo-nip" aria-invalid="true" aria-describedby="demo-nip-error" defaultValue="1990 0312 004" />
                <span id="demo-nip-error" className={styles.fieldError}>
                  Le NIP compte 14 chiffres. Il en manque 3.
                </span>
              </div>
            </div>
          </article>
          <article className={styles.componentCard}>
            <h3>Statuts de vérification</h3>
            <div className={styles.row}>
              {[
                ["En revue", "blue"],
                ["Complément demandé", "yellow"],
                ["Approuvée", "green"],
                ["Refusée", "red"],
                ["Brouillon", "neutral"],
              ].map(([label, tone]) => (
                <span key={label} className={styles.status} data-tone={tone}>
                  <span aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </article>
          <article className={styles.componentCard}>
            <h3>Se connecter avec IDN</h3>
            <p className={styles.cardNote}>
              Le bouton que les partenaires intègrent. Il est fourni tel quel : on ne change ni le
              texte, ni le symbole, ni le rayon.
            </p>
            <div className={styles.row}>
              <SignInWithIdn variant="plein" />
              <SignInWithIdn variant="contour" />
              <SignInWithIdn variant="sombre" />
            </div>
          </article>
          <article className={styles.componentCard} data-wide="true">
            <h3>Iconographie</h3>
            <p className={styles.cardNote}>
              Lucide, trait de 1,8 px, extrémités rondes : le même dessin que l&apos;empreinte du
              symbole. Icônes à 16, 20 ou 24 px, toujours accompagnées d&apos;un libellé.
            </p>
            <ul className={styles.icons}>
              {[
                [Fingerprint, "Biométrie"],
                [ShieldCheck, "Vérifié"],
                [ScanFace, "Selfie"],
                [QrCode, "QR code"],
                [Wallet, "iCarte"],
                [Inbox, "iBoîte"],
                [FolderLock, "iDocument"],
                [FileText, "iCV"],
                [KeyRound, "Passkey"],
                [LockKeyhole, "PIN"],
                [UserCheck, "Consentement"],
                [Bell, "Alertes"],
                [Mail, "@idn.ga"],
                [Package, "Colis"],
                [Smartphone, "Appareil"],
                [Landmark, "Administration"],
              ].map(([Icon, label]) => {
                const Glyph = Icon as typeof Fingerprint
                return (
                  <li key={label as string}>
                    <Glyph size={22} strokeWidth={1.8} aria-hidden />
                    <span>{label as string}</span>
                  </li>
                )
              })}
            </ul>
          </article>
        </div>
      </section>

      {/* ── 06 Mouvement ──────────────────────────────────────────── */}
      <section id="mouvement" className={styles.section}>
        <SectionHead
          index="06"
          kicker="Mouvement"
          title="Des animations qui informent"
          lead="Six animations Lottie, générées à partir des tracés du symbole. Chacune répond à un moment précis du parcours. Si tu as demandé à ton appareil de réduire les animations, elles ne démarrent pas seules : seul leur état final s'affiche."
        />
        <div className={styles.motionGrid}>
          {ANIMATIONS.map((item) => (
            <article key={item.key} className={styles.motionCard}>
              <LottiePlayer
                animation={item.key}
                label={`Animation : ${item.name}`}
                loop={item.loop}
                replayable={!item.loop}
                pausable={item.loop}
                className={styles.motionLottie}
              />
              <div className={styles.motionBody}>
                <div className={styles.motionTitle}>
                  <h3>{item.name}</h3>
                  <code>
                    {(item.data.op / item.data.fr).toFixed(1).replace(".", ",")} s
                    {item.loop ? " · boucle" : ""}
                  </code>
                </div>
                <p>{item.usage}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.easings}>
          {EASINGS.map(([name, curve, use]) => (
            <div key={name}>
              <strong>{name}</strong>
              <code>{curve}</code>
              <span>{use}</span>
            </div>
          ))}
          <div>
            <strong>Durées</strong>
            <code>150 · 250 · 400 ms</code>
            <span>Survol · transition d&apos;écran · panneau</span>
          </div>
        </div>
      </section>

      {/* ── 08 App mobile ─────────────────────────────────────────── */}
      {/* ── 07 Services ───────────────────────────────────────────── */}
      <section id="services" className={styles.section}>
        <SectionHead
          index="07"
          kicker="Architecture de marque"
          title="Une seule voix, six services"
          lead="Les services ne sont pas des marques à part : ils partagent le même vert, la même typographie et le même sceau. Chacun se reconnaît à son pictogramme animé."
        />
        <div className={styles.services}>
          {SERVICES.map((service) => (
            <article key={service.key} className={styles.serviceCard}>
              <LottiePlayer
                animation={service.key}
                label={`Animation du service ${service.name}`}
                replayable={service.key !== "partage"}
                loop={service.key === "partage"}
                pausable={service.key === "partage"}
                className={styles.serviceLottie}
              />
              <div className={styles.serviceBody}>
                <div className={styles.serviceLockup}>
                  <IdnMark size={22} />
                  <strong>{service.name}</strong>
                  <span>par IDN</span>
                </div>
                <h3>{service.promise}</h3>
                <p>{service.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.naming}>
          <h3>Règles de nommage</h3>
          <ul>
            <li>
              <strong>iBoîte</strong>, pas I-Boîte, Iboîte ni iBOX : un « i » minuscule collé à un
              nom français, sans traduction.
            </li>
            <li>
              Hors de l&apos;app, le service est toujours signé : « iBoîte, par IDN ».
            </li>
            <li>
              Pas de couleur propre à un service : l&apos;État ne parle qu&apos;avec une seule
              voix.
            </li>
            <li>
              « Identité Numérique » en toutes lettres à la première mention, « IDN » ensuite.
            </li>
          </ul>
        </div>
      </section>

      <section id="mobile" className={styles.section}>
        <SectionHead
          index="08"
          kicker="Application mobile"
          title="IDN dans la poche"
          lead="Prototype cliquable : choisis un écran ou navigue directement dans le téléphone. Les données sont fictives."
        />
        <MobilePrototype />
      </section>

      {/* ── 09 App web ────────────────────────────────────────────── */}
      <section id="web" className={styles.section}>
        <SectionHead
          index="09"
          kicker="Application web"
          title="L'espace citoyen sur identite.ga"
          lead="Le même système sur grand écran : tableau de bord, services, consentements, sécurité, et les parcours vus depuis un partenaire."
        />
        <WebPrototype />
      </section>

      {/* ── 10 Partenaires ────────────────────────────────────────── */}
      <section id="partenaires" className={styles.section}>
        <SectionHead
          index="10"
          kicker="Kit partenaire"
          title="Se connecter avec IDN, chez les autres"
          lead="Les administrations et entreprises intègrent IDN avec le SDK officiel. Compose ton bouton, copie le code, puis vis le parcours complet chez un partenaire."
        />
        <PartnerKit />
      </section>

      {/* ── 11 Supports imprimés ──────────────────────────────────── */}
      <section id="supports" className={styles.section}>
        <SectionHead
          index="11"
          kicker="Supports imprimés"
          title="Du guichet à la poche"
          lead="La marque sort de l'écran : carte, affiche, kakemono d'enrôlement, badge d'agent, vitrophanie et papeterie. Même sceau, même ordre de lecture."
        />
        <PrintSupports />
      </section>

      {/* ── 12 Déclinaisons ───────────────────────────────────────── */}
      <section id="applications" className={styles.section}>
        <SectionHead
          index="12"
          kicker="Déclinaisons"
          title="La marque, partout où elle apparaît"
          lead="Icône d'application, onglet du navigateur, partage sur les réseaux, courrier officiel : le même sceau, le même ordre de lecture."
        />
        <div className={styles.applications}>
          <article className={styles.appCard}>
            <h3>Icône d&apos;application</h3>
            <div className={styles.appIcons}>
              {[96, 72, 56, 40].map((size) => (
                <span key={size} className={styles.appIcon} style={{ width: size, height: size }}>
                  <IdnMark size={Math.round(size * 1.16)} />
                </span>
              ))}
            </div>
            <span className={styles.caption}>iOS, Android : symbole à fond perdu, rayon système</span>
          </article>
          <article className={styles.appCard}>
            <h3>Onglet du navigateur</h3>
            <div className={styles.browserTab}>
              <span className={styles.tab}>
                <IdnMark size={16} /> Identité Numérique · Accueil
              </span>
              <span className={styles.tabUrl}>
                <LockKeyhole size={12} aria-hidden /> identite.ga
              </span>
            </div>
            <span className={styles.caption}>Favicon 32 px, PWA 192 et 512 px</span>
          </article>
          <article className={styles.appCard} data-wide="true">
            <h3>Carte de partage</h3>
            <div className={styles.ogCard}>
              <div>
                <Lockup tone="inverse" />
                <p>Ton identité numérique, reconnue par l&apos;État et protégée par toi.</p>
              </div>
              <span>identite.ga</span>
            </div>
            <span className={styles.caption}>Open Graph 1200 × 630</span>
          </article>
          <article className={styles.appCard} data-wide="true">
            <h3>Courrier officiel</h3>
            <div className={styles.letter}>
              <div className={styles.letterHead}>
                <Lockup />
                <span>
                  Libreville, le 4 octobre 2026
                  <br />
                  Réf. IDN/KYC/2026/04187
                </span>
              </div>
              <p>
                <strong>Objet : confirmation de ton niveau de garantie</strong>
              </p>
              <p>
                Ton identité a été confirmée lors de l&apos;entretien du 2 octobre 2026. Ton
                compte passe au Niveau 3 (élevé). Tu peux désormais accéder aux démarches qui
                l&apos;exigent.
              </p>
              <IdnFlagBars width="100%" height={4} />
            </div>
          </article>
          <article className={styles.appCard} data-wide="true">
            <h3>Jetons de design</h3>
            <div className={styles.codeBlock}>
              <CopyButton value={TOKENS_CSS} label="les jetons CSS" className={styles.codeCopy}>
                Copier
              </CopyButton>
              <pre>
                <code>{TOKENS_CSS}</code>
              </pre>
            </div>
            <span className={styles.caption}>
              Source : packages/ui/src/styles/globals.css · apps/mobile/src/design/tokens.ts
            </span>
          </article>
        </div>
      </section>

      {/* ── 13 Kit de marque ──────────────────────────────────────── */}
      <section id="kit" className={styles.section}>
        <SectionHead
          index="13"
          kicker="Kit de marque"
          title="Tout ce qu'il faut pour bien faire"
          lead="Les fichiers sources, générés depuis le code : ils restent fidèles au produit. Pour les régénérer : bun run lottie:brand dans apps/web."
        />
        <div className={styles.kitGrid}>
          {KIT.map((group) => (
            <article key={group.title} className={styles.kitCard}>
              <h3>{group.title}</h3>
              <span className={styles.caption}>{group.note}</span>
              <ul>
                {group.files.map(([label, path]) => (
                  <li key={path}>
                    <a href={`/identite-graphique/${path}`} download className={styles.download}>
                      <span>{label}</span>
                      <code>{path.split("/").pop()}</code>
                      <Download size={14} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.pageFooter}>
        <IdnFlagBars width={60} />
        <p>
          Charte graphique IDN · version 2.0 · document de travail, non indexé. Les personnes et
          données présentées sont fictives.
        </p>
      </footer>
    </div>
  )
}
