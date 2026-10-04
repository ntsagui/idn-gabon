import type { Metadata } from "next"

import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { pages } from "../../../../_content/fr"
import { InterviewRoom } from "./interview-room"

export const metadata: Metadata = { title: pages.interview.title }

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InterviewRoom verificationId={id as Id<"level3Verification">} />
}
