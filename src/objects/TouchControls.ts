import GameSettings from "../config/GameSettings"

export class TouchControls {
  private scene: Phaser.Scene
  private enabled: boolean = true  // Track if controls are enabled
  private isMobileDevice: boolean = false  // Track if on mobile device
  
  // Touchpad system (replaces D-pad buttons)
  private touchpadContainer: Phaser.GameObjects.Container
  private touchpadBackground: Phaser.GameObjects.Image
  private touchpadIndicator: Phaser.GameObjects.Arc
  private touchPosition: { x: number, y: number } | null = null
  
  // Jump button
  private jumpButton: Phaser.GameObjects.Container
  private jumpButtonImage: Phaser.GameObjects.Image
  private jumpButtonText: Phaser.GameObjects.Text
  
  // Action button
  private actionButton: Phaser.GameObjects.Container
  private actionButtonImage: Phaser.GameObjects.Image
  private actionButtonCircle: Phaser.GameObjects.Arc
  private actionButtonText: Phaser.GameObjects.Text
  
  // Touchpad states (continuous values)
  public horizontalInput: number = 0 // -1 to 1
  public verticalInput: number = 0   // -1 to 1
  // D-pad button states (for compatibility)
  public upPressed: boolean = false
  public downPressed: boolean = false
  public leftPressed: boolean = false
  public rightPressed: boolean = false
  public jumpPressed: boolean = false
  public jumpJustPressed: boolean = false
  public actionPressed: boolean = false
  public actionJustPressed: boolean = false
  
  private lastJumpState: boolean = false
  private lastActionState: boolean = false
  
  // Track individual touches for multi-touch
  private touchpadPointerId: number = -1
  private jumpPointerId: number = -1
  private actionPointerId: number = -1
  
  // Touchpad layout
  private touchpadCenter: { x: number, y: number }
  private touchpadRadius: number = 110  // Increased to 110px radius for 220px visual diameter
  private deadZone: number = 5 // Smaller dead zone for more responsive touch

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    // Center D-pad on same Y-axis as buttons (Y:600 for 720px canvas)
    const actualCanvasHeight = this.scene.game.config.height as number
    this.touchpadCenter = { x: 120, y: actualCanvasHeight - 120 } // Moved right 10px to X:120, Y:600
    
    // Detect if on mobile device
    this.detectMobileDevice()
    
    this.createTouchpad()
    this.createJumpButton()
    this.createActionButton()
    this.setupInputHandlers()
    
