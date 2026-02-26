import GameSettings from '../config/GameSettings'

export class BaseBlu extends Phaser.Physics.Arcade.Sprite {
  private movementSpeed: number // Very slow patrol speed
  private direction: number // 1 for right, -1 for left
  private isPushing: boolean = false // Whether currently pushing/blocking player
  private platform: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null
  private platformLeft: number = 0
  private platformRight: number = 0
  private isStunned: boolean = false // Whether BaseBlu is stunned (eyes closed, immobile)
  private stunEndTime: number = 0 // When the stun effect should end
  
  // Eye animation properties
  private eyeSprites: string[] = [
    'baseblue-eyes-center',
    'baseblue-eyes-down',
    'baseblue-eyes-down-right',
    'baseblue-eyes-middle-right',
    'baseblue-eyes-up',
    'baseblue-eyes-up-left',
    'baseblue-eyes-middle-left',
    'baseblue-eyes-down-left',
    'baseblue-eyes-blinking'
  ]
  private currentEyeIndex: number = 0
  private blinkTimer: number = 0
  private nextBlinkTime: number = 0
  private eyeMovementTimer: number = 0
  private nextEyeMovementTime: number = 0
  private isBlinking: boolean = false
  private isRollingEyes: boolean = false
  private eyeRollSequence: number[] = []
  private eyeRollIndex: number = 0
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Move visual sprite up by 8 pixels and left by 15 pixels (shifted down 2px from previous -10)
    super(scene, x - 15, y - 8, 'baseblue-eyes-center')
    
    scene.add.existing(this)
    scene.physics.add.existing(this) // Dynamic body but immovable
    
    // Set visual size to 48x48
    this.setDisplaySize(48, 48)
    
    // Set up physics
    this.setCollideWorldBounds(false) // We'll handle platform edges manually
    this.setBounce(0)
    this.setGravityY(GameSettings.game.gravity)
    this.setSize(42, 46) // 42x46 hitbox (8px taller, was 38)
    
    // Make BaseBlu completely immovable but allow it to affect other objects
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setImmovable(true) // Cannot be moved by other bodies
    body.setMass(10000) // Extremely heavy to resist pushing
    body.moves = false // Prevent physics engine from moving this object
    
    // Since we moved the sprite up and left visually, adjust the physics offset
    // The physics body needs to be positioned correctly relative to the visual sprite
    // Hitbox is now 42x46 (8px taller than before)
    // Keep same X offset: 20
    // Keep same Y offset: 19 (this keeps the top of the physics body aligned)
    this.setOffset(20, 19) // Keep top aligned - bottom extends down 8px more
    
    // Set random speed variation (90-110% of base 20)
    const speedVariation = 0.9 + Math.random() * 0.2
    this.movementSpeed = 20 * speedVariation
    
    // Random initial direction
    this.direction = Math.random() < 0.5 ? -1 : 1
    // Note: We'll handle movement manually since body.moves = false
    
    // Initialize eye animation timers
    this.nextBlinkTime = Phaser.Math.Between(2000, 5000)
    this.nextEyeMovementTime = Phaser.Math.Between(1000, 3000)
    
