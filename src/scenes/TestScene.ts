import GameSettings from "../config/GameSettings"
import { Player } from "../objects/Player"
import { Cat, CatColor } from "../objects/Cat"
import { BaseBlu } from "../objects/BaseBlu"
import { Beetle } from "../objects/Beetle"
import { Rex } from "../objects/Rex"
import { EnemyType } from "../systems/EnemySpawningSystem"

interface ControlButton {
  button: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
  action: () => void
}

interface EnemySpawnButton {
  button: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
  enemyType: EnemyType
}

export class TestScene extends Phaser.Scene {
  // Core objects
  private player!: Player
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private ladders!: Phaser.Physics.Arcade.StaticGroup
  
  // Enemy groups
  private cats!: Phaser.Physics.Arcade.Group
  private baseBlus!: Phaser.Physics.Arcade.Group
  private beetles!: Phaser.Physics.Arcade.Group
  private stalkerCats!: Phaser.Physics.Arcade.Group
  private rexEnemies!: Phaser.Physics.Arcade.Group
  
  // Control panel
  private controlButtons: ControlButton[] = []
  private enemySpawnButtons: EnemySpawnButton[] = []
  private speedMultiplier: number = 1
  private isInvincible: boolean = false
  private showHitboxes: boolean = false
  private selectedFloor: number = 1  // Default to floor 1
  
  // UI elements
  private statsText!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text
  private speedText!: Phaser.GameObjects.Text
  private invincibleText!: Phaser.GameObjects.Text
  
  // Collapsible spawn menu
  private spawnMenuContainer!: Phaser.GameObjects.Container
  private spawnMenuCollapsed: boolean = false
  private spawnMenuToggle!: Phaser.GameObjects.Text
  
  // Platform spawn points
  private platformSpawnPoints: { x: number, y: number, width: number }[] = []
  
  constructor() {
    super({ key: "TestScene" })
  }
  
  preload(): void {
    // Load Rex enemy sprites from URLs
    this.load.image('rexEyesOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/rex%20eyes%20open-xKvtdvPdMIy13IjDLdWArsLxH3bi3m.png')
    this.load.image('rexBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/rex%20eyes%20blinking-ix1xWvDmRTfWQT1HB22Z4z0lYCST06.png')
  }
  
  init(): void {
    // Ensure physics is properly configured for this scene
    this.physics.world.gravity.y = GameSettings.game.gravity
  }
  
  create(): void {
    // Set background color
    this.cameras.main.setBackgroundColor(0x2a1a3e)
    
    // Create title
    this.createTitle()
    
    // Create platforms
    this.createPlatforms()
    
    // Create player
    this.createPlayer()
    
    // Initialize enemy groups
    this.initializeEnemyGroups()
    
    // Create unified control menu (combines all controls and spawn buttons)
    this.createUnifiedControlMenu()
    
    // Create stats display
    this.createStatsDisplay()
    
    // Set up collisions
    this.setupCollisions()
    
    // Add keyboard shortcuts
    this.setupKeyboardShortcuts()
    
    // Create exit button
    this.createExitButton()
  }
  
