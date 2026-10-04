"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  Bell,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarPlus,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  CreditCard,
  Delete,
  Eye,
  EyeOff,
  FileText,
  FileUser,
  Folder,
  GraduationCap,
  Hash,
  HeartPulse,
  House,
  IdCard,
  Inbox,
  KeyRound,
  Landmark,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Mailbox,
  MapPin,
  Mic,
  MicOff,
  Package,
  PenLine,
  PhoneOff,
  Plane,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScanFace,
  ScanLine,
  ScrollText,
  Share2,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Truck,
  User,
  UserRound,
  Users,
  Video,
  VideoOff,
  WalletCards,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react"

import { IdnMark } from "@repo/ui/components/idn-mark"

import { LottiePlayer } from "./lottie-player"
import s from "./mobile-prototype.module.css"

// ─── Données de la maquette (personnage fictif partagé avec le prototype web) ───

const USER = {
  firstName: "Awa",
  lastName: "Mboumba",
  initials: "AM",
  birth: "12/03/1990",
  birthPlace: "Libreville",
  nip: "1990 0312 0045 87",
  nipMasked: "•••• •••• 0045 87",
  email: "awa.mboumba@idn.ga",
  phone: "+241 77 12 34 56",
}

type ScreenId =
  | "splash"
  | "welcome"
  | "login"
  | "signup-email"
  | "signup-otp"
  | "signup-pin"
  | "signup-address"
  | "signup-done"
  | "home"
  | "idcard"
  | "kyc"
  | "l3-intro"
  | "l3-slot"
  | "l3-confirm"
  | "l3-waiting"
  | "l3-call"
  | "l3-result"
  | "consent"
  | "icarte"
  | "iboite"
  | "idoc"
  | "icv"
  | "scanner"
  | "notifs"
  | "security"

const NAV_GROUPS: { title: string; items: { id: ScreenId; label: string }[] }[] = [
  {
    title: "Accès",
    items: [
      { id: "splash", label: "Lancement" },
      { id: "welcome", label: "Bienvenue et profil" },
      { id: "login", label: "Connexion PIN et Face ID" },
      { id: "signup-email", label: "Inscription · e-mail" },
      { id: "signup-otp", label: "Inscription · code reçu" },
      { id: "signup-pin", label: "Inscription · code PIN" },
      { id: "signup-address", label: "Inscription · adresse @idn.ga" },
      { id: "signup-done", label: "Inscription · compte créé" },
    ],
  },
  {
    title: "Identité",
    items: [
      { id: "home", label: "Accueil" },
      { id: "idcard", label: "Carte d'identité" },
      { id: "kyc", label: "Vérification d'identité" },
      { id: "l3-intro", label: "Niveau 3 · présentation" },
      { id: "l3-slot", label: "Niveau 3 · créneau" },
      { id: "l3-confirm", label: "Niveau 3 · confirmation" },
      { id: "l3-waiting", label: "Niveau 3 · salle d'attente" },
      { id: "l3-call", label: "Niveau 3 · visio" },
      { id: "l3-result", label: "Niveau 3 · résultat" },
      { id: "consent", label: "Consentement Gabon Connect" },
    ],
  },
  {
    title: "Services",
    items: [
      { id: "icarte", label: "iCarte" },
      { id: "iboite", label: "iBoîte" },
      { id: "idoc", label: "iDocument" },
      { id: "icv", label: "iCV" },
      { id: "scanner", label: "Scanner d'acte" },
    ],
  },
  {
    title: "Compte",
    items: [
      { id: "notifs", label: "Notifications" },
      { id: "security", label: "Sécurité et profil" },
    ],
  },
]

const TABS: { id: ScreenId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Accueil", icon: House },
  { id: "icarte", label: "iCarte", icon: WalletCards },
  { id: "iboite", label: "iBoîte", icon: Mailbox },
  { id: "security", label: "Profil", icon: UserRound },
]

// Écrans qui affichent la barre d'onglets, et l'onglet qu'ils activent.
const TAB_OF: Partial<Record<ScreenId, ScreenId>> = {
  home: "home",
  idoc: "home",
  notifs: "home",
  icarte: "icarte",
  iboite: "iboite",
  security: "security",
}

// État partagé entre écrans : niveau de garantie et saisies des parcours en plusieurs écrans.
type Demo = {
  level: 2 | 3
  signupEmail: string
  idnAddress: string
  slot: { day: number; time: string }
}

const DEMO_START: Demo = {
  level: 2,
  signupEmail: "awa.mboumba@gmail.com",
  idnAddress: "awa.mboumba",
  slot: { day: 0, time: "11:00" },
}

type ScreenProps = {
  go: (screen: ScreenId) => void
  notify: (message: string) => void
  demo: Demo
  update: (patch: Partial<Demo>) => void
}

// ─── Composant principal ───

export function MobilePrototype() {
  const [screen, setScreen] = useState<ScreenId>("splash")
  // Incrémenté à chaque navigation : remonte l'écran (rejoue le lancement, réinitialise les parcours).
  const [visit, setVisit] = useState(0)
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [demo, setDemo] = useState<Demo>(DEMO_START)

  const go = useCallback((next: ScreenId) => {
    setScreen(next)
    setVisit((v) => v + 1)
  }, [])

  const notify = useCallback((message: string) => setToast(message), [])

  const update = useCallback((patch: Partial<Demo>) => setDemo((d) => ({ ...d, ...patch })), [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(timer)
  }, [toast])

  const activeTab = TAB_OF[screen]

  return (
    <div className={s.root}>
      <aside className={s.sidebar}>
        <nav aria-label="Écrans de la maquette mobile" className={s.nav}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className={s.navGroup}>
              <p className={s.navTitle} id={`nav-${group.title}`}>
                {group.title}
              </p>
              <ul className={s.navList} aria-labelledby={`nav-${group.title}`}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={s.navItem}
                      aria-current={screen === item.id ? "true" : undefined}
                      onClick={() => go(item.id)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={s.themeSwitch} role="group" aria-label="Thème du téléphone">
          <button type="button" aria-pressed={!dark} onClick={() => setDark(false)}>
            Clair
          </button>
          <button type="button" aria-pressed={dark} onClick={() => setDark(true)}>
            Sombre
          </button>
        </div>
      </aside>

      <div className={s.stage}>
        <div className={s.phoneSlot}>
          <div
            className={`${s.phone} ${dark ? s.dark : ""}`}
            role="region"
            aria-label="Maquette de l'application mobile IDN"
          >
            <StatusBar />
            <div className={s.viewport}>
              <div key={`${screen}-${visit}`} className={s.screenSlot}>
                <ScreenView screen={screen} go={go} notify={notify} demo={demo} update={update} />
              </div>
            </div>
            {activeTab ? <TabBar active={activeTab} go={go} /> : null}
            <div className={s.toastRegion} aria-live="polite">
              {toast ? <p className={s.toast}>{toast}</p> : null}
            </div>
            <span className={s.homeIndicator} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  )
}

function ScreenView({ screen, ...props }: ScreenProps & { screen: ScreenId }) {
  switch (screen) {
    case "splash":
      return <SplashScreen {...props} />
    case "welcome":
      return <WelcomeScreen {...props} />
    case "login":
      return <LoginScreen {...props} />
    case "signup-email":
      return <SignupEmailScreen {...props} />
    case "signup-otp":
      return <SignupOtpScreen {...props} />
    case "signup-pin":
      return <SignupPinScreen {...props} />
    case "signup-address":
      return <SignupAddressScreen {...props} />
    case "signup-done":
      return <SignupDoneScreen {...props} />
    case "home":
      return <HomeScreen {...props} />
    case "idcard":
      return <IdCardScreen {...props} />
    case "kyc":
      return <KycScreen {...props} />
    case "l3-intro":
      return <L3IntroScreen {...props} />
    case "l3-slot":
      return <L3SlotScreen {...props} />
    case "l3-confirm":
      return <L3ConfirmScreen {...props} />
    case "l3-waiting":
      return <L3WaitingScreen {...props} />
    case "l3-call":
      return <L3CallScreen {...props} />
    case "l3-result":
      return <L3ResultScreen {...props} />
    case "icv":
      return <ICvScreen {...props} />
    case "consent":
      return <ConsentScreen {...props} />
    case "icarte":
      return <ICarteScreen {...props} />
    case "iboite":
      return <IBoiteScreen {...props} />
    case "idoc":
      return <IDocumentScreen {...props} />
    case "scanner":
      return <ScannerScreen {...props} />
    case "notifs":
      return <NotificationsScreen {...props} />
    case "security":
      return <SecurityScreen {...props} />
  }
}

// ─── Habillage du téléphone ───

function StatusBar() {
  return (
    <div className={s.statusBar} aria-hidden>
      <span className={s.statusTime}>9:41</span>
      <span className={s.island} />
      <span className={s.statusIcons}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.7" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.7" />
          <rect x="10" y="3" width="3" height="9" rx="0.7" />
          <rect x="15" y="0" width="3" height="12" rx="0.7" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M1.5 4.2a9.5 9.5 0 0 1 13 0" />
          <path d="M4 7a5.8 5.8 0 0 1 8 0" />
          <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.5" />
          <rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor" />
          <rect x="23.5" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  )
}

function TabBar({ active, go }: { active: ScreenId; go: (screen: ScreenId) => void }) {
  return (
    <nav className={s.tabBar} aria-label="Navigation principale de l'application">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const current = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            className={s.tab}
            aria-current={current ? "page" : undefined}
            onClick={() => go(tab.id)}
          >
            <Icon size={22} strokeWidth={current ? 2.2 : 1.8} aria-hidden />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Éléments partagés ───

function FlagBars({ className }: { className?: string }) {
  return (
    <span className={`${s.flag} ${className ?? ""}`} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  )
}

function AppBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className={s.appBar}>
      {onBack ? (
        <button type="button" className={s.backButton} onClick={onBack} aria-label="Retour">
          <ChevronLeft size={22} aria-hidden />
        </button>
      ) : (
        <span className={s.appBarSpacer} />
      )}
      <h1 className={s.appBarTitle}>{title}</h1>
      {right ?? <span className={s.appBarSpacer} />}
    </header>
  )
}

const LEVELS = {
  1: { label: "Niveau 1 · Faible", className: s.level1 },
  2: { label: "Niveau 2 · Substantiel", className: s.level2 },
  3: { label: "Niveau 3 · Élevé", className: s.level3 },
} as const

function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className={`${s.badge} ${LEVELS[level].className}`}>
      <ShieldCheck size={13} aria-hidden />
      {LEVELS[level].label}
    </span>
  )
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={s.sectionHead}>
      <h2 className={s.sectionTitle}>{children}</h2>
      {aside}
    </div>
  )
}

function Row({
  icon: Icon,
  title,
  sub,
  right,
  onClick,
  tone = "neutral",
  strong,
}: {
  icon: LucideIcon
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  onClick?: () => void
  tone?: "neutral" | "green" | "blue" | "yellow" | "red"
  strong?: boolean
}) {
  const content = (
    <>
      <span className={`${s.rowIcon} ${s[`tone_${tone}`]}`} aria-hidden>
        <Icon size={18} />
      </span>
      <span className={s.rowText}>
        <span className={`${s.rowTitle} ${strong ? s.rowStrong : ""}`}>{title}</span>
        {sub ? <span className={s.rowSub}>{sub}</span> : null}
      </span>
      {right}
    </>
  )
  return onClick ? (
    <button type="button" className={s.row} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={s.row}>{content}</div>
  )
}

