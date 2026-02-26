import GameSettings from "../config/GameSettings"

export type ChestTier = 'purple' | 'teal' | 'yellow'

export class TreasureChest {
  public sprite: Phaser.GameObjects.Sprite
  private scene: Phaser.Scene
  private isOpened: boolean = false
  private glowEffect: Phaser.GameObjects.Arc | null = null
  private debugHitbox: Phaser.GameObjects.Graphics | null = null
  private chestTier: ChestTier
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    
    // Randomly select chest tier
    this.chestTier = this.selectRandomChestTier()
    
    // Get sprite key based on tier
    const spriteKey = this.getSpriteKeyForTier(this.chestTier)
    
    // Create treasure chest using tier-specific sprite (shifted up 4 pixels visually)
    this.sprite = scene.add.sprite(x, y - 4, spriteKey)
    this.sprite.setDisplaySize(60, 60) // Set to 60x60 pixels as requested
    this.sprite.setDepth(13)
    
    // Add physics to the sprite
    scene.physics.add.existing(this.sprite, true) // Static body
    
    // Set collision bounds (40x30 hitbox for 60x60 sprite) 
    // Adjust offset to account for the visual sprite being moved up 4 pixels
    const body = this.sprite.body as Phaser.Physics.Arcade.StaticBody
    body.setSize(40, 30)
    body.setOffset(-20, -15 + 4) // +4 to compensate for sprite being moved up
    
    // Add debug hitbox visualization (disabled for production)
    const showDebugHitbox = false  // Set to true to enable debug hitboxes
    if (showDebugHitbox && GameSettings.debug) {
      this.createDebugHitbox(x, y)
    }
    
    // Add glow effect (match the shifted sprite position and tier)
    this.createGlowEffect(x, y - 4, this.chestTier)
    
