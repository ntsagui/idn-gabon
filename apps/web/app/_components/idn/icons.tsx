import {
  Activity, Archive, ArrowRight, Bell, Briefcase, Building2, CalendarCheck, CalendarDays, CalendarPlus, Camera, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, Copy, CreditCard, Delete, Download, Ellipsis,
  Eye, EyeOff, FileText, FileUser, Fingerprint, Folder, FolderOpen, Globe, Hash, House, IdCard, Inbox, KeyRound, Landmark,
  Laptop, Link, Lock, LogIn, LogOut, Mail, Mailbox, MapPin, MessageCircle, Mic, MicOff, Monitor, Moon, Package, Palette,
  PenLine, PhoneOff, Plus, Printer, QrCode, RefreshCw, Reply, RotateCcw, Scale, ScanFace, ScanLine, ScrollText, Search,
  Send, Settings, Share2, Shield, ShieldCheck, Smartphone, Sparkles, Star, Sun, Tablet, Trash2, Upload, User, UserRound,
  Users, Video, VideoOff, WalletCards, Wifi, X, type LucideIcon,
} from "lucide-react"
import { Baby, GraduationCap, Minus } from "lucide-react"
import { Bus, Car, Flag, Forward, Gift, Heart, Paperclip, Truck, Vote } from "lucide-react"
import { Plane } from "lucide-react"

/**
 * Icônes de la charte : Lucide, trait 1,8 px. Mêmes noms que l'app mobile
 * (apps/mobile/src/design/icons.tsx) pour transposer les écrans à l'identique.
 */
const ICONS = {
  user: User, login: LogIn, mail: Mail, lock: Lock, shield: ShieldCheck, check: Check, arrow: ChevronRight,
  arrowL: ChevronLeft, doc: FileText, camera: Camera, qr: QrCode, bell: Bell, link: Link, search: Search, plus: Plus,
  more: Ellipsis, copy: Copy, eye: Eye, eyeOff: EyeOff, home: House, activity: Activity, face: ScanFace, pin: Hash,
  wallet: WalletCards, cc: CreditCard, briefcase: Briefcase, globe: Globe, users: Users, palette: Palette, edit: PenLine,
  trash: Trash2, share: Share2, download: Download, package: Package, chat: MessageCircle, pinLoc: MapPin,
  chevDn: ChevronDown, star: Star, inbox: Inbox, send: Send, clock: Clock, reply: Reply, printer: Printer,
  archive: Archive, building: Building2, alert: CircleAlert, file: FileText, upload: Upload, sparkles: Sparkles,
  scale: Scale, checkCir: CircleCheck, close: X, calendar: CalendarDays, mic: Mic, idCard: IdCard, mailbox: Mailbox,
  fileUser: FileUser, scanLine: ScanLine, scanFace: ScanFace, keyRound: KeyRound, logOut: LogOut, landmark: Landmark,
  laptop: Laptop, tablet: Tablet, smartphone: Smartphone, micOff: MicOff, video: Video, videoOff: VideoOff,
  phoneOff: PhoneOff, refresh: RefreshCw, rotateCcw: RotateCcw, scrollText: ScrollText, wifi: Wifi, delete: Delete,
  calendarCheck: CalendarCheck, calendarPlus: CalendarPlus, userRound: UserRound, folder: Folder,
  folderOpen: FolderOpen, arrowRight: ArrowRight, shieldPlain: Shield, settings: Settings, fingerprint: Fingerprint,
  sun: Sun, moon: Moon, monitor: Monitor,
  car: Car, bus: Bus, heart: Heart, gift: Gift, vote: Vote, flag: Flag, forward: Forward, paperclip: Paperclip,
  truck: Truck,
  baby: Baby, cap: GraduationCap, minus: Minus,
  plane: Plane,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
  filled,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
  filled?: boolean
}) {
  const C = ICONS[name]
  return (
    <C
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      fill={filled ? "currentColor" : "none"}
      aria-hidden
      focusable={false}
    />
  )
}
