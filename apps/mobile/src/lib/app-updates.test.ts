import { describe, expect, it, vi } from "vitest"
import { prepareAppUpdate } from "./app-updates"

function client(available = true, rollback = false) {
  return {
    checkForUpdateAsync: vi
      .fn()
      .mockResolvedValue({
        isAvailable: available,
        isRollBackToEmbedded: rollback,
      }),
    fetchUpdateAsync: vi
      .fn()
      .mockResolvedValue({ isNew: available, isRollBackToEmbedded: rollback }),
  }
}

describe("prepareAppUpdate", () => {
  it("ne télécharge rien si aucune mise à jour n’est disponible", async () => {
    const api = client(false)
    const downloading = vi.fn()
    expect(await prepareAppUpdate(api, downloading)).toBe("current")
    expect(api.fetchUpdateAsync).not.toHaveBeenCalled()
    expect(downloading).not.toHaveBeenCalled()
  })

  it("attend la fin du téléchargement avant de proposer le redémarrage", async () => {
    const api = client()
    let finish!: (value: {
      isNew: boolean
      isRollBackToEmbedded: boolean
    }) => void
    api.fetchUpdateAsync.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const downloading = vi.fn()
    const done = vi.fn()
    const result = prepareAppUpdate(api, downloading).then(done)
    await vi.waitFor(() => expect(downloading).toHaveBeenCalledOnce())
    expect(done).not.toHaveBeenCalled()
    finish({ isNew: true, isRollBackToEmbedded: false })
    await result
    expect(done).toHaveBeenCalledWith("ready")
  })

  it("prend en charge un retour à la version embarquée", async () => {
    expect(await prepareAppUpdate(client(false, true), vi.fn())).toBe("ready")
  })

  it("ne propose pas d’installation après un échec réseau", async () => {
    const api = client()
    api.fetchUpdateAsync.mockRejectedValue(new Error("offline"))
    await expect(prepareAppUpdate(api, vi.fn())).rejects.toThrow("offline")
  })

  it("ne considère pas un téléchargement vide comme prêt", async () => {
    const api = client()
    api.fetchUpdateAsync.mockResolvedValue({
      isNew: false,
      isRollBackToEmbedded: false,
    })
    await expect(prepareAppUpdate(api, vi.fn())).rejects.toThrow(
      "not downloaded",
    )
  })
})