function Chevron() {
  return <ChevronRight size={18} className={s.chevron} aria-hidden />
}

// ─── 1. Lancement ───

function SplashScreen({ go }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => go("welcome"), 2600)
    return () => clearTimeout(timer)
  }, [go])

  return (
    <div className={s.splash} onClick={() => go("welcome")}>
      <LottiePlayer animation="logo" label="Apparition du logo IDN" className={s.lottieSplash} />
      <p className={s.splashTitle}>Identité Numérique</p>
      <p className={s.splashSub}>République gabonaise</p>
      <FlagBars className={s.splashFlag} />
      <button type="button" className={s.splashSkip} onClick={() => go("welcome")}>
        Passer
      </button>
    </div>
  )
}

// ─── 2. Bienvenue et choix du profil ───

const PROFILES = [
  { id: "citoyen", label: "Citoyen gabonais", sub: "CNI ou acte de naissance", icon: IdCard },
  { id: "resident", label: "Résident", sub: "Carte de séjour et passeport", icon: House },
  { id: "visiteur", label: "Visiteur", sub: "Passeport et visa", icon: Plane },
]

function WelcomeScreen({ go }: ScreenProps) {
  const [profile, setProfile] = useState("citoyen")

  return (
    <div className={s.screen}>
      <div className={s.body}>
        <div className={s.brandRow}>
          <IdnMark size={40} />
          <div>
            <p className={s.eyebrow}>République gabonaise</p>
            <p className={s.brandName}>Identité Numérique</p>
          </div>
        </div>
        <h1 className={s.display}>
          Ton identité, reconnue par l&apos;État, <span className={s.greenText}>dans ta poche.</span>
        </h1>
        <p className={s.lead}>
          Un seul compte pour te connecter aux services publics, présenter ta carte et recevoir tes courriers
          officiels.
        </p>

        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Choisis ton profil</legend>
          {PROFILES.map((p) => {
            const Icon = p.icon
            return (
              <label key={p.id} className={s.choice}>
                <input
                  type="radio"
                  name="profil"
                  value={p.id}
                  checked={profile === p.id}
                  onChange={() => setProfile(p.id)}
                  className={s.choiceInput}
                />
                <span className={s.choiceIcon} aria-hidden>
                  <Icon size={20} />
                </span>
                <span className={s.rowText}>
                  <span className={s.rowTitle}>{p.label}</span>
                  <span className={s.rowSub}>{p.sub}</span>
                </span>
                <span className={s.radioMark} aria-hidden />
              </label>
            )
          })}
        </fieldset>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => go("signup-email")}>
          Créer mon compte
        </button>
        <button type="button" className={s.ghost} onClick={() => go("login")}>
          J&apos;ai déjà un compte
        </button>
      </div>
    </div>
  )
}

// ─── 3. Connexion PIN et Face ID ───

function LoginScreen({ go, notify }: ScreenProps) {
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<"idle" | "verifying" | "biometric">("idle")

  useEffect(() => {
    if (status === "idle") return
    const timer = setTimeout(() => go("home"), status === "biometric" ? 1800 : 1400)
    return () => clearTimeout(timer)
  }, [status, go])

  const press = (digit: string) => {
    if (status !== "idle" || pin.length >= 6) return
    const next = pin + digit
    setPin(next)
    // Maquette : tout code à 6 chiffres est accepté.
    if (next.length === 6) setStatus("verifying")
  }

  if (status !== "idle") {
    const biometric = status === "biometric"
    return (
      <div className={`${s.screen} ${s.centered}`}>
        <LottiePlayer
          animation={biometric ? "biometric" : "loader"}
          label={biometric ? "Reconnaissance faciale en cours" : "Vérification du code en cours"}
          loop
          className={biometric ? s.lottieLarge : s.lottieMedium}
        />
        <p className={s.stateTitle}>{biometric ? "Regarde ton téléphone" : "Vérification…"}</p>
        <p className={s.stateText}>
          {biometric ? "Face ID confirme que c'est bien toi." : "Ton code est vérifié sur cet appareil."}
        </p>
      </div>
    )
  }

  return (
    <div className={s.screen}>
      <div className={s.loginTop}>
        <span className={`${s.avatar} ${s.avatarLarge}`} aria-hidden>
          {USER.initials}
        </span>
        <h1 className={s.title}>Bon retour, Awa</h1>
        <p className={s.stateText}>Saisis ton code PIN à 6 chiffres</p>
        <div className={s.pinDots} aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i < pin.length ? s.pinDotFilled : s.pinDot} />
          ))}
        </div>
        <p className={s.srOnly} aria-live="polite">
          {pin.length} chiffre{pin.length > 1 ? "s" : ""} saisi{pin.length > 1 ? "s" : ""} sur 6
        </p>
      </div>
      <div className={s.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={s.key} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={`${s.key} ${s.keyAlt}`}
          onClick={() => setStatus("biometric")}
          aria-label="Se connecter avec Face ID"
        >
          <ScanFace size={26} aria-hidden />
        </button>
        <button type="button" className={s.key} onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          className={`${s.key} ${s.keyAlt}`}
          onClick={() => setPin((p) => p.slice(0, -1))}
          aria-label="Effacer le dernier chiffre"
          disabled={pin.length === 0}
        >
          <Delete size={24} aria-hidden />
        </button>
      </div>
      <div className={s.footerCompact}>
        <button
          type="button"
          className={s.link}
          onClick={() => notify("Récupération du PIN : un code est envoyé au +241 77 •• •• 56.")}
        >
          Code PIN oublié ?
        </button>
      </div>
    </div>
  )
}

// ─── 3 bis. Inscription ───

const SIGNUP_STEPS = ["E-mail", "Code", "PIN", "Adresse"]

function Stepper({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <ol className={s.stepper} aria-label={label}>
      {steps.map((step, i) => (
        <li
          key={step}
          className={i < current ? s.stepDone : i === current ? s.stepCurrent : s.step}
          aria-current={i === current ? "step" : undefined}
        >
          <span className={s.stepBar} aria-hidden />
          {step}
        </li>
      ))}
    </ol>
  )
}

function SignupEmailScreen({ go, demo, update }: ScreenProps) {
  const [email, setEmail] = useState(demo.signupEmail)
  const [error, setError] = useState(false)

  const submit = () => {
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError(true)
      return
    }
    update({ signupEmail: value })
    go("signup-otp")
  }

  return (
    <form
      className={s.screen}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <AppBar title="Créer mon compte" onBack={() => go("welcome")} />
      <Stepper steps={SIGNUP_STEPS} current={0} label="Étapes de l'inscription" />
      <div className={s.body}>
        <h2 className={s.title}>Ton adresse e-mail</h2>
        <p className={s.stateText}>Nous y envoyons un code à 6 chiffres pour confirmer qu&apos;elle t&apos;appartient.</p>
        <div className={s.field}>
          <label htmlFor="signup-email" className={s.label}>
            Adresse e-mail
          </label>
          <input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={s.input}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(false)
            }}
            aria-invalid={error}
            aria-describedby={error ? "signup-email-hint signup-email-error" : "signup-email-hint"}
          />
          <p id="signup-email-hint" className={s.fieldHint}>
            Exemple : prenom.nom@gmail.com
          </p>
          {error ? (
            <p id="signup-email-error" className={s.formError} role="alert">
              <CircleAlert size={16} aria-hidden />
              Cette adresse n&apos;est pas valide. Vérifie la présence du @ et du domaine.
            </p>
          ) : null}
        </div>
        <p className={s.note}>
          Elle sert à récupérer ton compte. Ton adresse souveraine @idn.ga sera créée à la dernière étape.
        </p>
      </div>
      <div className={s.footer}>
        <button type="submit" className={s.primary}>
          Recevoir le code
        </button>
      </div>
    </form>
  )
}

const OTP_LENGTH = 6
const DEMO_OTP = "482913"
const RESEND_DELAY = 30

function SignupOtpScreen({ go, notify, demo }: ScreenProps) {
  const [code, setCode] = useState("")
  const [autofill, setAutofill] = useState(false)
  const [wait, setWait] = useState(RESEND_DELAY)
  const complete = code.length === OTP_LENGTH

  useEffect(() => {
    if (wait === 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  // Démo : les chiffres du code reçu arrivent un à un dans les cases.
  useEffect(() => {
    if (!autofill || complete) return
    const timer = setTimeout(() => setCode((c) => c + DEMO_OTP.charAt(c.length)), 160)
    return () => clearTimeout(timer)
  }, [autofill, code, complete])

  // Maquette : tout code à 6 chiffres est accepté.
  useEffect(() => {
    if (!complete) return
    const timer = setTimeout(() => go("signup-pin"), 1000)
    return () => clearTimeout(timer)
  }, [complete, go])

  return (
    <div className={s.screen}>
      <AppBar title="Créer mon compte" onBack={() => go("signup-email")} />
      <Stepper steps={SIGNUP_STEPS} current={1} label="Étapes de l'inscription" />
      <div className={s.body}>
        <h2 className={s.title}>Saisis le code reçu</h2>
        <p className={s.stateText}>
          Envoyé à <strong>{demo.signupEmail}</strong>. Il reste valable 10 minutes.
        </p>
        <div className={s.field}>
          <label htmlFor="signup-otp" className={s.label}>
            Code à 6 chiffres
          </label>
          <div className={s.otp}>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`${s.otpBox} ${i < code.length ? s.otpBoxFilled : ""} ${i === code.length ? s.otpBoxCurrent : ""}`}
                aria-hidden
              >
                {code.charAt(i)}
              </span>
            ))}
            <input
              id="signup-otp"
              className={s.otpInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={code}
              disabled={complete}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            />
          </div>
        </div>
        <p className={complete ? s.captureOk : s.captureInfo} aria-live="polite">
          {complete ? (
            <>
              <CircleCheck size={16} aria-hidden />
              Adresse e-mail confirmée.
            </>
          ) : (
            `${code.length} chiffre${code.length > 1 ? "s" : ""} sur 6`
          )}
        </p>
        <button
          type="button"
          className={s.secondary}
          disabled={autofill || complete}
          onClick={() => setAutofill(true)}
        >
          <Mail size={16} aria-hidden />
          Simuler la réception du code
        </button>
        <div className={s.resend}>
          <button
            type="button"
            className={s.link}
            disabled={wait > 0 || complete}
            onClick={() => {
              setWait(RESEND_DELAY)
              setCode("")
              setAutofill(false)
              notify(`Nouveau code envoyé à ${demo.signupEmail}.`)
            }}
          >
            Renvoyer le code
          </button>
          <p className={s.caption}>
            {wait > 0 ? `Nouvel envoi possible dans ${wait} s` : "Tu n'as rien reçu ? Vérifie tes indésirables."}
          </p>
          <button type="button" className={s.linkSmall} onClick={() => go("signup-email")}>
            Modifier l&apos;adresse e-mail
          </button>
        </div>
      </div>
    </div>
  )
}

