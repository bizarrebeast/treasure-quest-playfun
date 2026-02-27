import { GameScene } from '../scenes/GameScene'
import GameSettings from '../config/GameSettings'

export class MenuOverlay {
  private scene: GameScene
  private container: Phaser.GameObjects.Container
  private isOpen: boolean = false
  
  // Audio settings (separate from SDK mute)
  private soundEffectsEnabled: boolean = true
  private musicEnabled: boolean = true
  
  // UI elements
  private backgroundOverlay: Phaser.GameObjects.Rectangle
  private menuPanel: Phaser.GameObjects.Graphics
  private soundToggle: Phaser.GameObjects.Container | null = null
  private musicToggle: Phaser.GameObjects.Container | null = null
  private instructionsOverlay: Phaser.GameObjects.Container | null = null
  
  constructor(scene: GameScene) {
    this.scene = scene
    this.loadSettings()
    this.create()
  }
  
  private create(): void {
    // Get camera dimensions for proper centering
    const camera = this.scene.cameras.main
    const centerX = camera.width / 2
    const centerY = camera.height / 2
    
    // Main container for entire menu - positioned at camera center
    this.container = this.scene.add.container(centerX, centerY)
    this.container.setDepth(5000)  // Very high depth to ensure it's above EVERYTHING
    // Make the container fixed to camera so it doesn't move with the game world
    this.container.setScrollFactor(0, 0)
    
    // Semi-transparent background overlay - covers entire camera view
    this.backgroundOverlay = this.scene.add.rectangle(
      0, 0,
      camera.width * 2, // Make it extra wide to ensure full coverage
      camera.height * 2, // Make it extra tall to ensure full coverage
      0x000000, 0.7
    )
    // DO NOT make the background interactive - it blocks menu buttons!
    // The menu panel and game pause is enough to block game interaction
    
    // Main menu panel - positioned at center relative to container
    this.menuPanel = this.createMenuPanel()
    
    // Title
    const title = this.scene.add.text(0, -200, 'GAME MENU', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700', // Keep gold for title
      align: 'center'
    })
    title.setOrigin(0.5)
    
    // Instructions button
    const instructionsBtn = this.createButton(
      0, -140, 
      'VIEW INSTRUCTIONS',
      () => this.openInstructionsScene(),
      0x4a148c // Purple
    )
    
    // Divider line
    const divider1 = this.createDivider(-100)
    
    // TEMPORARILY DISABLED - Sound and music toggles
    // this.soundToggle = this.createToggleSwitch(
    //   'Sound\nEffects',
    //   -60,
    //   this.soundEffectsEnabled,
    //   (enabled) => this.setSoundEffects(enabled)
    // )
    
    // // Music toggle
    // this.musicToggle = this.createToggleSwitch(
    //   'Music',
    //   -10,
    //   this.musicEnabled,
    //   (enabled) => this.setMusic(enabled)
    // )
    
    // Divider line (moved up from 30 to -30 to close the gap)
    const divider2 = this.createDivider(-30)
    
    // BizarreBeasts info (moved up from 60 to 0)
    const bizarreInfo = this.createBizarreInfo(0)
    
    // Divider line (moved up from 170 to 110)
    const divider3 = this.createDivider(110)
    
    // Resume button (moved up from 210 to 150)
    const resumeBtn = this.createButton(
      0, 150,
      'RESUME GAME',
      () => this.close(),
      0x32CD32 // Keep green for resume
    )
    resumeBtn.setName('resumeButton')
    
    // Add all elements to container
    // IMPORTANT: Add background FIRST so it's behind everything
    // Then add menu panel and interactive elements on top
    this.container.add([
      this.backgroundOverlay,  // Background first (lowest depth)
      this.menuPanel,          // Panel on top of background
      title,                   // Then all UI elements on top
      instructionsBtn,
      divider1,
      // this.soundToggle,  // DISABLED
      // this.musicToggle,  // DISABLED
      divider2,
      bizarreInfo,
      divider3,
      resumeBtn
    ])
    
