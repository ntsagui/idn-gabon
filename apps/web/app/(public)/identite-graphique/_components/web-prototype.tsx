"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react"
import {
  Activity,
  Archive,
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  Car,
  Check,
  ChevronRight,
  CircleX,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  FileUser,
  Fingerprint,
  Folder,
  FolderLock,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  Inbox,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Mailbox,
  MapPin,
  Moon,
  Package,
  Paperclip,
  Phone,
  Plus,
  Reply,
  ScanLine,
  ScrollText,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Video,
  X,
  type LucideIcon,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { LottiePlayer } from "./lottie-player"
import styles from "./web-prototype.module.css"

/* ------------------------------------------------------------------ */
/* Données de la maquette                                              */
/* ------------------------------------------------------------------ */

type ScreenId =
  | "signin"
  | "dashboard"
  | "icarte"
  | "iboite"
  | "idoc"
  | "icv"
  | "consents"
  | "activity"
  | "settings"
  | "oauth"
  | "verifier"

const SCREENS: { id: ScreenId; label: string; path: string }[] = [
  { id: "signin", label: "Connexion", path: "sign-in" },
  { id: "dashboard", label: "Tableau de bord", path: "dashboard" },
  { id: "icarte", label: "iCarte", path: "icarte" },
  { id: "iboite", label: "iBoîte", path: "iboite" },
  { id: "idoc", label: "iDocument", path: "idoc" },
  { id: "icv", label: "iCV", path: "icv" },
  { id: "consents", label: "Consentements", path: "consents" },
  { id: "activity", label: "Activité", path: "activity" },
  { id: "settings", label: "Sécurité", path: "settings" },
  {
    id: "oauth",
    label: "Autorisation OAuth",
    path: "oauth/authorize?client_id=gabon-connect",
  },
  { id: "verifier", label: "Vérificateur", path: "verifier" },
]

const APP_NAV: { id: ScreenId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Accueil", icon: House },
  { id: "icarte", label: "iCarte", icon: CreditCard },
  { id: "iboite", label: "iBoîte", icon: Mail },
  { id: "idoc", label: "iDocument", icon: FolderLock },
  { id: "icv", label: "iCV", icon: FileUser },
  { id: "consents", label: "Consentements", icon: ShieldCheck },
  { id: "activity", label: "Activité", icon: Activity },
  { id: "settings", label: "Sécurité", icon: Settings },
]

const USER = {
  firstName: "Awa",
  lastName: "Mboumba",
  initials: "AM",
  birth: "12/03/1990 à Libreville",
  nip: "1990 0312 0045 87",
  nipMasked: "•••• •••• 0045 87",
  email: "awa.mboumba@idn.ga",
  phone: "+241 77 12 34 56",
}

type Scope = "profil" | "nip" | "adresse" | "niveau"

const SCOPE_LABELS: Record<Scope, string> = {
  profil: "Profil",
  nip: "NIP",
  adresse: "Adresse @idn.ga",
  niveau: "Niveau de garantie",
}

type ConnectedApp = {
  id: string
  name: string
  domain: string
  initials: string
  color: string
  scopes: Scope[]
  granted: string
  lastUsed: string
}

const INITIAL_APPS: ConnectedApp[] = [
  {
    id: "gabon-connect",
    name: "Gabon Connect",
    domain: "gabonconnect.ga",
    initials: "GC",
    color: "#2563AC",
    scopes: ["profil", "nip", "adresse", "niveau"],
    granted: "12 août 2026",
    lastUsed: "il y a 2 h",
  },
  {
    id: "cnamgs",
    name: "CNAMGS",
    domain: "cnamgs.ga",
    initials: "CN",
    color: "#0B6E78",
    scopes: ["profil", "nip", "niveau"],
    granted: "3 mai 2026",
    lastUsed: "hier",
  },
  {
    id: "impots",
    name: "Impôts Gabon",
    domain: "dgi.ga",
    initials: "IG",
    color: "#0A5C2C",
    scopes: ["profil", "nip", "adresse"],
    granted: "21 janvier 2026",
    lastUsed: "le 30 septembre",
  },
]

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

/** Minuteries annulées au démontage (évite les mises à jour orphelines). */
function useTimers() {
  const ids = useRef<number[]>([])
  useEffect(() => {
    const list = ids.current
    return () => list.forEach((id) => window.clearTimeout(id))
  }, [])
  return useCallback((fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms))
  }, [])
}

function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ")
}

function FlagBars({ className }: { className?: string }) {
  return (
    <span className={cx(styles.flag, className)} aria-hidden>
      <span className={styles.flagGreen} />
      <span className={styles.flagYellow} />
      <span className={styles.flagBlue} />
    </span>
  )
}

function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const label = { 1: "Faible", 2: "Substantiel", 3: "Élevé" }[level]
  return (
    <span className={cx(styles.badge, styles[`level${level}`])}>
      <BadgeCheck size={14} aria-hidden />
      Niveau {level} · {label}
    </span>
  )
}

function Avatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cx(styles.avatar, styles[`avatar_${size}`])} aria-hidden>
      {USER.initials}
    </span>
  )
}

