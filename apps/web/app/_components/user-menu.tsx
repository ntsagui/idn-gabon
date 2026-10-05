"use client"

import * as React from "react"
import Link from "next/link"
import {
  FileSignatureIcon,
  FolderIcon,
  HomeIcon,
  InboxIcon,
  LogOutIcon,
  ShieldCheckIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react"

import { Avatar } from "@repo/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { cn } from "@repo/ui/lib/utils"

import { authClient } from "@/lib/auth-client"
import { clearLastAccount } from "@/lib/citizen/last-account"

type UserMenuUser = {
  email: string
  profile?: {
    pivot?: {
      firstName: string
      lastName: string
    } | null
    photoUrl?: string | null
  } | null
}

type UserMenuProps = {
  user: UserMenuUser
  className?: string
  triggerLabel?: string
}

export function UserMenu({ user, className, triggerLabel }: UserMenuProps) {
  const firstName = user.profile?.pivot?.firstName
  const lastName = user.profile?.pivot?.lastName
  const photoUrl = user.profile?.photoUrl ?? null
  const fullName =
    firstName && lastName ? `${firstName} ${lastName}` : user.email
  const ariaLabel = triggerLabel ?? `Compte de ${fullName}`

  const handleSignOut = async () => {
    // Comme « Se déconnecter » du Profil : l'accueil par le prénom est oublié.
    clearLastAccount()
    try {
      await authClient.signOut()
    } catch {
      // Réseau coupé : le client efface quand même la session locale ; on
      // quitte la page dans tous les cas plutôt que de laisser le menu figé.
    }
    window.location.href = "/"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            className,
          )}
        >
          <Avatar
            firstName={firstName}
            lastName={lastName}
            src={photoUrl}
            size={36}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {fullName}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <HomeIcon aria-hidden="true" />
            <span>Tableau de bord</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/icarte">
            <WalletIcon aria-hidden="true" />
            <span>iCarte</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/iboite">
            <InboxIcon aria-hidden="true" />
            <span>iBoîte</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/idoc">
            <FolderIcon aria-hidden="true" />
            <span>iDocument</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/icv">
            <FileSignatureIcon aria-hidden="true" />
            <span>Mon CV (iCV)</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon aria-hidden="true" />
            <span>Sécurité et profil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/consents">
            <ShieldCheckIcon aria-hidden="true" />
            <span>Apps autorisées</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOutIcon aria-hidden="true" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
