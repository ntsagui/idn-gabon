import type { Metadata } from "next"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs"

import { pages } from "../../_content/fr"
import { PageHeader } from "../../_components/page-header"
import { AccountTab } from "./_components/account-tab"
import { PreferencesTab } from "./_components/preferences-tab"

export const metadata: Metadata = { title: pages.settings.title }

export default function ControllerSettingsPage() {
  return (
    <>
      <PageHeader kicker={pages.settings.kicker} title={pages.settings.title} description={pages.settings.description} />
      <div className="px-5 py-6 md:px-8">
        <div className="w-full max-w-[820px]">
          <Tabs defaultValue="account">
            <TabsList variant="line" className="w-full justify-start gap-1">
              <TabsTrigger value="account">Compte</TabsTrigger>
              <TabsTrigger value="preferences">Préférences</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-6">
              <AccountTab />
            </TabsContent>
            <TabsContent value="preferences" className="mt-6">
              <PreferencesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
