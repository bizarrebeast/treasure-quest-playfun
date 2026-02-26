export class Door extends Phaser.Physics.Arcade.Sprite {
  private promptText: Phaser.GameObjects.Text | null = null
  private playerNearby: boolean = false
  private isFirstLevel: boolean
  
  constructor(scene: Phaser.Scene, x: number, y: number, isFirstLevel: boolean = false) {
    // Door constructor
    
    // Use the preloaded door sprite (moved up 9 pixels total)
    super(scene, x, y - 9, 'door-sprite')
    
    this.isFirstLevel = isFirstLevel
    
    // Add to scene
    scene.add.existing(this)
    scene.physics.add.existing(this, true) // Static body
    
    // Set up the door appearance - keep existing size for now
    this.setDisplaySize(100, 120) // Match the current game size expectations
    
    // Set physics body
    const body = this.body as Phaser.Physics.Arcade.StaticBody
    body.setSize(80, 100) // Collision area
    body.setOffset(-40, -50)  // Center the hitbox
    
    // Add debug visualization for door positioning
    // this.createDebugVisualization()  // Commented out - debugging complete
    
    // Set depth
    this.setDepth(10)
  }
  
  // createDoorVisual method removed - now using sprite image
  
  showPrompt(player: Phaser.Physics.Arcade.Sprite): void {
    this.playerNearby = true
    
    if (!this.promptText) {
      // Show simple prompt for all levels including first level
      this.promptText = this.scene.add.text(
        this.x,
        this.y - 70,  // Position above door
        'Press UP to enter',
        {
          fontSize: '16px',
          color: '#ffff00',  // Yellow text
          stroke: '#000000',  // Black stroke for visibility
          strokeThickness: 2
        }
      ).setOrigin(0.5).setDepth(100)
    }
  }
  
  private createInstructionPopup(): void {
    const centerX = this.scene.cameras.main.width / 2
    const centerY = this.scene.cameras.main.height / 2
    
    // Create popup background
    const popup = this.scene.add.rectangle(
      centerX,
      centerY,
      300,
      150,
      0x2c2c2c,
      0.95
    ).setDepth(200)
    
    // Add border
    const border = this.scene.add.rectangle(
      centerX,
      centerY,
      304,
      154,
      0xffffff
    ).setDepth(199)
    border.setStrokeStyle(2, 0xffffff)
    border.setFillStyle()
    
    // Add instruction text
    this.promptText = this.scene.add.text(
      centerX,
      centerY - 20,
      'Level Complete!',
      {
        fontSize: '18px',
        color: '#44ff44',
        fontFamily: '\"Press Start 2P\", system-ui',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(201)
    
    const instructionText = this.scene.add.text(
      centerX,
      centerY + 15,
      'Press UP to enter the door\nand advance to the next level',
      {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: '\"Press Start 2P\", system-ui',
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(201)
    
    // Store references to destroy later
    this.promptText.setData('popup', popup)
    this.promptText.setData('border', border)
    this.promptText.setData('instruction', instructionText)
  }
  
  hidePrompt(): void {
    this.playerNearby = false
    
    if (this.promptText) {
      // Destroy popup elements if they exist
      const popup = this.promptText.getData('popup')
      const border = this.promptText.getData('border')
      const instruction = this.promptText.getData('instruction')
      
      if (popup) popup.destroy()
      if (border) border.destroy()
      if (instruction) instruction.destroy()
      
      this.promptText.destroy()
      this.promptText = null
    }
  }
  
  private createDebugVisualization(): void {
    const debugGraphics = this.scene.add.graphics()
    
    // Draw door center point (red dot)
    debugGraphics.fillStyle(0xff0000, 1)
    debugGraphics.fillCircle(this.x, this.y, 5)
    
    // Draw door bounds (green rectangle - visual size)
    debugGraphics.lineStyle(3, 0x00ff00, 1)
    debugGraphics.strokeRect(this.x - 40, this.y - 50, 80, 100) // Visual door bounds
    
    // Draw physics body bounds (blue rectangle - hitbox)
    debugGraphics.lineStyle(3, 0x0000ff, 1)
    const body = this.body as Phaser.Physics.Arcade.StaticBody
    debugGraphics.strokeRect(body.x, body.y, body.width, body.height)
    
    // Draw floor reference line (yellow horizontal line where door bottom should sit)
    debugGraphics.lineStyle(2, 0xffff00, 1)
    const doorBottomY = this.y + 50 // Where the bottom of the door currently is
    debugGraphics.lineBetween(this.x - 60, doorBottomY, this.x + 60, doorBottomY)
    
    // Draw platform reference (orange line where platform surface should be)
    debugGraphics.lineStyle(2, 0xff8800, 1)
    const platformY = doorBottomY // This should align with platform surface
    debugGraphics.lineBetween(this.x - 80, platformY, this.x + 80, platformY)
    
    // Add text labels
    const labelStyle = { fontSize: '12px', color: '#ffffff', backgroundColor: '#000000' }
    
    this.scene.add.text(this.x + 50, this.y - 30, 'DOOR CENTER', labelStyle).setDepth(100)
    this.scene.add.text(this.x + 50, this.y - 10, `X: ${this.x}, Y: ${this.y}`, labelStyle).setDepth(100)
    this.scene.add.text(this.x + 50, this.y + 10, `Physics: ${body.x}, ${body.y}`, labelStyle).setDepth(100)
    this.scene.add.text(this.x + 50, this.y + 30, `Size: ${body.width}x${body.height}`, labelStyle).setDepth(100)
    this.scene.add.text(this.x + 50, doorBottomY, 'DOOR BOTTOM', labelStyle).setDepth(100)
    this.scene.add.text(this.x + 50, platformY + 15, 'PLATFORM SURFACE', labelStyle).setDepth(100)
    
    debugGraphics.setDepth(50) // Above game elements but below UI
  }

  isPlayerNearby(): boolean {
    return this.playerNearby
  }
  
  destroy(): void {
    this.hidePrompt()
    super.destroy()
  }
}