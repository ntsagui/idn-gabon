type UpdateClient = {
  checkForUpdateAsync(): Promise<{
    isAvailable: boolean
    isRollBackToEmbedded: boolean
  }>
  fetchUpdateAsync(): Promise<{
    isNew: boolean
    isRollBackToEmbedded: boolean
  }>
}

export async function prepareAppUpdate(
  client: UpdateClient,
  onDownload: () => void,
): Promise<"current" | "ready"> {
  const result = await client.checkForUpdateAsync()
  if (!result.isAvailable && !result.isRollBackToEmbedded) return "current"
  onDownload()
  const downloaded = await client.fetchUpdateAsync()
  if (!downloaded.isNew && !downloaded.isRollBackToEmbedded) {
    throw new Error("Update was not downloaded")
  }
  return "ready"
}
