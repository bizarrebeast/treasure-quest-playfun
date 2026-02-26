export class Coin {
  public sprite: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private collected: boolean = false
  private sparkleTimer?: Phaser.Time.TimerEvent
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    
    // Move up by 5 pixels for better eye level positioning
    const adjustedY = y - 5
    
    // Create container for gem sprite
    this.sprite = scene.add.container(x, adjustedY)
    
    // Define available gem sprite keys for regular coins (exclude big blue and diamond - those are for higher value collectibles)
    const gemSprites = [
      'gem-pink-round', 
      'gem-yellow-emerald',
      'gem-purple-opal',
      'gem-teal-triangle'
    ]
    
    // Randomly select a gem sprite
    const selectedGemKey = gemSprites[Math.floor(Math.random() * gemSprites.length)]
    
    // Create sprite image from loaded texture
    const gemSprite = scene.add.image(0, 0, selectedGemKey)
    
    // Set consistent size - match the current gem size (16x16 based on the hitbox)
    gemSprite.setDisplaySize(16, 16)
    
    this.sprite.add(gemSprite)
    this.sprite.setDepth(12)
    
    // Add sparkle effect
    this.sparkleTimer = scene.time.addEvent({
      delay: 800 + Math.random() * 400,
      callback: () => this.createSparkle(),
      loop: true
    })
    
    // Add physics to the sprite with proper hitbox size
    scene.physics.add.existing(this.sprite, true) // Static body
    
    // Set hitbox to match gem cluster size (approximately 16x16 for small clusters)
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      body.setSize(16, 16)
      // Need to move body +32 right and +32 up to center it
      body.setOffset(32 - 8, 32 - 8)  // +32 to center, -8 for half body size
    }
    
    // Add pulsing animation
    scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add gentle floating motion (like diamonds)
    scene.tweens.add({
      targets: this.sprite,
      y: adjustedY - 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
  
  private createSparkle(): void {
    if (!this.sprite || !this.sprite.scene) return
    
    const sparkle = this.scene.add.graphics()
    const sparkleX = (Math.random() - 0.5) * 16
    const sparkleY = (Math.random() - 0.5) * 16
    
    // Create star-shaped sparkle
    sparkle.fillStyle(0xffffff, 0.9)
    sparkle.beginPath()
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = i % 2 === 0 ? 2 : 1
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) sparkle.moveTo(x, y)
      else sparkle.lineTo(x, y)
    }
    sparkle.closePath()
    sparkle.fillPath()
    
    const sparkleContainer = this.scene.add.container(this.sprite.x + sparkleX, this.sprite.y + sparkleY)
    sparkleContainer.add(sparkle)
    sparkleContainer.setDepth(13)
    
    this.scene.tweens.add({
      targets: sparkleContainer,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      rotation: Math.PI,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        sparkleContainer.destroy()
      }
    })
  }
  
  collect(): void {
    if (this.collected) return // Already collected
    this.collected = true
    
    // Stop sparkle timer
    if (this.sparkleTimer) {
      this.sparkleTimer.destroy()
    }
    
    // Immediately disable physics to prevent further collisions
    if (this.sprite.body) {
      this.sprite.body.enable = false
    }
    
    // Play collection effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.sprite.destroy()
      }
    })
  }
  
  isCollected(): boolean {
    return this.collected
  }
  
  destroy(): void {
    if (this.sparkleTimer) {
      this.sparkleTimer.destroy()
    }
    this.sprite.destroy()
  }
}