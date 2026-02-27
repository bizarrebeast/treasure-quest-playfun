import GameSettings from "../config/GameSettings"
import { TouchControls } from "./TouchControls"

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private isClimbing: boolean = false
  private currentLadder: Phaser.GameObjects.GameObject | null = null
  private nearbyLadder: Phaser.GameObjects.GameObject | null = null // Track ladder we're overlapping
  private currentJumpSound: number = 1 // Track which jump sound to play next (1, 2, or 3)
  private touchControls: TouchControls | null = null
  private walkAnimationTimer: number = 0
  private climbAnimationTimer: number = 0
  private footstepTimer: number = 0
  private readonly FOOTSTEP_INTERVAL: number = 300 // Time between footsteps in ms
  private idleAnimationTimer: number = 0
  private currentFrame: 'idle' | 'leftStep' | 'rightStep' | 'jumpLeftFoot' | 'jumpRightFoot' = 'idle'
  private currentIdleState: 'eye1' | 'eye2' | 'eye3' | 'eye4' | 'eye5' | 'blink' = 'eye1'
  private currentClimbFoot: 'left' | 'right' = 'left'
  private isMoving: boolean = false
  private isJumping: boolean = false
  private runningTiltTimer: number = 0
  private lastFrameWasJump: boolean = false
  
  // Scaleable jump system
  private jumpButtonDown: boolean = false
  private jumpHoldTime: number = 0
  private isAirborne: boolean = false
  private jumpReleased: boolean = false
  private readonly MIN_JUMP_VELOCITY: number = -120 // Small hop for quick taps - allows tiny bounces
  private readonly MAX_JUMP_VELOCITY: number = GameSettings.game.jumpVelocity // Full jump from GameSettings (-350)
  private readonly MAX_JUMP_HOLD_TIME: number = 300 // milliseconds to reach max height - balanced for both controls
  
  // Speed multiplier for power-ups (like invincibility)
  private speedMultiplier: number = 1.0
  
  // Crystal Ball power-up
  private crystalBallActive: boolean = false
  private crystalBallTimer: number = 0
  private readonly CRYSTAL_BALL_DURATION: number = 20000 // 20 seconds in milliseconds
  private crystalBallParticles: Phaser.GameObjects.Graphics[] = []
  private crystalBallParticleTimer?: Phaser.Time.TimerEvent
  private crystalBallGlow?: Phaser.GameObjects.Graphics
  private crystalBallWarningPlayed: boolean = false
  
  // Cursed Orb power-up (darkness effect)
  private cursedOrbActive: boolean = false
  private cursedOrbTimer: number = 0
  private readonly CURSED_ORB_DURATION: number = 10000 // 10 seconds in milliseconds
  private cursedOrbParticles: Phaser.GameObjects.Graphics[] = []
  private cursedOrbParticleTimer?: Phaser.Time.TimerEvent
  private cursedOrbGlow?: Phaser.GameObjects.Graphics
  private cursedOrbWarningPlayed: boolean = false
  
  // Cursed Teal Orb power-up (control reversal)
  private cursedTealOrbActive: boolean = false
  private cursedTealOrbTimer: number = 0
  private readonly CURSED_TEAL_ORB_DURATION: number = 10000 // 10 seconds in milliseconds
  private cursedTealOrbParticles: Phaser.GameObjects.Graphics[] = []
  private cursedTealOrbParticleTimer?: Phaser.Time.TimerEvent
  private cursedTealOrbGlow?: Phaser.GameObjects.Graphics
  private cursedTealOrbWarningPlayed: boolean = false
  
  // Speech/Thought bubble system
  private idleTimer: number = 0
  private readonly IDLE_THRESHOLD: number = 5000 // 5 seconds in milliseconds
  private bubbleActive: boolean = false
  private onBubbleTrigger: (() => void) | null = null
  private onMovementStart: (() => void) | null = null
  
  // Long idle animation (booty shaking)
  private longIdleTimer: number = 0
  private readonly LONG_IDLE_THRESHOLD: number = 30000 // 30 seconds in milliseconds
  private isPlayingLongIdle: boolean = false
  private longIdleFrame: 'left' | 'right' = 'left'
  private longIdleAnimationTimer: number = 0
  
  // Two-layer running animation system
  private runBodySprite: Phaser.GameObjects.Image | null = null
  private runLegsSprite: Phaser.GameObjects.Image | null = null
  private useTwoLayerRunning: boolean = true // Enable the new system
  private currentLegFrame: 'bothDown' | 'leftMid' | 'leftHigh' | 'rightMid' | 'rightHigh' = 'bothDown'
  private legAnimationStep: number = 0 // 0-7 for the 8-step animation cycle
  private bodyAnimationTimer: number = 0 // Separate timer for body expressions
  private legAnimationTimer: number = 0 // Separate timer for legs
  private runningEyeTimer: number = 0 // Timer for eye movement while running
  private currentRunningEye: string = 'playerRunBody' // Current eye sprite
  private isFiringProjectile: boolean = false // Track if player is throwing
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Use the new player idle sprite or fallback to placeholder
    const textureKey = scene.textures.exists('playerIdleEye1') ? 'playerIdleEye1' : 'player'
    
    // Create fallback if sprite not loaded
    if (!scene.textures.exists('playerIdleEye1')) {
      const graphics = scene.add.graphics()
      graphics.fillStyle(0x00ff00, 1)
      graphics.fillRect(0, 0, 24, 32)
      graphics.generateTexture('player', 24, 32)
      graphics.destroy()
    }
    
    super(scene, x, y, textureKey)
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Scale the sprite if using the new player sprites
    if (textureKey === 'playerIdleEye1' || textureKey.startsWith('player')) {
      // Scale to fit the expected player size
      this.setDisplaySize(48, 64)
    }
    
    // Set up physics properties (world bounds set in GameScene to allow full floor movement)
    this.setCollideWorldBounds(true)
    this.setBounce(0)
    // Set physics body size and offset for better collision detection
    // The player is 48x64 visually, but we want a smaller hitbox
    this.setSize(18, 49)  // Increased height from 45 to 49 (4 pixels taller)
    // Center the hitbox horizontally
    // Move physics body up to extend 4px higher at the top
    this.setOffset(15, 12)  // Reduced from 16 to 12 to move hitbox up 4 pixels
    this.setDepth(20) // Player renders on top of everything
    
    // Phaser's built-in debug visualization will show the hitbox
    
    // Initialize two-layer running system if sprites are available
    this.initializeTwoLayerRunning(scene, x, y)
    
    // Create cursor keys for input
    this.cursors = scene.input.keyboard!.createCursorKeys()
    
    // Add spacebar for jumping
    scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
  }
  
  setTouchControls(touchControls: TouchControls): void {
    this.touchControls = touchControls
  }
  
  setBubbleTriggerCallback(callback: () => void): void {
    this.onBubbleTrigger = callback
  }

  setMovementStartCallback(callback: () => void): void {
    this.onMovementStart = callback
  }
  
  private initializeTwoLayerRunning(scene: Phaser.Scene, x: number, y: number): void {
    // Check if the new two-layer sprites are available
    const hasNewSprites = scene.textures.exists('playerRunBody') && 
                          scene.textures.exists('playerRunLegsBothDown')
    
    if (hasNewSprites && this.useTwoLayerRunning) {
      // Use x,y parameters passed from constructor, which are guaranteed to be defined
      const initX = x
      const initY = y
      
      // Create the body sprite (upper layer) - initially hidden
      this.runBodySprite = scene.add.image(initX, initY, 'playerRunBody')
      this.runBodySprite.setDisplaySize(48, 64)
      this.runBodySprite.setDepth(21) // Above the main sprite
      this.runBodySprite.setVisible(false)
      
      // Create the legs sprite (lower layer) - initially hidden
      this.runLegsSprite = scene.add.image(initX, initY, 'playerRunLegsBothDown')
      this.runLegsSprite.setDisplaySize(48, 64)
      this.runLegsSprite.setDepth(19) // Below the main sprite but above everything else
      this.runLegsSprite.setVisible(false)
      
      // Set initial leg frame
      this.currentLegFrame = 'bothDown'
      this.legAnimationStep = 0
    } else {
      // Disable two-layer system if sprites not available
      this.useTwoLayerRunning = false
    }
  }
  
  private updateTwoLayerPosition(): void {
    // Keep both sprites aligned with the main player sprite
    // Only update if sprites are visible to prevent unnecessary redraws
    if (this.runBodySprite && this.runLegsSprite && this.runBodySprite.visible) {
      // Only update if position actually changed to minimize redraws
      if (this.runBodySprite.x !== this.x || this.runBodySprite.y !== this.y) {
        this.runBodySprite.x = this.x
        this.runBodySprite.y = this.y
        
        this.runLegsSprite.x = this.x
        this.runLegsSprite.y = this.y
      }
      
      // Only update flip if it actually changed
      if (this.runBodySprite.flipX !== this.flipX) {
        this.runBodySprite.setFlipX(this.flipX)
        this.runLegsSprite.setFlipX(this.flipX)
      }
    }
  }
  
  private showTwoLayerRunning(show: boolean): void {
    if (this.useTwoLayerRunning && this.runBodySprite && this.runLegsSprite) {
      this.runBodySprite.setVisible(show)
      this.runLegsSprite.setVisible(show)
      // Hide the main sprite when showing two-layer system
      this.setVisible(!show)
    }
  }
  
  private updateLegAnimation(): void {
    if (!this.runLegsSprite || !this.useTwoLayerRunning) return
    
    // 8-step animation cycle: 0->1->2->1->0->3->4->3 (and repeat)
    // 0: both down, 1: left mid, 2: left high, 3: right mid, 4: right high
    const legFrames = [
      'bothDown',     // 0
      'leftMid',      // 1  
      'leftHigh',     // 2
      'leftMid',      // 3 (back to mid)
      'bothDown',     // 4 (back to both down)
      'rightMid',     // 5
      'rightHigh',    // 6
      'rightMid'      // 7 (back to mid, then cycle repeats)
    ]
    
    const frame = legFrames[this.legAnimationStep]
    this.currentLegFrame = frame as any
    
    // Update the texture based on current frame
    const textureMap = {
      'bothDown': 'playerRunLegsBothDown',
      'leftMid': 'playerRunLegsLeftMid', 
      'leftHigh': 'playerRunLegsLeftHigh',
      'rightMid': 'playerRunLegsRightMid',
      'rightHigh': 'playerRunLegsRightHigh'
    }
    
    this.runLegsSprite.setTexture(textureMap[frame])
    
    // Advance to next step (0-7 cycle)
    this.legAnimationStep = (this.legAnimationStep + 1) % 8
  }
  
  private updateBodyExpression(): void {
    if (!this.runBodySprite || !this.useTwoLayerRunning) return
    
    // If firing projectile, use eyes 7 (throwing expression)
    if (this.isFiringProjectile) {
      this.runBodySprite.setTexture('playerRunBodyEyes7')
      return
    }
    
    // Random eye selection with occasional blinking for natural movement
    const rand = Math.random()
    if (rand < 0.05) {
      // 5% chance to blink
      this.runBodySprite.setTexture('playerRunBodyBlink')
      // Quick blink - reset after 100ms
      this.scene.time.delayedCall(100, () => {
        if (this.runBodySprite && !this.isFiringProjectile) {
          this.runBodySprite.setTexture(this.currentRunningEye)
        }
      })
    } else if (rand < 0.8) {
      // 75% chance to change eye position (excluding eyes 7 which is for throwing)
      const eyePositions = ['playerRunBody', 'playerRunBodyEyes2', 'playerRunBodyEyes3', 
                           'playerRunBodyEyes4', 'playerRunBodyEyes5', 'playerRunBodyEyes6']
      const randomEye = Phaser.Utils.Array.GetRandom(eyePositions)
      this.currentRunningEye = randomEye
      this.runBodySprite.setTexture(randomEye)
    }
    // 20% chance to keep current eye position (no change)
  }
  
  notifyBubbleActive(isActive: boolean): void {
    this.bubbleActive = isActive
    if (isActive) {
      this.idleTimer = 0 // Reset timer when bubble appears
    }
  }

  update(time: number, delta: number): void {
    // Guard against update being called before physics body is ready
    if (!this.body) return
    
    // Check if game is over - stop all player updates
    const gameScene = this.scene as any
    if (gameScene.isGameOver) return
    
    // FLOOR CLIPPING PREVENTION - Multiple layers of protection
    // Layer 1: Clamp maximum fall speed to prevent tunneling through platforms
    const MAX_FALL_SPEED = 600 // Safe speed that won't tunnel through 32px platforms at 60fps
    if (this.body.velocity.y > MAX_FALL_SPEED) {
      this.setVelocityY(MAX_FALL_SPEED)
    }
    
    // Layer 2: Absolute ground floor enforcement - never allow player below bottom platform
    // Ground floor is at canvas height minus one tile (where the platform surface is)
    // EXCEPT during level intro animation (GameScene handles positioning during intro)
    const isLevelStarting = gameScene.isLevelStarting || false
    
    const groundFloorY = GameSettings.canvas.height - GameSettings.game.tileSize - 10
    if (this.y > groundFloorY && !this.isClimbing && !isLevelStarting) {
      // Player somehow got below ground floor - snap them back up
      this.y = groundFloorY
      this.setVelocityY(0)
      // Force grounded state
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        this.body.blocked.down = true
      }
    }
    
    // Layer 3: Predictive collision check for next frame
    if (this.body.velocity.y > 0 && !this.isClimbing && !isLevelStarting) { // Only when falling and not during intro
      const nextFrameY = this.y + (this.body.velocity.y * delta / 1000)
      if (nextFrameY > groundFloorY) {
        // Next frame would put us below ground - prevent it
        const distanceToGround = groundFloorY - this.y
        const safeVelocity = (distanceToGround * 1000) / delta
        this.setVelocityY(Math.max(0, safeVelocity))
      }
    }
    
    const onGround = this.body.blocked.down
    const spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    
    // Add WASD keys support
    const wKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    const aKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    const sKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    const dKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    
    // Add E key for jump and Q/V/M keys for crystal ball firing
    const eKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    const qKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    const vKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.V)
    const mKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    
    // Get input from keyboard (arrows or WASD) or touch controls (now discrete D-pad)
    // Apply control reversal if cursed teal orb is active
    const reversalActive = this.cursedTealOrbActive
    
    const rawLeftPressed = this.cursors.left.isDown || aKey.isDown || (this.touchControls?.leftPressed || false)
    const rawRightPressed = this.cursors.right.isDown || dKey.isDown || (this.touchControls?.rightPressed || false)
    const rawUpPressed = this.cursors.up.isDown || wKey.isDown || (this.touchControls?.upPressed || false)
    const rawDownPressed = this.cursors.down.isDown || sKey.isDown || (this.touchControls?.downPressed || false)
    
    // Reverse controls if cursed
    const leftPressed = reversalActive ? rawRightPressed : rawLeftPressed
    const rightPressed = reversalActive ? rawLeftPressed : rawRightPressed
    const upPressed = reversalActive ? rawDownPressed : rawUpPressed
    const downPressed = reversalActive ? rawUpPressed : rawDownPressed
    const jumpJustPressed = Phaser.Input.Keyboard.JustDown(spaceKey) || Phaser.Input.Keyboard.JustDown(eKey) || (this.touchControls?.isJumpJustPressed() || false)
    const jumpButtonHeld = spaceKey.isDown || eKey.isDown || (this.touchControls?.jumpPressed || false)
    
    // Crystal ball firing (Q, V, or M keys, or action button on mobile)
    const fireJustPressed = Phaser.Input.Keyboard.JustDown(qKey) || Phaser.Input.Keyboard.JustDown(vKey) || Phaser.Input.Keyboard.JustDown(mKey) || (this.touchControls?.isActionJustPressed() || false)
    
    // Track if player is moving horizontally
    this.isMoving = (leftPressed || rightPressed) && !this.isClimbing
    
    // Track jumping state - immediate transition when landing
    const wasJumping = this.isJumping
    // Jump sprite only when in air AND moving up/down significantly
    // Immediately false when on ground OR when climbing (climbing takes priority)
    this.isJumping = !onGround && Math.abs(this.body!.velocity.y) > 10 && !this.isClimbing
    
    // Force immediate sprite change when landing or climbing
    if (wasJumping && (onGround || this.isClimbing)) {
      // Player just landed or started climbing - force immediate transition away from jump sprite
      this.isJumping = false
    }
    
    // Horizontal movement
    if (!this.isClimbing) {
      const currentSpeed = GameSettings.game.playerSpeed * this.speedMultiplier
      if (leftPressed) {
        this.setVelocityX(-currentSpeed)
        this.setFlipX(true)  // Flip sprite to face left
      } else if (rightPressed) {
        this.setVelocityX(currentSpeed)
        this.setFlipX(false)  // Face right (original direction)
      } else {
        this.setVelocityX(0)
      }
      
      // Scaleable jumping system - but not if we're trying to climb
      // Check if player is overlapping a ladder and pressing up (prioritize climbing over jumping)
      const nearLadder = this.nearbyLadder !== null || this.currentLadder !== null
      let tryingToClimb = nearLadder && upPressed
      
      // Additional check: if already climbing, never jump
      if (this.isClimbing) {
        tryingToClimb = true
      }
      
      // ANTI-SPAM PROTECTION: Prevent jump if velocity is still very negative from previous jump
      // This prevents velocity stacking from rapid jump spam
      const canJump = !this.body.velocity.y || this.body.velocity.y > -100
      
      if (jumpJustPressed && onGround && !this.isAirborne && !tryingToClimb && !this.isClimbing && canJump) {
        // Start jump with initial velocity
        this.jumpButtonDown = true
        this.jumpHoldTime = 0
        this.isAirborne = true
        this.jumpReleased = false
        
        // Same initial velocity for both touch and keyboard for consistent gameplay
        const isTouchInput = this.touchControls?.jumpPressed || false
        const initialVelocity = -150 // Unified initial velocity for both input methods (was -175 touch, -120 keyboard)
        
        // Apply initial jump velocity
        this.setVelocityY(initialVelocity)
        // Play rotating jump sound
        this.playJumpSound()
        const inputType = isTouchInput ? 'TOUCH' : 'KEYBOARD'
        console.log(`[${inputType}] Jump started - Initial velocity: ${initialVelocity}, Target max: ${this.MAX_JUMP_VELOCITY}`)
        this.triggerHapticFeedback() // Haptic feedback for jump start
      }
      
      // Continue boosting jump while airborne
      if (this.isAirborne && this.jumpButtonDown && !this.jumpReleased) {
        if (jumpButtonHeld) {
          this.jumpHoldTime += delta
          
          // Only boost if we're still ascending and within hold time
          if (this.jumpHoldTime < this.MAX_JUMP_HOLD_TIME && this.body?.velocity.y! < 0) {
            // Calculate boost force based on how long we've been holding
            const holdProgress = Math.min(this.jumpHoldTime / this.MAX_JUMP_HOLD_TIME, 1.0)
            
            // Use linear progression for smoother acceleration
            const boostMultiplier = 1.0 - holdProgress // Stronger boost at start, weaker over time
            
            // Apply incremental upward force instead of setting absolute velocity
            // This creates a smoother jump arc without sudden velocity changes
            // Unified boost force for both input methods for consistent gameplay
            const isTouchInput = this.touchControls?.jumpPressed || false
            // CRITICAL FIX: Scale boost force by delta time to make it framerate-independent!
            // Convert delta from milliseconds to seconds, then scale the force
            const deltaSeconds = delta / 1000
            // Boost force is now in units per second, not per frame
            const baseBoostForce = -1600 // Unified force per second for both inputs
            const boostForce = baseBoostForce * boostMultiplier * deltaSeconds
            const currentVelocity = this.body!.velocity.y
            const newVelocity = Math.max(currentVelocity + boostForce, this.MAX_JUMP_VELOCITY)
            
            // Apply the smoothed velocity
            this.setVelocityY(newVelocity)
          }
        } else {
          // Button released - apply a gentle velocity reduction for smoother arc
          this.jumpButtonDown = false
          this.jumpReleased = true
          
          // Slightly reduce upward velocity when button is released early
          // Less reduction for smaller jumps to maintain control
          if (this.body!.velocity.y < 0) {
            const reductionFactor = this.body!.velocity.y < -250 ? 0.85 : 0.92
            this.setVelocityY(this.body!.velocity.y * reductionFactor)
          }
        }
      }
      
      // Reset jump state when landing - but with a small delay to prevent immediate re-triggering
      if (onGround && this.isAirborne && this.body?.velocity.y! >= 0) {
        const inputType = this.touchControls?.jumpPressed ? 'TOUCH' : 'KEYBOARD'
        const totalHoldTime = this.jumpHoldTime
        console.log(`[${inputType}] Jump completed - Total hold time: ${totalHoldTime.toFixed(0)}ms`)
        
        this.isAirborne = false
        this.jumpButtonDown = false
        this.jumpReleased = false
        this.jumpHoldTime = 0
        // Player landed, jump complete - landing sound disabled for now
        // this.scene.sound.play('player-land', { volume: 0.4 })
        this.triggerHapticFeedback() // Haptic feedback for landing
      }
    }
    
    // Ladder climbing logic
    if (this.isClimbing && this.currentLadder) {
      // Disable gravity while climbing
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        this.body.setAllowGravity(false)
      }
      this.setVelocityX(0)
      
      // Get ladder bounds - only restrict going down past bottom
      const ladderRect = this.currentLadder as Phaser.GameObjects.Rectangle
      const ladderBottom = ladderRect.y + ladderRect.height / 2
      
      // Check if player is at or below ladder bottom
      const atLadderBottom = this.y >= ladderBottom - 10 // Small buffer at bottom
      
      // If player is somehow below the ladder bottom, clamp them to the bottom
      if (this.y > ladderBottom - 10) {
        this.y = ladderBottom - 10
        this.setVelocityY(0)
      }
      
      // Track if we're moving vertically on the ladder
      let climbingMovement = false
      
      if (upPressed) {
        // Always allow climbing up - player can exit at top
        // Apply speed multiplier (1.5x when holding pendant)
        const climbSpeed = GameSettings.game.climbSpeed * this.speedMultiplier
        this.setVelocityY(-climbSpeed)
        climbingMovement = true
      } else if (downPressed && !atLadderBottom) {
        // Allow climbing down but stop at ladder bottom
        // Apply speed multiplier (1.5x when holding pendant)
        const climbSpeed = GameSettings.game.climbSpeed * this.speedMultiplier
        this.setVelocityY(climbSpeed)
        climbingMovement = true
      } else {
        // Stop movement when not pressing or at ladder bottom
        this.setVelocityY(0)
      }
      
      // Track climbing movement for animation (only vertical movement counts as "moving" on ladder)
      this.isMoving = climbingMovement
      
      // CRITICAL: Block ALL exits when at ladder bottom and pressing down
      // This prevents the breakthrough bug with touch controls
      const blockExit = atLadderBottom && downPressed
      
      // Allow horizontal movement to exit ladder ONLY if:
      // 1. Not moving vertically (prevents diagonal input from exiting)
      // 2. Not at or below the ladder bottom (prevents falling through bottom)
      // 3. Not pressing down at the bottom (prevents breakthrough bug)
      if ((leftPressed || rightPressed) && !upPressed && !downPressed && !atLadderBottom && !blockExit) {
        this.exitClimbing()
        // Apply horizontal movement immediately after exiting
        const currentSpeed = GameSettings.game.playerSpeed * this.speedMultiplier
        if (leftPressed) {
          this.setVelocityX(-currentSpeed)
        } else if (rightPressed) {
          this.setVelocityX(currentSpeed)
        }
      }
      
      // Exit climbing with jump only if:
      // 1. Not trying to climb up (prevents accidental jumps when trying to climb)
      // 2. For ground floor ladders, always allow jumping
      // 3. For other ladders, don't allow jumping from the very bottom
      // 4. Not blocked by down press at bottom
      const isGroundFloorLadder = ladderBottom >= GameSettings.canvas.height - GameSettings.game.tileSize * 3
      if (jumpJustPressed && !upPressed && (isGroundFloorLadder || !atLadderBottom) && !blockExit) {
        this.exitClimbing()
        this.setVelocityY(this.MAX_JUMP_VELOCITY)
        this.playJumpSound() // Play jump sound when jumping off ladder
      }
    }
    
    // Handle crystal ball firing
    if (fireJustPressed) {
      this.fireCrystalBall()
    }
    
    // Handle bubble system timing
    this.updateBubbleSystem()
    
    // Handle crystal ball power-up timer
    this.updateCrystalBallTimer(delta)
    
    // Handle cursed orb power-up timers
    this.updateCursedOrbTimer(delta)
    this.updateCursedTealOrbTimer(delta)
    
    // Handle smart animation system
    this.updateSmartAnimations()
    
    // Only update two-layer position when sprites are visible and player is moving
    if (this.runBodySprite && this.runBodySprite.visible && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
      this.updateTwoLayerPosition()
    }
  }
  
  startClimbing(ladder: Phaser.GameObjects.GameObject): void {
    this.isClimbing = true
    this.currentLadder = ladder
    
    // Cancel all jump-related states when starting to climb
    this.isAirborne = false
    this.isJumping = false
    this.jumpButtonDown = false
    this.jumpReleased = false
    this.jumpHoldTime = 0
    
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setAllowGravity(false)
      // Stop any vertical velocity from jumping
      this.body.setVelocityY(0)
    }
    // Center player on ladder
    const ladderSprite = ladder as Phaser.GameObjects.Rectangle
    this.x = ladderSprite.x
    
    // IMMEDIATELY set climbing sprite to prevent idle sprite from showing
    this.currentClimbFoot = 'left'
    this.changePlayerTexture('playerClimbLeftFoot')
    this.climbAnimationTimer = 0
    this.resetAnimationTimers()
    this.resetRunningTilt() // Reset any running tilt when starting to climb
  }
  
  exitClimbing(): void {
    this.isClimbing = false
    this.currentLadder = null
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setAllowGravity(true)
    }
    
    // Reset to idle sprite immediately when exiting climbing
    // The smart animation system will handle transitioning to running if moving
    this.currentFrame = 'idle'
    this.changePlayerTexture('playerIdleEye1')
    this.resetAnimationTimers()
  }
  
  checkLadderProximity(ladder: Phaser.GameObjects.GameObject): boolean {
    // Track that we're near this ladder (for jump prevention)
    this.nearbyLadder = ladder
    
    // Check if player is pressing up or down near a ladder
    const wKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    const sKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    // Use discrete D-pad input for ladder climbing
    const upPressed = this.cursors.up.isDown || wKey.isDown || (this.touchControls?.upPressed || false)
    const downPressed = this.cursors.down.isDown || sKey.isDown || (this.touchControls?.downPressed || false)
    
    if (upPressed || downPressed) {
      const ladderSprite = ladder as Phaser.GameObjects.Rectangle
      const distance = Math.abs(this.x - ladderSprite.x)
      return distance < 20 // Within 20 pixels of ladder center
    }
    return false
  }
  
  // Clear nearby ladder reference when not overlapping
  clearNearbyLadder(): void {
    // Only clear if we're not currently climbing
    if (!this.isClimbing) {
      this.nearbyLadder = null
    }
  }
  
  getIsClimbing(): boolean {
    return this.isClimbing
  }
  
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier
  }
  
  private updateBubbleSystem(): void {
    if (!this.body) return // Guard against early calls
    const deltaTime = this.scene.game.loop.delta
    const onGround = this.body.blocked.down
    
    // Check if player is truly idle (not moving, not climbing, not jumping, on ground)
    const playerIsIdle = !this.isMoving && !this.isClimbing && !this.isJumping && onGround
    
    if (playerIsIdle && !this.bubbleActive) {
      // Player is idle and no bubble is active - increment timer
      this.idleTimer += deltaTime
      
      if (this.idleTimer >= this.IDLE_THRESHOLD) {
        // Trigger bubble after 5 seconds of idle
        if (this.onBubbleTrigger) {
          this.onBubbleTrigger()
        }
        this.idleTimer = 0 // Reset timer
      }
    } else {
      // Player is moving or bubble is active - reset timer
      if ((this.isMoving || this.isClimbing || this.isJumping) && this.bubbleActive && this.onMovementStart) {
        // Player started moving while bubble was active - hide bubble immediately
        this.onMovementStart()
      }
      this.idleTimer = 0
    }
    
    // Track long idle timer for booty shake animation
    if (playerIsIdle) {
      this.longIdleTimer += deltaTime
      
      if (this.longIdleTimer >= this.LONG_IDLE_THRESHOLD && !this.isPlayingLongIdle) {
        // Start long idle animation after 30 seconds
        this.isPlayingLongIdle = true
        this.longIdleFrame = 'left'
        this.longIdleAnimationTimer = 0
      }
    } else {
      // Reset long idle when player moves
      if (this.isPlayingLongIdle) {
        this.isPlayingLongIdle = false
        // Return to normal idle sprite
        this.currentFrame = 'idle'
        this.currentIdleState = 'eye1'
        this.changePlayerTexture('playerIdleEye1')
      }
      this.longIdleTimer = 0
      this.longIdleAnimationTimer = 0
    }
  }
  
  private updateSmartAnimations(): void {
    if (!this.body) return // Guard against early calls
    const deltaTime = this.scene.game.loop.delta
    const onGround = this.body.blocked.down
    
    // Priority 1: Climbing animations (climbing overrides EVERYTHING else)
    if (this.isClimbing) {
      // Force ensure we're not in jump state while climbing
      this.isJumping = false
      
      if (this.isMoving) {
        this.handleClimbingAnimation(deltaTime)
      } else {
        // Show static climbing pose when on ladder but not moving
        this.changePlayerTexture('playerClimbLeftFoot')
        this.resetAnimationTimers()
      }
      
      // Hide two-layer running system when climbing
      this.showTwoLayerRunning(false)
      return // Exit early - no other animations should play
    }
    // Priority 2: Jumping animations (only when actually in air and NOT climbing)
    else if (!onGround && this.isJumping && !this.isClimbing) {
      this.handleJumpingAnimation()
    }
    // Priority 3: Running/walking animations (immediate when moving on ground)
    else if (this.isMoving && onGround) {
      this.handleRunningAnimation(deltaTime)
    }
    // Priority 4: Idle animations (immediate when on ground and not moving)
    else if (onGround) {
      this.handleIdleAnimation(deltaTime)
    }
  }
  
  private handleJumpingAnimation(): void {
    // Use direction-based jumping sprites
    const textureKey = this.flipX ? 'playerJumpLeftFoot' : 'playerJumpRightFoot'
    this.changePlayerTexture(textureKey)
    this.currentFrame = 'idle' // Reset frame when jumping
    
    // Hide two-layer running system when jumping
    this.showTwoLayerRunning(false)
    
    // Reset running tilt when jumping
    this.resetRunningTilt()
  }
  
  private handleClimbingAnimation(deltaTime: number): void {
    const climbAnimationSpeed = 120 // Fun, active climbing animation (20% slower than 100ms)
    
    // Hide two-layer running system when climbing
    this.showTwoLayerRunning(false)
    
    // Animation timer for climbing movement
    this.climbAnimationTimer += deltaTime
    
    if (this.climbAnimationTimer >= climbAnimationSpeed && this.isMoving) {
      // Only animate when actually moving on the ladder
      // Alternate feet while climbing to match ladder movement
      if (this.currentClimbFoot === 'left') {
        this.currentClimbFoot = 'right'
        this.changePlayerTexture('playerClimbRightFoot')
      } else {
        this.currentClimbFoot = 'left'
        this.changePlayerTexture('playerClimbLeftFoot')
      }
      this.climbAnimationTimer = 0
    } else if (!this.isMoving) {
      // Show static climbing pose when on ladder but not moving
      this.changePlayerTexture('playerClimbLeftFoot')
      this.resetAnimationTimers()
    }
  }
  
  private handleRunningAnimation(deltaTime: number): void {
    // Handle footstep sounds independently of animation speed
    this.footstepTimer += deltaTime
    if (this.footstepTimer >= this.FOOTSTEP_INTERVAL) {
      // Play footstep sound at normal speed (no rate modification)
      // this.scene.sound.play('footstep', { volume: 0.3 }) // MUTED for now
      this.footstepTimer = 0 // Reset timer
    }
    
    // Check if we should use the new two-layer system
    if (this.useTwoLayerRunning && this.runBodySprite && this.runLegsSprite) {
      // 85% faster leg animation (35ms * 0.8 = 28ms)
      const legAnimationSpeed = 28 // Very fast leg movement
      const bodyAnimationSpeed = 800 // Slower body expression changes
      
      // IMMEDIATE RESPONSE: Start two-layer animation instantly when movement begins
      if (this.currentFrame === 'idle') {
        this.currentFrame = 'leftStep' // Set to running state
        this.showTwoLayerRunning(true)
        this.legAnimationTimer = 0
        this.bodyAnimationTimer = 0
        this.runningTiltTimer = 0
        this.lastFrameWasJump = false
        this.legAnimationStep = 0 // Reset leg animation to start
        this.footstepTimer = 0 // Reset footstep timer when starting to run
        return
      }
      
      this.legAnimationTimer += deltaTime
      this.bodyAnimationTimer += deltaTime
      
      // Keep two-layer system visible (position updated separately)
      this.showTwoLayerRunning(true)
      
      // Update leg animation at fast rate
      if (this.legAnimationTimer >= legAnimationSpeed) {
        this.updateLegAnimation()
        this.legAnimationTimer = 0
      }
      
      // Update body expression (eyes) at slower rate for natural movement
      if (this.bodyAnimationTimer >= 300) {  // Update eyes every 300ms
        this.updateBodyExpression()
        this.bodyAnimationTimer = 0
      }
      
      // Future: Only update when you want random expressions
      // if (this.bodyAnimationTimer >= bodyAnimationSpeed) {
      //   this.updateBodyExpression()
      //   this.bodyAnimationTimer = 0
      // }
    } else {
      // Fall back to original single-sprite animation system
      const runAnimationSpeed = 120 // Original timing
      
      // IMMEDIATE RESPONSE: Start running animation instantly when movement begins
      if (this.currentFrame === 'idle') {
        this.currentFrame = 'leftStep'
        this.changePlayerTexture('playerRunLeftFoot')
        this.walkAnimationTimer = 0
        this.runningTiltTimer = 0
        this.lastFrameWasJump = false
        return
      }
      
      this.walkAnimationTimer += deltaTime
      this.runningTiltTimer += deltaTime
      
      // Apply subtle forward/backward tilt for motion sense (ONLY during running)
      this.applyRunningTilt()
      
      if (this.walkAnimationTimer >= runAnimationSpeed) {
        // Simple alternating animation for fallback
        if (this.currentFrame === 'rightStep') {
          this.currentFrame = 'leftStep'
          this.changePlayerTexture('playerRunLeftFoot')
        } else {
          this.currentFrame = 'rightStep'
          this.changePlayerTexture('playerRunRightFoot')
        }
        this.walkAnimationTimer = 0
      }
    }
  }
  
  private handleIdleAnimation(deltaTime: number): void {
    // Reset footstep timer when idle
    this.footstepTimer = 0
    
    // Check if we're playing the long idle animation (booty shake)
    if (this.isPlayingLongIdle) {
      this.handleLongIdleAnimation(deltaTime)
      return
    }
    
    this.idleAnimationTimer += deltaTime
    
    // Reset to idle state when stopping movement
    if (this.currentFrame !== 'idle') {
      this.currentFrame = 'idle'
      this.currentIdleState = 'eye1'
      this.changePlayerTexture('playerIdleEye1')
      this.idleAnimationTimer = 0
      this.walkAnimationTimer = 0
      this.climbAnimationTimer = 0
      this.legAnimationTimer = 0
      this.bodyAnimationTimer = 0
      
      // Hide two-layer running system when going to idle
      this.showTwoLayerRunning(false)
      
      // Reset running tilt when stopping
      this.resetRunningTilt()
      return
    }
    
    // Organic timing with different patterns for different states
    let animationSpeed: number
    
    if (this.currentIdleState === 'blink') {
      // Quick natural blink - 100-180ms with slight variation
      animationSpeed = 100 + Math.random() * 80
    } else {
      // Eye movement timing with organic variation patterns (slowed down)
      // Base timing gets longer the more "extreme" the eye position
      const baseTimings = {
        'eye1': 1200, // Center-left, comfortable
        'eye2': 1100, // Center-right, comfortable
        'eye3': 1400, // More extreme position
        'eye4': 1600, // Even more extreme
        'eye5': 1800  // Most extreme, longest hold
      }
      
      const baseTiming = baseTimings[this.currentIdleState as keyof typeof baseTimings] || 1200
      // Add natural variation (±400ms) for organic feel
      animationSpeed = baseTiming + (Math.random() - 0.5) * 800
    }
    
    // Handle organic eye animation transitions
    if (this.idleAnimationTimer >= animationSpeed) {
      const randomAction = Math.random()
      const availableEyePositions = ['eye1', 'eye2', 'eye3', 'eye4', 'eye5'] as const
      
      switch (this.currentIdleState) {
        case 'eye1':
          if (randomAction < 0.25) {
            this.currentIdleState = 'blink'
            this.changePlayerTexture('playerIdleBlink')
          } else if (randomAction < 0.55) {
            // Likely to move to nearby positions
            this.currentIdleState = 'eye2'
            this.changePlayerTexture('playerIdleEye2')
          } else if (randomAction < 0.75) {
            this.currentIdleState = 'eye3'
            this.changePlayerTexture('playerIdleEye3')
          } else if (randomAction < 0.90) {
            this.currentIdleState = 'eye4'
            this.changePlayerTexture('playerIdleEye4')
          } else {
            // Rare jump to extreme position
            this.currentIdleState = 'eye5'
            this.changePlayerTexture('playerIdleEye5')
          }
          break
          
        case 'eye2':
          if (randomAction < 0.3) {
            this.currentIdleState = 'blink'
            this.changePlayerTexture('playerIdleBlink')
          } else if (randomAction < 0.60) {
            this.currentIdleState = 'eye1'
            this.changePlayerTexture('playerIdleEye1')
          } else if (randomAction < 0.80) {
            this.currentIdleState = 'eye3'
            this.changePlayerTexture('playerIdleEye3')
          } else if (randomAction < 0.95) {
            this.currentIdleState = 'eye4'
            this.changePlayerTexture('playerIdleEye4')
          } else {
            this.currentIdleState = 'eye5'
            this.changePlayerTexture('playerIdleEye5')
          }
          break
          
        case 'eye3':
          if (randomAction < 0.2) {
            this.currentIdleState = 'blink'
            this.changePlayerTexture('playerIdleBlink')
          } else if (randomAction < 0.45) {
            // Return to comfortable positions more often
            this.currentIdleState = 'eye1'
            this.changePlayerTexture('playerIdleEye1')
          } else if (randomAction < 0.70) {
            this.currentIdleState = 'eye2'
            this.changePlayerTexture('playerIdleEye2')
          } else if (randomAction < 0.90) {
            this.currentIdleState = 'eye4'
            this.changePlayerTexture('playerIdleEye4')
          } else {
            this.currentIdleState = 'eye5'
            this.changePlayerTexture('playerIdleEye5')
          }
          break
          
        case 'eye4':
          if (randomAction < 0.15) {
            this.currentIdleState = 'blink'
            this.changePlayerTexture('playerIdleBlink')
          } else if (randomAction < 0.40) {
            // Strong tendency to return to center
            this.currentIdleState = 'eye1'
            this.changePlayerTexture('playerIdleEye1')
          } else if (randomAction < 0.65) {
            this.currentIdleState = 'eye2'
            this.changePlayerTexture('playerIdleEye2')
          } else if (randomAction < 0.85) {
            this.currentIdleState = 'eye3'
            this.changePlayerTexture('playerIdleEye3')
          } else {
            this.currentIdleState = 'eye5'
            this.changePlayerTexture('playerIdleEye5')
          }
          break
          
        case 'eye5':
          if (randomAction < 0.1) {
            this.currentIdleState = 'blink'
            this.changePlayerTexture('playerIdleBlink')
          } else {
            // Very strong tendency to return to more comfortable positions
            if (randomAction < 0.45) {
              this.currentIdleState = 'eye1'
              this.changePlayerTexture('playerIdleEye1')
            } else if (randomAction < 0.75) {
              this.currentIdleState = 'eye2'
              this.changePlayerTexture('playerIdleEye2')
            } else if (randomAction < 0.90) {
              this.currentIdleState = 'eye3'
              this.changePlayerTexture('playerIdleEye3')
            } else {
              this.currentIdleState = 'eye4'
              this.changePlayerTexture('playerIdleEye4')
            }
          }
          break
          
        case 'blink':
          // After blink, weighted random return to eye positions
          // Favor comfortable central positions
          if (randomAction < 0.35) {
            this.currentIdleState = 'eye1'
            this.changePlayerTexture('playerIdleEye1')
          } else if (randomAction < 0.65) {
            this.currentIdleState = 'eye2'
            this.changePlayerTexture('playerIdleEye2')
          } else if (randomAction < 0.80) {
            this.currentIdleState = 'eye3'
            this.changePlayerTexture('playerIdleEye3')
          } else if (randomAction < 0.95) {
            this.currentIdleState = 'eye4'
            this.changePlayerTexture('playerIdleEye4')
          } else {
            this.currentIdleState = 'eye5'
            this.changePlayerTexture('playerIdleEye5')
          }
          break
      }
      this.idleAnimationTimer = 0
    }
  }
  
  private handleLongIdleAnimation(deltaTime: number): void {
    this.longIdleAnimationTimer += deltaTime
    
    // Use same animation speed as climbing (400ms per frame)
    const animationSpeed = 400
    
    // Hide two-layer running system during booty shake
    this.showTwoLayerRunning(false)
    
    if (this.longIdleAnimationTimer >= animationSpeed) {
      // Alternate between left and right cheek animations
      if (this.longIdleFrame === 'left') {
        this.longIdleFrame = 'right'
        this.changePlayerTexture('playerIdleBootyRight')
      } else {
        this.longIdleFrame = 'left'
        this.changePlayerTexture('playerIdleBootyLeft')
      }
      this.longIdleAnimationTimer = 0
    }
  }
  
  private resetAnimationTimers(): void {
    this.walkAnimationTimer = 0
    this.climbAnimationTimer = 0
    this.idleAnimationTimer = 0
  }
  
  private changePlayerTexture(textureKey: string): void {
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey)
      // Maintain scale for all player textures
      this.setDisplaySize(48, 64)
    }
  }
  
  private applyRunningTilt(): void {
    // Create subtle forward/backward tilt based on running cycle
    const tiltFrequency = 0.02 // How fast the tilt oscillates (matches foot timing roughly)
    const tiltAmplitude = 0.08 // Maximum tilt angle in radians (~4.6 degrees)
    
    // Calculate tilt angle - alternates between forward and back lean
    const tiltAngle = Math.sin(this.runningTiltTimer * tiltFrequency) * tiltAmplitude
    
    // Apply the rotation
    this.setRotation(tiltAngle)
  }
  
  private resetRunningTilt(): void {
    // Smoothly return to upright position
    this.setRotation(0)
    this.runningTiltTimer = 0
  }
  
  private addRoundedHitboxVisualization(): void {
    // Only show in debug mode
    if (!GameSettings.debug) return
    
    const graphics = this.scene.add.graphics()
    const body = this.body as Phaser.Physics.Arcade.Body
    
    // Draw rounded rectangle overlay on the rectangular hitbox
    graphics.lineStyle(2, 0x00ff88, 0.8) // Green with transparency
    graphics.strokeRoundedRect(
      body.x - this.x, 
      body.y - this.y, 
      body.width, 
      body.height, 
      6 // Corner radius
    )
    
    // Attach graphics to follow the player
    graphics.setDepth(25) // Above player but below UI
    this.scene.add.existing(graphics)
    
    // Update graphics position in update loop
    this.scene.events.on('postupdate', () => {
      if (graphics && graphics.active) {
        graphics.x = this.x
        graphics.y = this.y
      }
    })
  }

  private triggerHapticFeedback(): void {
    // Trigger haptic feedback through GameScene
    const gameScene = this.scene as any
    if (gameScene && gameScene.triggerFarcadeHapticFeedback) {
      gameScene.triggerFarcadeHapticFeedback()
    }
  }
  
  // Crystal Ball power-up methods
  activateCrystalBall(): void {
    console.log('🔮 ACTIVATING Crystal Ball power-up for 10 seconds!')
    this.crystalBallActive = true
    this.crystalBallTimer = this.CRYSTAL_BALL_DURATION
    this.crystalBallWarningPlayed = false // Reset warning flag
    
    // Start green particle effect around player
    this.startCrystalBallParticles()
    
    // Notify scene to update HUD
    const gameScene = this.scene as any
    if (gameScene && gameScene.updateCrystalBallTimer) {
      console.log('🔮 Updating HUD timer with', this.crystalBallTimer, 'ms')
      gameScene.updateCrystalBallTimer(this.crystalBallTimer, this.CRYSTAL_BALL_DURATION)
    } else {
      console.log('❌ Could not update HUD timer - scene method not found')
    }
  }
  
  private updateCrystalBallTimer(delta: number): void {
    if (this.crystalBallActive) {
      this.crystalBallTimer -= delta
      
      // Warning when 2 seconds remaining (sound removed)
      if (!this.crystalBallWarningPlayed && this.crystalBallTimer <= 2000 && this.crystalBallTimer > 0) {
        this.crystalBallWarningPlayed = true
        console.log('⏰ Timer warning for crystal ball')
      }
      
      // Update glow position to follow player
      if (this.crystalBallGlow) {
        this.crystalBallGlow.x = this.x
        this.crystalBallGlow.y = this.y
      }
      
      if (this.crystalBallTimer <= 0) {
        this.crystalBallActive = false
        this.crystalBallTimer = 0
        
        // Stop particle effect when power-up expires
        this.stopCrystalBallParticles()
      }
      
      // Update HUD timer
      const gameScene = this.scene as any
      if (gameScene && gameScene.updateCrystalBallTimer) {
        gameScene.updateCrystalBallTimer(this.crystalBallTimer, this.CRYSTAL_BALL_DURATION)
      }
    }
  }
  
  getCrystalBallActive(): boolean {
    return this.crystalBallActive
  }
  
  getCrystalBallTimeRemaining(): number {
    return this.crystalBallTimer
  }
  
  fireCrystalBall(): void {
    console.log('🔫 Fire button pressed! Active:', this.crystalBallActive, 'Climbing:', this.isClimbing)
    if (!this.crystalBallActive) {
      console.log('❌ Cannot fire - Crystal Ball power-up not active')
      return
    }
    if (this.isClimbing) {
      console.log('❌ Cannot fire - Player is climbing')
      return
    }
    
    // Set firing flag for eye animation (eyes 7)
    this.isFiringProjectile = true
    this.scene.time.delayedCall(400, () => {
      this.isFiringProjectile = false
      // Reset to current eye position
      if (this.runBodySprite && this.useTwoLayerRunning && this.isRunning) {
        this.runBodySprite.setTexture(this.currentRunningEye)
      }
    })
    
    // Notify scene to create projectile
    const gameScene = this.scene as any
    if (gameScene && gameScene.createCrystalBallProjectile) {
      const direction = this.flipX ? -1 : 1
      // Pass player velocity to compensate for movement
      const playerVelocityX = this.body ? (this.body as Phaser.Physics.Arcade.Body).velocity.x : 0
      console.log('🔫 FIRING Crystal Ball projectile! Direction:', direction, 'Player velocity:', playerVelocityX)
      gameScene.createCrystalBallProjectile(this.x, this.y, direction, playerVelocityX)
    } else {
      console.log('❌ Could not fire - scene method not found')
    }
  }
  
  private startCrystalBallParticles(): void {
    // Stop any existing particle timer
    this.stopCrystalBallParticles()
    
    // Start particle generation
    this.crystalBallParticleTimer = this.scene.time.addEvent({
      delay: 150, // Create particle every 150ms
      callback: () => this.createCrystalBallParticle(),
      loop: true
    })
  }
  
  private createCrystalBallParticle(): void {
    if (!this.crystalBallActive || !this.scene) return
    
    // Create glowing green pixel particle
    const particle = this.scene.add.graphics()
    // Add glow effect with multiple layers
    particle.fillStyle(0x44d0a7, 0.3)
    particle.fillCircle(0, 0, 4) // Outer glow
    particle.fillStyle(0x44d0a7, 0.6)
    particle.fillCircle(0, 0, 2) // Middle glow
    particle.fillStyle(0x44d0a7, 1)
    particle.fillRect(-1, -1, 2, 2) // Core pixel
    
    // Random position around the player (orbiting effect)
    const angle = Math.random() * Math.PI * 2
    const distance = 25 + Math.random() * 15 // 25-40 pixels from player
    const startX = this.x + Math.cos(angle) * distance
    const startY = this.y + Math.sin(angle) * distance
    
    particle.x = startX
    particle.y = startY
    particle.setDepth(19) // Just below player (player is depth 20)
    
    this.crystalBallParticles.push(particle)
    
    // Animate particle orbiting and fading
    this.scene.tweens.add({
      targets: particle,
      x: this.x + Math.cos(angle + 1) * (distance + 10), // Continue orbit
      y: startY - 20, // Float upward
      alpha: 0,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.crystalBallParticles.indexOf(particle)
        if (index > -1) {
          this.crystalBallParticles.splice(index, 1)
        }
        particle.destroy()
      }
    })
  }
  
  private stopCrystalBallParticles(): void {
    // Stop particle generation
    if (this.crystalBallParticleTimer) {
      this.crystalBallParticleTimer.destroy()
      this.crystalBallParticleTimer = undefined
    }
    
    // Clean up existing particles
    this.crystalBallParticles.forEach(particle => particle.destroy())
    this.crystalBallParticles = []
    
    // Clean up glow effect
    if (this.crystalBallGlow) {
      this.crystalBallGlow.destroy()
      this.crystalBallGlow = undefined
    }
  }

  private createPlayerGlow(): void {
    if (!this.crystalBallGlow || !this.crystalBallActive) return
    
    // Clear previous glow
    this.crystalBallGlow.clear()
    
    // Create subtle green glow around player
    const glowColor = 0x44d0a7
    
    // Position glow at player center
    this.crystalBallGlow.x = this.x
    this.crystalBallGlow.y = this.y
    
    // Multiple layered circles for soft glow effect
    this.crystalBallGlow.fillStyle(glowColor, 0.1)
    this.crystalBallGlow.fillCircle(0, 0, 35) // Outer glow
    this.crystalBallGlow.fillStyle(glowColor, 0.2)
    this.crystalBallGlow.fillCircle(0, 0, 25) // Middle glow  
    this.crystalBallGlow.fillStyle(glowColor, 0.3)
    this.crystalBallGlow.fillCircle(0, 0, 15) // Inner glow
    
    // Add pulsing animation
    this.scene.tweens.add({
      targets: this.crystalBallGlow,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  // Cursed Orb power-up methods
  activateCursedOrb(): void {
    this.cursedOrbActive = true
    this.cursedOrbTimer = this.CURSED_ORB_DURATION
    this.cursedOrbWarningPlayed = false // Reset warning flag
    
    // Start dark purple particle effect around player
    this.startCursedOrbParticles()
    
    // Notify scene to update HUD and activate darkness
    const gameScene = this.scene as any
    if (gameScene && gameScene.updateCursedOrbTimer) {
      gameScene.updateCursedOrbTimer(this.cursedOrbTimer, this.CURSED_ORB_DURATION)
    }
    if (gameScene && gameScene.activateDarknessEffect) {
      gameScene.activateDarknessEffect()
    }
  }
  
  activateCursedTealOrb(): void {
    this.cursedTealOrbActive = true
    this.cursedTealOrbTimer = this.CURSED_TEAL_ORB_DURATION
    this.cursedTealOrbWarningPlayed = false // Reset warning flag
    
    // Start teal particle effect around player
    this.startCursedTealOrbParticles()
    
    // Notify scene to update HUD
    const gameScene = this.scene as any
    if (gameScene && gameScene.updateCursedTealOrbTimer) {
      gameScene.updateCursedTealOrbTimer(this.cursedTealOrbTimer, this.CURSED_TEAL_ORB_DURATION)
    }
  }
  
  // Getter methods for cursed power-ups
  getCursedOrbActive(): boolean {
    return this.cursedOrbActive
  }
  
  getCursedTealOrbActive(): boolean {
    return this.cursedTealOrbActive
  }

  private updateCursedOrbTimer(delta: number): void {
    if (this.cursedOrbActive) {
      this.cursedOrbTimer -= delta
      
      // Warning when 2 seconds remaining (sound removed)
      if (!this.cursedOrbWarningPlayed && this.cursedOrbTimer <= 2000 && this.cursedOrbTimer > 0) {
        this.cursedOrbWarningPlayed = true
        console.log('⏰ Timer warning for cursed orb')
      }
      
      // Update glow position to follow player
      if (this.cursedOrbGlow) {
        this.cursedOrbGlow.x = this.x
        this.cursedOrbGlow.y = this.y
      }
      
      if (this.cursedOrbTimer <= 0) {
        this.cursedOrbActive = false
        this.cursedOrbTimer = 0
        
        // Stop particle effect when power-up expires
        this.stopCursedOrbParticles()
        
        // Notify scene to deactivate darkness
        const gameScene = this.scene as any
        if (gameScene && gameScene.deactivateDarknessEffect) {
          gameScene.deactivateDarknessEffect()
        }
      }
      
      // Update HUD timer
      const gameScene = this.scene as any
      if (gameScene && gameScene.updateCursedOrbTimer) {
        gameScene.updateCursedOrbTimer(this.cursedOrbTimer, this.CURSED_ORB_DURATION)
      }
    }
  }
  
  private updateCursedTealOrbTimer(delta: number): void {
    if (this.cursedTealOrbActive) {
      this.cursedTealOrbTimer -= delta
      
      // Warning when 2 seconds remaining (sound removed)
      if (!this.cursedTealOrbWarningPlayed && this.cursedTealOrbTimer <= 2000 && this.cursedTealOrbTimer > 0) {
        this.cursedTealOrbWarningPlayed = true
        console.log('⏰ Timer warning for cursed teal orb')
      }
      
      // Update glow position to follow player
      if (this.cursedTealOrbGlow) {
        this.cursedTealOrbGlow.x = this.x
        this.cursedTealOrbGlow.y = this.y
      }
      
      if (this.cursedTealOrbTimer <= 0) {
        this.cursedTealOrbActive = false
        this.cursedTealOrbTimer = 0
        
        // Stop particle effect when power-up expires
        this.stopCursedTealOrbParticles()
      }
      
      // Update HUD timer
      const gameScene = this.scene as any
      if (gameScene && gameScene.updateCursedTealOrbTimer) {
        gameScene.updateCursedTealOrbTimer(this.cursedTealOrbTimer, this.CURSED_TEAL_ORB_DURATION)
      }
    }
  }
  
  // Particle methods for cursed orbs (similar structure to crystal ball)
  private startCursedOrbParticles(): void {
    this.stopCursedOrbParticles()
    
    // Create glow effect around player
    this.cursedOrbGlow = this.scene.add.graphics()
    this.cursedOrbGlow.setDepth(18)
    this.createCursedOrbPlayerGlow()
    
    this.cursedOrbParticleTimer = this.scene.time.addEvent({
      delay: 200, // Slightly slower than crystal ball
      callback: () => this.createCursedOrbParticle(),
      loop: true
    })
  }
  
  private startCursedTealOrbParticles(): void {
    this.stopCursedTealOrbParticles()
    
    // Create glow effect around player
    this.cursedTealOrbGlow = this.scene.add.graphics()
    this.cursedTealOrbGlow.setDepth(18)
    this.createCursedTealOrbPlayerGlow()
    
    this.cursedTealOrbParticleTimer = this.scene.time.addEvent({
      delay: 180, // Faster than cursed orb
      callback: () => this.createCursedTealOrbParticle(),
      loop: true
    })
  }
  
  private createCursedOrbParticle(): void {
    if (!this.cursedOrbActive || !this.scene) return
    
    const particle = this.scene.add.graphics()
    // Dark purple glowing particle
    particle.fillStyle(0x580641, 0.4)
    particle.fillCircle(0, 0, 3) // Outer glow
    particle.fillStyle(0x580641, 0.8)
    particle.fillCircle(0, 0, 1) // Core
    
    const angle = Math.random() * Math.PI * 2
    const distance = 30 + Math.random() * 15
    const startX = this.x + Math.cos(angle) * distance
    const startY = this.y + Math.sin(angle) * distance
    
    particle.x = startX
    particle.y = startY
    particle.setDepth(19)
    
    this.cursedOrbParticles.push(particle)
    
    // Animate particle floating downward (cursed effect)
    this.scene.tweens.add({
      targets: particle,
      y: startY + 25,
      alpha: 0,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.cursedOrbParticles.indexOf(particle)
        if (index > -1) {
          this.cursedOrbParticles.splice(index, 1)
        }
        particle.destroy()
      }
    })
  }
  
  private createCursedTealOrbParticle(): void {
    if (!this.cursedTealOrbActive || !this.scene) return
    
    const particle = this.scene.add.graphics()
    // Teal glowing particle
    particle.fillStyle(0x49a79c, 0.4)
    particle.fillCircle(0, 0, 3)
    particle.fillStyle(0x49a79c, 0.8)
    particle.fillCircle(0, 0, 1)
    
    const angle = Math.random() * Math.PI * 2
    const distance = 25 + Math.random() * 20
    const startX = this.x + Math.cos(angle) * distance
    const startY = this.y + Math.sin(angle) * distance
    
    particle.x = startX
    particle.y = startY
    particle.setDepth(19)
    
    this.cursedTealOrbParticles.push(particle)
    
    // Animate particle in chaotic spiral (control reversal theme)
    this.scene.tweens.add({
      targets: particle,
      x: startX + Math.sin(angle) * 30, // Spiral motion
      y: startY - 20,
      alpha: 0,
      duration: 1300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.cursedTealOrbParticles.indexOf(particle)
        if (index > -1) {
          this.cursedTealOrbParticles.splice(index, 1)
        }
        particle.destroy()
      }
    })
  }
  
  private createCursedOrbPlayerGlow(): void {
    if (!this.cursedOrbGlow || !this.cursedOrbActive) return
    
    this.cursedOrbGlow.clear()
    const glowColor = 0x580641 // Dark purple
    
    this.cursedOrbGlow.x = this.x
    this.cursedOrbGlow.y = this.y
    
    // Dark, ominous glow
    this.cursedOrbGlow.fillStyle(glowColor, 0.15)
    this.cursedOrbGlow.fillCircle(0, 0, 40)
    this.cursedOrbGlow.fillStyle(glowColor, 0.25)
    this.cursedOrbGlow.fillCircle(0, 0, 25)
    
    this.scene.tweens.add({
      targets: this.cursedOrbGlow,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
  
  private createCursedTealOrbPlayerGlow(): void {
    if (!this.cursedTealOrbGlow || !this.cursedTealOrbActive) return
    
    this.cursedTealOrbGlow.clear()
    const glowColor = 0x49a79c // Teal
    
    this.cursedTealOrbGlow.x = this.x
    this.cursedTealOrbGlow.y = this.y
    
    // Chaotic, swirling glow
    this.cursedTealOrbGlow.fillStyle(glowColor, 0.12)
    this.cursedTealOrbGlow.fillCircle(0, 0, 38)
    this.cursedTealOrbGlow.fillStyle(glowColor, 0.22)
    this.cursedTealOrbGlow.fillCircle(0, 0, 22)
    
    this.scene.tweens.add({
      targets: this.cursedTealOrbGlow,
      rotation: Math.PI * 2,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.7,
      duration: 900, // Faster than cursed orb
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
  
  private stopCursedOrbParticles(): void {
    if (this.cursedOrbParticleTimer) {
      this.cursedOrbParticleTimer.destroy()
      this.cursedOrbParticleTimer = undefined
    }
    
    this.cursedOrbParticles.forEach(particle => particle.destroy())
    this.cursedOrbParticles = []
    
    if (this.cursedOrbGlow) {
      this.cursedOrbGlow.destroy()
      this.cursedOrbGlow = undefined
    }
  }
  
  private stopCursedTealOrbParticles(): void {
    if (this.cursedTealOrbParticleTimer) {
      this.cursedTealOrbParticleTimer.destroy()
      this.cursedTealOrbParticleTimer = undefined
    }
    
    this.cursedTealOrbParticles.forEach(particle => particle.destroy())
    this.cursedTealOrbParticles = []
    
    if (this.cursedTealOrbGlow) {
      this.cursedTealOrbGlow.destroy()
      this.cursedTealOrbGlow = undefined
    }
  }
  
  // Public methods to stop cursed orb particles (called from GameScene)
  public stopAllCursedOrbParticles(): void {
    this.stopCursedOrbParticles()
  }
  
  public stopAllCursedTealOrbParticles(): void {
    this.stopCursedTealOrbParticles()
  }
  
  private playJumpSound(): void {
    // Check if sound effects are enabled (SDK mute is handled by Phaser internally)
    const sfxEnabled = this.scene.registry.get('sfxEnabled') !== false
    if (sfxEnabled) {
      // Play rotating jump sound
      const soundKey = `jump-${this.currentJumpSound}`
      this.scene.sound.play(soundKey, { volume: 0.4 })
    }
    
    // Rotate to next sound (1, 2, 3, then back to 1)
    this.currentJumpSound = this.currentJumpSound >= 3 ? 1 : this.currentJumpSound + 1
  }
}