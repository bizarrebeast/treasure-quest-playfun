/**
 * SharedAssetManager - Coordinates asset preloading between scenes
 * Allows InstructionsScene to preload GameScene assets in the background
 */

export interface PreloadAsset {
  key: string
  url: string
  type: 'image' | 'audio'
}

export class SharedAssetManager {
  private static preloadedAssets: Set<string> = new Set()
  private static loadingAssets: Set<string> = new Set()
  
  /**
   * Mark an asset as successfully preloaded
   */
  static markAsPreloaded(key: string): void {
    this.preloadedAssets.add(key)
    this.loadingAssets.delete(key)
    console.log(`✅ Asset preloaded: ${key}`)
  }
  
  /**
   * Mark an asset as currently loading
   */
  static markAsLoading(key: string): void {
    this.loadingAssets.add(key)
  }
  
  /**
   * Check if an asset has been preloaded
   */
  static isPreloaded(key: string): boolean {
    return this.preloadedAssets.has(key)
  }
  
  /**
   * Check if an asset is currently loading
   */
  static isLoading(key: string): boolean {
    return this.loadingAssets.has(key)
  }
  
  /**
   * Get count of preloaded assets
   */
  static getPreloadedCount(): number {
    return this.preloadedAssets.size
  }
  
  /**
   * Clear all tracking (useful for scene restarts)
   */
  static clear(): void {
    this.preloadedAssets.clear()
    this.loadingAssets.clear()
  }
  
  /**
   * Get critical assets that should be preloaded during instructions
   * These are the most important assets for initial gameplay
   */
  static getCriticalAssets(): PreloadAsset[] {
    return [
      // Visibility system (required for gameplay)
      {
        key: 'visibilityOverlay',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/black%20overlay-aQ9bbCj7ooLaxsRl5pO9PxSt2SsWun.png?0nSO',
        type: 'image'
      },
      
      // Chapter 1 background (first thing player sees)
      {
        key: 'background-treasure-quest-5',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Treasure%20Quest%20BG%205-pVHhUmXIAvnZT4aFVRFgYvljKibVS0.png?qco1',
        type: 'image'
      },
      
      // Player idle animations (immediately visible)
      {
        key: 'playerIdleEye1',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/Idle%20eye%20position%201-p01pa3z9fL9AyLQolMuYyBO3DIqgvB.png?FaaG',
        type: 'image'
      },
      {
        key: 'playerIdleEye2',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/Idle%20eye%20position%202-ngx0e1EF33iY14vRpcSvy8QOUjMKnl.png?lsFE',
        type: 'image'
      },
      
      // Floor tiles (needed for platforms)
      {
        key: 'floor-tile-1',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%201-jbZVv42Z0BQYmH6sJLCOBTJs4op2eT.png?mhnt',
        type: 'image'
      },
      {
        key: 'floor-tile-2',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%202-EuITFMsdSDebMUmfcikeKCDLqDupml.png?C2mi',
        type: 'image'
      },
      {
        key: 'floor-tile-3',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%203-EBjnmTXXufdUFEuzmfnGnaZX4zdI2C.png?69bT',
        type: 'image'
      },
      
      // Essential UI elements
      {
        key: 'doorClosed',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/treasure%20quest%20door-SX8un6qHvlx4mzlRYUC77dJ4lpBmOT.png?548U',
        type: 'image'
      },
      {
        key: 'tealLadder',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/new%20ladder-ULDbdT9I4h8apxhpJI6WT1PzmaMzLo.png?okOd',
        type: 'image'
      },
      
      // Essential sounds (small files, quick to load)
      {
        key: 'gem-collect',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/regular%20gem%20collect%20sfx-OXLLrrAXWUz21oDTEuQPFb2fxRWxXh.wav?pH1V',
        type: 'audio'
      },
      {
        key: 'jump-1',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20jumping%201%20sfx-Cfx219m2NwhVClkP67iebiwcV0HiF5.wav?GDjY',
        type: 'audio'
      }
    ]
  }
  
  /**
   * Get secondary assets that can be loaded if time permits
   */
  static getSecondaryAssets(): PreloadAsset[] {
    return [
      // Additional player animations
      {
        key: 'playerRunLeftFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/running%20body%20eyes%20looking%20left%20foot%20forward-5O5kkQBPD5v2vMJvsBZrCmvWqE5PkV.png?z5EH',
        type: 'image'
      },
      {
        key: 'playerRunRightFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/running%20body%20eyes%20looking%20right%20foot%20forward-7xJdHJFy5Q9V4EhFXVqXRZo1hxKA1z.png?jd5P',
        type: 'image'
      },
      
      // Basic enemies for level 1
      {
        key: 'blueCat',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20closed-HUXqx9HBdotEhJE2LBgzK8Z4kA7e2H.png?AVKZ',
        type: 'image'
      },
      
      // More floor tiles
      {
        key: 'floor-tile-4',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%204-ecTwalLp4rzl9hegwIwVMuDBeN1YVJ.png?nxJJ',
        type: 'image'
      }
    ]
  }
}