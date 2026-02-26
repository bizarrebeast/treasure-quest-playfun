export type CursedOrbType = 'cursed' | 'cursedTeal'

export class CursedOrb {
  public sprite: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private collected: boolean = false
  private glowGraphics: Phaser.GameObjects.Graphics
  private particleTimer?: Phaser.Time.TimerEvent
  private particles: Phaser.GameObjects.Graphics[] = []
  private orbType: CursedOrbType
  private glowColor: number
  
  constructor(scene: Phaser.Scene, x: number, y: number, orbType: CursedOrbType) {
    this.scene = scene
    this.orbType = orbType
    
    // Set colors based on orb type
    this.glowColor = orbType === 'cursed' ? 0x580641 : 0x49a79c // Dark purple or teal
    
    // Move up by 5 pixels for better positioning
    const adjustedY = y - 5
    
    // Create container for cursed orb
    this.sprite = scene.add.container(x, adjustedY)
    
    // Add glow effect with cursed color
    this.glowGraphics = scene.add.graphics()
    this.createGlowEffect()
    this.sprite.add(this.glowGraphics)
    
    // Create cursed orb sprite with correct image based on type
    const spriteKey = orbType === 'cursed' ? 'cursedOrbCollectible' : 'cursedTealOrbCollectible'
    const cursedOrbSprite = scene.add.image(0, 0, spriteKey)
    cursedOrbSprite.setDisplaySize(20, 20) // Same size as crystal ball
    this.sprite.add(cursedOrbSprite)
    
    this.sprite.setDepth(12)
    
    // Add floating cursed particles
    this.particleTimer = scene.time.addEvent({
      delay: 250, // Slower than crystal ball for more ominous feel
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
    
    // Add pulsing glow animation (more sinister than crystal ball)
    scene.tweens.add({
      targets: this.glowGraphics,
      alpha: 0.2,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 2000, // Slower pulse
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add gentle floating motion
    scene.tweens.add({
      targets: this.sprite,
      y: adjustedY - 6,
      duration: 2500, // Slower float
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add slow rotation (opposite direction from crystal ball)
    scene.tweens.add({
      targets: cursedOrbSprite,
      rotation: -Math.PI * 2, // Counter-clockwise
      duration: 10000, // Slower rotation
      repeat: -1,
      ease: 'Linear'
    })
  }
  
  private createGlowEffect(): void {
    // Create cursed glow with type-specific color
    const glowColor = this.glowColor
    
    // Multiple layered circles for ominous glow
    for (let i = 4; i > 0; i--) {
      this.glowGraphics.fillStyle(glowColor, 0.08 * i)
      this.glowGraphics.fillCircle(0, 0, 12 + (4 - i) * 6)
    }
  }
  
  private createParticle(): void {
    if (!this.sprite || !this.sprite.scene || this.collected) return
    
    // Create cursed pixel particle
    const particle = this.scene.add.graphics()
    particle.fillStyle(this.glowColor, 1)
    particle.fillRect(0, 0, 2, 2)
    
    // Random position around the cursed orb (more chaotic than crystal ball)
    const angle = Math.random() * Math.PI * 2
    const distance = 20 + Math.random() * 12
    const startX = this.sprite.x + Math.cos(angle) * distance
    const startY = this.sprite.y + Math.sin(angle) * distance
    
    particle.x = startX
    particle.y = startY
    particle.setDepth(11)
    
    this.particles.push(particle)
    
    // Animate particle floating downward (cursed effect)
    this.scene.tweens.add({
      targets: particle,
      y: startY + 35, // Float downward instead of upward
      x: startX + (Math.random() - 0.5) * 20, // Add horizontal drift
      alpha: 0,
      duration: 2000, // Slower fade
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
    
    // Create cursed collection burst effect
    for (let i = 0; i < 12; i++) {
      const burstParticle = this.scene.add.graphics()
      burstParticle.fillStyle(this.glowColor, 1)
      burstParticle.fillRect(0, 0, 3, 3)
      
      const angle = (i / 12) * Math.PI * 2
      burstParticle.x = this.sprite.x
      burstParticle.y = this.sprite.y
      burstParticle.setDepth(13)
      
      this.scene.tweens.add({
        targets: burstParticle,
        x: this.sprite.x + Math.cos(angle) * 50,
        y: this.sprite.y + Math.sin(angle) * 50,
        alpha: 0,
        duration: 600, // Longer burst than crystal ball
        ease: 'Power2.easeOut',
        onComplete: () => {
          burstParticle.destroy()
        }
      })
    }
    
    // Play cursed collection animation (darker feel)
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 300, // Slightly slower than crystal ball
      onComplete: () => {
        this.sprite.destroy()
      }
    })
  }
  
  isCollected(): boolean {
    return this.collected
  }
  
  getType(): CursedOrbType {
    return this.orbType
  }
  
  destroy(): void {
    if (this.particleTimer) {
      this.particleTimer.destroy()
    }
    this.particles.forEach(particle => particle.destroy())
    this.sprite.destroy()
  }
}