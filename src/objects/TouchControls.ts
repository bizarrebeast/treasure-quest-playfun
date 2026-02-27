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
  private touchpadRadius: number = 75  // Changed from 60 to 75 for 150px visual diameter
  private deadZone: number = 5 // Smaller dead zone for more responsive touch

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    // Adjust touchpad position for new canvas size (480x720 instead of 450x800)
    this.touchpadCenter = { x: 110, y: GameSettings.canvas.height - 120 } // y: 600 for 720 height
    
    // Detect if on mobile device
    this.detectMobileDevice()
    
    this.createTouchpad()
    this.createJumpButton()
    this.createActionButton()
    this.setupInputHandlers()
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
    
    console.log('Mobile device detection:', {
      isTouchDevice,
      isMobileUA,
      isSmallScreen,
      isMobileDevice: this.isMobileDevice
    })
  }

  private createTouchpad(): void {
    // Create touchpad container
    this.touchpadContainer = this.scene.add.container(this.touchpadCenter.x, this.touchpadCenter.y)
    this.touchpadContainer.setDepth(1000)
    this.touchpadContainer.setScrollFactor(0)

    // Create custom D-pad background image
    this.touchpadBackground = this.scene.add.image(0, 0, 'custom-dpad')
    this.touchpadBackground.setDisplaySize(this.touchpadRadius * 2, this.touchpadRadius * 2) // 150px diameter
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
    const buttonX = GameSettings.canvas.width - 60  // x: 420 for width 480
    const buttonY = GameSettings.canvas.height - 120 // y: 600 for height 720
    
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
    const buttonX = GameSettings.canvas.width - 175 // x: 305 for width 480
    const buttonY = GameSettings.canvas.height - 120 // y: 600 for height 720
    
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
    if (!this.isMobileDevice) return  // Only work on mobile devices
    
    const touchX = pointer.x
    const touchY = pointer.y
    
    // Check if touch is on touchpad area (hitbox is 92.5px radius = 185px diameter)
    const touchpadDist = Math.sqrt(
      Math.pow(touchX - this.touchpadCenter.x, 2) + 
      Math.pow(touchY - this.touchpadCenter.y, 2)
    )
    
    if (touchpadDist <= 92.5 && this.touchpadPointerId === -1) {
      this.touchpadPointerId = pointer.id
      // Immediately update position on initial touch for instant response
      this.updateTouchpadFromPosition(touchX, touchY)
      this.touchpadIndicator.setVisible(true)
      // Force an immediate update to ensure direction is registered
      this.forceUpdate()
      return
    }
    
    // Check if touch is on jump button area (rectangle: 100px wide, extends from y:470 to bottom)
    const jumpButtonX = GameSettings.canvas.width - 60  // x: 420 for width 480
    const jumpButtonLeft = jumpButtonX - 50  // 50px to the left of center
    const jumpButtonRight = jumpButtonX + 50  // 50px to the right of center
    const hitboxTop = GameSettings.canvas.height - 250  // Adjusted for new height (720 - 250 = 470)
    const hitboxBottom = GameSettings.canvas.height  // Goes all the way to bottom
    
    if (touchX >= jumpButtonLeft && touchX <= jumpButtonRight && 
        touchY >= hitboxTop && touchY <= hitboxBottom) { // Within the rectangle
      if (this.jumpPointerId === -1) {
        this.jumpPointerId = pointer.id
        this.jumpPressed = true
        this.jumpButtonImage.setTint(0xaaaaaa) // Slightly dimmed when pressed
      }
      return
    }
    
    // Check if touch is on action button area (only if visible)
    if (this.actionButton.visible) {
      const actionButtonX = GameSettings.canvas.width - 175  // x: 305 for width 480
      const actionButtonLeft = actionButtonX - 55  // 55px to the left of center
      const actionButtonRight = actionButtonX + 55  // 55px to the right of center
      const hitboxTop = GameSettings.canvas.height - 250  // Adjusted for new height (720 - 250 = 470)
      const hitboxBottom = GameSettings.canvas.height  // Goes all the way to bottom
      
      if (touchX >= actionButtonLeft && touchX <= actionButtonRight && 
          touchY >= hitboxTop && touchY <= hitboxBottom) { // Within the rectangle
        if (this.actionPointerId === -1) {
          this.actionPointerId = pointer.id
          this.actionPressed = true
          this.actionButtonImage.setTint(0xaaaaaa) // Slightly dimmed when pressed
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
      this.jumpButtonImage.clearTint() // Return to normal color when released
    }
    
    if (pointer.id === this.actionPointerId) {
      this.actionPointerId = -1
      this.actionPressed = false
      this.actionButtonImage.clearTint() // Return to normal color when released
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

  public destroy(): void {
    this.touchpadContainer.destroy()
    this.jumpButton.destroy()
    this.actionButton.destroy()
  }
}