function PageHead({
  title,
  subtitle,
  action,
  headingRef,
}: {
  title: string
  subtitle: string
  action?: ReactNode
  headingRef?: RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div className={styles.pageHead}>
      <div>
        <h1 className={styles.pageTitle} ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <p className={styles.pageSubtitle}>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Boîte de dialogue de confirmation (RGAA 7.1 / 12.8)                  */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  successLabel,
  onCancel,
  onDone,
}: {
  title: string
  description: string
  confirmLabel: string
  successLabel: string
  onCancel: () => void
  onDone: () => void
}) {
  const [phase, setPhase] = useState<"confirm" | "pending" | "done">("confirm")
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()
  const later = useTimers()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previous?.focus()
  }, [])

  function confirm() {
    setPhase("pending")
    dialogRef.current?.focus()
    later(() => setPhase("done"), 700)
    later(onDone, 2300)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && phase === "confirm") {
      event.stopPropagation()
      onCancel()
      return
    }
    if (event.key !== "Tab" || !dialogRef.current) return
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      "button:not([disabled])"
    )
    if (focusables.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={styles.dialog}
        onKeyDown={onKeyDown}
      >
        {phase === "confirm" ? (
          <>
            <span className={styles.dialogIcon} aria-hidden>
              <TriangleAlert size={20} />
            </span>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            <p id={descId} className={styles.dialogText}>
              {description}
            </p>
            <div className={styles.dialogActions}>
              <button
                ref={cancelRef}
                type="button"
                className={styles.btnSecondary}
                onClick={onCancel}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={confirm}
              >
                {confirmLabel}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.dialogResult} role="status">
            <h2 id={titleId} className={styles.srOnly}>
              {title}
            </h2>
            {phase === "pending" ? (
              <>
                <LottiePlayer
                  animation="loader"
                  loop
                  label="Traitement en cours"
                  className={styles.lottieLoader}
                />
                <p id={descId} className={styles.dialogText}>
                  Traitement en cours…
                </p>
              </>
            ) : (
              <>
                <LottiePlayer
                  animation="success"
                  label="Action réussie"
                  className={styles.lottieSuccess}
                />
                <p id={descId} className={styles.dialogResultTitle}>
                  {successLabel}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Connexion                                                         */
/* ------------------------------------------------------------------ */

function SignInScreen({
  onSignedIn,
  onVerifier,
}: {
  onSignedIn: () => void
  onVerifier: () => void
}) {
  const [mode, setMode] = useState<"form" | "password" | "passkey">("form")
  const later = useTimers()
  const emailId = useId()
  const passwordId = useId()

  function submit(event: FormEvent) {
    event.preventDefault()
    setMode("password")
    later(onSignedIn, 1400)
  }

  function passkey() {
    setMode("passkey")
    later(onSignedIn, 1800)
  }

  return (
    <div className={styles.signin}>
      <aside className={styles.signinAside}>
        <FlagBars />
        <p className={styles.eyebrow}>République gabonaise</p>
        <h2 className={styles.signinPitch}>
          Ton identité, tes documents et ton courrier officiel, en un seul
          endroit.
        </h2>
        <ul className={styles.signinList}>
          <li>
            <ShieldCheck size={18} aria-hidden />
            Identité vérifiée par la DGDI, niveaux de garantie 1 à 3
          </li>
          <li>
            <FolderLock size={18} aria-hidden />
            Coffre-fort chiffré de bout en bout
          </li>
          <li>
            <Mailbox size={18} aria-hidden />
            Adresse souveraine @idn.ga et courriers numérisés
          </li>
        </ul>
        <p className={styles.signinFoot}>
          Service public numérique · identite.ga
        </p>
      </aside>

      <div className={styles.signinPanel}>
        <div className={styles.signinCard}>
          {mode === "form" ? (
            <>
              <LottiePlayer
                animation="logo"
                label="Logo animé Identité Numérique du Gabon"
                className={styles.lottieLogo}
              />
              <h1 className={styles.signinTitle}>Connexion</h1>
              <p className={styles.muted}>
                Accède à ton espace Identité Numérique.
              </p>
              <form className={styles.form} onSubmit={submit}>
                <div className={styles.field}>
                  <label htmlFor={emailId} className={styles.label}>
                    Adresse e-mail
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="off"
                    defaultValue={USER.email}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label htmlFor={passwordId} className={styles.label}>
                      Mot de passe
                    </label>
                    <button type="button" className={styles.linkBtn}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    id={passwordId}
                    type="password"
                    required
                    autoComplete="off"
                    defaultValue="demo-identite-ga"
                    className={styles.input}
                  />
                </div>
                <button type="submit" className={styles.btnPrimary}>
                  Se connecter
                </button>
              </form>
              <div className={styles.divider}>
                <span>ou</span>
              </div>
              <button
                type="button"
                className={cx(styles.btnSecondary, styles.btnBlock)}
                onClick={passkey}
              >
                <Fingerprint size={18} aria-hidden />
                Continuer avec une passkey
              </button>
              <p className={styles.signinMeta}>
                Pas encore d’identité numérique ?{" "}
                <button type="button" className={styles.linkBtn}>
                  Créer mon compte
                </button>
              </p>
              <p className={styles.signinMeta}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={onVerifier}
                >
                  Vérifier un acte officiel
                </button>
              </p>
            </>
          ) : (
            <div className={styles.signinWait} role="status">
              {mode === "passkey" ? (
                <>
                  <LottiePlayer
                    animation="biometric"
                    loop
                    label="Lecture de l’empreinte biométrique"
                    className={styles.lottieBio}
                  />
                  <h1 className={styles.signinTitle}>Confirme avec ta passkey</h1>
                  <p className={styles.muted}>
                    Touche le capteur Touch ID de ton appareil.
                  </p>
                </>
              ) : (
                <>
                  <LottiePlayer
                    animation="loader"
                    loop
                    label="Connexion en cours"
                    className={styles.lottieLoader}
                  />
                  <h1 className={styles.signinTitle}>Connexion en cours</h1>
                  <p className={styles.muted}>Vérification de tes identifiants…</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Coque applicative : barre latérale + en-tête                         */
/* ------------------------------------------------------------------ */

const NOTIFICATIONS = [
  {
    id: "n1",
    icon: BadgeCheck,
    title: "Vérification approuvée",
    text: "Ton identité est confirmée au Niveau 2 · Substantiel.",
    time: "Il y a 20 min",
  },
  {
    id: "n2",
    icon: Mailbox,
    title: "Courrier numérisé",
    text: "CNAMGS — Attestation de droits, reçue à Libreville-Centre.",
    time: "Il y a 2 h",
  },
  {
    id: "n3",
    icon: Smartphone,
    title: "Nouvel appareil",
    text: "Connexion depuis un iPhone 15 à Port-Gentil.",
    time: "Hier, 21:04",
  },
]

function AppShell({
  screen,
  onNavigate,
  children,
}: {
  screen: ScreenId
  onNavigate: (id: ScreenId) => void
  children: ReactNode
}) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(NOTIFICATIONS.length)
  const panelId = useId()
  const searchId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    function onDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [notifOpen])

  return (
    <div className={styles.app}>
      <nav className={styles.sidebar} aria-label="Navigation principale">
        <div className={styles.brand}>
          <IdnMark size={28} />
          <span className={styles.brandText}>Identité Numérique</span>
        </div>
        <ul className={styles.navList}>
          {APP_NAV.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                className={styles.navItem}
                aria-current={screen === id ? "page" : undefined}
                onClick={() => onNavigate(id)}
                title={label}
              >
                <Icon size={18} aria-hidden />
                <span className={styles.navLabel}>{label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.sideFoot}>
          <div className={styles.sideProfile}>
            <Avatar size="sm" />
            <span className={styles.navLabel}>
              <span className={styles.sideName}>
                {USER.firstName} {USER.lastName}
              </span>
              <span className={styles.sideMeta}>Niveau 2 · Substantiel</span>
            </span>
          </div>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => onNavigate("signin")}
            title="Se déconnecter"
          >
            <LogOut size={18} aria-hidden />
            <span className={styles.navLabel}>Se déconnecter</span>
          </button>
        </div>
      </nav>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.search}>
            <label htmlFor={searchId} className={styles.srOnly}>
              Rechercher dans ton espace
            </label>
            <Search size={16} aria-hidden className={styles.searchIcon} />
            <input
              id={searchId}
              type="search"
              placeholder="Rechercher un document, une carte, un message…"
              className={styles.searchInput}
            />
          </div>
          <div
            className={styles.notifWrap}
            ref={wrapRef}
            onKeyDown={(event) => {
              if (event.key === "Escape" && notifOpen) setNotifOpen(false)
            }}
          >
            <button
              type="button"
              className={styles.iconBtn}
              aria-expanded={notifOpen}
              aria-controls={panelId}
              aria-label={
                unread > 0
                  ? `Notifications, ${unread} non lues`
                  : "Notifications, aucune non lue"
              }
              onClick={() => setNotifOpen((open) => !open)}
            >
              <Bell size={18} aria-hidden />
              {unread > 0 ? (
                <span className={styles.dot} aria-hidden>
                  {unread}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div id={panelId} className={styles.notifPanel}>
                <div className={styles.notifHead}>
                  <h2 className={styles.cardTitle}>Notifications</h2>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => setUnread(0)}
                    disabled={unread === 0}
                  >
                    Tout marquer comme lu
                  </button>
                </div>
                <ul className={styles.notifList}>
                  {NOTIFICATIONS.map(({ id, icon: Icon, title, text, time }, i) => (
                    <li
                      key={id}
                      className={cx(styles.notifItem, i < unread && styles.notifUnread)}
                    >
                      <span className={styles.notifIcon} aria-hidden>
                        <Icon size={16} />
                      </span>
                      <span>
                        <span className={styles.notifTitle}>
                          {title}
                          {i < unread ? (
                            <span className={styles.srOnly}> (non lue)</span>
                          ) : null}
                        </span>
                        <span className={styles.notifText}>{text}</span>
                        <span className={styles.notifTime}>{time}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <span className={styles.headerUser}>
            <Avatar size="sm" />
            <span className={styles.srOnly}>
              Connectée en tant que {USER.firstName} {USER.lastName}
            </span>
          </span>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Tableau de bord                                                   */
/* ------------------------------------------------------------------ */

function DashboardScreen({ onNavigate }: { onNavigate: (id: ScreenId) => void }) {
  const [showNip, setShowNip] = useState(false)
  const [booked, setBooked] = useState(false)

  const services: {
    id: ScreenId
    label: string
    meta: string
    icon: LucideIcon
  }[] = [
    { id: "icarte", label: "iCarte", meta: "7 cartes", icon: CreditCard },
    { id: "iboite", label: "iBoîte", meta: "3 non lus", icon: Mail },
    { id: "idoc", label: "iDocument", meta: "14 documents", icon: FolderLock },
    { id: "icv", label: "iCV", meta: "Mis à jour en septembre", icon: FileUser },
    { id: "consents", label: "Consentements", meta: "3 applications", icon: ShieldCheck },
    { id: "settings", label: "Sécurité", meta: "2 sessions actives", icon: Lock },
  ]

  return (
    <div className={styles.page}>
      <PageHead
        title={`Bonjour ${USER.firstName}`}
        subtitle="Samedi 4 octobre 2026 · Libreville"
      />

      <div className={styles.dashGrid}>
        <section className={cx(styles.card, styles.idCard)} aria-labelledby="dash-id">
          <div className={styles.idTop}>
            <Avatar size="lg" />
            <div className={styles.idWho}>
              <h2 id="dash-id" className={styles.idName}>
                {USER.firstName} {USER.lastName}
              </h2>
              <p className={styles.muted}>Née le {USER.birth}</p>
              <div className={styles.idBadges}>
                <LevelBadge level={2} />
                <span className={styles.verified}>
                  <LottiePlayer
                    animation="shield"
                    label="Bouclier de vérification"
                    className={styles.lottieShieldSm}
                  />
                  Identité vérifiée
                </span>
              </div>
            </div>
          </div>
          <div className={styles.nipRow}>
            <div>
              <span className={styles.monoLabel}>NIP</span>
              <span className={styles.nip}>
                {showNip ? USER.nip : USER.nipMasked}
              </span>
            </div>
            <button
              type="button"
              className={styles.btnGhost}
              aria-pressed={showNip}
              onClick={() => setShowNip((v) => !v)}
            >
              {showNip ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              {showNip ? "Masquer le NIP" : "Afficher le NIP"}
            </button>
          </div>
          <div className={styles.upgrade} aria-live="polite">
            <span className={styles.upgradeIcon} aria-hidden>
              <Video size={20} />
            </span>
            {booked ? (
              <div className={styles.upgradeBody}>
                <p className={styles.upgradeTitle}>Entretien réservé</p>
                <p className={styles.upgradeText}>
                  Lundi 6 octobre à 10 h 30 avec un contrôleur. Tu recevras le
                  lien vidéo dans iBoîte.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.upgradeBody}>
                  <p className={styles.upgradeTitle}>
                    Passe au Niveau 3 — réserve ton entretien vidéo
                  </p>
                  <p className={styles.upgradeText}>
                    Un contrôleur confirme ton identité en 15 minutes. Prochain
                    créneau : lundi 6 octobre, 10 h 30.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setBooked(true)}
                >
                  Réserver
                </button>
              </>
            )}
          </div>
        </section>

        <section className={cx(styles.card, styles.addrCard)} aria-labelledby="dash-addr">
          <span className={styles.monoLabel}>Adresse souveraine</span>
          <h2 id="dash-addr" className={styles.addr}>
            {USER.email}
          </h2>
          <ul className={styles.addrStats}>
            <li>
              <Inbox size={16} aria-hidden /> <strong>3</strong> e-mails non lus
            </li>
            <li>
              <Mailbox size={16} aria-hidden /> <strong>1</strong> courrier numérisé
            </li>
            <li>
              <Package size={16} aria-hidden /> <strong>1</strong> colis à retirer
            </li>
          </ul>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => onNavigate("iboite")}
          >
            Ouvrir iBoîte
            <ChevronRight size={16} aria-hidden />
          </button>
        </section>
      </div>

      <h2 className={styles.sectionTitle}>Mes services</h2>
      <ul className={styles.serviceGrid}>
        {services.map(({ id, label, meta, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              className={styles.service}
              onClick={() => onNavigate(id)}
            >
              <span className={styles.serviceIcon} aria-hidden>
                <Icon size={18} />
              </span>
              <span className={styles.serviceLabel}>{label}</span>
              <span className={styles.serviceMeta}>{meta}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className={styles.card} aria-labelledby="dash-activity">
        <div className={styles.cardHead}>
          <h2 id="dash-activity" className={styles.cardTitle}>
            Activité récente
          </h2>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => onNavigate("activity")}
          >
            Tout voir
          </button>
        </div>
        <ul className={styles.rows}>
          {ACTIVITY.slice(0, 4).map((row) => (
            <li key={row.id} className={styles.row}>
              <span className={styles.rowIcon} aria-hidden>
                <row.icon size={16} />
              </span>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>{row.title}</span>
                <span className={styles.rowMeta}>{row.where}</span>
              </span>
              <span className={styles.rowTime}>{row.when}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3. iCarte                                                            */
/* ------------------------------------------------------------------ */

type WalletCard = {
  id: string
  issuer: string
  title: string
  number: string
  expiry: string
  color: string
  ink: string
  fields: [string, string][]
}

const CARDS: WalletCard[] = [
  {
    id: "cni",
    issuer: "DGDI · République gabonaise",
    title: "Carte nationale d’identité",
    number: "•••• 4518 GA",
    expiry: "03/2031",
    color: "#0E7C3A",
    ink: "#FFFFFF",
    fields: [
      ["Numéro", "GA-019 874 518"],
      ["Délivrée le", "14/03/2021 à Libreville"],
      ["Expire le", "13/03/2031"],
    ],
  },
  {
    id: "permis",
    issuer: "Ministère des Transports",
    title: "Permis de conduire",
    number: "•••• 7720",
    expiry: "06/2034",
    color: "#2563AC",
    ink: "#FFFFFF",
    fields: [
      ["Catégories", "B, BE"],
      ["Délivré le", "02/06/2019 à Libreville"],
      ["Expire le", "01/06/2034"],
    ],
  },
  {
    id: "cnamgs",
    issuer: "CNAMGS",
    title: "Carte d’assurance maladie",
    number: "•••• 0312 87",
    expiry: "12/2027",
    color: "#0B6E78",
    ink: "#FFFFFF",
    fields: [
      ["Régime", "Agents publics"],
      ["Ayants droit", "2"],
      ["Droits ouverts jusqu’au", "31/12/2027"],
    ],
  },
  {
    id: "banque",
    issuer: "BGFIBank Gabon",
    title: "Carte bancaire",
    number: "•••• •••• •••• 2290",
    expiry: "09/2028",
    color: "#16170F",
    ink: "#FFFFFF",
    fields: [
      ["Type", "Visa Classic"],
      ["Agence", "Libreville — Bord de mer"],
      ["Expire le", "09/2028"],
    ],
  },
  {
    id: "electeur",
    issuer: "Centre gabonais des élections",
    title: "Carte d’électeur",
    number: "•••• 1045",
    expiry: "Permanente",
    color: "#F2C811",
    ink: "#16170F",
    fields: [
      ["Bureau de vote", "École publique de Glass, Libreville"],
      ["Circonscription", "1er arrondissement"],
      ["Inscrite le", "18/02/2023"],
    ],
  },
  {
    id: "consulaire",
    issuer: "Ambassade du Gabon en France",
    title: "Carte consulaire",
    number: "•••• 3381",
    expiry: "11/2027",
    color: "#5A3E8C",
    ink: "#FFFFFF",
    fields: [
      ["Poste", "Consulat général, Paris"],
      ["Délivrée le", "20/11/2022"],
      ["Expire le", "19/11/2027"],
    ],
  },
  {
    id: "fidelite",
    issuer: "Mbolo",
    title: "Carte de fidélité",
    number: "•••• 6604",
    expiry: "—",
    color: "#7A4B1E",
    ink: "#FFFFFF",
    fields: [
      ["Points", "2 340"],
      ["Magasin", "Mbolo, Libreville"],
      ["Statut", "Or"],
    ],
  },
]

function WalletCardFace({ card, large }: { card: WalletCard; large?: boolean }) {
  return (
    <span
      className={cx(styles.wcard, large && styles.wcardLarge)}
      style={{ background: card.color, color: card.ink }}
    >
      <span className={styles.wcardTop}>
        <span className={styles.wcardIssuer}>{card.issuer}</span>
        {card.id === "cni" ? <FlagBars /> : null}
      </span>
      <span className={styles.wcardTitle}>{card.title}</span>
      <span className={styles.wcardBottom}>
        <span>
          <span className={styles.wcardName}>AWA MBOUMBA</span>
          <span className={styles.wcardNumber}>{card.number}</span>
        </span>
        <span className={styles.wcardExpiry}>{card.expiry}</span>
      </span>
    </span>
  )
}

function ICarteScreen() {
  const [selected, setSelected] = useState<string | null>(null)
  const card = CARDS.find((c) => c.id === selected)
  const detailRef = useRef<HTMLHeadingElement>(null)

  function open(id: string) {
    setSelected(id)
    requestAnimationFrame(() => detailRef.current?.focus())
  }

  return (
    <div className={cx(styles.split, card && styles.splitOpen)}>
      <div className={styles.page}>
        <PageHead
          title="iCarte"
          subtitle="Ton portefeuille de cartes officielles et personnelles."
          action={
            <button type="button" className={styles.btnPrimary}>
              <Plus size={16} aria-hidden />
              Ajouter une carte
            </button>
          }
        />
        <ul className={styles.cardGrid}>
          {CARDS.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={styles.wcardBtn}
                aria-pressed={selected === c.id}
                onClick={() => open(c.id)}
              >
                <span className={styles.srOnly}>Voir le détail : </span>
                <WalletCardFace card={c} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {card ? (
        <aside className={styles.detail} aria-labelledby="icarte-detail">
          <div className={styles.cardHead}>
            <h2
              id="icarte-detail"
              ref={detailRef}
              tabIndex={-1}
              className={styles.cardTitle}
            >
              {card.title}
            </h2>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Fermer le détail"
              onClick={() => setSelected(null)}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <WalletCardFace card={card} large />
          <dl className={styles.dl}>
            {card.fields.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.qrBox}>
            <div
              className={styles.qr}
              role="img"
              aria-label={`QR code de présentation : ${card.title}`}
            >
              <QRCodeSVG
                value={`https://identite.ga/verifier/icarte/${card.id}-7Q3K`}
                size={144}
                bgColor="#FFFFFF"
                fgColor="#16170F"
                level="M"
              />
            </div>
            <p className={styles.qrText}>
              Présente ce QR code au guichet. Il est valable 5 minutes et ne
              révèle que les informations nécessaires.
            </p>
          </div>
        </aside>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 4. iBoîte                                                            */
/* ------------------------------------------------------------------ */

type AccountId = "perso" | "pro" | "asso"
type FolderId = "inbox" | "courriers" | "colis" | "sent" | "archive"

const ACCOUNTS: { id: AccountId; label: string; address: string }[] = [
  { id: "perso", label: "Personnel", address: "awa.mboumba@idn.ga" },
  { id: "pro", label: "Professionnel", address: "a.mboumba@sante.idn.ga" },
  { id: "asso", label: "Association", address: "femmes-ogooue@idn.ga" },
]

const FOLDERS: { id: FolderId; label: string; icon: LucideIcon }[] = [
  { id: "inbox", label: "Réception", icon: Inbox },
  { id: "courriers", label: "Courriers", icon: Mailbox },
  { id: "colis", label: "Colis", icon: Package },
  { id: "sent", label: "Envoyés", icon: Send },
  { id: "archive", label: "Archives", icon: Archive },
]

type Message = {
  id: string
  account: AccountId
  folder: FolderId
  from: string
  subject: string
  preview: string
  date: string
  unread?: boolean
  body: string[]
  attachment?: string
}

const MESSAGES: Message[] = [
  {
    id: "m1",
    account: "perso",
    folder: "inbox",
    from: "DGDI",
    subject: "Ton identité est vérifiée — Niveau 2",
    preview: "Ta demande de vérification a été approuvée par un agent…",
    date: "09:40",
    unread: true,
    body: [
      "Bonjour Awa,",
      "Ta demande de vérification d’identité a été approuvée. Ton compte est désormais au Niveau 2 · Substantiel.",
      "Pour accéder aux démarches qui exigent le Niveau 3, tu peux réserver un entretien vidéo avec un contrôleur depuis ton tableau de bord.",
      "Direction générale de la Documentation et de l’Immigration",
    ],
  },
  {
    id: "m2",
    account: "perso",
    folder: "inbox",
    from: "Gabon Connect",
    subject: "Bienvenue sur Gabon Connect",
    preview: "Ton compte est relié à ton identité numérique IDN…",
    date: "Hier",
    unread: true,
    body: [
      "Bonjour Awa,",
      "Ton compte Gabon Connect est maintenant relié à ton identité numérique. Tu peux gérer les données partagées depuis la page Consentements d’IDN.",
    ],
  },
  {
    id: "m3",
    account: "perso",
    folder: "inbox",
    from: "SEEG",
    subject: "Ta facture de septembre est disponible",
    preview: "Montant : 18 450 FCFA · échéance le 15 octobre…",
    date: "2 oct.",
    unread: true,
    body: [
      "Bonjour,",
      "Ta facture d’électricité et d’eau de septembre 2026 est disponible. Montant : 18 450 FCFA, à régler avant le 15 octobre.",
    ],
    attachment: "facture-seeg-2026-09.pdf",
  },
  {
    id: "m4",
    account: "perso",
    folder: "courriers",
    from: "CNAMGS",
    subject: "Attestation de droits — courrier numérisé",
    preview: "Courrier physique reçu au bureau Libreville-Centre…",
    date: "1 oct.",
    unread: true,
    body: [
      "Courrier physique reçu par La Poste gabonaise, bureau de Libreville-Centre, le 1er octobre 2026, puis numérisé à ta demande.",
      "L’original est conservé 30 jours au bureau de poste. Tu peux demander sa réexpédition à ton adresse de domicile.",
    ],
    attachment: "cnamgs-attestation-droits.pdf",
  },
  {
    id: "m5",
    account: "perso",
    folder: "colis",
    from: "La Poste gabonaise",
    subject: "Colis à retirer — bureau de Louis",
    preview: "Ton colis CP 2026 0918 GA est arrivé…",
    date: "30 sept.",
    body: [
      "Ton colis n° CP 2026 0918 GA est disponible au bureau de poste de Louis, Libreville, jusqu’au 14 octobre.",
      "Présente le QR code de ta carte d’identité dans iCarte au guichet pour le retirer.",
    ],
  },
  {
    id: "m6",
    account: "perso",
    folder: "sent",
    from: "Moi",
    subject: "Demande de rendez-vous — Mairie de Libreville",
    preview: "Bonjour, je souhaite obtenir une copie intégrale…",
    date: "25 sept.",
    body: [
      "Bonjour, je souhaite obtenir une copie intégrale de mon acte de naissance. Merci de m’indiquer les créneaux disponibles.",
    ],
  },
  {
    id: "m7",
    account: "pro",
    folder: "inbox",
    from: "Ministère de la Santé",
    subject: "Réunion de coordination e-santé",
    preview: "Ordre du jour de la réunion de lundi, salle B…",
    date: "08:15",
    unread: true,
    body: [
      "Bonjour à toutes et à tous,",
      "La réunion de coordination du programme e-santé se tiendra lundi à 9 h, salle B. Ordre du jour en pièce jointe.",
    ],
    attachment: "ordre-du-jour.pdf",
  },
  {
    id: "m8",
    account: "asso",
    folder: "inbox",
    from: "Mairie de Franceville",
    subject: "Subvention 2027 : dossier reçu",
    preview: "Nous accusons réception de votre dossier…",
    date: "28 sept.",
    body: [
      "Madame la présidente,",
      "Nous accusons réception du dossier de subvention de l’association Femmes de l’Ogooué pour l’exercice 2027.",
    ],
  },
]

function IBoiteScreen() {
  const [account, setAccount] = useState<AccountId>("perso")
  const [folder, setFolder] = useState<FolderId>("inbox")
  const [openId, setOpenId] = useState<string>("m1")
  const [read, setRead] = useState<string[]>([])

  const list = MESSAGES.filter((m) => m.account === account && m.folder === folder)
  const current = list.find((m) => m.id === openId) ?? list[0]
  const count = (f: FolderId) =>
    MESSAGES.filter(
      (m) => m.account === account && m.folder === f && m.unread && !read.includes(m.id)
    ).length

  function openMessage(id: string) {
    setOpenId(id)
    setRead((r) => (r.includes(id) ? r : [...r, id]))
  }

  return (
    <div className={styles.mail}>
      <div className={styles.mailNav}>
        <h1 className={styles.mailTitle}>iBoîte</h1>
        <p className={styles.monoLabel} id="mail-accounts">
          Comptes
        </p>
        <ul className={styles.mailList} aria-labelledby="mail-accounts">
          {ACCOUNTS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={styles.mailAccount}
                aria-pressed={account === a.id}
                onClick={() => {
                  setAccount(a.id)
                  setFolder("inbox")
                }}
              >
                <span className={styles.mailAccountLabel}>{a.label}</span>
                <span className={styles.mailAccountAddr}>{a.address}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.monoLabel} id="mail-folders">
          Dossiers
        </p>
        <ul className={styles.mailList} aria-labelledby="mail-folders">
          {FOLDERS.map(({ id, label, icon: Icon }) => {
            const n = count(id)
            return (
              <li key={id}>
                <button
                  type="button"
                  className={styles.mailFolder}
                  aria-pressed={folder === id}
                  onClick={() => setFolder(id)}
                >
                  <Icon size={16} aria-hidden />
                  <span className={styles.grow}>{label}</span>
                  {n > 0 ? (
                    <span className={styles.count}>
                      {n}
                      <span className={styles.srOnly}> non lus</span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={styles.mailMessages}>
        <h2 className={styles.mailColTitle}>
          {FOLDERS.find((f) => f.id === folder)?.label}
        </h2>
        {list.length === 0 ? (
          <p className={styles.empty}>Aucun message dans ce dossier.</p>
        ) : (
          <ul className={styles.mailList}>
            {list.map((m) => {
              const unread = m.unread && !read.includes(m.id)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={cx(styles.mailItem, unread && styles.mailUnread)}
                    aria-current={current?.id === m.id ? "true" : undefined}
                    onClick={() => openMessage(m.id)}
                  >
                    <span className={styles.mailItemTop}>
                      <span className={styles.mailFrom}>
                        {unread ? <span className={styles.srOnly}>Non lu : </span> : null}
                        {m.from}
                      </span>
                      <span className={styles.mailDate}>{m.date}</span>
                    </span>
                    <span className={styles.mailSubject}>{m.subject}</span>
                    <span className={styles.mailPreview}>{m.preview}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <article className={styles.mailRead} aria-label="Lecture du message">
        {current ? (
          <>
            {current.folder === "courriers" ? (
              <span className={cx(styles.badge, styles.badgeYellow)}>
                <Mailbox size={14} aria-hidden />
                Courrier physique numérisé
              </span>
            ) : null}
            {current.folder === "colis" ? (
              <span className={cx(styles.badge, styles.badgeBlue)}>
                <Package size={14} aria-hidden />
                Colis
              </span>
            ) : null}
            <h2 className={styles.mailReadSubject}>{current.subject}</h2>
            <p className={styles.mailReadMeta}>
              <strong>{current.from}</strong> · à{" "}
              {ACCOUNTS.find((a) => a.id === current.account)?.address} ·{" "}
              {current.date}
            </p>
            {current.folder === "colis" ? (
              <ol className={styles.track} aria-label="Suivi du colis">
                {["Expédié", "Arrivé à Libreville", "Disponible au bureau de Louis"].map(
                  (step) => (
                    <li key={step}>
                      <Check size={14} aria-hidden />
                      {step}
                    </li>
                  )
                )}
              </ol>
            ) : null}
            <div className={styles.mailBody}>
              {current.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            {current.attachment ? (
              <p className={styles.attachment}>
                <Paperclip size={16} aria-hidden />
                <span className={styles.mono}>{current.attachment}</span>
              </p>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={styles.btnSecondary}>
                <Reply size={16} aria-hidden />
                Répondre
              </button>
              <button type="button" className={styles.btnGhost}>
                <Archive size={16} aria-hidden />
                Archiver
              </button>
            </div>
          </>
        ) : (
          <p className={styles.empty}>Sélectionne un message.</p>
        )}
      </article>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 5. iDocument                                                         */
/* ------------------------------------------------------------------ */

type DocFolder =
  | "identite"
  | "etatcivil"
  | "domicile"
  | "diplomes"
  | "travail"
  | "sante"
  | "vehicule"
  | "autres"

const DOC_FOLDERS: { id: DocFolder; label: string; icon: LucideIcon }[] = [
  { id: "identite", label: "Identité", icon: IdCard },
  { id: "etatcivil", label: "État civil", icon: ScrollText },
  { id: "domicile", label: "Domicile", icon: House },
  { id: "diplomes", label: "Diplômes", icon: GraduationCap },
  { id: "travail", label: "Travail", icon: Briefcase },
  { id: "sante", label: "Santé", icon: HeartPulse },
  { id: "vehicule", label: "Véhicule", icon: Car },
  { id: "autres", label: "Autres", icon: Folder },
]

type Doc = { id: string; folder: DocFolder; name: string; meta: string; size: string; date: string }

const INITIAL_DOCS: Doc[] = [
  { id: "d1", folder: "identite", name: "Carte nationale d’identité", meta: "Recto/verso · OCR", size: "1,2 Mo", date: "14/03/2021" },
  { id: "d2", folder: "identite", name: "Passeport", meta: "OCR", size: "2,4 Mo", date: "08/01/2024" },
  { id: "d3", folder: "identite", name: "Photo d’identité", meta: "JPEG", size: "380 Ko", date: "02/09/2026" },
  { id: "d4", folder: "etatcivil", name: "Acte de naissance — Libreville", meta: "Acte officiel · vérifiable", size: "640 Ko", date: "18/04/2026" },
  { id: "d5", folder: "etatcivil", name: "Certificat de nationalité", meta: "OCR", size: "520 Ko", date: "11/06/2022" },
  { id: "d6", folder: "domicile", name: "Facture SEEG — septembre 2026", meta: "PDF", size: "210 Ko", date: "02/10/2026" },
  { id: "d7", folder: "diplomes", name: "Master Santé publique — UOB", meta: "OCR", size: "1,8 Mo", date: "15/07/2015" },
  { id: "d8", folder: "diplomes", name: "Baccalauréat série D", meta: "Recto/verso", size: "1,1 Mo", date: "10/07/2008" },
  { id: "d9", folder: "travail", name: "Contrat — Ministère de la Santé", meta: "PDF signé", size: "890 Ko", date: "01/02/2021" },
  { id: "d10", folder: "travail", name: "Bulletin de salaire — août 2026", meta: "PDF", size: "160 Ko", date: "31/08/2026" },
  { id: "d11", folder: "travail", name: "Attestation CNSS", meta: "OCR", size: "300 Ko", date: "12/05/2026" },
  { id: "d12", folder: "sante", name: "Attestation de droits CNAMGS", meta: "Courrier numérisé", size: "450 Ko", date: "01/10/2026" },
  { id: "d13", folder: "sante", name: "Carnet de vaccination", meta: "Recto/verso · OCR", size: "2,1 Mo", date: "20/03/2025" },
  { id: "d14", folder: "vehicule", name: "Carte grise — Toyota Hilux", meta: "Recto/verso", size: "990 Ko", date: "07/11/2023" },
]

function IDocScreen() {
  const [folder, setFolder] = useState<DocFolder>("identite")
  const [docs, setDocs] = useState(INITIAL_DOCS)
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const later = useTimers()
  const inputId = useId()

  const visible = docs.filter((d) => d.folder === folder)
  const folderLabel = DOC_FOLDERS.find((f) => f.id === folder)?.label ?? ""

  function upload(name: string | undefined) {
    if (!name) return
    setUploading(name)
    later(() => {
      setDocs((list) => [
        ...list,
        {
          id: `u${list.length + 1}`,
          folder,
          name,
          meta: "Chiffré · OCR terminé",
          size: "—",
          date: "04/10/2026",
        },
      ])
      setUploading(null)
    }, 1600)
  }

  return (
    <div className={styles.page}>
      <PageHead
        title="iDocument"
        subtitle="Ton coffre-fort de documents personnels."
        action={
          <span className={cx(styles.badge, styles.badgeGreen)}>
            <Lock size={14} aria-hidden />
            Chiffré de bout en bout
          </span>
        }
      />
      <ul className={styles.folderGrid} aria-label="Dossiers">
        {DOC_FOLDERS.map(({ id, label, icon: Icon }) => {
          const n = docs.filter((d) => d.folder === id).length
          return (
            <li key={id}>
              <button
                type="button"
                className={styles.folder}
                aria-pressed={folder === id}
                onClick={() => setFolder(id)}
              >
                <Icon size={18} aria-hidden />
                <span className={styles.folderLabel}>{label}</span>
                <span className={styles.folderCount}>
                  {n} document{n > 1 ? "s" : ""}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className={styles.docLayout}>
        <section className={styles.card} aria-labelledby="idoc-list">
          <h2 id="idoc-list" className={styles.cardTitle}>
            {folderLabel}
          </h2>
          {visible.length === 0 ? (
            <p className={styles.empty}>Aucun document dans ce dossier.</p>
          ) : (
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Documents du dossier {folderLabel}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Taille</th>
                  <th scope="col">Ajouté le</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className={styles.docName}>
                        <FileText size={16} aria-hidden />
                        <span>
                          <span className={styles.rowTitle}>{d.name}</span>
                          <span className={styles.rowMeta}>{d.meta}</span>
                        </span>
                      </span>
                    </td>
                    <td className={styles.mono}>{d.size}</td>
                    <td className={styles.mono}>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div
          className={cx(styles.drop, dragging && styles.dropActive)}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            upload(event.dataTransfer.files[0]?.name)
          }}
        >
          {uploading ? (
            <div className={styles.dropBody} role="status">
              <LottiePlayer
                animation="loader"
                loop
                label="Chiffrement et analyse du document"
                className={styles.lottieLoader}
              />
              <p className={styles.rowTitle}>Chiffrement de « {uploading} »…</p>
              <p className={styles.rowMeta}>Analyse OCR en cours sur ton appareil</p>
            </div>
          ) : (
            <div className={styles.dropBody}>
              <span className={styles.dropIcon} aria-hidden>
                <Upload size={20} />
              </span>
              <p className={styles.rowTitle}>Dépose un document ici</p>
              <p className={styles.rowMeta}>PDF, JPEG ou PNG · 10 Mo maximum</p>
              <input
                id={inputId}
                type="file"
                className={styles.srOnly}
                onChange={(event) => {
                  upload(event.target.files?.[0]?.name)
                  event.target.value = ""
                }}
              />
              <label htmlFor={inputId} className={styles.btnSecondary}>
                Parcourir mes fichiers
              </label>
              <p className={styles.rowMeta}>Ajout dans le dossier {folderLabel}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 6. iCV                                                               */
/* ------------------------------------------------------------------ */

const CV_THEMES = [
  { id: "sobre", label: "Sobre", accent: "var(--ink)" },
  { id: "institutionnel", label: "Institutionnel", accent: "var(--green-text)" },
  { id: "bleu", label: "Océan", accent: "var(--blue-text)" },
] as const

function ICvScreen() {
  const [theme, setTheme] = useState<(typeof CV_THEMES)[number]["id"]>("institutionnel")
  const [shared, setShared] = useState(false)
  const accent = CV_THEMES.find((t) => t.id === theme)!.accent

  return (
    <div className={styles.page}>
      <PageHead
        title="iCV"
        subtitle="Ton CV numérique, relié à tes diplômes vérifiés."
        action={
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShared(true)}
          >
            <Share2 size={16} aria-hidden />
            Partager le lien
          </button>
        }
      />
      <p className={styles.statusLine} aria-live="polite">
        {shared ? "Lien de partage créé : identite.ga/cv/awa-mboumba (valable 30 jours)" : ""}
      </p>
      <fieldset className={styles.themes}>
        <legend className={styles.monoLabel}>Thème</legend>
        {CV_THEMES.map((t) => (
          <label key={t.id} className={styles.themeOption}>
            <input
              type="radio"
              name="cv-theme"
              value={t.id}
              checked={theme === t.id}
              onChange={() => setTheme(t.id)}
            />
            <span className={styles.themeSwatch} style={{ background: t.accent }} aria-hidden />
            {t.label}
          </label>
        ))}
      </fieldset>
      <article className={styles.cv} style={{ ["--cv-accent" as string]: accent }}>
        <header className={styles.cvHead}>
          <div>
            <h2 className={styles.cvName}>Awa Mboumba</h2>
            <p className={styles.cvRole}>Cheffe de projet e-santé</p>
          </div>
          <ul className={styles.cvContact}>
            <li>
              <Mail size={14} aria-hidden /> {USER.email}
            </li>
            <li>
              <Phone size={14} aria-hidden /> {USER.phone}
            </li>
            <li>
              <MapPin size={14} aria-hidden /> Libreville, Gabon
            </li>
          </ul>
        </header>
        <div className={styles.cvBody}>
          <section>
            <h3 className={styles.cvSection}>Expérience</h3>
            <ul className={styles.cvItems}>
              <li>
                <strong>Ministère de la Santé</strong> — Cheffe de projet e-santé
                <span className={styles.rowMeta}>Depuis 2021 · Libreville</span>
              </li>
              <li>
                <strong>CNAMGS</strong> — Chargée d’études
                <span className={styles.rowMeta}>2016 – 2021 · Libreville</span>
              </li>
              <li>
                <strong>Hôpital régional de Franceville</strong> — Assistante
                de gestion
                <span className={styles.rowMeta}>2015 – 2016 · Franceville</span>
              </li>
            </ul>
          </section>
          <section>
            <h3 className={styles.cvSection}>Formation</h3>
            <ul className={styles.cvItems}>
              <li>
                <strong>Master Santé publique</strong> — Université Omar Bongo
                <span className={styles.verifiedLine}>
                  <BadgeCheck size={14} aria-hidden /> Diplôme vérifié (iDocument)
                </span>
              </li>
            </ul>
            <h3 className={styles.cvSection}>Compétences</h3>
            <ul className={styles.chips}>
              {["Pilotage de projet", "Systèmes d’information de santé", "Analyse de données", "Français · Anglais"].map((s) => (
                <li key={s} className={styles.chip}>
                  {s}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 7. Consentements                                                     */
/* ------------------------------------------------------------------ */

function ConsentsScreen({
  apps,
  onRevoke,
  onReset,
}: {
  apps: ConnectedApp[]
  onRevoke: (id: string) => void
  onReset: () => void
}) {
  const [pending, setPending] = useState<ConnectedApp | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  return (
    <div className={styles.page}>
      <PageHead
        title="Consentements"
        subtitle="Les applications qui accèdent à ton identité numérique, et les données que tu leur partages."
        headingRef={headingRef}
      />
      {apps.length === 0 ? (
        <div className={cx(styles.card, styles.emptyCard)}>
          <ShieldCheck size={24} aria-hidden />
          <p className={styles.rowTitle}>Aucune application connectée.</p>
          <p className={styles.muted}>
            Tes données ne sont partagées avec aucun service.
          </p>
          <button type="button" className={styles.btnSecondary} onClick={onReset}>
            Rétablir les données de démonstration
          </button>
        </div>
      ) : (
        <ul className={styles.appList}>
          {apps.map((app) => (
            <li key={app.id} className={cx(styles.card, styles.appCard)}>
              <span
                className={styles.appLogo}
                style={{ background: app.color }}
                aria-hidden
              >
                {app.initials}
              </span>
              <div className={styles.appMain}>
                <h2 className={styles.cardTitle}>{app.name}</h2>
                <p className={styles.rowMeta}>
                  {app.domain} · autorisée le {app.granted} · dernier accès{" "}
                  {app.lastUsed}
                </p>
                <ul className={styles.chips} aria-label={`Données partagées avec ${app.name}`}>
                  {app.scopes.map((s) => (
                    <li key={s} className={styles.chip}>
                      <Check size={12} aria-hidden />
                      {SCOPE_LABELS[s]}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className={styles.btnDangerOutline}
                onClick={() => setPending(app)}
              >
                Révoquer
                <span className={styles.srOnly}> l’accès de {app.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending ? (
        <ConfirmDialog
          title={`Révoquer l’accès de ${pending.name} ?`}
          description={`${pending.name} ne pourra plus lire tes données. Tu devras l’autoriser à nouveau pour utiliser ce service.`}
          confirmLabel="Révoquer l’accès"
          successLabel={`Accès de ${pending.name} révoqué`}
          onCancel={() => setPending(null)}
          onDone={() => {
            onRevoke(pending.id)
            setPending(null)
            requestAnimationFrame(() => headingRef.current?.focus())
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 8. Activité                                                          */
/* ------------------------------------------------------------------ */

const ACTIVITY: {
  id: string
  icon: LucideIcon
  title: string
  where: string
  when: string
}[] = [
  { id: "a1", icon: Fingerprint, title: "Connexion par passkey", where: "MacBook Air · Libreville", when: "Aujourd’hui, 09:12" },
  { id: "a2", icon: BadgeCheck, title: "Vérification approuvée — Niveau 2", where: "DGDI", when: "Aujourd’hui, 08:51" },
  { id: "a3", icon: ShieldCheck, title: "Accès accordé à Gabon Connect", where: "Libreville", when: "Hier, 18:40" },
  { id: "a4", icon: FileText, title: "Document ajouté : Facture SEEG", where: "iPhone 15 · Libreville", when: "2 oct., 12:03" },
  { id: "a5", icon: Mailbox, title: "Courrier numérisé reçu : CNAMGS", where: "La Poste gabonaise · Libreville-Centre", when: "1 oct., 10:20" },
  { id: "a6", icon: Smartphone, title: "Nouvel appareil : iPhone 15", where: "Port-Gentil", when: "27 sept., 21:04" },
  { id: "a7", icon: Share2, title: "Lien iCV consulté", where: "Franceville", when: "12 sept., 15:47" },
  { id: "a8", icon: KeyRound, title: "Code PIN modifié", where: "MacBook Air · Libreville", when: "14 juil., 08:30" },
]

function ActivityScreen() {
  return (
    <div className={styles.page}>
      <PageHead
        title="Journal d’activité"
        subtitle="Chaque connexion, partage et modification de ton compte, conservés 12 mois."
      />
      <section className={styles.card}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>Journal d’activité du compte</caption>
          <thead>
            <tr>
              <th scope="col">Événement</th>
              <th scope="col">Origine</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {ACTIVITY.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className={styles.docName}>
                    <row.icon size={16} aria-hidden />
                    <span className={styles.rowTitle}>{row.title}</span>
                  </span>
                </td>
                <td className={styles.muted}>{row.where}</td>
                <td className={styles.mono}>{row.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 9. Sécurité                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_SESSIONS = [
  { id: "s1", icon: Laptop, device: "MacBook Air · Safari", where: "Libreville", when: "Active maintenant", current: true },
  { id: "s2", icon: Smartphone, device: "iPhone 15 · App IDN", where: "Port-Gentil", when: "Il y a 3 h", current: false },
  { id: "s3", icon: Laptop, device: "PC Windows · Edge", where: "Franceville", when: "Il y a 6 jours", current: false },
]

function SettingsScreen() {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS)
  const [passkeys, setPasskeys] = useState([
    { id: "p1", label: "Touch ID — MacBook Air", added: "Ajoutée le 02/09/2026" },
    { id: "p2", label: "Face ID — iPhone 15", added: "Ajoutée le 27/09/2026" },
  ])
  const [enrolling, setEnrolling] = useState(false)
  const [status, setStatus] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const later = useTimers()

  function addPasskey() {
    setEnrolling(true)
    later(() => {
      setPasskeys((list) => [
        ...list,
        { id: `p${list.length + 1}`, label: "Clé de sécurité USB", added: "Ajoutée aujourd’hui" },
      ])
      setEnrolling(false)
      setStatus("Passkey ajoutée.")
    }, 1800)
  }

  return (
    <div className={styles.page}>
      <PageHead
        title="Sécurité"
        subtitle="Appareils, méthodes de connexion et protection de ton compte."
      />
      <p className={styles.statusLine} role="status">
        {status}
      </p>

      <section className={styles.card} aria-labelledby="sec-sessions">
        <h2 id="sec-sessions" className={styles.cardTitle}>
          Sessions actives
        </h2>
        <ul className={styles.rows}>
          {sessions.map((s) => (
            <li key={s.id} className={styles.row}>
              <span className={styles.rowIcon} aria-hidden>
                <s.icon size={16} />
              </span>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {s.device}
                  {s.current ? (
                    <span className={cx(styles.badge, styles.badgeGreen, styles.badgeInline)}>
                      Cet appareil
                    </span>
                  ) : null}
                </span>
                <span className={styles.rowMeta}>
                  {s.where} · {s.when}
                </span>
              </span>
              {s.current ? null : (
                <button
                  type="button"
                  className={styles.btnDangerOutline}
                  onClick={() => {
                    setSessions((list) => list.filter((x) => x.id !== s.id))
                    setStatus(`Session ${s.device} révoquée.`)
                  }}
                >
                  Révoquer<span className={styles.srOnly}> la session {s.device}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.card} aria-labelledby="sec-passkeys">
          <div className={styles.cardHead}>
            <h2 id="sec-passkeys" className={styles.cardTitle}>
              Passkeys
            </h2>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={addPasskey}
              disabled={enrolling}
            >
              <Plus size={16} aria-hidden />
              Ajouter
            </button>
          </div>
          {enrolling ? (
            <div className={styles.enroll}>
              <LottiePlayer
                animation="biometric"
                loop
                label="Enregistrement de la passkey"
                className={styles.lottieBioSm}
              />
              <p className={styles.muted}>Touche ta clé de sécurité…</p>
            </div>
          ) : null}
          <ul className={styles.rows}>
            {passkeys.map((p) => (
              <li key={p.id} className={styles.row}>
                <span className={styles.rowIcon} aria-hidden>
                  <Fingerprint size={16} />
                </span>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{p.label}</span>
                  <span className={styles.rowMeta}>{p.added}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card} aria-labelledby="sec-access">
          <h2 id="sec-access" className={styles.cardTitle}>
            Accès au compte
          </h2>
          <ul className={styles.rows}>
            <li className={styles.row}>
              <span className={styles.rowIcon} aria-hidden>
                <KeyRound size={16} />
              </span>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>Code PIN à 6 chiffres</span>
                <span className={styles.rowMeta}>Modifié le 14/07/2026</span>
              </span>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() =>
                  setStatus("Un code de confirmation a été envoyé au +241 77 •• •• 56.")
                }
              >
                Modifier<span className={styles.srOnly}> le code PIN</span>
              </button>
            </li>
            <li className={styles.row}>
              <span className={styles.rowIcon} aria-hidden>
                <Phone size={16} />
              </span>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>{USER.phone}</span>
                <span className={styles.rowMeta}>Téléphone vérifié</span>
              </span>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() =>
                  setStatus("Pour changer de numéro, confirme d’abord avec ta passkey.")
                }
              >
                Changer<span className={styles.srOnly}> de numéro</span>
              </button>
            </li>
            <li className={styles.row}>
              <span className={styles.rowIcon} aria-hidden>
                <User size={16} />
              </span>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>{USER.email}</span>
                <span className={styles.rowMeta}>Identifiant de connexion</span>
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section className={styles.danger} aria-labelledby="sec-danger">
        <div>
          <h2 id="sec-danger" className={styles.dangerTitle}>
            Supprimer mon identité numérique
          </h2>
          <p className={styles.muted}>
            Tes cartes, documents et messages seront effacés après un délai de
            30 jours. Les actes officiels restent conservés par
            l’administration émettrice.
          </p>
        </div>
        <button
          type="button"
          className={styles.btnDanger}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={16} aria-hidden />
          Supprimer mon compte
        </button>
      </section>

      {confirmDelete ? (
        <ConfirmDialog
          title="Supprimer ton identité numérique ?"
          description="Ton compte sera désactivé immédiatement puis supprimé le 3 novembre 2026. Tu peux annuler la demande d’ici là en te reconnectant."
          confirmLabel="Supprimer mon compte"
          successLabel="Suppression planifiée le 3 novembre 2026"
          onCancel={() => setConfirmDelete(false)}
          onDone={() => {
            setConfirmDelete(false)
            setStatus("Demande de suppression enregistrée. Tu peux l’annuler jusqu’au 3 novembre 2026.")
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 10. Autorisation OAuth                                               */
/* ------------------------------------------------------------------ */

const OAUTH_DATA: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: User, title: "Profil", detail: "Nom, prénom, date et lieu de naissance" },
  { icon: IdCard, title: "NIP", detail: "Numéro d’identification personnel" },
  { icon: Mail, title: "Adresse @idn.ga", detail: USER.email },
  { icon: BadgeCheck, title: "Niveau de garantie", detail: "Niveau 2 · Substantiel" },
]

function OAuthScreen({ onGranted }: { onGranted: () => void }) {
  const [state, setState] = useState<"ask" | "pending" | "granted" | "denied">("ask")
  const later = useTimers()

  function allow() {
    setState("pending")
    later(() => {
      setState("granted")
      onGranted()
    }, 900)
  }

  return (
    <div className={styles.centerPage}>
      <div className={cx(styles.card, styles.oauthCard)}>
        <div className={styles.oauthLogos} aria-hidden>
          <span className={styles.appLogo} style={{ background: "#2563AC" }}>
            GC
          </span>
          <span className={styles.oauthDots} />
          <IdnMark size={44} />
        </div>

        {state === "ask" || state === "pending" ? (
          <>
            <h1 className={styles.oauthTitle}>
              Gabon Connect souhaite accéder à ton identité numérique
            </h1>
            <p className={styles.oauthDomain}>
              <span className={styles.mono}>gabonconnect.ga</span>
              <span className={cx(styles.badge, styles.badgeGreen)}>
                <ShieldCheck size={14} aria-hidden />
                Partenaire vérifié
              </span>
            </p>
            <div className={styles.oauthUser}>
              <Avatar size="sm" />
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>Awa Mboumba</span>
                <span className={styles.rowMeta}>{USER.email}</span>
              </span>
              <LevelBadge level={2} />
            </div>
            <h2 className={styles.monoLabel}>Données partagées</h2>
            <ul className={styles.rows}>
              {OAUTH_DATA.map(({ icon: Icon, title, detail }) => (
                <li key={title} className={styles.row}>
                  <span className={styles.rowIcon} aria-hidden>
                    <Icon size={16} />
                  </span>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{title}</span>
                    <span className={styles.rowMeta}>{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.oauthNote}>
              Tu peux retirer cet accès à tout moment depuis la page
              Consentements de ton espace IDN.
            </p>
            {state === "pending" ? (
              <div className={styles.inlineWait} role="status">
                <LottiePlayer
                  animation="loader"
                  loop
                  label="Autorisation en cours"
                  className={styles.lottieLoaderSm}
                />
                Autorisation en cours…
              </div>
            ) : (
              <div className={styles.oauthActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setState("denied")}
                >
                  Refuser
                </button>
                <button type="button" className={styles.btnPrimary} onClick={allow}>
                  Autoriser
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.oauthResult} role="status">
            {state === "granted" ? (
              <>
                <LottiePlayer
                  animation="success"
                  label="Accès accordé"
                  className={styles.lottieSuccess}
                />
                <h1 className={styles.oauthTitle}>Accès accordé</h1>
                <p className={styles.muted}>Redirection vers gabonconnect.ga…</p>
              </>
            ) : (
              <>
                <span className={styles.deniedIcon} aria-hidden>
                  <CircleX size={32} />
                </span>
                <h1 className={styles.oauthTitle}>Accès refusé</h1>
                <p className={styles.muted}>
                  Gabon Connect n’a reçu aucune donnée.
                </p>
              </>
            )}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => setState("ask")}
            >
              Rejouer la démonstration
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 11. Vérificateur public d'actes                                      */
/* ------------------------------------------------------------------ */

const KNOWN_ACT = "ACT-2026-0418-7Q3K"

function VerifierScreen({ onHome }: { onHome: () => void }) {
  const [code, setCode] = useState(KNOWN_ACT)
  const [state, setState] = useState<"idle" | "scan" | "pending" | "valid" | "unknown">("idle")
  const [error, setError] = useState("")
  const later = useTimers()
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()

  function verify(value: string) {
    const normalized = value.trim().toUpperCase()
    if (!/^ACT-\d{4}-\d{4}-[A-Z0-9]{4}$/.test(normalized)) {
      setError("Format attendu : ACT-AAAA-MMJJ-XXXX.")
      return
    }
    setError("")
    setCode(normalized)
    setState("pending")
    later(() => setState(normalized === KNOWN_ACT ? "valid" : "unknown"), 1300)
  }

  function scan() {
    setError("")
    setState("scan")
    later(() => verify(KNOWN_ACT), 1800)
  }

  return (
    <div className={styles.publicPage}>
      <header className={styles.publicHeader}>
        <button type="button" className={styles.publicBrand} onClick={onHome}>
          <IdnMark size={28} />
          <span className={styles.brandText}>Identité Numérique</span>
        </button>
        <span className={styles.monoLabel}>Vérificateur d’actes officiels</span>
      </header>
      <div className={styles.verifier}>
        {state === "idle" ? (
          <>
            <FlagBars />
            <h1 className={styles.verifierTitle}>Vérifier un acte officiel</h1>
            <p className={styles.muted}>
              Saisis le code imprimé sur l’acte pour confirmer qu’il a bien été
              émis par une administration gabonaise et qu’il n’a pas été modifié.
            </p>
            <form
              className={styles.form}
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                verify(code)
              }}
            >
              <div className={styles.field}>
                <label htmlFor={inputId} className={styles.label}>
                  Code de l’acte
                </label>
                <input
                  id={inputId}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={KNOWN_ACT}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                  className={cx(styles.input, styles.inputMono)}
                />
                <p id={hintId} className={styles.hint}>
                  Le code figure en bas de l’acte, sous le QR code.
                </p>
                {error ? (
                  <p id={errorId} className={styles.error}>
                    {error}
                  </p>
                ) : null}
              </div>
              <div className={styles.actions}>
                <button type="submit" className={styles.btnPrimary}>
                  Vérifier
                </button>
                <button type="button" className={styles.btnSecondary} onClick={scan}>
                  <ScanLine size={16} aria-hidden />
                  Scanner le QR code
                </button>
              </div>
            </form>
          </>
        ) : null}

        {state === "scan" || state === "pending" ? (
          <div className={styles.verifierWait} role="status">
            {state === "scan" ? (
              <LottiePlayer
                animation="scan"
                loop
                label="Lecture du QR code"
                className={styles.lottieScan}
              />
            ) : (
              <LottiePlayer
                animation="loader"
                loop
                label="Vérification en cours"
                className={styles.lottieLoader}
              />
            )}
            <p className={styles.rowTitle}>
              {state === "scan" ? "Place le QR code dans le cadre…" : "Vérification de la signature…"}
            </p>
            {state === "pending" ? <p className={styles.mono}>{code}</p> : null}
          </div>
        ) : null}

        {state === "valid" ? (
          <div className={styles.verifierResult} role="status">
            <LottiePlayer
              animation="shield"
              label="Acte authentique"
              replayable
              className={styles.lottieShield}
            />
            <h1 className={styles.verifierTitle}>Acte authentique</h1>
            <p className={styles.muted}>
              Cet acte a été émis et signé électroniquement par l’administration
              ci-dessous. Son contenu n’a pas été modifié.
            </p>
            <dl className={styles.dl}>
              <div>
                <dt>Code</dt>
                <dd className={styles.mono}>{KNOWN_ACT}</dd>
              </div>
              <div>
                <dt>Type d’acte</dt>
                <dd>Extrait d’acte de naissance</dd>
              </div>
              <div>
                <dt>Émetteur</dt>
                <dd>
                  <Building2 size={14} aria-hidden /> Mairie du 1er
                  arrondissement de Libreville
                </dd>
              </div>
              <div>
                <dt>Date d’émission</dt>
                <dd>18 avril 2026</dd>
              </div>
              <div>
                <dt>Titulaire</dt>
                <dd>A. M•••••••</dd>
              </div>
              <div>
                <dt>Empreinte SHA-256</dt>
                <dd className={cx(styles.mono, styles.hash)}>
                  9f3c 7a1e 44b0 d2c8 51e6 0a9b 3f17 c4d2
                </dd>
              </div>
            </dl>
            <button type="button" className={styles.btnSecondary} onClick={() => setState("idle")}>
              Vérifier un autre acte
            </button>
          </div>
        ) : null}

        {state === "unknown" ? (
          <div className={styles.verifierResult} role="status">
            <span className={styles.deniedIcon} aria-hidden>
              <CircleX size={32} />
            </span>
            <h1 className={styles.verifierTitle}>Aucun acte ne correspond</h1>
            <p className={styles.muted}>
              Le code <span className={styles.mono}>{code}</span> n’existe pas
              dans les registres. Vérifie la saisie ou adresse-toi à
              l’administration émettrice.
            </p>
            <button type="button" className={styles.btnSecondary} onClick={() => setState("idle")}>
              Saisir un autre code
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */

export function WebPrototype() {
  const [screen, setScreen] = useState<ScreenId>("signin")
  const [dark, setDark] = useState(false)
  const [apps, setApps] = useState(INITIAL_APPS)

  const current = SCREENS.find((s) => s.id === screen)!
  const inApp = screen !== "signin" && screen !== "oauth" && screen !== "verifier"

  function grantGabonConnect() {
    setApps((list) =>
      list.some((a) => a.id === "gabon-connect")
        ? list
        : [{ ...INITIAL_APPS[0]!, granted: "4 octobre 2026", lastUsed: "à l’instant" }, ...list]
    )
  }

  function renderScreen() {
    switch (screen) {
      case "dashboard":
        return <DashboardScreen onNavigate={setScreen} />
      case "icarte":
        return <ICarteScreen />
      case "iboite":
        return <IBoiteScreen />
      case "idoc":
        return <IDocScreen />
      case "icv":
        return <ICvScreen />
      case "consents":
        return (
          <ConsentsScreen
            apps={apps}
            onRevoke={(id) => setApps((list) => list.filter((a) => a.id !== id))}
            onReset={() => setApps(INITIAL_APPS)}
          />
        )
      case "activity":
        return <ActivityScreen />
      case "settings":
        return <SettingsScreen />
      default:
        return null
    }
  }

  return (
    <div className={styles.root} data-theme={dark ? "dark" : "light"}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Écrans de la maquette web">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.tab}
              aria-current={screen === s.id ? "page" : undefined}
              onClick={() => setScreen(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          className={styles.themeSwitch}
          onClick={() => setDark((d) => !d)}
        >
          {dark ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
          Thème sombre
          <span className={styles.switchTrack} aria-hidden>
            <span className={styles.switchThumb} />
          </span>
        </button>
      </div>

      <section className={styles.frame} aria-label="Maquette de l'application web IDN">
        <div className={styles.chrome}>
          <span className={styles.dots} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <div className={styles.address}>
            <Lock size={12} aria-hidden />
            <span className={styles.srOnly}>Adresse : </span>
            <span className={styles.addressText}>
              <span className={styles.addressHost}>identite.ga/</span>
              {current.path}
            </span>
          </div>
        </div>
        <div className={styles.viewport}>
          {screen === "signin" ? (
            <SignInScreen
              onSignedIn={() => setScreen("dashboard")}
              onVerifier={() => setScreen("verifier")}
            />
          ) : null}
          {screen === "oauth" ? <OAuthScreen onGranted={grantGabonConnect} /> : null}
          {screen === "verifier" ? (
            <VerifierScreen onHome={() => setScreen("signin")} />
          ) : null}
          {inApp ? (
            <AppShell screen={screen} onNavigate={setScreen}>
              {renderScreen()}
            </AppShell>
          ) : null}
        </div>
      </section>
    </div>
  )
}
