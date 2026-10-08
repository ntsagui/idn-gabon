import React from 'react';
import {
  Activity, Archive, ArrowRight, Baby, BadgeCheck, Bell, Briefcase, Building2, Bus, CalendarCheck, CalendarDays, CalendarPlus,
  Camera, Car, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, Copy, CreditCard,
  Delete, Download, Ellipsis, Eye, EyeOff, FileText, FileUser, Fingerprint, Flag, Flashlight, Folder, FolderOpen,
  Forward, Gift, Globe, GraduationCap, Grid2x2, GripVertical, Hash, HeartPulse, House, IdCard, Image, Inbox, KeyRound,
  Landmark, Laptop, LayoutGrid, Link, Lock, LogIn, LogOut, Mail, Mailbox, MapPin, Menu, MessageCircle, Mic, MicOff, Minus,
  Package, Palette, Paperclip, PenLine, PhoneOff, Plane, Plus, Printer, QrCode, RefreshCw, Reply, RotateCcw,
  RotateCw, Scale, ScanFace, ScanLine, ScrollText, Search, Send, Settings, Share2, Shield, ShieldCheck, Smartphone,
  Sparkles, Star, SwitchCamera, Tablet, Trash2, Truck, Upload, User, UserPlus, UserRound, Users, Video, VideoOff,
  Vote, WalletCards, Wifi, X, type LucideIcon,
} from 'lucide-react-native';

/**
 * Icônes de la charte : Lucide, trait 1,8 px (aligné sur le sceau IDN).
 * Les noms historiques de l'app sont conservés et pointent vers leur
 * équivalent Lucide ; les noms du prototype sont ajoutés à la suite.
 */
const ICONS = {
  // Base set historique
  user: User, userPlus: UserPlus, login: LogIn, mail: Mail, lock: Lock, shield: ShieldCheck, check: Check,
  arrow: ChevronRight, arrowL: ChevronLeft, doc: FileText, camera: Camera, qr: QrCode, bell: Bell, link: Link,
  search: Search, plus: Plus, more: Ellipsis, copy: Copy, eye: Eye, home: House, grid: LayoutGrid, activity: Activity,
  torch: Flashlight, gridSm: Grid2x2, flip: SwitchCamera, face: ScanFace, pin: Hash,
  wallet: WalletCards, cc: CreditCard, car: Car, bus: Bus, heart: HeartPulse, briefcase: Briefcase, globe: Globe,
  vote: Vote, gift: Gift, users: Users, flag: Flag, palette: Palette,
  edit: PenLine, trash: Trash2, grip: GripVertical, eyeOff: EyeOff, rotate: RotateCw, share: Share2, download: Download,
  mail2: Mail, package: Package, chat: MessageCircle, pinLoc: MapPin, chevDn: ChevronDown, star: Star, starO: Star,
  inbox: Inbox, send: Send, clock: Clock, reply: Reply, forward: Forward, printer: Printer, archive: Archive,
  truck: Truck, paper: Paperclip, building: Building2, alert: CircleAlert,
  baby: Baby, cap: GraduationCap, file: FileText, folderO: Folder, upload: Upload, sparkles: Sparkles, scale: Scale,
  checkCir: CircleCheck, seal: Fingerprint,
  close: X, minus: Minus, calendar: CalendarDays, mic: Mic,
  // Prototype de la charte
  idCard: IdCard, mailbox: Mailbox, fileUser: FileUser, scanLine: ScanLine, scanFace: ScanFace, keyRound: KeyRound,
  logOut: LogOut, landmark: Landmark, laptop: Laptop, tablet: Tablet, smartphone: Smartphone, micOff: MicOff,
  video: Video, videoOff: VideoOff, phoneOff: PhoneOff, plane: Plane, refresh: RefreshCw, rotateCcw: RotateCcw,
  scrollText: ScrollText, wifi: Wifi, delete: Delete, calendarCheck: CalendarCheck, calendarPlus: CalendarPlus,
  userRound: UserRound, folder: Folder, folderOpen: FolderOpen, arrowRight: ArrowRight, shieldPlain: Shield,
  settings: Settings, fingerprint: Fingerprint,
  // iBoîte (maquette Gmail)
  menu: Menu, image: Image, badgeCheck: BadgeCheck,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number; filled?: boolean };

export function Icon({ name, size = 20, color = '#000', strokeWidth = 1.8, filled }: Props) {
  const C = ICONS[name];
  return <C size={size} color={color} strokeWidth={strokeWidth} fill={filled || name === 'star' ? color : 'none'} />;
}
