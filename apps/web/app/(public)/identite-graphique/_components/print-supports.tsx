"use client"

import { useState, type ReactNode } from "react"
import {
  Check,
  Fingerprint,
  KeyRound,
  RotateCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"

import s from "./print-supports.module.css"

/* Bande MRZ au format TD1 (3 × 30 caractères), chiffres de contrôle
   calculés selon l'OACI 9303 — données fictives. */
const MRZ = [
  "I<GABAM9000458619900312004587<",
  "9003129F3603125GAB<<<<<<<<<<<3",
  "MBOUMBA<<AWA<<<<<<<<<<<<<<<<<<",
]

const FOREST = "#08271B"

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ")
}

/* Barres du drapeau : composant de marque sur fond clair ; sur fond vert,
   la barre verte passe en blanc pour rester lisible. */
function Flag({ onGreen, className }: { onGreen?: boolean; className?: string }) {
  if (onGreen) {
    return (
      <div role="img" aria-label="Drapeau du Gabon" className={cx(s.flag, s.flagOnGreen, className)}>
        <span />
        <span />
        <span />
      </div>
    )
  }
  // Dimensions neutralisées en ligne : la feuille de style les fixe en cqw.
  return <IdnFlagBars className={cx(s.flag, className)} style={{ width: undefined, height: undefined }} />
}

function Showcase({
  title,
  format,
  usage,
  children,
}: {
  title: string
  format: string
  usage: string
  children: ReactNode
}) {
  return (
    <figure className={s.showcase}>
      <div className={s.stage}>{children}</div>
      <figcaption className={s.caption}>
        <h3 className={s.captionTitle}>{title}</h3>
        <p className={s.captionFormat}>{format}</p>
        <p className={s.captionUsage}>{usage}</p>
      </figcaption>
    </figure>
  )
}

function IdCard() {
  const [flipped, setFlipped] = useState(false)
  const toggle = () => setFlipped((v) => !v)

  return (
    <div className={s.idWrap}>
      <div className={cx(s.flipper, flipped && s.flipped)} onClick={toggle}>
        <div className={s.flipInner}>
          <div className={cx(s.face, s.recto)} aria-hidden={flipped}>
            <div className={s.rectoBand}>
              <IdnMark aria-hidden className={cx(s.rectoMark, s.inv)} />
              <span>République gabonaise · Identité numérique</span>
            </div>
            <Flag className={s.rectoFlag} />
            <div className={s.rectoBody}>
              <Fingerprint aria-hidden className={s.watermark} strokeWidth={1.2} />
              <div className={s.rectoAside}>
                <div className={s.photo}>AM</div>
                <div className={s.chip} aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className={s.rectoMain}>
                <dl className={s.fields}>
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
                    <dd>12.03.1990 à Libreville</dd>
                  </div>
                  <div>
                    <dt>NIP</dt>
                    <dd className={s.mono}>1990 0312 0045 87</dd>
                  </div>
                </dl>
                <div className={s.rectoFoot}>
                  <span className={s.level}>Garantie élevée</span>
                  <span className={s.expiry}>Expire le 12.03.2036</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cx(s.face, s.verso)} aria-hidden={!flipped}>
            <div className={s.versoTop}>
              <div className={s.versoQr}>
                <QRCodeSVG
                  value="https://identite.ga/v/AM90-0045-87"
                  size={256}
                  level="M"
                  marginSize={0}
                  fgColor="#16170F"
                  title="QR code de vérification de la carte"
                  className={s.qrSvg}
                />
              </div>
              <div className={s.versoText}>
                <p className={s.versoLabel}>Vérification en ligne</p>
                <p className={s.versoUrl}>identite.ga/v/AM90-0045-87</p>
                <p className={s.versoNotice}>
                  Cette carte est la propriété de l&apos;État gabonais. En cas de perte, signale-la sur identite.ga.
                </p>
                <p className={s.versoAuthority}>Délivrée le 12.03.2026 par la DGDI · Libreville</p>
              </div>
              <IdnMark aria-hidden className={s.versoMark} />
            </div>
            <div className={s.mrz}>
              {MRZ.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={s.flipBar}>
        <button type="button" className={s.flipButton} aria-pressed={flipped} onClick={toggle}>
          <RotateCw aria-hidden className={s.flipIcon} />
          Retourner la carte
        </button>
        <span className={s.flipState} aria-live="polite">
          {flipped ? "Verso" : "Recto"}
        </span>
      </div>
    </div>
  )
}

