import GameSettings from "../config/GameSettings"

export class Beetle extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number
  private direction: number // 1 for right, -1 for left
  private platformBounds: { left: number; right: number }
  private animationTimer: number = 0
  private currentFrame: number = 0
  private animationFrames: string[] = [
    'beetle-mouth-closed',
    'beetle-mouth-open-30',
    'beetle-mouth-open-70',
    'beetle-mouth-open-30'
  ]
  private totalRotation: number = 0 // Track total rotation for smooth rolling
  private readonly rotationFactor: number = 0.004 // Rotation factor based on movement speed (slowed by 50%)
  
  // New behavior states
  private isRolling: boolean = true
  private isBiting: boolean = false
  private nextActionDistance: number = 0
  private distanceTraveled: number = 0
  private biteAnimationTimer: number = 0
  private biteDuration: number = 1200 // How long to stop and bite (1.2 seconds)
  private isSquished: boolean = false
  
  constructor(scene: Phaser.Scene, x: number, y: number, platformLeft: number, platformRight: number) {
    // Use beetle sprite or create placeholder if not loaded
    const textureKey = scene.textures.exists('beetle-mouth-closed') ? 'beetle-mouth-closed' : 'beetle'
    
    // Create placeholder if sprites not loaded
    if (!scene.textures.exists('beetle-mouth-closed')) {
      const graphics = scene.add.graphics()
      graphics.fillStyle(0xff0000, 1)
      graphics.fillRect(0, 0, 20, 16)
      graphics.generateTexture('beetle', 20, 16)
      graphics.destroy()
    }
    
    super(scene, x, y, textureKey)
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set up physics properties
    this.setCollideWorldBounds(true)
    this.setBounce(0)
    
    // Set size to 45x45 for visual display
    const beetleSize = 45
    
    // Set display size to 45x45
    this.setDisplaySize(beetleSize, beetleSize)
    
    // Set CIRCULAR physics body for smoother rolling motion!
    // Use 38px diameter circle as requested
    const desiredRadius = 19  // 38px diameter circle
    
    // Calculate radius in texture space
    const textureWidth = this.texture.get().width
    const textureHeight = this.texture.get().height
    const scaleX = beetleSize / textureWidth
    const scaleY = beetleSize / textureHeight
    const avgScale = (scaleX + scaleY) / 2
    const radiusInTextureSpace = desiredRadius / avgScale
    
    // Set circular hitbox
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setCircle(radiusInTextureSpace)
      
      // CENTER the visual sprite on the circular hitbox
      // The circle is smaller than the display size (38px vs 45px)
      // So we need to center the 38px circle within the 45px sprite
      const circleDiameter = radiusInTextureSpace * 2
      
      // Calculate offset to center the circle on the sprite
      // The sprite is 45x45, circle is 38x38
      // To center: (45-38)/2 = 3.5px offset on each side
      const centeringOffset = (beetleSize - (desiredRadius * 2)) / 2  // 3.5px
      const offsetX = centeringOffset / avgScale  // Convert to texture space
      const offsetY = centeringOffset / avgScale  // Convert to texture space
      
      this.body.setOffset(offsetX, offsetY)
      
      console.log('🪲 BEETLE CIRCULAR HITBOX:')
      console.log('  Circle diameter:', desiredRadius * 2, 'px (38px as requested)')
      console.log('  Body is circular:', this.body.isCircle)
      console.log('  Display size:', beetleSize, 'x', beetleSize)
      console.log('  Centering offset:', offsetX, ',', offsetY, '(texture space)')
      console.log('  Visual sprite centered on hitbox: ✅')
    }
    
    this.setDepth(15) // Beetles render on top of platforms and ladders
    
    // Store platform bounds for patrol behavior
    this.platformBounds = {
      left: platformLeft,
      right: platformRight
    }
    
    // Set random speed variation (90-110% of base)
    const speedVariation = 0.9 + Math.random() * 0.2
    this.moveSpeed = 80 * speedVariation
    
    // Random initial direction
    this.direction = Math.random() < 0.5 ? -1 : 1
    
    // Start moving
    this.setVelocityX(this.moveSpeed * this.direction)
    
    // Set initial random distance before first bite
    this.nextActionDistance = 100 + Math.random() * 200 // Roll 100-300 pixels before first bite
  }
  
  update(time?: number, delta?: number): void {
    if (!delta) return
    
    // Check platform bounds
    if (this.x <= this.platformBounds.left + 10) {
      this.direction = 1
    } else if (this.x >= this.platformBounds.right - 10) {
      this.direction = -1
    }
    
    if (this.isRolling) {
      // Rolling state - beetle moves and rotates
      this.setVelocityX(this.moveSpeed * this.direction)
      
      // Track distance traveled
      this.distanceTraveled += Math.abs(this.moveSpeed * this.direction * (delta / 1000))
      
      // Apply rolling animation
      const rotationSpeed = this.moveSpeed * this.rotationFactor
      this.totalRotation += rotationSpeed * this.direction
      this.setRotation(this.totalRotation)
      
      // Always show mouth closed while rolling
      if (this.scene && this.scene.textures.exists('beetle-mouth-closed')) {
        this.setTexture('beetle-mouth-closed')
      }
      
      // Check if it's time to stop and bite
      if (this.distanceTraveled >= this.nextActionDistance) {
        this.startBiting()
      }
    } else if (this.isBiting) {
      // Biting state - beetle stops and animates mouth
      this.setVelocityX(0)
      this.biteAnimationTimer += delta
      
      // Animate biting
      if (this.scene && this.scene.textures.exists('beetle-mouth-closed')) {
        this.animateBiting(delta)
      }
      
      // Check if biting duration is over
      if (this.biteAnimationTimer >= this.biteDuration) {
        this.startRolling()
      }
    }
  }
  
  private startBiting(): void {
    this.isRolling = false
    this.isBiting = true
    this.biteAnimationTimer = 0
    this.currentFrame = 0
    this.animationTimer = 0
    
    // Reset rotation to upright position for normal biting appearance
    this.setRotation(0)
    this.totalRotation = 0 // Reset total rotation so it starts fresh when rolling resumes
  }
  
  private startRolling(): void {
    this.isRolling = true
    this.isBiting = false
    this.distanceTraveled = 0
    // Set random distance for next bite (50-250 pixels)
    this.nextActionDistance = 50 + Math.random() * 200
    // Reset to closed mouth
    if (this.scene && this.scene.textures.exists('beetle-mouth-closed')) {
      this.setTexture('beetle-mouth-closed')
    }
  }
  
  private animateBiting(delta: number): void {
    this.animationTimer += delta
    
    // Change frame every 300ms for slower, more natural biting animation
    if (this.animationTimer >= 300) {
      this.animationTimer = 0
      
      // Cycle through animation frames
      this.currentFrame = (this.currentFrame + 1) % this.animationFrames.length
      const frameTexture = this.animationFrames[this.currentFrame]
      
      // Update texture if it exists
      if (this.scene && this.scene.textures.exists(frameTexture)) {
        this.setTexture(frameTexture)
      }
    }
  }
  
  // Method to reverse direction when hitting another beetle
  reverseDirection(): void {
    this.direction *= -1
    // Only update velocity if currently rolling
    if (this.isRolling) {
      this.setVelocityX(this.moveSpeed * this.direction)
    }
  }
  
  getDirection(): number {
    return this.direction
  }
  
  squish(): void {
    if (this.isSquished) return
    
    this.isSquished = true
    this.setVelocity(0, 0)
    
    // Stop rolling behavior
    this.isRolling = false
    this.isBiting = false
    
    // Disable physics body immediately to prevent further collisions
    if (this.body) {
      this.body.enable = false
    }
    
    // Reset rotation to upright for squish effect
    this.setRotation(0)
    this.totalRotation = 0
    
    // Set to closed mouth texture for clean squish
    if (this.scene && this.scene.textures.exists('beetle-mouth-closed')) {
      this.setTexture('beetle-mouth-closed')
    }
    
    // Check if scene still exists before creating tween
    if (!this.scene) return
    
    // Squish animation
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.2,
      scaleX: 1.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        // Make sure to remove from parent group before destroying
        if (this.scene && (this.scene as any).beetles) {
          (this.scene as any).beetles.remove(this)
        }
        this.destroy()
      }
    })
  }
}