function SignupPinScreen({ go }: ScreenProps) {
  const [first, setFirst] = useState<string | null>(null)
  const [pin, setPin] = useState("")
  const [mismatch, setMismatch] = useState(false)
  const [saved, setSaved] = useState(false)
  const confirming = first !== null

  // Courte pause pour laisser voir le sixième point avant de passer à la suite.
  useEffect(() => {
    if (pin.length < 6) return
    const timer = setTimeout(() => {
      if (first === null) {
        setFirst(pin)
        setPin("")
      } else if (pin === first) {
        setSaved(true)
      } else {
        setMismatch(true)
        setPin("")
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [pin, first])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => go("signup-address"), 1000)
    return () => clearTimeout(timer)
  }, [saved, go])

  const press = (digit: string) => {
    if (saved || pin.length >= 6) return
    setMismatch(false)
    setPin(pin + digit)
  }

  const restart = () => {
    setFirst(null)
    setPin("")
    setMismatch(false)
  }

  return (
    <div className={s.screen}>
      <AppBar title="Créer mon compte" onBack={() => go("signup-otp")} />
      <Stepper steps={SIGNUP_STEPS} current={2} label="Étapes de l'inscription" />
      <div className={s.loginTop}>
        <h2 className={s.title}>{saved ? "Code PIN enregistré" : confirming ? "Confirme ton code PIN" : "Crée ton code PIN"}</h2>
        <p className={s.stateText}>
          {confirming
            ? "Saisis le même code une seconde fois."
            : "6 chiffres pour déverrouiller ton identité. Évite ta date de naissance."}
        </p>
        <div className={s.pinDots} aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={saved || i < pin.length ? s.pinDotFilled : s.pinDot} />
          ))}
        </div>
        <p className={s.srOnly} aria-live="polite">
          {pin.length} chiffre{pin.length > 1 ? "s" : ""} saisi{pin.length > 1 ? "s" : ""} sur 6
        </p>
        {mismatch ? (
          <p className={s.formError} role="alert">
            <CircleAlert size={16} aria-hidden />
            Les deux codes sont différents. Saisis à nouveau le code choisi.
          </p>
        ) : null}
        {saved ? (
          <p className={s.captureOk} role="status">
            <CircleCheck size={16} aria-hidden />
            Les deux saisies correspondent.
          </p>
        ) : null}
      </div>
      <div className={s.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={s.key} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span aria-hidden />
        <button type="button" className={s.key} onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          className={`${s.key} ${s.keyAlt}`}
          onClick={() => setPin((p) => p.slice(0, -1))}
          aria-label="Effacer le dernier chiffre"
          disabled={pin.length === 0 || saved}
        >
          <Delete size={24} aria-hidden />
        </button>
      </div>
      <div className={s.footerCompact}>
        {confirming && !saved ? (
          <button type="button" className={s.link} onClick={restart}>
            Choisir un autre code
          </button>
        ) : null}
      </div>
    </div>
  )
}

const ADDRESS_PROPOSALS = [
  { id: "awa.mboumba", available: true },
  { id: "a.mboumba", available: false },
  { id: "awa.mboumba90", available: true },
]

function SignupAddressScreen({ go, demo, update }: ScreenProps) {
  const [address, setAddress] = useState(demo.idnAddress)

  return (
    <div className={s.screen}>
      <AppBar title="Créer mon compte" onBack={() => go("signup-pin")} />
      <Stepper steps={SIGNUP_STEPS} current={3} label="Étapes de l'inscription" />
      <div className={s.body}>
        <h2 className={s.title}>Choisis ton adresse souveraine</h2>
        <p className={s.stateText}>
          Ton adresse @idn.ga est ton identifiant officiel et l&apos;adresse de ton iBoîte. Elle ne pourra
          plus être modifiée.
        </p>
        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Propositions</legend>
          {ADDRESS_PROPOSALS.map((p) => (
            <label key={p.id} className={s.choice}>
              <input
                type="radio"
                name="adresse"
                value={p.id}
                checked={address === p.id}
                disabled={!p.available}
                onChange={() => setAddress(p.id)}
                className={s.choiceInput}
              />
              <span className={s.choiceIcon} aria-hidden>
                <Mail size={20} />
              </span>
              <span className={s.rowText}>
                <span className={`${s.rowTitle} ${s.mono}`}>{p.id}@idn.ga</span>
                <span className={`${s.status} ${p.available ? s.tone_green : s.tone_neutral}`}>
                  {p.available ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                  {p.available ? "Disponible" : "Déjà attribuée"}
                </span>
              </span>
              <span className={s.radioMark} aria-hidden />
            </label>
          ))}
        </fieldset>
      </div>
      <div className={s.footer}>
        <button
          type="button"
          className={s.primary}
          onClick={() => {
            update({ idnAddress: address })
            go("signup-done")
          }}
        >
          Valider {address}@idn.ga
        </button>
      </div>
    </div>
  )
}

function SignupDoneScreen({ go, demo }: ScreenProps) {
  return (
    <div className={s.screen}>
      <div className={`${s.body} ${s.centered}`}>
        <LottiePlayer animation="success" label="Compte créé avec succès" className={s.lottieMedium} replayable />
        <h1 className={s.title}>Bienvenue, Awa</h1>
        <p className={s.stateText}>Ton compte IDN est créé. Ton adresse souveraine est active :</p>
        <p className={s.addressStrip}>
          <Mail size={15} aria-hidden />
          <span className={s.mono}>{demo.idnAddress}@idn.ga</span>
        </p>
        <LevelBadge level={1} />
        <p className={s.note}>Vérifie ton identité pour passer au Niveau 2 et accéder aux démarches en ligne.</p>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => go("home")}>
          Accéder à l&apos;accueil
        </button>
        <button type="button" className={s.ghost} onClick={() => go("kyc")}>
          Vérifier mon identité
        </button>
      </div>
    </div>
  )
}

// ─── 4. Accueil ───

const SHORTCUTS: { id: ScreenId; label: string; sub: string; icon: LucideIcon; tone: string }[] = [
  { id: "icarte", label: "iCarte", sub: "5 cartes", icon: WalletCards, tone: "green" },
  { id: "iboite", label: "iBoîte", sub: "1 non lu", icon: Mailbox, tone: "blue" },
  { id: "idoc", label: "iDocument", sub: "17 documents", icon: Lock, tone: "yellow" },
  { id: "icv", label: "iCV", sub: "CV certifié", icon: FileUser, tone: "neutral" },
]

function HomeScreen({ go, demo }: ScreenProps) {
  return (
    <div className={s.screen}>
      <header className={s.homeHeader}>
        <span className={s.avatar} aria-hidden>
          {USER.initials}
        </span>
        <div className={s.grow}>
          <p className={s.caption}>Bonjour,</p>
          <h1 className={s.homeName}>Awa Mboumba</h1>
        </div>
        <div className={s.headerActions}>
          {/* Le scanner d'acte sort de la barre d'onglets : accès secondaire depuis l'accueil. */}
          <button
            type="button"
            className={s.iconButton}
            onClick={() => go("scanner")}
            aria-label="Scanner un acte officiel"
          >
            <ScanLine size={20} aria-hidden />
          </button>
          <button
            type="button"
            className={s.iconButton}
            onClick={() => go("notifs")}
            aria-label="Notifications, 3 non lues"
          >
            <Bell size={20} aria-hidden />
            <span className={s.bellDot} aria-hidden />
          </button>
        </div>
      </header>

      <div className={s.body}>
        <section className={s.idSummary} aria-label="Résumé de ton identité numérique">
          <div className={s.idSummaryTop}>
            <span className={s.eyebrowOnGreen}>Identité numérique</span>
            <FlagBars className={s.flagOnGreen} />
          </div>
          <p className={s.idSummaryName}>Awa Mboumba</p>
          <p className={s.idSummaryMeta}>Citoyenne gabonaise · Née le {USER.birth}</p>
          <div className={s.idSummaryBottom}>
            {demo.level === 3 ? (
              <span className={`${s.levelOnGreen} ${s.levelOnGreen3}`} aria-label="Niveau de garantie 3 · Élevé">
                <ShieldCheck size={13} aria-hidden />
                Niveau 3 · Élevé
              </span>
            ) : (
              <span className={s.levelOnGreen} aria-label="Niveau de garantie 2 · Substantiel">
                <ShieldCheck size={13} aria-hidden />
                Niveau 2
              </span>
            )}
            <button type="button" className={s.onGreenButton} onClick={() => go("idcard")}>
              <QrCode size={16} aria-hidden />
              Présenter ma carte
            </button>
          </div>
        </section>

        <ul className={s.shortcuts} aria-label="Raccourcis">
          {SHORTCUTS.map((sc) => {
            const Icon = sc.icon
            return (
              <li key={sc.id}>
                <button
                  type="button"
                  className={s.shortcut}
                  onClick={() => go(sc.id)}
                >
                  <span className={`${s.shortcutIcon} ${s[`tone_${sc.tone}`]}`} aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className={s.shortcutLabel}>{sc.label}</span>
                  <span className={s.shortcutSub}>{sc.sub}</span>
                </button>
              </li>
            )
          })}
        </ul>

        {demo.level === 2 ? (
          <button type="button" className={s.upgrade} onClick={() => go("l3-intro")}>
            <span className={s.upgradeIcon} aria-hidden>
              <ShieldCheck size={20} />
            </span>
            <span className={s.rowText}>
              <span className={s.rowTitle}>Passe au Niveau 3</span>
              <span className={s.rowSub}>
                Mets à jour tes pièces, puis un entretien vidéo de 10 min avec un contrôleur.
              </span>
            </span>
            <Chevron />
          </button>
        ) : null}

        <SectionTitle>À traiter</SectionTitle>
        <div className={s.card}>
          <Row
            icon={KeyRound}
            tone="blue"
            title="Gabon Connect demande l'accès"
            sub="Profil, NIP et adresse IDN"
            right={<Chevron />}
            onClick={() => go("consent")}
            strong
          />
        </div>

        <SectionTitle
          aside={
            <button type="button" className={s.link} onClick={() => go("notifs")}>
              Tout voir
            </button>
          }
        >
          Activité récente
        </SectionTitle>
        <ul className={s.card}>
          <li>
            <Row icon={LogOut} tone="green" title="Connexion à Gabon Connect" sub="Aujourd'hui · 09:14" />
          </li>
          <li>
            <Row icon={Mail} tone="blue" title="Courrier de la Mairie de Libreville" sub="Hier · 16:02" />
          </li>
          <li>
            <Row icon={HeartPulse} tone="neutral" title="Carte CNAMGS ajoutée à iCarte" sub="2 oct. · 11:40" />
          </li>
        </ul>
      </div>
    </div>
  )
}

// ─── 5. Carte d'identité numérique ───

const QR_PERIOD = 30

