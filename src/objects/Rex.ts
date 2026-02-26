export class Rex extends Phaser.Physics.Arcade.Sprite {
  private baseMoveSpeed: number = 60  // Base speed (slower than green bouncer which is 100)
  private moveSpeed: number = 60  // Actual speed after multiplier
  private speedMultiplier: number = 1  // Speed multiplier for difficulty scaling
  private direction: number = 1  // 1 for right, -1 for left
  private bounceTimer: number = 0
  private isSquishing: boolean = false
  private isStretching: boolean = false
  private isInAir: boolean = false
  private isSquished: boolean = false  // Track if enemy has been killed
  
  // Blinking animation
  private blinkTimer: number = 0
  private nextBlinkTime: number = 2000
  private isBlinking: boolean = false
  private blinkDuration: number = 150  // Quick blink
  
  // Platform bounds for patrol
  private platformBounds: { left: number; right: number }
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    platformLeft: number,
    platformRight: number
  ) {
    // Start with eyes open sprite
    super(scene, x, y, 'rexEyesOpen')
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set display size - 40x40px square
    const rexSize = 40
    this.setDisplaySize(rexSize, rexSize)
    
    // Ensure sprite maintains square aspect ratio
    this.setOrigin(0.5, 0.5)
    
    // Set CIRCULAR hitbox - 36px diameter (slightly smaller than visual)
    const desiredRadius = 18  // 36px diameter circle
    
    // Calculate radius in texture space
    const textureWidth = this.texture.get().width
    const textureHeight = this.texture.get().height
    const scaleX = rexSize / textureWidth
    const scaleY = rexSize / textureHeight
    const avgScale = (scaleX + scaleY) / 2
    const radiusInTextureSpace = desiredRadius / avgScale
    
    // Set circular hitbox
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setCircle(radiusInTextureSpace)
      
      // Center the circular hitbox on the sprite
      const circleDiameter = radiusInTextureSpace * 2
      const offsetX = (textureWidth - circleDiameter) / 2
      const offsetY = (textureHeight - circleDiameter) / 2
      
      this.body.setOffset(offsetX, offsetY)
      
      // Enable physics properties
      this.body.setCollideWorldBounds(true)
      this.body.setBounce(0)
      this.body.setAllowGravity(true)  // Rex needs gravity for bouncing
      this.body.setGravityY(0)  // Use world gravity, not custom
      
      console.log('🦖 REX ENEMY CREATED:')
      console.log('  Display size:', rexSize, 'x', rexSize)
      console.log('  Circle diameter:', desiredRadius * 2, 'px')
      console.log('  Body is circular:', this.body.isCircle)
      console.log('  Move speed:', this.moveSpeed)
    }
    
    this.setDepth(15)
    
    // Store platform bounds
    this.platformBounds = {
      left: platformLeft,
      right: platformRight
    }
    
    // Start patrol movement - Rex moves horizontally while bouncing
    this.direction = Math.random() < 0.5 ? -1 : 1  // Random initial direction
    this.setVelocityX(this.moveSpeed * this.direction)
    
    // Initialize random timers
    this.nextBlinkTime = Math.random() * 2000 + 1000  // 1-3 seconds
    this.bounceTimer = 1000 + Math.random() * 1000  // Start bouncing soon
  }
  
  update(time: number, delta: number): void {
    // Update timers
    this.bounceTimer -= delta  // Count DOWN, not up!
    this.blinkTimer += delta
    
    // Check if on ground
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      const onGround = this.body.touching.down || this.body.blocked.down
      
      if (onGround && this.isInAir) {
        // Just landed - do squish animation
        this.onLanding()
        this.isInAir = false
      } else if (!onGround && !this.isInAir) {
        // Just took off
        this.isInAir = true
      }
      
      // Handle bouncing - simpler like green bouncer
      if (this.bounceTimer <= 0 && onGround && !this.isSquishing) {
        this.startBounce()
        this.bounceTimer = 1500 + Math.random() * 1500  // 1.5-3 seconds until next bounce
      }
      
      // Handle blinking (only on ground, not while squishing/stretching)
      if (onGround && !this.isInAir && !this.isSquishing && !this.isStretching) {
        this.updateBlinking()
      }
      
      // Handle flip rotation while in air
      if (this.isInAir && !onGround) {
        // Natural flip rotation - rotate based on time in air
        // Full 360 degree rotation over the jump duration
        const rotationSpeed = 0.008  // Smooth rotation speed
        this.rotation += rotationSpeed * delta * this.direction  // Rotate based on movement direction
        
        // Use blinking sprite while in air
        if (this.texture.key !== 'rexBlinking') {
          this.setTexture('rexBlinking')
        }
      } else if (onGround) {
        // Smoothly reset rotation when on ground
        if (Math.abs(this.rotation) > 0.1) {
          // Snap to nearest full rotation
          const targetRotation = Math.round(this.rotation / (Math.PI * 2)) * Math.PI * 2
          this.rotation = Phaser.Math.Linear(this.rotation, targetRotation, 0.3)
        } else {
          this.rotation = 0
        }
        
        // Switch back to normal sprite (will be overridden by blinking if needed)
        if (this.texture.key === 'rexBlinking' && !this.isBlinking) {
          this.setTexture('rexEyesOpen')
        }
      }
      
      // Horizontal patrol movement (like green bouncer)
      if (this.x <= this.platformBounds.left + 20) {
        this.direction = 1
        this.setVelocityX(this.moveSpeed * this.direction)
      } else if (this.x >= this.platformBounds.right - 20) {
        this.direction = -1
        this.setVelocityX(this.moveSpeed * this.direction)
      } else {
        // Maintain current velocity while not at edges
        this.setVelocityX(this.moveSpeed * this.direction)
      }
    }
  }
  
  private startBounce(): void {
    // Jump up - half the height
    this.setVelocityY(-175)  // Half of -350 for much lower jump
    this.isStretching = false
  }
  
  private onLanding(): void {
    // No squish animation - just reset flag
    this.isSquishing = false
  }
  
  private updateBlinking(): void {
    if (this.isBlinking) {
      // Currently blinking
      if (this.blinkTimer >= this.blinkDuration) {
        // End blink
        this.isBlinking = false
        this.setTexture('rexEyesOpen')
        this.blinkTimer = 0
        this.nextBlinkTime = 1000 + Math.random() * 3000  // 1-4 seconds until next blink
      }
    } else {
      // Check if it's time to blink
      if (this.blinkTimer >= this.nextBlinkTime) {
        this.isBlinking = true
        this.setTexture('rexBlinking')
        this.blinkTimer = 0
      }
    }
  }
  
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier
    this.moveSpeed = this.baseMoveSpeed * multiplier
  }
  
  squish(): void {
    // Prevent multiple squish calls
    if (this.isSquished) return
    
    this.isSquished = true
    this.setVelocity(0, 0)
    
    // Disable physics body immediately to prevent further collisions
    if (this.body) {
      this.body.enable = false
    }
    
    // Kill any existing tweens to prevent conflicts
    this.scene.tweens.killTweensOf(this)
    
    // Create light green particle burst effect
    const particleCount = 12
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics()
      
      // Create light green circular particles
      particle.fillStyle(0x90EE90, 1)  // Light green color
      particle.fillCircle(0, 0, 3)  // 3px radius particles
      
      // Position at Rex's location
      particle.x = this.x
      particle.y = this.y
      
      // Random velocity for burst effect
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
      const speed = 100 + Math.random() * 100  // 100-200 speed
      const velocityX = Math.cos(angle) * speed
      const velocityY = Math.sin(angle) * speed - 50  // Slight upward bias
      
      // Animate particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * 0.5,
        y: particle.y + velocityY * 0.5,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy()
        }
      })
    }
    
    // Fade out Rex quickly while particles burst
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        // Make sure to remove from parent group before destroying
        if (this.scene && (this.scene as any).rexEnemies) {
          (this.scene as any).rexEnemies.remove(this)
        }
        this.destroy()
      }
    })
  }
}