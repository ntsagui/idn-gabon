"use client";

import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

import { IdnLottie } from "@/app/_components/idn/lottie";

import { PreferenceSync } from "./_components/account/preference-sync";
import { CitizenShell } from "./_components/citizen-shell";
import { PwaBootstrap } from "../_components/pwa-bootstrap";

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // La query est conservée (`/kyc?return_to=…&target=3`, liens d'e-mail) :
      // après reconnexion, la personne reprend exactement où elle était.
      const here = `${pathname || "/dashboard"}${window.location.search}`;
      router.replace(`/sign-in?redirect_to=${encodeURIComponent(here)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-idn-bg">
        <IdnLottie name="loader" size={64} label="Chargement de ton espace" />
      </div>
    );
  }

  return (
    <>
      <CitizenShell>{children}</CitizenShell>
      <PreferenceSync />
      <PwaBootstrap />
    </>
  );
}