    // Move background to back to ensure it doesn't block menu interactions
    this.container.sendToBack(this.backgroundOverlay)
    
    // Don't set scroll factor on children - the container already handles this
    // Setting it twice can cause hit detection misalignment
    
    // Initially hidden
    this.container.setVisible(false)
  }
  
  
  private createMenuPanel(): Phaser.GameObjects.Graphics {
    const panel = this.scene.add.graphics()
    
    // Draw purple panel with border - centered relative to container
    const panelWidth = Math.min(400, this.scene.cameras.main.width - 40)
    const panelHeight = Math.min(500, this.scene.cameras.main.height - 40)
    const panelX = -panelWidth / 2
    const panelY = -panelHeight / 2
    
    
    // Purple background with gold border
    panel.fillStyle(0x4a148c, 0.95) // Purple background
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 15)
    
    panel.lineStyle(3, 0xFFD700) // Gold border
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 15)
    
    return panel
  }
  
  private createButton(
    x: number, 
    y: number, 
    text: string, 
    onClick: () => void,
    color: number = 0x4a148c
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    // Use a rectangle game object instead of graphics for better hit detection
    const buttonWidth = 340
    const buttonHeight = 50
    
    // Create visual background rectangle
    const bgRect = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, color, 0.8)
    bgRect.setStrokeStyle(2, 0xFFD700)
    
    // Button text
    const btnText = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700' // Yellow text
    })
    btnText.setOrigin(0.5)
    
    // IMPORTANT: Set depth for button elements to ensure they're on top
    bgRect.setDepth(10)
    btnText.setDepth(11)
    
    container.add([bgRect, btnText])
    
    // Make the rectangle interactive (it will use its own bounds)
    bgRect.setInteractive({ useHandCursor: true })
    
    // Try setting the input to top
    if (bgRect.input) {
      this.scene.input.setTopOnly(false)  // Allow all objects to receive input
    }
    
    // HOVER EFFECTS DISABLED - Due to offset issues with camera scroll
    // bgRect.on('pointerover', () => {
    //   bgRect.setFillStyle(0x20B2AA, 0.9)
    // })
    
    // bgRect.on('pointerout', () => {
    //   bgRect.setFillStyle(color, 0.8)
    // })
    
    bgRect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      onClick()
    })
    
    // Remove the container fallback interaction - it might be causing conflicts
    
    return container
  }
  
  private createToggleSwitch(
    label: string,
    y: number,
    initialState: boolean,
    onChange: (enabled: boolean) => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y)
    
    // Label text (supports multi-line)
    const labelText = this.scene.add.text(-90, 0, label, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700', // Yellow text
      align: 'left',
      lineSpacing: 5
    })
    labelText.setOrigin(0, 0.5)
    
    // Toggle track positioning
    const trackX = 80
    const trackWidth = 60
    const trackHeight = 30
    
    // Use a Rectangle game object for better hit detection
    const trackHitArea = this.scene.add.rectangle(
      trackX, 0, trackWidth, trackHeight, 0x000000, 0
    )
    trackHitArea.setInteractive({ useHandCursor: true })
    
    // Visual track (graphics)
    const track = this.scene.add.graphics()
    
    const updateTrackColor = (enabled: boolean) => {
      track.clear()
      track.fillStyle(enabled ? 0x32CD32 : 0xFF6B6B, 1)
      track.fillRoundedRect(trackX - trackWidth/2, -trackHeight/2, trackWidth, trackHeight, 15)
      track.lineStyle(2, 0xFFD700) // Gold border
      track.strokeRoundedRect(trackX - trackWidth/2, -trackHeight/2, trackWidth, trackHeight, 15)
    }
    
    updateTrackColor(initialState)
    
    // Toggle knob
    const knobX = initialState ? trackX + 15 : trackX - 15
    const knob = this.scene.add.circle(knobX, 0, 13, 0xFFFFFF)
    knob.setStrokeStyle(2, 0xFFD700) // Gold border
    
    // Add elements in proper order (hit area last so it's on top for input)
    container.add([labelText, track, knob, trackHitArea])
    
    let currentState = initialState
    
    // Use the rectangle hit area for interaction
    trackHitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer && pointer.event) {
        pointer.event.stopPropagation()
      }
      currentState = !currentState
      
      // Animate knob
      this.scene.tweens.add({
        targets: knob,
        x: currentState ? trackX + 15 : trackX - 15,
        duration: 200,
        ease: 'Power2'
      })
      
      // Update colors
      updateTrackColor(currentState)
      
      // Callback
      onChange(currentState)
    })
    
    // Add hover effect
    trackHitArea.on('pointerover', () => {
      track.clear()
      track.fillStyle(currentState ? 0x32CD32 : 0xFF6B6B, 0.8)
      track.fillRoundedRect(trackX - trackWidth/2, -trackHeight/2, trackWidth, trackHeight, 15)
      track.lineStyle(3, 0xFFD700) // Thicker border on hover
      track.strokeRoundedRect(trackX - trackWidth/2, -trackHeight/2, trackWidth, trackHeight, 15)
    })
    
    trackHitArea.on('pointerout', () => {
      updateTrackColor(currentState)
    })
    
    // Store current state in container data
    container.setData('enabled', currentState)
    container.setData('updateState', (enabled: boolean) => {
      currentState = enabled
      knob.x = enabled ? trackX + 15 : trackX - 15
      updateTrackColor(enabled)
    })
    
    return container
  }
  
  private createDivider(y: number): Phaser.GameObjects.Graphics {
    const divider = this.scene.add.graphics()
    divider.lineStyle(1, 0xFFD700, 0.3) // Gold divider
    divider.moveTo(-150, y)
    divider.lineTo(150, y)
    divider.strokePath()
    return divider
  }
  
  private createBizarreInfo(y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y)
    
    // Project name
    const projectName = this.scene.add.text(0, 0, 'BizarreBeasts ($BB)', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700' // Yellow text
    })
    projectName.setOrigin(0.5)
    
    // Contract address - now 20% smaller than before
    const contractLabel = this.scene.add.text(0, 25, 'CA:', {
      fontSize: '8px',  // Reduced by 20% from 10px
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700'
    })
    contractLabel.setOrigin(0.5)
    
    // Address with same font size as CA: label
    const contractAddress = this.scene.add.text(0, 45, 
      '0x0520bf1d3cEE163407aDA79109333aB1599b4004', {
      fontSize: '8px',  // Reduced by 20% from 10px
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700',
      wordWrap: { width: 380 }
    })
    contractAddress.setOrigin(0.5)
    
    // Creator info
    const creatorText = this.scene.add.text(0, 70, 'Created by @bizarrebeast', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700'
    })
    creatorText.setOrigin(0.5)
    
    // Join info
    const joinText = this.scene.add.text(0, 95, 'Join /bizarrebeasts', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700'
    })
    joinText.setOrigin(0.5)
    
    container.add([projectName, contractLabel, contractAddress, creatorText, joinText])
    
    return container
  }
  
  private createSDKIndicator(y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y)
    
    // Check SDK mute status
    const sdkMuted = this.scene.game.sound.mute
    
    const text = this.scene.add.text(0, 0,
      `SDK Global: ${sdkMuted ? 'MUTED' : 'ACTIVE'}`,
      {
        fontSize: '11px',
        fontFamily: '"Press Start 2P", system-ui',
        color: sdkMuted ? '#FF6B6B' : '#AAAAAA'
      }
    )
    text.setOrigin(0.5)
    
    // Info text below
    const info = this.scene.add.text(0, 20, 
      '(Controlled by platform)',
      {
        fontSize: '8px',
        fontFamily: '"Press Start 2P", system-ui',
        color: '#777777'
      }
    )
    info.setOrigin(0.5)
    
    container.add([text, info])
    
    // Store reference to update later
    container.setData('updateStatus', () => {
      const muted = this.scene.game.sound.mute
      text.setText(`SDK Global: ${muted ? 'MUTED' : 'ACTIVE'}`)
      text.setColor(muted ? '#FF6B6B' : '#AAAAAA')
    })
    
    return container
  }
  
  private setSoundEffects(enabled: boolean): void {
    this.soundEffectsEnabled = enabled
    this.scene.registry.set('sfxEnabled', enabled)
    this.saveSettings()
    
    // Don't modify volume here - let the playSoundEffect method handle it
    // The SDK mute is handled by Phaser's sound system internally
    
    // Update the toggle UI if it exists
    if (this.soundToggle) {
      const updateState = this.soundToggle.getData('updateState')
      if (updateState) {
        updateState(enabled)
      }
    }
  }
  
  private setMusic(enabled: boolean): void {
    this.musicEnabled = enabled
    this.scene.registry.set('musicEnabled', enabled)
    this.saveSettings()
    
    // Update background music volume directly based on the enabled state
    // The SDK mute is handled by Phaser's sound system internally
    if (this.scene.backgroundMusic) {
      this.scene.backgroundMusic.setVolume(enabled ? 0.3 : 0)
    }
    
    // Update the toggle UI if it exists
    if (this.musicToggle) {
      const updateState = this.musicToggle.getData('updateState')
      if (updateState) {
        updateState(enabled)
      }
    }
  }
  
  private loadSettings(): void {
    // Settings loading disabled for sandbox compatibility
    // Settings reset each session
    this.soundEffectsEnabled = true
    this.musicEnabled = true

    // Apply default settings
    this.scene.registry.set('sfxEnabled', this.soundEffectsEnabled)
    this.scene.registry.set('musicEnabled', this.musicEnabled)
  }
  
  private saveSettings(): void {
    // Settings saving disabled for sandbox compatibility
    // Settings only persist for current session
  }
  
  open(): void {
    if (this.isOpen) {
      return
    }
    
    this.isOpen = true
    this.container.setVisible(true)
    
    // Play menu open sound if sound effects are enabled
    if (this.soundEffectsEnabled) {
      this.scene.sound.play('menu-toggle', { volume: 0.5 })
    }
    
    // Debug visualization removed - buttons are working
    
    // Update SDK indicator
    const indicators = this.container.list.filter(obj => 
      obj instanceof Phaser.GameObjects.Container && obj.getData('updateStatus')
    )
    indicators.forEach(indicator => {
      const updateFn = indicator.getData('updateStatus')
      if (updateFn) updateFn()
    })
    
    // IMPORTANT: Pause game AFTER setting up menu to ensure input isn't disabled
    this.pauseGame()
    
    // Make sure the menu's input is enabled
    this.scene.input.enabled = true
    
    // Don't make the container interactive - it's blocking the buttons
    // Instead, manually enable each interactive child
    this.enableNestedInteractivity(this.container)
    
    // Add input listener with manual hit testing for buttons
    const pointerHandler = (pointer: Phaser.Input.Pointer) => {
      // Try manual hit testing for buttons
      this.manualHitTest(pointer)
    }
    
    // Remove any existing listener and add new one
    this.scene.input.off('pointerdown', pointerHandler)
    this.scene.input.on('pointerdown', pointerHandler)
    
    // Store the listener reference for cleanup
    this.container.setData('pointerListener', pointerHandler)
    
    // Bring container to top for input
    this.scene.children.bringToTop(this.container)
    
    // Force input system to update its interaction list
    this.scene.input.setTopOnly(false)
    
    // Just set it visible directly - the fade animation seems to break it
    this.container.setAlpha(1)
  }
  
  private enableNestedInteractivity(container: Phaser.GameObjects.Container): void {
    container.list.forEach((child: any) => {
      if (child instanceof Phaser.GameObjects.Rectangle) {
        // Re-enable interactivity on rectangles
        if (!child.input) {
          child.setInteractive({ useHandCursor: true })
        }
        this.scene.input.enable(child)
      } else if (child instanceof Phaser.GameObjects.Container) {
        // Recursively enable for nested containers
        this.enableNestedInteractivity(child)
      }
    })
  }
  
  private manualHitTest(pointer: Phaser.Input.Pointer): void {
    // Get the main container's world position
    const containerX = this.container.x
    const containerY = this.container.y
    
    // Check resume button manually - button is at Y=150 relative to container
    // Container is at Y=400, so button is at world Y=550
    const resumeBtnX = containerX + 0
    const resumeBtnY = containerY + 150  // Back to correct position
    if (Math.abs(pointer.x - resumeBtnX) < 170 && Math.abs(pointer.y - resumeBtnY) < 25) {
      this.close()
    }
    
    // Check instructions button manually  
    const instrBtnX = containerX + 0
    const instrBtnY = containerY + (-140)
    if (Math.abs(pointer.x - instrBtnX) < 170 && Math.abs(pointer.y - instrBtnY) < 25) {
      this.openInstructionsScene()
    }
    
    // Check sound toggle manually (re-enabled)
    const soundToggleX = containerX + 80
    const soundToggleY = containerY + (-60)
    if (Math.abs(pointer.x - soundToggleX) < 30 && Math.abs(pointer.y - soundToggleY) < 15) {
      this.setSoundEffects(!this.soundEffectsEnabled)
    }
    
    // Check music toggle manually (re-enabled)
    const musicToggleX = containerX + 80
    const musicToggleY = containerY + (-10)
    if (Math.abs(pointer.x - musicToggleX) < 30 && Math.abs(pointer.y - musicToggleY) < 15) {
      this.setMusic(!this.musicEnabled)
    }
  }
  
  private addDebugVisualization(): void {
    // Remove any existing debug container
    const existingDebug = this.container.getByName('debugContainer')
    if (existingDebug) {
      existingDebug.destroy()
    }
    
    // Create debug container
    const debugContainer = this.scene.add.container(0, 0)
    debugContainer.setName('debugContainer')
    
    // Add semi-transparent boxes to show expected hover zones
    const graphics = this.scene.add.graphics()
    
    // Find the actual resume button to show its REAL position
    const resumeButton = this.container.getByName('resumeButton') as Phaser.GameObjects.Container
    if (resumeButton) {
      // Show the actual button position with a thick purple box
      graphics.lineStyle(4, 0xff00ff, 1)
      graphics.strokeRect(resumeButton.x - 170, resumeButton.y - 25, 340, 50)
      
      const actualPosLabel = this.scene.add.text(resumeButton.x, resumeButton.y - 40, 
        `ACTUAL Button Pos: (${resumeButton.x}, ${resumeButton.y})`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#ff00ff',
        backgroundColor: '#000000',
        padding: { x: 2, y: 2 }
      })
      actualPosLabel.setOrigin(0.5)
      debugContainer.add(actualPosLabel)
    }
    
    // Resume button expected hover zone (where it SHOULD be based on creation)
    graphics.lineStyle(2, 0x00ff00, 0.5)
    graphics.strokeRect(-170, 150 - 25, 340, 50)
    
    // Instructions button expected hover zone
    graphics.lineStyle(2, 0x0000ff, 0.5)
    graphics.strokeRect(-170, -140 - 25, 340, 50)
    
    // Add text labels
    const resumeLabel = this.scene.add.text(0, 150 - 40, 'Created at Y=150', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#00ff00'
    })
    resumeLabel.setOrigin(0.5)
    
    const instrLabel = this.scene.add.text(0, -140 - 40, 'Instructions Zone', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#0000ff'
    })
    instrLabel.setOrigin(0.5)
    
    // Add cursor tracking text
    const cursorText = this.scene.add.text(-210, -380, '', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 }
    })
    cursorText.setName('cursorText')
    
    // Add actual manual hit test zone visualization
    const actualZoneGraphics = this.scene.add.graphics()
    actualZoneGraphics.lineStyle(2, 0xff0000, 0.8)
    // This shows where manualHitTest currently checks for Resume button
    const containerX = this.container.x
    const containerY = this.container.y
    const resumeBtnX = 0  // Relative to container
    const resumeBtnY = 150  // Correct position where button actually is
    actualZoneGraphics.strokeRect(resumeBtnX - 170, resumeBtnY - 25, 340, 50)
    
    const actualLabel = this.scene.add.text(0, 150 + 40, 'Manual Hit Test Y=150 (Fixed)', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ff0000'
    })
    actualLabel.setOrigin(0.5)
    
    // Add all to debug container
    debugContainer.add([graphics, actualZoneGraphics, resumeLabel, instrLabel, actualLabel, cursorText])
    this.container.add(debugContainer)
  }
  
  private updateCursorTracking(pointer: Phaser.Input.Pointer): void {
    const debugContainer = this.container.getByName('debugContainer') as Phaser.GameObjects.Container
    if (!debugContainer) return
    
    const cursorText = debugContainer.getByName('cursorText') as Phaser.GameObjects.Text
    if (!cursorText) return
    
    const camera = this.scene.cameras.main
    const containerX = this.container.x
    const containerY = this.container.y
    const relativeX = pointer.x - containerX
    const relativeY = pointer.y - containerY
    
    // Check if cursor is in resume button zone according to manual hit test
    const resumeBtnX = containerX + 0
    const resumeBtnY = containerY + 150  // Back to correct position
    const inManualResumeZone = Math.abs(pointer.x - resumeBtnX) < 170 && Math.abs(pointer.y - resumeBtnY) < 25
    
    // Find the actual resume button and its interactive rectangle
    const resumeButton = this.container.getByName('resumeButton') as Phaser.GameObjects.Container
    let buttonInfo = 'Button not found'
    let rectInfo = 'Rect not found'
    
    if (resumeButton) {
      const btnX = resumeButton.x
      const btnY = resumeButton.y
      buttonInfo = `Button container: (${btnX}, ${btnY})`
      
      // Find the rectangle inside the button container
      const rect = resumeButton.list[0] as Phaser.GameObjects.Rectangle
      if (rect) {
        const rectWorldX = containerX + btnX + rect.x
        const rectWorldY = containerY + btnY + rect.y
        rectInfo = `Rect world: (${Math.round(rectWorldX)}, ${Math.round(rectWorldY)})`
        
        // Check if we're actually hovering over this rectangle
        const inRectBounds = pointer.x >= rectWorldX - 170 && 
                           pointer.x <= rectWorldX + 170 &&
                           pointer.y >= rectWorldY - 25 &&
                           pointer.y <= rectWorldY + 25
        rectInfo += inRectBounds ? ' HOVERING!' : ''
      }
    }
    
    // The real issue: camera scroll position affects visual rendering but not input
    const cameraY = camera.scrollY
    const visualButtonY = containerY + 150 - cameraY  // Where button appears visually
    
    cursorText.setText([
      `Cursor: (${Math.round(pointer.x)}, ${Math.round(pointer.y)})`,
      `Container: (${Math.round(containerX)}, ${Math.round(containerY)})`,
      `Camera ScrollY: ${Math.round(cameraY)}`,
      `Button Logic Y: ${containerY + 150} (= 550)`,
      `Button Visual Y: ${Math.round(visualButtonY)}`,
      `Manual Hit: ${inManualResumeZone ? 'YES' : 'NO'}`,
      `${buttonInfo}`,
      `${rectInfo}`
    ])
  }
  
  close(): void {
    if (!this.isOpen) {
      return
    }
    
    // Play menu close sound if sound effects are enabled
    if (this.soundEffectsEnabled) {
      this.scene.sound.play('menu-toggle', { volume: 0.3 })
    }
    
    // Set flag immediately
    this.isOpen = false
    
    // Remove pointer listener if it exists
    const pointerListener = this.container.getData('pointerListener')
    if (pointerListener) {
      this.scene.input.off('pointerdown', pointerListener)
      this.container.setData('pointerListener', null)
    }
    
    // Hide the container immediately
    this.container.setVisible(false)
    this.container.setAlpha(1) // Reset alpha for next open
    
    // Resume game immediately
    this.resumeGame()
  }
  
  // Debug method removed - no longer needed
  
  private pauseGame(): void {
    // IMPORTANT: Disable touch controls FIRST so they don't interfere with menu
    if (this.scene.touchControls) {
      this.scene.touchControls.disable()
    }
    
    // Pause physics
    this.scene.physics.pause()
    
    // Pause all animations
    this.scene.anims.pauseAll()
    
    // DON'T pause timers - it might affect menu input
    // this.scene.time.paused = true
    
    // Pause all tweens in the scene EXCEPT menu tweens
    // this.scene.tweens.pauseAll()
    
    // Set pause flag
    this.scene.registry.set('isPaused', true)
    
    // Ensure input remains active for menu
    this.scene.input.enabled = true
  }
  
  private resumeGame(): void {
    // Resume physics
    this.scene.physics.resume()
    
    // Resume animations
    this.scene.anims.resumeAll()
    
    // Resume timers
    this.scene.time.paused = false
    
    // Resume all tweens
    this.scene.tweens.resumeAll()
    
    // Clear pause flag
    this.scene.registry.set('isPaused', false)
    
    // IMPORTANT: Re-enable touch controls after menu closes
    if (this.scene.touchControls) {
      this.scene.touchControls.enable()
    }
  }
  
  private showInstructions(): void {
    // Create instructions overlay if it doesn't exist
    if (!this.instructionsOverlay) {
      this.createInstructionsOverlay()
    }
    
    this.instructionsOverlay?.setVisible(true)
    
    // Fade in
    this.instructionsOverlay?.setAlpha(0)
    this.scene.tweens.add({
      targets: this.instructionsOverlay,
      alpha: 1,
      duration: 200
    })
  }
  
  private createInstructionsOverlay(): void {
    // Create container for instructions
    this.instructionsOverlay = this.scene.add.container(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2
    )
    this.instructionsOverlay.setDepth(2000) // Above menu
    
    // Dark background
    const bg = this.scene.add.rectangle(
      0, 0,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000, 0.9
    )
    bg.setInteractive()
    
    // Instructions panel
    const panel = this.scene.add.graphics()
    panel.fillStyle(0x008080, 0.95)
    panel.fillRoundedRect(-300, -250, 600, 500, 15)
    panel.lineStyle(3, 0x20B2AA)
    panel.strokeRoundedRect(-300, -250, 600, 500, 15)
    
    // Title
    const title = this.scene.add.text(0, -210, 'INSTRUCTIONS', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFD700'
    })
    title.setOrigin(0.5)
    
    // Instructions content (simplified version)
    const instructions = [
      'CONTROLS:',
      '',
      'Move: WASD or Arrow Keys',
      'Jump: Space or E',
      'Climb: Up/Down on ladders',
      'Throw: Q, V, or M',
      '',
      'OBJECTIVE:',
      '',
      'Collect coins and gems',
      'Avoid or defeat enemies',
      'Reach the door to advance',
      '',
      'Press ESC to open this menu'
    ]
    
    const content = this.scene.add.text(0, -100, instructions.join('\n'), {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", system-ui',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 8
    })
    content.setOrigin(0.5)
    
    // Close button
    const closeBtn = this.createButton(
      0, 210,
      'CLOSE',
      () => this.hideInstructions(),
      0xFF6B6B
    )
    
    this.instructionsOverlay.add([bg, panel, title, content, closeBtn])
    this.instructionsOverlay.setVisible(false)
  }
  
  private hideInstructions(): void {
    this.scene.tweens.add({
      targets: this.instructionsOverlay,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.instructionsOverlay?.setVisible(false)
      }
    })
  }
  
  private openInstructionsScene(): void {
    
    // Keep menu state but hide it
    this.container.setVisible(false)
    // Don't change isOpen flag - we're still conceptually in the menu
    
    // Sleep the game scene (preserves state better than pause)
    this.scene.scene.sleep('GameScene')
    
    // Launch instructions as an overlay scene
    this.scene.scene.launch('InstructionsScene', { 
      returnScene: 'GameScene',
      fromMenu: true,  // This tells InstructionsScene to show "Close" instead of "Skip All"
      reopenMenu: true // This tells it to reopen the menu when closing
    })
  }
  
  // Debug method removed - no longer needed
  
  getIsOpen(): boolean {
    return this.isOpen
  }
  
  toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }
}