function Poster() {
  return (
    <div className={s.cropFrame}>
      <span className={cx(s.crop, s.cropTl)} aria-hidden />
      <span className={cx(s.crop, s.cropTr)} aria-hidden />
      <span className={cx(s.crop, s.cropBl)} aria-hidden />
      <span className={cx(s.crop, s.cropBr)} aria-hidden />
      <div className={s.poster}>
        <div className={s.posterTop}>
          <span>Campagne nationale · 2026</span>
          <span className={s.mono}>identite.ga</span>
        </div>
        <p className={s.posterTitle}>
          Ton identité.
          <span>Ta clé.</span>
        </p>
        <p className={s.posterLead}>
          Un compte unique, délivré par l&apos;État, pour prouver qui tu es en ligne comme au guichet.
        </p>
        <ul className={s.benefits}>
          <li>
            <span className={s.benefitIcon}>
              <ShieldCheck aria-hidden />
            </span>
            Reconnue par l&apos;État
          </li>
          <li>
            <span className={s.benefitIcon}>
              <KeyRound aria-hidden />
            </span>
            Un code, tous tes services
          </li>
          <li>
            <span className={s.benefitIcon}>
              <Smartphone aria-hidden />
            </span>
            Ta carte dans ton téléphone
          </li>
        </ul>
        <div className={s.posterSpacer} />
        <div className={s.posterQrRow}>
          <div className={s.posterQr}>
            <QRCodeSVG
              value="https://identite.ga/app"
              size={256}
              level="M"
              marginSize={0}
              fgColor={FOREST}
              title="QR code de téléchargement de l'application IDN"
              className={s.qrSvg}
            />
          </div>
          <div>
            <p className={s.posterQrTitle}>Télécharge l&apos;app</p>
            <p className={s.posterQrUrl}>identite.ga/app</p>
            <p className={s.posterQrNote}>Android et iOS · gratuit</p>
          </div>
        </div>
        <div className={s.posterSign}>
          <IdnMark aria-hidden className={cx(s.posterMark, s.inv)} />
          <div className={s.posterSignText}>
            <span>Identité Numérique</span>
            <span>République Gabonaise</span>
          </div>
          <p className={s.posterLegal}>
            Réf. IDN-CAMP-A3-01
            <br />
            Ne pas jeter sur la voie publique
          </p>
        </div>
        <Flag onGreen className={s.posterFlag} />
      </div>
    </div>
  )
}

const STEPS = [
  { n: 1, title: "Présente ta pièce", hint: "CNI, passeport ou acte de naissance" },
  { n: 2, title: "Selfie", hint: "Photo prise sur place" },
  { n: 3, title: "Code PIN", hint: "Tu le choisis, il reste secret" },
  { n: 4, title: "Ton compte est actif", hint: "Utilisable immédiatement" },
]

function Kakemono() {
  return (
    <div className={s.kakeWrap}>
      <div className={s.kakemono}>
        <div className={s.kakeHead}>
          <IdnMark aria-hidden className={cx(s.kakeMark, s.inv)} />
          <p className={s.kakeKicker}>Identité Numérique du Gabon</p>
          <p className={s.kakeTitle}>Point d&apos;enrôlement IDN</p>
        </div>
        <Flag className={s.kakeFlag} />
        <ol className={s.steps}>
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className={s.stepNum}>{step.n}</span>
              <span>
                <span className={s.stepTitle}>{step.title}</span>
                <span className={s.stepHint}>{step.hint}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className={s.hours}>
          <p className={s.hoursLabel}>Horaires</p>
          <p>Lun. – ven. · 7 h 30 – 15 h 30</p>
          <p>Sam. · 8 h – 12 h</p>
        </div>
        <div className={s.kakeSpacer} />
        <p className={s.free}>
          <Check aria-hidden />
          Service gratuit
        </p>
        <div className={s.kakeFoot}>
          <span className={s.mono}>identite.ga</span>
          <span>République Gabonaise</span>
        </div>
      </div>
      <div className={s.kakeBase} aria-hidden />
    </div>
  )
}

function AgentBadge() {
  return (
    <div className={s.badge}>
      <span className={s.badgeSlot} aria-hidden />
      <div className={s.badgeHead}>
        <IdnMark aria-hidden className={s.badgeMark} />
        <div className={s.badgeHeadText}>
          <span>Identité Numérique</span>
          <span>République Gabonaise</span>
        </div>
      </div>
      <div className={s.badgePhoto}>ON</div>
      <p className={s.badgeName}>Agent Ondo Nzé</p>
      <p className={s.badgeRole}>Contrôleur d&apos;identité · DGDI</p>
      <p className={s.badgeId}>MAT. DGDI-CTL-04218</p>
      <p className={s.badgeBand}>Habilité niveau 3</p>
      <div className={s.badgeQrRow}>
        <div className={s.badgeQr}>
          <QRCodeSVG
            value="https://identite.ga/agent/DGDI-CTL-04218"
            size={256}
            level="M"
            marginSize={0}
            fgColor="#16170F"
            title="QR code de vérification de l'agent"
            className={s.qrSvg}
          />
        </div>
        <div>
          <p className={s.badgeQrTitle}>Vérifie cet agent</p>
          <p className={s.badgeQrNote}>Scanne le code : sa fiche officielle s&apos;affiche sur identite.ga.</p>
          <p className={s.badgeValid}>Valable jusqu&apos;au 31.12.2027</p>
        </div>
      </div>
    </div>
  )
}

