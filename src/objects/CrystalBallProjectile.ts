import GameSettings from "../config/GameSettings"

export class CrystalBallProjectile extends Phaser.Physics.Arcade.Sprite {
  private bounceCount: number = 0
  private readonly MAX_BOUNCES: number = 5
  private readonly BASE_BOUNCE_HEIGHT: number = 32 // Starting bounce height in pixels
  private distanceTraveled: number = 0
  private readonly MAX_DISTANCE: number = 5 * GameSettings.game.tileSize // 5 tiles
  private direction: number = 1 // 1 for right, -1 for left
  private glowGraphics?: Phaser.GameObjects.Graphics
  private rotationTween?: Phaser.Tweens.Tween
  
  constructor(scene: Phaser.Scene, x: number, y: number, direction: number, playerVelocityX: number = 0) {
    super(scene, x, y, 'crystalBallProjectile')
    
    this.direction = direction
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set size and physics properties to match the crystal ball sprite
    this.setDisplaySize(16, 16) // Slightly larger for better visibility
    this.setSize(12, 12) // Hitbox size
    this.setDepth(15)
    
    // Set initial velocity with slight upward arc
    // Compensate for player movement to maintain consistent projectile range
    const baseSpeed = 250
    const compensatedSpeed = baseSpeed + Math.abs(playerVelocityX * 0.8) // Add 80% of player velocity
    const horizontalSpeed = compensatedSpeed * direction
    const initialVerticalSpeed = -120 // Slight upward arc
    this.setVelocity(horizontalSpeed, initialVerticalSpeed)
    
    console.log('🔫 Projectile velocity compensation: base =', baseSpeed, 'player =', playerVelocityX, 'final =', horizontalSpeed)
    
    // Apply gravity for natural arc
    this.setGravityY(400)
    
    // Set up collision with world bounds
    this.setCollideWorldBounds(true)
    this.body!.onWorldBounds = true
    
    // Add subtle glow around the crystal ball sprite
    this.glowGraphics = scene.add.graphics()
    this.glowGraphics.setDepth(14)
    this.glowGraphics.fillStyle(0x44d0a7, 0.3)
    this.glowGraphics.fillCircle(0, 0, 12) // Draw at origin of graphics object
    this.glowGraphics.fillStyle(0x44d0a7, 0.2) 
    this.glowGraphics.fillCircle(0, 0, 18) // Draw at origin of graphics object
    
    // Position the graphics at the projectile location
    this.glowGraphics.x = x
    this.glowGraphics.y = y
    
    // Make glow follow the projectile - no need for tween, just update position
    this.scene.events.on('update', this.updateGlow, this)
    
    // Add rotation animation - store tween reference
    this.rotationTween = scene.tweens.add({
      targets: this,
      rotation: Math.PI * 2 * direction,
      duration: 500,
      repeat: -1,
      ease: 'Linear'
    })
  }
  
  
  private updateGlow(): void {
    if (this.active && this.glowGraphics) {
      this.glowGraphics.x = this.x
      this.glowGraphics.y = this.y
    }
  }
  
  update(time: number, delta: number): void {
    super.update(time, delta)
    
    // Check if body exists
    if (!this.body) {
      console.log('🔫 Crystal Ball projectile body missing - destroying')
      this.burst()
      return
    }
    
    const body = this.body as Phaser.Physics.Arcade.Body
    
    // Track distance traveled
    this.distanceTraveled += Math.abs(body.velocity.x) * delta / 1000
    
    // Check if we've hit max distance
    if (this.distanceTraveled >= this.MAX_DISTANCE) {
      console.log('🔫 Crystal Ball projectile hit max distance - bursting')
      this.burst()
      return
    }
    
    // Check for floor collision (bouncing)
    if (body.blocked.down) {
      console.log('🔫 Crystal Ball projectile hit floor - bouncing')
      this.handleBounce()
    }
    
    // Check for wall collision
    if (body.blocked.left || body.blocked.right) {
      console.log('🔫 Crystal Ball projectile hit wall - bursting')
      this.burst()
    }
  }
  
  private handleBounce(): void {
    this.bounceCount++
    
    // Play bounce sound if sound effects are enabled (SDK mute is handled by Phaser internally)
    const sfxEnabled = this.scene.registry.get('sfxEnabled') !== false
    if (sfxEnabled) {
      this.scene.sound.play('crystal-ball-bounce', { volume: 0.4 })
    }
    
    if (this.bounceCount >= this.MAX_BOUNCES) {
      console.log('🔫 Crystal Ball projectile max bounces reached - bursting')
      this.burst()
      return
    }
    
    if (!this.body) {
      console.log('🔫 Crystal Ball projectile body missing during bounce - bursting')
      this.burst()
      return
    }
    
    const body = this.body as Phaser.Physics.Arcade.Body
    
    // Calculate bounce velocity with descending height
    // Each bounce gets 80% of the previous height
    const heightReduction = Math.pow(0.8, this.bounceCount - 1)
    const currentBounceHeight = this.BASE_BOUNCE_HEIGHT * heightReduction
    
    // Using physics: v = sqrt(2 * g * h)
    const gravity = body.gravity.y || 400
    const bounceVelocity = -Math.sqrt(2 * gravity * currentBounceHeight)
    
    console.log('🔫 Bounce', this.bounceCount, 'height:', currentBounceHeight.toFixed(1), 'velocity:', bounceVelocity.toFixed(1))
    
    // Apply bounce
    this.setVelocityY(bounceVelocity)
    
    // Maintain horizontal velocity
    this.setVelocityX(250 * this.direction)
    
    // Create bounce effect
    this.createBounceEffect()
    
    console.log('🔫 Crystal Ball projectile bounced', this.bounceCount, 'times')
  }
  
  private createBounceEffect(): void {
    // Check if scene still exists
    if (!this.scene) return
    
    // Create small particles at bounce point
    for (let i = 0; i < 3; i++) {
      const particle = this.scene.add.graphics()
      particle.fillStyle(0x44d0a7, 1)
      particle.fillCircle(0, 0, 1)
      particle.x = this.x + (Math.random() - 0.5) * 10
      particle.y = this.y + 5
      particle.setDepth(14)
      
      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 10,
        alpha: 0,
        duration: 200,
        onComplete: () => particle.destroy()
      })
    }
  }
  
  hitEnemy(): void {
    // Called when projectile hits an enemy
    this.burst()
  }
  
  burst(): void {
    if (!this.scene) return
    
    // Remove the update event listener
    this.scene.events.off('update', this.updateGlow, this)
    
    // Kill rotation tween
    if (this.rotationTween) {
      this.rotationTween.stop()
      this.rotationTween = undefined
    }
    
    // Create burst effect
    for (let i = 0; i < 8; i++) {
      const burstParticle = this.scene.add.graphics()
      burstParticle.fillStyle(0x44d0a7, 1)
      burstParticle.fillCircle(0, 0, 2)
      
      const angle = (i / 8) * Math.PI * 2
      burstParticle.x = this.x
      burstParticle.y = this.y
      burstParticle.setDepth(15)
      
      const distance = 20 + Math.random() * 10
      
      this.scene.tweens.add({
        targets: burstParticle,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeOut',
        onComplete: () => burstParticle.destroy()
      })
    }
    
    // Clean up glow graphics immediately
    if (this.glowGraphics) {
      this.glowGraphics.destroy()
      this.glowGraphics = undefined
    }
    
    // Destroy projectile
    this.destroy()
  }
}