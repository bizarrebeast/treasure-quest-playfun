/**
 * Asset Pool Manager for Bizarre Underground
 * Handles efficient loading, caching, and pooling of game assets
 */

export interface AssetConfig {
  key: string
  url: string
  type: 'image' | 'audio' | 'json'
  retries?: number
  fallback?: string
}

export class AssetPool {
  private scene: Phaser.Scene
  private loadQueue: AssetConfig[] = []
  private loadedAssets: Set<string> = new Set()
  private failedAssets: Set<string> = new Set()
  private retryCount: Map<string, number> = new Map()
  private loadingPromises: Map<string, Promise<boolean>> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Register assets for pooled loading
   */
  registerAssets(assets: AssetConfig[]): void {
    this.loadQueue.push(...assets)
  }

  /**
   * Load all registered assets with retry logic and error handling
   */
  async loadAllAssets(): Promise<void> {
    const loadPromises = this.loadQueue.map(asset => this.loadAsset(asset))
    await Promise.allSettled(loadPromises)
    
    // Asset loading complete - debug info removed
  }

  /**
   * Load a single asset with retry logic
   */
  private async loadAsset(asset: AssetConfig): Promise<boolean> {
    if (this.loadingPromises.has(asset.key)) {
      return this.loadingPromises.get(asset.key)!
    }

    if (this.loadedAssets.has(asset.key)) {
      return true
    }

    if (this.failedAssets.has(asset.key)) {
      return false
    }

    const loadPromise = this.attemptLoad(asset)
    this.loadingPromises.set(asset.key, loadPromise)
    
    return loadPromise
  }

  private async attemptLoad(asset: AssetConfig): Promise<boolean> {
    const maxRetries = asset.retries || 3
    let currentRetry = this.retryCount.get(asset.key) || 0

    while (currentRetry < maxRetries) {
      try {
        await this.loadSingleAsset(asset)
        this.loadedAssets.add(asset.key)
        this.loadingPromises.delete(asset.key)
        return true
      } catch (error) {
        currentRetry++
        this.retryCount.set(asset.key, currentRetry)
        
        // Asset load failed - retry attempt
        
        if (currentRetry < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, currentRetry) * 1000))
        }
      }
    }

    // All retries failed, try fallback
    if (asset.fallback && this.scene.textures.exists(asset.fallback)) {
      // Using fallback asset
      this.loadedAssets.add(asset.key)
      this.loadingPromises.delete(asset.key)
      return true
    }

    this.failedAssets.add(asset.key)
    this.loadingPromises.delete(asset.key)
    return false
  }

  private loadSingleAsset(asset: AssetConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if asset already exists (was preloaded)
      if (asset.type === 'image' && this.scene.textures.exists(asset.key)) {
        console.log(`⚡ Asset already loaded: ${asset.key}`)
        resolve()
        return
      }
      if (asset.type === 'audio' && this.scene.cache.audio.exists(asset.key)) {
        console.log(`⚡ Audio already loaded: ${asset.key}`)
        resolve()
        return
      }
      
      // Set up load event handlers
      const onLoadComplete = () => {
        this.scene.load.off('filecomplete', onFileComplete)
        this.scene.load.off('loaderror', onLoadError)
        resolve()
      }

      const onFileComplete = (key: string) => {
        if (key === asset.key) {
          onLoadComplete()
        }
      }

      const onLoadError = (file: any) => {
        if (file.key === asset.key) {
          this.scene.load.off('filecomplete', onFileComplete)
          this.scene.load.off('loaderror', onLoadError)
          reject(new Error(`Failed to load ${asset.key}: ${file.src}`))
        }
      }

      this.scene.load.on('filecomplete', onFileComplete)
      this.scene.load.on('loaderror', onLoadError)

      // Load the asset based on type
      switch (asset.type) {
        case 'image':
          this.scene.load.image(asset.key, asset.url)
          break
        case 'audio':
          this.scene.load.audio(asset.key, asset.url)
          break
        case 'json':
          this.scene.load.json(asset.key, asset.url)
          break
        default:
          reject(new Error(`Unsupported asset type: ${asset.type}`))
          return
      }

      // Start loading if not already loading
      if (!this.scene.load.isLoading()) {
        this.scene.load.start()
      }
    })
  }

  /**
   * Check if an asset is loaded and available
   */
  isAssetLoaded(key: string): boolean {
    return this.loadedAssets.has(key) && this.scene.textures.exists(key)
  }

  /**
   * Check if an asset failed to load
   */
  isAssetFailed(key: string): boolean {
    return this.failedAssets.has(key)
  }

  /**
   * Get fallback texture if original failed
   */
  getSafeTexture(key: string, fallback: string = 'defaultTexture'): string {
    if (this.isAssetLoaded(key)) {
      return key
    }
    
    if (this.scene.textures.exists(fallback)) {
      return fallback
    }
    
    // Create emergency fallback
    this.createEmergencyFallback(fallback)
    return fallback
  }

  /**
   * Create a simple colored rectangle as emergency fallback
   */
  private createEmergencyFallback(key: string): void {
    if (this.scene.textures.exists(key)) return

    const graphics = this.scene.add.graphics()
    graphics.fillStyle(0xff0000, 1) // Red rectangle
    graphics.fillRect(0, 0, 32, 32)
    graphics.generateTexture(key, 32, 32)
    graphics.destroy()
  }

  /**
   * Pre-create common fallback textures
   */
  createCommonFallbacks(): void {
    const fallbacks = [
      { key: 'defaultEnemy', color: 0x4169e1, size: { w: 36, h: 36 } },
      { key: 'defaultPlayer', color: 0x00ff00, size: { w: 48, h: 64 } },
      { key: 'defaultCoin', color: 0xffd700, size: { w: 24, h: 24 } }
    ]

    fallbacks.forEach(fallback => {
      if (!this.scene.textures.exists(fallback.key)) {
        const graphics = this.scene.add.graphics()
        graphics.fillStyle(fallback.color, 1)
        graphics.fillRect(0, 0, fallback.size.w, fallback.size.h)
        graphics.generateTexture(fallback.key, fallback.size.w, fallback.size.h)
        graphics.destroy()
      }
    })
  }
}