function IdCardScreen({ go, demo }: ScreenProps) {
  const [showNip, setShowNip] = useState(false)
  // Secondes écoulées : le code et le compte à rebours en dérivent.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const generation = Math.floor(tick / QR_PERIOD)
  const remaining = QR_PERIOD - (tick % QR_PERIOD)
  const token = ((generation + 11) * 2654435761 % 4294967296).toString(36).toUpperCase()

  return (
    <div className={s.screen}>
      <AppBar title="Ma carte d'identité" onBack={() => go("home")} />
      <div className={s.body}>
        <article className={s.idCard} aria-label="Carte d'identité numérique de Awa Mboumba">
          <div className={s.idCardHead}>
            <div>
              <p className={s.eyebrowOnGreen}>République gabonaise</p>
              <p className={s.idCardKind}>Carte d&apos;identité numérique</p>
            </div>
            <FlagBars className={s.flagOnGreen} />
          </div>
          <div className={s.idCardBody}>
            <span className={s.idPhoto} aria-hidden>
              {USER.initials}
            </span>
            <dl className={s.idFields}>
              <div>
                <dt>Nom</dt>
                <dd>MBOUMBA</dd>
              </div>
              <div>
                <dt>Prénom</dt>
                <dd>Awa</dd>
              </div>
              <div>
                <dt>Née le</dt>
                <dd>
                  {USER.birth} à {USER.birthPlace}
                </dd>
              </div>
            </dl>
          </div>
          <div className={s.idNipRow}>
            <div>
              <p className={s.idFieldLabel}>NIP</p>
              <p className={s.idNip}>{showNip ? USER.nip : USER.nipMasked}</p>
            </div>
            <button
              type="button"
              className={s.onGreenIcon}
              aria-pressed={showNip}
              aria-label={showNip ? "Masquer le NIP" : "Afficher le NIP"}
              onClick={() => setShowNip((v) => !v)}
            >
              {showNip ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
          <span className={`${s.levelOnGreen} ${demo.level === 3 ? s.levelOnGreen3 : ""}`}>
            <ShieldCheck size={13} aria-hidden />
            {LEVELS[demo.level].label}
          </span>
        </article>

        <section className={s.qrPanel} aria-label="Code de présentation">
          <div className={s.qrBox}>
            <QRCodeSVG
              value={`https://verifier.identite.ga/p/${token}`}
              size={176}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#16170F"
              title="QR code de présentation de la carte d'identité"
            />
          </div>
          <p className={s.qrToken}>{token}</p>
          <div className={s.countdown}>
            <span className={s.countdownTrack} aria-hidden>
              <span
                className={s.countdownFill}
                style={{ width: `${(remaining / QR_PERIOD) * 100}%` }}
              />
            </span>
            <span className={s.countdownText}>
              <Clock size={14} aria-hidden />
              Nouveau code dans {remaining} s
            </span>
          </div>
          <p className={s.qrHint}>
            Présente ce code à un agent ou au vérificateur public. Il change toutes les 30 secondes pour
            empêcher les copies.
          </p>
          <button
            type="button"
            className={s.secondary}
            onClick={() => setTick((t) => (Math.floor(t / QR_PERIOD) + 1) * QR_PERIOD)}
          >
            <RefreshCw size={16} aria-hidden />
            Régénérer maintenant
          </button>
        </section>
      </div>
    </div>
  )
}

// ─── 6. Vérification d'identité (KYC) ───

const KYC_CAPTURES = [
  {
    title: "Recto de ta CNI",
    hint: "Place la face avec ta photo dans le cadre. Évite les reflets.",
    done: "Photo nette, texte lisible.",
    face: false,
  },
  {
    title: "Verso de ta CNI",
    hint: "Retourne la carte. La zone de lecture doit être entièrement visible.",
    done: "Zone de lecture détectée.",
    face: false,
  },
  {
    title: "Selfie",
    hint: "Centre ton visage dans l'ovale, sans lunettes ni couvre-chef.",
    done: "Visage détecté. La comparaison se fera à l'envoi.",
    face: true,
  },
]

const KYC_STEPS = ["Recto", "Verso", "Selfie", "Envoi"]

function KycScreen({ go }: ScreenProps) {
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<"ready" | "capturing" | "captured">("ready")
  const [attest, setAttest] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (phase !== "capturing") return
    const timer = setTimeout(() => setPhase("captured"), 1800)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (!sending) return
    const timer = setTimeout(() => {
      setSending(false)
      setDone(true)
    }, 1600)
    return () => clearTimeout(timer)
  }, [sending])

  if (done) {
    return (
      <div className={s.screen}>
        <AppBar title="Vérification d'identité" />
        <div className={s.body}>
          <div className={s.resultHead}>
            <LottiePlayer animation="success" label="Dossier envoyé avec succès" className={s.lottieMedium} replayable />
            <h2 className={s.title}>Dossier envoyé</h2>
            <span className={`${s.badge} ${s.level2}`}>
              <Clock size={13} aria-hidden />
              En revue
            </span>
          </div>
          <ol className={s.timeline}>
            <li className={s.timelineDone}>
              <span className={s.timelineMark} aria-hidden>
                <Check size={14} />
              </span>
              <span className={s.rowText}>
                <span className={s.rowTitle}>Soumis</span>
                <span className={s.rowSub}>Aujourd&apos;hui · 10:42</span>
              </span>
            </li>
            <li className={s.timelineCurrent} aria-current="step">
              <span className={s.timelineMark} aria-hidden />
              <span className={s.rowText}>
                <span className={s.rowTitle}>En revue</span>
                <span className={s.rowSub}>Un agent vérifie tes pièces. Délai moyen : 24 h.</span>
              </span>
            </li>
            <li>
              <span className={s.timelineMark} aria-hidden />
              <span className={s.rowText}>
                <span className={s.rowTitle}>Complément demandé</span>
                <span className={s.rowSub}>Seulement si une pièce est illisible.</span>
              </span>
            </li>
            <li>
              <span className={s.timelineMark} aria-hidden />
              <span className={s.rowText}>
                <span className={s.rowTitle}>Approuvé</span>
                <span className={s.rowSub}>Tu seras notifiée dans l&apos;application.</span>
              </span>
            </li>
          </ol>
        </div>
        <div className={s.footer}>
          <button type="button" className={s.primary} onClick={() => go("home")}>
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    )
  }

  const capture = KYC_CAPTURES[step]

  return (
    <div className={s.screen}>
      <AppBar title="Vérification d'identité" onBack={() => go("home")} />
      <ol className={s.stepper} aria-label="Étapes de la vérification">
        {KYC_STEPS.map((label, i) => (
          <li
            key={label}
            className={i < step ? s.stepDone : i === step ? s.stepCurrent : s.step}
            aria-current={i === step ? "step" : undefined}
          >
            <span className={s.stepBar} aria-hidden />
            {label}
          </li>
        ))}
      </ol>

      {capture ? (
        <>
          <div className={s.body}>
            <h2 className={s.title}>{capture.title}</h2>
            <p className={s.stateText}>{capture.hint}</p>
            <div className={s.viewfinder}>
              {phase === "capturing" ? (
                <LottiePlayer
                  animation="scan"
                  label={capture.face ? "Analyse du visage en cours" : "Analyse de la pièce en cours"}
                  loop
                  className={s.lottieScan}
                />
              ) : (
                <span className={capture.face ? s.frameFace : s.frameDoc} aria-hidden>
                  {phase === "captured" ? <Check size={36} /> : capture.face ? <User size={48} /> : <IdCard size={44} />}
                </span>
              )}
            </div>
            <p className={phase === "captured" ? s.captureOk : s.captureInfo} aria-live="polite">
              {phase === "captured" ? (
                <>
                  <CircleCheck size={16} aria-hidden />
                  {capture.done}
                </>
              ) : phase === "capturing" ? (
                "Ne bouge pas…"
              ) : (
                <>
                  <Lock size={14} aria-hidden />
                  Les images sont chiffrées avant l&apos;envoi.
                </>
              )}
            </p>
          </div>
          <div className={s.footer}>
            {phase === "captured" ? (
              <div className={s.buttonPair}>
                <button type="button" className={s.ghost} onClick={() => setPhase("ready")}>
                  Reprendre
                </button>
                <button
                  type="button"
                  className={s.primary}
                  onClick={() => {
                    setStep((v) => v + 1)
                    setPhase("ready")
                  }}
                >
                  Continuer
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={s.primary}
                disabled={phase === "capturing"}
                onClick={() => setPhase("capturing")}
              >
                <Camera size={18} aria-hidden />
                Prendre la photo
              </button>
            )}
          </div>
        </>
      ) : sending ? (
        <div className={`${s.body} ${s.centered}`}>
          <LottiePlayer animation="loader" label="Envoi chiffré en cours" loop className={s.lottieMedium} />
          <p className={s.stateTitle}>Envoi chiffré…</p>
          <p className={s.stateText}>Tes pièces sont transmises à la Direction générale de la documentation.</p>
        </div>
      ) : (
        <>
          <div className={s.body}>
            <h2 className={s.title}>Vérifie avant l&apos;envoi</h2>
            <ul className={s.card}>
              <li>
                <Row icon={IdCard} tone="green" title="Recto de la CNI" sub="Photo nette" right={<Check size={18} className={s.greenText} aria-hidden />} />
              </li>
              <li>
                <Row icon={IdCard} tone="green" title="Verso de la CNI" sub="Zone de lecture détectée" right={<Check size={18} className={s.greenText} aria-hidden />} />
              </li>
              <li>
                <Row icon={ScanFace} tone="green" title="Selfie" sub="Visage détecté" right={<Check size={18} className={s.greenText} aria-hidden />} />
              </li>
            </ul>
            <label className={s.checkbox}>
              <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
              <span>J&apos;atteste que ces pièces m&apos;appartiennent et sont en cours de validité.</span>
            </label>
          </div>
          <div className={s.footer}>
            <button type="button" className={s.primary} disabled={!attest} onClick={() => setSending(true)}>
              Envoyer pour vérification
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── 6 bis. Parcours Niveau 3 ───

const L3_STEPS = ["Créneau", "Confirmation", "Équipement", "Entretien"]

const L3_UNLOCKS: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: PenLine, title: "Signature électronique qualifiée", sub: "Même valeur qu'une signature manuscrite" },
  { icon: ScrollText, title: "Procurations et actes notariés", sub: "Sans te déplacer au guichet" },
  { icon: Plane, title: "Passeport et titres sécurisés", sub: "Demande et renouvellement en ligne" },
  { icon: Landmark, title: "Ouverture de compte bancaire", sub: "Entrée en relation à distance" },
]

const L3_PREP: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: IdCard, title: "Ta CNI originale", sub: "En cours de validité, à montrer face caméra" },
  { icon: Video, title: "Un endroit calme et bien éclairé", sub: "Visage dégagé, sans contre-jour" },
  { icon: Wifi, title: "Une connexion stable", sub: "Wi-Fi ou 4G, au moins 2 Mbit/s" },
]

const DAYS = [
  { short: "lun.", num: 5, long: "Lundi 5 octobre" },
  { short: "mar.", num: 6, long: "Mardi 6 octobre" },
  { short: "mer.", num: 7, long: "Mercredi 7 octobre" },
  { short: "jeu.", num: 8, long: "Jeudi 8 octobre" },
  { short: "ven.", num: 9, long: "Vendredi 9 octobre" },
  { short: "sam.", num: 10, long: "Samedi 10 octobre" },
  { short: "dim.", num: 11, long: "Dimanche 11 octobre" },
]

