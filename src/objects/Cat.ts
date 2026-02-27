import GameSettings from "../config/GameSettings"

export enum CatColor {
  BLUE = 'blue',
  PURPLE = 'purple',  // Purple chomper - visual variant of blue
  YELLOW = 'yellow',
  GREEN = 'green',
  RED = 'red',
  BLUE_CATERPILLAR = 'blue_caterpillar'
}

/**
 * IMPORTANT: Phaser setOffset() Coordinate System Reference
 * ======================================================
 * setOffset(x, y) positions the sprite's TOP-LEFT corner relative to the physics body
 * 
 * Y-AXIS BEHAVIOR:
 * - SMALLER Y offset = sprite moves DOWN (towards bottom of screen)
 * - LARGER Y offset = sprite moves UP (towards top of screen)
 * 
 * X-AXIS BEHAVIOR:
 * - SMALLER X offset = sprite moves LEFT
 * - LARGER X offset = sprite moves RIGHT
 * 
 * VISUAL DIRECTION HELPERS:
 * - To move sprite DOWN: SUBTRACT from Y offset
 * - To move sprite UP: ADD to Y offset
 * - To move sprite LEFT: SUBTRACT from X offset  
 * - To move sprite RIGHT: ADD to X offset
 */
export class Cat extends Phaser.Physics.Arcade.Sprite {
  private baseSpeed: number = 80
  private moveSpeed: number
  private direction: number
  public platformBounds: { left: number; right: number }
  private catColor: CatColor
  private bounceTimer: number = 0
  private randomMoveTimer: number = 0
  private isSquished: boolean = false
  private gapDetectionCooldown: number = 0
  private collisionCooldown: number = 0
  private debugGraphics: Phaser.GameObjects.Graphics | null = null
  private debugUpdateHandler: (() => void) | null = null
  
  // Blue enemy animation system
  private yellowEnemyAnimationState: 'mouthClosed' | 'mouthOpen' | 'blinking' = 'mouthClosed'
  private blueEnemyAnimationState: 'idle' | 'bite_partial' | 'bite_full' | 'blinking' = 'idle'
  private biteTimer: number = 0
  private blinkTimer: number = 0
  private biteAnimationTimer: number = 0
  private blinkAnimationTimer: number = 0
  private nextExpressionTime: number = 0
  private nextBiteTime: number = 0
  private nextBlinkTime: number = 0
  private blueTextureFixed: boolean = false  // Track if we've already fixed the texture
  
  // Stuck detection for Chompers
  private stuckTimer: number = 0
  private lastPositionX: number = 0
  private stuckThreshold: number = 1500 // Reduced to 1.5 seconds for faster recovery
  private positionCheckInterval: number = 250 // Check position every 0.25 seconds
  private positionCheckTimer: number = 0
  private positionHistory: number[] = [] // Track last few positions
  private velocityStuckTimer: number = 0 // Track time with zero velocity
  
  // Individual speed variation to prevent clustering
  private individualSpeedMultiplier: number = 1
  private turnDelayTimer: number = 0
  
  // Red enemy animation system
  private redEnemyAnimationState: 'patrol' | 'bite_starting' | 'bite_opening' | 'bite_wide' | 'bite_closing' = 'patrol'
  private redBiteTimer: number = 0
  private redBlinkTimer: number = 0
  private redBiteSequenceTimer: number = 0
  private redEyeState: 1 | 2 = 1
  private nextRedBiteTime: number = 0
  private nextRedBlinkTime: number = 0
  private redBiteFrameIndex: number = 0
  
  // Green enemy (Bouncer) animation system
  private greenEnemyAnimationState: 'eyeRight' | 'eyeCenter' | 'eyeLeft' | 'blinking' = 'eyeRight'
  private greenEyeTimer: number = 0
  private greenBlinkTimer: number = 0
  private nextGreenEyeTime: number = 0
  private nextGreenBlinkTime: number = 0
  
  // Blue caterpillar animation system
  private blueCaterpillarAnimationState: 'eyesRight' | 'eyesLeft' | 'eyesDown' | 'blinking' = 'eyesDown'
  private blueCaterpillarEyeTimer: number = 0
  private blueCaterpillarBlinkTimer: number = 0
  private nextBlueCaterpillarEyeTime: number = 0
  private nextBlueCaterpillarBlinkTime: number = 0
  private blueCaterpillarAnimationDelay: number = 0 // NO DELAY - testing if animations interfere
  private blueCaterpillarAnimationsEnabled: boolean = true // Start enabled
  private blueCaterpillarVelocityLogTimer: number = 0 // For periodic logging
  private blueCaterpillarVelocityCheckTimer: number = 0 // For checking if velocity sticks
  private blueCaterpillarLastX: number = 0 // Track last position
  private blueCaterpillarStuckFrames: number = 0 // Count frames without movement
  
  // Stalker properties (special type of red enemy)
  private isStalker: boolean = false
  private stalkerState: 'hidden' | 'activated' | 'chasing' = 'hidden'
  private stalkerTriggerDistance: number = 64  // Increased from 32 to 64 pixels (2 tiles)
  private stalkerPlayerRef: Phaser.Physics.Arcade.Sprite | null = null
  private stalkerOriginalY: number = 0
  private stalkerHasPlayerPassed: boolean = false
  private stalkerMineTimer: number = 0
  private stalkerMineDelayDuration: number = 3000 // 3 second delay
  private stalkerCurrentSpeed: number = 80 * 1.5
  private stalkerSpeedIncrement: number = 5
  private stalkerChasePersistenceTimer: number = 0
  private stalkerChasePersistenceDuration: number = 4000 // 4 seconds
  private stalkerIsInPersistentChase: boolean = false
  
  // Stalker eye animation
  private stalkerEyeState: 'eye1' | 'eye2' | 'eye3' | 'eye4' | 'blink' = 'eye1'
  private stalkerEyeAnimationTimer: number = 0
  
  // Public getter methods for kill tracking
  public getCatColor(): CatColor {
    return this.catColor
  }
  
