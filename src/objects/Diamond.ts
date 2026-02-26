export class Diamond {
  public sprite: Phaser.GameObjects.Container
  private diamondSprite: Phaser.GameObjects.Image
  private scene: Phaser.Scene
  private collected: boolean = false
  private sparkleTimer?: Phaser.Time.TimerEvent
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    
    // Move up by 5 pixels for better eye level positioning
    const adjustedY = y - 5
    
    // Create container for diamond sprite
    this.sprite = scene.add.container(x, adjustedY)
    
    // Create diamond sprite from loaded texture
    this.diamondSprite = scene.add.image(0, 0, 'gem-diamond')
    
    // Set size for diamond (20% bigger than original: 24 * 1.2 = 28.8, rounded to 29)
    this.diamondSprite.setDisplaySize(29, 29)
    
    this.sprite.add(this.diamondSprite)
    this.sprite.setDepth(13)
    
    // Add physics to the container
    scene.physics.add.existing(this.sprite, true) // Static body
    
    // Set hitbox size to match larger diamond size
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      body.setSize(29, 29)
      // Adjust hitbox position to better match visual sprite (right 10, down 10)
      body.setOffset(10, 10) // Move hitbox right and down to align with visual sprite
    }
    
    
    // Add gentle floating motion to container
    scene.tweens.add({
      targets: this.sprite,
      y: adjustedY - 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add pulsing animation to container
    scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add sparkle effect
    this.sparkleTimer = scene.time.addEvent({
      delay: 400 + Math.random() * 200,
      callback: () => this.createSparkle(),
      loop: true
    })
  }
  
  private createSparkle(): void {
    if (!this.sprite || !this.sprite.scene) return
    
    const sparkle = this.scene.add.graphics()
    const sparkleX = (Math.random() - 0.5) * 30
    const sparkleY = (Math.random() - 0.5) * 30
    
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
    sparkleContainer.setDepth(14)
    
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
  
  isCollected(): boolean {
    return this.collected
  }
  
  collect(): void {
    if (this.collected) return
    this.collected = true
    
    // Stop sparkle timer
    if (this.sparkleTimer) {
      this.sparkleTimer.destroy()
    }
    
    // Immediately disable physics to prevent further collisions
    if (this.sprite.body) {
      this.sprite.body.enable = false
    }
    
    // Diamond collection animation with brilliant flash
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.sprite.destroy()
      }
    })
  }
  
  destroy(): void {
    if (this.sparkleTimer) {
      this.sparkleTimer.destroy()
    }
    this.sprite.destroy()
  }
}