const TIMES = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]

// Disponibilités fictives mais stables : dimanche fermé, samedi matin seulement.
function slotTaken(day: number, index: number) {
  if (day === 6) return true
  if (day === 5 && index >= 6) return true
  return (day * 5 + index * 7) % 4 === 0
}

function dayLabel(day: number) {
  return DAYS[day]?.long ?? ""
}

function L3IntroScreen({ go }: ScreenProps) {
  return (
    <div className={s.screen}>
      <AppBar title="Niveau 3 · Élevé" onBack={() => go("home")} />
      <div className={s.body}>
        <span className={`${s.shortcutIcon} ${s.tone_green}`} aria-hidden>
          <ShieldCheck size={20} />
        </span>
        <h2 className={s.title}>Passe au Niveau 3</h2>
        <p className={s.stateText}>
          Le niveau de garantie le plus élevé : un contrôleur de l&apos;État confirme ton identité lors d&apos;un
          entretien vidéo.
        </p>
        <ul className={s.facts} aria-label="En bref">
          <li className={s.fact}>
            <span className={s.factValue}>10 min</span>
            <span className={s.factLabel}>Durée</span>
          </li>
          <li className={s.fact}>
            <span className={s.factValue}>Visio</span>
            <span className={s.factLabel}>Avec un agent</span>
          </li>
          <li className={s.fact}>
            <span className={s.factValue}>Gratuit</span>
            <span className={s.factLabel}>Service public</span>
          </li>
        </ul>

        <SectionTitle>Ce que ça débloque</SectionTitle>
        <ul className={s.card}>
          {L3_UNLOCKS.map((u) => (
            <li key={u.title}>
              <Row icon={u.icon} tone="green" title={u.title} sub={u.sub} />
            </li>
          ))}
        </ul>

        <SectionTitle>À préparer</SectionTitle>
        <ul className={s.card}>
          {L3_PREP.map((p) => (
            <li key={p.title}>
              <Row icon={p.icon} title={p.title} sub={p.sub} />
            </li>
          ))}
        </ul>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => go("l3-slot")}>
          Choisir un créneau
        </button>
      </div>
    </div>
  )
}