    // Add debug visualizations if in debug mode or dgen1
    const isDgen1 = (GameSettings as any).buildType === 'dgen1'
    const showDebugVisuals = false  // Set to true to show debug hitboxes and gridlines
    if (showDebugVisuals && (GameSettings.debug || isDgen1)) {
      console.log('🎯 Creating debug visualizations for touch controls')
      this.createDebugVisualization()
      this.createXAxisGrid()
    }
  }
  
  private detectMobileDevice(): void {
    // Check for touch support and common mobile indicators
    const isTouchDevice = ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0) ||
                         ((navigator as any).msMaxTouchPoints > 0)
    
    // Check user agent for mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const isMobileUA = mobileRegex.test(navigator.userAgent)
    
    // Check screen size (mobile devices typically have smaller screens)
    const isSmallScreen = window.innerWidth <= 768
    
    // Device is mobile if it has touch AND (mobile UA OR small screen)
    this.isMobileDevice = isTouchDevice && (isMobileUA || isSmallScreen)
    
    // FOR TESTING: Enable on desktop if debug mode or dgen1 build
    const isDgen1 = (window as any).game?.registry?.get('isDgen1') || false
    const enableForTesting = GameSettings.debug || isDgen1
    
    console.log('🎮 Touch Controls Detection:', {
      isTouchDevice,
      isMobileUA,
      isSmallScreen,
      isMobileDevice: this.isMobileDevice,
      enableForTesting,
      finalEnabled: this.isMobileDevice || enableForTesting
    })
    
    // Override for testing on desktop
    if (enableForTesting) {
      this.isMobileDevice = true
      console.log('⚠️ Touch controls enabled for desktop testing')
    }
  }

  private createTouchpad(): void {
    // Create touchpad container
    this.touchpadContainer = this.scene.add.container(this.touchpadCenter.x, this.touchpadCenter.y)
    this.touchpadContainer.setDepth(1000)
    this.touchpadContainer.setScrollFactor(0)

    // Create custom D-pad background image (smaller visual, same hitbox)
    this.touchpadBackground = this.scene.add.image(0, 0, 'custom-dpad')
    const visualRadius = this.touchpadRadius - 10  // Visual is 10px smaller (100px radius = 200px diameter)
    this.touchpadBackground.setDisplaySize(visualRadius * 2, visualRadius * 2) // 200px diameter visual
    this.touchpadContainer.add(this.touchpadBackground)

    // Debug: Add hitbox visualization (92.5px radius circle for 185px total diameter)
    // const hitboxDebug = this.scene.add.circle(0, 0, 92.5, 0x0000ff, 0.3) // Semi-transparent blue circle
    // hitboxDebug.setStrokeStyle(2, 0x0000ff, 0.8) // Blue border
    // this.touchpadContainer.add(hitboxDebug)

    // Create touch position indicator (initially hidden) - bright pink
    this.touchpadIndicator = this.scene.add.circle(0, 0, 8, 0xff1493, 0.9)
    this.touchpadIndicator.setStrokeStyle(2, 0xffffff, 0.9)
    this.touchpadIndicator.setVisible(false)
    this.touchpadContainer.add(this.touchpadIndicator)
  }

  // Note: Directional hints are now built into the custom D-pad image
  // private addDirectionalHints(): void { ... } - removed since custom D-pad includes visual cues

  private createJumpButton(): void {
    // Debug: Check what canvas width we're actually using
    console.log('🎮 Jump Button Canvas Check:', {
      GameSettingsWidth: GameSettings.canvas.width,
      GameSettingsHeight: GameSettings.canvas.height,
      SceneWidth: this.scene.cameras.main.width,
      SceneHeight: this.scene.cameras.main.height,
      GameWidth: this.scene.game.config.width,
      GameHeight: this.scene.game.config.height
    })
    
    // Use the actual game config width instead of GameSettings
    const actualCanvasWidth = this.scene.game.config.width as number
    const actualCanvasHeight = this.scene.game.config.height as number
    
    // Position jump button at specific coordinates (moved down 100px and left 20px)
    const buttonX = 620  // Moved left 20px from 640 to 620
    const buttonY = actualCanvasHeight - 120 // Moved down 100px (was -220, now -120)
    
    console.log('🎯 Jump Button Position:', { buttonX, buttonY, actualCanvasWidth })
    
    // Create jump button container
    this.jumpButton = this.scene.add.container(buttonX, buttonY)
    this.jumpButton.setDepth(1000)
    this.jumpButton.setScrollFactor(0)

    // Custom jump button image
    this.jumpButtonImage = this.scene.add.image(0, 0, 'custom-jump-button')
    this.jumpButtonImage.setDisplaySize(80, 80) // Updated to 80x80px
    
    // Debug: Add hitbox visualization (100px wide, extends from y:550 to bottom)
    // const screenHeight = GameSettings.canvas.height
    // const hitboxHeight = screenHeight - 550 // From y:550 to bottom (800 - 550 = 250px tall)
    // const hitboxDebug = this.scene.add.rectangle(0, (hitboxHeight/2) - (680 - 550), 100, hitboxHeight, 0xff0000, 0.3) // Semi-transparent red rectangle
    // hitboxDebug.setStrokeStyle(2, 0xff0000, 0.8) // Red border
    
    // No text - clean minimal design
    this.jumpButton.add([this.jumpButtonImage])
  }

  private createActionButton(): void {
    // Position action button (moved 25px right from 420 to 445)
    const actualCanvasHeight = this.scene.game.config.height as number
    const buttonX = 445  // Moved right 25px from 420 to 445
    const buttonY = actualCanvasHeight - 120 // Same Y as jump button (600 for 720px canvas)
    
    // Create action button container (initially visible for setup)
    this.actionButton = this.scene.add.container(buttonX, buttonY)
    this.actionButton.setDepth(1000)
    this.actionButton.setScrollFactor(0)
    this.actionButton.setVisible(true)  // Make visible for now to test positioning

    // Custom action button image
    this.actionButtonImage = this.scene.add.image(0, 0, 'custom-action-button')
    this.actionButtonImage.setDisplaySize(80, 80) // Updated to 80x80px
    
    // Debug: Add hitbox visualization (110px wide, extends from y:550 to bottom)
    // const screenHeight = GameSettings.canvas.height
    // const hitboxHeight = screenHeight - 550 // From y:550 to bottom (800 - 550 = 250px tall)
    // const hitboxDebug = this.scene.add.rectangle(0, (hitboxHeight/2) - (680 - 550), 110, hitboxHeight, 0x00ff00, 0.3) // Semi-transparent green rectangle
    // hitboxDebug.setStrokeStyle(2, 0x00ff00, 0.8) // Green border
    
    this.actionButton.add([this.actionButtonImage])
  }

  private setupInputHandlers(): void {
    // Track active pointers for multi-touch
    const activePointers = new Set<number>()
    
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      activePointers.add(pointer.id)
      this.handlePointerDown(pointer)
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (activePointers.has(pointer.id)) {
        this.handlePointerMove(pointer)
      }
    })

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      activePointers.delete(pointer.id)
      this.handlePointerUp(pointer)
    })
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return  // Don't handle input if disabled
    if (!this.isMobileDevice) {
      console.log('❌ Touch controls disabled - not mobile device')
      return  // Only work on mobile devices
    }
    
    console.log('👆 Pointer down:', {
      x: pointer.x,
      y: pointer.y,
      id: pointer.id,
      enabled: this.enabled,
      isMobile: this.isMobileDevice
    })
    
    const touchX = pointer.x
    const touchY = pointer.y
    
    // Check if touch is on touchpad area (hitbox is 110px radius = 220px diameter)
    const touchpadDist = Math.sqrt(
      Math.pow(touchX - this.touchpadCenter.x, 2) + 
      Math.pow(touchY - this.touchpadCenter.y, 2)
    )
    
    console.log('🎯 Touchpad check:', {
      distance: touchpadDist,
      threshold: 110,
      center: this.touchpadCenter,
      touch: { x: touchX, y: touchY }
    })
    
    if (touchpadDist <= 110 && this.touchpadPointerId === -1) {
      console.log('✅ Touchpad activated')
      this.touchpadPointerId = pointer.id
      // Immediately update position on initial touch for instant response
      this.updateTouchpadFromPosition(touchX, touchY)
      this.touchpadIndicator.setVisible(true)
      // Force an immediate update to ensure direction is registered
      this.forceUpdate()
      return
    }
    
    // Check if touch is on jump button area (fixed position with 175x200 hitbox)
    const jumpButtonX = 620  // Moved left 20px to X:620
    const jumpButtonLeft = jumpButtonX - 87.5  // 87.5px to the left of center (175px wide)
    const jumpButtonRight = jumpButtonX + 87.5  // 87.5px to the right of center
    const actualCanvasHeight = this.scene.game.config.height as number
    const jumpButtonY = actualCanvasHeight - 120  // Moved down 100px (600 for 720px canvas)
    const hitboxTop = jumpButtonY - 100  // Hitbox extends 100px above center (200px tall)
    const hitboxBottom = jumpButtonY + 100  // Hitbox extends 100px below center
    
    console.log('🦘 Jump button check:', {
      touchX,
      touchY,
      bounds: { left: jumpButtonLeft, right: jumpButtonRight, top: hitboxTop, bottom: hitboxBottom },
      inBounds: touchX >= jumpButtonLeft && touchX <= jumpButtonRight && touchY >= hitboxTop && touchY <= hitboxBottom
    })
    
    if (touchX >= jumpButtonLeft && touchX <= jumpButtonRight && 
        touchY >= hitboxTop && touchY <= hitboxBottom) { // Within the rectangle
      if (this.jumpPointerId === -1) {
        console.log('✅ Jump button pressed!')
        this.jumpPointerId = pointer.id
        this.jumpPressed = true
        // No visual effects when pressed
      }
      return
    }
    
    // Check if touch is on action button area (only if visible) - 175x200 hitbox
    if (this.actionButton.visible) {
      const actionButtonX = 445  // Moved right 25px to X:445
      const actionButtonLeft = actionButtonX - 87.5  // 87.5px to the left of center (175px wide)
      const actionButtonRight = actionButtonX + 87.5  // 87.5px to the right of center
      const actualCanvasHeight = this.scene.game.config.height as number
      const actionButtonY = actualCanvasHeight - 120  // Same Y as jump button (600 for 720px)
      const hitboxTop = actionButtonY - 100  // Hitbox extends 100px above center (200px tall)
      const hitboxBottom = actionButtonY + 100  // Hitbox extends 100px below center
      
      if (touchX >= actionButtonLeft && touchX <= actionButtonRight && 
          touchY >= hitboxTop && touchY <= hitboxBottom) { // Within the 200x200 square
        if (this.actionPointerId === -1) {
          this.actionPointerId = pointer.id
          this.actionPressed = true
          // No visual effects when pressed
        }
      }
    }
  }

  private updateTouchpadFromPosition(touchX: number, touchY: number): void {
    // Calculate relative position from touchpad center
    const relativeX = touchX - this.touchpadCenter.x
    const relativeY = touchY - this.touchpadCenter.y
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY)
    
    // Apply dead zone
    if (distance < this.deadZone) {
      this.horizontalInput = 0
      this.verticalInput = 0
      this.leftPressed = false
      this.rightPressed = false
      this.upPressed = false
      this.downPressed = false
      this.touchpadIndicator.setPosition(0, 0)
      return
    }
    
    // Normalize to -1 to 1 range, clamped to touchpad radius
    const normalizedDistance = Math.min(distance, this.touchpadRadius)
    const normalizedX = (relativeX / normalizedDistance) * (normalizedDistance / this.touchpadRadius)
    const normalizedY = (relativeY / normalizedDistance) * (normalizedDistance / this.touchpadRadius)
    
    // Set continuous input values
    this.horizontalInput = normalizedX
    this.verticalInput = normalizedY
    
    // Set discrete button states for compatibility (with threshold)
    const threshold = 0.3
    this.leftPressed = normalizedX < -threshold
    this.rightPressed = normalizedX > threshold
    this.upPressed = normalizedY < -threshold
    this.downPressed = normalizedY > threshold
    
    // Update visual indicator position (clamped to touchpad radius)
    const indicatorDistance = Math.min(distance, this.touchpadRadius - 8)
    const indicatorX = (relativeX / distance) * indicatorDistance
    const indicatorY = (relativeY / distance) * indicatorDistance
    this.touchpadIndicator.setPosition(indicatorX, indicatorY)
    
    // Store current touch position for reference
    this.touchPosition = { x: relativeX, y: relativeY }
  }
  
  // Force immediate update of controls
  private forceUpdate(): void {
    // This ensures the control state is immediately available
    // Useful for making D-pad more responsive on initial touch
    if (this.touchpadIndicator.visible) {
      // Touch is active, states are already set
    }
  }


  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return  // Don't handle input if disabled
    if (!this.isMobileDevice) return  // Only work on mobile devices
    
    // Check if this pointer is controlling the touchpad
    if (pointer.id === this.touchpadPointerId) {
      this.updateTouchpadFromPosition(pointer.x, pointer.y)
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return  // Don't handle input if disabled
    if (!this.isMobileDevice) return  // Only work on mobile devices
    
    // Check touchpad release
    if (pointer.id === this.touchpadPointerId) {
      this.touchpadPointerId = -1
      this.horizontalInput = 0
      this.verticalInput = 0
      this.leftPressed = false
      this.rightPressed = false
      this.upPressed = false
      this.downPressed = false
      this.touchpadIndicator.setVisible(false)
      this.touchpadIndicator.setPosition(0, 0)
      this.touchPosition = null
    }
    
    if (pointer.id === this.jumpPointerId) {
      this.jumpPointerId = -1
      this.jumpPressed = false
      // No visual effects on release
      console.log('🔄 Jump button released')
    }
    
    if (pointer.id === this.actionPointerId) {
      this.actionPointerId = -1
      this.actionPressed = false
      // No visual effects on release
    }
  }



  public update(): void {
    // Update jump just pressed state
    this.jumpJustPressed = this.jumpPressed && !this.lastJumpState
    this.lastJumpState = this.jumpPressed
    
    // Update action just pressed state
    this.actionJustPressed = this.actionPressed && !this.lastActionState
    this.lastActionState = this.actionPressed
  }

  public getHorizontal(): number {
    // Return continuous input value (-1 to 1) or fall back to discrete
    return this.horizontalInput || (this.leftPressed ? -1 : this.rightPressed ? 1 : 0)
  }

  public getVertical(): number {
    // Return continuous input value (-1 to 1) or fall back to discrete
    return this.verticalInput || (this.upPressed ? -1 : this.downPressed ? 1 : 0)
  }

  public getHorizontalInput(): number {
    // Get the raw continuous horizontal input (-1 to 1)
    return this.horizontalInput
  }

  public getVerticalInput(): number {
    // Get the raw continuous vertical input (-1 to 1)
    return this.verticalInput
  }

  public isJumpPressed(): boolean {
    return this.jumpPressed
  }

  public isJumpJustPressed(): boolean {
    return this.jumpJustPressed
  }

  public isActionPressed(): boolean {
    return this.actionPressed
  }

  public isActionJustPressed(): boolean {
    return this.actionJustPressed
  }

  public showActionButton(show: boolean): void {
    this.actionButton.setVisible(show)
  }
  
  // Disable touch controls (for menu, etc.)
  public disable(): void {
    this.enabled = false
    this.touchpadContainer.setVisible(false)
    this.jumpButton.setVisible(false)
    this.actionButton.setVisible(false)
    // Reset all states
    this.horizontalInput = 0
    this.verticalInput = 0
    this.leftPressed = false
    this.rightPressed = false
    this.upPressed = false
    this.downPressed = false
    this.jumpPressed = false
    this.jumpJustPressed = false
    this.actionPressed = false
    this.actionJustPressed = false
    this.touchpadPointerId = -1
    this.jumpPointerId = -1
    this.actionPointerId = -1
    this.touchpadIndicator.setVisible(false)
  }
  
  // Re-enable touch controls
  public enable(): void {
    this.enabled = true
    this.touchpadContainer.setVisible(true)
    this.jumpButton.setVisible(true)
    this.actionButton.setVisible(true)
  }

  private createDebugVisualization(): void {
    // Create debug graphics for hitboxes
    const debugGraphics = this.scene.add.graphics()
    debugGraphics.setDepth(1001) // Above touch controls
    debugGraphics.setScrollFactor(0)
    
    // Draw touchpad hitbox (circular, 110px radius)
    debugGraphics.lineStyle(2, 0x00ff00, 0.8) // Green for touchpad
    debugGraphics.strokeCircle(this.touchpadCenter.x, this.touchpadCenter.y, 110)
    
    // Draw jump button hitbox (fixed position with 175x200 hitbox)
    const jumpButtonX = 620  // Moved left 20px to X:620
    const jumpButtonLeft = jumpButtonX - 87.5  // 175px wide hitbox
    const jumpButtonRight = jumpButtonX + 87.5
    const actualCanvasHeight = this.scene.game.config.height as number
    const jumpButtonY = actualCanvasHeight - 120  // Moved down 100px (600 for 720px canvas)
    const hitboxTop = jumpButtonY - 100  // 200px tall hitbox
    const hitboxBottom = jumpButtonY + 100
    
    debugGraphics.lineStyle(2, 0xff0000, 0.8) // Red for jump
    debugGraphics.strokeRect(jumpButtonLeft, hitboxTop, 175, 200) // 175x200 hitbox
    
    // Draw action button hitbox (175x200 aligned with jump button)
    const actionButtonX = 445  // Moved right 25px to X:445
    const actionButtonLeft = actionButtonX - 87.5  // 175px wide hitbox
    const actionButtonRight = actionButtonX + 87.5
    const actionButtonY = actualCanvasHeight - 120  // Same Y as jump button
    const actionHitboxTop = actionButtonY - 100  // 200px tall hitbox
    const actionHitboxBottom = actionButtonY + 100
    
    debugGraphics.lineStyle(2, 0x0000ff, 0.8) // Blue for action
    debugGraphics.strokeRect(actionButtonLeft, actionHitboxTop, 175, 200) // 175x200 hitbox
    
    // Add labels
    const textStyle = { fontSize: '12px', color: '#ffffff', fontFamily: 'Arial' }
    
    this.scene.add.text(this.touchpadCenter.x, this.touchpadCenter.y - 120, 'TOUCHPAD\nHitbox: 110px\nVisual: 100px', {
      ...textStyle,
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5).setDepth(1002).setScrollFactor(0)
    
    this.scene.add.text(jumpButtonX, hitboxTop - 10, 'JUMP\n175x200px', {
      ...textStyle,
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5).setDepth(1002).setScrollFactor(0)
    
    this.scene.add.text(actionButtonX, actionHitboxTop - 10, 'ACTION\n175x200px', {
      ...textStyle,
      color: '#0000ff',
      align: 'center'
    }).setOrigin(0.5).setDepth(1002).setScrollFactor(0)
  }
  
  private createXAxisGrid(): void {
    // Create grid graphics for X-axis positioning
    const gridGraphics = this.scene.add.graphics()
    gridGraphics.setDepth(999) // Behind touch controls but above game
    gridGraphics.setScrollFactor(0)
    
    const canvasWidth = GameSettings.canvas.width
    const canvasHeight = GameSettings.canvas.height
    
    console.log('📐 Creating X-axis grid:', { canvasWidth, canvasHeight })
    
    // Draw vertical lines every 20px for X-axis
    for (let x = 0; x <= canvasWidth; x += 20) {
      // Main lines every 100px
      if (x % 100 === 0) {
        gridGraphics.lineStyle(2, 0xffff00, 0.5) // Yellow thick lines every 100px
        // Add X coordinate labels
        this.scene.add.text(x, 30, `X:${x}`, {
          fontSize: '14px',
          color: '#ffff00',
          fontFamily: 'Arial',
          backgroundColor: '#000000',
          padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(1003).setScrollFactor(0)
      } else if (x % 50 === 0) {
        gridGraphics.lineStyle(1, 0xffffff, 0.4) // White medium lines every 50px
      } else {
        gridGraphics.lineStyle(1, 0xffffff, 0.2) // Faint lines every 20px
      }
      
      gridGraphics.moveTo(x, 0)
      gridGraphics.lineTo(x, canvasHeight)
    }
    
    // Highlight key X positions for touch controls with thick cyan lines
    gridGraphics.lineStyle(3, 0x00ffff, 0.8) // Thick cyan for key positions
    
    // Touchpad center X (moved right 10px)
    gridGraphics.moveTo(120, 0)
    gridGraphics.lineTo(120, canvasHeight)
    this.scene.add.text(120, 60, 'TOUCHPAD\nX:120', {
      fontSize: '12px',
      color: '#00ffff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
      align: 'center'
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0)
    
    // Jump button X (fixed position)
    const jumpX = 620  // Moved left 20px to X:620
    gridGraphics.moveTo(jumpX, 0)
    gridGraphics.lineTo(jumpX, canvasHeight)
    this.scene.add.text(jumpX, 60, `JUMP\nX:${jumpX}`, {
      fontSize: '12px',
      color: '#00ffff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
      align: 'center'
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0)
    
    // Action button X (moved right 25px)
    const actionX = 445  // Moved right 25px to X:445
    gridGraphics.moveTo(actionX, 0)
    gridGraphics.lineTo(actionX, canvasHeight)
    this.scene.add.text(actionX, 90, `ACTION\nX:${actionX}`, {
      fontSize: '12px',
      color: '#00ffff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
      align: 'center'
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0)
    
    // Add canvas width indicator
    this.scene.add.text(canvasWidth / 2, 10, `Canvas Width: ${canvasWidth}px`, {
      fontSize: '16px',
      color: '#ff00ff',
      fontFamily: 'Arial',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0)
  }

  public destroy(): void {
    this.touchpadContainer.destroy()
    this.jumpButton.destroy()
    this.actionButton.destroy()
  }
}