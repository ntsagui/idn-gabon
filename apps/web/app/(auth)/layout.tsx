import { AuthAside } from "./_components/auth-aside"

/**
 * Écrans d'accès (connexion, inscription, PIN oublié…).
 *
 * - Téléphone (< md) : plein écran, chaque page pose son `AppBar` comme
 *   l'app mobile.
 * - Grand écran (≥ md) : colonne verte à gauche (prototype web), parcours
 *   centré à droite.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-idn-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-idn-green focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>
      <AuthAside className="hidden md:flex" />
      <main id="main" className="flex min-h-svh min-w-0 flex-1 flex-col md:items-center md:justify-center md:px-8 md:py-10">
        {children}
      </main>
    </div>
  )
}
