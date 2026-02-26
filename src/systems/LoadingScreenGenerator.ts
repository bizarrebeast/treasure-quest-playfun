/**
 * LoadingScreenGenerator - Creates and caches loading screen images
 * This creates "GOING BIZARRE" screens dynamically and caches them as textures
 */

export class LoadingScreenGenerator {
  private static generatedScreens: Map<string, string> = new Map()
  
  /**
   * Generate a loading screen texture for a specific chapter
   */
  static generateLoadingScreen(scene: Phaser.Scene, level: number): string {
    const key = `loading-screen-${level}`
    
    // Check if already generated
    if (scene.textures.exists(key)) {
      return key
    }
    
    // Create a render texture
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height
    const rt = scene.add.renderTexture(0, 0, width, height)
    rt.setOrigin(0, 0)
    
    // Fill purple background (matching the theme)
    rt.fill(0x2e2348)  // Purple background like other screens
    
    // Create text objects temporarily
    const centerX = width / 2
    const centerY = height / 2
    
    // Single "LOADING..." text in the center
    const loading = scene.add.text(centerX, centerY, 'LOADING...', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    })
    loading.setOrigin(0.5)
    
    // Draw to render texture
    rt.draw(loading)
    
    // Save as texture
    rt.saveTexture(key)
    
    // Clean up temporary objects
    loading.destroy()
    rt.destroy()
    
    // Mark as generated
    this.generatedScreens.set(key, 'LOADING...')
    console.log(`✨ Generated loading screen: ${key}`)
    
    return key
  }
  
  /**
   * Pre-generate all chapter loading screens
   */
  static preGenerateAll(scene: Phaser.Scene): void {
    // Generate for key chapters
    const chapters = [1, 11, 21, 31, 41, 51]
    chapters.forEach(level => {
      this.generateLoadingScreen(scene, level)
    })
  }
  
  /**
   * Get the appropriate loading screen key for a level
   */
  static getLoadingScreenKey(level: number): string {
    // Determine which chapter screen to use
    if (level >= 51) return 'loading-screen-51'
    if (level >= 41) return 'loading-screen-41'
    if (level >= 31) return 'loading-screen-31'
    if (level >= 21) return 'loading-screen-21'
    if (level >= 11) return 'loading-screen-11'
    return 'loading-screen-1'
  }
  
  /**
   * Display loading screen instantly
   */
  static showInstantLoadingScreen(scene: Phaser.Scene, level: number): Phaser.GameObjects.Image {
    const key = this.getLoadingScreenKey(level)
    
    // Create full-screen image
    const screen = scene.add.image(
      scene.cameras.main.centerX,
      scene.cameras.main.centerY,
      key
    )
    screen.setOrigin(0.5)
    screen.setDepth(100000) // Above everything
    screen.setScrollFactor(0) // Fixed to camera
    
    console.log(`⚡ Instant loading screen displayed: ${key}`)
    return screen
  }
}