    // Chest pulsing animation disabled
  }
  
  
  private selectRandomChestTier(): ChestTier {
    const random = Math.random()
    // Purple: 60% (common), Teal: 30% (rare), Yellow: 10% (epic)
    if (random < 0.6) {
      return 'purple'
    } else if (random < 0.9) {
      return 'teal'
    } else {
      return 'yellow'
    }
  }
  
  private getSpriteKeyForTier(tier: ChestTier): string {
    switch (tier) {
      case 'purple': return 'purple-chest'
      case 'teal': return 'teal-chest'
      case 'yellow': return 'yellow-chest'
    }
  }
  
  private getGlowColorForTier(tier: ChestTier): number {
    switch (tier) {
      case 'purple': return 0x9932cc // Purple glow
      case 'teal': return 0x008b8b   // Teal glow
      case 'yellow': return 0xffd700 // Gold glow
    }
  }
  
  private createGlowEffect(x: number, y: number, tier: ChestTier): void {
    // Simple single circle with 15% opacity, color based on tier
    const glowColor = this.getGlowColorForTier(tier)
    this.glowEffect = this.scene.add.circle(x, y, 18, glowColor)
    this.glowEffect.setAlpha(0.15)
    this.glowEffect.setDepth(12)
    
    // Pulsing glow
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: 0.05,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
  
  public canInteract(): boolean {
    return !this.isOpened
  }
  
  public open(): { coins: number, blueCoins: number, diamonds: number, freeLifes: number, invincibilityPendants: number, totalPoints: number } { // flashPowerUp removed - commented out for later use
    if (this.isOpened) {
      return { coins: 0, blueCoins: 0, diamonds: 0, freeLifes: 0, invincibilityPendants: 0, totalPoints: 0 } // flashPowerUp removed
    }
    
    this.isOpened = true
    
    // Update chest appearance to opened (could change sprite frame if we had multiple frames)
    // For now, just apply a tint to indicate it's been opened
    this.sprite.setTint(0x808080) // Gray tint to show it's opened
    
    // Remove glow effect
    if (this.glowEffect) {
      this.glowEffect.destroy()
      this.glowEffect = null
    }
    
    // Opening animation
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true
    })
    
    // Generate contents based on chest tier and level progression
    const contents = this.generateRewardsByTier(this.chestTier)
    
    // Calculate total points
    let totalPoints = 2500 // Base chest value
    totalPoints += contents.coins * 50 // Regular coins (50 points each)
    totalPoints += contents.blueCoins * 500 // Blue coins (500 points each)
    totalPoints += contents.diamonds * 1000 // Diamonds (1000 points each)
    totalPoints += contents.freeLifes * 2000 // Free lives (2000 points each)
    totalPoints += contents.invincibilityPendants * 300 // Invincibility pendants (300 points each)
    
    // Create treasure burst effect
    this.createTreasureBurstEffect()
    
    return { 
      coins: contents.coins, 
      blueCoins: contents.blueCoins,
      diamonds: contents.diamonds,
      freeLifes: contents.freeLifes,
      invincibilityPendants: contents.invincibilityPendants,
      // flashPowerUp: false, // Commented out for later use 
      totalPoints 
    }
  }
  
  private generateRewardsByTier(tier: ChestTier): { coins: number, blueCoins: number, diamonds: number, freeLifes: number } {
    const rewards = { coins: 0, blueCoins: 0, diamonds: 0, freeLifes: 0 }
    
    switch (tier) {
      case 'purple': // Common tier: crystals + small chance of free life
        rewards.coins = Math.floor(Math.random() * 3) + 2 // 2-4 crystals
        if (Math.random() < 0.1) { // 10% chance for free life
          rewards.freeLifes = 1
        }
        break
        
      case 'teal': // Rare tier: blue gems + crystals + better chance for powerup/free life
        rewards.blueCoins = Math.floor(Math.random() * 2) + 1 // 1-2 blue gems
        rewards.coins = Math.floor(Math.random() * 2) + 1 // 1-2 crystals
        if (Math.random() < 0.25) { // 25% chance for free life or powerup
          if (Math.random() < 0.7) {
            rewards.freeLifes = 1
          } else {
            // TODO: Add powerup when invincibility pendant system is integrated
            rewards.freeLifes = 1 // For now, give free life instead
          }
        }
        break
        
      case 'yellow': // Epic tier: guaranteed free life or powerup + crystals
        rewards.coins = Math.floor(Math.random() * 2) + 2 // 2-3 crystals
        // Guaranteed free life or powerup
        if (Math.random() < 0.8) {
          rewards.freeLifes = 1
        } else {
          // TODO: Add powerup when invincibility pendant system is integrated
          rewards.freeLifes = 1 // For now, give free life instead
        }
        break
    }
    
    // Chest rewards calculated based on tier
    
    return rewards
  }
  
  private createTreasureBurstEffect(): void {
    // Create burst of golden particles
    for (let i = 0; i < 15; i++) {
      const particle = this.scene.add.circle(
        this.sprite.x + (Math.random() - 0.5) * 10,
        this.sprite.y - 5,
        Math.random() * 3 + 2,
        0xffd700
      )
      particle.setDepth(50)
      
      const angle = (Math.PI * 2 / 15) * i + (Math.random() - 0.5) * 0.5
      const speed = Math.random() * 100 + 50
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed - 30,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      })
    }
    
    // Flash effect
    const flash = this.scene.add.circle(this.sprite.x, this.sprite.y, 40, 0xffffff)
    flash.setDepth(49)
    flash.setAlpha(0.8)
    
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy()
    })
  }
  
  private createDebugHitbox(x: number, y: number): void {
    this.debugHitbox = this.scene.add.graphics()
    this.debugHitbox.setDepth(999) // On top of everything
    
    // Draw hitbox outline (same dimensions as physics body - now 40x30)
    this.debugHitbox.lineStyle(2, 0x00ff00, 0.8) // Bright green, semi-transparent
    this.debugHitbox.strokeRect(x - 20, y - 15, 40, 30)
    
    // Add a small center dot to show exact position
    this.debugHitbox.fillStyle(0xff0000, 1.0) // Red dot
    this.debugHitbox.fillCircle(x, y, 2)
    
    // Add text label
    const debugText = this.scene.add.text(x, y - 35, 'CHEST\n40x30', {
      fontSize: '8px',
      color: '#00ff00',
      fontFamily: 'monospace',
      align: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5).setDepth(1000)
    
    // Store text reference for cleanup
    this.debugHitbox.setData('debugText', debugText)
  }
  
  destroy(): void {
    this.sprite.destroy()
    if (this.glowEffect) {
      this.glowEffect.destroy()
    }
    if (this.debugHitbox) {
      const debugText = this.debugHitbox.getData('debugText')
      if (debugText) {
        debugText.destroy()
      }
      this.debugHitbox.destroy()
    }
  }
}