    // Set depth
    this.setDepth(15)
  }
  
  
  setPlatformBounds(left: number, right: number): void {
    this.platformLeft = left
    this.platformRight = right
  }
  
  setInitialDirection(direction: number): void {
    this.direction = direction // 1 for right, -1 for left
  }
  
  update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    
    // Check if stun period has ended
    if (this.isStunned && time >= this.stunEndTime) {
      this.endStun()
    }
    
    
    // Skip all movement and animations if stunned
    if (this.isStunned) {
      return // Skip all other updates
    }
    
    // Handle edge detection and turning
    if (!this.isPushing) {
      const oldX = this.x
      const oldDirection = this.direction
      
      if (this.x <= this.platformLeft + 16) {
        this.direction = 1 // Turn right
        this.x = this.platformLeft + 16
      } else if (this.x >= this.platformRight - 16) {
        this.direction = -1 // Turn left
        this.x = this.platformRight - 16
      }
      
      // Manual movement since body.moves = false
      const movement = (this.movementSpeed * this.direction * delta) / 1000
      this.x += movement
      
      // Flip sprite based on direction (sprites face left by default)
      this.setFlipX(this.direction > 0) // Flip when going right
    }
    
    // Update eye animations
    this.updateEyeAnimations(time, delta)
  }
  
  private updateEyeAnimations(time: number, delta: number): void {
    // Handle eye rolling sequence
    if (this.isRollingEyes && this.eyeRollSequence.length > 0) {
      this.eyeMovementTimer += delta
      if (this.eyeMovementTimer >= 150) { // Fast eye movement for rolling
        this.eyeMovementTimer = 0
        this.eyeRollIndex++
        if (this.eyeRollIndex >= this.eyeRollSequence.length) {
          this.isRollingEyes = false
          this.eyeRollSequence = []
          this.eyeRollIndex = 0
          this.setTexture('baseblue-eyes-center')
        } else {
          const eyeIndex = this.eyeRollSequence[this.eyeRollIndex]
          this.setTexture(this.eyeSprites[eyeIndex])
        }
      }
      return // Skip other animations while rolling eyes
    }
    
    // Handle blinking
    this.blinkTimer += delta
    if (this.isBlinking) {
      if (this.blinkTimer >= 150) { // Blink duration
        this.isBlinking = false
        this.blinkTimer = 0
        this.nextBlinkTime = Phaser.Math.Between(2000, 5000)
        this.setTexture('baseblue-eyes-center')
      }
    } else if (this.blinkTimer >= this.nextBlinkTime) {
      this.isBlinking = true
      this.blinkTimer = 0
      this.setTexture('baseblue-eyes-blinking')
    }
    
    // Handle regular eye movement
    if (!this.isBlinking) {
      this.eyeMovementTimer += delta
      if (this.eyeMovementTimer >= this.nextEyeMovementTime) {
        this.eyeMovementTimer = 0
        this.nextEyeMovementTime = Phaser.Math.Between(1000, 3000)
        
        // Occasionally do an eye roll sequence
        if (Math.random() < 0.15) { // 15% chance to roll eyes
          this.startEyeRoll()
        } else {
          // Random eye movement
          const randomEye = Phaser.Math.Between(0, 7) // Exclude blinking sprite
          this.setTexture(this.eyeSprites[randomEye])
        }
      }
    }
  }
  
  private startEyeRoll(): void {
    this.isRollingEyes = true
    this.eyeRollIndex = 0
    this.eyeMovementTimer = 0
    
    // Create a circular eye roll pattern
    // up -> up-right -> right -> down-right -> down -> down-left -> left -> up-left -> up
    this.eyeRollSequence = [4, 3, 3, 2, 1, 7, 6, 5, 4] // Indices for eye roll
  }
  
  startPushing(): void {
    this.isPushing = true
    // No velocity to set since we use manual movement
  }
  
  stopPushing(): void {
    this.isPushing = false
  }
  
  // Called when player collides with BaseBlu
  startStun(): void {
    if (this.isStunned) return // Already stunned
    
    // Check if scene still exists
    if (!this.scene) return
    
    this.isStunned = true
    this.stunEndTime = this.scene.time.now + 2000 // 2 second stun
    // Movement is handled by manual position updates, so no velocity to stop
    this.setTexture('baseblue-eyes-blinking') // Close eyes
  }
  
  private endStun(): void {
    this.isStunned = false
    this.setTexture('baseblue-eyes-center') // Open eyes
    // Movement will resume automatically in next update cycle
  }
  
  // Called when player jumps on top
  handlePlayerBounce(): void {
    // BaseBlu cannot be squished, just provides bounce
    // The bounce velocity is handled by the collision system
    // No points awarded for bouncing on BaseBlu
  }
  
  // Check if BaseBlu can be killed by invincible player
  canBeKilledByInvinciblePlayer(): boolean {
    return true // BaseBlu can always be killed when player is invincible
  }
  
  // Called when killed by invincible player
  handleInvinciblePlayerKill(): number {
    this.squish()
    return 1000 // Award 1000 points
  }
  
  squish(): void {
    // Check if scene still exists
    if (!this.scene) return
    
    // Create squish tween animation
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.3, // Squish vertically
      scaleX: 1.2, // Stretch horizontally 
      alpha: 0.8,  // Fade slightly
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        // Make sure to remove from parent group before destroying
        if (this.scene && (this.scene as any).baseBlus) {
          (this.scene as any).baseBlus.remove(this)
        }
        this.destroy()
      }
    })
  }
  
  // Check if player is trying to push from the side
  isPlayerColliding(player: Phaser.Physics.Arcade.Sprite): boolean {
    const playerBounds = player.getBounds()
    const myBounds = this.getBounds()
    
    // Check if player is on the sides (not on top)
    const overlapY = Math.min(playerBounds.bottom, myBounds.bottom) - 
                     Math.max(playerBounds.top, myBounds.top)
    const overlapX = Math.min(playerBounds.right, myBounds.right) - 
                     Math.max(playerBounds.left, myBounds.left)
    
    // If player is more to the side than on top
    if (overlapY > 0 && overlapX > 0 && overlapY < myBounds.height * 0.5) {
      return false // This is a top collision, not side
    }
    
    return overlapX > 0 && overlapY > 0
  }
  
  destroy(): void {
    super.destroy()
  }
}