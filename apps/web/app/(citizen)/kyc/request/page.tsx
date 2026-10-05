import { redirect } from "next/navigation"

/** Ancienne page de suivi du dossier (liens des e-mails et notifications) : remplacée par /kyc/review. */
export default function KycRequestRedirect() {
  redirect("/kyc/review")
}