function L3SlotScreen({ go, demo, update }: ScreenProps) {
  const [day, setDay] = useState(demo.slot.day)
  const [time, setTime] = useState<string | null>(demo.slot.time)
  const closed = TIMES.every((_, i) => slotTaken(day, i))

  return (
    <div className={s.screen}>
      <AppBar title="Choisir un créneau" onBack={() => go("l3-intro")} />
      <Stepper steps={L3_STEPS} current={0} label="Étapes du passage au Niveau 3" />
      <div className={s.body}>
        <h2 className={s.title}>Quand es-tu disponible ?</h2>
        <p className={s.stateText}>Entretien de 10 min · heure de Libreville</p>
        <div className={s.dayStrip} role="group" aria-label="Jour, octobre 2026">
          {DAYS.map((d, i) => (
            <button
              key={d.num}
              type="button"
              className={s.day}
              aria-pressed={i === day}
              aria-label={d.long}
              onClick={() => {
                setDay(i)
                setTime(null)
              }}
            >
              <span className={s.dayName}>{d.short}</span>
              <span className={s.dayNum}>{d.num}</span>
            </button>
          ))}
        </div>

        <h3 className={s.overline}>{dayLabel(day)}</h3>
        {closed ? (
          <p className={s.emptyRow}>Aucun créneau ce jour-là. Les contrôleurs reçoivent du lundi au samedi.</p>
        ) : (
          <ul className={s.slotGrid} aria-label={`Horaires du ${dayLabel(day).toLowerCase()}`}>
            {TIMES.map((t, i) => {
              const taken = slotTaken(day, i)
              return (
                <li key={t}>
                  <button
                    type="button"
                    className={s.slot}
                    disabled={taken}
                    aria-pressed={t === time}
                    onClick={() => setTime(t)}
                  >
                    {t}
                    {taken ? <span className={s.srOnly}> (indisponible)</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className={s.footer}>
        <p className={s.slotSummary} aria-live="polite">
          {time ? `${dayLabel(day)} à ${time}` : "Choisis un horaire disponible"}
        </p>
        <button
          type="button"
          className={s.primary}
          disabled={!time}
          onClick={() => {
            if (!time) return
            update({ slot: { day, time } })
            go("l3-confirm")
          }}
        >
          Réserver ce créneau
        </button>
      </div>
    </div>
  )
}

function L3ConfirmScreen({ go, notify, demo }: ScreenProps) {
  const [added, setAdded] = useState(false)

  return (
    <div className={s.screen}>
      <AppBar title="Rendez-vous" onBack={() => go("l3-slot")} />
      <Stepper steps={L3_STEPS} current={1} label="Étapes du passage au Niveau 3" />
      <div className={s.body}>
        <div className={s.resultHead}>
          <span className={s.confirmIcon} aria-hidden>
            <CalendarCheck size={32} />
          </span>
          <h2 className={s.title}>Rendez-vous réservé</h2>
          <p className={s.stateText}>Un rappel te sera envoyé 30 min avant.</p>
        </div>
        <section className={s.card} aria-label="Récapitulatif du rendez-vous">
          <dl className={s.details}>
            <div>
              <dt>Date</dt>
              <dd>{dayLabel(demo.slot.day)} 2026</dd>
            </div>
            <div>
              <dt>Heure</dt>
              <dd>{demo.slot.time} · 10 min</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>Visio dans l&apos;application</dd>
            </div>
            <div>
              <dt>Contrôleur</dt>
              <dd>Agent Ondo · DGDI</dd>
            </div>
            <div>
              <dt>Référence</dt>
              <dd className={s.mono}>N3-2026-10-0417</dd>
            </div>
          </dl>
        </section>
        <button
          type="button"
          className={s.secondary}
          disabled={added}
          onClick={() => {
            setAdded(true)
            notify("Rendez-vous ajouté à ton calendrier.")
          }}
        >
          {added ? <Check size={16} aria-hidden /> : <CalendarPlus size={16} aria-hidden />}
          {added ? "Ajouté à ton calendrier" : "Ajouter au calendrier"}
        </button>
        <p className={s.note}>La salle d&apos;attente ouvre 5 min avant l&apos;heure. Garde ta CNI à portée de main.</p>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => go("l3-waiting")}>
          Rejoindre la salle d&apos;attente
        </button>
        <button type="button" className={s.ghost} onClick={() => go("l3-slot")}>
          Modifier le créneau
        </button>
      </div>
    </div>
  )
}

const EQUIPMENT_CHECKS: { icon: LucideIcon; label: string; ok: string }[] = [
  { icon: Camera, label: "Caméra", ok: "Caméra frontale détectée" },
  { icon: Mic, label: "Micro", ok: "Niveau sonore correct" },
  { icon: Wifi, label: "Connexion", ok: "Stable · 12 Mbit/s" },
]

function L3WaitingScreen({ go, demo }: ScreenProps) {
  // Nombre de vérifications terminées. L'animation en boucle disparaît avant 5 s (WCAG 2.2.2).
  const [done, setDone] = useState(0)
  const ready = done >= EQUIPMENT_CHECKS.length

  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setDone((d) => d + 1), 1100)
    return () => clearTimeout(timer)
  }, [done, ready])

  return (
    <div className={s.screen}>
      <AppBar title="Salle d'attente" onBack={() => go("l3-confirm")} />
      <Stepper steps={L3_STEPS} current={2} label="Étapes du passage au Niveau 3" />
      <div className={s.body}>
        <div className={s.resultHead}>
          {ready ? (
            <span className={s.confirmIcon} aria-hidden>
              <Check size={32} />
            </span>
          ) : (
            <LottiePlayer animation="loader" label="Vérification de l'équipement en cours" loop className={s.lottieMedium} />
          )}
          <h2 className={s.title}>{ready ? "Tout est prêt" : "Vérification de ton équipement"}</h2>
          <p className={s.stateText}>
            {ready
              ? `L'agent Ondo te rejoint à ${demo.slot.time}.`
              : "Autorise l'accès à la caméra et au micro si ton téléphone le demande."}
          </p>
        </div>
        <ul className={s.card} aria-label="Vérifications">
          {EQUIPMENT_CHECKS.map((c, i) => {
            const ok = i < done
            return (
              <li key={c.label}>
                <Row
                  icon={c.icon}
                  tone={ok ? "green" : "neutral"}
                  title={c.label}
                  sub={ok ? c.ok : i === done ? "Test en cours…" : "En attente"}
                  right={
                    <span className={`${s.status} ${ok ? s.tone_green : s.tone_neutral}`}>
                      {ok ? <Check size={12} aria-hidden /> : null}
                      {ok ? "Prêt" : i === done ? "En cours" : "En attente"}
                    </span>
                  }
                />
              </li>
            )
          })}
        </ul>
        <p className={s.srOnly} aria-live="polite">
          {done} vérification{done > 1 ? "s" : ""} sur 3 terminée{done > 1 ? "s" : ""}
        </p>
        <p className={s.note}>L&apos;entretien est enregistré et conservé 90 jours pour contrôle.</p>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} disabled={!ready} onClick={() => go("l3-call")}>
          <Video size={18} aria-hidden />
          Entrer en visio
        </button>
      </div>
    </div>
  )
}

const CALL_INSTRUCTIONS = [
  { title: "Montre le recto de ta CNI", hint: "Tiens la carte près de la caméra, sans reflet." },
  { title: "Tourne lentement la tête", hint: "De gauche à droite, puis reviens face à l'écran." },
  { title: "Dis ton nom à voix haute", hint: "Puis ta date et ton lieu de naissance." },
]

function L3CallScreen({ go, notify }: ScreenProps) {
  const [elapsed, setElapsed] = useState(0)
  const [step, setStep] = useState(0)
  const [micOff, setMicOff] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const instruction = CALL_INSTRUCTIONS[step]

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Après la dernière consigne, l'agent valide puis le résultat s'affiche.
  useEffect(() => {
    if (instruction) return
    const timer = setTimeout(() => go("l3-result"), 2600)
    return () => clearTimeout(timer)
  }, [instruction, go])

  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`

  return (
    <div className={`${s.screen} ${s.call}`}>
      <header className={s.callHead}>
        <div className={s.grow}>
          <h1 className={s.callTitle}>Entretien Niveau 3</h1>
          <p className={s.callSub}>
            <Lock size={12} aria-hidden />
            Chiffré · <span role="timer">{clock}</span>
          </p>
        </div>
      </header>

      <div className={s.callStage}>
        <div className={s.agentTile} role="img" aria-label="Vidéo de l'agent Ondo, contrôleur de la DGDI">
          <span className={s.agentAvatar}>AO</span>
          <span className={s.agentLabel}>Agent Ondo · DGDI</span>
        </div>
        <div
          className={s.selfTile}
          role="img"
          aria-label={camOff ? "Ta caméra est coupée" : `Ta vidéo${micOff ? ", micro coupé" : ""}`}
        >
          {camOff ? (
            <>
              <VideoOff size={20} />
              <span className={s.selfTileOff}>Caméra coupée</span>
            </>
          ) : (
            USER.initials
          )}
          {micOff ? (
            <span className={s.selfMuted}>
              <MicOff size={12} />
            </span>
          ) : null}
        </div>
      </div>

      <section className={s.instruction} aria-label="Consigne de l'agent">
        <div aria-live="polite">
          {instruction ? (
            <>
              <p className={s.instructionStep}>
                Consigne {step + 1} sur {CALL_INSTRUCTIONS.length}
              </p>
              <p className={s.instructionText}>{instruction.title}</p>
              <p className={s.instructionHint}>
                {camOff ? "Réactive ta caméra pour que l'agent puisse te voir." : instruction.hint}
              </p>
            </>
          ) : (
            <div className={s.instructionReview}>
              <LottiePlayer animation="loader" label="L'agent valide ton identité" loop className={s.lottieSmall} />
              <span>L&apos;agent valide ton identité…</span>
            </div>
          )}
        </div>
        {instruction ? (
          <button type="button" className={s.instructionButton} disabled={camOff} onClick={() => setStep((v) => v + 1)}>
            C&apos;est fait
          </button>
        ) : null}
      </section>

      <div className={s.callControls} role="group" aria-label="Commandes de l'appel">
        <button type="button" className={s.callButton} aria-pressed={micOff} onClick={() => setMicOff((v) => !v)}>
          <span className={s.callIcon} aria-hidden>
            {micOff ? <MicOff size={22} /> : <Mic size={22} />}
          </span>
          Couper le micro
        </button>
        <button type="button" className={s.callButton} aria-pressed={camOff} onClick={() => setCamOff((v) => !v)}>
          <span className={s.callIcon} aria-hidden>
            {camOff ? <VideoOff size={22} /> : <Video size={22} />}
          </span>
          Couper la caméra
        </button>
        <button
          type="button"
          className={`${s.callButton} ${s.callHang}`}
          onClick={() => {
            notify("Entretien interrompu. Tu peux réserver un nouveau créneau.")
            go("l3-intro")
          }}
        >
          <span className={s.callIcon} aria-hidden>
            <PhoneOff size={22} />
          </span>
          Raccrocher
        </button>
      </div>
    </div>
  )
}

function L3ResultScreen({ go, update }: ScreenProps) {
  // Atteindre cet écran fait passer toute la maquette au Niveau 3.
  useEffect(() => {
    update({ level: 3 })
  }, [update])

  return (
    <div className={s.screen}>
      <AppBar title="Niveau 3 · Élevé" />
      <div className={s.body}>
        <div className={s.resultHead}>
          <LottiePlayer animation="shield" label="Niveau 3 atteint" className={s.lottieMedium} replayable />
          <h2 className={s.title}>Niveau 3 atteint</h2>
          <LevelBadge level={3} />
          <p className={s.note}>L&apos;agent Ondo a confirmé ton identité. Ta carte et ton profil sont à jour.</p>
        </div>
        <h3 className={s.overline}>Désormais disponible</h3>
        <ul className={s.card}>
          {L3_UNLOCKS.map((u) => (
            <li key={u.title}>
              <Row icon={u.icon} tone="green" title={u.title} right={<Check size={18} className={s.greenText} aria-hidden />} />
            </li>
          ))}
        </ul>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => go("home")}>
          Retour à l&apos;accueil
        </button>
        <button type="button" className={s.ghost} onClick={() => go("idcard")}>
          Voir ma carte
        </button>
      </div>
    </div>
  )
}

// ─── 7. Consentement OAuth ───

const SCOPES: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: User, title: "Ton profil", sub: "Nom, prénom, date et lieu de naissance" },
  { icon: Hash, title: "Ton NIP", sub: "Numéro d'identification personnel" },
  { icon: Mail, title: "Ton adresse IDN", sub: USER.email },
]

function ConsentScreen({ go }: ScreenProps) {
  const [decision, setDecision] = useState<"pending" | "granting" | "granted" | "denied">("pending")

  useEffect(() => {
    if (decision !== "granting") return
    const timer = setTimeout(() => setDecision("granted"), 1200)
    return () => clearTimeout(timer)
  }, [decision])

  if (decision === "granting") {
    return (
      <div className={`${s.screen} ${s.centered}`}>
        <LottiePlayer animation="loader" label="Autorisation en cours" loop className={s.lottieMedium} />
        <p className={s.stateTitle}>Autorisation en cours…</p>
      </div>
    )
  }

  if (decision === "granted" || decision === "denied") {
    const granted = decision === "granted"
    return (
      <div className={s.screen}>
        <div className={`${s.body} ${s.centered}`}>
          {granted ? (
            <LottiePlayer animation="success" label="Accès accordé" className={s.lottieMedium} replayable />
          ) : (
            <span className={s.deniedIcon} aria-hidden>
              <X size={32} />
            </span>
          )}
          <h1 className={s.title}>{granted ? "Accès accordé" : "Accès refusé"}</h1>
          <p className={s.stateText}>
            {granted
              ? "Gabon Connect reçoit ton profil, ton NIP et ton adresse IDN. Tu peux révoquer cet accès à tout moment."
              : "Aucune donnée n'a été partagée avec Gabon Connect."}
          </p>
        </div>
        <div className={s.footer}>
          {granted ? (
            <button type="button" className={s.primary} onClick={() => go("home")}>
              Retourner sur gabonconnect.ga
            </button>
          ) : null}
          <button
            type="button"
            className={granted ? s.ghost : s.primary}
            onClick={() => go(granted ? "security" : "home")}
          >
            {granted ? "Gérer mes autorisations" : "Retour à l'accueil"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={s.screen}>
      <AppBar title="Autorisation" onBack={() => go("home")} />
      <div className={s.body}>
        <div className={s.consentLogos} aria-hidden>
          <span className={s.partnerLogo}>GC</span>
          <span className={s.consentLink} />
          <IdnMark size={48} />
        </div>
        <h2 className={s.consentTitle}>Gabon Connect demande l&apos;accès à ton identité IDN</h2>
        <p className={s.consentDomain}>
          <ShieldCheck size={14} aria-hidden />
          gabonconnect.ga · Partenaire vérifié par l&apos;État
        </p>

        <h3 className={s.overline}>Données demandées</h3>
        <ul className={s.card}>
          {SCOPES.map((scope) => (
            <li key={scope.title}>
              <Row icon={scope.icon} tone="green" title={scope.title} sub={scope.sub} />
            </li>
          ))}
        </ul>
        <p className={s.note}>
          Connecté en tant que <strong>{USER.email}</strong>. Tu pourras révoquer cet accès dans Sécurité
          et profil, rubrique Applications autorisées.
        </p>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => setDecision("granting")}>
          Autoriser
        </button>
        <button type="button" className={s.ghost} onClick={() => setDecision("denied")}>
          Refuser
        </button>
      </div>
    </div>
  )
}

// ─── 8. iCarte ───

const WALLET = [
  { id: "cni", name: "Carte nationale d'identité", issuer: "DGDI", number: "GA •••• 4587", expiry: "03/2031", icon: IdCard, color: "#0E7C3A", ink: "#FFFFFF" },
  { id: "permis", name: "Permis de conduire", issuer: "Ministère des Transports", number: "Cat. B · •••• 2210", expiry: "08/2029", icon: Car, color: "#2563AC", ink: "#FFFFFF" },
  { id: "cnamgs", name: "CNAMGS · Assurance maladie", issuer: "CNAMGS", number: "Assurée •••• 7731", expiry: "12/2026", icon: HeartPulse, color: "#0F5E63", ink: "#FFFFFF" },
  { id: "banque", name: "BGFIBank Visa", issuer: "BGFIBank Gabon", number: "•••• •••• •••• 4402", expiry: "05/2028", icon: CreditCard, color: "#16170F", ink: "#FFFFFF" },
  { id: "electeur", name: "Carte d'électeur", issuer: "Ministère de l'Intérieur", number: "Bureau 012 · Libreville 3e", expiry: "Sans limite", icon: Landmark, color: "#F2C811", ink: "#16170F" },
]

function ICarteScreen({ notify }: ScreenProps) {
  const [selected, setSelected] = useState("cni")
  const card = WALLET.find((c) => c.id === selected) ?? WALLET[0]

  return (
    <div className={s.screen}>
      <AppBar
        title="iCarte"
        right={
          <button
            type="button"
            className={s.iconButton}
            aria-label="Ajouter une carte"
            onClick={() => notify("Ajout de carte : scanne la carte ou choisis un modèle.")}
          >
            <Plus size={20} aria-hidden />
          </button>
        }
      />
      <div className={s.body}>
        <p className={s.stateText}>5 cartes · touche une carte pour l&apos;afficher</p>
        <ul className={s.walletStack} aria-label="Mes cartes">
          {WALLET.map((c) => {
            const Icon = c.icon
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={s.walletCard}
                  style={{ background: c.color, color: c.ink }}
                  aria-pressed={c.id === selected}
                  onClick={() => setSelected(c.id)}
                >
                  <span className={s.walletCardTop}>
                    <Icon size={18} aria-hidden />
                    <span className={s.walletCardName}>{c.name}</span>
                  </span>
                  <span className={s.walletCardNumber}>{c.number}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {card ? (
          <section className={s.card} aria-live="polite" aria-label={`Détails : ${card.name}`}>
            <dl className={s.details}>
              <div>
                <dt>Carte</dt>
                <dd>{card.name}</dd>
              </div>
              <div>
                <dt>Émetteur</dt>
                <dd>{card.issuer}</dd>
              </div>
              <div>
                <dt>Numéro</dt>
                <dd className={s.mono}>{card.number}</dd>
              </div>
              <div>
                <dt>Validité</dt>
                <dd>{card.expiry}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
    </div>
  )
}

// ─── 9. iBoîte ───

const ACCOUNTS = [
  { id: "perso", label: "Personnel", address: "awa.mboumba@idn.ga", icon: User },
  { id: "pro", label: "Professionnel", address: "a.mboumba.conseil@idn.ga", icon: Briefcase },
  { id: "asso", label: "Association", address: "tresorerie.ajlbv@idn.ga", icon: Users },
]

const LETTERS: Record<string, { id: string; from: string; subject: string; date: string }[]> = {
  perso: [
    { id: "l1", from: "Mairie de Libreville", subject: "Complément de dossier : acte de naissance", date: "Hier" },
    { id: "l2", from: "CNAMGS", subject: "Attestation de droits 2026", date: "28 sept." },
    { id: "l3", from: "Direction générale des impôts", subject: "Avis d'imposition 2026", date: "15 sept." },
  ],
  pro: [
    { id: "l4", from: "Direction générale des impôts", subject: "Patente 2026 : échéance au 31 octobre", date: "1 oct." },
    { id: "l5", from: "CNSS", subject: "Déclaration trimestrielle reçue", date: "20 sept." },
  ],
  asso: [{ id: "l6", from: "Préfecture de l'Estuaire", subject: "Récépissé de déclaration d'association", date: "9 sept." }],
}

const PARCELS = [
  { id: "p1", ref: "GA 4471 2093 5", from: "Port-Gentil", status: "En transit vers Libreville", tone: "blue" as const, icon: Truck },
  { id: "p2", ref: "GA 4468 0187 2", from: "Franceville", status: "Disponible · Libreville Centre · code 4821", tone: "green" as const, icon: Package },
  { id: "p3", ref: "GA 4402 7716 9", from: "Paris, France", status: "Livré le 22 sept.", tone: "neutral" as const, icon: CircleCheck },
]

function IBoiteScreen({ notify }: ScreenProps) {
  const [tab, setTab] = useState<"courriers" | "colis">("courriers")
  const [account, setAccount] = useState("perso")
  const [read, setRead] = useState<string[]>(["l2", "l3", "l5", "l6"])
  const current = ACCOUNTS.find((a) => a.id === account) ?? ACCOUNTS[0]
  const letters = LETTERS[account] ?? []

  return (
    <div className={s.screen}>
      <AppBar title="iBoîte" />
      <div className={s.body}>
        <div className={s.accounts} role="group" aria-label="Compte iBoîte">
          {ACCOUNTS.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.id}
                type="button"
                className={s.accountPill}
                aria-pressed={a.id === account}
                onClick={() => setAccount(a.id)}
              >
                <Icon size={15} aria-hidden />
                {a.label}
              </button>
            )
          })}
        </div>
        {current ? (
          <p className={s.addressStrip}>
            <Inbox size={15} aria-hidden />
            <span className={s.mono}>{current.address}</span>
          </p>
        ) : null}

        <div className={s.segmented} role="group" aria-label="Type d'envoi">
          <button type="button" aria-pressed={tab === "courriers"} onClick={() => setTab("courriers")}>
            Courriers
          </button>
          <button type="button" aria-pressed={tab === "colis"} onClick={() => setTab("colis")}>
            Colis
          </button>
        </div>

        {tab === "courriers" ? (
          <ul className={s.card} aria-label="Courriers numérisés">
            {letters.map((l) => {
              const unread = !read.includes(l.id)
              return (
                <li key={l.id}>
                  <Row
                    icon={ScrollText}
                    tone={unread ? "blue" : "neutral"}
                    strong={unread}
                    title={
                      <>
                        {unread ? <span className={s.unreadDot} aria-hidden /> : null}
                        {l.from}
                        {unread ? <span className={s.srOnly}> (non lu)</span> : null}
                      </>
                    }
                    sub={l.subject}
                    right={<span className={s.rowMeta}>{l.date}</span>}
                    onClick={() => {
                      setRead((r) => (r.includes(l.id) ? r : [...r, l.id]))
                      notify(`Courrier ouvert : ${l.subject}.`)
                    }}
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <>
            <ul className={s.card} aria-label="Colis suivis par La Poste gabonaise">
              {PARCELS.map((p) => (
                <li key={p.id}>
                  <Row
                    icon={p.icon}
                    tone={p.tone}
                    title={<span className={s.mono}>{p.ref}</span>}
                    sub={`De ${p.from} · ${p.status}`}
                  />
                </li>
              ))}
            </ul>
            <p className={s.note}>Suivi fourni par La Poste gabonaise.</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── 10. iDocument ───

const FOLDERS: { id: string; label: string; icon: LucideIcon; docs: string[] }[] = [
  { id: "identite", label: "Identité", icon: IdCard, docs: ["CNI recto-verso", "Passeport", "Photo d'identité"] },
  { id: "etat-civil", label: "État civil", icon: ScrollText, docs: ["Acte de naissance", "Certificat de nationalité"] },
  { id: "domicile", label: "Domicile", icon: House, docs: ["Facture SEEG · septembre 2026"] },
  { id: "diplomes", label: "Diplômes", icon: GraduationCap, docs: ["Baccalauréat", "Licence · UOB", "Master · UOB", "Certificat TOEIC"] },
  { id: "travail", label: "Travail", icon: Briefcase, docs: ["Contrat de travail", "Bulletin de paie · août 2026"] },
  { id: "sante", label: "Santé", icon: HeartPulse, docs: ["Carnet de vaccination", "Attestation CNAMGS", "Ordonnance · CHU de Libreville"] },
  { id: "vehicule", label: "Véhicule", icon: Car, docs: ["Carte grise"] },
  { id: "autres", label: "Autres", icon: Folder, docs: ["Attestation de logement"] },
]

function IDocumentScreen({ go, notify }: ScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const folder = FOLDERS.find((f) => f.id === openId)

  if (folder) {
    return (
      <div className={s.screen}>
        <AppBar title={folder.label} onBack={() => setOpenId(null)} />
        <div className={s.body}>
          <p className={s.e2eBadge}>
            <Lock size={14} aria-hidden />
            Chiffré de bout en bout
          </p>
          <ul className={s.card}>
            {folder.docs.map((doc) => (
              <li key={doc}>
                <Row
                  icon={FileText}
                  title={doc}
                  sub="PDF · ajouté en 2026"
                  right={<Chevron />}
                  onClick={() => notify(`Déchiffrement local : ${doc}.`)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className={s.screen}>
      <AppBar title="iDocument" onBack={() => go("home")} />
      <div className={s.body}>
        <p className={s.e2eBadge}>
          <Lock size={14} aria-hidden />
          Chiffré de bout en bout
        </p>
        <p className={s.stateText}>17 documents · 48 Mo sur 1 Go. Seul ton appareil peut les lire.</p>
        <span className={s.storageTrack} aria-hidden>
          <span className={s.storageFill} />
        </span>
        <ul className={s.folderGrid} aria-label="Dossiers">
          {FOLDERS.map((f) => {
            const Icon = f.icon
            return (
              <li key={f.id}>
                <button type="button" className={s.folder} onClick={() => setOpenId(f.id)}>
                  <span className={`${s.shortcutIcon} ${s.tone_green}`} aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className={s.shortcutLabel}>{f.label}</span>
                  <span className={s.shortcutSub}>
                    {f.docs.length} document{f.docs.length > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ─── 10 bis. iCV ───

const CV_THEMES = [
  { id: "moderne", label: "Moderne" },
  { id: "classique", label: "Classique" },
  { id: "minimal", label: "Minimal" },
  { id: "institutionnel", label: "Institutionnel" },
] as const

type CvTheme = (typeof CV_THEMES)[number]["id"]

const CV_URL = "identite.ga/cv/awa-mboumba"

const CV_EXPERIENCES = [
  {
    title: "Ingénieure réseaux d'accès",
    meta: "Gabon Télécom · Libreville · depuis 2021",
    text: "Pilote le déploiement de la fibre optique dans l'Estuaire : 14 000 foyers raccordés.",
  },
  {
    title: "Ingénieure télécoms industriels",
    meta: "SOGARA · Port-Gentil · 2017 – 2021",
    text: "Maintenance des liaisons radio et du réseau de supervision de la raffinerie.",
  },
]

const CV_EDUCATION = [
  { title: "Master Réseaux et télécommunications", meta: "USTM, Franceville · 2017" },
  { title: "Licence de physique", meta: "Université Omar Bongo, Libreville · 2014" },
]

const CV_SKILLS = ["Fibre optique FTTH", "Réseaux 4G et 5G", "Cisco CCNP", "Gestion de projet", "Français, anglais"]

function ICvScreen({ go, notify }: ScreenProps) {
  const [theme, setTheme] = useState<CvTheme>("moderne")
  const [sharing, setSharing] = useState(false)
  const themeLabel = CV_THEMES.find((t) => t.id === theme)?.label ?? ""

  if (sharing) {
    return (
      <div className={s.screen}>
        <AppBar title="Partager mon CV" onBack={() => setSharing(false)} />
        <div className={s.body}>
          <section className={s.qrPanel} aria-label="Lien de partage du CV">
            <div className={s.qrBox}>
              <QRCodeSVG
                value={`https://${CV_URL}`}
                size={176}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#16170F"
                title="QR code du CV en ligne de Awa Mboumba"
              />
            </div>
            <p className={s.qrToken}>{CV_URL}</p>
            <p className={s.qrHint}>
              Le recruteur voit ton CV avec le thème {themeLabel} et le sceau de vérification de tes diplômes.
            </p>
            <button type="button" className={s.secondary} onClick={() => notify(`Lien copié : ${CV_URL}`)}>
              <Copy size={16} aria-hidden />
              Copier le lien
            </button>
          </section>
          <p className={s.note}>
            Tu peux désactiver ce lien à tout moment. Ton NIP n&apos;apparaît jamais sur le CV public.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={s.screen}>
      <AppBar title="iCV" onBack={() => go("home")} />
      <div className={s.body}>
        <p className={s.e2eBadge}>
          <ShieldCheck size={14} aria-hidden />
          Diplômes vérifiés via iDocument
        </p>
        <div className={s.accounts} role="group" aria-label="Thème du CV">
          {CV_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={s.accountPill}
              aria-pressed={t.id === theme}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <article className={`${s.cv} ${s[`cv_${theme}`]}`} aria-label={`Aperçu du CV, thème ${themeLabel}`}>
          <span className={s.cvFlag} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <p className={s.cvEyebrow}>République gabonaise · CV certifié IDN</p>
          <header className={s.cvHead}>
            <span className={s.cvPhoto} aria-hidden>
              {USER.initials}
            </span>
            <div>
              <h2 className={s.cvName}>Awa Mboumba</h2>
              <p className={s.cvRole}>Ingénieure en télécommunications</p>
              <p className={s.cvContact}>{USER.email} · Libreville</p>
            </div>
          </header>

          <section className={s.cvSection}>
            <h3 className={s.cvSectionTitle}>Expériences</h3>
            <ul className={s.cvList}>
              {CV_EXPERIENCES.map((x) => (
                <li key={x.title}>
                  <p className={s.cvItemTitle}>{x.title}</p>
                  <p className={s.cvItemMeta}>{x.meta}</p>
                  <p className={s.cvItemText}>{x.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={s.cvSection}>
            <h3 className={s.cvSectionTitle}>Formation</h3>
            <ul className={s.cvList}>
              {CV_EDUCATION.map((x) => (
                <li key={x.title}>
                  <p className={s.cvItemTitle}>
                    {x.title}
                    <ShieldCheck size={13} className={s.cvVerified} aria-hidden />
                    <span className={s.srOnly}> (diplôme vérifié)</span>
                  </p>
                  <p className={s.cvItemMeta}>{x.meta}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={s.cvSection}>
            <h3 className={s.cvSectionTitle}>Compétences</h3>
            <ul className={s.cvSkills}>
              {CV_SKILLS.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </section>
        </article>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.primary} onClick={() => setSharing(true)}>
          <Share2 size={18} aria-hidden />
          Partager mon CV
        </button>
      </div>
    </div>
  )
}

// ─── 11. Scanner d'acte officiel ───

function ScannerScreen({ go }: ScreenProps) {
  const [phase, setPhase] = useState<"scanning" | "checking" | "result">("scanning")

  useEffect(() => {
    if (phase === "result") return
    const timer = setTimeout(() => setPhase(phase === "scanning" ? "checking" : "result"), phase === "scanning" ? 3000 : 1200)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === "result") {
    return (
      <div className={s.screen}>
        <AppBar title="Résultat" onBack={() => go("home")} />
        <div className={s.body}>
          <div className={s.resultHead}>
            <LottiePlayer animation="shield" label="Acte authentique vérifié" className={s.lottieMedium} replayable />
            <h2 className={s.title}>Acte authentique</h2>
            <span className={`${s.badge} ${s.level3}`}>
              <ShieldCheck size={13} aria-hidden />
              Signature de l&apos;État valide
            </span>
          </div>
          <section className={s.card} aria-label="Détails de l'acte">
            <dl className={s.details}>
              <div>
                <dt>Type</dt>
                <dd>Acte de naissance · copie intégrale</dd>
              </div>
              <div>
                <dt>Émetteur</dt>
                <dd>Mairie du 3e arrondissement de Libreville</dd>
              </div>
              <div>
                <dt>Délivré le</dt>
                <dd>14/09/2026</dd>
              </div>
              <div>
                <dt>Référence</dt>
                <dd className={s.mono}>ACT-LBV3-2026-008412</dd>
              </div>
            </dl>
          </section>
          <p className={s.note}>
            Compare les informations ci-dessus avec le document papier. Toute différence doit être signalée.
          </p>
        </div>
        <div className={s.footer}>
          <button type="button" className={s.primary} onClick={() => setPhase("scanning")}>
            <ScanLine size={18} aria-hidden />
            Scanner un autre acte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${s.screen} ${s.scanner}`}>
      <header className={s.scannerHead}>
        <button type="button" className={s.scannerClose} onClick={() => go("home")} aria-label="Fermer le scanner">
          <X size={20} aria-hidden />
        </button>
        <h1 className={s.scannerTitle}>Vérifier un acte officiel</h1>
        <span className={s.appBarSpacer} />
      </header>
      <div className={s.scannerBody}>
        <div className={s.reticle} aria-hidden>
          <span className={s.corner} />
          <span className={s.corner} />
          <span className={s.corner} />
          <span className={s.corner} />
          <span className={s.reticleLine} />
        </div>
        {phase === "checking" ? (
          <div className={s.scannerText} aria-live="polite">
            <LottiePlayer animation="loader" label="Vérification de la signature" loop className={s.lottieSmall} />
            Vérification de la signature…
          </div>
        ) : (
          <p className={s.scannerText} aria-live="polite">
            Vise le QR code imprimé en bas de l&apos;acte.
          </p>
        )}
      </div>
      <div className={s.scannerFoot}>
        <button
          type="button"
          className={s.scannerAction}
          disabled={phase === "checking"}
          onClick={() => setPhase("checking")}
        >
          Simuler la lecture
        </button>
      </div>
    </div>
  )
}

// ─── 12. Notifications ───

const NOTIFS: { id: string; icon: LucideIcon; tone: "green" | "blue" | "yellow" | "neutral"; title: string; sub: string; target: ScreenId; group: string }[] = [
  { id: "n1", icon: Mail, tone: "blue", title: "Nouveau courrier de la Mairie de Libreville", sub: "Il y a 2 h · iBoîte", target: "iboite", group: "Aujourd'hui" },
  { id: "n2", icon: CircleAlert, tone: "yellow", title: "Nouvel appareil connecté : iPad, Port-Gentil", sub: "Il y a 5 h · Si ce n'est pas toi, déconnecte-le", target: "security", group: "Aujourd'hui" },
  { id: "n3", icon: KeyRound, tone: "green", title: "Gabon Connect a accédé à ton profil", sub: "09:14 · Autorisation active", target: "security", group: "Aujourd'hui" },
  { id: "n4", icon: Clock, tone: "blue", title: "Ton dossier de vérification est en revue", sub: "Mardi · Délai moyen 24 h", target: "kyc", group: "Cette semaine" },
  { id: "n5", icon: HeartPulse, tone: "neutral", title: "Ta carte CNAMGS expire dans 90 jours", sub: "Lundi · iCarte", target: "icarte", group: "Cette semaine" },
]

function NotificationsScreen({ go }: ScreenProps) {
  const [unread, setUnread] = useState(["n1", "n2", "n3"])

  return (
    <div className={s.screen}>
      <AppBar
        title="Notifications"
        onBack={() => go("home")}
        right={
          <button type="button" className={s.linkSmall} onClick={() => setUnread([])} disabled={unread.length === 0}>
            Tout lire
          </button>
        }
      />
      <div className={s.body}>
        {["Aujourd'hui", "Cette semaine"].map((group) => (
          <section key={group} aria-label={group}>
            <h2 className={s.overline}>{group}</h2>
            <ul className={s.card}>
              {NOTIFS.filter((n) => n.group === group).map((n) => {
                const isUnread = unread.includes(n.id)
                return (
                  <li key={n.id}>
                    <Row
                      icon={n.icon}
                      tone={n.tone}
                      strong={isUnread}
                      title={
                        <>
                          {isUnread ? <span className={s.unreadDot} aria-hidden /> : null}
                          {n.title}
                          {isUnread ? <span className={s.srOnly}> (non lue)</span> : null}
                        </>
                      }
                      sub={n.sub}
                      right={<Chevron />}
                      onClick={() => go(n.target)}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

// ─── 13. Sécurité et profil ───

const DEVICES = [
  { id: "d1", icon: Smartphone, name: "iPhone 15 · cet appareil", sub: "Libreville · actif maintenant", current: true },
  { id: "d2", icon: Laptop, name: "MacBook Air · Safari", sub: "Libreville · il y a 2 h", current: false },
  { id: "d3", icon: Tablet, name: "iPad · application IDN", sub: "Port-Gentil · il y a 5 h", current: false },
]

const APPS = [
  { id: "gc", name: "Gabon Connect", sub: "Profil, NIP, adresse IDN" },
  { id: "cnamgs", name: "CNAMGS", sub: "Profil, NIP" },
]

function SecurityScreen({ go, notify, demo, update }: ScreenProps) {
  const [devices, setDevices] = useState(DEVICES)
  const [apps, setApps] = useState(APPS)
  const [faceId, setFaceId] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className={s.screen}>
      <AppBar title="Sécurité et profil" />
      <div className={s.body}>
        <div className={s.profileHead}>
          <span className={`${s.avatar} ${s.avatarLarge}`} aria-hidden>
            {USER.initials}
          </span>
          <div className={s.grow}>
            <p className={s.homeName}>Awa Mboumba</p>
            <p className={s.rowSub}>{USER.email}</p>
            <LevelBadge level={demo.level} />
          </div>
        </div>

        <SectionTitle>Identité</SectionTitle>
        <ul className={s.card}>
          <li>
            <Row icon={Hash} title="NIP" sub={<span className={s.mono}>{USER.nipMasked}</span>} right={<Chevron />} onClick={() => go("idcard")} />
          </li>
          <li>
            <Row icon={Smartphone} title="Téléphone" sub={USER.phone} />
          </li>
          <li>
            <Row icon={MapPin} title="Résidence" sub="Libreville, Estuaire" />
          </li>
        </ul>

        <SectionTitle>Connexion</SectionTitle>
        <ul className={s.card}>
          <li className={s.row}>
            <span className={`${s.rowIcon} ${s.tone_neutral}`} aria-hidden>
              <ScanFace size={18} />
            </span>
            <span className={s.rowText}>
              <span className={s.rowTitle} id="faceid-label">
                Face ID
              </span>
              <span className={s.rowSub}>Passkey enregistrée sur cet iPhone</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={faceId}
              aria-labelledby="faceid-label"
              className={s.switch}
              onClick={() => setFaceId((v) => !v)}
            >
              <span className={s.switchThumb} />
            </button>
          </li>
          <li>
            <Row icon={KeyRound} title="Passkeys" sub="2 clés · iPhone 15, MacBook Air" right={<Chevron />} onClick={() => notify("Passkeys : iPhone 15 et MacBook Air.")} />
          </li>
          <li>
            <Row icon={Lock} title="Changer le code PIN" right={<Chevron />} onClick={() => go("login")} />
          </li>
          <li>
            <Row icon={Smartphone} title="Changer de téléphone" sub="Transfère ton identité sur un nouvel appareil" right={<Chevron />} onClick={() => notify("Changement de téléphone : un code est envoyé au numéro actuel.")} />
          </li>
        </ul>

        <SectionTitle>Appareils et sessions</SectionTitle>
        <ul className={s.card}>
          {devices.map((d) => (
            <li key={d.id}>
              <Row
                icon={d.icon}
                tone={d.current ? "green" : "neutral"}
                title={d.name}
                sub={d.sub}
                right={
                  d.current ? null : (
                    <button
                      type="button"
                      className={s.linkSmall}
                      onClick={() => {
                        setDevices((list) => list.filter((x) => x.id !== d.id))
                        notify(`${d.name} déconnecté.`)
                      }}
                    >
                      Déconnecter
                    </button>
                  )
                }
              />
            </li>
          ))}
        </ul>

        <SectionTitle>Applications autorisées</SectionTitle>
        <ul className={s.card}>
          {apps.length === 0 ? (
            <li className={s.emptyRow}>Aucune application n&apos;a accès à tes données.</li>
          ) : (
            apps.map((a) => (
              <li key={a.id}>
                <Row
                  icon={Building2}
                  title={a.name}
                  sub={a.sub}
                  right={
                    <button
                      type="button"
                      className={s.linkDanger}
                      onClick={() => {
                        setApps((list) => list.filter((x) => x.id !== a.id))
                        notify(`Accès de ${a.name} révoqué.`)
                      }}
                    >
                      Révoquer
                    </button>
                  }
                />
              </li>
            ))
          )}
        </ul>

        <SectionTitle>Démonstration</SectionTitle>
        <div className={s.card}>
          <Row
            icon={RotateCcw}
            title="Réinitialiser la démo"
            sub={
              demo.level === 3
                ? "Revenir au Niveau 2 pour rejouer l'entretien vidéo"
                : "La démo est au Niveau 2, état de départ"
            }
            right={<Chevron />}
            onClick={() => {
              update(DEMO_START)
              notify("Démo réinitialisée : retour au Niveau 2.")
            }}
          />
        </div>

        <div className={s.dangerZone}>
          <button type="button" className={s.ghost} onClick={() => go("login")}>
            <LogOut size={18} aria-hidden />
            Se déconnecter
          </button>
          {confirmDelete ? (
            <div className={s.confirmBox} role="alert">
              <p className={s.rowTitle}>Supprimer ton compte IDN ?</p>
              <p className={s.rowSub}>
                Ton identité numérique, tes cartes et ton coffre-fort seront effacés après un délai de
                30 jours.
              </p>
              <div className={s.buttonPair}>
                <button type="button" className={s.ghost} onClick={() => setConfirmDelete(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className={s.danger}
                  onClick={() => {
                    setConfirmDelete(false)
                    notify("Maquette : la suppression n'est pas exécutée.")
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={s.dangerGhost} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} aria-hidden />
              Supprimer le compte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