  private createTitle(): void {
    this.titleText = this.add.text(
      this.cameras.main.centerX,
      30,
      '🧪 ENEMY TEST LABORATORY 🧪',
      {
        fontSize: '20px',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000) // High depth to be on top
  }
  
  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup()
    this.ladders = this.physics.add.staticGroup()
    
    // Create 5 test platforms with MORE VERTICAL SPACING for jumping
    // Increased spacing from 100 to 140 pixels between platforms
    const platformY = [
      650,  // Platform 1 (bottom) - moved down
      510,  // Platform 2 (140px gap)
      370,  // Platform 3 (140px gap)
      230,  // Platform 4 (140px gap)
      90    // Platform 5 (top) (140px gap)
    ]
    
    platformY.forEach((y, index) => {
      // Create wide platform
      const platformWidth = 350
      const platformX = this.cameras.main.centerX
      
      // Visual platform (multiple tiles)
      const numTiles = Math.ceil(platformWidth / 32)
      for (let i = 0; i < numTiles; i++) {
        const tileX = platformX - platformWidth/2 + i * 32 + 16
        const platform = this.platforms.create(tileX, y, 'platform')
        platform.setDisplaySize(32, 32)
        platform.setDepth(1) // Platforms render behind everything
        platform.refreshBody()
      }
      
      // Store spawn point for this platform
      this.platformSpawnPoints.push({
        x: platformX,
        y: y - 50, // Spawn above platform
        width: platformWidth
      })
      
      // Add platform label
      this.add.text(
        50,
        y - 10,
        `P${index + 1}`,
        {
          fontSize: '12px',
          color: '#ffff00',
          fontFamily: 'monospace'
        }
      )
      
      // Platform ladders will be created as one continuous ladder after the loop
    })
    
    // Add ground platform (at very bottom)
    const groundY = 750  // Move ground lower to give more room
    
    // CREATE ONE CONTINUOUS LADDER FROM GROUND TO TOP (left side)
    const leftLadderX = this.cameras.main.centerX - 150
    const ladderTopY = platformY[platformY.length - 1] - 20  // Top platform minus 20
    const ladderBottomY = groundY
    const totalLadderHeight = ladderBottomY - ladderTopY
    const numLeftLadderTiles = Math.ceil(totalLadderHeight / 32)  // Remove the +1 to skip top piece
    
    for (let j = 0; j < numLeftLadderTiles; j++) {
      const ladderY = ladderBottomY - j * 32
      const ladder = this.ladders.create(leftLadderX, ladderY, 'ladder')
      ladder.setDisplaySize(32, 32)
      ladder.setDepth(5)
      ladder.refreshBody()
    }
    
    // CREATE SECOND CONTINUOUS LADDER (right side) for variety
    const rightLadderX = this.cameras.main.centerX + 150
    const numRightLadderTiles = Math.ceil(totalLadderHeight / 32)  // Remove the +1 to skip top piece
    
    for (let j = 0; j < numRightLadderTiles; j++) {
      const ladderY = ladderBottomY - j * 32
      const ladder = this.ladders.create(rightLadderX, ladderY, 'ladder')
      ladder.setDisplaySize(32, 32)
      ladder.setDepth(5)
      ladder.refreshBody()
    }
    const groundWidth = this.cameras.main.width
    const numGroundTiles = Math.ceil(groundWidth / 32)
    
    for (let i = 0; i < numGroundTiles; i++) {
      const tileX = i * 32 + 16
      const ground = this.platforms.create(tileX, groundY, 'platform')
      ground.setDisplaySize(32, 32)
      ground.setDepth(1) // Consistent depth with other platforms
      ground.refreshBody()
    }
  }
  
  private createPlayer(): void {
    // Create player on ground level (Player constructor only takes 3 params: scene, x, y)
    this.player = new Player(
      this,
      this.cameras.main.centerX,
      700  // Spawn on ground level
    )
    
    // Ensure player renders above platforms and ladders
    this.player.setDepth(20) // Player should be on top
    
    // Set up camera to follow player
    this.cameras.main.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setFollowOffset(0, 50)
  }
  
  private initializeEnemyGroups(): void {
    this.cats = this.physics.add.group()
    this.baseBlus = this.physics.add.group()
    this.beetles = this.physics.add.group()
    this.stalkerCats = this.physics.add.group()
    this.rexEnemies = this.physics.add.group({
      classType: Rex,
      runChildUpdate: true
    })
  }
  
