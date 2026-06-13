/**
 * Devotional icon set — clean lucide line icons under meaningful names so the
 * app reads consistently and we never scatter raw emoji in the UI again.
 */
import {
  LayoutDashboard,
  Users,
  Network,
  Inbox,
  CalendarDays,
  BarChart3,
  Milestone,
  ListChecks,
  Sparkles,
  Flame,
  BookOpen,
  Sunrise,
  Moon,
  Headphones,
  Phone,
  MessageCircle,
  Mail,
  Smartphone,
  Home,
  HandHeart,
  QrCode,
  UserPlus,
  UserCheck,
  LogOut,
  ChevronRight,
  Check,
  Flower2,
  Heart,
  Star,
  Bell,
  Clock,
  Download,
  Plus,
  Minus,
  type LucideIcon,
} from "lucide-react";

export type { LucideIcon };

export const Icon = {
  // navigation
  dashboard: LayoutDashboard,
  devotees: Users,
  hierarchy: Network,
  applications: Inbox,
  sessions: CalendarDays,
  reports: BarChart3,
  levels: Milestone, // path/levels marker (the lotus-feet emblem is used in prominent spots)
  attendance: ListChecks,
  sadhana: Sparkles,
  followups: Phone,
  group: Users,
  apply: UserPlus,
  invite: QrCode,

  // sadhana / devotional
  japa: Sparkles,
  streak: Flame,
  reading: BookOpen,
  mangalArati: Sunrise,
  eveningArati: Moon,
  lecture: Headphones,
  lotus: Flower2,
  heart: Heart,
  star: Star,
  bliss: Sparkles,

  // follow-up channels
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  sms: Smartphone,
  homeVisit: Home,
  inPerson: HandHeart,

  // actions / status
  claim: UserCheck,
  signOut: LogOut,
  chevron: ChevronRight,
  check: Check,
  bell: Bell,
  clock: Clock,
  download: Download,
  plus: Plus,
  minus: Minus,
} as const;

export type IconName = keyof typeof Icon;

/** Map a FollowUpChannel enum value to its icon + friendly label. */
export const channelMeta: Record<string, { icon: LucideIcon; label: string }> = {
  PHONE_CALL: { icon: Phone, label: "Phone call" },
  WHATSAPP: { icon: MessageCircle, label: "WhatsApp" },
  EMAIL: { icon: Mail, label: "Email" },
  SMS: { icon: Smartphone, label: "SMS" },
  HOME_VISIT: { icon: Home, label: "Home visit" },
  IN_PERSON: { icon: HandHeart, label: "In person" },
  OTHER: { icon: MessageCircle, label: "Other" },
};

// The lotus brand mark/illustration now live in src/components/lotus.tsx
// (real artwork). Icon.lotus (Flower2) remains for generic inline glyph use.
