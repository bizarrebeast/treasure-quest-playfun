export class CrystalBall {
  public sprite: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private collected: boolean = false
  private glowGraphics: Phaser.GameObjects.Graphics
  private particleTimer?: Phaser.Time.TimerEvent
  private particles: Phaser.GameObjects.Graphics[] = []
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    
    // Move up by 5 pixels for better positioning
    const adjustedY = y - 5
    
    // Create container for crystal ball
    this.sprite = scene.add.container(x, adjustedY)
    
    // Add green glow effect (#44d0a7)
    this.glowGraphics = scene.add.graphics()
    this.createGlowEffect()
    this.sprite.add(this.glowGraphics)
    
    // Create crystal ball sprite
    const crystalBallSprite = scene.add.image(0, 0, 'crystalBallCollectible')
    crystalBallSprite.setDisplaySize(20, 20) // Slightly larger than coins
    this.sprite.add(crystalBallSprite)
    
    this.sprite.setDepth(12)
    
    // Add floating green particles
    this.particleTimer = scene.time.addEvent({
      delay: 200,
      callback: () => this.createParticle(),
      loop: true
    })
    
    // Add physics
    scene.physics.add.existing(this.sprite, true)
    
    // Set hitbox
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      body.setSize(20, 20)
      body.setOffset(32 - 10, 32 - 10) // Center the hitbox
    }
    
    // Add pulsing glow animation
    scene.tweens.add({
      targets: this.glowGraphics,
      alpha: 0.3,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add gentle floating motion
    scene.tweens.add({
      targets: this.sprite,
      y: adjustedY - 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add slow rotation
    scene.tweens.add({
      targets: crystalBallSprite,
      rotation: Math.PI * 2,
      duration: 8000,
      repeat: -1,
      ease: 'Linear'
    })
  }
  
  private createGlowEffect(): void {
    // Create soft green glow (#44d0a7)
    const glowColor = 0x44d0a7
    
    // Multiple layered circles for soft glow
    for (let i = 3; i > 0; i--) {
      this.glowGraphics.fillStyle(glowColor, 0.1 * i)
      this.glowGraphics.fillCircle(0, 0, 15 + (3 - i) * 5)
    }
  }
  
  private createParticle(): void {
    if (!this.sprite || !this.sprite.scene || this.collected) return
    
    // Create green pixel particle
    const particle = this.scene.add.graphics()
    particle.fillStyle(0x44d0a7, 1)
    particle.fillRect(0, 0, 2, 2)
    
    // Random position around the crystal ball
    const angle = Math.random() * Math.PI * 2
    const distance = 15 + Math.random() * 10
    const startX = this.sprite.x + Math.cos(angle) * distance
    const startY = this.sprite.y + Math.sin(angle) * distance
    
    particle.x = startX
    particle.y = startY
    particle.setDepth(11)
    
    this.particles.push(particle)
    
    // Animate particle floating upward and fading
    this.scene.tweens.add({
      targets: particle,
      y: startY - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.particles.indexOf(particle)
        if (index > -1) {
          this.particles.splice(index, 1)
        }
        particle.destroy()
      }
    })
  }
  
  collect(): void {
    if (this.collected) return
    this.collected = true
    
    // Stop particle generation
    if (this.particleTimer) {
      this.particleTimer.destroy()
    }
    
    // Clean up existing particles
    this.particles.forEach(particle => particle.destroy())
    this.particles = []
    
    // Disable physics
    if (this.sprite.body) {
      this.sprite.body.enable = false
    }
    
    // Create collection burst effect
    for (let i = 0; i < 8; i++) {
      const burstParticle = this.scene.add.graphics()
      burstParticle.fillStyle(0x44d0a7, 1)
      burstParticle.fillRect(0, 0, 3, 3)
      
      const angle = (i / 8) * Math.PI * 2
      burstParticle.x = this.sprite.x
      burstParticle.y = this.sprite.y
      burstParticle.setDepth(13)
      
      this.scene.tweens.add({
        targets: burstParticle,
        x: this.sprite.x + Math.cos(angle) * 40,
        y: this.sprite.y + Math.sin(angle) * 40,
        alpha: 0,
        duration: 400,
        ease: 'Power2.easeOut',
        onComplete: () => {
          burstParticle.destroy()
        }
      })
    }
    
    // Play collection animation
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
    if (this.particleTimer) {
      this.particleTimer.destroy()
    }
    this.particles.forEach(particle => particle.destroy())
    this.sprite.destroy()
  }
}