  private createUnifiedControlMenu(): void {
    const menuX = this.cameras.main.width - 210
    const menuY = 60
    
    // Create container for collapsible menu with HIGH depth
    this.spawnMenuContainer = this.add.container(0, 0)
    this.spawnMenuContainer.setDepth(1000) // Very high depth to render on top
    
    // Menu background - taller to fit all controls
    const bgWidth = 200
    const bgHeight = 460  // Increased height for floor selector and all controls
    const bg = this.add.rectangle(menuX + 100, menuY + 200, bgWidth, bgHeight, 0x000000, 0.8)
    bg.setStrokeStyle(2, 0x00ff00)
    this.spawnMenuContainer.add(bg)
    
    // Title with collapse toggle
    const titleText = this.add.text(menuX + 70, menuY - 10, 'CONTROLS', {
      fontSize: '14px',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(titleText)
    
    // Collapse/expand toggle
    this.spawnMenuToggle = this.add.text(menuX + 170, menuY - 10, '[-]', {
      fontSize: '14px',
      color: '#ffff00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.spawnMenuToggle.setDepth(1001) // Above container
    
    this.spawnMenuToggle.on('pointerdown', () => {
      this.toggleSpawnMenu()
    })
    
    let currentY = menuY + 20
    
    // FLOOR SELECTOR
    this.createFloorSelectorInMenu(menuX + 100, currentY)
    currentY += 40
    
    // SPEED CONTROLS
    this.createSpeedControlsInMenu(menuX + 100, currentY)
    currentY += 50
    
    // INVINCIBILITY TOGGLE
    this.createInvincibilityToggleInMenu(menuX + 100, currentY)
    currentY += 40
    
    // CLEAR ALL BUTTON
    this.createClearAllButtonInMenu(menuX + 100, currentY)
    currentY += 40
    
    // Separator line
    const separator = this.add.rectangle(menuX + 100, currentY, bgWidth - 20, 2, 0x00ff00, 0.5)
    this.spawnMenuContainer.add(separator)
    currentY += 15
    
    // SPAWN ENEMIES section
    const enemyTitle = this.add.text(menuX + 100, currentY, 'SPAWN ENEMIES', {
      fontSize: '12px',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(enemyTitle)
    currentY += 25
    
    // Enemy spawn buttons
    this.createEnemyButtonsInMenu(menuX, currentY)
  }
  
  // Old control panel method - replaced by unified menu
  
  private createSpeedControls(x: number, y: number): void {
    this.speedText = this.add.text(x - 80, y - 10, 'Speed: 1x', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setScrollFactor(0)
    
    const speeds = [0.5, 1, 2, 4]
    const speedButtons: ControlButton[] = []
    
    speeds.forEach((speed, index) => {
      const btnX = x - 60 + index * 35
      const btn = this.add.rectangle(btnX, y + 10, 30, 20, 0x444444)
      btn.setStrokeStyle(1, 0x00ff00)
      btn.setInteractive({ useHandCursor: true })
      btn.setScrollFactor(0)
      
      const btnText = this.add.text(btnX, y + 10, `${speed}x`, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0)
      
      btn.on('pointerdown', () => {
        this.speedMultiplier = speed
        this.physics.world.timeScale = speed
        this.speedText.setText(`Speed: ${speed}x`)
        
        // Update button colors
        speedButtons.forEach(sb => {
          sb.button.setFillStyle(0x444444)
        })
        btn.setFillStyle(0x00ff00)
      })
      
      speedButtons.push({ button: btn, text: btnText, action: () => {} })
    })
    
    // Set initial speed button highlight
    speedButtons[1].button.setFillStyle(0x00ff00) // 1x speed
  }
  
  private createInvincibilityToggle(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 120, 25, 0x444444)
    btn.setStrokeStyle(1, 0x00ff00)
    btn.setInteractive({ useHandCursor: true })
    btn.setScrollFactor(0)
    
    this.invincibleText = this.add.text(x, y, 'Invincible: OFF', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setScrollFactor(0)
    
    btn.on('pointerdown', () => {
      this.isInvincible = !this.isInvincible
      this.invincibleText.setText(`Invincible: ${this.isInvincible ? 'ON' : 'OFF'}`)
      btn.setFillStyle(this.isInvincible ? 0x00ff00 : 0x444444)
      
      // Apply invincibility to player
      if (this.isInvincible) {
        this.player.setTint(0xffff00) // Yellow tint for invincible
      } else {
        this.player.clearTint()
      }
    })
  }
  
  private createClearAllButton(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 100, 25, 0xff4444)
    btn.setStrokeStyle(1, 0xffffff)
    btn.setInteractive({ useHandCursor: true })
    btn.setScrollFactor(0)
    
    const btnText = this.add.text(x, y, 'CLEAR ALL', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0)
    
    btn.on('pointerdown', () => {
      this.clearAllEnemies()
      btn.setFillStyle(0xff8888)
      this.time.delayedCall(100, () => {
        btn.setFillStyle(0xff4444)
      })
    })
  }
  
  // Old enemy spawn buttons method - replaced by unified menu
  private createEnemySpawnButtonsOLD(): void {
    const startX = this.cameras.main.width - 200
    const startY = 100
    
    // Create container for collapsible menu
    this.spawnMenuContainer = this.add.container(0, 0)
    this.spawnMenuContainer.setScrollFactor(0)
    
    // Enemy spawn buttons background
    const bgWidth = 180
    const bgHeight = 280
    const bg = this.add.rectangle(startX + 90, startY + 130, bgWidth, bgHeight, 0x000000, 0.7)
    bg.setStrokeStyle(2, 0x00ff00)
    this.spawnMenuContainer.add(bg)
    
    // Title with collapse toggle
    const titleText = this.add.text(startX + 60, startY - 10, 'SPAWN ENEMIES', {
      fontSize: '14px',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(titleText)
    
    // Add collapse/expand toggle button
    this.spawnMenuToggle = this.add.text(startX + 160, startY - 10, '[-]', {
      fontSize: '14px',
      color: '#ffff00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    
    this.spawnMenuToggle.on('pointerdown', () => {
      this.toggleSpawnMenu()
    })
    
    this.spawnMenuToggle.setScrollFactor(0) // Keep toggle always visible
    
    // Enemy types and their display names
    const enemies = [
      { type: EnemyType.CATERPILLAR, name: 'CTRPLR', color: 'yellow' },
      { type: EnemyType.BLUE_CATERPILLAR, name: 'BLU-CAT', color: 'blue_caterpillar' },
      { type: EnemyType.BEETLE, name: 'BEETLE', color: 'red' },
      { type: EnemyType.CHOMPER, name: 'CHMPR', color: 'blue' },
      { type: EnemyType.CHOMPER, name: 'P-CHMP', color: 'purple' },  // Purple chomper variant
      { type: EnemyType.SNAIL, name: 'SNAIL', color: 'red' },
      { type: EnemyType.JUMPER, name: 'JUMPER', color: 'green' },
      { type: EnemyType.STALKER, name: 'STALKR', color: 'red' },
      { type: EnemyType.BASEBLU, name: 'BLU', color: 'blue' }
    ]
    
    // Create grid of spawn buttons
    enemies.forEach((enemy, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const btnX = startX + 45 + col * 90
      const btnY = startY + 30 + row * 35
      
      const btn = this.add.rectangle(btnX, btnY, 80, 25, 0x444444)
      btn.setStrokeStyle(1, 0x00ff00)
      btn.setInteractive({ useHandCursor: true })
      this.spawnMenuContainer.add(btn)
      
      const btnText = this.add.text(btnX, btnY, enemy.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }).setOrigin(0.5)
      this.spawnMenuContainer.add(btnText)
      
      btn.on('pointerdown', () => {
        this.spawnEnemy(enemy.type, enemy.color)
        btn.setFillStyle(0x00ff00)
        this.time.delayedCall(100, () => {
          btn.setFillStyle(0x444444)
        })
      })
      
      btn.on('pointerover', () => {
        btn.setFillStyle(0x666666)
      })
      
      btn.on('pointerout', () => {
        btn.setFillStyle(0x444444)
      })
      
      this.enemySpawnButtons.push({
        button: btn,
        text: btnText,
        enemyType: enemy.type
      })
    })
  }
  
  private spawnEnemy(type: EnemyType | string, color: string): void {
    // Use selected floor (floors are indexed 0, 1, 2 from bottom to top)
    // Floor 1 = index 2 (top), Floor 2 = index 1 (middle), Floor 3 = index 0 (bottom)
    const floorIndex = 3 - this.selectedFloor
    
    // Make sure the floor index is valid
    if (floorIndex < 0 || floorIndex >= this.platformSpawnPoints.length) {
      console.warn('Invalid floor selected:', this.selectedFloor)
      return
    }
    
    const spawnPoint = this.platformSpawnPoints[floorIndex]
    
    // Add some random X offset
    const xOffset = (Math.random() - 0.5) * spawnPoint.width * 0.8
    const x = spawnPoint.x + xOffset
    const y = spawnPoint.y
    
    // Calculate platform bounds for patrol enemies
    const platformLeft = spawnPoint.x - spawnPoint.width / 2
    const platformRight = spawnPoint.x + spawnPoint.width / 2
    
    switch (type) {
      case EnemyType.BASEBLU:
        const baseBlu = new BaseBlu(this, x, y)
        baseBlu.setPlatformBounds(platformLeft, platformRight)
        this.baseBlus.add(baseBlu)
        break
        
      case EnemyType.BEETLE:
        const beetle = new Beetle(this, x, y, platformLeft, platformRight)
        this.beetles.add(beetle)
        break
        
      case EnemyType.STALKER:
        const stalker = new Cat(this, x, y, platformLeft, platformRight, color, true)
        stalker.setPlayerReference(this.player)
        this.stalkerCats.add(stalker)
        break
        
      case 'REX':
        const rex = new Rex(this, x, y, platformLeft, platformRight)
        this.rexEnemies.add(rex)
        break
        
      default:
        // All other enemy types use Cat class with different colors
        const cat = new Cat(this, x, y, platformLeft, platformRight, color as CatColor, false)
        this.cats.add(cat)
        break
    }
  }
  
  private clearAllEnemies(): void {
    // Clear all enemy groups
    this.cats.clear(true, true)
    this.baseBlus.clear(true, true)
    this.beetles.clear(true, true)
    this.stalkerCats.clear(true, true)
    this.rexEnemies.clear(true, true)
  }
  
  private createFloorSelectorInMenu(x: number, y: number): void {
    // Floor label
    const floorLabel = this.add.text(x - 60, y, 'Floor:', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace'
    })
    this.spawnMenuContainer.add(floorLabel)
    
    // Floor display
    const floorDisplay = this.add.text(x, y, `${this.selectedFloor}`, {
      fontSize: '12px',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(floorDisplay)
    
    // Floor down button
    const downBtn = this.add.text(x - 25, y, '◄', {
      fontSize: '16px',
      color: '#ffff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.spawnMenuContainer.add(downBtn)
    
    downBtn.on('pointerdown', () => {
      if (this.selectedFloor > 1) {
        this.selectedFloor--
        floorDisplay.setText(`${this.selectedFloor}`)
      }
    })
    
    // Floor up button
    const upBtn = this.add.text(x + 25, y, '►', {
      fontSize: '16px',
      color: '#ffff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.spawnMenuContainer.add(upBtn)
    
    upBtn.on('pointerdown', () => {
      if (this.selectedFloor < 3) {
        this.selectedFloor++
        floorDisplay.setText(`${this.selectedFloor}`)
      }
    })
  }
  
  private createSpeedControlsInMenu(x: number, y: number): void {
    this.speedText = this.add.text(x, y - 10, 'Speed: 1x', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(this.speedText)
    
    const speeds = [0.5, 1, 2, 4]
    speeds.forEach((speed, index) => {
      const btnX = x - 60 + index * 35
      const btn = this.add.rectangle(btnX, y + 10, 30, 20, 0x444444)
      btn.setStrokeStyle(1, 0x00ff00)
      btn.setInteractive({ useHandCursor: true })
      this.spawnMenuContainer.add(btn)
      
      const btnText = this.add.text(btnX, y + 10, `${speed}x`, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }).setOrigin(0.5)
      this.spawnMenuContainer.add(btnText)
      
      btn.on('pointerdown', () => {
        this.speedMultiplier = speed
        this.physics.world.timeScale = speed
        this.speedText.setText(`Speed: ${speed}x`)
        speeds.forEach((_, i) => {
          const b = this.spawnMenuContainer.getAt(7 + i * 2) as Phaser.GameObjects.Rectangle
          b.setFillStyle(i === index ? 0x00ff00 : 0x444444)
        })
      })
      
      if (index === 1) btn.setFillStyle(0x00ff00) // Default 1x
    })
  }
  
  private createInvincibilityToggleInMenu(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 120, 25, 0x444444)
    btn.setStrokeStyle(1, 0x00ff00)
    btn.setInteractive({ useHandCursor: true })
    this.spawnMenuContainer.add(btn)
    
    this.invincibleText = this.add.text(x, y, 'Invincible: OFF', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(this.invincibleText)
    
    btn.on('pointerdown', () => {
      this.isInvincible = !this.isInvincible
      this.invincibleText.setText(`Invincible: ${this.isInvincible ? 'ON' : 'OFF'}`)
      btn.setFillStyle(this.isInvincible ? 0x00ff00 : 0x444444)
      if (this.isInvincible) {
        this.player.setTint(0xffff00)
      } else {
        this.player.clearTint()
      }
    })
  }
  
  private createClearAllButtonInMenu(x: number, y: number): void {
    const btn = this.add.rectangle(x, y, 100, 25, 0xff4444)
    btn.setStrokeStyle(1, 0xffffff)
    btn.setInteractive({ useHandCursor: true })
    this.spawnMenuContainer.add(btn)
    
    const btnText = this.add.text(x, y, 'CLEAR ALL', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.spawnMenuContainer.add(btnText)
    
    btn.on('pointerdown', () => {
      this.clearAllEnemies()
      btn.setFillStyle(0xff8888)
      this.time.delayedCall(100, () => {
        btn.setFillStyle(0xff4444)
      })
    })
  }
  
  private createEnemyButtonsInMenu(menuX: number, startY: number): void {
    const enemies = [
      { type: EnemyType.CATERPILLAR, name: 'CTRPLR', color: 'yellow' },
      { type: EnemyType.BLUE_CATERPILLAR, name: 'BLU-CAT', color: 'blue_caterpillar' },
      { type: EnemyType.BEETLE, name: 'BEETLE', color: 'red' },
      { type: EnemyType.CHOMPER, name: 'CHMPR', color: 'blue' },
      { type: EnemyType.CHOMPER, name: 'P-CHMP', color: 'purple' },  // Purple chomper variant
      { type: EnemyType.SNAIL, name: 'SNAIL', color: 'red' },
      { type: EnemyType.JUMPER, name: 'JUMPER', color: 'green' },
      { type: EnemyType.STALKER, name: 'STALKR', color: 'red' },
      { type: EnemyType.BASEBLU, name: 'BLU', color: 'blue' },
      { type: 'REX' as any, name: 'REX', color: 'rex' }  // New Rex enemy
    ]
    
    enemies.forEach((enemy, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const btnX = menuX + 55 + col * 90
      const btnY = startY + row * 35
      
      const btn = this.add.rectangle(btnX, btnY, 80, 25, 0x444444)
      btn.setStrokeStyle(1, 0x00ff00)
      btn.setInteractive({ useHandCursor: true })
      this.spawnMenuContainer.add(btn)
      
      const btnText = this.add.text(btnX, btnY, enemy.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }).setOrigin(0.5)
      this.spawnMenuContainer.add(btnText)
      
      btn.on('pointerdown', () => {
        this.spawnEnemy(enemy.type, enemy.color)
        btn.setFillStyle(0x00ff00)
        this.time.delayedCall(100, () => {
          btn.setFillStyle(0x444444)
        })
      })
    })
  }
  
  private toggleSpawnMenu(): void {
    this.spawnMenuCollapsed = !this.spawnMenuCollapsed
    
    if (this.spawnMenuCollapsed) {
      // Hide the container
      this.spawnMenuContainer.setVisible(false)
      this.spawnMenuToggle.setText('[+]')
    } else {
      // Show the container
      this.spawnMenuContainer.setVisible(true)
      this.spawnMenuToggle.setText('[-]')
    }
  }
  
  private createStatsDisplay(): void {
    const statsX = 10
    const statsY = this.cameras.main.height - 100
    
    // Stats background
    const statsBg = this.add.rectangle(statsX + 80, statsY + 40, 160, 80, 0x000000, 0.7)
    statsBg.setStrokeStyle(1, 0x00ff00)
    statsBg.setScrollFactor(0)
    statsBg.setDepth(999) // High depth to be on top
    
    this.statsText = this.add.text(statsX, statsY, '', {
      fontSize: '11px',
      color: '#00ff00',
      fontFamily: 'monospace',
      lineSpacing: 5
    }).setScrollFactor(0).setDepth(1000) // Higher depth for text
  }
  
  private setupCollisions(): void {
    // Player vs platforms - DISABLE collision when climbing!
    this.physics.add.collider(
      this.player, 
      this.platforms,
      undefined, // No collision callback needed
      (player, platform) => {
        // Process callback - return false to skip collision when climbing
        return !this.player.getIsClimbing()
      },
      this
    )
    
    // Player vs ladders (for climbing) - MUST call checkLadderProximity!
    this.physics.add.overlap(this.player, this.ladders, (player: any, ladder: any) => {
      // Check if player wants to climb
      if (this.player.checkLadderProximity(ladder)) {
        if (!this.player.getIsClimbing()) {
          this.player.startClimbing(ladder)
        }
      }
      
      // Handle ladder exit conditions
      if (this.player.getIsClimbing()) {
        const ladderRect = ladder as Phaser.GameObjects.Rectangle
        const topOfLadder = ladderRect.y - ladderRect.height / 2
        const bottomOfLadder = ladderRect.y + ladderRect.height / 2
        
        // Check if player reached the top of the ladder
        if (this.player.y < topOfLadder - 20) {
          // Place player on the platform above
          this.player.exitClimbing()
          // Give a small upward boost to clear the platform edge
          this.player.setVelocityY(-50)
        }
        // Exit climbing if player goes too far down
        else if (this.player.y > bottomOfLadder + 32) {
          this.player.exitClimbing()
        }
      }
    }, undefined, this)
    
    // Enemies vs platforms
    this.physics.add.collider(this.cats, this.platforms)
    this.physics.add.collider(this.baseBlus, this.platforms)
    this.physics.add.collider(this.beetles, this.platforms)
    this.physics.add.collider(this.stalkerCats, this.platforms)
    this.physics.add.collider(this.rexEnemies, this.platforms)
    
    // Enemy vs enemy collisions
    this.physics.add.collider(this.cats, this.cats, this.handleEnemyCollision, undefined, this)
    this.physics.add.collider(this.beetles, this.beetles, this.handleBeetleCollision, undefined, this)
    // Rex passes through other Rex enemies - no collision
    
    // Player vs enemy overlaps - always active for jump detection
    this.physics.add.overlap(this.player, this.cats, this.handlePlayerEnemyCollision, undefined, this)
    this.physics.add.overlap(this.player, this.baseBlus, this.handlePlayerEnemyCollision, undefined, this)
    this.physics.add.overlap(this.player, this.beetles, this.handlePlayerEnemyCollision, undefined, this)
    this.physics.add.overlap(this.player, this.stalkerCats, this.handlePlayerEnemyCollision, undefined, this)
    this.physics.add.overlap(this.player, this.rexEnemies, this.handlePlayerEnemyCollision, undefined, this)
  }
  
  private handleEnemyCollision(enemy1: any, enemy2: any): void {
    // Make enemies reverse direction when they collide
    if (enemy1.reverseDirection) enemy1.reverseDirection()
    if (enemy2.reverseDirection) enemy2.reverseDirection()
  }
  
  private handleBeetleCollision(beetle1: any, beetle2: any): void {
    if (beetle1.reverseDirection) beetle1.reverseDirection()
    if (beetle2.reverseDirection) beetle2.reverseDirection()
  }
  
  private handlePlayerEnemyCollision(player: any, enemy: any): void {
    if (this.isInvincible) {
      // Kill enemy when invincible
      if (enemy.squish) enemy.squish()
      return
    }
    
    // Check if player is jumping on enemy (player above and falling)
    const playerBottom = player.body.bottom
    const enemyTop = enemy.body.top
    const playerVelocityY = player.body.velocity.y
    
    if (playerBottom < enemyTop + 10 && playerVelocityY > 0) {
      // Player is landing on enemy - squish it!
      if (enemy.squish) {
        enemy.squish()
        // Make player bounce
        player.setVelocityY(-200)
      } else if (enemy.handlePlayerBounce) {
        // For BaseBlu - just bounce
        enemy.handlePlayerBounce()
        player.setVelocityY(-300)
      }
    } else {
      // Player hit enemy from side/below - take damage
      player.setTint(0xff0000)
      this.time.delayedCall(200, () => {
        player.clearTint()
      })
    }
  }
  
  private setupKeyboardShortcuts(): void {
    // ESC to exit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.exitTestScene()
    })
    
    // Number keys for speed control
    this.input.keyboard?.on('keydown-ONE', () => {
      this.speedMultiplier = 0.5
      this.physics.world.timeScale = 0.5
      this.speedText.setText('Speed: 0.5x')
    })
    
    this.input.keyboard?.on('keydown-TWO', () => {
      this.speedMultiplier = 1
      this.physics.world.timeScale = 1
      this.speedText.setText('Speed: 1x')
    })
    
    this.input.keyboard?.on('keydown-THREE', () => {
      this.speedMultiplier = 2
      this.physics.world.timeScale = 2
      this.speedText.setText('Speed: 2x')
    })
    
    this.input.keyboard?.on('keydown-FOUR', () => {
      this.speedMultiplier = 4
      this.physics.world.timeScale = 4
      this.speedText.setText('Speed: 4x')
    })
    
    // I for invincibility
    this.input.keyboard?.on('keydown-I', () => {
      this.isInvincible = !this.isInvincible
      this.invincibleText.setText(`Invincible: ${this.isInvincible ? 'ON' : 'OFF'}`)
      if (this.isInvincible) {
        this.player.setTint(0xffff00)
      } else {
        this.player.clearTint()
      }
    })
    
    // C to clear all
    this.input.keyboard?.on('keydown-C', () => {
      this.clearAllEnemies()
    })
    
    // H for hitboxes
    this.input.keyboard?.on('keydown-H', () => {
      this.showHitboxes = !this.showHitboxes
      this.physics.world.drawDebug = this.showHitboxes
      
      // Clear existing debug graphics if they exist
      if (!this.showHitboxes && this.physics.world.debugGraphic) {
        this.physics.world.debugGraphic.clear()
      }
      
      // Force creation of debug graphic when enabling
      if (this.showHitboxes && !this.physics.world.debugGraphic) {
        this.physics.world.createDebugGraphic()
      }
    })
  }
  
  private createExitButton(): void {
    const exitBtn = this.add.rectangle(
      this.cameras.main.width - 50,
      30,
      80,
      30,
      0xff0000
    )
    exitBtn.setStrokeStyle(2, 0xffffff)
    exitBtn.setInteractive({ useHandCursor: true })
    exitBtn.setScrollFactor(0)
    exitBtn.setDepth(1002) // Very high depth to be on top
    
    const exitText = this.add.text(
      this.cameras.main.width - 50,
      30,
      'EXIT',
      {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1003) // Above exit button
    
    exitBtn.on('pointerdown', () => {
      this.exitTestScene()
    })
    
    exitBtn.on('pointerover', () => {
      exitBtn.setFillStyle(0xff4444)
    })
    
    exitBtn.on('pointerout', () => {
      exitBtn.setFillStyle(0xff0000)
    })
  }
  
  private exitTestScene(): void {
    // Reset physics timescale
    this.physics.world.timeScale = 1
    
    // Return to game scene
    this.scene.start('GameScene')
  }
  
  update(time: number, delta: number): void {
    // Update player - MUST pass time and delta for jump hold mechanic!
    this.player.update(time, delta)
    
    // Check if player is still on a ladder (clear nearbyLadder if not overlapping)
    let onLadder = false
    this.physics.overlap(this.player, this.ladders, () => {
      onLadder = true
    })
    if (!onLadder && !this.player.getIsClimbing()) {
      this.player.clearNearbyLadder()
    }
    
    // Update enemies
    this.cats.children.entries.forEach((cat: any) => {
      if (cat.update) cat.update(time, delta)
    })
    
    this.beetles.children.entries.forEach((beetle: any) => {
      if (beetle.update) beetle.update(time, delta)
    })
    
    this.baseBlus.children.entries.forEach((baseBlu: any) => {
      if (baseBlu.update) baseBlu.update(time, delta)
    })
    
    this.stalkerCats.children.entries.forEach((stalker: any) => {
      if (stalker.update) stalker.update(time, delta)
    })
    
    this.rexEnemies.children.entries.forEach((rex: any) => {
      if (rex.update) rex.update(time, delta)
    })
    
    // Update stats display
    this.updateStats()
  }
  
  private updateStats(): void {
    const totalEnemies = 
      this.cats.children.entries.length +
      this.baseBlus.children.entries.length +
      this.beetles.children.entries.length +
      this.stalkerCats.children.entries.length
    
    const fps = Math.round(this.game.loop.actualFps)
    
    this.statsText.setText([
      `FPS: ${fps}`,
      `Enemies: ${totalEnemies}`,
      `Speed: ${this.speedMultiplier}x`,
      `Invincible: ${this.isInvincible ? 'ON' : 'OFF'}`,
      `Hitboxes: ${this.showHitboxes ? 'ON' : 'OFF'}`
    ])
  }
}