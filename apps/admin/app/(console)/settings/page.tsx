"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs"

import { PageBody, PageHeader } from "../../_components/page-header"
import { AccountTab } from "./_components/account-tab"
import { PreferencesTab } from "./_components/preferences-tab"

/** Paramètres du compte administrateur : identité, mot de passe, thème. */
export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        kicker="Configuration"
        title="Paramètres"
        description="Votre compte administrateur et l'affichage de la console."
      />
      <PageBody>
        <div className="max-w-[820px]">
          <Tabs defaultValue="account">
            <TabsList variant="line" className="w-full justify-start gap-1">
              <TabsTrigger value="account">Compte</TabsTrigger>
              <TabsTrigger value="preferences">Affichage</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-6">
              <AccountTab />
            </TabsContent>
            <TabsContent value="preferences" className="mt-6">
              <PreferencesTab />
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>
    </>
  )
}