  public getIsStalker(): boolean {
    return this.isStalker
  }
  
  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    platformLeft: number, 
    platformRight: number,
    color?: CatColor | string,
    isStalker: boolean = false
  ) {
    const colors = [CatColor.BLUE, CatColor.YELLOW, CatColor.GREEN, CatColor.RED, CatColor.BLUE_CATERPILLAR]
    
    // Convert string color to CatColor enum if needed
    let catColor: CatColor
    if (color) {
      if (typeof color === 'string') {
        catColor = color as CatColor // Cast string to CatColor enum
      } else {
        catColor = color
      }
    } else {
      catColor = colors[Math.floor(Math.random() * colors.length)]
    }
    
    // Use proper animation sprites for all enemy types
    let textureKey: string
    
    if (catColor === CatColor.BLUE) {
      textureKey = 'blueEnemyMouthClosed'
    } else if (catColor === CatColor.PURPLE) {
      textureKey = 'purpleEnemyMouthClosed'  // Purple chomper variant
    } else if (catColor === CatColor.YELLOW) {
      textureKey = 'yellowEnemyMouthClosedEyeOpen'
    } else if (catColor === CatColor.GREEN) {
      textureKey = 'greenEnemy'
    } else if (catColor === CatColor.RED) {
      textureKey = 'redEnemyMouthClosedEyes1'
    } else if (catColor === CatColor.BLUE_CATERPILLAR) {
      textureKey = 'blueCaterpillarEyesDown'
    } else {
      // This shouldn't happen with proper enemy spawning
      // Unexpected cat color fallback (replaced console.log)
      textureKey = 'blueEnemyMouthClosed' // Default fallback
    }
    
    // Now call super with the determined texture
    super(scene, x, y, textureKey)
    
    this.catColor = catColor
    this.isStalker = isStalker
    
    // Set display size for green enemy immediately after creation
    // This prevents the 84x84 default size from being used
    if (catColor === CatColor.GREEN) {
      this.setDisplaySize(36, 36)
    }
    
    // Set up stalker if needed
    if (this.isStalker) {
      this.stalkerOriginalY = y
      // Use stalker enemy sprites
      if (scene.textures.exists('stalkerEnemyEye1')) {
        this.setTexture('stalkerEnemyEye1')
      }
      this.stalkerEyeState = 'eye1'
      // Stalker cat creation (replaced console.log)
    }
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Caterpillar enemy debug info (replaced console.log)
    
    // Apply enemy hitbox sizing AFTER physics body is created
    if ((catColor === CatColor.BLUE || catColor === CatColor.PURPLE) && this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setSize(63.5, 45)  // Decreased width by 4px: 67.5-4=63.5, height stays 45
      
      // Adjust physics body offset to align with sprite visual
      const isAnimationSprite = catColor === CatColor.BLUE ? 
        this.isBlueEnemyAnimationSprite(textureKey) : 
        this.isPurpleEnemyAnimationSprite(textureKey)
      const spriteYOffset = isAnimationSprite ? 32 : 19  // Updated offsets after moving down 26px total
      
      // Center the hitbox on the sprite visual
      this.body.setOffset(-15.75 + 2, spriteYOffset - 4.5) // Center horizontally with 2px left offset
      
    } else if (catColor === CatColor.YELLOW && this.body instanceof Phaser.Physics.Arcade.Body) {
      // Decrease Caterpillar (yellow enemy) hitbox by 30%
      const defaultWidth = this.body.width
      const defaultHeight = this.body.height
      this.body.setSize(defaultWidth * 0.7, defaultHeight * 0.7)
      
      // Center the smaller hitbox horizontally and align bottom edges
      const hitboxCenterOffsetX = (defaultWidth - this.body.width) / 2
      const hitboxCenterOffsetY = (defaultHeight - this.body.height) / 2
      this.body.setOffset(hitboxCenterOffsetX, hitboxCenterOffsetY)
      
      // Caterpillar hitbox debug info (replaced console.log)
      
    } else if (catColor === CatColor.BLUE_CATERPILLAR && this.body instanceof Phaser.Physics.Arcade.Body) {
      // Blue caterpillar - custom hitbox size
      const defaultWidth = this.body.width
      const defaultHeight = this.body.height
      this.body.setSize(54, 20)  // Set exact hitbox size to 54x20
      
      // DON'T set offset here - we'll do it in the visual setup section
      // to avoid conflicts between the two offset calls
      
    } else if (catColor === CatColor.RED && this.body instanceof Phaser.Physics.Arcade.Body) {
      // Snail (red patrol enemy) - CIRCULAR hitbox for smoother movement!
      // Note: Stalkers also use RED color but are handled separately by isStalker check
      if (!this.isStalker) {
        // Regular Snail enemy - use circular hitbox
        // 30x30 circle as requested
        const desiredRadius = 15  // 30px diameter circle
        
        // For red enemies, texture and display sizes may vary
        // Calculate proper radius in texture space
        const textureWidth = this.texture.get().width
        const displaySize = this.isStalker ? 42 : 52  // From visual setup: stalkers 42x42, snails 52x52
        const scale = displaySize / textureWidth
        const radiusInTextureSpace = desiredRadius / scale
        
        // Set circular hitbox
        this.body.setCircle(radiusInTextureSpace)
        
        // Center the circular hitbox
        const circleDiameter = radiusInTextureSpace * 2
        const offsetX = (textureWidth - circleDiameter) / 2
        const offsetY = (textureWidth - circleDiameter) / 2 + 14 / scale  // +14px visual offset from before
        
        this.body.setOffset(offsetX, offsetY)
        
        console.log('  Circle radius:', radiusInTextureSpace, 'px (texture space)')
        console.log('  Body is circular:', this.body.isCircle)
        console.log('  Display size:', displaySize, 'x', displaySize)
      } else {
        // Stalker - use circular hitbox for better chasing behavior
        // 24px diameter circle as requested
        const desiredRadius = 12  // 24px diameter circle
        
        // Calculate proper radius in texture space
        const textureWidth = this.texture.get().width
        const displaySize = 42  // Stalkers are 42x42
        const scale = displaySize / textureWidth
        const radiusInTextureSpace = desiredRadius / scale
        
        // Set circular hitbox
        this.body.setCircle(radiusInTextureSpace)
        
        // Center the circular hitbox
        const circleDiameter = radiusInTextureSpace * 2
        const offsetX = (textureWidth - circleDiameter) / 2
        const offsetY = (textureWidth - circleDiameter) / 2 + 14 / scale  // +14px visual offset
        
        this.body.setOffset(offsetX, offsetY)
        
        console.log('  Circle radius:', radiusInTextureSpace, 'px (texture space)')
        console.log('  Body is circular:', this.body.isCircle)
        console.log('  Display size:', displaySize, 'x', displaySize)
      }
    } else if (catColor === CatColor.GREEN && this.body instanceof Phaser.Physics.Arcade.Body) {
      // Green bouncer - CIRCULAR hitbox for smoother bouncing!
      // Using a circle with radius of ~12 pixels (24px diameter) in screen space
      const textureWidth = this.texture.get().width
      const textureHeight = this.texture.get().height
      const scaleX = this.displayWidth / textureWidth
      const scaleY = this.displayHeight / textureHeight
      
      // Calculate the radius in texture space to achieve desired screen size
      // We want approximately 24px diameter circle in screen space
      const desiredScreenRadius = 12
      // Use the average scale since circles need uniform scaling
      const avgScale = (scaleX + scaleY) / 2
      const radiusInTextureSpace = desiredScreenRadius / avgScale
      
      // Set circular hitbox!
      this.body.setCircle(radiusInTextureSpace)
      
      console.log('  Circle radius requested:', desiredScreenRadius, 'px (screen space)')
      console.log('  Circle radius actual:', radiusInTextureSpace, 'px (texture space)')
      console.log('  Body is circular:', this.body.isCircle)
      console.log('  Current sprite display size:', this.displayWidth, 'x', this.displayHeight)
      console.log('  Texture frame size:', textureWidth, 'x', textureHeight)
      
      // Center the circular hitbox on the sprite
      // For a circle, the offset positions the top-left of the bounding box
      // We need to account for the circle's diameter when centering
      const circleDiameter = radiusInTextureSpace * 2
      const offsetX = (textureWidth - circleDiameter) / 2
      const offsetY = (textureHeight - circleDiameter) / 2
      
      // Apply visual offset: sprite up 5px means hitbox down 5px
      const visualOffsetY = 5 / avgScale  // Move hitbox down in texture space
      
      this.body.setOffset(offsetX, offsetY + visualOffsetY)
      
      console.log('  Circle offset applied:', this.body.offset.x, ',', this.body.offset.y)
      console.log('  Average scale:', avgScale)
      console.log('  Visual offset in texture space:', 0, visualOffsetY)
    }
    
    this.setCollideWorldBounds(true)
    this.setBounce(0)
    
    // Only green enemies (bouncing) need gravity
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      if (catColor !== CatColor.GREEN) {
        this.body.setAllowGravity(false) // Blue, Yellow, Red, Blue Caterpillar patrol without gravity
      } else {
        // Green enemies keep gravity for bouncing behavior
        // Green enemy physics setup (replaced console.log)
      }
    }
    
    // Set up hitbox and visual alignment
    if (catColor === CatColor.YELLOW && this.isYellowEnemyAnimationSprite(textureKey)) {
      // For all yellow enemy animation sprites - use 54x21.6 size (90% of original)
      this.setDisplaySize(54, 21.6)
      
      console.log('  Visual sprite size:', this.displayWidth, 'x', this.displayHeight)
      console.log('  Original texture size:', this.texture.get().width, 'x', this.texture.get().height)
      console.log('  Texture key:', textureKey)
      
      // Align bottom edge of sprite with bottom edge of hitbox
      // setOffset positions the TOP-LEFT corner of the sprite
      // Sprite: 54x21.6, Hitbox: 70x28 (after 30% reduction)
      // To align bottom edges:
      // - X: Center sprite horizontally relative to hitbox: (70-54)/2 = 8px to the right
      // - Y: Move sprite down so bottoms align: (28-21.6) = 6.4px down
      this.setOffset(15, 5) // Adjusted Y offset for better floor alignment
      
      console.log('  Offset applied:', 15, ',', 5)
      
      this.setFlipX(false)
      this.initializeYellowEnemyAnimations()
    } else if (catColor === CatColor.BLUE_CATERPILLAR && this.isBlueCaterpillarAnimationSprite(textureKey)) {
      // Blue caterpillar - larger size (64 wide, proportionally scaled)
      this.setDisplaySize(64, 25.6)
      
      console.log('  Visual sprite size:', this.displayWidth, 'x', this.displayHeight)
      console.log('  Physics body size: 54 x 20 (set earlier)')
      console.log('  Original texture size:', this.texture.get().width, 'x', this.texture.get().height)
      console.log('  Texture key:', textureKey)
      
      // We need to position the 54x20 physics body relative to the 64x25.6 visual sprite
      // The physics body should be centered horizontally and aligned with floor
      // Original texture size affects the offset calculation
      const originalWidth = this.texture.get().width
      const originalHeight = this.texture.get().height
      
      // Calculate offset to center the 54x20 physics body on the sprite
      // First, center it relative to original texture size
      const centerOffsetX = (originalWidth - 54) / 2
      const centerOffsetY = (originalHeight - 20) / 2
      
      // Now adjust for floor alignment
      // Set to exact values for proper positioning
      const finalOffsetX = 23
      const finalOffsetY = 15
      
      this.setOffset(finalOffsetX, finalOffsetY)
      
      console.log('  Calculated center offset:', centerOffsetX, ',', centerOffsetY)
      console.log('  Final offset applied:', finalOffsetX, ',', finalOffsetY)
      console.log('  Sprite position:', this.x, ',', this.y)
      
      this.setFlipX(false)
      this.initializeBlueCaterpillarAnimations()
      
      // Delay animations to let movement establish first
      this.blueCaterpillarAnimationsEnabled = false
      this.blueCaterpillarAnimationDelay = 1500 // 1.5 seconds
      
      // Log final setup
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        console.log('  Final physics body offset:', this.body.offset.x, ',', this.body.offset.y)
        console.log('  Physics body position:', this.body.x, ',', this.body.y)
      }
    } else if (catColor === CatColor.BLUE && this.isBlueEnemyAnimationSprite(textureKey)) {
      // For all blue enemy animation sprites - use consistent positioning
      this.setDisplaySize(36, 36)
      this.setOffset(3 - 2 + 4, 58 - 18 - 8) // Move left 6px total (2px + 4px) and down 26 pixels
      this.setFlipX(false)
      this.initializeBlueEnemyAnimations()
    } else if (catColor === CatColor.PURPLE && this.isPurpleEnemyAnimationSprite(textureKey)) {
      // Purple chomper - same size and behavior as blue
      this.setDisplaySize(36, 36)
      this.setOffset(3 - 2 + 4, 58 - 18 - 8) // Same positioning as blue
      this.setFlipX(false)
      this.initializeBlueEnemyAnimations()  // Purple uses same animation system as blue
    } else if (catColor === CatColor.RED && this.isRedEnemyAnimationSprite(textureKey)) {
      // For red enemy animation sprites - fine-tuned positioning
      const displaySize = this.isStalker ? 42 : 52 // Stalkers: 20% smaller (42x42), regular red: (52x52)
      this.setDisplaySize(displaySize, displaySize)
      // Adjust offset for stalkers vs regular red enemies  
      // Calculate Y offset: stalkers=24 (UP 6px), snails=26 (DOWN 4px from original 30)
      const yOffset = this.isStalker ? (44 - 12 - 2 - 6) : ((44 - 12 - 2) - 4) 
      this.setOffset(18, yOffset) // X=18 (moved LEFT 15px), Y=24/26 (stalkers UP, snails DOWN)
      this.setFlipX(false)
      this.initializeRedEnemyAnimations()
      
      if (this.isStalker) {
        // Stalker sprite positioning info (replaced console.log)
      }
    } else if (catColor === CatColor.GREEN && textureKey === 'greenEnemy') {
      // Green enemy - display size already set in constructor
      // Offset is handled in the physics body setup, not here
      this.setFlipX(false)
      
      console.log('  Display size remains:', this.displayWidth, 'x', this.displayHeight)
      console.log('  Physics body handles visual offset')
    } else {
      // No fallback needed - all enemies should use proper animation sprites
      // Unknown sprite warning (replaced console.log)
    }
    
    // === FINAL VERIFICATION ===
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      // Enemy constructor complete (replaced console.log)
    }
    
    this.setDepth(15)
    
    this.platformBounds = {
      left: platformLeft,
      right: platformRight
    }
    
    this.setupBehavior()
    
    // Set initial flip state for blue enemy sprite (facing left by default, moving right initially)
    if (catColor === CatColor.BLUE && scene.textures.exists('blueEnemy')) {
      this.setFlipX(this.direction > 0) // Flip if moving right
    }
    
    // Phaser's built-in debug visualization will show the hitbox
    
    // Special setup for stalkers
    if (this.isStalker) {
      // Start hidden
      this.setVisible(false)
      this.setVelocity(0, 0)
      this.body!.setGravityY(0) // No gravity for stalkers
      this.body!.setImmovable(true) // Don't move while hidden
      // Stalker hidden and waiting (replaced console.log)
    } else {
      this.setVelocityX(this.moveSpeed * this.direction)
      
      // Extra insurance for Blue Caterpillar movement
      if (this.catColor === CatColor.BLUE_CATERPILLAR) {
        // ENSURE body is movable
        if (this.body) {
          this.body.setImmovable(false)
          this.body.moves = true
        }
        // Blue caterpillar initial setup complete
      }
    }
  }
  
  private setupBehavior(): void {
    // Add individual speed variation to prevent clustering (85% to 115%)
    this.individualSpeedMultiplier = 0.85 + Math.random() * 0.3
    
    // Get current level from scene if available
    const scene = this.scene as any
    const currentLevel = scene.levelManager?.getCurrentLevel() || 1
    const isEarlyLevel = currentLevel <= 10
    
    switch (this.catColor) {
      case CatColor.BLUE:
      case CatColor.PURPLE:  // Purple chompers have same speed as blue
        this.moveSpeed = this.baseSpeed * this.individualSpeedMultiplier
        break
      case CatColor.YELLOW:
        // Even slower in early levels for better predictability
        const yellowSpeedMultiplier = isEarlyLevel ? 0.4 : 0.6  // 40% speed in levels 1-10, 60% after
        this.moveSpeed = this.baseSpeed * yellowSpeedMultiplier * this.individualSpeedMultiplier
        break
      case CatColor.BLUE_CATERPILLAR:
        // Blue caterpillar - slightly faster than yellow, more predictable movement
        const blueSpeedMultiplier = isEarlyLevel ? 0.65 : 0.8  // Increased: 65% speed in levels 1-10, 80% after
        this.moveSpeed = this.baseSpeed * blueSpeedMultiplier * this.individualSpeedMultiplier
        break
      case CatColor.GREEN:
        // Reduce green bouncer speed for more manageable gameplay
        this.moveSpeed = this.baseSpeed * 1.0 * this.individualSpeedMultiplier  // Reduced from 1.5x to 1.0x
        break
      case CatColor.RED:
        this.moveSpeed = this.baseSpeed * 1.2 * this.individualSpeedMultiplier // Fast but not as fast as green
        break
    }
    
    // Initial direction - more predictable in early levels
    if (this.catColor === CatColor.YELLOW && isEarlyLevel) {
      // In early levels, yellow enemies tend to move away from spawn center
      // This gives players more time to react
      const centerX = (this.platformBounds.left + this.platformBounds.right) / 2
      this.direction = this.x < centerX ? -1 : 1  // Move towards edges
    } else if (this.catColor === CatColor.GREEN) {
      // Green enemies: randomize initial direction to prevent clustering
      this.direction = Math.random() < 0.5 ? -1 : 1
      // Also randomize initial bounce timer to prevent synchronized bouncing
      this.bounceTimer = Math.random() * 1500  // Random start between 0-1.5 seconds
    } else {
      // Random initial direction for other enemies and later levels
      this.direction = Math.random() < 0.5 ? -1 : 1
    }
  }
  
  
  update(time: number, delta: number): void {
    if (this.isSquished) return
    
    // Update collision cooldown for all enemy types
    this.collisionCooldown -= delta
    
    // Special handling for stalkers
    if (this.isStalker) {
      this.updateStalker(delta)
      return
    }
    
    // Movement logging temporarily disabled to see creation logs
    
    // Only update movement if body exists
    if (this.body) {
      switch (this.catColor) {
        case CatColor.BLUE:
        case CatColor.PURPLE:  // Purple uses same patrol and animations as blue
          this.updateBluePatrol()
          this.updateBlueEnemyAnimations(delta)
          this.checkIfChomperStuck(delta)  // Check for stuck state
          break
        case CatColor.YELLOW:
          this.updateYellowPatrol(delta)
          this.updateYellowEnemyAnimations(delta)
          this.checkIfCaterpillarStuck(delta)  // Add stuck detection for yellow too
          break
        case CatColor.BLUE_CATERPILLAR:
          this.updateBlueCaterpillarPatrol(delta)
          this.updateBlueCaterpillarAnimations(delta)
          this.checkIfCaterpillarStuck(delta)  // Add stuck detection
          break
        case CatColor.GREEN:
          this.updateGreenBounce(delta)
          this.updateGreenEnemyAnimations(delta)
          break
        case CatColor.RED:
          this.updateRedPatrol()
          this.updateRedEnemyAnimations(delta)
          break
      }
    }
  }
  
  private updateBluePatrol(): void {
    // PAUSE movement during bite animations for cleaner look
    // Our new safety systems will prevent getting stuck
    if (this.blueEnemyAnimationState === 'bite_partial' || 
        this.blueEnemyAnimationState === 'bite_full') {
      this.setVelocityX(0) // Stop moving during bite
      // Don't return - still need to check edges for safety
    }
    
    // Handle turn delay timer
    if (this.turnDelayTimer > 0) {
      this.turnDelayTimer -= Phaser.Math.Clamp(16, 0, 100) // Use fixed delta approximation
    }
    
    // Check for edge proximity and turn around if too close
    const edgeBuffer = 40 // Increased buffer for safer turning
    if (this.x <= this.platformBounds.left + edgeBuffer) {
      if (this.turnDelayTimer <= 0) {
        this.direction = 1
        // Force position away from edge if too close
        if (this.x < this.platformBounds.left + 20) {
          this.x = this.platformBounds.left + 20
        }
        // Add small random delay to prevent synchronized turning (50-200ms)
        this.turnDelayTimer = 50 + Math.random() * 150
        // Cancel any ongoing bite animation at edges
        if (this.blueEnemyAnimationState === 'bite_partial' || 
            this.blueEnemyAnimationState === 'bite_full') {
          this.blueEnemyAnimationState = 'idle'
          this.biteAnimationTimer = 0
          this.nextBiteTime = this.biteTimer + 1000 // Delay next bite
          // Resume movement when cancelling bite at edge
          this.setVelocityX(this.moveSpeed * this.direction)
        }
      }
    } else if (this.x >= this.platformBounds.right - edgeBuffer) {
      if (this.turnDelayTimer <= 0) {
        this.direction = -1
        // Force position away from edge if too close
        if (this.x > this.platformBounds.right - 20) {
          this.x = this.platformBounds.right - 20
        }
        // Add small random delay to prevent synchronized turning (50-200ms)
        this.turnDelayTimer = 50 + Math.random() * 150
        // Cancel any ongoing bite animation at edges
        if (this.blueEnemyAnimationState === 'bite_partial' || 
            this.blueEnemyAnimationState === 'bite_full') {
          this.blueEnemyAnimationState = 'idle'
          this.biteAnimationTimer = 0
          this.nextBiteTime = this.biteTimer + 1000 // Delay next bite
          // Resume movement when cancelling bite at edge
          this.setVelocityX(this.moveSpeed * this.direction)
        }
      }
    }
    
    // Set movement based on current state
    if (this.blueEnemyAnimationState === 'idle') {
      // Normal patrol movement
      this.setVelocityX(this.moveSpeed * this.direction)
    }
    // Movement during bite is already handled above
    
    // Update sprite flip for all blue and purple enemy sprites
    if (this.catColor === CatColor.BLUE || this.catColor === CatColor.PURPLE) {
      this.setFlipX(this.direction > 0) // Flip when moving right
    }
  }
  
  private updateYellowPatrol(delta: number): void {
    // Get current level from scene if available
    const scene = this.scene as any
    const currentLevel = scene.levelManager?.getCurrentLevel() || 1
    const isEarlyLevel = currentLevel <= 10
    
    this.randomMoveTimer -= delta
    
    if (this.randomMoveTimer <= 0) {
      // In levels 1-10: Much more predictable movement
      // In later levels: Original erratic behavior
      const changeChance = isEarlyLevel ? 0.05 : 0.3  // 5% vs 30% chance to change direction
      
      if (Math.random() < changeChance) {
        this.direction = Math.random() < 0.5 ? -1 : 1
      }
      
      // More consistent timing in early levels
      if (isEarlyLevel) {
        this.randomMoveTimer = 2000 + Math.random() * 1000  // 2-3 seconds (predictable)
      } else {
        this.randomMoveTimer = 500 + Math.random() * 1000   // 0.5-1.5 seconds (erratic)
      }
    }
    
    // Handle turn delay timer
    if (this.turnDelayTimer > 0) {
      this.turnDelayTimer -= delta
    }
    
    // Check if velocity is being blocked (likely by spike or wall)
    const velocityBlocked = Math.abs(this.body!.velocity.x) < 5 && Math.abs(this.moveSpeed) > 0
    
    // Check boundaries with velocity detection for spikes
    const edgeBuffer = 35 // Increased to account for spike collision bodies
    if (this.x <= this.platformBounds.left + edgeBuffer || (velocityBlocked && this.direction === -1)) {
      if (this.turnDelayTimer <= 0) {
        this.direction = 1
        // Add random delay before next possible turn (100-500ms)
        this.turnDelayTimer = 100 + Math.random() * 400
      }
    } else if (this.x >= this.platformBounds.right - edgeBuffer || (velocityBlocked && this.direction === 1)) {
      if (this.turnDelayTimer <= 0) {
        this.direction = -1
        // Add random delay before next possible turn (100-500ms)
        this.turnDelayTimer = 100 + Math.random() * 400
      }
    }
    
    this.setVelocityX(this.moveSpeed * this.direction)
    
    // Flip sprite based on direction for yellow enemies with animation sprites
    if (this.isYellowEnemyAnimationSprite(this.texture.key)) {
      this.setFlipX(this.direction === 1) // Flip when going right (direction = 1)
    }
  }
  
  private updateGreenBounce(delta: number): void {
    
    this.bounceTimer -= delta
    
    if (this.bounceTimer <= 0 && this.body?.touching.down) {
      this.setVelocityY(-200)
      // Add more randomness to bounce timing to prevent clustering
      this.bounceTimer = 1000 + Math.random() * 1000  // 1-2 seconds (was 0.8-1.2)
    }
    
    // Green enemies patrol the full width of their platform
    // Use larger margins to ensure they travel the full width
    if (this.x <= this.platformBounds.left + 20) {
      this.direction = 1
      // Add small random speed variation when turning to prevent clustering
      const variation = 0.9 + Math.random() * 0.2
      this.setVelocityX(this.moveSpeed * this.direction * variation)
    } else if (this.x >= this.platformBounds.right - 20) {
      this.direction = -1
      // Add small random speed variation when turning to prevent clustering
      const variation = 0.9 + Math.random() * 0.2
      this.setVelocityX(this.moveSpeed * this.direction * variation)
    } else {
      // Maintain current velocity while not at edges
      this.setVelocityX(this.moveSpeed * this.direction)
    }
  }
  
  private updateRedPatrol(): void {
    // Red enemies use strict platform bounds to prevent falling through gaps
    const edgeBuffer = 25 // Larger buffer to prevent getting too close to edges
    
    // Strong platform bounds checking similar to green enemies
    if (this.x <= this.platformBounds.left + edgeBuffer) {
      this.direction = 1
      // Force position if too close to edge
      if (this.x <= this.platformBounds.left + 5) {
        this.setX(this.platformBounds.left + 5)
      }
    } else if (this.x >= this.platformBounds.right - edgeBuffer) {
      this.direction = -1
      // Force position if too close to edge
      if (this.x >= this.platformBounds.right - 5) {
        this.setX(this.platformBounds.right - 5)
      }
    }
    
    // Reduced random direction changes to prevent erratic movement near edges
    if (Math.random() < 0.0005) { // 0.05% chance per frame = less frequent direction changes
      // Only reverse if not near edges
      if (this.x > this.platformBounds.left + edgeBuffer && this.x < this.platformBounds.right - edgeBuffer) {
        this.direction *= -1
      }
    }
    
    // Strict safety check: if red enemy is outside safe bounds, immediately constrain
    if (this.x < this.platformBounds.left + 5 || this.x > this.platformBounds.right - 5) {
      const constrainedX = Math.max(this.platformBounds.left + 5, Math.min(this.platformBounds.right - 5, this.x))
      this.setX(constrainedX)
      this.direction *= -1 // Reverse direction when constrained
    }
    
    this.setVelocityX(this.moveSpeed * this.direction)
  }
  
  reverseDirection(): void {
    if (this.isSquished) return
    
    // Only reverse if not in collision cooldown (prevents rapid bouncing)
    if (this.collisionCooldown <= 0) {
      this.direction *= -1
      this.setVelocityX(this.moveSpeed * this.direction)
      
      // Set collision cooldown to prevent immediate re-collision
      this.collisionCooldown = 200 // 200ms cooldown
      
      // Update sprite flip for blue enemy
      if (this.catColor === CatColor.BLUE) {
        this.setFlipX(this.direction > 0) // Flip when moving right
      }
    }
  }
  
  getDirection(): number {
    return this.direction
  }
  
  squish(): void {
    if (this.isSquished) return
    
    this.isSquished = true
    this.setVelocity(0, 0)
    
    // Disable physics body immediately to prevent further collisions
    if (this.body) {
      this.body.enable = false
    }
    
    // Clean up debug visualization immediately
    this.cleanupDebugVisualization()
    
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.2,
      scaleX: 1.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        // Make sure to remove from parent group before destroying
        if (this.scene && (this.scene as any).cats) {
          (this.scene as any).cats.remove(this)
        }
        this.destroy()
      }
    })
  }
  
  private addDebugVisualization(): void {
    // Only show in debug mode
    if (!GameSettings.debug) return
    
    this.debugGraphics = this.scene.add.graphics()
    
    // Store the update handler so we can remove it later
    this.debugUpdateHandler = () => {
      if (this.debugGraphics && this.debugGraphics.active && this.active) {
        this.debugGraphics.clear()
        
        // Draw visual sprite bounds (blue rectangle)
        this.debugGraphics.lineStyle(2, 0x0000ff, 0.8) // Blue for visual bounds
        const visualWidth = this.displayWidth
        const visualHeight = this.displayHeight
        this.debugGraphics.strokeRect(
          this.x - visualWidth/2,
          this.y - visualHeight/2,
          visualWidth,
          visualHeight
        )
        
        // Draw center cross (white)
        this.debugGraphics.lineStyle(1, 0xffffff, 0.8)
        this.debugGraphics.lineBetween(this.x - 5, this.y, this.x + 5, this.y) // Horizontal
        this.debugGraphics.lineBetween(this.x, this.y - 5, this.x, this.y + 5) // Vertical
        
        // Draw hitbox (red rectangle) - this is in addition to Phaser's green debug
        const body = this.body as Phaser.Physics.Arcade.Body
        if (body) {
          this.debugGraphics.lineStyle(2, 0xff0000, 0.8) // Red for hitbox
          this.debugGraphics.strokeRect(
            body.x,
            body.y,
            body.width,
            body.height
          )
          
        }
      }
    }
    
    // Update graphics position in update loop
    this.scene.events.on('postupdate', this.debugUpdateHandler)
    
    this.debugGraphics.setDepth(25) // Above enemy but below UI
    this.scene.add.existing(this.debugGraphics)
  }
  
  private cleanupDebugVisualization(): void {
    // Remove the event listener
    if (this.debugUpdateHandler) {
      this.scene.events.off('postupdate', this.debugUpdateHandler)
      this.debugUpdateHandler = null
    }
    
    // Destroy the graphics object
    if (this.debugGraphics) {
      this.debugGraphics.destroy()
      this.debugGraphics = null
    }
  }
  
  private addRoundedHitboxVisualization(): void {
    // Removed - replaced with addDebugVisualization
  }
  
  
  private isYellowEnemyAnimationSprite(textureKey: string): boolean {
    return [
      'yellowEnemyMouthOpenEyeOpen',
      'yellowEnemyMouthOpenBlinking',
      'yellowEnemyMouthClosedEyeOpen',
      'yellowEnemyMouthClosedBlinking'
    ].includes(textureKey)
  }

  private isBlueEnemyAnimationSprite(textureKey: string): boolean {
    return [
      'blueEnemyMouthClosed',
      'blueEnemyMouthClosedBlinking',
      'blueEnemyMouthPartialOpen',
      'blueEnemyMouthPartialOpenBlinking',
      'blueEnemyMouthOpen',
      'blueEnemyMouthOpenBlinking'
    ].includes(textureKey)
  }
  
  private isPurpleEnemyAnimationSprite(textureKey: string): boolean {
    return [
      'purpleEnemyMouthClosed',
      'purpleEnemyMouthPartialOpen',
      'purpleEnemyMouthOpen'
    ].includes(textureKey)
  }
  
  
  private initializeYellowEnemyAnimations(): void {
    // Set random initial timers to make enemies feel unique
    this.nextBlinkTime = Math.random() * 1000 + 1000 // 1-2 seconds
    this.nextExpressionTime = Math.random() * 3000 + 3000 // 3-6 seconds
    this.yellowEnemyAnimationState = 'mouthClosed'
  }

  private initializeBlueEnemyAnimations(): void {
    // Set random initial timers to make enemies feel unique
    this.nextBiteTime = Math.random() * 2000 + 2000 // 2-4 seconds
    this.nextBlinkTime = Number.MAX_SAFE_INTEGER // DISABLED - No blinking for Chompers
    this.blueEnemyAnimationState = 'idle'
  }
  
  private updateBlueEnemyAnimations(delta: number): void {
    // Only animate if using the new animation sprites (blue or purple)
    if (!this.isBlueEnemyAnimationSprite(this.texture.key) && !this.isPurpleEnemyAnimationSprite(this.texture.key)) {
      // Only fix the texture once, not every frame
      if (this.catColor === CatColor.BLUE && !this.blueTextureFixed && this.scene.textures.exists('blueEnemyMouthClosed')) {
        this.setTexture('blueEnemyMouthClosed')
        this.setDisplaySize(36, 36)
        this.blueTextureFixed = true  // Mark as fixed so we don't keep resetting
        // Re-initialize animations after fixing texture
        this.initializeBlueEnemyAnimations()
      } else if (this.catColor === CatColor.PURPLE && !this.blueTextureFixed && this.scene.textures.exists('purpleEnemyMouthClosed')) {
        this.setTexture('purpleEnemyMouthClosed')
        this.setDisplaySize(36, 36)
        this.blueTextureFixed = true  // Mark as fixed so we don't keep resetting
        // Re-initialize animations after fixing texture
        this.initializeBlueEnemyAnimations()
      }
      return
    }
    
    // Reset the fixed flag if we have a valid texture now
    this.blueTextureFixed = false
    
    // Update timers (skip blink timer for performance)
    this.biteTimer += delta
    // this.blinkTimer += delta  // DISABLED for Chompers
    this.biteAnimationTimer += delta
    // this.blinkAnimationTimer += delta  // DISABLED for Chompers
    
    // Handle current animation state
    switch (this.blueEnemyAnimationState) {
      case 'idle':
        this.handleIdleState()
        break
      case 'bite_partial':
        this.handleBitePartialState()
        break
      case 'bite_full':
        this.handleBiteFullState()
        break
      case 'blinking':
        // Should never happen but handle gracefully
        this.blueEnemyAnimationState = 'idle'
        break
    }
    
    // Check for new animation triggers (bite only, no blinking)
    this.checkForNewAnimations()
  }
  
  private handleIdleState(): void {
    // Set to mouth closed sprite
    this.changeBlueEnemyTexture('blueEnemyMouthClosed')
  }
  
  private handleBitePartialState(): void {
    if (this.biteAnimationTimer < 150) {
      // First part of bite - partial open
      this.changeBlueEnemyTexture('blueEnemyMouthPartialOpen')
    } else if (this.biteAnimationTimer > 300) {
      // SAFETY: Force transition if taking too long (reduced from 400)
      console.warn('Bite partial state exceeded max duration - forcing transition')
      this.blueEnemyAnimationState = 'idle'
      this.biteAnimationTimer = 0
      this.nextBiteTime = this.biteTimer + 3000 // Delay next bite
      // Resume movement immediately after failed bite
      this.setVelocityX(this.moveSpeed * this.direction)
    } else {
      // Normal transition to full bite
      this.blueEnemyAnimationState = 'bite_full'
      this.biteAnimationTimer = 0
    }
  }
  
  private handleBiteFullState(): void {
    if (this.biteAnimationTimer < 200) {
      // Full bite - mouth wide open
      this.changeBlueEnemyTexture('blueEnemyMouthOpen')
    } else if (this.biteAnimationTimer > 350) {
      // SAFETY: Force end if taking too long (reduced from 500)
      console.warn('Bite full state exceeded max duration - forcing idle')
      this.blueEnemyAnimationState = 'idle'
      this.biteAnimationTimer = 0
      this.nextBiteTime = this.biteTimer + 3000 // Delay next bite
      // Resume movement immediately
      this.setVelocityX(this.moveSpeed * this.direction)
    } else {
      // Normal return to idle
      this.blueEnemyAnimationState = 'idle'
      this.biteAnimationTimer = 0
      // Set next bite time with variation
      this.nextBiteTime = this.biteTimer + Math.random() * 2000 + 2000 // 2-4 seconds
      // Explicitly resume movement after bite completes
      this.setVelocityX(this.moveSpeed * this.direction)
    }
  }
  
  private handleBlinkingState(): void {
    // BLINKING DISABLED FOR CHOMPERS
    // If somehow we get here, immediately return to idle
    this.blueEnemyAnimationState = 'idle'
    this.blinkAnimationTimer = 0
    this.nextBlinkTime = Number.MAX_SAFE_INTEGER // Keep blinking disabled
  }
  
  private checkForNewAnimations(): void {
    // Check for bite trigger (not while already biting)
    if (this.biteTimer >= this.nextBiteTime && this.blueEnemyAnimationState === 'idle') {
      this.blueEnemyAnimationState = 'bite_partial'
      this.biteAnimationTimer = 0
    }
    
    // BLINKING DISABLED FOR CHOMPERS - Prevents stuck issues
    // Chompers only bite, no blinking
  }
  
  private changeBlueEnemyTexture(textureKey: string): void {
    // Check if scene still exists (enemy might be destroyed or scene cleaning up)
    if (!this.scene) return
    
    // Convert texture key for purple chompers
    let actualTextureKey = textureKey
    if (this.catColor === CatColor.PURPLE) {
      // Map blue texture names to purple equivalents
      if (textureKey === 'blueEnemyMouthClosed') {
        actualTextureKey = 'purpleEnemyMouthClosed'
      } else if (textureKey === 'blueEnemyMouthPartialOpen') {
        actualTextureKey = 'purpleEnemyMouthPartialOpen'
      } else if (textureKey === 'blueEnemyMouthOpen') {
        actualTextureKey = 'purpleEnemyMouthOpen'
      }
    }
    
    if (this.scene.textures.exists(actualTextureKey)) {
      this.setTexture(actualTextureKey)
      // Maintain consistent display size and positioning
      this.setDisplaySize(36, 36)
      
      // Maintain current flip state based on movement direction
      // Don't change flip here - it's already handled in updateBluePatrol
      // Just preserve the current flip state
    } else {
      // Fallback to default texture if requested texture doesn't exist
      const fallbackTexture = this.catColor === CatColor.PURPLE ? 
        'purpleEnemyMouthClosed' : 'blueEnemyMouthClosed'
      if (this.scene.textures.exists(fallbackTexture)) {
        this.setTexture(fallbackTexture)
        this.setDisplaySize(36, 36)
      }
    }
  }
  
  private checkIfChomperStuck(delta: number): void {
    // Track position history
    this.positionCheckTimer += delta
    if (this.positionCheckTimer >= this.positionCheckInterval) {
      this.positionHistory.push(this.x)
      if (this.positionHistory.length > 8) { // Keep last 8 positions (2 seconds)
        this.positionHistory.shift()
      }
      this.positionCheckTimer = 0
    }
    
    // Check velocity stuck (should always be moving unless at edge)
    if (Math.abs(this.body!.velocity.x) < 1) {
      this.velocityStuckTimer += delta
      
      // If velocity is zero for too long and not at edge
      if (this.velocityStuckTimer > 1000 && 
          this.x > this.platformBounds.left + 40 && 
          this.x < this.platformBounds.right - 40) {
        console.warn('Chomper velocity stuck - forcing reset')
        this.forceResetChomper()
        return
      }
    } else {
      this.velocityStuckTimer = 0
    }
    
    // Check if stuck in same position
    if (this.positionHistory.length >= 4) {
      const allSame = this.positionHistory.every(pos => 
        Math.abs(pos - this.positionHistory[0]) < 2
      )
      
      if (allSame && this.x > this.platformBounds.left + 40 && 
          this.x < this.platformBounds.right - 40) {
        console.warn('Chomper position stuck (not at edge) - forcing reset')
        this.forceResetChomper()
        return
      }
    }
    
    // Only check during bite animations
    if (this.blueEnemyAnimationState === 'bite_partial' || 
        this.blueEnemyAnimationState === 'bite_full') {
      
      // Check if animation is taking too long
      if (this.biteAnimationTimer > 400) { // Reduced from 500
        console.warn('Bite animation taking too long - forcing reset')
        this.forceResetChomper()
        return
      }
      
      // Track stuck time during bite
      const currentX = this.x
      const moved = Math.abs(currentX - this.lastPositionX) > 1
      
      if (!moved) {
        this.stuckTimer += delta
        if (this.stuckTimer >= this.stuckThreshold) {
          console.error('Chomper stuck during bite - forcing recovery!')
          this.forceResetChomper()
          return
        }
      } else {
        this.stuckTimer = 0
      }
      
      this.lastPositionX = currentX
    } else {
      // Not in bite animation, reset bite stuck timer
      this.stuckTimer = 0
      this.lastPositionX = this.x
    }
  }
  
  private forceResetChomper(): void {
    console.warn('=== FORCE RESETTING STUCK CHOMPER ===')
    
    // Reset ALL animation states
    this.blueEnemyAnimationState = 'idle'
    this.biteAnimationTimer = 0
    this.blinkAnimationTimer = 0
    this.biteTimer = 0
    this.blinkTimer = 0
    
    // Delay next animations significantly
    this.nextBiteTime = 5000 // 5 second delay
    this.nextBlinkTime = Number.MAX_SAFE_INTEGER // Keep blinking disabled
    
    // Reset stuck detection
    this.stuckTimer = 0
    this.positionCheckTimer = 0
    this.velocityStuckTimer = 0
    this.positionHistory = []
    
    // Force texture update
    this.changeBlueEnemyTexture('blueEnemyMouthClosed')
    
    // Force direction change to unstick
    if (this.x <= this.platformBounds.left + 50) {
      this.direction = 1 // Go right
      this.x = this.platformBounds.left + 51 // Move away from edge
    } else if (this.x >= this.platformBounds.right - 50) {
      this.direction = -1 // Go left  
      this.x = this.platformBounds.right - 51 // Move away from edge
    } else {
      // In middle - pick random direction
      this.direction = Math.random() < 0.5 ? -1 : 1
    }
    
    // Force movement resume with slight speed boost temporarily
    this.setVelocityX(this.moveSpeed * this.direction * 1.2)
    
    // Reset to normal speed after 500ms
    this.scene.time.delayedCall(500, () => {
      if (this.active) {
        this.setVelocityX(this.moveSpeed * this.direction)
      }
    })
    
    // Mark this enemy as potentially problematic
    this.setData('recoveredFromStuck', true)
    this.setData('stuckRecoveryCount', (this.getData('stuckRecoveryCount') || 0) + 1)
    
    // If stuck too many times, mark for replacement
    if (this.getData('stuckRecoveryCount') >= 2) { // Reduced from 3
      console.error('Chomper stuck 2+ times - marking for replacement')
      this.setData('needsReplacement', true)
    }
  }
  
  private checkIfCaterpillarStuck(delta: number): void {
    // Safety check: body might be undefined if caterpillar is being destroyed
    if (!this.body) return
    
    // Similar to chomper stuck detection but adapted for caterpillars
    const catType = this.catColor === CatColor.BLUE_CATERPILLAR ? 'Blue Caterpillar' : 'Yellow Caterpillar'
    
    // Track position history
    this.positionCheckTimer += delta
    if (this.positionCheckTimer >= this.positionCheckInterval) {
      this.positionHistory.push(this.x)
      if (this.positionHistory.length > 6) { // Keep last 6 positions (1.5 seconds)
        this.positionHistory.shift()
      }
      this.positionCheckTimer = 0
      
      // Log position tracking for Blue Caterpillar
      if (this.catColor === CatColor.BLUE_CATERPILLAR && this.positionHistory.length > 2) {
        const movement = Math.abs(this.positionHistory[this.positionHistory.length - 1] - this.positionHistory[0])
        // Position tracking for stuck detection
      }
    }
    
    // Check velocity stuck (caterpillars should always be moving)
    // Safety check: body might be undefined if caterpillar is being destroyed
    if (!this.body) return
    
    if (Math.abs(this.body.velocity.x) < 1) {
      this.velocityStuckTimer += delta
      
      // If velocity is zero for too long and not at edge - REDUCED TIME FOR FASTER RECOVERY
      if (this.velocityStuckTimer > 400 && // Reduced from 800ms to 400ms
          this.x > this.platformBounds.left + 30 && 
          this.x < this.platformBounds.right - 30) {
        console.warn(`🐛 ${catType} velocity stuck at X:${Math.round(this.x)} - forcing reset`)
        this.forceResetCaterpillar()
        return
      }
    } else {
      this.velocityStuckTimer = 0
    }
    
    // Check if stuck in same position
    if (this.positionHistory.length >= 4) {
      const allSame = this.positionHistory.every(pos => 
        Math.abs(pos - this.positionHistory[0]) < 3
      )
      
      if (allSame && this.x > this.platformBounds.left + 30 && 
          this.x < this.platformBounds.right - 30) {
        console.warn(`🐛 ${catType} position stuck at X:${Math.round(this.x)} (not at edge) - forcing reset`)
        this.forceResetCaterpillar()
        return
      }
    }
    
    // Check if caterpillar is outside platform bounds (safety check)
    if (this.x < this.platformBounds.left - 10 || this.x > this.platformBounds.right + 10) {
      console.error(`🐛 ${catType} escaped platform bounds at X:${Math.round(this.x)} - forcing reset`)
      this.forceResetCaterpillar()
    }
    
    // DISABLED: Blue Caterpillar stuck detection - it's causing more problems than it solves
    // The caterpillar keeps getting stuck at specific positions like x=271
    // Let's just let it move naturally without interference
    /*
    if (this.catColor === CatColor.BLUE_CATERPILLAR && this.positionHistory.length >= 6) {
      const recentMovement = Math.abs(this.positionHistory[this.positionHistory.length - 1] - this.positionHistory[0])
      if (recentMovement < 20 && this.turnDelayTimer <= 0) {
        console.warn(`🐛 Blue Caterpillar barely moving (${Math.round(recentMovement)}px in 1.5s) - forcing reset`)
        this.forceResetCaterpillar()
        return
      } else if (recentMovement < 20 && this.turnDelayTimer > 0) {
      }
    }
    */
  }
  
  private replaceSelfWithYellowCaterpillar(): void {
    // Create a Yellow Caterpillar at the same position
    // Use exact same parameters as normal spawning
    const newYellowCat = new Cat(
      this.scene,
      this.x,
      this.y,
      this.platformBounds.left,
      this.platformBounds.right,
      'yellow',  // Use string 'yellow' for caterpillar
      false      // Not a stalker
    )
    
    // Copy over the speed multiplier
    if (this.speedMultiplier) {
      newYellowCat.setSpeedMultiplier(this.speedMultiplier)
    }
    
    // Add to the appropriate enemy groups
    const gameScene = this.scene as any
    if (gameScene.yellowEnemies) {
      gameScene.yellowEnemies.add(newYellowCat)
    }
    // CRITICAL: Also add to main cats group for collision detection!
    if (gameScene.cats) {
      gameScene.cats.add(newYellowCat)
    }
    
    // Remove this Blue Caterpillar from its groups
    if (gameScene.blueCaterpillars) {
      gameScene.blueCaterpillars.remove(this)
    }
    // Also remove from main cats group
    if (gameScene.cats) {
      gameScene.cats.remove(this)
    }
    
    // Destroy this Blue Caterpillar
    this.destroy()
    
  }
  
  private forceResetCaterpillar(): void {
    const catType = this.catColor === CatColor.BLUE_CATERPILLAR ? 'Blue Caterpillar' : 'Yellow Caterpillar'
    console.warn(`🐛 === RESETTING STUCK ${catType.toUpperCase()} at X:${Math.round(this.x)} ===`)
    
    // Reset animation states
    if (this.catColor === CatColor.BLUE_CATERPILLAR) {
      this.blueCaterpillarAnimationState = 'eyesDown'
      this.blueCaterpillarBlinkTimer = 0
      this.blueCaterpillarEyeTimer = 0
      this.nextBlueCaterpillarBlinkTime = Math.random() * 1500 + 1500
      this.nextBlueCaterpillarEyeTime = Math.random() * 2000 + 1000
      // Force texture update for blue caterpillar
      if (this.scene && this.scene.textures.exists('blueCaterpillarEyesDown')) {
        this.setTexture('blueCaterpillarEyesDown')
      }
    } else {
      // Reset yellow caterpillar animations if needed
      this.yellowAnimationState = 'mouth_closed'
      this.yellowBlinkTimer = 0
      this.yellowMouthTimer = 0
    }
    
    // Reset stuck detection
    this.stuckTimer = 0
    this.positionCheckTimer = 0
    this.velocityStuckTimer = 0
    this.positionHistory = []
    
    // Reset movement timers
    this.randomMoveTimer = 200 // Quick reset to get moving again
    this.turnDelayTimer = 0
    
    // Force a direction change - prefer moving toward center
    const centerX = (this.platformBounds.left + this.platformBounds.right) / 2
    if (this.x < centerX) {
      this.direction = 1 // Move right toward center
    } else {
      this.direction = -1 // Move left toward center
    }
    
    // Reposition to safe location if needed
    if (this.x <= this.platformBounds.left + 20 || this.x >= this.platformBounds.right - 20) {
      // Move to a random safe position near center
      const safeX = this.platformBounds.left + 50 + Math.random() * (this.platformBounds.right - this.platformBounds.left - 100)
      this.setX(safeX)
    }
    
    // Apply velocity with boost to get unstuck
    this.setVelocityX(this.moveSpeed * this.direction * 1.5)
    
    // Reset to normal speed after 500ms
    this.scene.time.delayedCall(500, () => {
      if (this.active) {
        this.setVelocityX(this.moveSpeed * this.direction)
      }
    })
    
    // Mark as recovered
    this.setData('recoveredFromStuck', true)
    this.setData('stuckRecoveryCount', (this.getData('stuckRecoveryCount') || 0) + 1)
    
    // If stuck too many times, mark for potential removal
    if (this.getData('stuckRecoveryCount') >= 3) {
      console.error(`${catType} stuck 3+ times - may need manual intervention`)
      this.setData('needsReplacement', true)
    }
  }
  
  // ============== RED ENEMY ANIMATION SYSTEM ==============
  
  private isRedEnemyAnimationSprite(textureKey: string): boolean {
    return [
      'redEnemyMouthClosedEyes1',
      'redEnemyMouthClosedEyes2',
      'redEnemyMouthClosedBlinking',
      'redEnemyMouthPartialOpenEyes1Wink',
      'redEnemyMouthPartialOpenEyes2',
      'redEnemyMouthWideOpenEyes1Wink',
      'redEnemyMouthWideOpenEyes2',
      'redEnemyMouthWideOpenEyes3'
    ].includes(textureKey)
  }
  
  private initializeRedEnemyAnimations(): void {
    // Set random initial timers to make enemies feel unique
    this.nextRedBiteTime = Math.random() * 2000 + 3000 // 3-5 seconds for bite
    this.nextRedBlinkTime = Math.random() * 500 + 1000 // 1-1.5 seconds for blink
    this.redEnemyAnimationState = 'patrol'
    this.redEyeState = Math.random() < 0.5 ? 1 : 2 // Start with random eye state
  }
  
  private updateYellowEnemyAnimations(delta: number): void {
    // Only animate if using the new animation sprites
    if (!this.isYellowEnemyAnimationSprite(this.texture.key)) {
      return
    }
    
    // Update timers
    this.biteTimer += delta // For mouth expression changes
    
    // BLINKING DISABLED - Only animate mouth
    // Handle expression changes (mouth open/closed)
    if (this.biteTimer >= this.nextExpressionTime) {
      this.yellowEnemyAnimationState = this.yellowEnemyAnimationState === 'mouthClosed' ? 'mouthOpen' : 'mouthClosed'
      this.nextExpressionTime = this.biteTimer + Math.random() * 3000 + 3000 // 3-6 seconds
    }
    
    // Set appropriate texture based on current state (no blinking)
    let newTexture = 'yellowEnemyMouthClosedEyeOpen'
    if (this.yellowEnemyAnimationState === 'mouthOpen') {
      newTexture = 'yellowEnemyMouthOpenEyeOpen'
    }
    
    if (this.texture.key !== newTexture) {
      this.setTexture(newTexture)
    }
  }
  
  private updateRedEnemyAnimations(delta: number): void {
    // Only animate if using the red animation sprites
    if (!this.isRedEnemyAnimationSprite(this.texture.key)) {
      return
    }
    
    // Update timers
    this.redBiteTimer += delta
    this.redBlinkTimer += delta
    this.redBiteSequenceTimer += delta
    
    // Handle current animation state
    switch (this.redEnemyAnimationState) {
      case 'patrol':
        this.handleRedPatrolState()
        break
      case 'bite_starting':
        this.handleRedBiteStartingState()
        break
      case 'bite_opening':
        this.handleRedBiteOpeningState()
        break
      case 'bite_wide':
        this.handleRedBiteWideState()
        break
      case 'bite_closing':
        this.handleRedBiteClosingState()
        break
    }
    
    // Check for new animation triggers
    this.checkForRedAnimationTriggers()
  }
  
  private handleRedPatrolState(): void {
    // Cycle between two eye states during patrol
    const eyeCycleTime = 800 + Math.random() * 400 // 0.8-1.2 seconds
    
    if (this.redBiteSequenceTimer >= eyeCycleTime) {
      // Switch eye state
      this.redEyeState = this.redEyeState === 1 ? 2 : 1
      this.redBiteSequenceTimer = 0
    }
    
    // Use appropriate eye state
    this.changeRedEnemyTexture(this.redEyeState === 1 ? 'redEnemyMouthClosedEyes1' : 'redEnemyMouthClosedEyes2')
  }
  
  private handleRedBiteStartingState(): void {
    if (this.redBiteSequenceTimer < 80) {
      // Start bite with partial open
      this.changeRedEnemyTexture('redEnemyMouthPartialOpenEyes2')
    } else {
      // Move to opening phase
      this.redEnemyAnimationState = 'bite_opening'
      this.redBiteSequenceTimer = 0
      this.redBiteFrameIndex = 0
    }
  }
  
  private handleRedBiteOpeningState(): void {
    if (this.redBiteSequenceTimer < 100) {
      // Show partial open with wink variation
      this.changeRedEnemyTexture('redEnemyMouthPartialOpenEyes1Wink')
    } else {
      // Move to wide open phase
      this.redEnemyAnimationState = 'bite_wide'
      this.redBiteSequenceTimer = 0
      this.redBiteFrameIndex = 0
    }
  }
  
  private handleRedBiteWideState(): void {
    const wideFrames = ['redEnemyMouthWideOpenEyes1Wink', 'redEnemyMouthWideOpenEyes2', 'redEnemyMouthWideOpenEyes3']
    const frameTime = 120 // Each wide frame lasts 120ms
    
    const currentFrameIndex = Math.floor(this.redBiteSequenceTimer / frameTime)
    
    if (currentFrameIndex < wideFrames.length) {
      this.changeRedEnemyTexture(wideFrames[currentFrameIndex])
    } else {
      // Move to closing phase
      this.redEnemyAnimationState = 'bite_closing'
      this.redBiteSequenceTimer = 0
    }
  }
  
  private handleRedBiteClosingState(): void {
    if (this.redBiteSequenceTimer < 80) {
      // Close through partial
      this.changeRedEnemyTexture('redEnemyMouthPartialOpenEyes2')
    } else {
      // Return to patrol
      this.redEnemyAnimationState = 'patrol'
      this.redBiteSequenceTimer = 0
      // Set next bite time with variation
      this.nextRedBiteTime = this.redBiteTimer + Math.random() * 2000 + 3000 // 3-5 seconds
    }
  }
  
  private checkForRedAnimationTriggers(): void {
    // Check for bite trigger (not while already biting)
    if (this.redBiteTimer >= this.nextRedBiteTime && this.redEnemyAnimationState === 'patrol') {
      this.redEnemyAnimationState = 'bite_starting'
      this.redBiteSequenceTimer = 0
    }
    
    // Check for blink trigger (independent of bite state)
    if (this.redBlinkTimer >= this.nextRedBlinkTime) {
      // Quick blink during any state (but don't interrupt bite sequence visually)
      if (this.redEnemyAnimationState === 'patrol') {
        // Only show blink during patrol state to not interfere with bite
        this.changeRedEnemyTexture('redEnemyMouthClosedBlinking')
        
        // Schedule return to normal state
        this.scene.time.delayedCall(150, () => {
          if (this.redEnemyAnimationState === 'patrol') {
            this.changeRedEnemyTexture(this.redEyeState === 1 ? 'redEnemyMouthClosedEyes1' : 'redEnemyMouthClosedEyes2')
          }
        })
      }
      
      // Set next blink time
      this.nextRedBlinkTime = this.redBlinkTimer + Math.random() * 1000 + 1000 // 1-2 seconds
    }
  }
  
  private changeRedEnemyTexture(textureKey: string): void {
    // Check if scene still exists (enemy might be destroyed or scene cleaning up)
    if (!this.scene) return
    
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey)
      // Maintain consistent display size and positioning
      this.setDisplaySize(52, 52) // Maintain larger 52x52 size
      
      // Update sprite flip based on movement direction
      if (this.catColor === CatColor.RED) {
        this.setFlipX(this.direction > 0) // Flip when moving right
      }
    }
  }
  
  // ============== STALKER METHODS ==============
  
  setPlayerReference(player: Phaser.Physics.Arcade.Sprite): void {
    this.stalkerPlayerRef = player
  }
  
  canDamagePlayer(): boolean {
    // Stalkers can only damage the player after popping out
    return this.isStalker && this.stalkerState === 'chasing'
  }
  
  private updateStalker(delta: number): void {
    if (!this.stalkerPlayerRef) return
    
    // Position tracking for debug (replaced console.log)
    const previousY = this.y
    
    switch (this.stalkerState) {
      case 'hidden':
        this.updateStalkerHidden()
        break
      case 'activated':
        this.updateStalkerActivated(delta)
        break
      case 'chasing':
        this.updateStalkerChasing(delta)
        this.updateStalkerEyeAnimations(delta)
        break
    }
    
    // Y position change tracking (replaced console.log)
    if (Math.abs(this.y - previousY) > 0.1) {
      // Y position changed unexpectedly (replaced console.log)
    }
  }
  
  private updateStalkerHidden(): void {
    if (!this.stalkerPlayerRef) return
    
    const playerX = this.stalkerPlayerRef.x
    const playerY = this.stalkerPlayerRef.y
    const distanceToPlayer = Math.abs(playerX - this.x)
    
    // Check if player is on same floor or above (not below) - prevent stalker from seeing player below
    const playerIsAboveOrSameLevel = playerY <= this.y + 40 // Player must be at same level or above
    const playerIsNotTooFarAbove = playerY >= this.y - 40 // But not too far above
    const canSeePlayer = playerIsAboveOrSameLevel && playerIsNotTooFarAbove
    
    if (canSeePlayer && distanceToPlayer <= this.stalkerTriggerDistance && !this.stalkerHasPlayerPassed) {
      // Stalker activated (replaced console.log)
      
      // Activate stalker
      this.stalkerState = 'activated'
      this.stalkerMineTimer = this.stalkerMineDelayDuration
      this.stalkerHasPlayerPassed = true
      
      // Show eyes only
      if (this.scene.textures.exists('stalkerEnemyEyeOnly')) {
        this.setTexture('stalkerEnemyEyeOnly')
        // Changed texture to stalkerEnemyEyeOnly (replaced console.log)
      }
      this.setVisible(true)
      // Now visible and activated (replaced console.log)
    }
  }
  
  private updateStalkerActivated(delta: number): void {
    this.stalkerMineTimer -= delta
    
    if (this.stalkerMineTimer <= 0) {
      this.stalkerPopOut()
    }
  }
  
  private stalkerPopOut(): void {
    // Stalker popping out (replaced console.log)
    
    this.stalkerState = 'chasing'
    this.setVisible(true)
    
    // Switch to full stalker sprite
    if (this.scene.textures.exists('stalkerEnemyEye1')) {
      this.setTexture('stalkerEnemyEye1')
      // Changed texture to stalkerEnemyEye1 (replaced console.log)
    }
    this.stalkerEyeState = 'eye1'
    
    // Enable movement
    this.body!.setGravityY(0) // Still no gravity
    this.body!.setImmovable(false) // Allow movement
    // Physics settings (replaced console.log)
    
    // Update original Y to prevent teleporting
    this.stalkerOriginalY = this.y
    // Updated floor lock (replaced console.log)
    
    // Reset speed
    this.stalkerCurrentSpeed = 80 * 1.5
    
    // Start chase persistence
    this.stalkerChasePersistenceTimer = this.stalkerChasePersistenceDuration
    this.stalkerIsInPersistentChase = true
    // Starting persistent chase (replaced console.log)
  }
  
  private updateStalkerChasing(delta: number): void {
    const playerX = this.stalkerPlayerRef!.x
    const playerY = this.stalkerPlayerRef!.y
    
    // Keep Y position stable
    const beforeY = this.y
    this.y = this.stalkerOriginalY
    
    if (Math.abs(beforeY - this.stalkerOriginalY) > 0.1) {
      // Stalker Y correction (replaced console.log)
    }
    
    // Only chase player if they are at same level or above (not below)
    const playerIsAboveOrSameLevel = playerY <= this.y + 40 // Player must be at same level or above
    const playerIsNotTooFarAbove = playerY >= this.y - 120 // But not too far above (increased tolerance for chasing)
    const canChasePlayer = playerIsAboveOrSameLevel && playerIsNotTooFarAbove
    
    // Update chase persistence
    if (this.stalkerIsInPersistentChase) {
      this.stalkerChasePersistenceTimer -= delta
      if (this.stalkerChasePersistenceTimer <= 0) {
        this.stalkerIsInPersistentChase = false
      }
    }
    
    if (canChasePlayer) {
      // Chase the player
      this.stalkerCurrentSpeed += this.stalkerSpeedIncrement * 0.01
      const maxSpeed = 80 * 2.25
      if (this.stalkerCurrentSpeed > maxSpeed) {
        this.stalkerCurrentSpeed = maxSpeed
      }
      
      const direction = playerX > this.x ? 1 : -1
      this.direction = direction
      this.setVelocityX(this.stalkerCurrentSpeed * direction)
    } else {
      // Player too far vertically
      if (this.stalkerIsInPersistentChase) {
        // Continue moving horizontally
        const direction = playerX > this.x ? 1 : -1
        this.direction = direction
        this.setVelocityX(this.stalkerCurrentSpeed * direction * 0.7)
      } else {
        // Patrol like regular red enemy
        this.updateRedPatrol()
      }
    }
  }
  
  private updateStalkerEyeAnimations(delta: number): void {
    // Check if scene still exists (enemy might be destroyed or scene cleaning up)
    if (!this.scene) return
    if (!this.scene.textures.exists('stalkerEnemyEye1')) return
    
    this.stalkerEyeAnimationTimer += delta
    
    let animationSpeed: number
    if (this.stalkerEyeState === 'blink') {
      animationSpeed = 100 + Math.random() * 80
    } else {
      animationSpeed = 1200 + (Math.random() - 0.5) * 800
    }
    
    if (this.stalkerEyeAnimationTimer >= animationSpeed) {
      const randomAction = Math.random()
      
      // Simple eye state transitions
      if (this.stalkerEyeState === 'blink') {
        // Return to a random eye state
        const states = ['eye1', 'eye2', 'eye3', 'eye4'] as const
        this.stalkerEyeState = states[Math.floor(Math.random() * 4)]
      } else {
        // Either blink or change eye position
        if (randomAction < 0.2) {
          this.stalkerEyeState = 'blink'
        } else {
          const states = ['eye1', 'eye2', 'eye3', 'eye4'] as const
          this.stalkerEyeState = states[Math.floor(Math.random() * 4)]
        }
      }
      
      // Apply the texture
      const textureMap = {
        'eye1': 'stalkerEnemyEye1',
        'eye2': 'stalkerEnemyEye2', 
        'eye3': 'stalkerEnemyEye3',
        'eye4': 'stalkerEnemyEye4',
        'blink': 'stalkerEnemyBlinking'
      }
      
      const textureKey = textureMap[this.stalkerEyeState]
      if (this.scene.textures.exists(textureKey)) {
        this.setTexture(textureKey)
      }
      
      this.stalkerEyeAnimationTimer = 0
    }
  }
  
  private updateGreenEnemyAnimations(delta: number): void {
    // Update timers
    this.greenEyeTimer += delta
    this.greenBlinkTimer += delta
    
    // Initialize next times if not set
    if (this.nextGreenEyeTime === 0) {
      this.nextGreenEyeTime = 1000 + Math.random() * 2000 // 1-3 seconds for eye movement
    }
    if (this.nextGreenBlinkTime === 0) {
      this.nextGreenBlinkTime = 3000 + Math.random() * 4000 // 3-7 seconds between blinks
    }
    
    // Check for blinking (has priority over eye movement)
    if (this.greenBlinkTimer >= this.nextGreenBlinkTime) {
      this.greenEnemyAnimationState = 'blinking'
      this.setTexture('greenEnemyBlink')
      
      // Schedule end of blink (100-150ms)
      setTimeout(() => {
        if (this.greenEnemyAnimationState === 'blinking') {
          // Return to random eye position after blink
          const states: Array<'eyeRight' | 'eyeCenter' | 'eyeLeft'> = ['eyeRight', 'eyeCenter', 'eyeLeft']
          this.greenEnemyAnimationState = states[Math.floor(Math.random() * states.length)]
          this.updateGreenEnemyTexture()
        }
      }, 100 + Math.random() * 50)
      
      // Reset blink timer
      this.greenBlinkTimer = 0
      this.nextGreenBlinkTime = 3000 + Math.random() * 4000
      return
    }
    
    // Check for eye movement (only if not blinking)
    if (this.greenEnemyAnimationState !== 'blinking' && this.greenEyeTimer >= this.nextGreenEyeTime) {
      // Choose a different eye position
      const currentState = this.greenEnemyAnimationState
      const states: Array<'eyeRight' | 'eyeCenter' | 'eyeLeft'> = ['eyeRight', 'eyeCenter', 'eyeLeft']
      const availableStates = states.filter(s => s !== currentState)
      
      this.greenEnemyAnimationState = availableStates[Math.floor(Math.random() * availableStates.length)]
      this.updateGreenEnemyTexture()
      
      // Reset eye timer
      this.greenEyeTimer = 0
      this.nextGreenEyeTime = 800 + Math.random() * 1500 // 0.8-2.3 seconds
    }
  }
  
  private updateGreenEnemyTexture(): void {
    let textureKey = 'greenEnemy' // Default
    
    switch (this.greenEnemyAnimationState) {
      case 'eyeRight':
        textureKey = 'greenEnemy' // Default sprite has eye right
        break
      case 'eyeCenter':
        textureKey = 'greenEnemyEyeCenter'
        break
      case 'eyeLeft':
        textureKey = 'greenEnemyEyeLeft'
        break
      case 'blinking':
        textureKey = 'greenEnemyBlink'
        break
    }
    
    // Check if scene still exists (enemy might be destroyed or scene cleaning up)
    if (!this.scene) return
    
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey)
    }
  }
  
  // ============== BLUE CATERPILLAR ANIMATION SYSTEM ==============
  
  private isBlueCaterpillarAnimationSprite(textureKey: string): boolean {
    return [
      'blueCaterpillarEyesRight',
      'blueCaterpillarEyesLeft',
      'blueCaterpillarEyesDown',
      'blueCaterpillarBlinking'
    ].includes(textureKey)
  }
  
  private initializeBlueCaterpillarAnimations(): void {
    // Set random initial timers to make enemies feel unique
    this.nextBlueCaterpillarBlinkTime = Math.random() * 1500 + 1500 // 1.5-3 seconds
    this.nextBlueCaterpillarEyeTime = Math.random() * 2000 + 1000 // 1-3 seconds
    this.blueCaterpillarAnimationState = 'eyesDown'
  }
  
  private updateBlueCaterpillarPatrol(delta: number): void {
    // Check if body is enabled and can move
    if (!this.body || !this.body.enable) {
      return // Body disabled or destroyed, stop processing
    }
    
    // Track actual movement to detect stuck state
    if (!this.blueCaterpillarLastX) {
      this.blueCaterpillarLastX = this.x
      this.blueCaterpillarStuckFrames = 0
    }
    
    const movementThisFrame = Math.abs(this.x - this.blueCaterpillarLastX)
    if (movementThisFrame < 0.01) { // Less than 0.01 pixels moved
      this.blueCaterpillarStuckFrames++
      if (this.blueCaterpillarStuckFrames === 60) { // After 1 second of being stuck
        
        // Replace this Blue Caterpillar with a Yellow one
        this.replaceSelfWithYellowCaterpillar()
        return // Exit early since we're destroying this caterpillar
      }
    } else {
      this.blueCaterpillarStuckFrames = 0
    }
    this.blueCaterpillarLastX = this.x
    
    // ALWAYS apply velocity every frame - don't check, just apply
    // Something is clearing velocity, so we need to constantly reapply it
    this.setVelocityX(this.moveSpeed * this.direction)
    
    // Log if velocity isn't sticking (but only once per second to reduce spam)
    if (!this.blueCaterpillarVelocityCheckTimer) {
      this.blueCaterpillarVelocityCheckTimer = 0
    }
    this.blueCaterpillarVelocityCheckTimer += delta
    
    if (this.blueCaterpillarVelocityCheckTimer > 500 && Math.abs(this.body!.velocity.x) < 5) {
      // Velocity not sticking - will be replaced
      this.blueCaterpillarVelocityCheckTimer = 0
    }
    
    // SIMPLIFIED: No random direction changes for testing
    // Blue caterpillar should only turn at edges
    
    // Handle turn delay timer
    if (this.turnDelayTimer > 0) {
      this.turnDelayTimer -= delta
    }
    
    // Simple boundary checking - just use position, not velocity
    // Blue caterpillars should patrol smoothly through ladders
    const edgeBuffer = 35 // Buffer to turn before reaching edge
    if (this.x <= this.platformBounds.left + edgeBuffer) {
      if (this.turnDelayTimer <= 0) {
        this.direction = 1
        this.turnDelayTimer = 100 + Math.random() * 200  // Reduced delay: 100-300ms instead of 100-500ms
        // Force position away from edge to prevent getting stuck
        const newX = Math.max(this.platformBounds.left + edgeBuffer + 5, this.x)  // Extra 5px buffer
        this.setX(newX)
        // IMMEDIATELY apply new velocity to prevent stuck state
        this.setVelocityX(this.moveSpeed * this.direction)
      }
    } else if (this.x >= this.platformBounds.right - edgeBuffer) {
      if (this.turnDelayTimer <= 0) {
        this.direction = -1
        this.turnDelayTimer = 100 + Math.random() * 200  // Reduced delay: 100-300ms instead of 100-500ms
        // Force position away from edge to prevent getting stuck
        const newX = Math.min(this.platformBounds.right - edgeBuffer - 5, this.x)  // Extra 5px buffer
        this.setX(newX)
        // IMMEDIATELY apply new velocity to prevent stuck state
        this.setVelocityX(this.moveSpeed * this.direction)
      }
    }
    
    // Velocity is already being applied at the start of this function
    // Just ensure it's still applied after all the edge checks
    this.setVelocityX(this.moveSpeed * this.direction)
    
    
    // Safety check: Ensure caterpillar stays within bounds
    if (this.x < this.platformBounds.left + 5 || this.x > this.platformBounds.right - 5) {
      // Safety constraint triggered - reversing direction
      const constrainedX = Math.max(this.platformBounds.left + 10, Math.min(this.platformBounds.right - 10, this.x))
      this.setX(constrainedX)
      this.direction *= -1 // Reverse direction when constrained
      this.setVelocityX(this.moveSpeed * this.direction)
    }
    
    // Flip sprite based on direction
    if (this.isBlueCaterpillarAnimationSprite(this.texture.key)) {
      this.setFlipX(this.direction === 1) // Flip when going right
    }
  }
  
  private updateBlueCaterpillarAnimations(delta: number): void {
    // Delay animations to let movement establish
    if (!this.blueCaterpillarAnimationsEnabled) {
      this.blueCaterpillarAnimationDelay -= delta
      if (this.blueCaterpillarAnimationDelay <= 0) {
        this.blueCaterpillarAnimationsEnabled = true
        // Blue caterpillar animations enabled after delay
      }
      return // Skip animations until delay passes
    }
    
    // Only animate if using the blue caterpillar sprites
    if (!this.isBlueCaterpillarAnimationSprite(this.texture.key)) {
      return
    }
    
    // Update timers
    this.blueCaterpillarBlinkTimer += delta
    this.blueCaterpillarEyeTimer += delta
    
    // Handle blinking animation
    if (this.blueCaterpillarAnimationState === 'blinking') {
      if (this.blueCaterpillarBlinkTimer >= 200) { // 200ms blink
        // Return to previous eye state
        this.blueCaterpillarAnimationState = 'eyesDown'
        this.blueCaterpillarBlinkTimer = 0
        this.nextBlueCaterpillarBlinkTime = Math.random() * 1500 + 1500 // 1.5-3 seconds
      }
    }
    
    // Handle eye movement (looking around)
    if (this.blueCaterpillarEyeTimer >= this.nextBlueCaterpillarEyeTime && 
        this.blueCaterpillarAnimationState !== 'blinking') {
      // Cycle through eye positions
      const states: Array<'eyesRight' | 'eyesLeft' | 'eyesDown'> = ['eyesRight', 'eyesLeft', 'eyesDown']
      const currentIndex = states.indexOf(this.blueCaterpillarAnimationState as any)
      const nextIndex = (currentIndex + 1) % states.length
      this.blueCaterpillarAnimationState = states[nextIndex]
      this.nextBlueCaterpillarEyeTime = Math.random() * 2000 + 1000 // 1-3 seconds
      this.blueCaterpillarEyeTimer = 0
    }
    
    // Handle random blinking
    if (this.blueCaterpillarBlinkTimer >= this.nextBlueCaterpillarBlinkTime && 
        this.blueCaterpillarAnimationState !== 'blinking') {
      this.blueCaterpillarAnimationState = 'blinking'
      this.blueCaterpillarBlinkTimer = 0
    }
    
    // Set appropriate texture based on current state
    let newTexture = 'blueCaterpillarEyesDown'
    switch (this.blueCaterpillarAnimationState) {
      case 'eyesRight':
        newTexture = 'blueCaterpillarEyesRight'
        break
      case 'eyesLeft':
        newTexture = 'blueCaterpillarEyesLeft'
        break
      case 'eyesDown':
        newTexture = 'blueCaterpillarEyesDown'
        break
      case 'blinking':
        newTexture = 'blueCaterpillarBlinking'
        break
    }
    
    if (this.texture.key !== newTexture && this.scene && this.scene.textures.exists(newTexture)) {
      this.setTexture(newTexture)
    }
  }
}