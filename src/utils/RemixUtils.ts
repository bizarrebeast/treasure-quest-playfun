/**
 * Play.fun SDK Integration for Bizarre Underground
 * Replaces the original Farcade SDK integration
 */

let playfunSDK: any = null

export async function initPlayFunSDK(gameId: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (window as any).OpenGameSDK) {
      playfunSDK = new (window as any).OpenGameSDK({
        gameId,
        ui: { usePointsWidget: true },
      })
      await playfunSDK.init()
      console.log('[PlayFun] SDK initialized')
    } else {
      console.warn('[PlayFun] OpenGameSDK not found on window')
    }
  } catch (e) {
    console.warn('[PlayFun] SDK init failed:', e)
  }
}

export function reportGameOver(score: number): void {
  if (playfunSDK) {
    try {
      playfunSDK.addPoints(score)
      playfunSDK.savePoints()
      console.log('[PlayFun] Score reported:', score)
    } catch (e) {
      console.warn('[PlayFun] Score report failed:', e)
    }
  } else {
    console.log('[PlayFun] SDK not available, score not reported:', score)
  }
}