function WindowSticker() {
  return (
    <div className={s.sticker}>
      <IdnMark aria-hidden className={cx(s.stickerMark, s.inv)} />
      <p className={s.stickerTitle}>
        Ici,
        <br />
        connecte-toi
        <br />
        avec IDN
      </p>
      <div className={s.stickerSpacer} />
      <Flag onGreen className={s.stickerFlag} />
      <div className={s.stickerFoot}>
        <span>Partenaire officiel</span>
        <span className={s.mono}>identite.ga</span>
      </div>
    </div>
  )
}

function Stationery() {
  return (
    <div className={s.stationery}>
      <div className={s.envelope}>
        <div className={s.envSign}>
          <IdnMark aria-hidden className={s.envMark} />
          <div className={s.envSignText}>
            <span>Identité Numérique</span>
            <span>République Gabonaise</span>
          </div>
        </div>
        <Flag className={s.envFlag} />
        <p className={s.envReturn}>BP 2026 · Libreville · Gabon</p>
        <p className={s.envPostage}>
          Port payé
          <br />
          Gabon
        </p>
        <div className={s.envWindow}>
          <p>Madame Awa MBOUMBA</p>
          <p>BP 4521 · Quartier Louis</p>
          <p>LIBREVILLE</p>
          <p>GABON</p>
        </div>
        <p className={s.envLegal}>Si non distribuable, retour à l&apos;expéditeur</p>
      </div>

      <div className={s.bizRow}>
        <div>
          <div className={cx(s.biz, s.bizFront)}>
            <div className={s.bizTop}>
              <div>
                <p className={s.bizName}>Lucien Ndong</p>
                <p className={s.bizRole}>Responsable des partenariats</p>
              </div>
              <IdnMark aria-hidden className={s.bizMark} />
            </div>
            <div className={s.bizContact}>
              <p>+241 01 76 45 12</p>
              <p>l.ndong@idn.ga</p>
            </div>
            <Flag className={s.bizFlag} />
          </div>
          <p className={s.faceLabel}>Recto</p>
        </div>
        <div>
          <div className={cx(s.biz, s.bizBack)}>
            <IdnMark aria-hidden className={cx(s.bizBackMark, s.inv)} />
            <p className={s.bizBackName}>Identité Numérique</p>
            <p className={s.bizBackUrl}>identite.ga</p>
            <Flag onGreen className={s.bizBackFlag} />
          </div>
          <p className={s.faceLabel}>Verso</p>
        </div>
      </div>
    </div>
  )
}

export function PrintSupports() {
  return (
    <div className={s.root}>
      <Showcase
        title="Carte IDN physique"
        format="ID-1 · 85,6 × 54 mm · polycarbonate"
        usage="Titre remis après l'enrôlement. Le QR du verso ouvre la vérification en ligne."
      >
        <IdCard />
      </Showcase>
      <Showcase
        title="Affiche de campagne"
        format="A3 portrait · 297 × 420 mm"
        usage="Lancement national : mairies, gares, universités, administrations."
      >
        <Poster />
      </Showcase>
      <Showcase
        title="Kakemono de guichet"
        format="Roll-up · 85 × 200 cm"
        usage="Signalétique des points d'enrôlement, lisible à cinq mètres."
      >
        <Kakemono />
      </Showcase>
      <Showcase
        title="Badge d'agent contrôleur"
        format="CR80 portrait · 54 × 85,6 mm"
        usage="Porté de façon visible. Le QR permet à chaque citoyen de vérifier l'agent."
      >
        <AgentBadge />
      </Showcase>
      <Showcase
        title="Vitrophanie partenaire"
        format="Adhésif découpé · 15 × 15 cm"
        usage="Vitrine ou comptoir des partenaires qui acceptent la connexion IDN."
      >
        <WindowSticker />
      </Showcase>
      <Showcase
        title="Papeterie"
        format="Enveloppe DL 220 × 110 mm · carte de visite 85 × 55 mm"
        usage="Courriers officiels et correspondance des équipes IDN."
      >
        <Stationery />
      </Showcase>
    </div>
  )
}
