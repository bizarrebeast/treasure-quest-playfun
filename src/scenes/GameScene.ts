import GameSettings from "../config/GameSettingsLoader"
import { Player } from "../objects/Player"
import { Cat, CatColor } from "../objects/Cat"
import { BaseBlu } from "../objects/BaseBlu"
import { Beetle } from "../objects/Beetle"
import { Rex } from "../objects/Rex"
import { Coin } from "../objects/Coin"
import { BlueCoin } from "../objects/BlueCoin"
import { Diamond } from "../objects/Diamond"
import { FreeLife } from "../objects/FreeLife"
import { InvincibilityPendant } from "../objects/InvincibilityPendant"
import { TreasureChest } from "../objects/TreasureChest"
// import { FlashPowerUp } from "../objects/FlashPowerUp" // Commented out for later use
import { CrystalBall } from "../objects/CrystalBall"
import { CrystalBallProjectile } from "../objects/CrystalBallProjectile"
import { CursedOrb } from "../objects/CursedOrb"
import { TouchControls } from "../objects/TouchControls"
import { LevelManager } from "../systems/LevelManager"
import { EnemySpawningSystem, EnemyType } from "../systems/EnemySpawningSystem"
import { Door } from "../objects/Door"
import { AssetPool, AssetConfig } from "../systems/AssetPool"
import { GemShapeGenerator, GemStyle, GemCut } from "../utils/GemShapes"
import { MenuOverlay } from "../ui/MenuOverlay"
import { BackgroundManager } from "../systems/BackgroundManager"
import { SharedAssetManager } from "../systems/SharedAssetManager"

export class GameScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private ladders!: Phaser.Physics.Arcade.StaticGroup
  private spikes!: Phaser.Physics.Arcade.StaticGroup
  private player!: Player
  private cats!: Phaser.Physics.Arcade.Group
  private stalkerCats!: Phaser.Physics.Arcade.Group
  private baseBlus!: Phaser.Physics.Arcade.Group
  private beetles!: Phaser.Physics.Arcade.Group
  private rexEnemies!: Phaser.Physics.Arcade.Group
  private coins: Coin[] = []
  private blueCoins: BlueCoin[] = []
  private diamonds: Diamond[] = []
  private freeLifes: FreeLife[] = []
  private invincibilityPendants: InvincibilityPendant[] = []
  private treasureChests: TreasureChest[] = []
  // private flashPowerUps: FlashPowerUp[] = [] // Commented out for later use
  private crystalBalls: CrystalBall[] = []
  private crystalBallProjectiles: CrystalBallProjectile[] = []
  private levelHasCrystalBall: boolean = false
  private cursedOrbs: CursedOrb[] = []
  private cursedTealOrbs: CursedOrb[] = []
  private levelHasCursedOrb: boolean = false
  private levelHasCursedTealOrb: boolean = false
  private isGameOver: boolean = false
  private floorLayouts: { gapStart: number, gapSize: number }[] = []
  private ladderPositions: Map<number, number[]> = new Map() // floor -> ladder x positions
  private doorPositions: Map<number, number> = new Map() // floor -> door x position
  private score: number = 0 // Current level score only
  private accumulatedScore: number = 0 // Score from completed levels
  private scoreText!: Phaser.GameObjects.Text
  private currentFloor: number = 0
  private lives: number = 3
  private totalCoinsCollected: number = 0 // Still using coins internally for backwards compatibility
  private totalGemsCollected: number = 0 // Track regular gems (coins)
  private totalBlueGemsCollected: number = 0 // Track big blue gems
  private totalDiamondsCollected: number = 0 // Track diamonds
  private livesEarned: number = 0 // Track how many lives have been earned from gems
  private livesText!: Phaser.GameObjects.Text
  private livesIcon!: Phaser.GameObjects.Image
  private coinCounterText!: Phaser.GameObjects.Text // Display shows crystals, but variable kept for compatibility
  private readonly COINS_PER_EXTRA_LIFE = 150 // Crystals needed for extra life
  private readonly MAX_LIVES = 99
  private hamburgerMenuButton!: Phaser.GameObjects.Text // Hamburger menu button
  private highestFloorGenerated: number = 5 // Track how many floors we've generated
  public touchControls!: TouchControls
  private justKilledCat: boolean = false
  private comboCount: number = 0
  private comboTimer: Phaser.Time.TimerEvent | null = null
  private comboText!: Phaser.GameObjects.Text
  private visibilityMask: any // Store visibility system components
  private visibilityRadius: number = 160 // 5 tiles * 32 pixels
  // private flashPowerUpActive: boolean = false // Commented out for later use
  // private flashPowerUpTimer: Phaser.Time.TimerEvent | null = null // Commented out for later use
  private invincibilityActive: boolean = false
  private invincibilityTimer: Phaser.Time.TimerEvent | null = null
  private invincibilityTimerImage!: Phaser.GameObjects.Image
  private invincibilityTimerMask!: Phaser.GameObjects.Graphics
  private invincibilityTimeRemaining: number = 0
  private invincibilityTimerSparkleTimer: Phaser.Time.TimerEvent | null = null
  private invincibilityWarningPlayed: boolean = false
  private crystalBallTimerImage!: Phaser.GameObjects.Image
  private crystalBallTimerMask!: Phaser.GameObjects.Graphics
  private cursedOrbTimerImage!: Phaser.GameObjects.Image
  private cursedOrbTimerMask!: Phaser.GameObjects.Graphics
  private cursedTealOrbTimerImage!: Phaser.GameObjects.Image
  private cursedTealOrbTimerMask!: Phaser.GameObjects.Graphics
  private darknessOverlay!: Phaser.GameObjects.Image
  private playerGoldenAura: Phaser.GameObjects.Arc | null = null
  private playerParticleTrail: Phaser.GameObjects.Graphics[] = []
  private playerSpikeOverlap: Phaser.Physics.Arcade.Collider | null = null
  private playerSpikeCollider: Phaser.Physics.Arcade.Collider | null = null
  private levelManager!: LevelManager
  private levelText!: Phaser.GameObjects.Text
  private menuOverlay!: MenuOverlay
  private backgroundMusic!: Phaser.Sound.BaseSound
  private backgroundManager!: BackgroundManager
  private beastModeLoadingText?: Phaser.GameObjects.Text
  private beastModeLoadingTimer?: Phaser.Time.TimerEvent
  
  // Game statistics tracking
  private gameStats = {
    treasureChestsOpened: 0,
    enemyKills: {
      caterpillar: 0,
      rollz: 0,
      chomper: 0,
      snail: 0,
      bouncer: 0,
      stalker: 0,
      rex: 0,
      blu: 0
    },
    totalEnemiesDefeated: 0,
    highestFloor: 0,
    livesLost: 0
  }
  
  // Background management
  private currentBackground: string = 'background-treasure-quest-5'
  private backgroundLibrary: string[] = [
    'background-treasure-quest-5',
    'background-treasure-quest-6', 
    'background-treasure-quest-7'
    // More backgrounds will be added here over time
  ]
  private backgroundSprite: Phaser.GameObjects.Image | null = null
  private backgroundInitialY: number = 0
  private backgroundHeight: number = 0
  
  // Smart tile placement tracking
  private recentTiles: number[] = [] // Track last few tiles to avoid repeats
  private tileGrid: Map<string, {variant: number, flipX: boolean}> = new Map() // Track tile variant and horizontal flip at each position
  private tileUsageCount: number[] = new Array(12).fill(0) // Track usage count for each variant (12 tiles now)
  private door: Door | null = null
  private isLevelStarting: boolean = false
  private isLevelComplete: boolean = false
  private assetPool!: AssetPool
  
  // Speech/Thought bubble system
  private speechBubble: Phaser.GameObjects.Image | null = null
  private thoughtBubble: Phaser.GameObjects.Image | null = null
  private bubbleTimer: Phaser.Time.TimerEvent | null = null
  private readonly BUBBLE_DISPLAY_TIME = 3000 // 3 seconds
  
  constructor() {
    super({ key: "GameScene" })
  }

  private loadingOverlay: Phaser.GameObjects.Container | null = null
  private showLoadingScreen: boolean = false
  private preloadChapterText?: Phaser.GameObjects.Text
  private preloadLoadingText?: Phaser.GameObjects.Text
  private instantLoadingScreen?: Phaser.GameObjects.Image

  // WARNING: DUPLICATE init() METHOD - DO NOT DELETE WITHOUT CHECKING WITH DYLAN FIRST
  // There are two init() methods in this file (line ~158 and line ~621)
  // This duplication may be intentional for specific loading/initialization behavior
  init(data?: any): void {
    // Store flag to reopen menu after scene is ready
    this.reopenMenuAfterInit = data?.reopenMenu || false
    
    // Check if this is a continue after death
    const isDeathRetry = this.game.registry.get('isDeathRetry') || false
    const playerLives = this.game.registry.get('playerLives') || 0
    
    // Set flag to show loading screen ONLY if this is NOT a replay or death retry
    const isReplay = this.game.registry.get('isReplay') || false
    const skipLoadingScreen = isReplay || (isDeathRetry && playerLives > 0)
    this.showLoadingScreen = !skipLoadingScreen
    
    console.log(`🎬 Loading screen decision: isReplay=${isReplay}, isDeathRetry=${isDeathRetry}, skip=${skipLoadingScreen}, SHOW=${this.showLoadingScreen}`)
    
    // Initialize managers that need scene references
    this.levelManager = new LevelManager()
    this.backgroundManager = new BackgroundManager(this)
    
    // Set purple background immediately (matching theme)
    this.cameras.main.setBackgroundColor(0x2e2348)
    
    // Check if we have a pre-generated loading screen
    const currentLevel = this.registry.get('currentLevel') || 1
    const loadingScreenKey = `loading-screen-${currentLevel >= 51 ? 51 : currentLevel >= 41 ? 41 : currentLevel >= 31 ? 31 : currentLevel >= 21 ? 21 : currentLevel >= 11 ? 11 : 1}`
    
    if (this.textures.exists(loadingScreenKey)) {
      // Use pre-generated loading screen for INSTANT display
      console.log(`⚡ Using pre-generated loading screen: ${loadingScreenKey}`)
      this.instantLoadingScreen = this.add.image(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        loadingScreenKey
      )
      this.instantLoadingScreen.setOrigin(0.5)
      this.instantLoadingScreen.setDepth(100000)
    } else {
      // Fallback to creating text (slower but still works)
      console.log('⚠️ No pre-generated loading screen, creating text')
      const centerX = GameSettings.canvas.width / 2
      const centerY = GameSettings.canvas.height / 2
      
      // Single "LOADING..." text centered
      const loading = this.add.text(centerX, centerY, 'LOADING...', {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        fontStyle: 'bold'
      })
      loading.setOrigin(0.5)
      loading.setDepth(10000)
      
      this.preloadLoadingText = loading
    }
    
    console.log('🎮 GameScene.init() - Loading screen displayed')
  }

  preload(): void {
    console.log('🔄 GameScene.preload() started at', performance.now())
    
    // Check how many assets were preloaded
    const preloadedCount = SharedAssetManager.getPreloadedCount()
    if (preloadedCount > 0) {
      console.log(`✨ Found ${preloadedCount} preloaded assets from InstructionsScene`)
    }
    
    // Loading screen already shown in init(), just load assets now
    
    // Initialize asset pool
    this.assetPool = new AssetPool(this)
    
    // Define all game assets with fallbacks
    const gameAssets: AssetConfig[] = [
      {
        key: 'visibilityOverlay',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/black%20overlay-aQ9bbCj7ooLaxsRl5pO9PxSt2SsWun.png?0nSO',
        type: 'image',
        retries: 3
      },
      // Background assets
      {
        key: 'background-treasure-quest-5',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Treasure%20Quest%20BG%205-pVHhUmXIAvnZT4aFVRFgYvljKibVS0.png?qco1',
        type: 'image',
        retries: 3
      },
      {
        key: 'background-treasure-quest-6',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Treasure%20Quest%20BG%206-gX1QoTf3UJnMPvbDKVt9hYGDD1AltE.png?LWtY',
        type: 'image',
        retries: 3
      },
      {
        key: 'background-treasure-quest-7',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Treasure%20Quest%20BG%207-YeACeKZk8lSEU1IDy5zOU6G79VqYKx.png?TWtQ',
        type: 'image',
        retries: 3
      },
      // Idle animations
      {
        key: 'playerIdleEye1',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/Idle%20eye%20position%201-p01pa3z9fL9AyLQolMuYyBO3DIqgvB.png?FaaG',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerIdleEye2',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/Idle%20eye%20position%202-ngx0e1EF33iY14vRpcSvy8QOUjMKnl.png?lsFE',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerIdleBlink',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/Idle%20eye%20position%20blinking-fDIX0Bin2Vh42SGyH0DT70fwWARivM.png?QXG7',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerIdleEye3',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/idle%20eye%20position%203-TLisG1UJypI7PhiKszpBcC8Nx8ZyrS.png?6Tg9',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerIdleEye4',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/idle%20eye%20position%204-kvrv3THif8vcKjFB0NPzOeclqapVi6.png?PuWO',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerIdleEye5',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/idle%20eye%20position%205-1P13Nmi3xqoC5kWevrWUxutqyXfr99.png?F4D2',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      // Long idle animation (booty shaking after 30 seconds)
      {
        key: 'playerIdleBootyLeft',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/booty%20shaking%20left%20cheek-c4bJ5CnHbeRJc6LN3OSetpPvTNby88.png?zEph',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerIdleBootyRight',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/booty%20shaking%20right%20cheek-7eORz1b8ditvsXDolmHCEUlk7Wmvvd.png?UT5w',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      // Climbing animations
      {
        key: 'playerClimbLeftFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/climbing%20ladder%20left%20foot%20up-Oipv0p2kIPLZcoV2XBC7FMjkKAzxOk.png?6y8P',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerClimbRightFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/climbing%20ladder%20right%20foot%20up-A7A5enZp5Z0EeXRZE8MVGvLZ9Jx5Ll.png?Hwlb',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      // Jumping animations
      {
        key: 'playerJumpLeftFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/jumping%20left%20foot%20forward-mXUWm73dYQqZMOkl9Wn4MjBnzEdZjX.png?49nU',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerJumpRightFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/jumping%20right%20foot%20forward-qLrBUCfcOJhpnlFrfX8taL39RPnq4P.png?1QLd',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      // Running animations
      {
        key: 'playerRunLeftFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20left%20foot%20forward%20new-aH3WiqHkbYLeW14yketC7EdmowlQ02.png?jLLJ',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'playerRunRightFoot',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/Running%20right%20foot%20forward-FGGa0yxLpub6kRyvYj29zhOqx4sVj3.png?VhAX',
        type: 'image',
        retries: 3,
        fallback: 'defaultPlayer'
      },
      {
        key: 'blueEnemy',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/enemy%20test%201-DFzrumkmpUN5HOwL25dNAVJzRcVxhv.png?rxbT',
        type: 'image',
        retries: 3,
        fallback: 'defaultEnemy'
      },
      {
        key: 'tealLadder',
        url: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/new%20ladder-ULDbdT9I4h8apxhpJI6WT1PzmaMzLo.png?okOd',
        type: 'image',
        retries: 3
      }
    ]
    
    // Register assets with the pool
    this.assetPool.registerAssets(gameAssets)
    
    // Create fallback textures first
    this.assetPool.createCommonFallbacks()
    
    // Load critical assets via traditional method first for immediate availability
    this.load.image('blueEnemy', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/enemy%20test%201-DFzrumkmpUN5HOwL25dNAVJzRcVxhv.png?rxbT')
    this.load.image('visibilityOverlay', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/4cc595d8-5f6a-49c0-9b97-9eabd3193403/black%20overlay-aQ9bbCj7ooLaxsRl5pO9PxSt2SsWun.png?0nSO')
    
    // Load custom touch control assets
    this.load.image('custom-dpad', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/dpad-HlSoc5tt8vs8cjbkEROL1GjaGzx8Ko.png?ecZG')
    this.load.image('custom-jump-button', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/teal%20button-yS4IpgcdvQerPZjpif3tOLmqIfO7yE.png?pRZm')
    this.load.image('custom-action-button', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/action%20button-0ijEeXV3alwc5ZbDzkD4HaP7PXzsAN.png?1zZP')
    
    // Load HUD background sprites
    this.load.image('test-hud-bg', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/test%20gem%20for%20hud-7RamXtpyUYcrX6K6DLnuWOD7ZNssLi.png?1boq')
    this.load.image('hud-bg-200', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/gem%20for%20hud-pTsDx0VNBRQzAIh45KCFTFoU0pM1om.png?4RuD')
    
    // Load new blue enemy animation sprites
    this.load.image('blueEnemyMouthClosed', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20closed-HUXqx9HBdotEhJE2LBgzK8Z4kA7e2H.png?AVKZ')
    this.load.image('blueEnemyMouthClosedBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20closed%20blinking-bJ1xwYkoCZvjd4T9MdXzR45PfaZIcF.png?6LRV')
    this.load.image('blueEnemyMouthPartialOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20partially%20open-PrzEwLEPYIPE6pJTgHBWV7SVvKYcSX.png?0RG2')
    this.load.image('blueEnemyMouthPartialOpenBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20partially%20open%20blinking-GfMaaIsvJGkTrtx4vIFnh11fvyTc5N.png?d3qY')
    this.load.image('blueEnemyMouthOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20open-4hO9JLZDfnWgcQWlvfqiU7SCOXaA0g.png?sh1i')
    this.load.image('blueEnemyMouthOpenBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blue%20enemy%20mouth%20open%20blinking-Nl5UA9KyScZCBwu9BrKXR0IdNk3aen.png?B9Tr')
    
    // Load purple chomper sprites (visual variant of blue chomper)
    this.load.image('purpleEnemyMouthClosed', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/chomper2%20closed%20mouth-l01A99F3sINIeGx2hkb33YVS16xa3k.png?DjP8')
    this.load.image('purpleEnemyMouthPartialOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/chomper2%20mid%20mouth-OvzgXzA7k4tlCopnJB6tiD0RqjATsS.png?wV23')
    this.load.image('purpleEnemyMouthOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/chomper2%20full%20open%20mouth-H4bWdRYA3801jLzUyCiuevtXxj8Hmu.png?MkMw')
    
    // Load red enemy animation sprites (8 sprites for patrol, bite, and blink)
    this.load.image('redEnemyMouthClosedEyes1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20closed%20eyes%201-RKF3p3F7fxdBSfen8UD9UGqIzf8zlv.png?xRpM')
    this.load.image('redEnemyMouthClosedEyes2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20closed%20eyes%202-vLWsEKkj7nPhdADyj947N0FQDi3QUf.png?Z82J')
    this.load.image('redEnemyMouthClosedBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20closed%20eyes%20blinking-PiVnlocHV8Fra4PC2jrZGZISgIPvsv.png?aQjM')
    this.load.image('redEnemyMouthPartialOpenEyes1Wink', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20partially%20open%20eyes%201%20with%20one%20blinking-CuKxjBkQYU77bxH1e6KMS5tIdsz17T.png?G49S')
    this.load.image('redEnemyMouthPartialOpenEyes2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20partially%20open%20eyes%202-A43kcb28mR0IQbtfIU0KJJqBswRrlD.png?QDz4')
    this.load.image('redEnemyMouthWideOpenEyes1Wink', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20wide%20open%20eyes%201%20with%20one%20blinking-bYhh1tBYiobaJsDTFoTkLpbeTJY8vs.png?7MZ2')
    this.load.image('redEnemyMouthWideOpenEyes2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20wide%20open%20eyes%202-eeVDATMEgV6VQ9mPDfyEX1CFJPPr4W.png?RQBw')
    this.load.image('redEnemyMouthWideOpenEyes3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/mouth%20wide%20open%20eyes%203-BYXzuHGU9Dd18kQEB6bztT5k8jFhJt.png?IzuG')
    
    // Load green enemy sprites with eye animations (updated sprites)
    this.load.image('greenEnemy', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bouncer%20eye%20right-Lv7YvIjvADM6LmR0OfFEXE674NoQag.png') // Eye right (default)
    this.load.image('greenEnemyEyeCenter', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bouncer%20eye%20center-vxgpMOLHN5TR5FtXa3BLrddj1H4lzA.png')
    this.load.image('greenEnemyEyeLeft', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bouncer%20eye%20middle-JpsQ7yYaUP00AU4NCh54ULeIW6lLTK.png') // Using "middle" for left
    this.load.image('greenEnemyBlink', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/bouncer%20blinking-Syo5f9Tq7RWub8unCEcZbS7iuykZNI.png')
    
    // Load stalker enemy animation sprites (6 sprites for natural eye movement and blinking)
    this.load.image('stalkerEnemyEye1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/stalker%20enemy%20eye%201-Xt3Vtu2FiWWLT9l2wfeakBAqVSZet8.png?gS6O')
    this.load.image('stalkerEnemyEye2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/stalker%20enemy%20eye%202-n2c58R6bdpzzPAVlVRgMZoKmngtTUo.png?nTFi')
    this.load.image('stalkerEnemyEye3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/stalker%20enemy%20eye%203-K1hEnZ0oXDlCbLGCuJz1GD1YbYATZ6.png?safa')
    this.load.image('stalkerEnemyEye4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/stalker%20enemy%20eye%204-Y0pnlUUMFdmHY7HxQk2gGe9Nr41glQ.png?cgFm')
    this.load.image('stalkerEnemyBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/stalker%20enemy%20eye%205%20blinking-CPlBOBjLFGic1DKAwXNjnMpyRwBVgr.png?vYe6')
    this.load.image('stalkerEnemyEyeOnly', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/stalker%20enemy%20eye%20only-3BuhEI2UePG6So3jAYE5NPnoQTsnc0.png?6wB1')
    
    // Load new player sprite collection
    this.load.image('playerIdleEye1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Idle%20eye%20position%201-aD6V48lNdWK5R1x5CPNs4XLX869cmI.png?0XJy')
    this.load.image('playerIdleEye2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Idle%20eye%20position%202-oQdxdPT1VWpTLUelgIRXIHXFw5jEuu.png?nGbT')
    this.load.image('playerIdleBlink', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Idle%20eye%20position%20blinking-qmZlXgNwk3w2B610GpK1dkndEDFmEg.png?q97J')
    this.load.image('playerIdleEye3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/idle%20eye%20position%203-TLisG1UJypI7PhiKszpBcC8Nx8ZyrS.png?6Tg9')
    this.load.image('playerIdleEye4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/idle%20eye%20position%204-kvrv3THif8vcKjFB0NPzOeclqapVi6.png?PuWO')
    this.load.image('playerIdleEye5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/idle%20eye%20position%205-1P13Nmi3xqoC5kWevrWUxutqyXfr99.png?F4D2')
    this.load.image('playerClimbLeftFoot', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/climbing%20ladder%20left%20foot%20up-HkXPep0kpt9he1WtndEXsXRVHQBdlq.png?ncVM')
    this.load.image('playerClimbRightFoot', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/climbing%20ladder%20right%20foot%20up-hkc4X4pm3mSs1J3UpRQwRw8GhealC6.png?t8RZ')
    this.load.image('playerJumpLeftFoot', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/jumping%20left%20foot%20forward-DVmoTTdCOBfI9FRTg9vs949sTzKoOB.png?9FM5')
    this.load.image('playerJumpRightFoot', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/jumping%20right%20foot%20forward-3clf2KnwfbN3O6BsrtaeHSTAviNbnF.png?xx8e')
    this.load.image('playerRunLeftFoot', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20left%20foot%20forward%20new-aH3WiqHkbYLeW14yketC7EdmowlQ02.png?jLLJ')
    this.load.image('playerRunRightFoot', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Running%20right%20foot%20forward%202-aGnWjaFUNnYXwTfNKfSCfCLppOHzDU.png?mXmE')
    
    // Load new two-layer running sprites with eye variations
    this.load.image('playerRunBody', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body-bM1vl3T1vsaGXNpy1aSdQTw7y8yJWK.png?laFZ')
    this.load.image('playerRunBodyEyes2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%202-RdbQz9dbHYM8AMsZxEE7BLRbMD4rUT.png?AhxN')
    this.load.image('playerRunBodyEyes3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%203-L2mDyCxbHwvlp6DEq6gxihPbgctDYV.png?tasV')
    this.load.image('playerRunBodyEyes4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%204-ZfdYFT0Njqb5scTp0hVEzTo9Z9b2Cp.png?QE3U')
    this.load.image('playerRunBodyEyes5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%205-ukOG4fy50XhZTYC6nSIg466Fi8rS1I.png?Oeos')
    this.load.image('playerRunBodyEyes6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%206-Ce3qtFJFdtq95juwg15T9jLnK7kkWb.png?Gg1B')
    this.load.image('playerRunBodyEyes7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%207-QPAzARJE1Zzu1uOpV808LTO0Kaeoqo.png?7N69')
    this.load.image('playerRunBodyBlink', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/running%20body%20eyes%20blinking-tpJuDG5352O6gg9GHvj0owyZ7Vo4sy.png?eKh3')
    this.load.image('playerRunLegsBothDown', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/both%20feet%20down-Df4cKPxtG04wJmnzY3QzaUeW22F1BN.png?Iekl')
    this.load.image('playerRunLegsLeftMid', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/left%20foot%20up%20mid-DpJL6NyL9T7l7vzP8e2jfvpTJwvofR.png?rZfI')
    this.load.image('playerRunLegsLeftHigh', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/left%20foot%20up%20high-jcTqik4ucIuoIwjkuG5a8cmOe9vrDu.png?wU6d')
    this.load.image('playerRunLegsRightMid', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/right%20foot%20up%20mid-Qr5UwoShdZYlJJsGojNP8offBrp0yV.png?nrOQ')
    this.load.image('playerRunLegsRightHigh', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/right%20foot%20up%20high-e5syDsyAyHiLXqTbbeBGoyUIwV8ZTB.png?c7fW')
    
    // Load new treasure chest sprites (3 tiers)
    this.load.image('purple-chest', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/purple%20chest-4wMMVDFuAO3FpYyH7edWzeA3xVENZw.png?IkvS')
    this.load.image('teal-chest', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/teal%20chest-FpKKXWv5XWlb5H19IHW0G49DAm7Adb.png?Odul')
    this.load.image('yellow-chest', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/yellow%20chest-QMRMmVk9i7S0qkLteaXfhjqQBI351B.png?sE5u')
    
    // Load Crystal Ball power-up sprites
    this.load.image('crystalBallCollectible', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20ball%20collectible-BYMW8D53PB5JZUqKCfjKdI59qi0Yk8.png?rzg5')
    this.load.image('crystalBallProjectile', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20ball%20collectible-BYMW8D53PB5JZUqKCfjKdI59qi0Yk8.png?rzg5')
    this.load.image('crystalBallTimer', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20ball%20timer-DXFxS1g5ICpECl1vorurI4vQgShlfI.png?VWVq')
    
    // Load Cursed Power-up sprites
    this.load.image('cursedOrbCollectible', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/cursed%20orb-rHogWhnYUk2xThrTWajfHqMSfxeyfd.png?0wr6')
    this.load.image('cursedTealOrbCollectible', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/cursed%20teal%20orb-wupZvLrfiaRIZZyP4TbIOq5HLiVsXz.png?i2qV')
    this.load.image('cursedOrbTimer', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/cursed%20orb%20timer-5VBMFlHiVp24NkCpIhkDD4dc6fKiHK.png?hHIh')
    this.load.image('cursedTealOrbTimer', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/cursed%20teal%20orb%20timer-FAoT2eYLkUGfQRCCfS5qwZOkMvFBTg.png?FMZ7')
    
    // Load new door sprite
    this.load.image('door-sprite', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/treasure%20quest%20door-SX8un6qHvlx4mzlRYUC77dJ4lpBmOT.png?548U')
    
    // Load HUD icons
    this.load.image('door-hud-icon', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/door%20for%20hud-veW9YPgRL7GNNZWIF1VkHhGzn4MgcH.png?x2hT')
    this.load.image('crystal-hud-icon', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20hud%20icon-6cCEP7jp90eqI7W9LeBp7v4s3OgCPX.png?nMJm')
    
    // Load talking bubble sprite
    this.load.image('talking-bubble', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/go%20bizarre%20talking%20bubble-QlBbag1lDPx9SbnKTlgwwCZ12Fowh2.png?h0Cw')
    
    // Chapter splash screens are now loaded on-demand to improve initial load time
    
    // Load Crystal Cavern chapter backgrounds (levels 1-10)
    this.load.image('crystal-cavern-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%201-o5M2rYkM5ffKmdp8pMw6QzmR87KA0k.png?4qbf')
    this.load.image('crystal-cavern-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%202-Sdyqtq58gC1XVkllts47M2AzYOTgpX.png?0mX8')
    this.load.image('crystal-cavern-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%203-iE9A520YoUrX7GIVwgKojzeC0JuMlg.png?R6UH')
    this.load.image('crystal-cavern-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%204-oMun45XW8jHJAX8lWQ3HbOad2TL5gt.png?3ulH')
    this.load.image('crystal-cavern-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%205-AQS3zCiGE8QOqamLmdoOJ7SjecHlW8.png?d4aM')
    this.load.image('crystal-cavern-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%206-dqO5JRSPRzu4pkpC66pBTL416gw0iV.png?wGuc')
    this.load.image('crystal-cavern-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%207-rPVZWuJSGouJJHwzx0PYjHIJ9AWeOG.png?3QAw')
    this.load.image('crystal-cavern-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%208-AKdyp1OQa5qT20Wab5aCgnMKwpPEY9.png?ejNY')
    this.load.image('crystal-cavern-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%209-s5weyP0mb0UngvFh3FP3FS4s4OuVCo.png?QS83')
    this.load.image('crystal-cavern-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%2010-HpLzzcMARGk4bAxftjkS7AcaLC3ljt.png?AETo')
    
    // Backgrounds for other chapters are now loaded on-demand through BackgroundManager
    // This saves loading 54 unnecessary images at startup!
    
    // Keep original background as fallback
    this.load.image('crystal-cavern-bg', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/treasure%20quest%20background%20compressed-UKsRHy0KcxBQz6FuHbeLvlwcbd3LdS.png?ATB5')
    
    // Load yellow enemy animation sprites
    // Updated caterpillar sprites
    this.load.image('yellowEnemyMouthOpenEyeOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar1%20eyes%20open%20mouth%20open-lQoAdkobZ4H1EzQlITXFW8pLyuzlpU.png?vG8O')
    this.load.image('yellowEnemyMouthOpenBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar1%20eyes%20closed%20mouth%20open-jvUJJbRjevmC71Cgw86fpsQGJQkwGK.png?yXzx')
    this.load.image('yellowEnemyMouthClosedEyeOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar1%20eyes%20open%20mouth%20closed-6A2FG9PKDMrBHdE76pV9iALE66ogtp.png?L3eK')
    this.load.image('yellowEnemyMouthClosedBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar1%20eyes%20closed%20mouth%20closed-Fv7QiPIbIYgPuqmUeGF8Gu234h9Xie.png?nEys')
    
    // Load blue caterpillar variant sprites
    this.load.image('blueCaterpillarEyesRight', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar3%20eyes%20right-rgnZpnvBWDB5xqNXCcFANHRKrytkRu.png?wuBQ')
    this.load.image('blueCaterpillarEyesLeft', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar3%20eyes%20left-HsnjWSiRWtlaEQbj1rkVr1tbwQc9ky.png?gCNM')
    this.load.image('blueCaterpillarEyesDown', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar3%20eyes%20down-WvFuBIqZBj1tTCA5FZUSNSRakKAXY3.png?EWfJ')
    this.load.image('blueCaterpillarBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/caterpillar3%20eyes%20blinking-JvNYqKH2z9dUyLPOko1QE2GJXwuL36.png?vqim')
    
    // Load new gem collectible sprites
    this.load.image('gem-big-blue', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/big%20blue%20gem-GzKKZKUsDMh3CXMEIV4OmMl4ksrqqm.png?sill')
    this.load.image('gem-pink-round', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/pink%20round-E2EKGSTZHnnCdW0QkFmTDRKY7ERfw7.png?izQh')
    this.load.image('gem-yellow-emerald', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/yellow%20emerald-Z65ogfvE2NUX0AtxfwqgUKTooKPL1M.png?NJLZ')
    this.load.image('gem-purple-opal', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/purple%20opal-vq4CL7MxiGQDenIU0ZvqVQJJbWAvt5.png?GjQL')
    this.load.image('gem-teal-triangle', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/teal%20triangle-HVpi82a0c01MbkO92zYvH4tIN3CdMw.png?N700')
    this.load.image('gem-diamond', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/diamond-LB22Ijoji8erIrMFMvtSwd5Y9rDDwS.png?LlEv')
    this.load.image('heart-crystal', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/free%20life%20heart%20crystal-2EJMsIvSQKzdgrqytakBZcDbGf7Jpf.png?E1JG')
    this.load.image('invincibility-pendant', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/pendant-cJISby3d7EEREasbi0gRZkn2u3rNrG.png?xf9m')
    this.load.image('invincibility-timer', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/timer2-X3PMyQUgCU3fz146QaD9mBBy38e8Vw.png?Yy9W')

    // Load spike sprites
    this.load.image('yellow-ceiling-spike-tile', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/yellow%20spikes%20ceiling%20tile-8vq9W1Y2e1RSpgUfMl9sTp0ZILFHL3.png?mUEb')
    this.load.image('pink-floor-spike-tile', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/pink%20spikes%20floor%20tile-ncAVgIHazwYlznCBP4H6LWLiIhN7OF.png?n27v')
    
    // Load BaseBlu enemy sprites (9 eye positions)
    this.load.image('baseblue-eyes-center', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20center-BWjYc09iCwYsTuEB3TEsa7GdmDc4Nj.png?NZtQ')
    this.load.image('baseblue-eyes-down', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20down-Vtp9tuVzlbp29Cn3GqoEVHzSGyZLYX.png?u15t')
    this.load.image('baseblue-eyes-down-right', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20down%20right-eJGRVL9E1aqNPUimWVa0aoEEHbmMca.png?ObTg')
    this.load.image('baseblue-eyes-middle-right', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20middle%20right-ShBskufoh2zXFcfI5AHUCpx6ecnIWi.png?TizP')
    this.load.image('baseblue-eyes-up', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20up-lot6W1Y3ns3uhL8Xd59yoSCusiT48e.png?fMIa')
    this.load.image('baseblue-eyes-up-left', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20up%20left-biYISTHmHXS9VFQa63REv8KCGeHMC2.png?Fp2W')
    this.load.image('baseblue-eyes-middle-left', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20middle%20left-o5tw4V3qJ9gmASZ2TjaeUcJpD220CM.png?bL2r')
    this.load.image('baseblue-eyes-down-left', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20down%20left-8txJQ9OPVkMTkW0eaWprmvS5igTbqZ.png?hOzV')
    this.load.image('baseblue-eyes-blinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/baseblue%20eyes%20blinking-nZFjSjOXa1RAYpXPefApbKEET49sRr.png?96YM')

    // Load beetle sprites for biting animation
    this.load.image('beetle-mouth-closed', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beetle%20mouth%20closed-6ScuNGGsBgifOGHCCMext3ghafhXlB.png?XErn')
    this.load.image('beetle-mouth-open-30', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beetle%20mouth%20open%2030-HXSFqNWDpvxFnv2l35lrddto2TAyCk.png?sdgg')
    this.load.image('beetle-mouth-open-70', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beetle%20mouth%20open%2070-gToASj29g9XTDxUDHBKXDOfpYOKudu.png?uZh3')

    // Load Rex enemy sprites
    this.load.image('rexEyesOpen', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/rex%20eyes%20open-xKvtdvPdMIy13IjDLdWArsLxH3bi3m.png')
    this.load.image('rexBlinking', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/rex%20eyes%20blinking-ix1xWvDmRTfWQT1HB22Z4z0lYCST06.png')

    // Load background music - Crystal Cavern theme
    this.load.audio('background-music', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/CRYSTAL%20CAVERN%20-%20Treasure%20Quest%20-%20BizarreBeasts%20-%20MASTER%201-GnktEmoyUQQEEoFTBVrVAhEFyGRwL9.mp3?acKK')
    
    // Add load error handling for audio debugging
    this.load.on('loaderror', (file: any) => {
      console.error('❌ Failed to load audio file:', file.key, file.url)
    })
    
    this.load.on('filecomplete-audio-background-music', () => {
      console.log('✅ Background music file loaded successfully')
    })
    
    this.load.on('filecomplete-audio-splash-sound', () => {
      console.log('✅ Splash sound file loaded successfully')
    })
    
    // Load sound effects
    // Collection sounds
    this.load.audio('gem-collect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/regular%20gem%20collect%20sfx-OXLLrrAXWUz21oDTEuQPFb2fxRWxXh.wav?pH1V')
    this.load.audio('diamond-collect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/diamond%20collect%20sfx-V3aWJINX1e3OF5XZJFntg7WjpCup3Y.wav?A9QM')
    this.load.audio('big-blue-gem-collect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/big%20blue%20gem%20collect%20sfx-nYAUNJtHLMfNwACb6CM42eSQVAW6XG.wav?f8N2')
    this.load.audio('heart-collect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20collect%20heart%20sfx-7SPaWI2NI7kkVlgjjKbYXCDQuXI4sG.wav?N1rD')
    this.load.audio('cursed-orb-collect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/collect%20cursed%20orb%20or%20teal%20cursed%20orb-2KpSJv5Zd8lQ4OdgPtmn9YLlS0UqId.wav?ryTu')
    this.load.audio('powerup-collect', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/collect%20pendant%20or%20crystal%20ball-rEQiBqrl32yuqNts0U4A3Muol63Fxr.wav?eDiE')
    this.load.audio('treasure-chest-open', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/treasure%20chest%20opening%20sfx-qA8VU8UtwVC4fnaW67wfvM2IzTJRep.wav?WLuy')
    
    // Player movement sounds
    this.load.audio('jump-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20jumping%201%20sfx-Cfx219m2NwhVClkP67iebiwcV0HiF5.wav?GDjY')
    this.load.audio('jump-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20jumping%202%20sfx-UU3Gj2quONoFPk7SO3OI3koGgiSRGY.wav?4Zrt')
    this.load.audio('jump-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20jumping%203%20sfx-8h2X8f0XZJYeVB65fDYk4hth9h1G0O.wav?Wpvy')
    this.load.audio('player-land', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20lands%20after%20jump%20sfx-OoLEu6v6m6Oy51qVDCknLhjlMC3Awy.wav?xPtL')
    this.load.audio('footstep', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/foot%20step-XZmhUkf7XprYQzm2GbUVYaPZKeW6it.wav?3Vyp')
    
    // Crystal ball sounds
    this.load.audio('crystal-ball-throw', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/throw%20crystal%20ball%20sfx-oZfZHRmRnqebRdw2YrcMLR7LlLCMRp.wav?aKDe')
    this.load.audio('crystal-ball-bounce', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20ball%20bounce%20sfx-bOZrWB6YiMh6bedqvdLw3YaW63MZxO.wav?ORcs')
    this.load.audio('crystal-ball-hit-enemy', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20ball%20hits%20enemy-Rxq3kA6Q8rLBBb5PhGNdBhTI9AMo8W.wav?8sSG')
    
    // Level/UI sounds
    this.load.audio('continue-button', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/level%20complete%20continue%20button%20sfx-tKmarJUBWs3rQJhPDsv2IYj5oc8p5j.wav?V3lH')
    this.load.audio('door-open', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/door%20open%20sfx-LqGIt2ZSLGjCz0lSbuC6F6yusdC97e.wav?hCxN')
    this.load.audio('menu-toggle', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/menu%20sound-uBdZpD8zUrdGkuqw7jw0j9339NP2wC.wav?rHPB')
    
    // Player damage sounds
    this.load.audio('spike-hit', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20hits%20spikes%20sfx-Pt2SxNCgCXtyIz2jiBS3AYiCvYrp8X.wav?IM9a')
    this.load.audio('player-dies-enemy', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/player%20dies%20from%20enemy%20sfx-61hLKPCRlGrkam7zYIUuuWTwHFZXun.wav?d7C2')
    
    // Game over sound
    this.load.audio('game-over', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/game%20over%20sfx-CcqXjJvB1fNTt9i31KIzjv0KLNN6CF.wav?OQAX')
    
    // Enemy-specific squish sounds
    this.load.audio('squish-caterpillar', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/enemy%20squish%201%20sfx-Q07M71fpvcarGwZ67kaOsiFBD8hQw9.wav?eCQ1') // Yellow cat
    this.load.audio('squish-beetle', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Rollz%20squish%20sfx-ENEJDyuGH2imVNsLezuv5w3TzofWsG.wav?caYG') // Rollz beetle
    this.load.audio('squish-chomper', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/enemy%20squish%202-euwtmXFPsH1NH9XQzixjo6lgeA7Nxd.wav?6rLZ') // Blue cat
    this.load.audio('squish-snail', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/enemy%20squish%203-22EnbLa2GEVZPJCf7zWpqhYHS6V4K2.wav?h9e6') // Red cat
    this.load.audio('squish-jumper', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/enemy%20squish%201%20sfx-MBkO4SrZ1IVUJ6jqjHWa5L0NURtkJH.wav?qytP') // Green bouncer
    this.load.audio('squish-stalker', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/enemy%20squish%203-22EnbLa2GEVZPJCf7zWpqhYHS6V4K2.wav?h9e6') // Red stalker (same as snail)
    this.load.audio('squish-baseblu', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/blu%20squish%20sound-E5dxYXO43VnhG528IWOuy39JyeqnOf.wav?2NUq') // BaseBlu
    this.load.audio('squish-rex', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/rex%20squish%20sound-ZUynOxrurJ001uUoNvxJPYAg8dlChO.wav?FwYW') // Rex
    
    // Load new custom floor tiles
    this.load.image('floor-tile-1', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%201-jbZVv42Z0BQYmH6sJLCOBTJs4op2eT.png?mhnt')
    this.load.image('floor-tile-2', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%202-EuITFMsdSDebMUmfcikeKCDLqDupml.png?C2mi')
    this.load.image('floor-tile-3', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%203-EBjnmTXXufdUFEuzmfnGnaZX4zdI2C.png?69bT')
    this.load.image('floor-tile-4', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%204-ecTwalLp4rzl9hegwIwVMuDBeN1YVJ.png?nxJJ')
    this.load.image('floor-tile-5', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%205-mkUa3smxguUC6BG0k4RBp1L7YemLPJ.png?8kU2')
    this.load.image('floor-tile-6', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%206-P5Eo0dOoipZmfiQ31gzPPNV178XDQz.png?K1oC')
    this.load.image('floor-tile-7', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%207-nTcRVMkcmKM9dgxMMr6Fzs7Enekla1.png?cfe2')
    this.load.image('floor-tile-8', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%208-ImcB9SO68kMOGAn6qXP0aioPKPbNxx.png?znlI')
    this.load.image('floor-tile-9', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%209-VmOFC6UshXy3GJTAyKE5zi7p1oIyAJ.png?oTOf')
    this.load.image('floor-tile-10', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%2010-SX5i2rG63ddgysEAxLTRNQvfngiFaS.png?2Bsf')
    this.load.image('floor-tile-11', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%2011-JwdJf9Mmt0lEbFBGGwurBaYJL3uykp.png?w4JY')
    this.load.image('floor-tile-12', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/Floor%2012-yBmCpaIQiiV7MeRoxI54ACeE3W2f27.png?9jIm')
    
    // Start pooled loading for advanced error handling and retries
    this.assetPool.loadAllAssets().then(() => {
      // All assets loaded via AssetPool (replaced console.log)
      
      // Mark that assets are ready
      this.registry.set('assetsReady', true)
    }).catch((error) => {
      console.error('Asset loading failed:', error)
      // Still mark as ready so game can continue with fallbacks
      this.registry.set('assetsReady', true)
    })
  }

  // WARNING: DUPLICATE init() METHOD #2 - DO NOT DELETE WITHOUT CHECKING WITH DYLAN FIRST
  // This is the second init() method (first one is around line ~158)
  // This duplication may be intentional for specific loading/initialization behavior
  init(data?: any): void {
    // Store flag to reopen menu after scene is ready
    this.reopenMenuAfterInit = data?.reopenMenu || false
    
    // Check if this is a continue after death
    const isDeathRetry = this.game.registry.get('isDeathRetry') || false
    const playerLives = this.game.registry.get('playerLives') || 0
    
    // Set flag to show loading screen ONLY if this is NOT a replay or death retry
    // On replay/continue, we skip the loading screen since assets are already loaded
    const isReplay = this.game.registry.get('isReplay') || false
    const skipLoadingScreen = isReplay || (isDeathRetry && playerLives > 0)
    this.showLoadingScreen = !skipLoadingScreen
    
    console.log(`🎬 Loading screen decision (2nd init): isReplay=${isReplay}, isDeathRetry=${isDeathRetry}, skip=${skipLoadingScreen}, SHOW=${this.showLoadingScreen}`)
    
    // Set dark purple background to match instructions background color
    // This minimizes the visual jump during the brief preload phase
    this.cameras.main.setBackgroundColor('#1a0033')
  }

  private reopenMenuAfterInit: boolean = false

  create(): void {
    console.log('🎮 GameScene.create() started at', performance.now())
    console.log('📊 showLoadingScreen flag:', this.showLoadingScreen)
    
    // Show wallet button now that game has started (after splash)
    const platform = this.game.registry.get('platform') || (window as any).platform || (window as any).gamePlatform;
    if (platform && platform.showWalletButton) {
      platform.showWalletButton();
    }
    
    // Debug logging for alignment issues
    console.log('🎯 Scene Dimensions:', {
      game: {
        width: this.game.config.width,
        height: this.game.config.height,
        resolution: this.game.config.resolution
      },
      camera: {
        width: this.cameras.main.width,
        height: this.cameras.main.height,
        x: this.cameras.main.x,
        y: this.cameras.main.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY
      },
      physics: {
        worldBounds: this.physics.world.bounds,
        gravity: this.physics.world.gravity
      },
      scale: {
        gameSize: this.scale.gameSize,
        parentSize: this.scale.parentSize,
        displaySize: this.scale.displaySize,
        mode: this.scale.scaleMode
      }
    })
    
    // Create loading screen if we're coming from instructions
    if (this.showLoadingScreen) {
      console.log('🎨 Creating loading screen elements...')
      const width = this.cameras.main.width
      const height = this.cameras.main.height
      console.log(`📐 Screen dimensions: ${width}x${height}`)
      
      // Create container for loading elements
      this.loadingOverlay = this.add.container(0, 0)
      this.loadingOverlay.setDepth(10000)
      console.log('📦 Loading container created')
      
      // Try to use instructions background if available
      if (this.textures.exists('instructionsBg')) {
        console.log('🎨 Using instructions background image')
        const bgImage = this.add.image(width / 2, height / 2, 'instructionsBg')
        
        // Scale to cover entire screen
        const scaleX = width / bgImage.width
        const scaleY = height / bgImage.height
        const scale = Math.max(scaleX, scaleY)
        bgImage.setScale(scale)
        
        this.loadingOverlay.add(bgImage)
        
        // Add semi-transparent overlay to make text more readable
        const darkOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
        this.loadingOverlay.add(darkOverlay)
        console.log('🖼️ Instructions background added with overlay')
      } else {
        // Fallback to solid purple background
        console.log('⚠️ Instructions background not found, using solid color')
        const loadingBg = this.add.rectangle(width / 2, height / 2, width, height, 0x4d007e, 1)
        this.loadingOverlay.add(loadingBg)
        console.log('🟪 Purple background added')
      }
      
      // "GOING BIZARRE" text with pink color and game font
      const loadingText = this.add.text(width / 2, height / 2 - 60, 'GOING BIZARRE', {
        fontFamily: '"Press Start 2P", system-ui',
        fontSize: '28px',
        color: '#FF69B4',
        align: 'center'
      })
      loadingText.setOrigin(0.5)
      loadingText.setShadow(2, 2, '#8B008B', 4, false, true)
      this.loadingOverlay.add(loadingText)
      console.log('💗 GOING BIZARRE text added')
      
      // Progress bar background
      const barWidth = width * 0.6
      const barHeight = 24
      const barX = width / 2
      const barY = height / 2 + 10
      console.log(`📊 Progress bar dimensions: ${barWidth}x${barHeight} at (${barX}, ${barY})`)
      
      const progressBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x4B0082)
      progressBarBg.setStrokeStyle(3, 0xFF69B4)
      this.loadingOverlay.add(progressBarBg)
      console.log('📊 Progress bar background added')
      
      // Progress bar fill (starts empty)
      const progressBar = this.add.rectangle(
        barX - barWidth / 2 + 2,
        barY,
        0,
        barHeight - 6,
        0xFF69B4
      )
      progressBar.setOrigin(0, 0.5)
      this.loadingOverlay.add(progressBar)
      console.log('📊 Progress bar fill added (starting at 0 width)')
      
      // Percentage text with game font
      const percentText = this.add.text(width / 2, height / 2 + 50, '0%', {
        fontFamily: '"Press Start 2P", system-ui',
        fontSize: '16px',
        color: '#FF69B4',
        align: 'center'
      })
      percentText.setOrigin(0.5)
      this.loadingOverlay.add(percentText)
      console.log('💯 Percentage text added')
      
      // Animate progress bar
      let progress = 0
      console.log('⏱️ Starting progress animation')
      const progressTimer = this.time.addEvent({
        delay: 30, // Back to original speed
        callback: () => {
          if (progress < 100) {
            progress = Math.min(progress + 2, 100)
            const displayProgress = Math.floor(progress)
            progressBar.width = (barWidth - 6) * (progress / 100)
            percentText.setText(`${displayProgress}%`)
            
            // Log progress every 20%
            if (displayProgress % 20 === 0 && displayProgress > 0) {
              console.log(`📈 Progress: ${displayProgress}%`)
            }
            
            // When we hit 100%, remove the overlay after a short delay
            if (progress >= 100) {
              console.log('✅ Progress complete, removing overlay in 200ms')
              this.time.delayedCall(200, () => {
                if (this.loadingOverlay) {
                  console.log('🗑️ Destroying loading overlay')
                  this.loadingOverlay.destroy()
                  this.loadingOverlay = null
                }
                // Set black background for game
                console.log('⬛ Setting black background for game')
                this.cameras.main.setBackgroundColor('#000000')
                
                // Now check for chapter splash after loading screen is done
                this.checkForChapterSplash()
              })
            }
          }
        },
        repeat: -1
      })
      console.log('📊 Progress timer started')
    } else {
      // No loading screen needed, set black background immediately
      this.cameras.main.setBackgroundColor('#000000')
      // Check for chapter splash immediately if no loading screen
      this.checkForChapterSplash()
    }
    
    console.log('🎨 Scene initialized')
  }
  
  private checkForChapterSplash(): void {
    // Reset the replay flag after using it
    // This ensures that if player manually restarts (not through SDK), they see splash screen again
    if (this.game.registry.get('isReplay')) {
      this.game.registry.set('isReplay', false)
    }
    
    // Check for chapter splash FIRST before anything else
    const chapterLevels = [1, 11, 21, 31, 41, 51]
    const currentLevelCheck = this.game.registry.get('currentLevel') || 1
    console.log(`📊 Current level: ${currentLevelCheck}`)
    
    // Check if we need to show a splash screen after bonus level
    const needsChapterSplash = this.game.registry.get('showChapterSplash') === true
    const splashLevel = this.game.registry.get('chapterSplashLevel') || currentLevelCheck
    
    if (needsChapterSplash) {
      console.log(`🎯 Showing chapter splash after bonus for level ${splashLevel}`)
      // Clear the flags
      this.game.registry.set('showChapterSplash', false)
      this.game.registry.remove('chapterSplashLevel')
      
      // Mark this splash as shown
      const splashShownKey = `chapterSplashShown_${splashLevel}`
      this.game.registry.set(splashShownKey, true)
      
      // Show chapter splash and delay game initialization
      this.showChapterSplashScreen(splashLevel, () => {
        console.log('✅ Splash complete after bonus, initializing game')
        // Initialize game state and set flag for intro animation
        this.initializeGameState()
        this.game.registry.set('levelProgression', true)
        this.initializeGameAfterSplash()
      })
      return // Exit early - game will be initialized after splash
    }
    
    // Check if we've already shown this chapter's splash (only show once per game session)
    const splashShownKey = `chapterSplashShown_${currentLevelCheck}`
    const splashAlreadyShown = this.game.registry.get(splashShownKey) === true
    
    // Also check if this is a death restart (player has lives remaining from a previous death)
    const isDeathRestart = this.game.registry.has('playerLives') && this.game.registry.get('playerLives') > 0
    
    if (chapterLevels.includes(currentLevelCheck) && !splashAlreadyShown && !isDeathRestart) {
      console.log(`🎬 Chapter splash needed for level ${currentLevelCheck} (first time)`)
      
      // Mark this splash as shown
      this.game.registry.set(splashShownKey, true)
      
      // Show chapter splash and delay game initialization
      this.showChapterSplashScreen(currentLevelCheck, () => {
        console.log('✅ Splash complete, initializing game')
        // Initialize game state and set flag for intro animation
        this.initializeGameState()
        this.game.registry.set('levelProgression', true)
        this.initializeGameAfterSplash()
      })
      return // Exit early - game will be initialized after splash
    }
    
    console.log('⏩ No splash needed, initializing game immediately')
    // No splash needed, initialize game immediately
    this.initializeGameState()
    this.initializeGameAfterSplash()
  }
  
  private getChapterSplashUrl(level: number): string {
    // Check if this is dgen1 version
    const isDgen1 = this.registry.get('isDgen1') || window.location.port === '3001';
    
    // DGEN1 ONLY - Always use 720x720 chapter splash URLs
    const dgen1SplashUrls: { [key: number]: string } = {
      1: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/crystal%20caverns%20splash%20page%20dgen1-fOxjnn8s5iQTzCwVP6HTwo2oZnoWlN.png?V8Du',
      11: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/volcano%20crystal%20caverns%20splash%20page%20dgen1-MoVRItepiBcZZdhmpb1d5ullyQ725t.png?8mEz',
      21: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/steampunk%20crystal%20caverns%20splash%20page%20dgen1-B4jgMlUeWbOa7kvIZfra56G4UiUFoY.png?lJqO',
      31: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/electrified%20crystal%20caverns%20splash%20page%20dgen1-RJXfreqjj1XpJaMYUsYJBansc4BTAJ.png?B3oR',
      41: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/galactic%20crystal%20caverns%20splash%20page%20dgen1-zSJaaqpe1StXM8hf8IoYDYjx4vIsAz.png?Az4J',
      51: 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/beast%20mode%20crystal%20caverns%20splash%20page%20dgen1-6RPxHcIi1lHMpFEHGCwglRqzwKdNjW.png?Riu8'
    }
    return dgen1SplashUrls[level] || ''
  }
  
  // Method no longer needed - moved to init()
  // Keeping empty method to avoid breaking any existing calls
  private showPreloadChapterScreen(): void {
    // Loading screen is now shown in init() before preload
  }

  private showChapterSplashScreen(level: number, onComplete: () => void): void {
    console.log(`🖼️ Creating splash screen for level ${level} at`, performance.now())
    
    // Clean up any loading screen elements
    if (this.instantLoadingScreen) {
      this.instantLoadingScreen.destroy()
      this.instantLoadingScreen = undefined
    }
    if (this.preloadChapterText) {
      this.preloadChapterText.destroy()
      this.preloadChapterText = undefined
    }
    if (this.preloadLoadingText) {
      this.preloadLoadingText.destroy()
      this.preloadLoadingText = undefined
    }
    
    const splashKey = `chapter-${level}`
    
    // Check if splash image is already loaded
    if (!this.textures.exists(splashKey)) {
      console.log(`📥 Loading chapter splash on-demand: ${splashKey}`)
      const splashUrl = this.getChapterSplashUrl(level)
      
      if (!splashUrl) {
        console.warn(`⚠️ No splash URL found for level ${level}`)
        onComplete()
        return
      }
      
      // Load the splash image on-demand
      this.load.image(splashKey, splashUrl)
      this.load.once('complete', () => {
        console.log(`✅ Splash loaded: ${splashKey}`)
        this.displayChapterSplash(level, onComplete)
      })
      this.load.start()
    } else {
      // Splash already loaded, display immediately
      this.displayChapterSplash(level, onComplete)
    }
  }
  
  private displayChapterSplash(level: number, onComplete: () => void): void {
    const splashKey = `chapter-${level}`
    
    // Show the chapter splash image IMMEDIATELY at full opacity
    const splashImage = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      splashKey
    )
    console.log(`📷 Splash image created: ${splashKey}`)
    
    // Scale to fill screen
    const scaleX = this.cameras.main.width / splashImage.width
    const scaleY = this.cameras.main.height / splashImage.height
    const scale = Math.max(scaleX, scaleY)
    splashImage.setScale(scale)
    splashImage.setDepth(10001)
    splashImage.setScrollFactor(0)
    splashImage.alpha = 1 // Start at full opacity - no fade in needed
    console.log(`📐 Image scaled: ${scale.toFixed(2)}x, showing immediately`)
    
    // Wait 2 seconds then fade out and continue
    console.log('⏱️ Starting 2 second timer')
    this.time.delayedCall(2000, () => {
      console.log('⏰ Timer complete, starting fade out')
      
      // Create black background for fade transition
      const fadeOutBg = this.add.graphics()
      fadeOutBg.fillStyle(0x000000, 0) // Start transparent
      fadeOutBg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
      fadeOutBg.setDepth(10002)
      fadeOutBg.setScrollFactor(0)
      
      // Fade splash image out while fading black in for smooth transition
      this.tweens.add({
        targets: splashImage,
        alpha: 0,
        duration: 500, // Slower fade out for splash image
        ease: 'Power2'
      })
      
      // Fade to black slightly slower for smoother transition
      this.tweens.add({
        targets: fadeOutBg,
        alpha: 1,
        duration: 400, // Slightly faster than image fade for overlap
        ease: 'Power2.easeInOut',
        onComplete: () => {
          console.log('🗑️ Destroying splash elements')
          splashImage.destroy()
          
          // Keep black screen briefly then fade it out as game starts
          this.tweens.add({
            targets: fadeOutBg,
            alpha: 0,
            duration: 300,
            delay: 100, // Small delay before fading out black
            ease: 'Power2.easeOut',
            onComplete: () => {
              fadeOutBg.destroy()
              onComplete()
            }
          })
        }
      })
    })
  }
  
  private initializeGameState(): void {
    // Initialize level manager if needed
    if (!this.levelManager) {
      this.levelManager = new LevelManager()
    }
    
    // Get current level from registry, default to level 1
    const currentLevelFromRegistry = this.game.registry.get('currentLevel') || 1
    // Sync level manager with registry
    this.levelManager.setCurrentLevel(currentLevelFromRegistry)
    
    // Clear any cached level from localStorage
    localStorage.removeItem('treasureQuest_currentLevel')
    
    // Reset game state
    this.isGameOver = false
    this.isLevelComplete = false
    this.currentFloor = 0
    this.highestFloorGenerated = 5
    
    // Use game registry to persist lives and coins across scene restarts
    const registry = this.game.registry
    
    // CLEANUP: Remove old incorrect 'lives' key if it exists
    if (registry.has('lives')) {
      console.warn(`⚠️ Cleaning up old 'lives' registry key`)
      registry.remove('lives')
    }
    
    // Check if this is a level progression (not a death/restart)
    const isLevelProgression = registry.has('levelProgression') && registry.get('levelProgression') === true
    
    if (isLevelProgression) {
      // Level progression - move current score to accumulated, start new level fresh
      this.accumulatedScore = registry.get('accumulatedScore') || 0
      this.score = 0 // Start new level with 0 current score
      this.lives = registry.get('playerLives') || 3
      // Validate lives count
      if (this.lives < 0 || this.lives > this.MAX_LIVES) {
        console.error(`🔴 Invalid lives count detected: ${this.lives}, resetting to 3`)
        this.lives = 3
        registry.set('playerLives', this.lives)
      }
      this.totalCoinsCollected = registry.get('totalCoins')
      this.totalGemsCollected = registry.get('totalGems') || 0
      this.totalBlueGemsCollected = registry.get('totalBlueGems') || 0
      this.totalDiamondsCollected = registry.get('totalDiamonds') || 0
      this.livesEarned = registry.get('livesEarned') || 0
      console.log(`🎮 Level progression - Lives: ${this.lives}, Gems: ${this.totalCoinsCollected}`)
      // Don't clear the progression flag here - it's needed for intro animation
    } else if (registry.has('playerLives') && registry.get('playerLives') > 0) {
      // Restore from registry (level restart after losing life)
      this.lives = registry.get('playerLives')
      // Validate lives count
      if (this.lives < 0 || this.lives > this.MAX_LIVES) {
        console.error(`🔴 Invalid lives count detected: ${this.lives}, resetting to 3`)
        this.lives = 3
        registry.set('playerLives', this.lives)
      }
      // Keep accumulated score from completed levels, reset only current level
      this.accumulatedScore = registry.get('accumulatedScore') || 0
      this.score = 0 // Reset current level score
      this.totalCoinsCollected = registry.get('totalCoins')
      this.totalGemsCollected = registry.get('totalGems') || 0
      this.totalBlueGemsCollected = registry.get('totalBlueGems') || 0
      this.totalDiamondsCollected = registry.get('totalDiamonds') || 0
      this.livesEarned = registry.get('livesEarned') || 0
      console.log(`🎮 Death restart - Lives: ${this.lives}, Gems: ${this.totalCoinsCollected}`)
    } else {
      // New game - initialize defaults
      this.lives = 3
      this.score = 0
      this.accumulatedScore = 0
      this.totalCoinsCollected = 0
      this.totalGemsCollected = 0
      this.totalBlueGemsCollected = 0
      this.totalDiamondsCollected = 0
      this.livesEarned = 0
      
      console.log(`🎮 New game started - Lives: ${this.lives}`)
      
      // Clear all registry values for fresh start
      registry.set('playerLives', this.lives)
      registry.set('totalCoins', 0)
      registry.set('totalGems', 0)
      registry.set('totalBlueGems', 0)
      registry.set('totalDiamonds', 0)
      registry.set('livesEarned', 0)
      registry.set('accumulatedScore', 0)
      registry.set('currentScore', 0)
      registry.set('accumulatedDiamonds', 0)
      
      // Clear all chapter splash shown flags for new game
      const chapterLevels = [1, 11, 21, 31, 41, 51]
      chapterLevels.forEach(level => {
        registry.remove(`chapterSplashShown_${level}`)
      })
    }
    
    // Reset per-level collections (not persisted)
    this.gemsCollectedThisLevel = 0
    this.blueGemsCollectedThisLevel = 0
    this.diamondsCollectedThisLevel = 0
    
    // Calculate accumulated diamonds (for display)
    this.accumulatedDiamonds = registry.get('accumulatedDiamonds') || 0
  }

  private async initializeGameAfterSplash(): Promise<void> {
    // Initialize background manager
    this.backgroundManager = new BackgroundManager(this)
    
    // Select background based on current level
    const currentLevel = this.levelManager?.getCurrentLevel() || 1
    const isInBonus = this.levelManager?.isBonusLevel() || false
    
    // Load current chapter's backgrounds if not already loaded
    const currentChapter = this.backgroundManager.getChapterForLevel(currentLevel, isInBonus)
    if (currentChapter !== 'crystal_cavern') {
      // Crystal Cavern is already loaded in preload, others need on-demand loading
      await this.backgroundManager.loadChapterBackgrounds(currentChapter)
    }
    
    this.currentBackground = this.backgroundManager.getBackgroundForLevel(currentLevel, isInBonus)
    
    // Add current background (first, so it appears behind everything)
    const background = this.add.image(0, 0, this.currentBackground)
    background.setOrigin(0, 0) // Position from top-left corner
    background.setDepth(-100) // Behind everything
    background.setScrollFactor(0.05) // Subtle parallax effect
    
    // Scale background to fill entire game area, ensuring full coverage
    const gameWidth = this.cameras.main.width
    const gameHeight = this.cameras.main.height
    const scaleX = gameWidth / background.width
    const scaleY = gameHeight / background.height
    // Use larger scale and add extra coverage to ensure no gaps
    const scale = Math.max(scaleX, scaleY) * 1.2 // 20% larger to ensure full coverage
    background.setScale(scale)
    
    // Position background centered for optimal coverage with 2000x2000 image
    const initialY = (gameHeight - background.height * scale) / 2
    background.setPosition(
      (gameWidth - background.width * scale) / 2,
      initialY
    )
    
    // Store background reference and properties for dynamic repositioning
    this.backgroundSprite = background
    this.backgroundInitialY = initialY
    this.backgroundHeight = background.height * scale
    
    // Enable multi-touch support
    this.input.addPointer(2) // Allow up to 3 pointers total (default 1 + 2 more)
    
    // Setup Farcade SDK event handlers
    this.setupFarcadeEventHandlers()
    
    // Game state is already initialized in initializeGameState() called earlier
    
    // No longer generating textures - using preloaded images instead
    // this.generateTileTextures()
    
    // Reset smart tile placement tracking for new level
    this.recentTiles = []
    this.tileGrid.clear()
    this.tileUsageCount = new Array(12).fill(0) // Now we have 12 tiles instead of 15
    
    // Create platform and ladder groups
    this.platforms = this.physics.add.staticGroup()
    this.ladders = this.physics.add.staticGroup()
    
    // Create spikes group for environmental hazards
    this.spikes = this.physics.add.staticGroup()
    
    // Create cats group
    this.cats = this.physics.add.group({
      classType: Cat,
      runChildUpdate: true
    })
    
    // Create stalker cats group  
    this.stalkerCats = this.physics.add.group({
      classType: Cat,
      runChildUpdate: true
    })
    
    // Create BaseBlu enemies group
    this.baseBlus = this.physics.add.group({
      classType: BaseBlu,
      runChildUpdate: true
    })

    // Create beetles group
    this.beetles = this.physics.add.group({
      classType: Beetle,
      runChildUpdate: true
    })
    
    // Create Rex enemies group
    this.rexEnemies = this.physics.add.group({
      classType: Rex,
      runChildUpdate: true
    })
    
    // Initialize collectibles arrays
    this.coins = []
    this.blueCoins = []
    this.diamonds = []
    this.treasureChests = []
    // this.flashPowerUps = [] // Commented out for later use
    this.crystalBalls = []
    this.freeLifs = []
    this.invincibilityPendants = []
    this.levelHasCrystalBall = false
    
    // Create mining theme background - DISABLED (using custom background image instead)
    // this.createMiningThemeBackground()
    
    // Create the level
    this.createTestLevel()
    
    // Create the player (starts off-screen for walk-in animation)
    // Position spawn at fourth floor tile from the left (tile 3, 0-indexed)
    const tileSize = GameSettings.game.tileSize
    const spawnX = (3.5 * tileSize) // Fourth tile center (tile 3)
    // Calculate spawn position based on actual canvas height
    const groundFloorY = GameSettings.canvas.height - GameSettings.game.tileSize // Ground at Y=688 for 720px
    // Match the exact position from intro animation
    // Player physics body: 18x49 with offset (15, 12)
    // We want physics body bottom at groundFloorY (688), so:
    // y + 29 = 688, therefore y = 659
    const spawnY = groundFloorY - 29  // This matches the intro animation end position
    
    console.log('👤 Player Spawn Calculation:', {
      canvasHeight: GameSettings.canvas.height,
      groundFloorY: groundFloorY,
      spawnY: spawnY,
      spawnX: spawnX
    })
    
    
    this.player = new Player(
      this, 
      100,  // Start at ladder position
      GameSettings.canvas.height + 100  // Start below screen
    )
    
    // Check if this is a death/retry or a new level
    const gameRegistry = this.game.registry
    const hasStoredLives = gameRegistry.has('playerLives')
    const levelProgression = gameRegistry.get('levelProgression')
    const isPageRefresh = !hasStoredLives || gameRegistry.get('playerLives') === 3 // Fresh start or full lives
    
    // Show animation for: new game (page refresh) OR level progression  
    const shouldShowAnimation = isPageRefresh || levelProgression
    
    if (!shouldShowAnimation) {
      // Death/retry - skip intro animation, spawn directly
      // Death/retry detected - skipping intro animation (replaced console.log)
      this.player.setPosition(spawnX, spawnY)
      this.player.body!.enable = true
      this.isLevelStarting = false
      this.changePlayerTexture('playerIdleEye1')
      this.showStartBanner()
      
      // Notify Farcade SDK that game is ready
      this.notifyFarcadeGameReady()
    } else {
      // New level - show intro animation
      // New level - showing intro animation (replaced console.log)
      // IMMEDIATELY disable physics to prevent falling before intro
      this.player.body!.enable = false
      // Player physics disabled to prevent falling (replaced console.log)
      
      // Start intro immediately - assets will be checked during animation
      this.startLevelIntro(spawnX, spawnY)
    }
    
    // Create temporary floor grid for positioning reference
    // this.createTemporaryFloorGrid()
    
    // Add some cats to test (pass floor layouts)
    // About to call createCats() (replaced console.log)
    this.createCats()
    // createCats() call completed (replaced console.log)
    
    // Stalker cats are now created through the enemy spawning system
    // No longer need separate stalker spawning - they're integrated into the main system
    
    // Add ceiling spikes
    this.createCeilingSpikes()
    
    // Add collectibles
    this.createAllCollectibles()
    
    // Create door at top floor for level completion
    this.createLevelEndDoor()
    
    // Set up collisions (with condition check for climbing)
    this.physics.add.collider(
      this.player, 
      this.platforms,
      undefined,
      this.shouldCollideWithPlatform,
      this
    )
    
    // Cats collide with platforms and FLOOR spikes only (floor spikes act like platforms for enemies)
    this.physics.add.collider(this.cats, this.platforms)
    this.physics.add.collider(this.beetles, this.platforms)
    this.physics.add.collider(this.rexEnemies, this.platforms)
    // Custom collision for spikes - only collide with floor spikes, not ceiling spikes
    this.physics.add.collider(
      this.cats, 
      this.spikes,
      undefined, // No callback needed
      (cat, spike) => {
        // Process callback - return true to collide, false to pass through
        const spikeObj = spike as Phaser.GameObjects.Rectangle
        const isFloorSpike = spikeObj.getData('isFloorSpike')
        // Only collide with floor spikes, pass through ceiling spikes
        return isFloorSpike === true
      },
      this
    )
    
    // Beetles also need to collide with floor spikes to walk across them
    this.physics.add.collider(
      this.beetles,
      this.spikes,
      undefined, // No callback needed
      (beetle, spike) => {
        // Process callback - return true to collide, false to pass through
        const spikeObj = spike as Phaser.GameObjects.Rectangle
        const isFloorSpike = spikeObj.getData('isFloorSpike')
        // Only collide with floor spikes, pass through ceiling spikes
        return isFloorSpike === true
      },
      this
    )
    
    // Rex enemies also need to collide with floor spikes to walk across them
    this.physics.add.collider(
      this.rexEnemies,
      this.spikes,
      undefined, // No callback needed
      (rex, spike) => {
        // Process callback - return true to collide, false to pass through
        const spikeObj = spike as Phaser.GameObjects.Rectangle
        const isFloorSpike = spikeObj.getData('isFloorSpike')
        // Only collide with floor spikes (pink spikes), pass through ceiling spikes
        return isFloorSpike === true
      },
      this
    )
    
    // Stalker cats collide with platforms and floor spikes (after dropping)
    this.physics.add.collider(this.stalkerCats, this.platforms)
    // Stalker cats also only collide with floor spikes, not ceiling spikes
    this.physics.add.collider(
      this.stalkerCats, 
      this.spikes,
      undefined,
      (cat, spike) => {
        const spikeObj = spike as Phaser.GameObjects.Rectangle
        const isFloorSpike = spikeObj.getData('isFloorSpike')
        return isFloorSpike === true
      },
      this
    )
    
    // Cats collide with each other and reverse direction
    this.physics.add.collider(
      this.cats,
      this.cats,
      this.handleCatCatCollision,
      // Process callback to determine if collision should happen
      (cat1: any, cat2: any) => {
        const catObj1 = cat1 as Cat
        const catObj2 = cat2 as Cat
        
        // Check if either cat is a jumper (green) or caterpillar (yellow)
        const cat1CanPassThrough = catObj1.getCatColor() === 'green' || catObj1.getCatColor() === 'yellow'
        const cat2CanPassThrough = catObj2.getCatColor() === 'green' || catObj2.getCatColor() === 'yellow'
        
        // Return false to prevent collision if either enemy can pass through
        if (cat1CanPassThrough || cat2CanPassThrough) {
          return false // No collision
        }
        
        return true // Allow collision for other enemy types
      },
      this
    )
    
    // Player vs cat collision - check for jump-to-kill vs damage
    this.physics.add.overlap(
      this.player,
      this.cats,
      this.handlePlayerCatInteraction,
      undefined,
      this
    )
    
    // Player vs stalker cat collision - check for jump-to-kill vs damage  
    this.physics.add.overlap(
      this.player,
      this.stalkerCats,
      this.handlePlayerStalkerCatInteraction,
      undefined,
      this
    )

    // Player vs beetle collision - check for jump-to-kill vs damage  
    this.physics.add.overlap(
      this.player,
      this.beetles,
      this.handlePlayerBeetleInteraction,
      undefined,
      this
    )
    
    // Player vs Rex collision - check for jump-to-kill vs damage
    this.physics.add.overlap(
      this.player,
      this.rexEnemies,
      this.handlePlayerRexInteraction,
      undefined,
      this
    )
    
    // BaseBlu collisions
    this.physics.add.collider(this.baseBlus, this.platforms)
    // BaseBlu also needs to collide with floor spikes to walk across them
    this.physics.add.collider(
      this.baseBlus,
      this.spikes,
      undefined, // No callback needed
      (baseBlu, spike) => {
        // Process callback - return true to collide, false to pass through
        const spikeObj = spike as Phaser.GameObjects.Rectangle
        const isFloorSpike = spikeObj.getData('isFloorSpike')
        // Only collide with floor spikes, pass through ceiling spikes
        return isFloorSpike === true
      },
      this
    )
    
    // Player vs BaseBlu collision - solid obstacle with special interactions
    this.physics.add.collider(
      this.player,
      this.baseBlus,
      this.handlePlayerBaseBluInteraction,
      undefined,
      this
    )
    
    // Player vs spikes collision - lose life on contact
    // Store reference to spike overlap so we can disable it during invincibility
    this.playerSpikeOverlap = this.physics.add.overlap(
      this.player,
      this.spikes,
      this.handlePlayerSpikeCollision,
      undefined,
      this
    )
    
    // Add collider for pink floor spikes to make them solid from below
    this.physics.add.collider(
      this.player,
      this.spikes,
      undefined,  // No callback needed, just physics collision
      (player, spike) => {
        // Only collide with floor spikes from below (one-way platform behavior)
        const spikeObj = spike as Phaser.Physics.Arcade.Sprite
        const playerObj = player as Player
        const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
        
        // Only create solid collision for floor spikes when player is below them
        if (spikeObj.getData('isFloorSpike')) {
          // Block player from jumping through from below, allow falling from above
          return playerBody.velocity.y < 0 // Solid when player is moving upward (jumping from below)
        }
        return false // Ceiling spikes are never solid
      },
      this
    )
    
    // Red cats no longer climb ladders
    
    // Set up coin collection (we'll handle this individually per coin)
    
    // Set up ladder overlap detection
    this.physics.add.overlap(
      this.player,
      this.ladders,
      this.handleLadderOverlap,
      undefined,
      this
    )
    
    // Set world bounds to accommodate wider floors
    const worldWidth = GameSettings.game.floorWidth * GameSettings.game.tileSize
    this.physics.world.setBounds(0, -10000, worldWidth, 20000)
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    // Adjust camera offset for dgen1's square format
    const isDgen1 = this.game.registry.get('isDgen1') || false
    if (isDgen1) {
      // For 720x720, center the camera better with less vertical offset
      this.cameras.main.followOffset.set(0, 50)
    } else {
      // Keep camera centered horizontally, only follow vertically
      this.cameras.main.followOffset.set(0, 100)
    }
    
    // Create visibility/vignette system
    this.createVisibilitySystem()
    
    // Game title removed - focusing on clean HUD
    
    // Create HUD with image fill inside rounded rectangle
    const screenWidth = this.cameras.main.width
    
    // First, create the image that will fill the background (zoomed in)
    const hudBgImage = this.add.image(screenWidth / 2, 10 + 48 + 4, 'hud-bg-200')  // Changed from 40px to 10px from top
    // Scale up the image by 1.6x to zoom in and crop edges
    hudBgImage.setDisplaySize((screenWidth - 16) * 1.6, 96 * 1.6)  // 60% larger to zoom in
    hudBgImage.setOrigin(0.5, 0.5)  // Keep centered
    hudBgImage.setDepth(98)  // Behind the border but above game elements
    hudBgImage.setScrollFactor(0)
    
    // Create a mask for the rounded rectangle shape
    const maskGraphics = this.add.graphics()
    maskGraphics.fillStyle(0xffffff)
    maskGraphics.fillRoundedRect(8, 10, screenWidth - 16, 96, 12)
    maskGraphics.setScrollFactor(0)
    
    // Apply the mask to clip the image to the rounded rectangle shape
    const mask = maskGraphics.createGeometryMask()
    hudBgImage.setMask(mask)
    
    // Now create the border on top
    const hudBorder = this.add.graphics()
    hudBorder.lineStyle(2, 0x7b1fa2, 1.0) // Slightly lighter purple border
    hudBorder.strokeRoundedRect(8, 10, screenWidth - 16, 96, 12) // Changed from 40px to 10px
    hudBorder.setDepth(99)
    hudBorder.setScrollFactor(0)
    
    // LEFT SIDE: Lives, Crystals, Level
    // Lives display with heart crystal icon (left side, row 1)
    this.livesIcon = this.add.image(30, 35, 'heart-crystal')  // Shifted up 30px (was 65)
    this.livesIcon.setDisplaySize(16, 16)
    this.livesIcon.setDepth(100)
    this.livesIcon.setScrollFactor(0)
    
    this.livesText = this.add.text(45, 35, 'x3', {  // Shifted up 30px (was 65)
      fontSize: '14px',
      color: '#ff69b4',  // Pink color to match heart crystal theme
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 1,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(0, 0.5).setDepth(100)
    this.livesText.setScrollFactor(0)
    
    // Create combo text with purple theme (hidden initially)
    this.comboText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      '',
      {
        fontSize: '13px',
        color: '#ffd700',  // Gold color
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD theme
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(200).setVisible(false)
    this.comboText.setScrollFactor(0)
    
    // Crystal counter with new crystal HUD icon (left side, row 2)
    const crystalIcon = this.add.image(30, 58, 'crystal-hud-icon')  // Shifted up 30px (was 88)
    crystalIcon.setDisplaySize(16, 16)
    crystalIcon.setDepth(100)
    crystalIcon.setScrollFactor(0)
    
    this.coinCounterText = this.add.text(45, 58, '0/150', {  // Shifted up 30px (was 88)
      fontSize: '14px',
      color: '#ffd700',  // Gold color for crystals
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 1,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(0, 0.5).setDepth(100)
    this.coinCounterText.setScrollFactor(0)
    
    // Level counter with new door HUD icon (left side, row 3)
    const doorIcon = this.add.image(30, 81, 'door-hud-icon')  // Shifted up 30px (was 111)
    doorIcon.setDisplaySize(16, 16)
    doorIcon.setDepth(100)
    doorIcon.setScrollFactor(0)
    
    const levelForHUD = this.levelManager.getCurrentLevel()
    const isBonusLevel = this.levelManager.isBonusLevel()
    const levelDisplayText = isBonusLevel ? 'BONUS' : 
                             levelForHUD >= 51 ? `${levelForHUD}` : 
                             `${levelForHUD}`
    
    this.levelText = this.add.text(45, 81, levelDisplayText, {  // Shifted up 30px (was 111)
      fontSize: '14px',
      color: '#9acf07',  // Same green as hamburger menu
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 1,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(0, 0.5).setDepth(100)
    this.levelText.setScrollFactor(0)
    
    // CENTER: Score and Invincibility Timer
    // Score display (center, top)
    this.scoreText = this.add.text(screenWidth / 2, 25, '0', {  // Shifted up 30px (was 55)
      fontSize: '19px',
      color: '#ffd700',  // Gold color
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 1,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(0.5, 0).setDepth(100)  // Center-aligned
    this.scoreText.setScrollFactor(0)
    this.comboText.setScrollFactor(0)
    
    // Timer container - all 4 timers centered as a group under score
    const timerY = 75 // Shifted up 30px (was 105)
    const timerSpacing = 45 // Space between timers (reduced for 4 timers)
    const totalWidth = timerSpacing * 3 // 3 gaps between 4 timers
    const startX = screenWidth / 2 - totalWidth / 2
    
    // Invincibility Timer (pendant) - position 1
    this.invincibilityTimerImage = this.add.image(startX, timerY, 'invincibility-timer')
    this.invincibilityTimerImage.setDisplaySize(36, 36)
    this.invincibilityTimerImage.setDepth(101)
    this.invincibilityTimerImage.setScrollFactor(0)
    this.invincibilityTimerImage.setVisible(true) // Always visible in full color
    
    // Create circular mask for countdown effect
    this.invincibilityTimerMask = this.add.graphics()
    this.invincibilityTimerMask.setDepth(102)
    this.invincibilityTimerMask.setScrollFactor(0)
    
    // Crystal Ball Timer - position 2
    const crystalTimerTexture = this.textures.exists('crystalBallTimer') ? 'crystalBallTimer' : 'invincibility-timer'
    this.crystalBallTimerImage = this.add.image(startX + timerSpacing, timerY, crystalTimerTexture)
    this.crystalBallTimerImage.setDisplaySize(36, 36)
    this.crystalBallTimerImage.setDepth(101)
    this.crystalBallTimerImage.setScrollFactor(0)
    this.crystalBallTimerImage.setVisible(true) // Always visible
    
    // Crystal ball timer mask for countdown
    this.crystalBallTimerMask = this.add.graphics()
    this.crystalBallTimerMask.setDepth(102)
    this.crystalBallTimerMask.setScrollFactor(0)
    
    // Cursed Orb Timer - position 3
    const cursedOrbTexture = this.textures.exists('cursedOrbTimer') ? 'cursedOrbTimer' : 'invincibility-timer'
    this.cursedOrbTimerImage = this.add.image(startX + timerSpacing * 2, timerY, cursedOrbTexture)
    this.cursedOrbTimerImage.setDisplaySize(36, 36)
    this.cursedOrbTimerImage.setDepth(101)
    this.cursedOrbTimerImage.setScrollFactor(0)
    this.cursedOrbTimerImage.setVisible(true) // Always visible
    
    // Cursed orb timer mask for countdown
    this.cursedOrbTimerMask = this.add.graphics()
    this.cursedOrbTimerMask.setDepth(102)
    this.cursedOrbTimerMask.setScrollFactor(0)
    
    // Cursed Teal Orb Timer - position 4
    const cursedTealOrbTexture = this.textures.exists('cursedTealOrbTimer') ? 'cursedTealOrbTimer' : 'invincibility-timer'
    this.cursedTealOrbTimerImage = this.add.image(startX + timerSpacing * 3, timerY, cursedTealOrbTexture)
    this.cursedTealOrbTimerImage.setDisplaySize(36, 36)
    this.cursedTealOrbTimerImage.setDepth(101)
    this.cursedTealOrbTimerImage.setScrollFactor(0)
    this.cursedTealOrbTimerImage.setVisible(true) // Always visible
    
    // Cursed teal orb timer mask for countdown
    this.cursedTealOrbTimerMask = this.add.graphics()
    this.cursedTealOrbTimerMask.setDepth(102)
    this.cursedTealOrbTimerMask.setScrollFactor(0)
    
    // RIGHT SIDE: Hamburger menu
    this.hamburgerMenuButton = this.add.text(screenWidth - 30, 48, '☰', {  // Shifted up 30px (was 78)
      fontSize: '42px',  // Increased by 10px from 32px
      color: '#9acf07',  // Bright green color
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 2,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(1, 0.5).setDepth(100)  // Right-aligned and vertically centered
    this.hamburgerMenuButton.setScrollFactor(0)
    
    // Initialize displays
    this.updateLivesDisplay()
    this.updateCoinCounterDisplay()
    this.updateScoreDisplay() // Show correct total score from the start
    
    // Create touch controls for mobile
    this.touchControls = new TouchControls(this)
    
    // Connect touch controls to player
    this.player.setTouchControls(this.touchControls)
    
    // Ensure input is enabled (in case it was disabled before restart)
    this.input.keyboard!.enabled = true
    this.touchControls.enable()
    
    // Add debug test level shortcut (no visual indicator in main game)
    if (GameSettings.debug) {
      // Add keyboard listener for 'T' key - silent activation
      this.input.keyboard!.on('keydown-T', () => {
        console.log('🧪 Switching to TestScene...')
        this.scene.start('TestScene')
      })
      
      // Add debug gridlines for alignment testing
      this.createDebugGridlines()
    }
    
    // Ensure platform is available in registry before creating menu
    if (!this.registry.get('platform') && !this.game.registry.get('platform')) {
      // Check if platform exists in window
      if ((window as any).platform) {
        this.game.registry.set('platform', (window as any).platform);
        console.log('🎮 Platform copied from window to registry');
      } else {
        console.warn('⚠️ Platform not found anywhere when creating menu');
      }
    }
    
    // Create menu overlay (after HUD is created)
    this.menuOverlay = new MenuOverlay(this)
    
    // Check if we need to reopen menu (from instructions)
    if (this.reopenMenuAfterInit) {
      this.time.delayedCall(100, () => {
        this.menuOverlay.open()
        this.reopenMenuAfterInit = false
      })
    }
    
    // Define the hitbox padding (25 pixels larger)
    const hitPadding = 25
    
    // Connect hamburger button to menu
    // Make sure it's interactive with a larger hitbox
    const textBounds = this.hamburgerMenuButton.getBounds()
    this.hamburgerMenuButton.setInteractive(
      new Phaser.Geom.Rectangle(
        -hitPadding, 
        -hitPadding, 
        textBounds.width + (hitPadding * 2), 
        textBounds.height + (hitPadding * 2)
      ),
      Phaser.Geom.Rectangle.Contains
    )
    this.hamburgerMenuButton.input!.hitArea.setPosition(-hitPadding / 2, -hitPadding / 2)
    
    // Remove old pointerdown listener and add new one
    this.hamburgerMenuButton.off('pointerdown') // Remove only pointerdown
    this.hamburgerMenuButton.on('pointerdown', () => {
      this.playSoundEffect('menu-toggle', 0.4)
      this.menuOverlay.toggle()
    })
    
    // Add hover effect for hamburger
    this.hamburgerMenuButton.on('pointerover', () => {
      this.hamburgerMenuButton.setScale(1.1)
      this.hamburgerMenuButton.setColor('#b8e60a') // Brighter green on hover
    })
    
    this.hamburgerMenuButton.on('pointerout', () => {
      this.hamburgerMenuButton.setScale(1.0)
      this.hamburgerMenuButton.setColor('#9acf07') // Original green
    })
    
    // Set up ESC key for menu
    const escKey = this.input.keyboard?.addKey('ESC')
    if (escKey) {
      escKey.on('down', () => {
        this.menuOverlay.toggle()
      })
    }
    
    // Initialize bubble system
    this.initializeBubbleSystem()
    
    // Check for level start conditions
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    if (levelConfig.isEndless) {
      this.showEndlessModePopup()
    }
    
    // Play background music with looping (only if not already playing)
    // Use game registry to track if music is already playing globally
    const isMusicPlaying = this.game.registry.get('backgroundMusicPlaying')
    
    if (!isMusicPlaying) {
      // Check if music is enabled from settings
      const musicEnabled = this.registry.get('musicEnabled') !== false
      
      // Ensure audio context is running before playing music (critical for mobile)
      if (this.sound.context && this.sound.context.state === 'suspended') {
        console.log('🔊 GameScene: Audio context suspended, attempting to resume...')
        this.sound.context.resume().then(() => {
          console.log('✅ GameScene: Audio context resumed, starting music')
          this.startBackgroundMusic(musicEnabled)
        }).catch(e => {
          console.error('❌ GameScene: Failed to resume audio context:', e)
          // Still try to add the music, it might play later when user interacts
          this.startBackgroundMusic(musicEnabled)
        })
      } else {
        console.log('🔊 GameScene: Audio context state:', this.sound.context?.state || 'unknown')
        this.startBackgroundMusic(musicEnabled)
      }
    } else {
      // Music already playing, just get the reference
      this.backgroundMusic = this.game.registry.get('backgroundMusicInstance')
    }
    
    // Show Beast Mode loading indicator if in Beast Mode
    if (this.levelManager?.getCurrentLevel() >= 51) {
      this.showBeastModeLoadingIndicator()
    }
  }  // End of initializeGameAfterSplash

  private startBackgroundMusic(musicEnabled: boolean): void {
    try {
      // Check if sound is actually loaded
      if (!this.cache.audio.exists('background-music')) {
        console.error('❌ Background music not loaded in cache!')
        return
      }
      
      this.backgroundMusic = this.sound.add('background-music', {
        loop: true,
        volume: musicEnabled ? 0.3 : 0
      })
      
      // Add error handling for play
      const playPromise = this.backgroundMusic.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((e: any) => {
          console.error('❌ Background music play() failed:', e)
        })
      }
      
      console.log('🎵 GameScene: Background music started - actually playing:', this.backgroundMusic.isPlaying)
      
      // Check if it's really playing after a short delay
      setTimeout(() => {
        console.log('🎵 Music status after 100ms - playing:', this.backgroundMusic.isPlaying, 
                    'paused:', this.backgroundMusic.isPaused)
      }, 100)
      
      // Mark that music is now playing
      this.game.registry.set('backgroundMusicPlaying', true)
      // Store reference in game registry so other scenes can access it
      this.game.registry.set('backgroundMusicInstance', this.backgroundMusic)
    } catch (e) {
      console.error('❌ GameScene: Failed to play background music:', e)
    }
  }

  private generateTileTextures(): void {
    const tileSize = GameSettings.game.tileSize
    
    // Generate 15 different tile variants with baked-in decorations
    for (let variant = 0; variant < 15; variant++) {
      const textureKey = `platform-tile-${variant}`
      
      // Skip if already exists (for scene restart)
      if (this.textures.exists(textureKey)) {
        continue
      }
      
      // Create a render texture for this variant
      const graphics = this.add.graphics()
      
      // Base purple crystal tile
      const baseColor = 0x6a4a8a
      graphics.fillStyle(baseColor, 1)
      graphics.fillRect(0, 0, tileSize, tileSize)
      
      // Add texture variations
      const tileVariation = Math.random()
      if (tileVariation < 0.4) {
        graphics.fillStyle(0x8a6aaa, 0.6)
        graphics.fillRect(
          Math.random() * 12, 
          Math.random() * 12, 
          8 + Math.random() * 8, 
          8 + Math.random() * 8
        )
      } else if (tileVariation < 0.6) {
        graphics.fillStyle(0xaa6a9a, 0.5)
        graphics.fillRect(
          Math.random() * 12, 
          Math.random() * 12, 
          6 + Math.random() * 10, 
          6 + Math.random() * 10
        )
      }
      
      // Add decorations based on variant number to ensure variety
      // Each variant gets a different combination of decorations
      
      // Crystal veining (variants 0-6)
      if (variant < 7) {
        const veinColors = [0xff69b4, 0x9370db, 0x40e0d0, 0xffd700, 0x00fa9a]
        const veinColor = veinColors[variant % veinColors.length]
        graphics.lineStyle(2, veinColor, 0.6)
        for (let i = 0; i < 3; i++) {
          const veinY = 6 + i * 8
          graphics.lineBetween(
            2, veinY, 
            tileSize - 2, veinY + Math.random() * 4 - 2
          )
        }
      }
      
      // Sparkling gems (variants 3-10)
      if (variant >= 3 && variant <= 10) {
        const gemColors = [0xff1493, 0x9370db, 0x40e0d0, 0xffd700, 0x00fa9a]
        const gemColor = gemColors[variant % gemColors.length]
        graphics.fillStyle(gemColor, 0.8)
        const gemCount = 3 + (variant % 4)
        for (let i = 0; i < gemCount; i++) {
          const gemX = 4 + Math.random() * (tileSize - 8)
          const gemY = 4 + Math.random() * (tileSize - 8)
          const gemSize = 1.5 + Math.random() * 0.5
          graphics.fillCircle(gemX, gemY, gemSize)
          
          graphics.fillStyle(0xffffff, 0.9)
          graphics.fillCircle(gemX - 0.5, gemY - 0.5, 0.5)
          graphics.fillStyle(gemColor, 0.8)
        }
      }
      
      // Small gem clusters (variants 5-12)
      if (variant >= 5 && variant <= 12) {
        const clusterColors = [0x40e0d0, 0xff69b4, 0x9370db, 0xffd700]
        const clusterColor = clusterColors[variant % clusterColors.length]
        
        const numClusters = 1 + (variant % 2)
        for (let c = 0; c < numClusters; c++) {
          const clusterX = 6 + Math.random() * (tileSize - 12)
          const clusterY = 6 + Math.random() * (tileSize - 12)
          
          graphics.fillStyle(clusterColor, 0.7)
          for (let g = 0; g < 4; g++) {
            const offsetX = (Math.random() - 0.5) * 6
            const offsetY = (Math.random() - 0.5) * 6
            const size = 0.8 + Math.random() * 0.7
            graphics.fillCircle(clusterX + offsetX, clusterY + offsetY, size)
          }
          
          graphics.fillStyle(clusterColor, 0.9)
          graphics.fillCircle(clusterX, clusterY, 1.2)
          
          graphics.fillStyle(0xffffff, 0.8)
          graphics.fillCircle(clusterX - 0.3, clusterY - 0.3, 0.4)
        }
      }
      
      // Vertical crystal clusters (variants 8-14)
      if (variant >= 8) {
        const clusterColors = [0xba68c8, 0x9c27b0, 0x673ab7, 0x40e0d0, 0xff69b4]
        const clusterColor = clusterColors[variant % clusterColors.length]
        const clusterXOffset = (Math.random() - 0.5) * (tileSize - 12)
        
        graphics.fillStyle(clusterColor, 0.7)
        graphics.fillRect(tileSize/2 - 4 + clusterXOffset, 0, 8, tileSize)
        
        graphics.fillStyle(clusterColor, 0.9)
        graphics.fillRect(tileSize/2 - 3 + clusterXOffset, 2, 2, tileSize - 4)
        graphics.fillRect(tileSize/2 + 1 + clusterXOffset, 2, 2, tileSize - 4)
        
        graphics.fillStyle(0xffffff, 0.8)
        graphics.fillRect(tileSize/2 - 2 + clusterXOffset, 4, 1, tileSize - 8)
        graphics.fillRect(tileSize/2 + 2 + clusterXOffset, 4, 1, tileSize - 8)
      }
      
      // Magical crystal clusters (even variants)
      if (variant % 2 === 0) {
        const crystalType = variant % 3
        const crystalColors = [0x9370db, 0x40e0d0, 0xff69b4]
        graphics.fillStyle(crystalColors[crystalType], 0.8)
        
        const crystalX = 5 + Math.random() * (tileSize - 10)
        const crystalY = 5 + Math.random() * (tileSize - 10)
        
        for (let i = 0; i < 4; i++) {
          const cX = crystalX + Math.random() * 10 - 5
          const cY = crystalY + Math.random() * 10 - 5
          const size = 2 + Math.random() * 3
          
          graphics.fillCircle(cX, cY, size)
          
          graphics.fillStyle(0xffffff, 0.9)
          graphics.fillCircle(cX - size/2, cY - size/2, size/3)
          
          graphics.fillStyle(crystalColors[crystalType], 0.8)
        }
      }
      
      // Diamond gems (odd variants > 7)
      if (variant % 2 === 1 && variant > 7) {
        const diamondColors = [0x40e0d0, 0xffd700, 0xff69b4, 0x9370db, 0x00fa9a]
        const diamondColor = diamondColors[variant % diamondColors.length]
        
        const numDiamonds = 1 + (variant % 2)
        for (let d = 0; d < numDiamonds; d++) {
          const diamondX = 8 + Math.random() * (tileSize - 16)
          const diamondY = 8 + Math.random() * (tileSize - 16)
          const diamondSize = 2 + Math.random() * 2
          
          graphics.fillStyle(diamondColor, 0.8)
          graphics.fillRect(diamondX - diamondSize/2, diamondY - diamondSize/4, diamondSize, diamondSize/2)
          graphics.fillRect(diamondX - diamondSize/3, diamondY - diamondSize/2, diamondSize * 0.66, diamondSize)
          
          graphics.fillStyle(diamondColor, 0.95)
          graphics.fillCircle(diamondX, diamondY, diamondSize * 0.3)
          
          graphics.fillStyle(0xffffff, 0.9)
          graphics.fillCircle(diamondX - diamondSize * 0.2, diamondY - diamondSize * 0.2, diamondSize * 0.2)
        }
      }
      
      // Add occasional cracks
      if (variant % 3 === 0) {
        graphics.lineStyle(1, 0x2a2522, 0.5)
        const crackStartX = Math.random() * tileSize
        graphics.lineBetween(
          crackStartX, 0,
          crackStartX + (Math.random() - 0.5) * 12, tileSize
        )
      }
      
      // Generate texture from graphics
      graphics.generateTexture(textureKey, tileSize, tileSize)
      graphics.destroy()
    }
  }
  
  private createMiningThemeBackground(): void {
    // Use world width instead of canvas width to cover entire game area
    const worldWidth = GameSettings.game.floorWidth * GameSettings.game.tileSize
    const width = worldWidth + 1000 // Extra width to cover sides
    const height = GameSettings.canvas.height * 10 // Much taller for vertical scrolling
    const startX = -500 // Start from negative X to cover left side
    const startY = -5000 // Start from negative Y to cover top when climbing high
    
    const bg = this.add.graphics()
    
    // VIBRANT CRYSTAL CAVERN THEME: BizarreBeasts-style colorful crystal mining cavern
    // Dark purple gradient background to make crystal elements stand out more
    for (let y = startY; y < height; y += 20) {
      const ratio = Math.max(0, Math.min(1, (y - startY) / (height - startY)))
      // Darker purple gradient: Very dark purple at top to dark purple at bottom
      const r = Math.floor(0x1a * (1 - ratio) + 0x2a * ratio)
      const g = Math.floor(0x0a * (1 - ratio) + 0x1a * ratio)
      const b = Math.floor(0x2a * (1 - ratio) + 0x4a * ratio)
      const color = (r << 16) | (g << 8) | b
      
      bg.fillStyle(color, 1)
      bg.fillRect(startX, y, width, 20)
    }
    
    // Add bright crystal formations in background
    for (let i = -15; i < 30; i++) {  // Extended range to cover full height
      const formationY = i * 400 + 100
      
      // Crystal shelf across width with shimmer
      bg.fillStyle(0x60a0ff, 0.15) // Much more faded blue crystal base
      bg.fillRect(startX, formationY, width, 8)
      
      // Add crystal spikes distributed across width
      const numCrystals = Math.floor(width / 120)
      for (let j = 0; j <= numCrystals; j++) {
        const crystalX = startX + (width / numCrystals) * j + (Math.random() - 0.5) * 40
        
        // Colorful crystal spikes
        const crystalColors = [0xff6bb3, 0x6bb3ff, 0xb3ff6b, 0xffb36b, 0xb36bff]
        const crystalColor = crystalColors[Math.floor(Math.random() * crystalColors.length)]
        
        bg.fillStyle(crystalColor, 0.2) // Much more faded
        // Draw crystal spike pointing up
        bg.fillTriangle(
          crystalX, formationY,
          crystalX - 6, formationY + 30,
          crystalX + 6, formationY + 30
        )
        
        // Add crystal highlight
        bg.fillStyle(0xffffff, 0.15) // Faded highlight
        bg.fillTriangle(
          crystalX, formationY,
          crystalX - 2, formationY + 10,
          crystalX + 2, formationY + 10
        )
      }
    }
    
    // Add magical gem veins with rainbow colors
    for (let i = 0; i < Math.floor(width / 150); i++) {
      const veinX = startX + Math.random() * width
      const veinY = startY + Math.random() * (height - startY)
      
      // Colorful gem vein
      const gemColors = [0xff4081, 0x40c4ff, 0x69f0ae, 0xffab40, 0xba68c8]
      const gemColor = gemColors[Math.floor(Math.random() * gemColors.length)]
      
      bg.fillStyle(gemColor, 0.2) // Much more faded gem veins
      const veinLength = 100 + Math.random() * 150
      const veinAngle = Math.random() * Math.PI / 3 - Math.PI / 6
      
      for (let v = 0; v < veinLength; v += 8) {
        const x = veinX + Math.cos(veinAngle) * v
        const y = veinY + Math.sin(veinAngle) * v
        bg.fillCircle(x, y, 3 + Math.random() * 4) // Sparkly gem dots
        
        // Add white sparkle highlights
        if (Math.random() > 0.7) {
          bg.fillStyle(0xffffff, 0.3) // Faded sparkles
          bg.fillCircle(x + Math.random() * 4 - 2, y + Math.random() * 4 - 2, 1)
          bg.fillStyle(gemColor, 0.2) // Reset to faded gem color
        }
      }
    }
    
    // Add magical gem clusters throughout the cavern
    for (let i = 0; i < Math.floor(width / 100); i++) {
      const gemX = startX + Math.random() * width
      const gemY = startY + Math.random() * (height - startY)
      const gemType = Math.random()
      
      if (gemType < 0.3) {
        // Large rainbow gems
        const rainbowColors = [0xff1744, 0xe91e63, 0x9c27b0, 0x673ab7, 0x3f51b5, 0x2196f3, 0x00bcd4, 0x009688, 0x4caf50, 0x8bc34a, 0xcddc39, 0xffeb3b, 0xffc107, 0xff9800, 0xff5722]
        const gemColor = rainbowColors[Math.floor(Math.random() * rainbowColors.length)]
        bg.fillStyle(gemColor, 0.25) // Much more faded
        bg.fillCircle(gemX, gemY, 8 + Math.random() * 6)
        
        // Add bright white highlight
        bg.fillStyle(0xffffff, 0.3) // Faded highlight
        bg.fillCircle(gemX - 2, gemY - 2, 2)
      } else if (gemType < 0.6) {
        // Medium amethyst/crystal clusters  
        bg.fillStyle(0xba68c8, 0.2) // Much more faded
        bg.fillCircle(gemX, gemY, 6 + Math.random() * 4)
        bg.fillStyle(0xffffff, 0.25) // Faded highlight
        bg.fillCircle(gemX - 1, gemY - 1, 1.5)
      } else {
        // Small emerald gems
        bg.fillStyle(0x4caf50, 0.2) // Much more faded
        bg.fillCircle(gemX, gemY, 4 + Math.random() * 3)
        bg.fillStyle(0xffffff, 0.3) // Faded highlight
        bg.fillCircle(gemX - 1, gemY - 1, 1)
      }
    }
    
    // Add glowing crystal formations (replace coal seams)
    for (let i = 0; i < Math.floor(width / 200); i++) {
      const formX = startX + Math.random() * width
      const formY = startY + Math.random() * (height - startY)
      
      // Glowing crystal cluster
      const glowColors = [0x40e0d0, 0xff69b4, 0x98fb98, 0xffa500]
      const glowColor = glowColors[Math.floor(Math.random() * glowColors.length)]
      
      bg.fillStyle(glowColor, 0.1) // Very faded
      bg.fillRect(formX - 20, formY - 5, 40 + Math.random() * 30, 10 + Math.random() * 8)
      
      // Add bright center
      bg.fillStyle(glowColor, 0.3) // Faded center
      bg.fillRect(formX - 10, formY - 2, 20, 4)
    }
    
    // Add magical floating light orbs (replace mining lights)
    for (let i = 0; i < Math.floor(width / 60); i++) {
      const x = startX + Math.random() * width
      const y = startY + Math.random() * (height - startY)
      
      // Floating magic orb with glow effect
      const orbColors = [0x40e0d0, 0xff1493, 0x9370db, 0x00ff7f, 0xffd700]
      const orbColor = orbColors[Math.floor(Math.random() * orbColors.length)]
      
      // Outer glow
      bg.fillStyle(orbColor, 0.08) // Very faded outer glow
      bg.fillCircle(x, y, 15)
      
      // Middle glow
      bg.fillStyle(orbColor, 0.15) // Faded middle glow
      bg.fillCircle(x, y, 8)
      
      // Bright center
      bg.fillStyle(orbColor, 0.3) // Faded center
      bg.fillCircle(x, y, 4)
      
      // White sparkle center
      bg.fillStyle(0xffffff, 0.4) // Faded sparkle
      bg.fillCircle(x, y, 2)
    }
    
    // Add magical energy streams across the cavern
    bg.lineStyle(3, 0x40e0d0, 0.3)
    for (let y = startY + 100; y < height; y += 400) {
      // Flowing magical energy streams with gentle curves
      const streamY = y + Math.random() * 100
      const segments = Math.floor(width / 100)
      
      for (let s = 0; s < segments; s++) {
        const x1 = startX + (width / segments) * s
        const x2 = startX + (width / segments) * (s + 1)
        const curve = Math.sin(s * 0.5) * 20
        
        bg.lineStyle(2, 0x40e0d0, 0.15) // Very faded energy streams
        bg.lineBetween(x1, streamY + curve, x2, streamY + Math.sin((s + 1) * 0.5) * 20)
        
        // Add sparkles along the stream
        if (Math.random() > 0.7) {
          bg.fillStyle(0xffffff, 0.2) // Faded sparkles
          bg.fillCircle(x1 + Math.random() * (x2 - x1), streamY + curve, 1)
        }
      }
    }
    
    // Add large crystal formations and geodes
    for (let i = 0; i < Math.floor(width / 80); i++) {
      const x = startX + Math.random() * width
      const y = startY + Math.random() * (height - startY)
      const size = 40 + Math.random() * 60
      
      // Large crystal geode with colorful interior
      const geodeColors = [0x9c27b0, 0x673ab7, 0x3f51b5, 0x00bcd4, 0x4caf50]
      const geodeColor = geodeColors[Math.floor(Math.random() * geodeColors.length)]
      
      // Outer geode shell
      bg.fillStyle(0x5a4a6a, 0.15) // Very faded shell
      bg.fillCircle(x, y, size)
      
      // Inner crystal cavity
      bg.fillStyle(geodeColor, 0.2) // Faded cavity
      bg.fillCircle(x, y, size * 0.7)
      
      // Bright crystal center
      bg.fillStyle(geodeColor, 0.35) // Faded center
      bg.fillCircle(x, y, size * 0.3)
      
      // White highlight
      bg.fillStyle(0xffffff, 0.3) // Faded highlight
      bg.fillCircle(x - size * 0.2, y - size * 0.2, size * 0.15)
    }
    
    bg.setDepth(-10) // Far background
    bg.setScrollFactor(0.5) // Parallax effect
  }
  
  private createTestLevel(): void {
    const tileSize = GameSettings.game.tileSize
    const floorWidth = GameSettings.game.floorWidth
    // Use custom floor spacing for dgen1, or default calculation
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5) // Space between floors
    
    // Get the required floor count for this level
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    const requiredFloors = levelConfig.isEndless ? 20 : levelConfig.floorCount
    
    // Generate exactly the required number of floors for discrete levels
    // For Level 1: floorCount=10, so we generate floors 0,1,2,3,4,5,6,7,8,9 (10 floors total)
    // Door goes on floor 9 (the 10th floor)
    const numFloors = levelConfig.isEndless ? 
      Math.max(requiredFloors, Math.floor(GameSettings.canvas.height / floorSpacing)) :
      requiredFloors
    
    // Track ladder positions and floor layouts for cat placement
    const ladderPositions: number[] = []
    const floorLayouts: { gapStart: number, gapSize: number }[] = []
    
    // First create all platforms with random gaps
    for (let floor = 0; floor < numFloors; floor++) {
      const y = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      
      if (floor === 0) {
        // Ground floor - complete platform
        
        for (let x = 0; x < floorWidth; x++) {
          const platformX = x * tileSize + tileSize/2
          this.createPlatformTile(platformX, y, x === 0, x === floorWidth - 1)
        }
        // Ground floor can have ladders at multiple positions
        ladderPositions[floor] = -1 // Special marker for ground floor
        floorLayouts[floor] = { gapStart: -1, gapSize: 0 } // No gap
      } else {
        // Upper floors - create platforms with random gaps (except bonus levels)
        const hasGap = !this.levelManager.isBonusLevel() && Math.random() > 0.3 // 70% chance of having a gap (never for bonus levels)
        
        if (hasGap) {
          // Random gap position (avoiding edges)
          const gapStart = Math.floor(Math.random() * (floorWidth - 5)) + 2
          const gapSize = Math.floor(Math.random() * 2) + 2 // Gap of 2-3 tiles
          
          // Store gap info for cat placement
          floorLayouts[floor] = { gapStart, gapSize }
          
          // Create platform tiles, skipping the gap
          for (let x = 0; x < floorWidth; x++) {
            if (x < gapStart || x >= gapStart + gapSize) {
              this.createPlatformTile(x * tileSize + tileSize/2, y, x === 0, x === floorWidth - 1)
            }
          }
          
          // Add spikes to all gaps in initial floor creation too (except in bonus levels)
          // console.log(`🔱 Initial floor ${floor}: Creating spikes: gapStart=${gapStart}, gapSize=${gapSize}, floorY=${y}`)
          if (!this.levelManager.isBonusLevel()) {
            this.createSpikesInGap(gapStart, gapSize, y, tileSize)
          }
          
          // Store safe ladder positions (not in or next to gaps)
          const leftSafe = gapStart > 3 ? Math.floor(Math.random() * (gapStart - 1)) + 1 : -1
          const rightSafe = gapStart + gapSize < floorWidth - 2 ? 
            Math.floor(Math.random() * (floorWidth - gapStart - gapSize - 2)) + gapStart + gapSize + 1 : -1
          
          // Better distribution - divide floor into thirds and alternate sections
          const floorThird = floorWidth / 3
          const prevPos = floor > 1 ? ladderPositions[floor - 1] : -1
          
          let targetSection = Math.floor(Math.random() * 3) // 0=left, 1=middle, 2=right
          
          // If previous ladder exists, prefer different section
          if (prevPos !== -1) {
            const prevSection = Math.floor(prevPos / floorThird)
            const otherSections = [0, 1, 2].filter(s => s !== prevSection)
            targetSection = otherSections[Math.floor(Math.random() * otherSections.length)]
          }
          
          // Find safe positions in target section
          const sectionStart = Math.floor(targetSection * floorThird)
          const sectionEnd = Math.floor((targetSection + 1) * floorThird)
          const sectionSafe = []
          
          if (leftSafe !== -1 && leftSafe >= sectionStart && leftSafe < sectionEnd) sectionSafe.push(leftSafe)
          if (rightSafe !== -1 && rightSafe >= sectionStart && rightSafe < sectionEnd) sectionSafe.push(rightSafe)
          
          // Use section position if available, otherwise use any safe position
          ladderPositions[floor] = sectionSafe.length > 0 ? 
            sectionSafe[Math.floor(Math.random() * sectionSafe.length)] : 
            (rightSafe !== -1 ? rightSafe : leftSafe)
        } else {
          // No gap - complete floor
          floorLayouts[floor] = { gapStart: -1, gapSize: 0 }
          
          for (let x = 0; x < floorWidth; x++) {
            this.createPlatformTile(x * tileSize + tileSize/2, y)
          }
          // Better distribution for complete floors - use thirds system
          const floorThird = floorWidth / 3
          const prevPos = floor > 1 ? ladderPositions[floor - 1] : -1
          
          let targetSection = Math.floor(Math.random() * 3)
          if (prevPos !== -1) {
            const prevSection = Math.floor(prevPos / floorThird)
            const otherSections = [0, 1, 2].filter(s => s !== prevSection)
            targetSection = otherSections[Math.floor(Math.random() * otherSections.length)]
          }
          
          const sectionStart = Math.max(2, Math.floor(targetSection * floorThird))
          const sectionEnd = Math.min(floorWidth - 2, Math.floor((targetSection + 1) * floorThird))
          ladderPositions[floor] = Math.floor(Math.random() * (sectionEnd - sectionStart)) + sectionStart
        }
      }
    }
    
    // Store floor layouts for cat creation
    this.floorLayouts = floorLayouts
    
    // Create ladders ensuring solid ground above and below
    // Allow ladders TO the door floor, but not FROM or past it
    const doorFloor = levelConfig.isEndless ? -1 : (levelConfig.floorCount - 1)
    
    for (let floor = 0; floor < numFloors - 1; floor++) {
      // Skip creating ladder if it would lead PAST the door floor
      // We WANT ladders leading TO the door floor, just not beyond it
      if (!levelConfig.isEndless && (floor + 1) > doorFloor) {
        continue // Don't create ladders leading past the door floor
      }
      
      const bottomY = GameSettings.canvas.height - tileSize - (floor * floorSpacing)
      const topY = GameSettings.canvas.height - tileSize - ((floor + 1) * floorSpacing)
      
      const currentFloor = floorLayouts[floor]
      const nextFloor = floorLayouts[floor + 1]
      
      // Find valid ladder positions that have solid ground on both floors and avoid door conflicts
      const validPositions: number[] = []
      
      for (let x = 1; x < floorWidth - 1; x++) {
        const hasBottomPlatform = this.hasPlatformAt(currentFloor, x)
        const hasTopPlatform = this.hasPlatformAt(nextFloor, x)
        
        // Check for door conflicts on both floors (ladders need clearance from doors)
        const hasBottomDoorConflict = this.hasDoorAt(x, floor)
        const hasTopDoorConflict = this.hasDoorAt(x, floor + 1)
        
        if (hasBottomPlatform && hasTopPlatform && !hasBottomDoorConflict && !hasTopDoorConflict) {
          validPositions.push(x)
        }
      }
      
      if (validPositions.length > 0) {
        const laddersPlaced: number[] = []
        
        if (floor === 0) {
          // GROUND FLOOR ONLY: Place 2 ladders with good spacing
          // Randomize positions for challenge, not predictable zones
          
          if (validPositions.length >= 2) {
            // Place first ladder randomly
            const firstLadder = validPositions[Math.floor(Math.random() * validPositions.length)]
            this.createContinuousLadder(firstLadder * tileSize, bottomY, topY)
            laddersPlaced.push(firstLadder)
            
            // Place second ladder with at least 6 tile separation
            const minSeparation = 6
            const secondLadderPositions = validPositions.filter(pos => 
              Math.abs(pos - firstLadder) >= minSeparation
            )
            
            if (secondLadderPositions.length > 0) {
              // Pick from valid separated positions
              const secondLadder = secondLadderPositions[Math.floor(Math.random() * secondLadderPositions.length)]
              this.createContinuousLadder(secondLadder * tileSize, bottomY, topY)
              laddersPlaced.push(secondLadder)
            } else {
              // If no good separation, find the furthest position
              let maxDistance = 0
              let bestSecondLadder = -1
              
              for (const pos of validPositions) {
                const distance = Math.abs(pos - firstLadder)
                if (distance > maxDistance && pos !== firstLadder) {
                  maxDistance = distance
                  bestSecondLadder = pos
                }
              }
              
              if (bestSecondLadder !== -1 && maxDistance >= 3) {
                this.createContinuousLadder(bestSecondLadder * tileSize, bottomY, topY)
                laddersPlaced.push(bestSecondLadder)
              }
              // If still can't place second ladder, that's ok - at least we have one
            }
          } else {
            // Only one valid position on ground floor - place it
            const ladder = validPositions[0]
            this.createContinuousLadder(ladder * tileSize, bottomY, topY)
            laddersPlaced.push(ladder)
          }
          
        } else {
          // ALL UPPER FLOORS: Only 1 ladder for challenge
          // Smart placement to avoid vertical stacking
          
          const prevFloorLadders = this.ladderPositions.get(floor - 1) || []
          
          // Prefer positions NOT directly above/below previous ladders
          const antiStackPositions = validPositions.filter(pos => 
            !prevFloorLadders.some(prevPos => Math.abs(pos - prevPos) < 3)
          )
          
          // Use anti-stack positions if available, otherwise use any valid position
          const positionsToUse = antiStackPositions.length > 0 ? antiStackPositions : validPositions
          
          // Randomize within the valid positions for variety
          const ladderPos = positionsToUse[Math.floor(Math.random() * positionsToUse.length)]
          
          this.createContinuousLadder(ladderPos * tileSize, bottomY, topY)
          laddersPlaced.push(ladderPos)
        }
        
        // Store ladder positions for reference
        this.storeLadderPositions(floor, laddersPlaced)
      }
      // If no valid positions, skip this connection (emergency fallback)
    }
  }
  
  private storeLadderPositions(floor: number, positions: number[]): void {
    this.ladderPositions.set(floor, positions)
  }
  
  private hasPlatformAt(floorLayout: { gapStart: number, gapSize: number }, x: number): boolean {
    if (floorLayout.gapStart === -1) {
      // No gap - platform exists everywhere
      return true
    }
    
    // Check if position is in the gap
    return x < floorLayout.gapStart || x >= floorLayout.gapStart + floorLayout.gapSize
  }
  
  private selectSmartTileVariant(x: number, y: number): {variant: number, flipX: boolean} {
    const tileSize = GameSettings.game.tileSize
    const gridX = Math.floor(x / tileSize)
    const gridY = Math.floor(y / tileSize)
    const posKey = `${gridX},${gridY}`
    
    // Check if we already have a tile at this position (for respawns)
    if (this.tileGrid.has(posKey)) {
      return this.tileGrid.get(posKey)!
    }
    
    // Get neighbor tile info for enhanced duplicate prevention
    const neighborVariants: number[] = []
    const neighborFlips: boolean[] = []
    const checkPositions = [
      `${gridX - 1},${gridY}`, // left
      `${gridX + 1},${gridY}`, // right
      `${gridX},${gridY - 1}`, // above
      `${gridX},${gridY + 1}`, // below
      `${gridX - 1},${gridY - 1}`, // diagonal top-left
      `${gridX + 1},${gridY - 1}`, // diagonal top-right
      `${gridX - 1},${gridY + 1}`, // diagonal bottom-left  
      `${gridX + 1},${gridY + 1}`  // diagonal bottom-right
    ]
    
    checkPositions.forEach(key => {
      if (this.tileGrid.has(key)) {
        const neighbor = this.tileGrid.get(key)!
        neighborVariants.push(neighbor.variant)
        neighborFlips.push(neighbor.flipX)
      }
    })
    
    // Define tile art groups (0-indexed, so subtract 1 from your numbers)
    const tileGroups = [
      [0, 4, 8],     // Group 1: tiles 1, 5, 9 (same base art)
      [1, 5, 9],     // Group 2: tiles 2, 6, 10 (same base art)  
      [2, 3, 6, 7, 10, 11]  // Group 3: tiles 3, 4, 7, 8, 11, 12 (same base art)
    ]
    
    // Helper function to get tile group
    const getTileGroup = (variant: number): number[] | null => {
      for (const group of tileGroups) {
        if (group.includes(variant)) {
          return group
        }
      }
      return null
    }
    
    // Generate all possible tile combinations
    const allCombinations: {variant: number, flipX: boolean, score: number}[] = []
    for (let variant = 0; variant < 12; variant++) {
      for (const flipX of [false, true]) {
        let score = 100 // Base score
        
        // Heavily penalize exact matches with immediate neighbors (left/right/up/down)
        const immediateNeighbors = checkPositions.slice(0, 4)
        immediateNeighbors.forEach(key => {
          if (this.tileGrid.has(key)) {
            const neighbor = this.tileGrid.get(key)!
            if (neighbor.variant === variant && neighbor.flipX === flipX) {
              score -= 80 // Heavy penalty for exact match
            } else if (neighbor.variant === variant) {
              score -= 40 // Medium penalty for same variant, different flip
            }
            
            // Heavy penalty for same art group (similar looking tiles)
            const currentGroup = getTileGroup(variant)
            const neighborGroup = getTileGroup(neighbor.variant)
            if (currentGroup && neighborGroup && currentGroup === neighborGroup) {
              score -= 60 // Heavy penalty for same art family
            }
          }
        })
        
        // Moderate penalty for diagonal neighbors  
        const diagonalNeighbors = checkPositions.slice(4)
        diagonalNeighbors.forEach(key => {
          if (this.tileGrid.has(key)) {
            const neighbor = this.tileGrid.get(key)!
            if (neighbor.variant === variant && neighbor.flipX === flipX) {
              score -= 30 // Moderate penalty for exact diagonal match
            } else if (neighbor.variant === variant) {
              score -= 15 // Light penalty for same variant diagonal
            }
            
            // Moderate penalty for same art group diagonally
            const currentGroup = getTileGroup(variant)
            const neighborGroup = getTileGroup(neighbor.variant)
            if (currentGroup && neighborGroup && currentGroup === neighborGroup) {
              score -= 25 // Moderate penalty for same art family diagonally
            }
          }
        })
        
        // Bonus for less-used variants (usage balancing)
        const maxUsage = Math.max(...this.tileUsageCount) || 1
        const usageBonus = Math.max(0, maxUsage - this.tileUsageCount[variant]) * 5
        score += usageBonus
        
        // Bonus for variants not recently used
        if (!this.recentTiles.includes(variant)) {
          score += 20
        }
        
        // Small random factor to prevent too much predictability
        score += Math.random() * 10
        
        allCombinations.push({variant, flipX, score})
      }
    }
    
    // Sort by score (highest first) and select from top candidates
    allCombinations.sort((a, b) => b.score - a.score)
    
    // Select from top 25% of candidates to maintain some randomness while avoiding bad choices
    const topCandidates = allCombinations.slice(0, Math.max(6, Math.floor(allCombinations.length * 0.25)))
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]
    
    // Update tracking
    const tileInfo = {variant: selected.variant, flipX: selected.flipX}
    this.tileGrid.set(posKey, tileInfo)
    this.recentTiles.push(selected.variant)
    this.tileUsageCount[selected.variant]++
    
    // Keep recent tiles list to a reasonable size (last 8 tiles for better tracking)
    if (this.recentTiles.length > 8) {
      this.recentTiles.shift()
    }
    
    return tileInfo
  }
  
  private createPlatformTile(x: number, y: number, isLeftEdge: boolean = false, isRightEdge: boolean = false): void {
    const tileSize = GameSettings.game.tileSize
    
    // Smart tile selection with flipping variations
    const tileInfo = this.selectSmartTileVariant(x, y)
    const textureKey = `floor-tile-${tileInfo.variant + 1}` // +1 because tiles are numbered 1-12
    
    // Create sprite from preloaded texture and set to exact 32x32 size
    const tileSprite = this.add.sprite(x, y, textureKey)
    tileSprite.setDisplaySize(32, 32) // Force exact 32x32 pixel size
    tileSprite.setDepth(1)
    
    // Apply horizontal flipping only (no vertical flipping to avoid upside-down tiles)
    tileSprite.setFlipX(tileInfo.flipX)
    
    // Add drop shadow for depth (also sized to 32x32 and flipped to match)
    const shadowSprite = this.add.sprite(x + 3, y + 3, textureKey)
    shadowSprite.setDisplaySize(32, 32) // Force exact 32x32 pixel size for shadow too
    shadowSprite.setDepth(0)
    shadowSprite.setTint(0x000000)
    shadowSprite.setAlpha(0.3)
    
    // Apply same horizontal flipping to shadow for consistency
    shadowSprite.setFlipX(tileInfo.flipX)
    
    // Create invisible physics platform
    const platform = this.add.rectangle(
      x,
      y,
      tileSize,
      tileSize,
      0x000000,
      0  // Fully transparent
    )
    platform.setDepth(0)
    
    // Add physics body to platform and make it immovable
    this.physics.add.existing(platform, true) // true = static body
    this.platforms.add(platform)
  }
  
  private createContinuousLadder(x: number, bottomY: number, topY: number): void {
    const tileSize = GameSettings.game.tileSize
    
    // Create one continuous ladder from bottom to top
    // Extend slightly above floor levels for player access, but NEVER below ground floor
    // Check if this is a ground floor ladder (bottomY is close to canvas height)
    const isGroundFloor = bottomY >= GameSettings.canvas.height - tileSize * 2
    
    // For ground floor ladders, don't extend below the platform
    // For other ladders, allow small extension below for smooth transitions
    const bottomExtension = isGroundFloor ? 0 : tileSize * 0.25
    const topExtension = tileSize * 0.1  // Reduced from 0.25 to 0.1 for tighter ladder bounds
    
    const ladderHeight = bottomY - topY + bottomExtension + topExtension
    const ladderY = (bottomY + bottomExtension + topY - topExtension) / 2
    
    // Debug log for ladder positioning
    const isDgen1 = this.game.registry.get('isDgen1') || false
    if (isDgen1) {
      console.log('🪜 Ladder created:', {
        x: Math.round(x),
        bottomY: Math.round(bottomY),
        topY: Math.round(topY),
        ladderY: Math.round(ladderY),
        ladderHeight: Math.round(ladderHeight),
        isGroundFloor,
        canvasHeight: GameSettings.canvas.height
      })
    }
    
    // Create the invisible ladder hitbox
    const ladder = this.add.rectangle(
      x + tileSize/2,
      ladderY,
      tileSize * 0.8,
      ladderHeight,
      0xFFFFFF,
      0  // Invisible
    )
    ladder.setDepth(10)
    this.ladders.add(ladder)
    
    // Use new teal ladder sprite
    if (this.textures.exists('tealLadder')) {
      const ladderX = x + tileSize/2
      // For visual consistency, make all ladder sprites the same height
      // Even though ground floor ladder hitbox is shorter
      const visualHeight = bottomY - topY + tileSize * 0.5 // Standard visual height for all ladders
      const visualCenterY = (bottomY + topY) / 2 + 1 // Standard visual center, shifted down 1px
      
      // Create ladder sprite
      const ladderSprite = this.add.image(ladderX + 1, visualCenterY, 'tealLadder')  // Moved 1 pixel to the right
      // Scale to proper height while maintaining aspect ratio
      ladderSprite.setDisplaySize(ladderSprite.width * (visualHeight / ladderSprite.height), visualHeight)
      ladderSprite.setDepth(11)
    } else {
      // Fallback to simple graphics ladder
      const ladderGraphics = this.add.graphics()
      const ladderX = x + tileSize/2
      
      // For visual consistency, use standard visual dimensions
      const visualHeight = bottomY - topY + tileSize * 0.5
      const visualCenterY = (bottomY + topY) / 2 + 1 // Shifted down 1px to match sprite
      const visualTop = visualCenterY - visualHeight/2
      const visualBottom = visualCenterY + visualHeight/2
      
      ladderGraphics.fillStyle(0x40e0d0, 1) // Teal color
      ladderGraphics.fillRect(ladderX - 2, visualTop, 4, visualHeight)
      ladderGraphics.fillRect(ladderX - 13, visualTop + 4, 26, 4) // Top rung
      ladderGraphics.fillRect(ladderX - 13, visualBottom - 8, 26, 4) // Bottom rung
      
      // Middle rungs
      const numRungs = Math.floor(visualHeight / 32)
      for (let i = 1; i < numRungs; i++) {
        const rungY = visualTop + (i * (visualHeight / (numRungs + 1)))
        ladderGraphics.fillRect(ladderX - 13, rungY, 26, 3)
      }
      
      ladderGraphics.setDepth(11)
    }
  }

  private createSpikesInGap(gapStart: number, gapSize: number, floorY: number, tileSize: number): void {
    // Fill the entire gap with pink spikes - every tile in the gap gets a spike
    for (let x = gapStart; x < gapStart + gapSize; x++) {
      const spikeX = x * tileSize + tileSize/2
      const spikeY = floorY // Position at floor level
      
      this.createSpikeSprite(spikeX, spikeY, tileSize)
    }
  }
  
  private createSpikeSprite(x: number, y: number, tileSize: number): void {
    // Position spike sprite at the bottom edge of platforms, shifted down 1 pixel
    const spikeBaseY = y + tileSize/2 - 1 + 1 // Move to bottom of platform tiles, then down 1 more pixel
    
    // Create drop shadow for spike (like floor tiles)
    const shadowSprite = this.add.image(x + 3, spikeBaseY + 3, 'pink-floor-spike-tile')
    shadowSprite.setDisplaySize(tileSize, tileSize) // Match floor tile size
    shadowSprite.setOrigin(0.5, 1) // Bottom center origin for proper positioning
    shadowSprite.setDepth(11) // Behind the main spike
    shadowSprite.setTint(0x000000) // Black shadow
    shadowSprite.setAlpha(0.3) // 30% opacity
    
    // Create pink floor spike sprite (width matches tile size, contains 3 spikes pointing up)
    const spikeSprite = this.add.image(x, spikeBaseY, 'pink-floor-spike-tile')
    spikeSprite.setDisplaySize(tileSize, tileSize) // Match floor tile size
    spikeSprite.setOrigin(0.5, 1) // Bottom center origin for proper positioning
    spikeSprite.setDepth(12) // Above platforms but below player
    
    // Create physics body for collision detection - same height as floor tiles for enemy movement
    const fullTileHeight = tileSize
    const spikeCollisionY = y // Same Y as platform tiles
    const spikeBody = this.add.rectangle(x, spikeCollisionY, tileSize * 0.9, fullTileHeight, 0x000000, 0)
    spikeBody.setVisible(false) // Invisible collision box
    
    // Store spike data for different collision behaviors
    spikeBody.setData('isFloorSpike', true)
    spikeBody.setData('visualSpikeHeight', tileSize) // Store visual spike height for player damage
    spikeBody.setData('visualSpikeBaseY', spikeBaseY) // Store visual spike base Y
    
    this.spikes.add(spikeBody)
  }

  private createCeilingSpikes(): void {
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    
    // Skip ceiling spikes entirely for bonus levels
    if (this.levelManager.isBonusLevel()) {
      return
    }
    
    // Only spawn ceiling spikes on level 1 for testing, later only on higher levels
    const minFloorForCeilingSpikes = 1 // Will change to higher number later
    
    // Iterate through floors to randomly place ceiling spikes
    for (let floor = minFloorForCeilingSpikes; floor < this.floorLayouts.length - 1; floor++) {
      const layout = this.floorLayouts[floor]
      
      // 80% chance of ceiling spikes on this floor for better visibility during testing
      if (Math.random() > 0.8) continue
      
      // Calculate ceiling position (just below the floor above)
      const ceilingY = GameSettings.canvas.height - tileSize/2 - ((floor + 1) * floorSpacing) + tileSize
      
      // Find valid positions (avoiding ladders, door, collectibles, and gaps)
      const validPositions: number[] = []
      
      // Get ladder positions for this floor
      const ladderPositions = this.getLadderPositionsForFloor(floor)
      
      // Build list of valid positions
      for (let x = 2; x < GameSettings.game.floorWidth - 2; x++) {
        // Skip if over a gap or within 2-tile buffer zone to avoid placing near pink spikes
        if (layout.gapStart !== -1 && x >= layout.gapStart - 2 && x < layout.gapStart + layout.gapSize + 2) {
          continue
        }
        
        // Skip if near a ladder (within 2 tiles for safety)
        let nearLadder = false
        for (const ladderX of ladderPositions) {
          if (Math.abs(x - ladderX) < 2) {
            nearLadder = true
            break
          }
        }
        if (nearLadder) continue
        
        // Skip if near door (on door floor)
        if (floor === this.floorLayouts.length - 2) {
          const doorX = Math.floor(GameSettings.game.floorWidth / 2)
          if (Math.abs(x - doorX) < 2) continue
        }
        
        validPositions.push(x)
      }
      
      // Place 1-3 ceiling spike clusters randomly
      const numSpikeClusters = Math.floor(Math.random() * 3) + 1
      
      for (let i = 0; i < Math.min(numSpikeClusters, validPositions.length / 3); i++) {
        if (validPositions.length === 0) break
        
        const randomIndex = Math.floor(Math.random() * validPositions.length)
        const spikeX = validPositions[randomIndex]
        
        // Create a cluster of 1-3 tiles of ceiling spikes
        const clusterSize = Math.floor(Math.random() * 3) + 1
        
        for (let j = 0; j < clusterSize; j++) {
          const tileX = spikeX + j
          if (tileX >= GameSettings.game.floorWidth - 2) break
          
          // Double-check this tile doesn't conflict with ladders
          let conflictsWithLadder = false
          for (const ladderX of ladderPositions) {
            if (Math.abs(tileX - ladderX) < 2) {
              conflictsWithLadder = true
              break
            }
          }
          
          if (conflictsWithLadder) {
            // Skipping ceiling spike - too close to ladder (replaced console.log)
            continue
          }
          
          // Remove used positions
          const idx = validPositions.indexOf(tileX)
          if (idx > -1) validPositions.splice(idx, 1)
          
          // Creating yellow ceiling spike (replaced console.log)
          this.createCeilingSpikeGraphics(tileX * tileSize + tileSize/2, ceilingY, tileSize)
        }
      }
    }
  }

  private createCeilingSpikeGraphics(x: number, y: number, tileSize: number): void {
    const spikeHeight = tileSize * 0.5 + 6 // 50% of tile height plus 6 pixels for better player detection
    
    // Position spikes hanging from ceiling
    const spikeBaseY = y - tileSize/2 + 1 // Attach to ceiling
    
    // Creating yellow ceiling spike sprite (replaced console.log)
    
    // Create yellow ceiling spike sprite (width matches tile size, contains 3 spikes pointing down)
    const spikeSprite = this.add.image(x, spikeBaseY, 'yellow-ceiling-spike-tile')
    spikeSprite.setDisplaySize(tileSize, tileSize) // Match floor tile size
    spikeSprite.setOrigin(0.5, 0) // Top center origin for ceiling attachment
    spikeSprite.setDepth(12) // Same depth as floor spikes
    
    // Create physics body for collision detection
    const spikeBody = this.add.rectangle(x, spikeBaseY + spikeHeight/2, 24, spikeHeight, 0x000000, 0)
    spikeBody.setVisible(false) // Invisible collision box
    spikeBody.setData('isCeilingSpike', true) // Mark as ceiling spike
    spikeBody.setData('sprite', spikeSprite) // Store sprite reference for shaking
    spikeBody.setData('x', x) // Store position for dropping later
    spikeBody.setData('y', spikeBaseY)
    
    this.physics.add.existing(spikeBody, true) // Static body
    this.spikes.add(spikeBody)
  }

  private getLadderPositionsForFloor(floor: number): number[] {
    // Get ladder positions from stored ladder data
    const positions: number[] = []
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    this.ladders.children.entries.forEach(ladder => {
      const ladderObj = ladder as Phaser.GameObjects.Rectangle
      // Calculate which floor this ladder connects
      // Ladder bottom Y position
      const ladderBottomY = ladderObj.y + ladderObj.height/2
      // Convert to floor number (0 = ground floor)
      const ladderFloor = Math.floor((GameSettings.canvas.height - ladderBottomY) / floorSpacing)
      
      // Ladders connect floor to floor+1, so check both
      if (ladderFloor === floor || ladderFloor === floor - 1 || ladderFloor === floor + 1) {
        const ladderTileX = Math.floor(ladderObj.x / tileSize)
        positions.push(ladderTileX)
        // Found ladder position (replaced console.log)
      }
    })
    
    // Total ladder positions (replaced console.log)
    return positions
  }

  private createCats(): void {
    // Skip enemy spawning entirely for bonus levels
    if (this.levelManager.isBonusLevel()) {
      return
    }

    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    const floorWidth = GameSettings.game.floorWidth
    
    // Using difficulty-based enemy spawning system (replaced console.log)
    
    // Debug: Log the enemy spawning process
    // Enemy spawning debug start (replaced console.log)
    
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    
    // Add cats on floors 1 through second-to-last floor (skip ground floor and door floor)
    const doorFloor = levelConfig.isEndless ? 999 : (levelConfig.floorCount - 1)
    const maxEnemyFloor = levelConfig.isEndless ? Math.min(20, this.floorLayouts.length - 1) : doorFloor - 1
    
    let enemiesCreated = 0
    for (let floor = 2; floor <= maxEnemyFloor && floor < this.floorLayouts.length; floor++) {
      const layout = this.floorLayouts[floor]
      // Calculate Y position - cats should sit ON the platform, not IN it
      // Platform is at: GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const platformY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      
      // Position enemy ON TOP of floor tiles, like the player
      const floorSurfaceY = platformY - tileSize/2  // Top surface of platform tiles
      const y = floorSurfaceY - 15     // Position enemy standing on top (hitbox bottom above surface)
      
      // Floor positioning info (replaced console.log)
      
      // BaseBlu spawning now handled by the EnemySpawningSystem
      
      // Use new 6-tier enemy spawning system
      const selectedEnemies = EnemySpawningSystem.selectEnemiesForFloor(this.levelManager.getCurrentLevel(), floor)
      
      // Selected enemies for floor (replaced console.log)
      
      if (selectedEnemies.length === 0) {
        // No enemies selected by difficulty system (replaced console.log)
        continue
      }

      // Use zone-based spawning system
      const currentLevel = this.levelManager.getCurrentLevel()
      const availableZones = this.calculateEnemyZones(floorWidth, currentLevel)
      
      // Get ladder and chest positions for this floor to avoid them
      const ladderPositions = this.ladderPositions.get(floor) || []
      const chestPositions: number[] = [] // Will be populated if chests exist on this floor
      
      // Shuffle zones for random distribution
      const shuffledZones = [...availableZones].sort(() => Math.random() - 0.5)
      
      // Track BaseBlu spawn positions - alternate between edges
      let baseBluCount = 0
      const baseBluSpawnedLeft = new Set<number>() // Track which floors have left-edge BaseBlu
      
      // Create enemies based on selected types using zones
      for (let enemyIndex = 0; enemyIndex < selectedEnemies.length && enemyIndex < shuffledZones.length; enemyIndex++) {
        const enemyType = selectedEnemies[enemyIndex]
        const zone = shuffledZones[enemyIndex]
        
        // Calculate position for this enemy within its zone
        let x: number
        let leftBound: number
        let rightBound: number
        
        // Zone-based enemy positioning with special cases
        if (EnemySpawningSystem.isBaseBluType(enemyType)) {
          // BaseBlu enemies always spawn at edges, ignore zones
          const totalBaseBluOnFloor = selectedEnemies.filter(e => EnemySpawningSystem.isBaseBluType(e)).length
          
          if (totalBaseBluOnFloor === 1) {
            // Single BaseBlu - randomly choose left or right edge
            const spawnLeft = Math.random() < 0.5
            x = tileSize * (spawnLeft ? 1 : floorWidth - 1)
          } else {
            // Multiple BaseBlu - alternate edges
            x = tileSize * (baseBluCount === 0 ? 1 : floorWidth - 1)
            baseBluCount++
          }
          // BaseBlu patrol full floor
          leftBound = tileSize * 0.5
          rightBound = tileSize * (floorWidth - 0.5)
          
        } else if (EnemySpawningSystem.isStalkerType(enemyType)) {
          // Stalkers avoid ladders and chests
          let validZone = zone
          
          // Check if zone contains ladder or chest
          const zoneHasLadder = ladderPositions.some(ladderX => 
            ladderX >= zone.start && ladderX < zone.end)
          const zoneHasChest = chestPositions.some(chestX => 
            chestX >= zone.start && chestX < zone.end)
          
          // Find alternative zone if needed
          if (zoneHasLadder || zoneHasChest) {
            const alternativeZones = shuffledZones.filter((z, idx) => {
              if (idx <= enemyIndex) return false // Already used
              const hasLadder = ladderPositions.some(lx => lx >= z.start && lx < z.end)
              const hasChest = chestPositions.some(cx => cx >= z.start && cx < z.end)
              return !hasLadder && !hasChest
            })
            
            if (alternativeZones.length > 0) {
              validZone = alternativeZones[0]
            }
          }
          
          // Place stalker in zone center
          x = tileSize * (validZone.center + (Math.random() - 0.5))
          // Stalkers patrol full floor
          leftBound = tileSize * 0.5
          rightBound = tileSize * (floorWidth - 0.5)
          
        } else {
          // Regular enemies - use zone placement
          x = tileSize * (zone.center + (Math.random() - 0.5) * 2)
          // ALL enemies patrol full floor width (over gaps/spikes)
          leftBound = tileSize * 0.5
          rightBound = tileSize * (floorWidth - 0.5)
        }
        
        // Get speed multiplier for current level
        const speedMultiplier = EnemySpawningSystem.getSpeedMultiplier(this.levelManager.getCurrentLevel())

        // Create the appropriate enemy type based on type
        if (EnemySpawningSystem.isBaseBluType(enemyType)) {
          // Create BaseBlu enemy
          const baseBlu = new BaseBlu(this, x, y)
          baseBlu.setPlatformBounds(leftBound, rightBound)
          
          // Set initial direction based on spawn position - patrol inward from edges
          const centerX = tileSize * (floorWidth / 2)
          if (x < centerX) {
            // Spawned on left side - move right initially
            baseBlu.setInitialDirection(1)
          } else {
            // Spawned on right side - move left initially
            baseBlu.setInitialDirection(-1)
          }
          
          // Apply speed multiplier to BaseBlu if it has a method for it
          if (typeof (baseBlu as any).setSpeedMultiplier === 'function') {
            (baseBlu as any).setSpeedMultiplier(speedMultiplier)
          }
          this.baseBlus.add(baseBlu)
          enemiesCreated++
          
        } else if (EnemySpawningSystem.isBeetleType(enemyType)) {
          // Create Beetle enemy
          const beetle = new Beetle(this, x, y, leftBound, rightBound)
          // Apply speed multiplier to Beetle if it has a method for it
          if (typeof (beetle as any).setSpeedMultiplier === 'function') {
            (beetle as any).setSpeedMultiplier(speedMultiplier)
          }
          this.beetles.add(beetle)
          enemiesCreated++
          
        } else if (EnemySpawningSystem.isRexType(enemyType)) {
          // Create Rex enemy
          const rex = new Rex(this, x, y, leftBound, rightBound)
          // Apply speed multiplier to Rex if it has a method for it
          if (typeof (rex as any).setSpeedMultiplier === 'function') {
            (rex as any).setSpeedMultiplier(speedMultiplier)
          }
          this.rexEnemies.add(rex)
          enemiesCreated++
          
        } else if (EnemySpawningSystem.isStalkerType(enemyType)) {
          // Create Stalker enemy as a regular Cat with stalker flag
          const stalkerCat = new Cat(
            this,
            x,
            y,
            tileSize * 0.5,
            tileSize * (floorWidth - 0.5),
            'red', // Stalkers are red enemies
            true   // This is a stalker
          )
          stalkerCat.setPlayerReference(this.player)
          // Smart directional assignment for stalker
          this.setSmartEnemyDirection(stalkerCat, x, floorWidth * tileSize, enemyIndex, selectedEnemies.length)
          // Apply speed multiplier to Stalker Cat
          if (typeof (stalkerCat as any).setSpeedMultiplier === 'function') {
            (stalkerCat as any).setSpeedMultiplier(speedMultiplier)
          }
          this.stalkerCats.add(stalkerCat)
          enemiesCreated++
          
        } else {
          // Create regular Cat enemy
          let color = EnemySpawningSystem.getColorForEnemyType(enemyType)
          
          // Randomly choose between blue and purple for chompers (50/50 mix for variety)
          if (enemyType === EnemyType.CHOMPER && Math.random() < 0.5) {
            color = 'purple'
          }
          
          const cat = new Cat(
            this,
            x,
            y,
            leftBound,  // Use calculated bounds for more varied patrol areas
            rightBound,
            color as any
          )
          
          // Smart directional assignment based on position and enemy type
          this.setSmartEnemyDirection(cat, x, floorWidth * tileSize, enemyIndex, selectedEnemies.length)
          
          // Apply speed multiplier to regular Cat
          if (typeof (cat as any).setSpeedMultiplier === 'function') {
            (cat as any).setSpeedMultiplier(speedMultiplier)
          }
          
          this.cats.add(cat)
          enemiesCreated++
        }
      }
    }
    
    // Enemy creation complete (replaced console.log)
  }

  /**
   * Get zone size based on level for dynamic difficulty
   */
  private getZoneSizeForLevel(level: number): number {
    if (level <= 10) return 6   // Early levels: spacious zones
    if (level <= 30) return 5   // Mid levels: moderate zones
    if (level <= 50) return 4   // Late levels: tighter zones
    return 4                     // Beast mode: maintain challenge
  }
  
  /**
   * Calculate enemy spawn zones for the floor
   */
  private calculateEnemyZones(floorWidth: number, level: number): Array<{start: number, end: number, center: number}> {
    const zoneSize = this.getZoneSizeForLevel(level)
    const numZones = Math.floor(floorWidth / zoneSize)
    const zones: Array<{start: number, end: number, center: number}> = []
    
    for (let i = 0; i < numZones; i++) {
      zones.push({
        start: i * zoneSize,
        end: (i + 1) * zoneSize,
        center: (i * zoneSize) + (zoneSize / 2)
      })
    }
    
    return zones
  }

  /**
   * Calculate enemy positions based on spawn pattern
   */
  private calculateEnemyPositions(enemyCount: number, pattern: string, floorWidth: number, tileSize: number): Array<{x: number, leftBound: number, rightBound: number}> {
    const positions: Array<{x: number, leftBound: number, rightBound: number}> = []
    const margin = 1.5 // Tiles from edge
    const usableWidth = floorWidth - (margin * 2)
    
    // Get ladder positions for this floor to avoid them
    const floor = Math.floor(this.currentFloorY / (tileSize * 5)) // Calculate current floor from Y position
    const ladderPositions = this.ladderPositions.get(floor) || []
    
    switch (pattern) {
      case 'spread':
        // Evenly distribute across floor with better spacing
        const minSpacing = 2.5 // Minimum 2.5 tiles between enemies
        const actualSpacing = Math.max(minSpacing, usableWidth / enemyCount)
        
        for (let i = 0; i < enemyCount; i++) {
          // Calculate base position with guaranteed minimum spacing
          const basePosition = margin + actualSpacing * (i + 0.5)
          
          // Add small random offset but maintain minimum distance
          const maxOffset = Math.min(0.5, (actualSpacing - minSpacing) / 2)
          const randomOffset = (Math.random() - 0.5) * maxOffset
          const x = Math.max(margin, Math.min(floorWidth - margin, basePosition + randomOffset))
          
          // Give each enemy wider patrol zones (minimum 6 tiles)
          const minPatrolWidth = 6 // Minimum patrol width in tiles
          const zoneWidth = Math.max(minPatrolWidth, actualSpacing * 1.2) // 120% of spacing or minimum 6 tiles
          const zoneCenter = margin + actualSpacing * (i + 0.5)
          let leftBound = Math.max(0.5, zoneCenter - zoneWidth / 2)
          let rightBound = Math.min(floorWidth - 0.5, zoneCenter + zoneWidth / 2)
          
          // Adjust bounds to avoid ladder positions (keep 2 tiles away from ladders)
          for (const ladderX of ladderPositions) {
            if (ladderX >= leftBound && ladderX <= rightBound) {
              // Ladder is within patrol zone, adjust bounds to avoid it
              if (ladderX - leftBound < rightBound - ladderX) {
                // Ladder is closer to left bound, move left bound right
                leftBound = Math.min(rightBound - minPatrolWidth, ladderX + 2)
              } else {
                // Ladder is closer to right bound, move right bound left  
                rightBound = Math.max(leftBound + minPatrolWidth, ladderX - 2)
              }
            }
          }
          
          positions.push({ x, leftBound, rightBound })
        }
        break
        
      case 'cluster':
        // Group enemies together in center area
        const clusterCenter = floorWidth / 2
        const clusterRadius = Math.min(2, usableWidth / 4) // Max 2 tiles radius
        
        for (let i = 0; i < enemyCount; i++) {
          const angle = (Math.PI * 2 * i) / enemyCount
          const radius = Math.random() * clusterRadius
          const x = Math.max(margin, Math.min(floorWidth - margin, 
            clusterCenter + Math.cos(angle) * radius))
          
          // Shared patrol area for cluster (wider area)
          const minPatrolWidth = 6 // Minimum patrol width
          let leftBound = Math.max(0.5, clusterCenter - Math.max(clusterRadius + 2, minPatrolWidth/2))
          let rightBound = Math.min(floorWidth - 0.5, clusterCenter + Math.max(clusterRadius + 2, minPatrolWidth/2))
          
          // Avoid ladders in cluster patrol area
          for (const ladderX of ladderPositions) {
            if (ladderX >= leftBound && ladderX <= rightBound) {
              // Adjust bounds to avoid ladder
              if (ladderX - leftBound < rightBound - ladderX) {
                leftBound = Math.min(rightBound - minPatrolWidth, ladderX + 2)
              } else {
                rightBound = Math.max(leftBound + minPatrolWidth, ladderX - 2)
              }
            }
          }
          
          positions.push({ x, leftBound, rightBound })
        }
        break
        
      case 'edges':
        // Place enemies near edges with staggered positions
        const leftEnemies = Math.ceil(enemyCount / 2)
        const rightEnemies = Math.floor(enemyCount / 2)
        
        // Distribute enemies on left edge with spacing
        for (let i = 0; i < leftEnemies; i++) {
          const verticalOffset = i * 0.8 // Stagger positions slightly
          const x = margin + verticalOffset + Math.random() * 1.5
          
          // Left edge enemies patrol left half (with wider area)
          let leftBound = 0.5
          let rightBound = Math.min(floorWidth / 2 + 1, floorWidth - 0.5) // Extend slightly past center
          
          // Ensure minimum patrol width
          const minPatrolWidth = 6
          if (rightBound - leftBound < minPatrolWidth) {
            rightBound = Math.min(leftBound + minPatrolWidth, floorWidth - 0.5)
          }
          
          // Avoid ladders
          for (const ladderX of ladderPositions) {
            if (ladderX >= leftBound && ladderX <= rightBound) {
              rightBound = Math.max(leftBound + minPatrolWidth, ladderX - 2)
            }
          }
          
          positions.push({ x, leftBound, rightBound })
        }
        
        // Distribute enemies on right edge with spacing
        for (let i = 0; i < rightEnemies; i++) {
          const verticalOffset = i * 0.8 // Stagger positions slightly
          const x = floorWidth - margin - verticalOffset - Math.random() * 1.5
          
          // Right edge enemies patrol right half (with wider area)
          let leftBound = Math.max(floorWidth / 2 - 1, 0.5) // Start slightly before center
          let rightBound = floorWidth - 0.5
          
          // Ensure minimum patrol width
          const minPatrolWidth = 6
          if (rightBound - leftBound < minPatrolWidth) {
            leftBound = Math.max(rightBound - minPatrolWidth, 0.5)
          }
          
          // Avoid ladders
          for (const ladderX of ladderPositions) {
            if (ladderX >= leftBound && ladderX <= rightBound) {
              leftBound = Math.min(rightBound - minPatrolWidth, ladderX + 2)
            }
          }
          
          positions.push({ x, leftBound, rightBound })
        }
        break
        
      case 'random':
      default:
        // Smart random positioning with enforced minimum separation
        const placedPositions: number[] = []
        const minSeparation = 2.5 // Minimum 2.5 tiles between any two enemies
        
        for (let i = 0; i < enemyCount; i++) {
          let x: number
          let attempts = 0
          const maxAttempts = 20
          
          // Try to find a position with proper spacing
          do {
            x = margin + Math.random() * usableWidth
            attempts++
            
            // If we can't find a good position, use evenly spaced fallback
            if (attempts >= maxAttempts) {
              x = margin + (usableWidth / (enemyCount + 1)) * (i + 1)
              break
            }
          } while (placedPositions.some(pos => Math.abs(pos - x) < minSeparation))
          
          placedPositions.push(x)
          
          // Wider patrol zones (minimum 6 tiles)
          const minPatrolWidth = 6
          const baseRadius = 3.5
          const radiusVariation = Math.random() * 2 // 3.5-5.5 tiles radius
          const patrolRadius = Math.max(minPatrolWidth / 2, baseRadius + radiusVariation)
          
          // Ensure patrol zones don't overlap with nearby enemies
          let leftBound = Math.max(0.5, x - patrolRadius)
          let rightBound = Math.min(floorWidth - 0.5, x + patrolRadius)
          
          // Ensure minimum width
          if (rightBound - leftBound < minPatrolWidth) {
            const center = (leftBound + rightBound) / 2
            leftBound = Math.max(0.5, center - minPatrolWidth / 2)
            rightBound = Math.min(floorWidth - 0.5, center + minPatrolWidth / 2)
          }
          
          // Check for overlap with existing patrol zones and adjust
          for (let j = 0; j < i; j++) {
            const otherPos = positions[j]
            const otherX = placedPositions[j]
            
            // If patrol zones would overlap, shrink them
            if (x < otherX && rightBound > otherPos.leftBound) {
              rightBound = Math.min(rightBound, otherPos.leftBound - 0.5)
            } else if (x > otherX && leftBound < otherPos.rightBound) {
              leftBound = Math.max(leftBound, otherPos.rightBound + 0.5)
            }
          }
          
          // Avoid ladder positions
          for (const ladderX of ladderPositions) {
            if (ladderX >= leftBound && ladderX <= rightBound) {
              // Adjust bounds to avoid ladder (keep 2 tiles clearance)
              const minPatrolWidth = 6
              if (ladderX - leftBound < rightBound - ladderX) {
                leftBound = Math.min(rightBound - minPatrolWidth, ladderX + 2)
              } else {
                rightBound = Math.max(leftBound + minPatrolWidth, ladderX - 2)
              }
            }
          }
          
          positions.push({ x, leftBound, rightBound })
        }
        break
    }
    
    return positions
  }

  /**
   * Set smart initial direction for enemy based on position and context
   */
  private setSmartEnemyDirection(enemy: any, x: number, floorWidth: number, enemyIndex: number, totalEnemies: number): void {
    // Multiple factors determine initial direction
    const centerX = floorWidth / 2
    const distanceFromCenter = Math.abs(x - centerX)
    const isNearEdge = x < floorWidth * 0.25 || x > floorWidth * 0.75
    
    let directionChance: number
    
    if (totalEnemies === 1) {
      // Single enemy: random direction
      directionChance = 0.5
    } else if (totalEnemies === 2) {
      // Two enemies: make them start moving toward center initially  
      directionChance = x < centerX ? 0.7 : 0.3 // Left enemy goes right more, right enemy goes left more
    } else {
      // Multiple enemies: create varied movement patterns
      if (isNearEdge) {
        // Edge enemies tend to move inward initially
        directionChance = x < centerX ? 0.75 : 0.25
      } else {
        // Center enemies more random, but with some alternating pattern
        directionChance = enemyIndex % 2 === 0 ? 0.3 : 0.7
      }
    }
    
    // Add some true randomness
    directionChance += (Math.random() - 0.5) * 0.3 // ±15% variation
    directionChance = Math.max(0.1, Math.min(0.9, directionChance)) // Clamp to reasonable range
    
    if (Math.random() < directionChance) {
      if (typeof enemy.reverseDirection === 'function') {
        enemy.reverseDirection()
      }
    }
  }
  
  private createTemporaryFloorGrid(): void {
    // Creating temporary floor grid (replaced console.log)
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    const canvasWidth = GameSettings.canvas.width
    
    // Create graphics object for drawing grid lines
    const gridGraphics = this.add.graphics()
    gridGraphics.lineStyle(2, 0x00ff00, 0.7) // Green lines, 70% opacity
    gridGraphics.setDepth(100) // On top of everything
    
    // Draw horizontal lines for each floor - align with TOP surface of platform tiles
    for (let floor = 0; floor < this.floorLayouts.length; floor++) {
      // Calculate platform center Y, then move up to top surface
      const platformCenterY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const topSurfaceY = platformCenterY - tileSize/2 // Move up by half tile height to get top surface
      
      // Draw full-width horizontal line on top surface of platform tiles
      gridGraphics.moveTo(0, topSurfaceY)
      gridGraphics.lineTo(canvasWidth, topSurfaceY)
      
      // Add floor number label with top surface Y coordinate
      const floorText = this.add.text(10, topSurfaceY - 20, `Floor ${floor} (Top:${Math.round(topSurfaceY)})`, {
        fontSize: '12px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 }
      })
      floorText.setDepth(101)
      
      // Floor line drawn at Y position (replaced console.log)
    }
    
    // Draw the stroke to make lines visible
    gridGraphics.strokePath()
    
    // Grid complete (replaced console.log)
  }
  
  private createStalkerCats(): void {
    // Check if red enemies should spawn based on current level
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    if (!levelConfig.enemyTypes.includes('red')) {
      // Red enemies not unlocked yet
      return
    }
    
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    const floorWidth = GameSettings.game.floorWidth
    
    // Add stalker cats starting from floor 2, up to second-to-last floor (avoid door floor)
    const doorFloor = levelConfig.isEndless ? 999 : (levelConfig.floorCount - 1)
    const maxStalkerCatFloor = levelConfig.isEndless ? Math.min(25, this.floorLayouts.length - 1) : doorFloor - 1
    
    for (let floor = 2; floor <= maxStalkerCatFloor && floor < this.floorLayouts.length; floor++) {
      const layout = this.floorLayouts[floor]
      
      // Calculate floor position for stalker cats (on the floor, not ceiling)
      // Place stalker cats directly on the current floor
      const floorY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const floorSurfaceY = floorY - tileSize/2  // Top surface of platform tiles
      const stalkerY = floorSurfaceY - 15        // Same as regular cats - standing on floor
      
      // Determine number of stalker cats (0-1 for now, will scale later)
      const maxStalkerCats = floor < 20 ? 1 : 2
      const numStalkerCats = Math.random() < 0.6 ? Math.floor(Math.random() * maxStalkerCats) + 1 : 0
      
      if (numStalkerCats === 0) continue
      
      // Find valid positions (where there are platforms below)
      const validPositions: number[] = []
      
      if (layout.gapStart === -1) {
        // Complete floor - can place anywhere
        for (let x = 2; x < floorWidth - 2; x++) {
          validPositions.push(x)
        }
      } else {
        // Floor with gap - place only over platform sections
        for (let x = 2; x < layout.gapStart - 1; x++) {
          validPositions.push(x)
        }
        for (let x = layout.gapStart + layout.gapSize + 1; x < floorWidth - 2; x++) {
          validPositions.push(x)
        }
      }
      
      // Place stalker cats at random valid positions
      for (let i = 0; i < Math.min(numStalkerCats, validPositions.length); i++) {
        const randomIndex = Math.floor(Math.random() * validPositions.length)
        const tileX = validPositions[randomIndex]
        const stalkerCatX = tileX * tileSize + tileSize/2
        
        // Remove position to avoid overlapping stalker cats
        validPositions.splice(randomIndex, 1)
        
        // Calculate platform bounds for the section below
        let leftBound = tileSize * 0.5
        let rightBound = tileSize * (floorWidth - 0.5)
        
        if (layout.gapStart !== -1) {
          if (tileX < layout.gapStart) {
            // Left section
            rightBound = tileSize * (layout.gapStart - 0.5)
          } else {
            // Right section
            leftBound = tileSize * (layout.gapStart + layout.gapSize + 0.5)
          }
        }
        
        const stalkerCat = new Cat(
          this,
          stalkerCatX,
          stalkerY,
          leftBound,
          rightBound,
          'red', // Stalkers are red enemies  
          true   // This is a stalker
        )
        
        // Set player reference for detection
        stalkerCat.setPlayerReference(this.player)
        
        this.stalkerCats.add(stalkerCat)
      }
    }
  }
  
  private handleCatCatCollision(
    cat1: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    cat2: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const catObj1 = cat1 as Cat
    const catObj2 = cat2 as Cat
    
    // This handler is now only called for enemies that should collide
    // (jumpers and caterpillars are filtered out by the process callback)
    // console.log(`🐱 Normal cat collision: ${catObj1.getCatColor()} vs ${catObj2.getCatColor()}`)
    
    // Add small separation to prevent sticking
    const separationForce = 10
    if (catObj1.x < catObj2.x) {
      // cat1 is on the left, push apart
      catObj1.setX(catObj1.x - separationForce)
      catObj2.setX(catObj2.x + separationForce)
    } else {
      // cat2 is on the left, push apart
      catObj2.setX(catObj2.x - separationForce)
      catObj1.setX(catObj1.x + separationForce)
    }
    
    catObj1.reverseDirection()
    catObj2.reverseDirection()
  }
  
  
  private createAllCollectibles(): void {
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Get allowed collectible types for current level
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    const allowedCollectibles = levelConfig.collectibleTypes
    
    // Special handling for bonus levels - place exactly 2 treasure chests
    if (this.levelManager.isBonusLevel()) {
      this.createBonusLevelChests()
      return
    }
    
    // Removed level 10 testing - normal collectibles now
    
    // Place collectibles on each floor based on rarity rules from sprint plan
    for (let floor = 0; floor < this.floorLayouts.length; floor++) {
      const layout = this.floorLayouts[floor]
      
      // Calculate Y position above the platform
      const platformY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const collectibleY = platformY - tileSize - 8 // Float above the platform
      
      // Find all valid positions (where there are platforms, avoiding ladders)
      const validPositions: number[] = []
      for (let x = 1; x < GameSettings.game.floorWidth - 1; x++) {
        if (this.hasPlatformAt(layout, x) && !this.hasLadderAt(x, floor) && !this.hasDoorAt(x, floor)) {
          validPositions.push(x)
        }
      }
      
      if (validPositions.length === 0) continue
      
      // Track all used positions and their types for this floor
      const floorUsedPositions: Array<{x: number, type: string}> = []
      
      // Regular coins: distribute throughout floors (2-4 per floor)
      // Skip floor 0 to avoid collectibles in intro animation area
      if (allowedCollectibles.includes('coin') && floor > 0) {
        const numCoins = Math.floor(Math.random() * 3) + 2 // 2-4 coins per floor
        this.placeCollectiblesOfType(validPositions, numCoins, 'coin', collectibleY, floor, floorUsedPositions)
      }
      
      // Blue coins: lower probability (20% chance per floor)
      if (allowedCollectibles.includes('blueCoin') && floor > 0 && Math.random() < 0.2) {
        this.placeCollectiblesOfType(validPositions, 1, 'blueCoin', collectibleY, floor, floorUsedPositions)
      }
      
      // Diamonds: much lower probability (8% chance per floor)
      if (allowedCollectibles.includes('diamond') && floor > 1 && Math.random() < 0.08) {
        this.placeCollectiblesOfType(validPositions, 1, 'diamond', collectibleY, floor, floorUsedPositions)
      }
      
      // Free lives: very low probability starting after level 3 (3% chance per floor)
      if (allowedCollectibles.includes('freeLife') && floor > 2 && Math.random() < 0.03) {
        this.placeCollectiblesOfType(validPositions, 1, 'freeLife', collectibleY, floor, floorUsedPositions)
      }
      
      // Invincibility pendants: Normal spawn rate (3% chance per floor after level 3)
      // But never spawn on floor 0 (player spawn floor)
      const pendantRoll = Math.random()
      const pendantIncluded = allowedCollectibles.includes('invincibilityPendant')
      const isPlayerSpawnFloor = floor === 0
      
      if (pendantIncluded && !isPlayerSpawnFloor && pendantRoll < 0.03) {
        this.placeCollectiblesOfType(validPositions, 1, 'invincibilityPendant', collectibleY, floor, floorUsedPositions)
      }
      
      // Treasure chests: Level-based spawning (2500 points + contents)
      if (allowedCollectibles.includes('treasureChest') && floor >= 3) {
        const currentLevel = this.levelManager.getCurrentLevel()
        const shouldSpawnChest = this.shouldSpawnChestOnFloor(currentLevel, floor)
        if (shouldSpawnChest) {
          this.placeCollectiblesOfType(validPositions, 1, 'treasureChest', collectibleY, floor, floorUsedPositions)
        }
      }
      
      // Flash power-ups: Only spawn on dark mode levels (levels ending in 9)
      // Commented out for later use
      // const currentLevel = this.levelManager.getCurrentLevel()
      // const isDarkModeLevel = currentLevel % 10 === 9
      // if (isDarkModeLevel && floor > 2 && Math.random() < 0.25) { // 25% chance per floor on dark mode levels
      //   this.placeCollectiblesOfType(validPositions, 1, 'flashPowerUp', collectibleY, floor, floorUsedPositions)
      // }
      const currentLevel = this.levelManager.getCurrentLevel() // Still needed for other logic
      
      // Crystal Ball power-up: One per level starting from level 3
      if (currentLevel >= 3 && !this.levelHasCrystalBall && floor >= 2 && Math.random() < 0.3) { // 30% chance
        console.log('🔮 TRYING to spawn Crystal Ball - Level:', currentLevel, 'Floor:', floor, 'HasCrystalBall:', this.levelHasCrystalBall)
        this.placeCollectiblesOfType(validPositions, 1, 'crystalBall', collectibleY, floor, floorUsedPositions)
        this.levelHasCrystalBall = true // Mark that this level has its crystal ball
        console.log('🔮 Crystal Ball spawn attempted, levelHasCrystalBall now:', this.levelHasCrystalBall)
      }
      
      // Cursed Orb power-up: One per level starting from level 11
      if (currentLevel >= 11 && !this.levelHasCursedOrb && floor >= 2 && Math.random() < 0.2) { // 20% chance
        this.placeCollectiblesOfType(validPositions, 1, 'cursedOrb', collectibleY, floor, floorUsedPositions)
        this.levelHasCursedOrb = true // Mark that this level has its cursed orb
      }
      
      // Cursed Teal Orb power-up: One per level starting from level 21
      if (currentLevel >= 21 && !this.levelHasCursedTealOrb && floor >= 2 && Math.random() < 0.15) { // 15% chance
        this.placeCollectiblesOfType(validPositions, 1, 'cursedTealOrb', collectibleY, floor, floorUsedPositions)
        this.levelHasCursedTealOrb = true // Mark that this level has its cursed teal orb
      }
    }
  }
  
  private placeCollectiblesOfType(
    validPositions: number[], 
    count: number, 
    type: 'coin' | 'blueCoin' | 'diamond' | 'freeLife' | 'invincibilityPendant' | 'treasureChest' | 'crystalBall' | 'cursedOrb' | 'cursedTealOrb', // 'flashPowerUp' commented out for later use
    y: number,
    floor: number,
    floorUsedPositions: Array<{x: number, type: string}>
  ): void {
    const tileSize = GameSettings.game.tileSize
    
    // Filter positions - treasure chests need special buffer zone, others use standard filtering
    const availablePositions = type === 'treasureChest' 
      ? validPositions.filter(x => this.isSafeForTreasureChest(x, floor))
      : validPositions.filter(x => !this.hasLadderAt(x, floor) && !this.hasDoorAt(x, floor))
    
    for (let i = 0; i < Math.min(count, availablePositions.length); i++) {
      // Find a position that's not occupied
      let attempts = 0
      let tileX = -1
      
      while (attempts < 20 && tileX === -1) {
        const candidateIndex = Math.floor(Math.random() * availablePositions.length)
        const candidate = availablePositions[candidateIndex]
        
        if (!this.isPositionOccupiedWithVariety(candidate, type, floorUsedPositions)) {
          tileX = candidate
          floorUsedPositions.push({x: tileX, type: type})
          // Remove this position and nearby positions to prevent clustering
          for (let j = availablePositions.length - 1; j >= 0; j--) {
            if (Math.abs(availablePositions[j] - tileX) < 2) {
              availablePositions.splice(j, 1)
            }
          }
        }
        attempts++
      }
      
      if (tileX === -1) break // Couldn't find a valid position
      
      const x = tileX * tileSize + tileSize/2
      
      switch (type) {
        case 'coin':
          const coin = new Coin(this, x, y)
          this.coins.push(coin)
          this.physics.add.overlap(
            this.player,
            coin.sprite,
            () => this.handleCoinCollection(coin),
            undefined,
            this
          )
          break
          
        case 'blueCoin':
          const blueCoin = new BlueCoin(this, x, y)
          this.blueCoins.push(blueCoin)
          this.physics.add.overlap(
            this.player,
            blueCoin.sprite,
            () => this.handleBlueCoinCollection(blueCoin),
            undefined,
            this
          )
          break
          
        case 'diamond':
          const diamond = new Diamond(this, x, y)
          this.diamonds.push(diamond)
          this.physics.add.overlap(
            this.player,
            diamond.sprite,
            () => this.handleDiamondCollection(diamond),
            undefined,
            this
          )
          break
        
        case 'freeLife':
          const freeLife = new FreeLife(this, x, y)
          this.freeLifes.push(freeLife)
          this.physics.add.overlap(
            this.player,
            freeLife.sprite,
            () => this.handleFreeLifeCollection(freeLife),
            undefined,
            this
          )
          break
        
        case 'invincibilityPendant':
          const pendant = new InvincibilityPendant(this, x, y)
          this.invincibilityPendants.push(pendant)
          this.physics.add.overlap(
            this.player,
            pendant.sprite,
            () => {
              this.handleInvincibilityPendantCollection(pendant)
            },
            undefined,
            this
          )
          break
          
        case 'treasureChest':
          const chest = new TreasureChest(this, x, y)
          this.treasureChests.push(chest)
          // Treasure chests use interaction system, not automatic collection
          break
          
        // Commented out for later use
        // case 'flashPowerUp':
        //   const flashPowerUp = new FlashPowerUp(this, x, y)
        //   this.flashPowerUps.push(flashPowerUp)
        //   this.physics.add.overlap(
        //     this.player,
        //     flashPowerUp.sprite,
        //     () => this.handleFlashPowerUpCollection(flashPowerUp),
        //     undefined,
        //     this
        //   )
        //   break
          
        case 'crystalBall':
          console.log('🔮 SPAWNING Crystal Ball at', x, y, 'floor:', floor)
          const crystalBall = new CrystalBall(this, x, y)
          this.crystalBalls.push(crystalBall)
          console.log('🔮 Crystal Ball created, total crystal balls:', this.crystalBalls.length)
          this.physics.add.overlap(
            this.player,
            crystalBall.sprite,
            () => this.handleCrystalBallCollection(crystalBall),
            undefined,
            this
          )
          break
          
        case 'cursedOrb':
          const cursedOrb = new CursedOrb(this, x, y, 'cursed')
          this.cursedOrbs.push(cursedOrb)
          this.physics.add.overlap(
            this.player,
            cursedOrb.sprite,
            () => this.handleCursedOrbCollection(cursedOrb),
            undefined,
            this
          )
          break
          
        case 'cursedTealOrb':
          const cursedTealOrb = new CursedOrb(this, x, y, 'cursedTeal')
          this.cursedTealOrbs.push(cursedTealOrb)
          this.physics.add.overlap(
            this.player,
            cursedTealOrb.sprite,
            () => this.handleCursedTealOrbCollection(cursedTealOrb),
            undefined,
            this
          )
          break
      }
    }
  }
  
  private hasLadderAt(x: number, floor: number): boolean {
    // Check if there's a ladder at this position using stored positions
    const ladders = this.ladderPositions.get(floor) || []
    return ladders.includes(x)
  }
  
  private hasDoorAt(x: number, floor: number): boolean {
    // Check if there's a door at this position (need extra clearance around doors)
    const doorX = this.doorPositions.get(floor)
    if (doorX === undefined) return false
    
    // Need 2-3 tiles clearance around door (doors are wider than ladders)
    return Math.abs(x - doorX) <= 2
  }

  private createBonusLevelChests(): void {
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Place 2 treasure chests on floors 2 and 3 of the bonus level
    const chestFloors = [2, 3]
    
    for (let i = 0; i < chestFloors.length; i++) {
      const floor = chestFloors[i]
      if (floor >= this.floorLayouts.length) continue
      
      const layout = this.floorLayouts[floor]
      
      // Calculate Y position above the platform
      const platformY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const collectibleY = platformY - tileSize - 8 // Float above the platform
      
      // Find all valid positions (where there are platforms, avoiding ladders)
      const validPositions: number[] = []
      for (let x = 1; x < GameSettings.game.floorWidth - 1; x++) {
        if (this.hasPlatformAt(layout, x) && !this.hasLadderAt(x, floor) && !this.hasDoorAt(x, floor)) {
          validPositions.push(x)
        }
      }
      
      if (validPositions.length === 0) continue
      
      // Place the treasure chest at a random valid position
      const randomIndex = Math.floor(Math.random() * validPositions.length)
      const chestX = validPositions[randomIndex] * tileSize + tileSize/2
      
      // Create treasure chest - it will auto-generate contents when opened
      const treasureChest = new TreasureChest(this, chestX, collectibleY)
      this.treasureChests.push(treasureChest)
      
      // Note: Treasure chests auto-generate their contents when opened based on tier
      // For bonus levels, all chests will contain good rewards automatically
    }
    
    // Add lots of collectibles throughout the bonus level
    this.createBonusLevelCollectibles()
    
    // Add guaranteed free life to bonus level
    this.createBonusLevelFreeLife()
  }
  
  private createBonusLevelCollectibles(): void {
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Creating collectibles for bonus level floors
    
    // Place collectibles on all floors of the bonus level
    for (let floor = 1; floor < this.floorLayouts.length - 1; floor++) { // Skip ground and door floors
      const layout = this.floorLayouts[floor]
      
      // Calculate Y position above the platform
      const platformY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const collectibleY = platformY - tileSize - 8
      
      // Find all valid positions (skip treasure chest locations)
      const validPositions: number[] = []
      for (let x = 1; x < GameSettings.game.floorWidth - 1; x++) {
        if (this.hasPlatformAt(layout, x) && !this.hasLadderAt(x, floor) && !this.hasDoorAt(x, floor)) {
          // Skip positions where treasure chests might be placed (we don't know exact positions, but avoid center areas)
          validPositions.push(x)
        }
      }
      
      if (validPositions.length === 0) continue
      
      // Shuffle positions for random placement
      const shuffledPositions = [...validPositions].sort(() => Math.random() - 0.5)
      
      let positionIndex = 0
      
      // Place exactly 1 diamond per floor with smart spacing
      if (shuffledPositions.length > 0) {
        // Pick a position away from edges and ladders for better accessibility
        const safePosition = Math.min(Math.floor(shuffledPositions.length / 3), shuffledPositions.length - 1)
        const x = shuffledPositions[safePosition] * tileSize + tileSize/2
        
        const diamond = new Diamond(this, x, collectibleY)
        this.diamonds.push(diamond)
        
        // Add collision detection with a small delay to ensure diamond is fully initialized
        this.time.delayedCall(100, () => {
          this.physics.add.overlap(
            this.player,
            diamond.sprite,
            () => this.handleDiamondCollection(diamond),
            undefined,
            this
          )
        })
        
        // Remove used position to avoid conflicts
        shuffledPositions.splice(safePosition, 1)
      }
      
      // Place exactly 5 blue coins per floor with spacing
      const blueCoinSpacing = Math.max(1, Math.floor(shuffledPositions.length / 6)) // Ensure spacing
      for (let i = 0; i < 5 && i < shuffledPositions.length; i++) {
        const spacedIndex = Math.min(i * blueCoinSpacing, shuffledPositions.length - 1)
        const x = shuffledPositions[spacedIndex] * tileSize + tileSize/2
        const blueCoin = new BlueCoin(this, x, collectibleY)
        this.blueCoins.push(blueCoin)
        
        this.physics.add.overlap(
          this.player,
          blueCoin.sprite,
          () => this.handleBlueCoinCollection(blueCoin),
          undefined,
          this
        )
        
        // Remove used position
        shuffledPositions.splice(spacedIndex, 1)
      }
      
      // Fill remaining positions with regular crystals (with minimum spacing)
      let crystalIndex = 0
      const minCrystalSpacing = 2 // Minimum tiles between crystals
      for (let i = 0; i < shuffledPositions.length; i++) {
        // Only place if we have enough spacing from previous crystal
        if (crystalIndex === 0 || i >= crystalIndex + minCrystalSpacing) {
          const x = shuffledPositions[i] * tileSize + tileSize/2
          const coin = new Coin(this, x, collectibleY)
          this.coins.push(coin)
          
          this.physics.add.overlap(
            this.player,
            coin.sprite,
            () => this.handleCoinCollection(coin),
            undefined,
            this
          )
          crystalIndex = i
        }
      }
    }
  }

  private createBonusLevelFreeLife(): void {
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Place guaranteed free life on floor 3 (middle floor) for easier access
    const targetFloor = 3 // Middle floor of 5-floor bonus level
    
    if (targetFloor < this.floorLayouts.length) {
      const layout = this.floorLayouts[targetFloor]
      
      // Calculate Y position above the platform (same as other collectibles)
      const platformY = GameSettings.canvas.height - tileSize/2 - (targetFloor * floorSpacing)
      const collectibleY = platformY - tileSize - 8 // Same Y as other collectibles for consistency
      
      // Find all valid positions
      const validPositions: number[] = []
      for (let x = 1; x < GameSettings.game.floorWidth - 1; x++) {
        if (this.hasPlatformAt(layout, x) && !this.hasLadderAt(x, targetFloor) && !this.hasDoorAt(x, targetFloor)) {
          validPositions.push(x)
        }
      }
      
      if (validPositions.length > 0) {
        // Place free life at position that won't conflict with other items
        const safePosition = Math.min(2, validPositions.length - 1) // Near left side but not edge
        const x = validPositions[safePosition] * tileSize + tileSize/2
        
        const freeLife = new FreeLife(this, x, collectibleY)
        this.freeLifes.push(freeLife)
        // Free life created on bonus level
        
        // Add collision detection with a small delay to ensure free life is fully initialized
        this.time.delayedCall(100, () => {
          this.physics.add.overlap(
            this.player,
            freeLife.sprite,
            () => {
              // Free life collected on bonus level
              this.handleFreeLifeCollection(freeLife)
            },
            undefined,
            this
          )
          // Free life collision detection added
        })
      }
    }
  }

  private createLevel10TestingCollectibles(): void {
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Place invincibility pendants on ALL floors for easy testing
    // Use all available floors from the layout
    const pendantFloors = []
    for (let i = 1; i < this.floorLayouts.length - 1; i++) { // Skip ground floor (0) and top floor (door floor)
      pendantFloors.push(i)
    }
    
    for (let floor of pendantFloors) {
      if (floor >= this.floorLayouts.length) continue
      
      const layout = this.floorLayouts[floor]
      
      // Calculate Y position above the platform
      const platformY = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      const collectibleY = platformY - tileSize - 8 // Float above the platform
      
      // Find all valid positions
      const validPositions: number[] = []
      for (let x = 1; x < GameSettings.game.floorWidth - 1; x++) {
        if (this.hasPlatformAt(layout, x) && !this.hasLadderAt(x, floor) && !this.hasDoorAt(x, floor)) {
          validPositions.push(x)
        }
      }
      
      if (validPositions.length === 0) continue
      
      // Place 2-3 invincibility pendants per floor for testing
      const pendantsToPlace = Math.min(3, validPositions.length)
      for (let i = 0; i < pendantsToPlace; i++) {
        const randomIndex = Math.floor(Math.random() * validPositions.length)
        const x = validPositions.splice(randomIndex, 1)[0] // Remove to avoid duplicates
        const pendantX = x * tileSize + tileSize/2
        
        // Create invincibility pendant
        const pendant = new InvincibilityPendant(this, pendantX, collectibleY)
        this.invincibilityPendants.push(pendant)
        
        // Add collision detection
        this.physics.add.overlap(
          this.player,
          pendant.sprite,
          () => this.handleInvincibilityPendantCollection(pendant),
          undefined,
          this
        )
      }
    }
  }

  private shouldSpawnChestOnFloor(level: number, floor: number): boolean {
    // Level-based chest spawning rules:
    // Levels 1-4: Max 1 chest per level
    // Levels 5-6: Max 2 chests per level  
    // Levels 7+: Original rule (1 per 1-3 floors with 35% chance)
    
    if (level <= 4) {
      // Levels 1-4: 1 chest maximum, spawn on middle floors
      const levelConfig = this.levelManager.getLevelConfig(level)
      const middleFloor = Math.floor(levelConfig.floorCount / 2)
      return floor === middleFloor || (floor === middleFloor + 1 && Math.random() < 0.5)
    } else if (level <= 6) {
      // Levels 5-6: 2 chests maximum, spread across level
      const levelConfig = this.levelManager.getLevelConfig(level)
      const firstChestFloor = Math.floor(levelConfig.floorCount / 3)
      const secondChestFloor = Math.floor((levelConfig.floorCount * 2) / 3)
      return floor === firstChestFloor || floor === secondChestFloor
    } else {
      // Levels 7+: Original rule
      return floor % 3 === 0 || Math.random() < 0.35
    }
  }

  private isSafeForTreasureChest(x: number, floor: number): boolean {
    // Treasure chests need larger buffer zone because items scatter up to 60 pixels from chest center
    const floorWidth = GameSettings.game.floorWidth
    const tileSize = GameSettings.game.tileSize
    const itemScatterRadius = 60 // pixels - maximum distance items scatter from chest
    const bufferTiles = Math.ceil((itemScatterRadius + 16) / tileSize) // +16 for item width, converted to tiles
    
    // Check floor edges - ensure scattered items won't fall off the platform
    if (x < bufferTiles || x >= floorWidth - bufferTiles) {
      return false
    }
    
    // Check for gaps/spikes - ensure scattered items won't fall into gaps
    const layout = this.floorLayouts[floor]
    if (layout && layout.gapStart !== -1) {
      const gapEnd = layout.gapStart + layout.gapSize
      // Check if position is within buffer zone of the gap
      if (x >= layout.gapStart - bufferTiles && x <= gapEnd + bufferTiles - 1) {
        return false
      }
    }
    
    // Check for ladders - ensure scattered items won't interfere with ladders
    // Check ladders on current floor AND floor below (since ladders span between floors)
    const laddersCurrentFloor = this.ladderPositions.get(floor) || []
    const laddersFloorBelow = this.ladderPositions.get(floor - 1) || []
    const allRelevantLadders = [...laddersCurrentFloor, ...laddersFloorBelow]
    
    for (const ladderX of allRelevantLadders) {
      const distance = Math.abs(x - ladderX)
      if (distance <= bufferTiles) {
        return false
      }
    }
    
    // Check for doors - ensure scattered items won't interfere with doors
    const doorX = this.doorPositions.get(floor)
    if (doorX !== undefined && Math.abs(x - doorX) <= bufferTiles + 1) { // +1 extra buffer for door interaction
      return false
    }
    
    return true
  }
  
  private isPositionOccupied(x: number, floor: number, usedPositions: number[]): boolean {
    // Check if position has ladder (need clearance)
    if (this.hasLadderAt(x, floor)) {
      return true
    }
    
    // Check if position conflicts with door (need clearance)
    const doorX = this.doorPositions.get(floor)
    if (doorX !== undefined && Math.abs(x - doorX) < 4) { // 4 tiles clearance from door
      return true
    }
    
    // Check for ladder conflicts on this floor (wider clearance)
    const ladderPositions = this.ladderPositions.get(floor) || []
    for (const ladderX of ladderPositions) {
      if (Math.abs(x - ladderX) < 2) { // 2 tiles clearance from ladders
        return true
      }
    }
    
    // Check if position is already used by another item (minimum 2 tile spacing)
    return usedPositions.some(pos => Math.abs(pos - x) < 2)
  }

  private isPositionOccupiedWithVariety(
    x: number, 
    type: string, 
    usedPositions: Array<{x: number, type: string}>
  ): boolean {
    // Check if position is already occupied (minimum 2 tile spacing)
    const occupied = usedPositions.some(item => Math.abs(item.x - x) < 2)
    if (occupied) return true
    
    // Check for same gem type clustering (prevent same type within 3 tiles)
    const sameTypeNearby = usedPositions.some(item => 
      item.type === type && Math.abs(item.x - x) < 3
    )
    
    return sameTypeNearby
  }
  
  private handleCoinCollection(coin: Coin): void {
    // Don't collect during intro animation
    if (this.isLevelStarting) return
    
    // Check if coin is already collected to prevent multiple collections
    if (coin.isCollected()) return
    
    // Add points
    this.score += GameSettings.scoring.coinCollect
    
    // Play gem collect sound effect
    this.playSoundEffect('gem-collect', 0.5)
    
    // Increment coin counter and check for extra life
    this.totalCoinsCollected++
    this.totalGemsCollected++ // Track regular gems
    this.game.registry.set('totalCoins', this.totalCoinsCollected)  // Save to registry
    this.game.registry.set('totalGems', this.totalGemsCollected) // Save gems to registry
    this.checkForExtraLife()
    
    // Update displays
    this.updateScoreDisplay()
    this.updateCoinCounterDisplay()
    
    // Show point popup
    this.showPointPopup(coin.sprite.x, coin.sprite.y - 20, GameSettings.scoring.coinCollect)
    
    // Trigger haptic feedback for collecting coin
    this.triggerFarcadeHapticFeedback()
    
    // Play collection animation and remove coin
    coin.collect()
    
    // Remove from coins array immediately to prevent multiple collections
    const index = this.coins.indexOf(coin)
    if (index > -1) {
      this.coins.splice(index, 1)
    }
  }
  
  private handleBlueCoinCollection(blueCoin: BlueCoin): void {
    // Don't collect during intro animation
    if (this.isLevelStarting) return
    
    // Check if already collected
    if (blueCoin.isCollected()) return
    
    const points = 500
    this.score += points
    
    // Play blue gem collect sound effect
    this.playSoundEffect('big-blue-gem-collect', 0.5)
    
    // Blue coins count as 5 coins toward extra life
    this.totalCoinsCollected += 5
    this.totalBlueGemsCollected++ // Track blue gems
    this.game.registry.set('totalCoins', this.totalCoinsCollected)  // Save to registry
    this.game.registry.set('totalBlueGems', this.totalBlueGemsCollected) // Save blue gems to registry
    this.checkForExtraLife()
    
    // Update displays
    this.updateScoreDisplay()
    this.updateCoinCounterDisplay()
    
    // Show point popup
    this.showPointPopup(blueCoin.sprite.x, blueCoin.sprite.y - 20, points)
    
    // Trigger haptic feedback for collecting blue coin
    this.triggerFarcadeHapticFeedback()
    
    // Play collection animation
    blueCoin.collect()
    
    // Remove from array
    const index = this.blueCoins.indexOf(blueCoin)
    if (index > -1) {
      this.blueCoins.splice(index, 1)
    }
  }
  
  private handleDiamondCollection(diamond: Diamond): void {
    // Don't collect during intro animation
    if (this.isLevelStarting) return
    
    // Check if already collected
    if (diamond.isCollected()) return
    
    const points = 1000
    this.score += points
    
    // Play diamond collect sound effect
    this.playSoundEffect('diamond-collect', 0.5)
    
    // Diamonds count as 10 coins toward extra life
    this.totalCoinsCollected += 10
    this.totalDiamondsCollected++ // Track diamonds
    this.game.registry.set('totalCoins', this.totalCoinsCollected)  // Save to registry
    this.game.registry.set('totalDiamonds', this.totalDiamondsCollected) // Save diamonds to registry
    this.checkForExtraLife()
    
    // Update displays
    this.updateScoreDisplay()
    this.updateCoinCounterDisplay()
    
    // Show point popup
    this.showPointPopup(diamond.sprite.x, diamond.sprite.y - 20, points)
    
    // Trigger haptic feedback for collecting diamond
    this.triggerFarcadeHapticFeedback()
    
    // Play collection animation
    diamond.collect()
    
    // Remove from array
    const index = this.diamonds.indexOf(diamond)
    if (index > -1) {
      this.diamonds.splice(index, 1)
    }
  }
  
  private handleFreeLifeCollection(freeLife: FreeLife): void {
    // Don't collect during intro animation
    if (this.isLevelStarting) return
    
    // Check if already collected
    if (freeLife.isCollected()) return
    
    const points = 2000
    this.score += points
    
    // Play heart collect sound effect
    this.playSoundEffect('heart-collect', 0.5)
    
    // Add extra life (if not at max)
    if (this.lives < this.MAX_LIVES) {
      this.lives++
      this.game.registry.set('playerLives', this.lives)  // FIX: Use correct registry key
      
      console.log(`💚 Free life collected! Lives: ${this.lives}`)
      
      // Show extra life popup with reason
      this.showExtraLifePopup('Heart Crystal!')
    }
    // If already at max lives, just collect it for points
    
    // Update displays
    this.updateScoreDisplay()
    this.updateLivesDisplay()
    
    // Show point popup
    this.showPointPopup(freeLife.sprite.x, freeLife.sprite.y - 20, points)
    
    // Play collection animation
    freeLife.collect()
    
    // Remove from array
    const index = this.freeLifes.indexOf(freeLife)
    if (index > -1) {
      this.freeLifes.splice(index, 1)
    }
  }
  
  private handleInvincibilityPendantCollection(pendant: InvincibilityPendant): void {
    
    // Don't collect during intro animation
    if (this.isLevelStarting) {
      return
    }
    
    // Check if already collected
    if (pendant.isCollected()) {
      return
    }
    
    
    const points = 300
    this.score += points
    
    // Play powerup collect sound effect
    this.playSoundEffect('powerup-collect', 0.5)
    
    // Activate invincibility for 10 seconds
    this.activateInvincibility()
    
    // Update score display
    this.updateScoreDisplay()
    
    // Show point popup
    this.showPointPopup(pendant.sprite.x, pendant.sprite.y - 20, points)
    
    // Play collection animation
    pendant.collect()
    
    // Remove from array
    const index = this.invincibilityPendants.indexOf(pendant)
    if (index > -1) {
      this.invincibilityPendants.splice(index, 1)
    }
  }
  
  // Commented out for later use
  // private handleFlashPowerUpCollection(flashPowerUp: FlashPowerUp): void {
  //   // Don't collect during intro animation
  //   if (this.isLevelStarting) return
  //   
  //   // Activate flash power-up (reveals full screen for 5 seconds)
  //   this.activateFlashPowerUp()
  //   
  //   // Play collection animation
  //   flashPowerUp.collect()
  //   
  //   // Remove from array
  //   const index = this.flashPowerUps.indexOf(flashPowerUp)
  //   if (index > -1) {
  //     this.flashPowerUps.splice(index, 1)
  //   }
  // }
  
  private handleCrystalBallCollection(crystalBall: CrystalBall): void {
    console.log('🔮 CRYSTAL BALL COLLISION DETECTED!')
    // Don't collect during intro animation
    if (this.isLevelStarting) {
      console.log('❌ Cannot collect - level is starting')
      return
    }
    if (crystalBall.isCollected()) {
      console.log('❌ Cannot collect - already collected')
      return
    }
    
    console.log('🔮 COLLECTING Crystal Ball - activating power-up!')
    
    // Play powerup collect sound effect
    this.playSoundEffect('powerup-collect', 0.5)
    
    // Activate crystal ball power-up on player
    this.player.activateCrystalBall()
    
    // Play collection animation
    crystalBall.collect()
    
    // Remove from array
    const index = this.crystalBalls.indexOf(crystalBall)
    if (index > -1) {
      this.crystalBalls.splice(index, 1)
      console.log('🔮 Crystal Ball removed from array, remaining:', this.crystalBalls.length)
    }
    
    // Haptic feedback if available
    if (window.FarcadeSDK?.singlePlayer?.actions?.hapticFeedback) {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
    }
  }
  
  private handleCursedOrbCollection(cursedOrb: CursedOrb): void {
    console.log('💀 CURSED ORB COLLISION DETECTED!')
    // Don't collect during intro animation
    if (this.isLevelStarting) {
      console.log('❌ Cannot collect - level is starting')
      return
    }
    if (cursedOrb.isCollected()) {
      console.log('❌ Cannot collect - already collected')
      return
    }
    
    // Play cursed orb collect sound effect
    this.playSoundEffect('cursed-orb-collect', 0.5)
    
    // Activate cursed orb power-up on player
    this.player.activateCursedOrb()
    
    // Play collection animation
    cursedOrb.collect()
    
    // Remove from array
    const index = this.cursedOrbs.indexOf(cursedOrb)
    if (index > -1) {
      this.cursedOrbs.splice(index, 1)
    }
    
    // Haptic feedback if available
    if (window.FarcadeSDK?.singlePlayer?.actions?.hapticFeedback) {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
    }
  }
  
  private handleCursedTealOrbCollection(cursedTealOrb: CursedOrb): void {
    console.log('🌀 CURSED TEAL ORB COLLISION DETECTED!')
    // Don't collect during intro animation
    if (this.isLevelStarting) {
      console.log('❌ Cannot collect - level is starting')
      return
    }
    if (cursedTealOrb.isCollected()) {
      console.log('❌ Cannot collect - already collected')
      return
    }
    
    // Play cursed orb collect sound effect
    this.playSoundEffect('cursed-orb-collect', 0.5)
    
    // Activate cursed teal orb power-up on player
    this.player.activateCursedTealOrb()
    
    // Play collection animation
    cursedTealOrb.collect()
    
    // Remove from array
    const index = this.cursedTealOrbs.indexOf(cursedTealOrb)
    if (index > -1) {
      this.cursedTealOrbs.splice(index, 1)
    }
    
    // Haptic feedback if available
    if (window.FarcadeSDK?.singlePlayer?.actions?.hapticFeedback) {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
    }
  }
  
  // Commented out for later use
  // private activateFlashPowerUp(): void {
  //   this.flashPowerUpActive = true
  //   
  //   // Clear existing timer if any
  //   if (this.flashPowerUpTimer) {
  //     this.flashPowerUpTimer.destroy()
  //   }
  //   
  //   // Immediately fade out the visibility mask for instant full screen reveal
  //   // Scale up happens instantly but invisibly
  //   this.visibilityMask.setScale(6, 6) // Instant scale
  //   this.tweens.add({
  //     targets: this.visibilityMask,
  //     alpha: 0, // Immediate fade out
  //     duration: 100, // Very fast fade
  //     ease: 'Power2.easeOut'
  //   })
  //   
  //   // Set 5-second timer
  //   this.flashPowerUpTimer = this.time.delayedCall(5000, () => {
  //     this.flashPowerUpActive = false
  //     this.flashPowerUpTimer = null
  //     
  //     // Immediately return to normal - instant scale and fade back
  //     this.visibilityMask.setScale(1, 1) // Instant scale back to normal
  //     this.visibilityMask.setAlpha(1) // Instant fade back to visible
  //   })
  // }
  
  activateDarknessEffect(): void {
    console.log('💀 Activating darkness effect!')
    // Create or update darkness overlay using existing visibilityOverlay image
    if (!this.darknessOverlay) {
      this.darknessOverlay = this.add.image(
        GameSettings.canvas.width / 2,
        GameSettings.canvas.height / 2 - 50, // Shift up 50 pixels
        'visibilityOverlay'
      )
      this.darknessOverlay.setScrollFactor(0)
      this.darknessOverlay.setDepth(150) // Above most game elements but below HUD
      this.darknessOverlay.setOrigin(0.5, 0.5)
    } else {
      this.darknessOverlay.setVisible(true)
    }
    
    // Fade in the darkness
    this.darknessOverlay.setAlpha(0)
    this.tweens.add({
      targets: this.darknessOverlay,
      alpha: 1.0, // 100% opacity
      duration: 500,
      ease: 'Power2.easeIn'
    })
  }
  
  deactivateDarknessEffect(): void {
    console.log('💀 Deactivating darkness effect!')
    if (this.darknessOverlay) {
      // Fade out the darkness
      this.tweens.add({
        targets: this.darknessOverlay,
        alpha: 0,
        duration: 500,
        ease: 'Power2.easeOut',
        onComplete: () => {
          if (this.darknessOverlay) {
            this.darknessOverlay.setVisible(false)
          }
        }
      })
    }
  }
  
  createCrystalBallProjectile(x: number, y: number, direction: number, playerVelocityX: number = 0): void {
    console.log('Creating crystal ball projectile at', x, y, 'direction:', direction, 'player velocity:', playerVelocityX)
    
    // Play throw sound
    this.playSoundEffect('crystal-ball-throw', 0.5)
    
    const projectile = new CrystalBallProjectile(this, x, y, direction, playerVelocityX)
    this.crystalBallProjectiles.push(projectile)
    
    // Add collision with all enemy types
    this.physics.add.overlap(
      projectile,
      this.cats,
      (proj, enemy) => this.handleProjectileEnemyCollision(proj as CrystalBallProjectile, enemy),
      undefined,
      this
    )
    
    this.physics.add.overlap(
      projectile,
      this.beetles,
      (proj, enemy) => this.handleProjectileEnemyCollision(proj as CrystalBallProjectile, enemy),
      undefined,
      this
    )
    
    // Add collision with stalker cats
    this.physics.add.overlap(
      projectile,
      this.stalkerCats,
      (proj, enemy) => this.handleProjectileEnemyCollision(proj as CrystalBallProjectile, enemy),
      undefined,
      this
    )
    
    // Add collision with BaseBlu enemies
    this.physics.add.overlap(
      projectile,
      this.baseBlus,
      (proj, enemy) => this.handleProjectileEnemyCollision(proj as CrystalBallProjectile, enemy),
      undefined,
      this
    )
    
    // Add collision with platforms and spikes (for bouncing)
    this.physics.add.collider(projectile, this.platforms)
    this.physics.add.collider(projectile, this.spikes)
    
    console.log('Crystal ball projectile created, total projectiles:', this.crystalBallProjectiles.length)
  }
  
  private updateCrystalBallProjectiles(time: number, delta: number): void {
    // Update and clean up projectiles
    for (let i = this.crystalBallProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.crystalBallProjectiles[i]
      
      if (!projectile || !projectile.scene) {
        // Remove destroyed projectiles
        this.crystalBallProjectiles.splice(i, 1)
      } else {
        projectile.update(time, delta)
      }
    }
  }
  
  private handleProjectileEnemyCollision(projectile: CrystalBallProjectile, enemy: any): void {
    console.log('💥 Crystal Ball projectile hit enemy!')
    
    // Play crystal ball hit enemy sound
    this.playSoundEffect('crystal-ball-hit-enemy', 0.5)
    
    // Simple enemy defeat animation without portal effect
    if (enemy && enemy.body) {
      enemy.body.enable = false // Disable physics during animation
      
      // Create a simple sparkle effect instead of portal
      this.createCrystalBallDefeatEffect(enemy.x, enemy.y)
      
      // Animate enemy shrinking and fading
      this.tweens.add({
        targets: enemy,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeOut',
        onComplete: () => {
          // Defeat enemy after animation
          if (enemy.defeat) {
            enemy.defeat()
          } else if (enemy.destroy) {
            enemy.destroy()
          }
        }
      })
    }
    
    // Award points
    const basePoints = enemy.getPointValue ? enemy.getPointValue() : 100
    this.score += basePoints
    this.updateScoreDisplay()
    
    // Create score popup
    this.showPointPopup(enemy.x, enemy.y - 20, basePoints)
    
    console.log('💥 Enemy defeated by crystal ball, awarded', basePoints, 'points')
    
    // Burst the projectile
    projectile.hitEnemy()
    
    // Remove from array
    const index = this.crystalBallProjectiles.indexOf(projectile)
    if (index > -1) {
      this.crystalBallProjectiles.splice(index, 1)
      console.log('💥 Projectile removed, remaining:', this.crystalBallProjectiles.length)
    }
    
    // Haptic feedback
    if (window.FarcadeSDK?.singlePlayer?.actions?.hapticFeedback) {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
    }
  }
  
  updateCrystalBallTimer(timeRemaining: number, maxTime: number): void {
    // Keep timer always visible (don't hide when expired)
    this.crystalBallTimerImage.setVisible(true)
    
    // TESTING: Log to see if this method is being called
    console.log('Crystal ball timer update:', timeRemaining, 'ms remaining')
    
    if (timeRemaining > 0) {
      // Calculate progress (0 to 1, where 1 is full time, 0 is expired)
      const progress = timeRemaining / maxTime
      
      // Position overlay at timer image location
      this.crystalBallTimerMask.x = this.crystalBallTimerImage.x
      this.crystalBallTimerMask.y = this.crystalBallTimerImage.y
      
      // Clear and redraw the overlay
      this.crystalBallTimerMask.clear()
      this.crystalBallTimerMask.fillStyle(0x44d0a7, 0.6) // Green overlay
      this.crystalBallTimerMask.beginPath()
      this.crystalBallTimerMask.moveTo(0, 0) // Center relative to positioned graphics
      this.crystalBallTimerMask.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * (1 - progress)), false)
      this.crystalBallTimerMask.lineTo(0, 0) // Line back to center
      this.crystalBallTimerMask.closePath()
      this.crystalBallTimerMask.fillPath()
      
      // Add warning flash when 2 seconds or less remain
      if (timeRemaining <= 2000) {
        const flashAlpha = Math.sin(Date.now() / 100) * 0.5 + 0.5 // Oscillate between 0 and 1
        this.crystalBallTimerImage.setAlpha(0.5 + flashAlpha * 0.5) // Flash between 0.5 and 1.0
        console.log('Crystal ball timer WARNING - flashing')
      } else {
        this.crystalBallTimerImage.setAlpha(1.0)
      }
    } else {
      // Clear mask when inactive
      this.crystalBallTimerMask.clear()
      this.crystalBallTimerImage.setAlpha(1.0)
      console.log('Crystal ball timer - power-up expired, hiding timer')
    }
  }
  
  updateCursedOrbTimer(timeRemaining: number, maxTime: number): void {
    if (timeRemaining > 0) {
      this.cursedOrbTimerImage.setVisible(true)
      
      // Calculate progress (0 to 1)
      const progress = timeRemaining / maxTime
      
      // Position overlay at timer image location
      this.cursedOrbTimerMask.x = this.cursedOrbTimerImage.x
      this.cursedOrbTimerMask.y = this.cursedOrbTimerImage.y
      
      // Clear and redraw the overlay
      this.cursedOrbTimerMask.clear()
      this.cursedOrbTimerMask.fillStyle(0x580641, 0.7) // Dark purple overlay
      this.cursedOrbTimerMask.beginPath()
      this.cursedOrbTimerMask.moveTo(0, 0) // Center relative to positioned graphics
      this.cursedOrbTimerMask.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * (1 - progress)), false)
      this.cursedOrbTimerMask.lineTo(0, 0) // Line back to center
      this.cursedOrbTimerMask.closePath()
      this.cursedOrbTimerMask.fillPath()
      
      // Add warning flash when 2 seconds or less remain
      if (timeRemaining <= 2000) {
        const flashAlpha = Math.sin(Date.now() / 100) * 0.5 + 0.5 // Oscillate between 0 and 1
        this.cursedOrbTimerImage.setAlpha(0.5 + flashAlpha * 0.5) // Flash between 0.5 and 1.0
      } else {
        this.cursedOrbTimerImage.setAlpha(1.0)
      }
    } else {
      // Clear mask when inactive
      this.cursedOrbTimerMask.clear()
      this.cursedOrbTimerImage.setAlpha(1.0)
    }
  }
  
  updateCursedTealOrbTimer(timeRemaining: number, maxTime: number): void {
    if (timeRemaining > 0) {
      this.cursedTealOrbTimerImage.setVisible(true)
      
      // Calculate progress (0 to 1)
      const progress = timeRemaining / maxTime
      
      // Position overlay at timer image location
      this.cursedTealOrbTimerMask.x = this.cursedTealOrbTimerImage.x
      this.cursedTealOrbTimerMask.y = this.cursedTealOrbTimerImage.y
      
      // Clear and redraw the overlay
      this.cursedTealOrbTimerMask.clear()
      this.cursedTealOrbTimerMask.fillStyle(0x49a79c, 0.7) // Teal overlay
      this.cursedTealOrbTimerMask.beginPath()
      this.cursedTealOrbTimerMask.moveTo(0, 0) // Center relative to positioned graphics
      this.cursedTealOrbTimerMask.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * (1 - progress)), false)
      this.cursedTealOrbTimerMask.lineTo(0, 0) // Line back to center
      this.cursedTealOrbTimerMask.closePath()
      this.cursedTealOrbTimerMask.fillPath()
      
      // Add warning flash when 2 seconds or less remain
      if (timeRemaining <= 2000) {
        const flashAlpha = Math.sin(Date.now() / 100) * 0.5 + 0.5 // Oscillate between 0 and 1
        this.cursedTealOrbTimerImage.setAlpha(0.5 + flashAlpha * 0.5) // Flash between 0.5 and 1.0
      } else {
        this.cursedTealOrbTimerImage.setAlpha(1.0)
      }
    } else {
      // Clear mask when inactive
      this.cursedTealOrbTimerMask.clear()
      this.cursedTealOrbTimerImage.setAlpha(1.0)
    }
  }
  
  private activateInvincibility(): void {
    // If already invincible, reset timer to full 10 seconds
    if (this.invincibilityTimer) {
      this.invincibilityTimer.destroy()
    }
    
    this.invincibilityActive = true
    this.invincibilityTimeRemaining = 10
    this.invincibilityWarningPlayed = false // Reset warning flag
    
    // Activate speed boost for player during invincibility
    this.player.setSpeedMultiplier(1.5)
    
    // Start countdown timer (loop indefinitely, we'll handle stopping in the callback)
    this.invincibilityTimer = this.time.addEvent({
      delay: 100, // Update every 100ms for smooth animation
      callback: () => this.updateInvincibilityTimer(),
      loop: true // Loop indefinitely, stop manually when time runs out
    })
    
    // Add golden aura to player
    this.addPlayerGoldenAura()
    
    // Start sparkle effect around HUD timer
    this.startTimerSparkles()
    
    // Enable spike walking (disable damage overlap, enable collision)
    this.enableSpikeWalking()
  }
  
  private updateInvincibilityTimer(): void {
    this.invincibilityTimeRemaining -= 0.1
    
    // Warning when 2 seconds remaining (sound removed)
    if (!this.invincibilityWarningPlayed && this.invincibilityTimeRemaining <= 2 && this.invincibilityTimeRemaining > 0) {
      this.invincibilityWarningPlayed = true
      console.log('⏰ Timer warning for invincibility')
    }
    
    if (this.invincibilityTimeRemaining <= 0) {
      // End invincibility
      this.invincibilityActive = false
      this.invincibilityTimeRemaining = 0
      
      // Destroy the timer completely
      if (this.invincibilityTimer) {
        this.invincibilityTimer.destroy()
        this.invincibilityTimer = null
      }
      
      // Clear mask
      this.invincibilityTimerMask.clear()
      
      // Stop timer sparkles
      this.stopTimerSparkles()
      
      // Remove player aura
      this.removePlayerGoldenAura()
      
      // Reset player speed to normal
      this.player.setSpeedMultiplier(1.0)
      
      // Disable spike walking (restore damage overlap, remove collision)
      this.disableSpikeWalking()
    } else {
      // Update circular mask for countdown effect
      this.updateInvincibilityMask()
      
      // Pulse effect in last 3 seconds
      if (this.invincibilityTimeRemaining <= 3) {
        const pulse = Math.sin(this.invincibilityTimeRemaining * 10) * 0.2 + 0.8
        this.invincibilityTimerImage.setAlpha(pulse)
      }
    }
  }
  
  private updateInvincibilityMask(): void {
    // Position overlay at timer image location
    this.invincibilityTimerMask.x = this.invincibilityTimerImage.x
    this.invincibilityTimerMask.y = this.invincibilityTimerImage.y
    
    // Calculate progress for countdown
    const progress = this.invincibilityTimeRemaining / 10 // 0 to 1
    
    // Clear and redraw the overlay
    this.invincibilityTimerMask.clear()
    this.invincibilityTimerMask.fillStyle(0xffd700, 0.6) // Golden overlay
    this.invincibilityTimerMask.beginPath()
    this.invincibilityTimerMask.moveTo(0, 0) // Center relative to positioned graphics
    this.invincibilityTimerMask.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * (1 - progress)), false)
    this.invincibilityTimerMask.lineTo(0, 0) // Line back to center
    this.invincibilityTimerMask.closePath()
    this.invincibilityTimerMask.fillPath()
    // Note: No mask applied - this draws a visible overlay on top of the timer
  }
  
  private addPlayerGoldenAura(): void {
    if (this.playerGoldenAura || !this.player) return
    
    // Create golden aura around player
    this.playerGoldenAura = this.add.circle(this.player.x, this.player.y, 25, 0xffd700)
    this.playerGoldenAura.setAlpha(0.3)
    this.playerGoldenAura.setDepth(this.player.depth - 1)
    
    // Add pulsing animation to aura
    this.tweens.add({
      targets: this.playerGoldenAura,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Create particle trail system
    this.createPlayerParticleTrail()
  }
  
  private removePlayerGoldenAura(): void {
    if (this.playerGoldenAura) {
      this.playerGoldenAura.destroy()
      this.playerGoldenAura = null
    }
    
    // Clean up particle trail
    this.playerParticleTrail.forEach(particle => particle.destroy())
    this.playerParticleTrail = []
  }

  private startTimerSparkles(): void {
    // Clear any existing sparkle timer
    if (this.invincibilityTimerSparkleTimer) {
      this.invincibilityTimerSparkleTimer.destroy()
    }
    
    // Create sparkle effect timer (similar to pendant sparkles)
    this.invincibilityTimerSparkleTimer = this.time.addEvent({
      delay: 300 + Math.random() * 200,
      callback: () => this.createTimerSparkle(),
      loop: true
    })
  }

  private stopTimerSparkles(): void {
    if (this.invincibilityTimerSparkleTimer) {
      this.invincibilityTimerSparkleTimer.destroy()
      this.invincibilityTimerSparkleTimer = null
    }
  }

  private createTimerSparkle(): void {
    if (!this.invincibilityTimerImage || !this.invincibilityActive) return
    
    // Get timer position
    const timerX = this.invincibilityTimerImage.x
    const timerY = this.invincibilityTimerImage.y
    
    // Random position around timer (within 25px radius)
    const sparkleX = timerX + (Math.random() - 0.5) * 50
    const sparkleY = timerY + (Math.random() - 0.5) * 50
    
    // Create star-shaped sparkle with golden color (matching pendant)
    const sparkle = this.add.graphics()
    sparkle.fillStyle(0xffd700, 0.9) // Golden color
    sparkle.beginPath()
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = i % 2 === 0 ? 3 : 1.5
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) sparkle.moveTo(x, y)
      else sparkle.lineTo(x, y)
    }
    sparkle.closePath()
    sparkle.fillPath()
    
    // Create container for the sparkle
    const sparkleContainer = this.add.container(sparkleX, sparkleY)
    sparkleContainer.add(sparkle)
    sparkleContainer.setDepth(103) // Above HUD timer (101) and mask (102)
    sparkleContainer.setScrollFactor(0) // Keep with HUD
    
    // Animate the sparkle
    this.tweens.add({
      targets: sparkleContainer,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      rotation: Math.PI,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        sparkleContainer.destroy()
      }
    })
  }
  
  private createPlayerParticleTrail(): void {
    // Create floating golden particles around player
    for (let i = 0; i < 8; i++) {
      const particle = this.add.graphics()
      particle.setDepth(this.player.depth + 1)
      
      // Draw small golden circle
      particle.fillStyle(0xffd700, 0.8)
      particle.fillCircle(0, 0, 2)
      
      this.playerParticleTrail.push(particle)
      
      // Start particle animation cycle
      this.animateParticle(particle, i)
    }
  }
  
  private animateParticle(particle: Phaser.GameObjects.Graphics, index: number): void {
    if (!this.player || !this.invincibilityActive) {
      particle.destroy()
      return
    }
    
    // Position particle around player
    const angle = (Math.PI * 2 / 8) * index + (this.time.now * 0.003)
    const radius = 20 + Math.sin(this.time.now * 0.005 + index) * 5
    
    particle.setPosition(
      this.player.x + Math.cos(angle) * radius,
      this.player.y + Math.sin(angle) * radius
    )
    
    // Continue animation if still invincible
    if (this.invincibilityActive) {
      this.time.delayedCall(50, () => this.animateParticle(particle, index))
    }
  }
  
  private enableSpikeWalking(): void {
    
    // Disable the damage-dealing overlap
    if (this.playerSpikeOverlap) {
      this.playerSpikeOverlap.active = false
    }
    
    // Add collision so player can walk on spikes like enemies
    // Only collide with floor spikes, not ceiling spikes (same logic as stalker cats)
    this.playerSpikeCollider = this.physics.add.collider(
      this.player,
      this.spikes,
      undefined,
      (player, spike) => {
        const spikeObj = spike as Phaser.GameObjects.Rectangle
        const isFloorSpike = spikeObj.getData('isFloorSpike')
        return isFloorSpike // Only collide with floor spikes
      },
      this
    )
  }
  
  private disableSpikeWalking(): void {
    
    // Remove the collision
    if (this.playerSpikeCollider) {
      this.physics.world.removeCollider(this.playerSpikeCollider)
      this.playerSpikeCollider = null
    }
    
    // Re-enable the damage-dealing overlap
    if (this.playerSpikeOverlap) {
      this.playerSpikeOverlap.active = true
    }
  }
  
  private shouldCollideWithPlatform(): boolean {
    // Don't collide with platforms when climbing
    return !this.player.getIsClimbing()
  }
  
  private handlePlayerCatInteraction(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    cat: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isGameOver || this.justKilledCat) return
    
    const playerObj = player as Player
    const catObj = cat as Cat
    
    // Check if player is falling down onto the cat (jump-to-kill)
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const catBody = catObj.body as Phaser.Physics.Arcade.Body
    
    const playerFalling = playerBody.velocity.y > 0 // Moving downward
    const playerAboveCat = playerBody.bottom <= catBody.top + 5 // Player's bottom is near cat's top (reduced tolerance for more precise jumping)
    
    if (playerFalling && playerAboveCat) {
      // Jump-to-kill!
      this.justKilledCat = true
      this.handleCatKill(playerObj, catObj)
      
      // Reset flag after a short delay to allow for physics processing
      this.time.delayedCall(100, () => {
        this.justKilledCat = false
      })
    } else if (!this.justKilledCat) {
      // Regular collision - damage player (only if we didn't just kill)
      this.handlePlayerDamage(playerObj, catObj)
    }
  }
  
  private handlePlayerBaseBluInteraction(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    baseBlu: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isGameOver) return
    
    const playerObj = player as Player
    const baseBluObj = baseBlu as BaseBlu
    
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const baseBluBody = baseBluObj.body as Phaser.Physics.Arcade.Body
    
    // Check if player is invincible and can kill BaseBlu
    if (this.invincibilityActive && baseBluObj.canBeKilledByInvinciblePlayer()) {
      const points = baseBluObj.handleInvinciblePlayerKill()
      this.score += points
      this.updateScoreDisplay()
      this.showPointPopup(baseBluObj.x, baseBluObj.y - 20, points)
      
      // Track BaseBlu kill for stats
      this.gameStats.enemyKills.blu++
      this.gameStats.totalEnemiesDefeated++
      
      // Play BaseBlu-specific squish sound
      this.playSoundEffect('squish-baseblu', 0.5)
      
      // Make player bounce (same as other enemies killed by pendant)
      playerBody.setVelocityY(GameSettings.game.jumpVelocity * 0.5)
      
      // Remove BaseBlu from group
      this.baseBlus.remove(baseBluObj)
      return
    }
    
    // Check if player is on top (bounce scenario)
    const playerFalling = playerBody.velocity.y > 0
    const playerAbove = playerBody.bottom <= baseBluBody.top + 10
    
    if (playerFalling && playerAbove) {
      // Player bounces off top - NO POINTS awarded, but BaseBlu gets stunned
      baseBluObj.handlePlayerBounce()
      baseBluObj.startStun()
      playerBody.setVelocityY(GameSettings.game.jumpVelocity * 0.7) // Standard bounce (same as other enemies)
    } else {
      // Any collision (side or top) - BaseBlu gets stunned
      baseBluObj.startStun()
      
      // Push player back slightly
      const pushDirection = playerBody.x < baseBluBody.x ? -1 : 1
      playerBody.setVelocityX(pushDirection * 100)
    }
  }

  private handlePlayerBeetleInteraction(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    beetle: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isGameOver || this.justKilledCat) return
    
    const playerObj = player as Player
    const beetleObj = beetle as Beetle
    
    // Check if player is falling down onto the beetle (jump-to-kill)
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const beetleBody = beetleObj.body as Phaser.Physics.Arcade.Body
    
    const playerFalling = playerBody.velocity.y > 0 // Moving downward
    
    // More forgiving collision detection for diagonal approaches
    // Check if player's center is reasonably above beetle's center
    const playerCenterY = playerBody.y + (playerBody.height / 2)
    const beetleCenterY = beetleBody.y + (beetleBody.height / 2)
    const verticalDifference = beetleCenterY - playerCenterY
    
    // Player is considered "above" if their center is higher than beetle's center by at least 5 pixels
    // OR if their bottom is within 12 pixels of beetle's top (increased from 5 for more forgiveness)
    const playerAboveBeetle = (verticalDifference > 5) || (playerBody.bottom <= beetleBody.top + 12)
    
    if (playerFalling && playerAboveBeetle) {
      // Jump-to-kill beetle!
      this.justKilledCat = true
      this.handleBeetleKill(playerObj, beetleObj)
      
      // Reset flag after a short delay to allow for physics processing
      this.time.delayedCall(100, () => {
        this.justKilledCat = false
      })
      return
    }
    
    // Side collision - check invincibility
    if (this.invincibilityActive) {
      // With invincibility pendant, destroy the beetle!
      this.justKilledCat = true
      this.handleBeetleKill(playerObj, beetleObj)
      
      // Reset flag after a short delay
      this.time.delayedCall(100, () => {
        this.justKilledCat = false
      })
    } else {
      // Normal collision - damage player
      this.handlePlayerDamage(playerObj, beetleObj)
    }
  }
  
  private handlePlayerStalkerCatInteraction(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    cat: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isGameOver || this.justKilledCat) return
    
    const playerObj = player as Player
    const stalkerCatObj = cat as Cat
    
    // Check if this stalker cat can damage the player
    if (!stalkerCatObj.canDamagePlayer()) {
      // This stalker cat can't damage player right now
      return
    }
    
    // Check if player is falling down onto the cat (jump-to-kill)
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const catBody = stalkerCatObj.body as Phaser.Physics.Arcade.Body
    
    const playerFalling = playerBody.velocity.y > 0 // Moving downward
    const playerAboveCat = playerBody.bottom <= catBody.top + 5 // Player's bottom is near cat's top (reduced tolerance for more precise jumping)
    
    if (playerFalling && playerAboveCat) {
      // Jump-to-kill stalker cat (only when chasing)
      this.justKilledCat = true
      this.handleStalkerCatKill(playerObj, stalkerCatObj)
      
      // Reset flag after a short delay to allow for physics processing
      this.time.delayedCall(100, () => {
        this.justKilledCat = false
      })
    } else if (!this.justKilledCat) {
      // Regular collision - damage player (only if we didn't just kill)
      this.handlePlayerDamage(playerObj, stalkerCatObj)
    }
  }
  
  private handlePlayerSpikeCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    spike: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isGameOver) return
    
    // During invincibility, player can walk on spikes like enemies - no damage
    if (this.invincibilityActive) {
      return
    }
    
    const playerObj = player as Player
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const spikeObj = spike as Phaser.GameObjects.Rectangle
    
    // Check if this is a ceiling spike
    const isCeilingSpike = spikeObj.getData('isCeilingSpike')
    
    if (isCeilingSpike) {
      // Ceiling spikes damage when:
      // 1. Player jumps up into them (negative Y velocity)
      // 2. TODO: They drop onto player (will implement dropping later)
      if (playerBody.velocity.y < -50) { // Jumping up into ceiling spikes
        // console.log(`🔱 Player jumped into ceiling spikes! Velocity Y: ${playerBody.velocity.y}`)
        
        // Add shaking animation before damage
        const graphics = spikeObj.getData('graphics') as Phaser.GameObjects.Graphics
        if (graphics) {
          // Shake the spikes
          this.tweens.add({
            targets: graphics,
            x: graphics.x + 2,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              graphics.x = spikeObj.getData('x') - GameSettings.game.tileSize/2
            }
          })
        }
        
        this.handlePlayerDamage(playerObj)
      }
    } else {
      // Floor spikes - check if player is in the dangerous visual spike area
      const isFloorSpike = spikeObj.getData('isFloorSpike')
      
      if (isFloorSpike) {
        const visualSpikeHeight = spikeObj.getData('visualSpikeHeight')
        const visualSpikeBaseY = spikeObj.getData('visualSpikeBaseY')
        
        // With full-height spikes, damage when player lands on them while falling
        // Since spikes are now full tile height, we can use simpler collision detection
        if (playerBody.velocity.y > 50) { // Falling down onto spikes
          // console.log(`🔱 Player fell onto floor spikes! Velocity Y: ${playerBody.velocity.y}`)
          this.handlePlayerDamage(playerObj)
        } else {
          // console.log(`🔱 Player touched floor spikes but not falling fast enough (Y velocity: ${playerBody.velocity.y}) - no damage`)
        }
      } else {
        // Legacy floor spike behavior (if any old spikes don't have the new data)
        if (playerBody.velocity.y > 50) { // Must be falling with some speed
          // console.log(`🔱 Player fell onto legacy floor spikes! Velocity Y: ${playerBody.velocity.y}`)
          this.handlePlayerDamage(playerObj)
        } else {
          // console.log(`🔱 Player touched legacy floor spikes but not falling (Y velocity: ${playerBody.velocity.y}) - no damage`)
        }
      }
    }
  }
  
  private handleCatKill(player: Player, cat: Cat): void {
    // Check if cat is already squished to prevent multiple kills
    if ((cat as any).isSquished) return
    
    // Get cat color once at the start
    const catColor = cat.getCatColor()
    
    // Don't allow combo while climbing ladders
    if (player.getIsClimbing()) {
      // Just award base points without combo using cat color
      let enemyType: EnemyType
      switch(catColor) {
        case 'yellow': enemyType = EnemyType.CATERPILLAR; break
        case 'blue_caterpillar': enemyType = EnemyType.BLUE_CATERPILLAR; break
        case 'blue': enemyType = EnemyType.CHOMPER; break
        case 'purple': enemyType = EnemyType.CHOMPER; break  // Purple chomper variant
        case 'red': enemyType = EnemyType.SNAIL; break  // Note: could be stalker but we'll use snail points for now
        case 'green': enemyType = EnemyType.JUMPER; break
        default: enemyType = EnemyType.CHOMPER; break
      }
      const basePoints = EnemySpawningSystem.getPointValue(enemyType)
      this.score += basePoints
      this.updateScoreDisplay()
      
      // Make player bounce up (slightly less than normal jump)
      player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
      
      // Squish the cat
      cat.squish()
      
      // Show point popup at cat position
      this.showPointPopup(cat.x, cat.y - 20, basePoints)
      
      return
    }
    
    // Calculate points with current combo multiplier (before incrementing)
    let enemyType: EnemyType
    switch(catColor) {
      case 'yellow': enemyType = EnemyType.CATERPILLAR; break
      case 'blue_caterpillar': enemyType = EnemyType.BLUE_CATERPILLAR; break
      case 'blue': enemyType = EnemyType.CHOMPER; break
      case 'red': enemyType = EnemyType.SNAIL; break  // Note: could be stalker but we'll use snail points for now
      case 'green': enemyType = EnemyType.JUMPER; break
      default: enemyType = EnemyType.CHOMPER; break
    }
    const basePoints = EnemySpawningSystem.getPointValue(enemyType)
    const comboMultiplier = Math.max(1, this.comboCount) // Current combo count (minimum 1)
    const points = basePoints * comboMultiplier
    
    // Award points
    this.score += points
    this.updateScoreDisplay()
    
    // Now increment combo for next kill
    this.comboCount++
    
    // Update combo display
    this.updateComboDisplay()
    
    // Reset combo timer
    if (this.comboTimer) {
      this.comboTimer.destroy()
    }
    
    // Set new combo timer (1 second to maintain combo)
    this.comboTimer = this.time.delayedCall(1000, () => {
      this.resetCombo()
    })
    
    // Make player bounce up (slightly less than normal jump)
    player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
    
    // Track enemy kill for stats
    const enemyName = this.getEnemyTypeName(cat)
    if (enemyName !== 'unknown' && enemyName in this.gameStats.enemyKills) {
      this.gameStats.enemyKills[enemyName as keyof typeof this.gameStats.enemyKills]++
      this.gameStats.totalEnemiesDefeated++
      console.log(`✅ Kill tracked: ${enemyName} | Total ${enemyName}: ${this.gameStats.enemyKills[enemyName as keyof typeof this.gameStats.enemyKills]} | Total enemies: ${this.gameStats.totalEnemiesDefeated}`)
    } else {
      console.error(`❌ Kill NOT tracked! Enemy type: ${enemyName}`)
    }
    
    // Play enemy-specific squish sound based on cat color
    // catColor already set above
    let squishSound = 'squish-chomper' // Default
    switch (catColor) {
      case 'yellow':
        squishSound = 'squish-caterpillar'
        break
      case 'blue_caterpillar':
        squishSound = 'squish-baseblu'  // Use BaseBlu sound for blue caterpillar (better than player-land)
        break
      case 'blue':
      case 'purple':  // Purple chomper uses same sound as blue
        squishSound = 'squish-chomper'
        break
      case 'red':
        squishSound = 'squish-snail'
        break
      case 'green':
        squishSound = 'squish-jumper'
        break
    }
    this.playSoundEffect(squishSound, 0.5)
    
    // Squish the cat
    cat.squish()
    
    // Show point popup at cat position
    this.showPointPopup(cat.x, cat.y - 20, points)
    
  }

  private handleBeetleKill(player: Player, beetle: Beetle): void {
    // Check if beetle is already squished to prevent multiple kills
    if ((beetle as any).isSquished) return
    
    // Don't allow combo while climbing ladders
    if (player.getIsClimbing()) {
      // Just award base points without combo
      const basePoints = EnemySpawningSystem.getPointValue(EnemyType.BEETLE)
      this.score += basePoints
      this.updateScoreDisplay()
      
      // Make player bounce up (slightly less than normal jump)
      player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
      
      // Squish the beetle with animation
      beetle.squish()
      
      // Show point popup at beetle position
      this.showPointPopup(beetle.x, beetle.y - 20, basePoints)
      
      return
    }
    
    // Calculate points with current combo multiplier (before incrementing)
    const basePoints = EnemySpawningSystem.getPointValue(EnemyType.BEETLE)
    const comboMultiplier = Math.max(1, this.comboCount) // Current combo count (minimum 1)
    const points = basePoints * comboMultiplier
    
    // Award points
    this.score += points
    this.updateScoreDisplay()
    
    // Now increment combo for next kill
    this.comboCount++
    
    // Update combo display
    this.updateComboDisplay()
    
    // Reset combo timer
    if (this.comboTimer) {
      this.comboTimer.destroy()
    }
    
    // Set new combo timer (1 second to maintain combo)
    this.comboTimer = this.time.delayedCall(1000, () => {
      this.resetCombo()
    })
    
    // Make player bounce up (slightly less than normal jump)
    player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
    
    // Track beetle kill for stats
    this.gameStats.enemyKills.rollz++
    this.gameStats.totalEnemiesDefeated++
    
    // Play beetle-specific squish sound
    this.playSoundEffect('squish-beetle', 0.5)
    
    // Squish the beetle with animation
    beetle.squish()
    
    // Show point popup at beetle position
    this.showPointPopup(beetle.x, beetle.y - 20, points)
  }
  
  private handlePlayerRexInteraction(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    rex: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isGameOver || this.justKilledCat) return
    
    const playerObj = player as Player
    const rexObj = rex as Rex
    
    // Get physics bodies
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const rexBody = rexObj.body as Phaser.Physics.Arcade.Body
    
    // Check if player is above and falling (jump-to-kill)
    const playerFalling = playerBody.velocity.y > 0
    const verticalDifference = rexBody.top - playerBody.bottom
    const playerAboveRex = (verticalDifference > 5) || (playerBody.bottom <= rexBody.top + 12)
    
    if (playerFalling && playerAboveRex) {
      // Jump-to-kill Rex!
      this.justKilledCat = true
      this.handleRexKill(playerObj, rexObj)
      
      // Reset flag after a short delay to allow for physics processing
      this.time.delayedCall(100, () => {
        this.justKilledCat = false
      })
      return
    }
    
    // Side collision - check invincibility
    if (this.invincibilityActive) {
      // With invincibility pendant, destroy Rex!
      this.justKilledCat = true
      this.handleRexKill(playerObj, rexObj)
      
      // Reset flag after a short delay
      this.time.delayedCall(100, () => {
        this.justKilledCat = false
      })
    } else {
      // Normal collision - damage player
      this.handlePlayerDamage(playerObj, rexObj)
    }
  }
  
  private handleRexKill(player: Player, rex: Rex): void {
    // Check if Rex is already squished to prevent multiple kills
    if ((rex as any).isSquished) return
    
    // Don't allow combo while climbing ladders
    if (player.getIsClimbing()) {
      // Just award base points without combo
      const basePoints = 500  // Rex is worth 500 points
      this.score += basePoints
      this.updateScoreDisplay()
      
      // Make player bounce up
      player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
      
      // Squish Rex with animation
      rex.squish()
      
      // Show point popup
      this.showPointPopup(rex.x, rex.y - 20, basePoints)
      
      return
    }
    
    // Calculate points with current combo multiplier
    const basePoints = 500  // Rex is worth 500 points
    const comboMultiplier = Math.max(1, this.comboCount)
    const points = basePoints * comboMultiplier
    
    // Award points
    this.score += points
    this.updateScoreDisplay()
    
    // Increment combo for next kill
    this.comboCount++
    
    // Update combo display
    if (this.comboText) {
      if (this.comboCount > 1) {
        this.comboText.setText(`COMBO x${this.comboCount}`)
        this.comboText.setVisible(true)
      } else {
        this.comboText.setVisible(false)
      }
    }
    
    // Reset combo timer
    if (this.comboTimer) this.comboTimer.destroy()
    this.comboTimer = this.time.delayedCall(this.COMBO_WINDOW, () => {
      this.comboCount = 0
      if (this.comboText) this.comboText.setVisible(false)
    })
    
    // Make player bounce up
    player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
    
    // Track Rex kill for stats
    this.gameStats.enemyKills.rex++
    this.gameStats.totalEnemiesDefeated++
    
    // Play Rex-specific squish sound
    this.playSoundEffect('squish-rex', 0.5)
    
    // Squish Rex with particle animation
    rex.squish()
    
    // Show point popup
    this.showPointPopup(rex.x, rex.y - 20, points)
  }
  
  private handleInvincibilityEnemyKill(player: Player, enemy: any): void {
    // Check if enemy is already squished to prevent multiple kills
    if (enemy.isSquished) return
    
    // Determine base points based on enemy type
    let basePoints = 200 // Default
    
    if (enemy.constructor.name === 'Beetle') {
      basePoints = 75 // Beetle points
    } else if (enemy.constructor.name === 'Cat') {
      const catColor = enemy.getCatColor()
      let enemyType: EnemyType
      switch(catColor) {
        case 'yellow': enemyType = EnemyType.CATERPILLAR; break
        case 'blue_caterpillar': enemyType = EnemyType.BLUE_CATERPILLAR; break
        case 'blue': enemyType = EnemyType.CHOMPER; break
        case 'red': 
          enemyType = enemy.isStalker ? EnemyType.STALKER : EnemyType.SNAIL
          break
        case 'green': enemyType = EnemyType.JUMPER; break
        default: enemyType = EnemyType.CHOMPER; break
      }
      basePoints = EnemySpawningSystem.getPointValue(enemyType)
    }
    
    // Award triple points for invincibility kills
    const triplePoints = basePoints * 3
    this.score += triplePoints
    this.updateScoreDisplay()
    
    // Make player bounce slightly (less than normal jump)
    player.setVelocityY(GameSettings.game.jumpVelocity * 0.5)
    
    // Play appropriate squish sound based on enemy type
    let squishSound = 'squish-chomper' // Default
    if (enemy.constructor.name === 'Beetle') {
      squishSound = 'squish-beetle'
    } else if (enemy.constructor.name === 'Cat') {
      const catColor = enemy.getCatColor()
      switch (catColor) {
        case 'yellow':
          squishSound = 'squish-caterpillar'
          break
        case 'blue_caterpillar':
          squishSound = 'squish-baseblu'  // Use BaseBlu sound for blue caterpillar
          break
        case 'blue':
          squishSound = 'squish-chomper'
          break
        case 'red':
          squishSound = enemy.isStalker ? 'squish-stalker' : 'squish-snail'
          break
        case 'green':
          squishSound = 'squish-jumper'
          break
      }
    }
    this.playSoundEffect(squishSound, 0.5)
    
    // Squish the enemy with special golden effect
    enemy.squish()
    
    // Show triple point popup with golden color
    this.showInvincibilityPointPopup(enemy.x, enemy.y - 20, triplePoints)
  }
  
  private handleStalkerCatKill(player: Player, stalkerCat: Cat): void {
    // Check if stalker cat is already squished to prevent multiple kills
    if ((stalkerCat as any).isSquished) return
    
    // Don't allow combo while climbing ladders
    if (player.getIsClimbing()) {
      // Just award base points without combo
      const basePoints = 200
      this.score += basePoints
      this.updateScoreDisplay()
      
      // Make player bounce up (slightly less than normal jump)
      player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
      
      // Squish the stalker cat
      stalkerCat.squish()
      
      // Show point popup at cat position
      this.showPointPopup(stalkerCat.x, stalkerCat.y - 20, basePoints)
      
      return
    }
    
    // Calculate points with current combo multiplier (before incrementing)
    const basePoints = 200
    const comboMultiplier = Math.max(1, this.comboCount) // Current combo count (minimum 1)
    const points = basePoints * comboMultiplier
    
    // Award points
    this.score += points
    this.updateScoreDisplay()
    
    // Now increment combo for next kill
    this.comboCount++
    
    // Update combo display
    this.updateComboDisplay()
    
    // Reset combo timer
    if (this.comboTimer) {
      this.comboTimer.destroy()
    }
    
    // Set new combo timer (1 second to maintain combo)
    this.comboTimer = this.time.delayedCall(1000, () => {
      this.resetCombo()
    })
    
    // Make player bounce up (slightly less than normal jump)
    player.setVelocityY(GameSettings.game.jumpVelocity * 0.7)
    
    // Play stalker-specific squish sound
    this.playSoundEffect('squish-stalker', 0.5)
    
    // Squish the stalker cat
    stalkerCat.squish()
    
    // Show point popup at cat position
    this.showPointPopup(stalkerCat.x, stalkerCat.y - 20, points)
    
  }
  
  private updateScoreDisplay(): void {
    // Show total score = accumulated from completed levels + current level score
    const totalScore = this.accumulatedScore + this.score
    this.scoreText.setText(`${totalScore}`)
  }
  
  private updateComboDisplay(): void {
    if (this.comboCount > 1) {
      this.comboText.setText(`COMBO x${this.comboCount}!`)
      this.comboText.setVisible(true)
      
      // Animate combo text
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        ease: 'Power2',
        yoyo: true
      })
    }
  }
  
  private resetCombo(): void {
    this.comboCount = 0
    this.comboText.setVisible(false)
    if (this.comboTimer) {
      this.comboTimer.destroy()
      this.comboTimer = null
    }
  }
  
  private createDebugGridlines(): void {
    const graphics = this.add.graphics()
    graphics.lineStyle(1, 0x00ff00, 0.3) // Green lines with 30% opacity
    graphics.setDepth(9999) // On top of everything
    graphics.setScrollFactor(1) // Scrolls with camera
    
    // Draw horizontal gridlines every 32 pixels (tile size)
    const tileSize = GameSettings.game.tileSize
    const canvasHeight = GameSettings.canvas.height
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Ground floor line (where player starts)
    const groundY = canvasHeight - tileSize
    graphics.lineStyle(2, 0xff0000, 0.5) // Red for ground floor
    graphics.beginPath()
    graphics.moveTo(-1000, groundY)
    graphics.lineTo(2000, groundY)
    graphics.stroke()
    
    // Add text label for ground floor
    const groundText = this.add.text(10, groundY - 20, `Ground Floor (Y=${groundY})`, {
      fontSize: '12px',
      color: '#ff0000',
      backgroundColor: '#000000'
    })
    groundText.setDepth(10000)
    groundText.setScrollFactor(1)
    
    // Draw floor lines
    for (let floor = 1; floor <= 10; floor++) {
      const y = groundY - (floor * floorSpacing)
      
      // Main floor line
      graphics.lineStyle(1, 0x00ffff, 0.4) // Cyan for floors
      graphics.beginPath()
      graphics.moveTo(-1000, y)
      graphics.lineTo(2000, y)
      graphics.stroke()
      
      // Floor label
      const floorText = this.add.text(10, y - 15, `Floor ${floor} (Y=${y})`, {
        fontSize: '10px',
        color: '#00ffff',
        backgroundColor: '#000000'
      })
      floorText.setDepth(10000)
      floorText.setScrollFactor(1)
    }
    
    // Draw tile grid lines (every 32px)
    graphics.lineStyle(1, 0x00ff00, 0.2) // Green for tile grid
    for (let y = 0; y < 2000; y += tileSize) {
      graphics.beginPath()
      graphics.moveTo(-1000, y)
      graphics.lineTo(2000, y)
      graphics.stroke()
    }
    
    // Negative Y area (above ground)
    for (let y = -tileSize; y > -2000; y -= tileSize) {
      graphics.beginPath()
      graphics.moveTo(-1000, y)
      graphics.lineTo(2000, y)
      graphics.stroke()
    }
    
    console.log('📏 Debug Gridlines Created:', {
      groundFloor: groundY,
      floorSpacing: floorSpacing,
      tileSize: tileSize,
      canvasHeight: canvasHeight,
      floor1Y: groundY - floorSpacing,
      floor2Y: groundY - (2 * floorSpacing),
      floor3Y: groundY - (3 * floorSpacing)
    })
  }
  
  private createVisibilitySystem(): void {
    // Create single overlay image with transparent area for visibility
    this.visibilityMask = this.add.image(0, 0, 'visibilityOverlay')
    this.visibilityMask.setDepth(98) // In front of game objects but behind HUD
    this.visibilityMask.setOrigin(0.5, 0.5) // Center origin for easy positioning
  }
  
  private updateVisibilitySystem(): void {
    if (!this.visibilityMask) return
    
    // Show visibility mask only on dark mode levels (levels ending in 9)
    const currentLevel = this.levelManager.getCurrentLevel()
    const isDarkModeLevel = currentLevel % 10 === 9
    this.visibilityMask.setVisible(isDarkModeLevel)
    
    // Get player world position
    const playerX = this.player.x
    const playerY = this.player.y
    
    // Position the overlay image so the player appears in the lower 40% of the transparent area
    // 
    // Image specs:
    // - Total size: 2880 × 3200
    // - Image center: (1440, 1600)
    // - Transparent area: 320 × 320, positioned at y=1600 to y=1920 in image coordinates
    // - Player should be 128px from bottom of transparent area (40% from bottom) = y=1792 in image coordinates
    //
    // Offset needed: Image center is at y=1600, player should be at y=1792
    // So image needs to be positioned 192 pixels UP from player position
    const overlayX = playerX
    const overlayY = playerY - 192
    
    this.visibilityMask.setPosition(overlayX, overlayY)
    
    // Scale handling is done in activateFlashPowerUp() and when timer expires
  }
  
  private showPointPopup(x: number, y: number, points: number): void {
    // Create popup text matching HUD font style
    const popupText = this.add.text(x, y, `+${points}`, {
      fontSize: '16px',
      color: '#ffd700',  // Gold color to match HUD
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 1,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(0.5).setDepth(150)
    
    // Simple fade out animation - no movement
    this.tweens.add({
      targets: popupText,
      alpha: 0,
      duration: 1200,
      ease: 'Power1.easeOut',
      onComplete: () => {
        popupText.destroy()
      }
    })
  }
  
  private createCrystalBallDefeatEffect(x: number, y: number): void {
    // Create sparkle particles that match crystal ball color theme
    for (let i = 0; i < 6; i++) {
      const particle = this.add.graphics()
      particle.fillStyle(0x44d0a7, 1) // Cyan/teal color
      particle.fillCircle(0, 0, 2)
      
      const angle = (i / 6) * Math.PI * 2
      particle.x = x
      particle.y = y
      particle.setDepth(25)
      
      const distance = 15 + Math.random() * 10
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 400,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      })
    }
  }
  
  private createPortalSuckAnimation(x: number, y: number, onComplete: () => void): void {
    // Create swirling portal effect
    const portalGraphics = this.add.graphics()
    portalGraphics.setDepth(25)
    
    // Create multiple spiral circles for portal effect
    const spiralCount = 3
    const spirals: Phaser.GameObjects.Graphics[] = []
    
    for (let i = 0; i < spiralCount; i++) {
      const spiral = this.add.graphics()
      spiral.setDepth(24 + i)
      spirals.push(spiral)
      
      // Initial spiral setup
      const startAngle = (i * 120) * Math.PI / 180
      spiral.lineStyle(2, 0x9966ff, 0.8) // Purple portal color
      
      // Animate spiral rotation and scale
      this.tweens.add({
        targets: spiral,
        rotation: startAngle + Math.PI * 4, // Multiple rotations
        scaleX: { from: 2, to: 0 },
        scaleY: { from: 2, to: 0 },
        alpha: { from: 0.8, to: 0 },
        duration: 800,
        ease: 'Power2.easeIn',
        onUpdate: () => {
          spiral.clear()
          spiral.lineStyle(3, 0x9966ff, spiral.alpha)
          
          // Draw spiral (relative to spiral's position, not world position)
          const points: { x: number, y: number }[] = []
          const spiralTurns = 3
          const maxRadius = 15 * spiral.scaleX  // Reduced from 30 to 15 (50% smaller)
          
          // Position the spiral at the enemy location
          spiral.x = x
          spiral.y = y
          
          for (let angle = 0; angle < spiralTurns * Math.PI * 2; angle += 0.1) {
            const radius = (angle / (spiralTurns * Math.PI * 2)) * maxRadius
            // Draw relative to 0,0 since we positioned the spiral graphics object
            const px = Math.cos(angle + spiral.rotation) * radius
            const py = Math.sin(angle + spiral.rotation) * radius
            points.push({ x: px, y: py })
          }
          
          if (points.length > 1) {
            spiral.beginPath()
            spiral.moveTo(points[0].x, points[0].y)
            for (let j = 1; j < points.length; j++) {
              spiral.lineTo(points[j].x, points[j].y)
            }
            spiral.strokePath()
          }
        },
        onComplete: () => {
          spiral.destroy()
        }
      })
    }
    
    // Create center vortex with crystal ball color theme
    const vortex = this.add.graphics()
    vortex.setDepth(26)
    vortex.fillStyle(0x44d0a7, 0.6)  // Cyan/teal color matching crystal ball, reduced opacity
    vortex.fillCircle(x, y, 5)
    
    // Animate vortex growth then shrink
    this.tweens.add({
      targets: vortex,
      scaleX: { from: 0, to: 3, duration: 400 },
      scaleY: { from: 0, to: 3, duration: 400 },
      yoyo: true,
      ease: 'Power2.easeInOut',
      onComplete: () => {
        vortex.destroy()
        portalGraphics.destroy()
        if (onComplete) onComplete()
      }
    })
    
    // Removed particle effects to keep animation clean
  }
  
  private showInvincibilityPointPopup(x: number, y: number, points: number): void {
    // Create golden popup text for invincibility kills
    const popupText = this.add.text(x, y, `+${points}`, {
      fontSize: '18px',
      color: '#ffd700',  // Gold color to match HUD
      fontFamily: '"Press Start 2P", system-ui',
      fontStyle: 'bold',
      stroke: '#4a148c',  // Dark purple stroke to match HUD
      strokeThickness: 2,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',  // Black drop shadow
        blur: 3,
        fill: true
      }
    }).setOrigin(0.5).setDepth(150)
    
    // Larger fade out animation with slight movement
    this.tweens.add({
      targets: popupText,
      alpha: 0,
      y: y - 30,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        popupText.destroy()
      }
    })
  }
  
  private handlePlayerDamage(player: Player, damageSource?: any): void {
    if (this.isGameOver) return
    
    // Check if player is invincible
    if (this.invincibilityActive) {
      // Player is invincible - kill enemy and award triple points
      if (damageSource && damageSource.squish) {
        this.handleInvincibilityEnemyKill(player, damageSource)
      }
      return
    }
    
    // Play the same damage sound for both spikes and enemies
    this.playSoundEffect('player-dies-enemy', 0.5)
    
    // Reset combo on hit
    this.resetCombo()
    
    // Shut off crystal ball power-up when player takes damage
    if (player.getCrystalBallActive && player.getCrystalBallActive()) {
      console.log('🔮 Player died - shutting off Crystal Ball power-up')
      // Force stop the crystal ball power-up on the player
      player.stopCrystalBallParticles && player.stopCrystalBallParticles()
      // Update HUD to hide timer
      this.updateCrystalBallTimer(0, 20000)
    }
    
    // Lose a life
    const oldLives = this.lives
    this.lives--
    this.gameStats.livesLost++  // Track lives lost for stats
    this.game.registry.set('playerLives', this.lives)  // Save to registry
    this.updateLivesDisplay()
    
    console.log(`💔 Player died! Lives: ${oldLives} -> ${this.lives}`)
    
    // Trigger haptic feedback for taking damage
    this.triggerFarcadeHapticFeedback()
    
    // Stop the player and disable physics temporarily
    player.setVelocity(0, 0)
    player.setTint(0xff0000) // Turn player red
    player.body!.enable = false // Disable physics to prevent further collisions
    
    // Check if player has lives remaining
    if (this.lives > 0) {
      // Still have lives - restart current level
      this.showLostLifePopup()
    } else {
      // No lives left - game over
      this.isGameOver = true
      this.showGameOverScreen()
    }
  }
  
  private handleLadderOverlap(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    ladder: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const playerObj = player as Player
    
    // Check if player wants to climb
    if (playerObj.checkLadderProximity(ladder)) {
      if (!playerObj.getIsClimbing()) {
        playerObj.startClimbing(ladder)
      }
    }
    
    // More generous exit conditions at top, strict at bottom to prevent breakthrough
    if (playerObj.getIsClimbing()) {
      const ladderRect = ladder as Phaser.GameObjects.Rectangle
      const topOfLadder = ladderRect.y - ladderRect.height / 2
      const bottomOfLadder = ladderRect.y + ladderRect.height / 2
      
      // Exit climbing if player moves beyond ladder bounds
      // Generous at top (32px buffer) but strict at bottom (8px) to prevent falling through
      if (playerObj.y < topOfLadder - 32 || playerObj.y > bottomOfLadder + 8) {
        playerObj.exitClimbing()
      }
    }
  }
  
  private updateTreasureChestInteraction(): void {
    // Check for automatic chest opening on contact
    for (let i = this.treasureChests.length - 1; i >= 0; i--) {
      const chest = this.treasureChests[i]
      
      if (!chest.canInteract()) continue
      
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        chest.sprite.x, chest.sprite.y
      )
      
      // Check if player is touching the chest (smaller distance for contact)
      if (distance < 32) { // Contact range - about 1 tile
        // Check if player is on the same floor (within reasonable Y distance)
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body
        const isOnGround = playerBody.blocked.down
        
        if (isOnGround) {
          this.openTreasureChest(chest)
          break // Only open one chest per frame
        }
      }
    }
  }
  
  private updateDoorPrompt(): void {
    if (!this.door || !this.player || !this.player.body) {
      return
    }
    
    // Check if player is near the door and on the correct floor
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    const doorFloor = levelConfig.floorCount - 1
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    const isOnGround = playerBody.blocked?.down || false
    
    // Calculate distance to door
    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.door.x, this.door.y
    )
    
    // Show prompt if player is close to door, on correct floor, and on ground
    const isNearDoor = distance < 80 // Door activation range (increased from 60)
    const isOnDoorFloor = this.currentFloor === doorFloor
    
    if (isNearDoor && isOnDoorFloor && isOnGround) {
      this.door.showPrompt(this.player)
      
      // Also check for UP key press here
      const upPressed = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP).isDown ||
                       this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W).isDown ||
                       (this.touchControls?.upPressed || false)
      
      if (upPressed && !this.isLevelComplete) {
        this.completeLevel()
      }
    } else {
      this.door.hidePrompt()
    }
  }
  
  private openTreasureChest(chest: TreasureChest): void {
    // Don't open chests during intro animation
    if (this.isLevelStarting) return
    
    const contents = chest.open()
    
    // Play treasure chest open sound effect
    this.playSoundEffect('treasure-chest-open', 0.5)
    
    // Track treasure chest opened
    this.gameStats.treasureChestsOpened++
    
    // Award base chest points (2500)
    this.score += 2500
    this.updateScoreDisplay()
    
    // Show point popup for chest
    this.showPointPopup(chest.sprite.x, chest.sprite.y - 30, 2500)
    
    // Trigger haptic feedback for opening treasure chest
    this.triggerFarcadeHapticFeedback()
    
    // Spawn items on the floor around the chest
    this.spawnTreasureChestContents(chest.sprite.x, chest.sprite.y, contents)
    
    // Make chest fade away after opening
    this.tweens.add({
      targets: chest.sprite,
      alpha: 0,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Remove from treasureChests array
        const index = this.treasureChests.indexOf(chest)
        if (index > -1) {
          this.treasureChests.splice(index, 1)
        }
        chest.destroy()
      }
    })
    
    // No need to remove interaction since chests open automatically on contact
  }
  
  private spawnTreasureChestContents(chestX: number, chestY: number, contents: any): void {
    const spawnPositions = [
      { x: chestX - 60, y: chestY },
      { x: chestX + 60, y: chestY },
      { x: chestX - 45, y: chestY },
      { x: chestX + 45, y: chestY },
      { x: chestX - 30, y: chestY },
      { x: chestX + 30, y: chestY },
      { x: chestX - 15, y: chestY },
      { x: chestX + 15, y: chestY },
      { x: chestX, y: chestY - 30 },
      { x: chestX, y: chestY + 15 }
    ]
    
    let positionIndex = 0
    
    // Spawn coins (5-10 as specified in contents)
    for (let i = 0; i < contents.coins; i++) {
      if (positionIndex >= spawnPositions.length) break
      
      const pos = spawnPositions[positionIndex++]
      const coin = new Coin(this, pos.x, pos.y)
      this.coins.push(coin)
      
      // Add physics overlap detection
      this.physics.add.overlap(
        this.player,
        coin.sprite,
        () => this.handleCoinCollection(coin),
        undefined,
        this
      )
      
      // Add bouncy spawn animation
      this.tweens.add({
        targets: coin.sprite,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 300,
        ease: 'Back.easeOut',
        yoyo: true
      })
    }
    
    // Spawn blue coins
    for (let i = 0; i < contents.blueCoins; i++) {
      if (positionIndex >= spawnPositions.length) break
      
      const pos = spawnPositions[positionIndex++]
      const blueCoin = new BlueCoin(this, pos.x, pos.y)
      this.blueCoins.push(blueCoin)
      
      // Add physics overlap detection
      this.physics.add.overlap(
        this.player,
        blueCoin.sprite,
        () => this.handleBlueCoinCollection(blueCoin),
        undefined,
        this
      )
      
      // Add bouncy spawn animation
      this.tweens.add({
        targets: blueCoin.sprite,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 400,
        ease: 'Back.easeOut',
        yoyo: true
      })
    }
    
    // Spawn diamonds
    for (let i = 0; i < contents.diamonds; i++) {
      if (positionIndex >= spawnPositions.length) break
      
      const pos = spawnPositions[positionIndex++]
      const diamond = new Diamond(this, pos.x, pos.y)
      this.diamonds.push(diamond)
      
      // Add physics overlap detection
      this.physics.add.overlap(
        this.player,
        diamond.sprite,
        () => this.handleDiamondCollection(diamond),
        undefined,
        this
      )
      
      // Add dramatic spawn animation
      this.tweens.add({
        targets: diamond.sprite,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 500,
        ease: 'Back.easeOut',
        yoyo: true
      })
    }
    
    // Spawn free lives
    for (let i = 0; i < contents.freeLifs; i++) {
      if (positionIndex >= spawnPositions.length) break
      
      const pos = spawnPositions[positionIndex++]
      const freeLife = new FreeLife(this, pos.x, pos.y)
      this.freeLifes.push(freeLife)
      
      // Add physics overlap detection
      this.physics.add.overlap(
        this.player,
        freeLife.sprite,
        () => this.handleFreeLifeCollection(freeLife),
        undefined,
        this
      )
      
      // Add dramatic spawn animation (same as diamond)
      this.tweens.add({
        targets: freeLife.sprite,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 500,
        ease: 'Back.easeOut',
        yoyo: true
      })
    }
    
    // Flash power-up spawning - enabled for dark mode levels
    // Commented out for later use
    // if (contents.flashPowerUp && positionIndex < spawnPositions.length) {
    //   const pos = spawnPositions[positionIndex++]
    //   const flashPowerUp = new FlashPowerUp(this, pos.x, pos.y)
    //   this.flashPowerUps.push(flashPowerUp)
    //   
    //   // Add physics overlap detection
    //   this.physics.add.overlap(
    //     this.player,
    //     flashPowerUp.sprite,
    //     () => this.handleFlashPowerUpCollection(flashPowerUp),
    //     undefined,
    //     this
    //   )
    //   
    //   // Add electric spawn animation
    //   this.tweens.add({
    //     targets: flashPowerUp.sprite,
    //     scaleX: 1.4,
    //     scaleY: 1.4,
    //     duration: 400,
    //     ease: 'Back.easeOut',
    //     yoyo: true
    //   })
    // }
  }

  // Helper method to play sound effects with respect to settings
  private playSoundEffect(key: string, volume: number = 0.5): void {
    // Only check local sfxEnabled setting, Phaser handles SDK mute internally
    const sfxEnabled = this.registry.get('sfxEnabled') !== false
    if (sfxEnabled) {
      // Check audio context state before playing (mobile fix)
      if (this.sound.context && this.sound.context.state === 'suspended') {
        console.log('🔇 Audio context suspended, trying to resume for sound:', key)
        this.sound.context.resume().then(() => {
          try {
            this.sound.play(key, { volume })
          } catch (e) {
            console.warn('⚠️ Failed to play sound effect:', key, e)
          }
        }).catch(e => {
          console.error('❌ Failed to resume audio context for sound:', key, e)
        })
      } else {
        try {
          this.sound.play(key, { volume })
        } catch (e) {
          console.warn('⚠️ Failed to play sound effect:', key, e)
        }
      }
    }
  }

  update(time: number, deltaTime: number): void {
    if (this.isGameOver) return
    
    // Don't update if game hasn't been initialized yet (during splash screen or scene restart)
    if (!this.touchControls || !this.player || !this.player.body) return
    
    // Also check if essential groups are initialized
    if (!this.cats || !this.stalkerCats || !this.baseBlus || !this.beetles || !this.ladders) return
    
    // Update dynamic background positioning to handle high floors
    this.updateBackgroundPosition()
    
    // Update touch controls
    this.touchControls.update()
    
    // Check for treasure chest interaction
    this.updateTreasureChestInteraction()
    
    // Update door prompt visibility
    this.updateDoorPrompt()
    
    // Update player
    this.player.update(time, deltaTime)
    
    // Update crystal ball projectiles
    this.updateCrystalBallProjectiles(time, deltaTime)
    
    // Update golden aura position if invincible
    if (this.playerGoldenAura && this.invincibilityActive) {
      this.playerGoldenAura.setPosition(this.player.x, this.player.y)
    }
    
    // Update visibility system
    this.updateVisibilitySystem()
    
    // Update all cats (only if group exists)
    if (this.cats && this.cats.children) {
      this.cats.children.entries.forEach(cat => {
        (cat as Cat).update(this.time.now, this.game.loop.delta)
      })
      
      // Check for Chompers that need replacement (last resort)
      this.checkAndReplaceStuckChompers()
    }
    
    // Update all stalker cats and check ladder exits (only if group exists)
    if (this.stalkerCats && this.stalkerCats.children) {
      this.stalkerCats.children.entries.forEach(stalkerCat => {
        const catObj = stalkerCat as Cat
        catObj.update(this.time.now, this.game.loop.delta)
        
        // Red cats no longer climb ladders
      })
    }
    
    // Update all BaseBlu enemies (only if group exists)
    if (this.baseBlus && this.baseBlus.children) {
      this.baseBlus.children.entries.forEach(baseBlu => {
        (baseBlu as BaseBlu).update(this.time.now, this.game.loop.delta)
      })
    }

    // Update all Beetle enemies with time and delta for animation (only if group exists)
    if (this.beetles && this.beetles.children) {
      this.beetles.children.entries.forEach(beetle => {
        (beetle as Beetle).update(time, deltaTime)
      })
    }
    
    // Update all Rex enemies with time and delta (only if group exists)
    if (this.rexEnemies && this.rexEnemies.children) {
      this.rexEnemies.children.entries.forEach(rex => {
        (rex as Rex).update(time, deltaTime)
      })
    }
    
    // Check ladder overlaps (only if ladders group exists)
    let overlappingAnyLadder = false
    if (this.ladders && this.ladders.children) {
      this.ladders.children.entries.forEach(ladder => {
        if (this.physics.world.overlap(this.player, ladder)) {
          overlappingAnyLadder = true
        }
      })
    }
    
    // Clear nearby ladder reference if not overlapping any ladder
    if (!overlappingAnyLadder) {
      this.player.clearNearbyLadder()
    }
    
    // Check if player is no longer overlapping any ladder while climbing
    if (this.player.getIsClimbing() && !overlappingAnyLadder) {
      this.player.exitClimbing()
    }
    
    // Update current floor based on player position
    const tileSize = GameSettings.game.tileSize
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    const playerFloor = Math.max(0, Math.floor((GameSettings.canvas.height - this.player.y - tileSize/2) / floorSpacing))
    
    if (playerFloor !== this.currentFloor) {
      // Floor changed - update tracking (no points awarded)
      this.currentFloor = playerFloor
      // Track highest floor for stats
      this.gameStats.highestFloor = Math.max(this.gameStats.highestFloor, playerFloor)
      // No floor text to update anymore - we show coins instead
    }
    
    // Generate new floors if player is getting close to the top
    // But NEVER generate floors for discrete levels - all floors are created in createTestLevel
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    
    if (levelConfig.isEndless && this.currentFloor >= this.highestFloorGenerated - 3) {
      this.generateNextFloors()
    }
  }
  
  private generateNextFloors(): void {
    const tileSize = GameSettings.game.tileSize
    const floorWidth = GameSettings.game.floorWidth
    const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5)
    
    // Check level limits
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    const maxFloor = levelConfig.isEndless ? 999 : levelConfig.floorCount
    
    // Generate up to 5 more floors, but stop BEFORE the door floor for discrete levels
    // Door floor should be the final floor, so don't generate it here - it's generated in createTestLevel
    let floorsToGenerate
    if (levelConfig.isEndless) {
      floorsToGenerate = 5 // Endless mode, keep generating
    } else {
      // For discrete levels, stop generating floors BEFORE the door floor
      // The door is on the last floor (levelConfig.floorCount - 1, but floor counting starts at 0)
      // So the door is on floor index (floorCount - 1) 
      floorsToGenerate = Math.min(5, Math.max(0, levelConfig.floorCount - 1 - this.highestFloorGenerated))
    }
    
    for (let i = 0; i < floorsToGenerate; i++) {
      const floor = this.highestFloorGenerated + i + 1
      const y = GameSettings.canvas.height - tileSize/2 - (floor * floorSpacing)
      
      // Create floor with random gap
      const hasGap = Math.random() > 0.3
      let layout: { gapStart: number, gapSize: number }
      
      // Floor has gap info (replaced console.log)
      
      if (hasGap) {
        const gapStart = Math.floor(Math.random() * (floorWidth - 5)) + 2
        const gapSize = Math.floor(Math.random() * 2) + 2
        layout = { gapStart, gapSize }
        
        // Create platform tiles with gap
        for (let x = 0; x < floorWidth; x++) {
          if (x < gapStart || x >= gapStart + gapSize) {
            this.createPlatformTile(x * tileSize + tileSize/2, y)
          }
        }
        
        // Add spikes to all gaps (except in bonus levels)
        if (!this.levelManager.isBonusLevel()) {
          this.createSpikesInGap(gapStart, gapSize, y, tileSize)
        }
      } else {
        layout = { gapStart: -1, gapSize: 0 }
        
        // Create complete floor
        for (let x = 0; x < floorWidth; x++) {
          this.createPlatformTile(x * tileSize + tileSize/2, y)
        }
      }
      
      this.floorLayouts[floor] = layout
      
      // Add ladder connecting to previous floor
      // But don't add ladders leading TO the top floor (where the door is)
      const isTopFloor = !levelConfig.isEndless && floor >= levelConfig.floorCount - 1
      
      if (floor > 0 && this.floorLayouts[floor - 1] && !isTopFloor) {
        const prevLayout = this.floorLayouts[floor - 1]
        const validPositions: number[] = []
        
        // Find positions with platforms on both floors
        for (let x = 1; x < floorWidth - 1; x++) {
          if (this.hasPlatformAt(prevLayout, x) && this.hasPlatformAt(layout, x)) {
            validPositions.push(x)
          }
        }
        
        if (validPositions.length > 0) {
          const ladderX = validPositions[Math.floor(Math.random() * validPositions.length)]
          const bottomY = -(floor - 1) * floorSpacing + GameSettings.canvas.height - tileSize
          const topY = -floor * floorSpacing + GameSettings.canvas.height - tileSize
          this.createContinuousLadder(ladderX * tileSize, bottomY, topY)
          this.storeLadderPositions(floor - 1, [ladderX]) // Store for the bottom floor
        }
      }
      
      // Add collectibles on the new floor using the same system as initial creation
      const collectibleY = y - tileSize - 8
      const validPositions: number[] = []
      
      for (let x = 1; x < floorWidth - 1; x++) {
        if (this.hasPlatformAt(layout, x)) {
          validPositions.push(x)
        }
      }
      
      if (validPositions.length > 0) {
        // Get allowed collectible types for current level (reuse the levelConfig from above)
        const allowedCollectibles = levelConfig.collectibleTypes
        
        // Track all used positions for this floor across all collectible types
        const floorUsedPositions: number[] = []
        
        // Regular coins: 2-4 per floor
        // Skip floor 0 to avoid collectibles in intro animation area
        if (allowedCollectibles.includes('coin') && floor > 0) {
          const numCoins = Math.floor(Math.random() * 3) + 2
          this.placeCollectiblesOfType(validPositions, numCoins, 'coin', collectibleY, floor, floorUsedPositions)
        }
        
        // Blue coins: lower probability (20% chance per floor)
        if (allowedCollectibles.includes('blueCoin') && floor > 0 && Math.random() < 0.2) {
          this.placeCollectiblesOfType(validPositions, 1, 'blueCoin', collectibleY, floor, floorUsedPositions)
        }
        
        // Diamonds: much lower probability (8% chance per floor)
        if (allowedCollectibles.includes('diamond') && floor > 1 && Math.random() < 0.08) {
          this.placeCollectiblesOfType(validPositions, 1, 'diamond', collectibleY, floor, floorUsedPositions)
        }
        
        // Treasure chests: Level-based spawning (2500 points + contents)
        if (allowedCollectibles.includes('treasureChest') && floor >= 3) {
          const currentLevel = this.levelManager.getCurrentLevel()
          const shouldSpawnChest = this.shouldSpawnChestOnFloor(currentLevel, floor)
          if (shouldSpawnChest) {
            this.placeCollectiblesOfType(validPositions, 1, 'treasureChest', collectibleY, floor, floorUsedPositions)
          }
        }
        
        // Flash power-ups: Only spawn on dark mode levels (levels ending in 9)
        // Commented out for later use
        // const currentLevel = this.levelManager.getCurrentLevel()
        // const isDarkModeLevel = currentLevel % 10 === 9
        // if (isDarkModeLevel && floor > 2 && Math.random() < 0.25) { // 25% chance per floor on dark mode levels
        //   this.placeCollectiblesOfType(validPositions, 1, 'flashPowerUp', collectibleY, floor, floorUsedPositions)
        // }
      }
      
      // Get allowed enemy types for current level (reuse the levelConfig from above)
      const allowedEnemies = levelConfig.enemyTypes
      
      // Map enemy types to cat colors
      const availableColors: string[] = []
      if (allowedEnemies.includes('blue')) availableColors.push('blue')
      if (allowedEnemies.includes('yellow')) availableColors.push('yellow')
      if (allowedEnemies.includes('green')) availableColors.push('green')
      if (allowedEnemies.includes('red')) availableColors.push('red') // ADD RED SUPPORT
      
      // Add regular cat on some floors (if any colors are available) - NEVER on floor 0 or 1
      if (availableColors.length > 0 && floor > 1 && Math.random() > 0.5) {
        const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)]
        // Spawning enemy on floor (replaced console.log)
        
        if (layout.gapStart === -1) {
          // Complete floor
          // Position enemy ON TOP of floor tiles, like the player
          const floorSurfaceY = y - tileSize/2  // Top surface of platform tiles
          const enemyY = floorSurfaceY - 15     // Position enemy standing on top (hitbox bottom above surface)
          // Spawning enemy on complete floor (replaced console.log)
          const cat = new Cat(
            this,
            (floorWidth / 2) * tileSize,
            enemyY, // Position enemy standing on top of tiles
            tileSize * 1.5,
            tileSize * (floorWidth - 1.5),
            randomColor as any
          )
          // Green cats already get full floor bounds by default
          this.cats.add(cat)
          enemiesCreated++
        } else if (layout.gapStart > 3) {
          // Place on left section if big enough
          // Position enemy ON TOP of floor tiles, like the player
          const floorSurfaceY = y - tileSize/2  // Top surface of platform tiles
          const enemyY = floorSurfaceY - 15     // Position enemy standing on top (hitbox bottom above surface)
          // Spawning enemy on left section (replaced console.log)
          const cat = new Cat(
            this,
            (layout.gapStart / 2) * tileSize,
            enemyY, // Position enemy standing on top of tiles
            tileSize * 0.5,
            tileSize * (layout.gapStart - 0.5),
            randomColor as any
          )
          // Green cats use full left section bounds
          if (cat.getCatColor() === 'green') {
            cat.platformBounds = {
              left: tileSize * 0.5,
              right: tileSize * (layout.gapStart - 0.5)
            }
          }
          this.cats.add(cat)
          enemiesCreated++
        }
      }
      
      // Enemy spawning now handled by the new difficulty-based system in createCats()
      // No need for separate stalker spawning - they're integrated into the main system
    }
    
    this.highestFloorGenerated += floorsToGenerate
  }

  private waitForAssetsAndStartIntro(targetX: number, targetY: number): void {
    // Waiting for assets to load (replaced console.log)
    
    const checkAssets = () => {
      const assetsReady = this.registry.get('assetsReady')
      const hasClimbSprites = this.textures.exists('playerClimbLeftFoot') && this.textures.exists('playerClimbRightFoot')
      const hasRunSprites = this.textures.exists('playerRunLeftFoot') && this.textures.exists('playerRunRightFoot')
      
      // Assets ready status (replaced console.log)
      
      if (assetsReady && hasClimbSprites && hasRunSprites) {
        // All assets ready - starting intro (replaced console.log)
        this.startLevelIntro(targetX, targetY)
      } else {
        // Check again in 100ms
        this.time.delayedCall(100, checkAssets)
      }
    }
    
    checkAssets()
  }

  private startLevelIntro(targetX: number, targetY: number): void {
    this.isLevelStarting = true
    
    // Create entrance ladder extending below the floor
    const tileSize = GameSettings.game.tileSize
    const ladderX = tileSize/2 // Position ladder on the farthest left tile (tile 0)
    const floorY = GameSettings.canvas.height - tileSize/2
    const groundFloorY = GameSettings.canvas.height - tileSize // Y=688 for 720px canvas
    const platformTop = groundFloorY // Platform surface where player stands
    
    // Console log for debugging intro positions
    console.log('🎬 Level Intro Start:', {
      targetX: targetX,
      targetY: targetY,
      originalTargetY: targetY,
      canvasHeight: GameSettings.canvas.height,
      groundFloorY: groundFloorY,
      platformTop: platformTop,
      floorY: floorY,
      playerPhysicsHeight: 30,
      playerShouldEndAt: platformTop - 15 // Center of player when standing
    })
    
    // Override targetY to ensure player ends up at correct position
    // Player has physics body: 18x49 with offset (15, 12)
    // Sprite origin is at center (0.5, 0.5), so for a 48x64 sprite:
    // - Sprite top = y - 32
    // - Physics body top = sprite top + offset.y = y - 32 + 12 = y - 20
    // - Physics body bottom = physics body top + height = y - 20 + 49 = y + 29
    // We want physics body bottom at platformTop (688), so:
    // y + 29 = 688, therefore y = 659
    targetY = platformTop - 29 // This positions player so physics body bottom touches platform
    
    console.log('🎯 Adjusted Target:', {
      originalTargetY: arguments[1],
      adjustedTargetY: targetY,
      platformTop: platformTop,
      willStandAt: targetY + 15 // Bottom of player sprite
    })
    
    // Create entrance ladder with top edge 5px above ground floor
    // We want the TOP EDGE of the ladder sprite to be at Y=683 (5px above ground floor)
    // The ladder extends down below the screen for the intro climb
    const ladderBottom = GameSettings.canvas.height + 80 // Extends 80px below screen (800)
    
    // To get the visual top at Y=683 (5px higher), we need to calculate based on desired height
    // Let's make it about 150px tall for a reasonable climb
    const desiredVisualHeight = 150
    const ladderTopEdgeY = platformTop - 5  // Shift up 5px from ground floor
    
    // Since we want the visual TOP at 683, and height is 150:
    // visualCenterY = 683 + (150/2) = 758
    const visualCenterY = ladderTopEdgeY + (desiredVisualHeight / 2)
    const visualHeight = desiredVisualHeight
    
    // Calculate the actual ladder bounds for the animation
    const ladderTop = ladderTopEdgeY  // Top at 5px above ground floor
    
    console.log('🎨 Intro Ladder Visual Alignment:', {
      visualTopEdge: visualCenterY - (visualHeight / 2),  // Should be 683 (5px above ground)
      visualBottomEdge: visualCenterY + (visualHeight / 2),  // Should be 833
      visualCenter: visualCenterY,
      visualHeight: visualHeight,
      groundFloorY: platformTop,
      shiftedUp: 5  // Ladder shifted up 5px from ground floor
    })
    
    console.log('🪜 Intro Ladder Setup:', {
      ladderTop: Math.round(ladderTop),
      ladderBottom: Math.round(ladderBottom),
      visualHeight: Math.round(visualHeight),
      visualCenterY: Math.round(visualCenterY),
      targetY: Math.round(targetY),
      platformTop: platformTop,
      matchesGameplay: true
    })
    
    // Add debug markers if in debug mode
    if (GameSettings.debug) {
      // Mark target position with a red circle
      const targetMarker = this.add.circle(targetX, targetY, 5, 0xff0000, 0.8)
      targetMarker.setDepth(10000)
      
      // Mark platform top with a green line
      const platformLine = this.add.rectangle(360, platformTop, 720, 2, 0x00ff00, 0.8)
      platformLine.setDepth(10000)
      
      // Mark ladder top and bottom with blue circles
      const ladderTopMarker = this.add.circle(ladderX, ladderTop, 4, 0x0000ff, 0.8)
      const ladderBottomMarker = this.add.circle(ladderX, ladderBottom, 4, 0x0000ff, 0.8)
      ladderTopMarker.setDepth(10001)
      ladderBottomMarker.setDepth(10001)
      
      // Add text labels
      this.add.text(targetX + 10, targetY - 5, `Target: ${Math.round(targetY)}`, {
        fontSize: '10px',
        color: '#ff0000',
        backgroundColor: '#000000'
      }).setDepth(10002)
      
      // Clean up debug markers after animation
      this.time.delayedCall(5000, () => {
        targetMarker.destroy()
        platformLine.destroy()
        ladderTopMarker.destroy()
        ladderBottomMarker.destroy()
      })
    }
    
    let entranceLadder: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics
    
    if (this.textures.exists('tealLadder')) {
      // Position ladder with top edge at ground floor
      entranceLadder = this.add.image(ladderX, visualCenterY, 'tealLadder')
      // Scale to exact height
      entranceLadder.setDisplaySize(entranceLadder.width * (visualHeight / entranceLadder.height), visualHeight)
      entranceLadder.setDepth(5)
      
      console.log('🖼️ Ladder Sprite Positioned:', {
        x: ladderX,
        y: visualCenterY,
        displayHeight: visualHeight,
        topEdge: visualCenterY - (visualHeight / 2)
      })
    } else {
      // Fallback to graphics ladder matching gameplay ladder visuals
      entranceLadder = this.add.graphics()
      const visualTop = visualCenterY - visualHeight/2
      const visualBottom = visualCenterY + visualHeight/2
      
      entranceLadder.fillStyle(0x40e0d0, 1) // Teal color to match game theme
      entranceLadder.fillRect(ladderX - 2, visualTop, 4, visualHeight) // Center rail
      entranceLadder.fillRect(ladderX - 13, visualTop + 4, 26, 4) // Top rung (offset like gameplay)
      entranceLadder.fillRect(ladderX - 13, visualBottom - 4, 26, 4) // Bottom rung
      
      // Middle rungs matching gameplay spacing
      const numRungs = Math.floor(visualHeight / 32)
      for (let i = 1; i < numRungs; i++) {
        const rungY = visualTop + (i * (visualHeight / (numRungs + 1)))
        entranceLadder.fillRect(ladderX - 13, rungY, 26, 3)
      }
      
      entranceLadder.setDepth(5)
    }
    
    // Position player at bottom of ladder (off screen)
    // Since ladder bottom is at 800, start player at 780 for a good climb
    const playerStartY = GameSettings.canvas.height + 60 // Start at Y=780
    this.player.x = ladderX
    this.player.y = playerStartY
    
    // Ensure physics is disabled during intro
    if (this.player.body) {
      this.player.body.enable = false
      console.log('⚠️ Physics disabled for intro animation')
    }
    
    console.log('🎭 Player Intro Position:', {
      playerStartY: playerStartY,
      ladderBottom: ladderBottom,
      ladderTop: ladderTop,
      visualHeight: visualHeight,
      targetY: targetY,
      willClimbTo: targetY,
      physicsEnabled: this.player.body?.enable || false
    })
    
    // Set initial climbing sprite (or fallback)
    if (this.textures.exists('playerClimbLeftFoot')) {
      this.player.setTexture('playerClimbLeftFoot')
    } else {
      this.player.setTexture('playerIdleEye1') // Fallback
    }
    this.player.setDisplaySize(48, 64)
    
    // Player start position (replaced console.log)
    
    // Debug markers removed - no longer needed
    // (These were causing red, green, and blue circles during ladder animation)
    
    // Phase 1: Climbing animation - climb to the actual target Y (not floor Y)
    this.animatePlayerClimbing(ladderX, targetY, () => {
      // Phase 2: Bouncing animation
      console.log('🎯 Starting bounce animation at Y:', Math.round(this.player.y))
      this.animatePlayerBouncing(targetX, targetY, () => {
        // Phase 3: Complete intro
        console.log('✅ Intro animation complete! Player at:', {
          x: Math.round(this.player.x),
          y: Math.round(this.player.y),
          targetY: Math.round(targetY),
          aboutToEnablePhysics: true
        })
        
        // Make sure player is at exact target position before enabling physics
        this.player.setPosition(targetX, targetY)
        
        // CRITICAL: Sync physics body position with sprite position
        // The body seems to be offset, so we need to manually sync it
        this.player.body!.reset(targetX, targetY)
        
        // Re-enable physics AFTER position sync
        this.player.body!.enable = true
        this.isLevelStarting = false
        
        console.log('⚡ Physics re-enabled! Player now at:', {
          x: Math.round(this.player.x),
          y: Math.round(this.player.y),
          bodyY: Math.round(this.player.body!.y),
          bodyBottom: Math.round(this.player.body!.bottom),
          bodyOffset: {
            x: this.player.body!.offset.x,
            y: this.player.body!.offset.y
          },
          velocity: this.player.body!.velocity,
          gravity: this.physics.world.gravity,
          shouldBeStandingAt: platformTop
        })
        
        // Clear the progression flag now that intro is complete
        this.game.registry.set('levelProgression', false)
        
        // Notify Farcade SDK that game is ready
        this.notifyFarcadeGameReady()
        
        // Fade out entrance ladder
        this.tweens.add({
          targets: entranceLadder,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            entranceLadder.destroy()
          }
        })
        
        // Show start banner
        this.showStartBanner()
      })
    })
  }
  
  private animatePlayerClimbing(ladderX: number, targetY: number, onComplete: () => void): void {
    console.log('🧗 Climbing Animation Start:', {
      currentY: Math.round(this.player.y),
      targetY: Math.round(targetY),
      distanceToClimb: Math.round(this.player.y - targetY)
    })
    
    // Check if sprites are loaded
    const hasClimbSprites = this.textures.exists('playerClimbLeftFoot') && this.textures.exists('playerClimbRightFoot')
    
    if (!hasClimbSprites) {
      console.warn('⚠️ Climb sprites not loaded! Using fallback animation')
    }
    
    // Manual climbing animation
    let climbFrame = 0
    const climbSpeed = 80 // Speed of climbing
    const frameRate = 120 // Animation frame rate in ms
    
    // Create a timer for animation frames
    const climbTimer = this.time.addEvent({
      delay: frameRate,
      callback: () => {
        // Check for sprites each frame (they might load during animation)
        const spritesNowAvailable = this.textures.exists('playerClimbLeftFoot') && this.textures.exists('playerClimbRightFoot')
        
        // Alternate climbing sprites if available
        if (spritesNowAvailable) {
          if (climbFrame % 2 === 0) {
            this.player.setTexture('playerClimbLeftFoot')
          } else {
            this.player.setTexture('playerClimbRightFoot')
          }
          this.player.setDisplaySize(48, 64) // Maintain sprite size
        }
        climbFrame++
      },
      loop: true
    })
    
    // Move player up the ladder
    this.tweens.add({
      targets: this.player,
      y: targetY,
      duration: 2000, // 2 seconds to climb
      ease: 'Linear',
      onUpdate: (tween) => {
        if (climbFrame === 1) { // Log once during climb
          // Climbing progress (replaced console.log)
        }
      },
      onComplete: () => {
        // Climbing complete (replaced console.log)
        climbTimer.destroy()
        onComplete()
      }
    })
  }
  
  private animatePlayerBouncing(targetX: number, targetY: number, onComplete: () => void): void {
    // Sequence: jump off ladder → 2 bounces to target → idle + talking bubble
    console.log('🏀 Bounce Animation Start:', {
      currentPos: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      targetPos: { x: Math.round(targetX), y: Math.round(targetY) }
    })
    
    // Face right for movement
    this.player.setFlipX(false)
    
    // Use jumping sprite for bouncing animation
    const jumpTexture = this.textures.exists('playerJumpRightFoot') ? 'playerJumpRightFoot' : 'playerIdleEye1'
    this.player.setTexture(jumpTexture)
    
    // Create horizontal movement with 2 bounces to target position
    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: 800, // Faster movement with only 2 bounces
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Set to idle texture and trigger talking bubble
        this.changePlayerTexture('playerIdleEye1')
        
        // Trigger the talking bubble after a brief delay
        this.time.delayedCall(300, () => {
          // Trigger bubble system (this will show random thoughts/speech)
          if (this.player.onBubbleTrigger) {
            this.player.onBubbleTrigger()
          }
        })
        
        onComplete()
      }
    })
    
    // Add 2 bounces during horizontal movement (not in place)
    this.tweens.add({
      targets: this.player,
      y: targetY - 25, // Slightly smaller bounces (25px instead of 30px)
      duration: 200,
      ease: 'Power2.easeOut',
      yoyo: true,
      repeat: 1, // Only 2 total bounces (1 up/down cycle)
      onComplete: () => {
        // Ensure player ends at correct Y position
        this.player.y = targetY
      }
    })
  }
  
  private showStartBanner(): void {
    const levelNum = this.levelManager.getCurrentLevel()
    const levelConfig = this.levelManager.getLevelConfig(levelNum)
    const isDarkModeLevel = levelNum % 10 === 9
    const isBonusLevel = this.levelManager.isBonusLevel()
    
    // Create level number text
    const levelText = isBonusLevel ? 'BONUS LEVEL!' : 
                     levelConfig.isEndless ? 'ENDLESS MODE!' : 
                     `LEVEL ${levelNum}`
    const bannerText = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - (isDarkModeLevel && !isBonusLevel ? 120 : 100),
      levelText,
      {
        fontSize: '28px',
        color: isBonusLevel ? '#00ff00' : '#ffd700',  // Green for bonus, gold for regular
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0)
    
    // Add "DARK MODE!" text for dark mode levels (but not on bonus levels)
    let darkModeText: Phaser.GameObjects.Text | null = null
    if (isDarkModeLevel && !levelConfig.isEndless && !isBonusLevel) {
      darkModeText = this.add.text(
        GameSettings.canvas.width / 2,
        GameSettings.canvas.height / 2 - 85,
        'DARK MODE!',
        {
          fontSize: '18px',
          color: '#9932cc',  // Purple color
          fontFamily: '"Press Start 2P", system-ui',
          fontStyle: 'bold',
          stroke: '#4a148c',  // Dark purple stroke
          strokeThickness: 2,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',  // Black drop shadow
            blur: 3,
            fill: true
          }
        }
      ).setOrigin(0.5).setDepth(300).setScrollFactor(0)
    }
    
    const startText = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 50,
      'GO!',
      {
        fontSize: '36px',
        color: '#9acf07',  // Green color to match HUD level text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0).setAlpha(0)
    
    // Animate the banner
    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: startText,
        alpha: 1,
        duration: 300,
        yoyo: true,
        hold: 500,
        onComplete: () => {
          bannerText.destroy()
          startText.destroy()
          if (darkModeText) darkModeText.destroy()
        }
      })
    })
  }
  
  private showEndlessModePopup(): void {
    // Create popup for endless mode announcement
    const popup = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      350,
      200,
      0x2c2c2c,
      0.95
    ).setDepth(250).setScrollFactor(0)
    
    const border = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      354,
      204,
      0xffffff
    ).setDepth(249).setScrollFactor(0)
    border.setStrokeStyle(3, 0xffffff)
    border.setFillStyle()
    
    const title = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 50,
      'ENDLESS MODE UNLOCKED!',
      {
        fontSize: '24px',
        color: '#ff44ff',
        fontFamily: 'Arial Black',
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(251).setScrollFactor(0)
    
    const desc = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 10,
      'No more levels!\nClimb as high as you can!\nDifficulty has plateaued.',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(251).setScrollFactor(0)
    
    // Auto-dismiss after 3 seconds
    this.time.delayedCall(3000, () => {
      popup.destroy()
      border.destroy()
      title.destroy()
      desc.destroy()
    })
  }
  
  private createLevelEndDoor(): void {
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    
    // Only create door for non-endless levels
    if (!levelConfig.isEndless && levelConfig.floorCount > 0) {
      const tileSize = GameSettings.game.tileSize
      const floorSpacing = (GameSettings.game as any).floorSpacing || (tileSize * 5) // Same spacing as in createTestLevel
      
      // Calculate the Y position of the top floor
      const topFloor = levelConfig.floorCount - 1
      const topFloorY = GameSettings.canvas.height - tileSize/2 - (topFloor * floorSpacing)
      
      // Enhanced door placement with ladder and collectible conflict avoidance
      const doorX = this.findSafeDoorPosition(topFloor)
      
      // Place door on top floor - door is 100 pixels tall, position so bottom sits on platform surface
      // topFloorY is platform center, platform is 32px tall, so platform top is topFloorY - 16
      const platformTop = topFloorY - (tileSize / 2)
      const doorY = platformTop - 50 // Door center positioned so bottom sits on platform surface
      // console.log(`🚪 DOOR POSITIONING DEBUG: topFloorY=${topFloorY}, platformTop=${platformTop}, doorY=${doorY}`)
      // console.log(`🚪 DOOR POSITIONING DEBUG: Camera Y=${this.cameras.main.scrollY}, Player Y should be around ${doorY + 100}`)
      
      const isFirstLevel = this.levelManager.getCurrentLevel() === 1
      this.door = new Door(this, doorX, doorY, isFirstLevel)
      
      // Store door position for future collision avoidance
      this.storeDoorPosition(topFloor, Math.floor(doorX / tileSize))
      
      // Add collision detection for door
      this.physics.add.overlap(
        this.player,
        this.door,
        this.handleDoorOverlap,
        undefined,
        this
      )
    }
  }
  
  private findSafeDoorPosition(floor: number): number {
    const tileSize = GameSettings.game.tileSize
    const floorWidth = GameSettings.game.floorWidth
    const doorFloorLayout = this.floorLayouts[floor]
    const doorWidth = 3 // Door takes up about 3 tiles width
    
    // Get ladder positions on this floor to avoid conflicts
    const ladderPositions = this.ladderPositions.get(floor) || []
    
    // Find safe positions (not over gaps, not conflicting with ladders)
    const safePositions: number[] = []
    
    for (let x = 2; x < floorWidth - 2 - doorWidth; x++) {
      let isSafe = true
      
      // Check if this position and surrounding area are over solid ground
      for (let dx = 0; dx < doorWidth; dx++) {
        if (!this.hasPlatformAt(doorFloorLayout, x + dx)) {
          isSafe = false
          break
        }
      }
      
      // Check for ladder conflicts (door needs clearance from ladders)
      if (isSafe) {
        for (const ladderX of ladderPositions) {
          if (Math.abs(x - ladderX) < 4) { // Need at least 4 tiles clearance from ladders
            isSafe = false
            break
          }
        }
      }
      
      if (isSafe) {
        safePositions.push(x)
      }
    }
    
    // Choose position - prefer center, but avoid conflicts
    let doorTileX: number
    if (safePositions.length > 0) {
      // Find position closest to center
      const centerTile = Math.floor(floorWidth / 2)
      doorTileX = safePositions.reduce((closest, pos) => 
        Math.abs(pos - centerTile) < Math.abs(closest - centerTile) ? pos : closest
      )
    } else {
      // Fallback - use center and hope for the best
      doorTileX = Math.floor(floorWidth / 2) - Math.floor(doorWidth / 2)
    }
    
    return (doorTileX + doorWidth/2) * tileSize // Return center X position of door
  }
  
  private storeDoorPosition(floor: number, tileX: number): void {
    // Store door position for collision avoidance in collectible placement
    if (!this.doorPositions) {
      this.doorPositions = new Map()
    }
    this.doorPositions.set(floor, tileX)
  }
  
  private handleDoorOverlap(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    door: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const doorObj = door as Door
    const playerObj = player as Player
    
    // Check if player is on the door floor (standing on ground)
    const levelConfig = this.levelManager.getLevelConfig(this.levelManager.getCurrentLevel())
    const doorFloor = levelConfig.floorCount - 1
    const playerBody = playerObj.body as Phaser.Physics.Arcade.Body
    const isOnGround = playerBody.blocked.down
    
    
    // Player must be on the correct floor and on ground
    if (this.currentFloor === doorFloor && isOnGround) {
      // Show prompt to enter door
      doorObj.showPrompt(playerObj)
      
      // Check for UP key press to activate door
      const upPressed = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP).isDown ||
                       this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W).isDown ||
                       (this.touchControls?.upPressed || false)
      
      if (upPressed && !this.isLevelComplete) {
        this.completeLevel()
      }
    } else {
      // Hide prompt when not in range
      doorObj.hidePrompt()
    }
  }
  
  private completeLevel(): void {
    if (this.isLevelComplete) return
    
    this.isLevelComplete = true
    
    // Play door open sound effect
    this.playSoundEffect('door-open', 0.5)
    
    // Disable player controls
    this.player.body!.enable = false
    
    // Show level complete screen
    this.showLevelCompleteScreen()
  }
  
  private showLevelCompleteScreen(): void {
    const levelNum = this.levelManager.getCurrentLevel()
    
    // Trigger haptic feedback for level completion
    this.triggerFarcadeHapticFeedback()
    
    // Create overlay
    const overlay = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.7
    ).setDepth(299).setScrollFactor(0)
    
    // Create HUD-style popup background with rounded corners (taller for split text)
    const popupBg = this.add.graphics()
    popupBg.fillStyle(0x4a148c, 1.0)  // Dark purple fill to match HUD
    popupBg.lineStyle(2, 0x7b1fa2, 1.0) // Lighter purple border to match HUD
    popupBg.fillRoundedRect(
      GameSettings.canvas.width / 2 - 175,
      GameSettings.canvas.height / 2 - 140,  // Moved up slightly
      350,
      280,  // Increased height from 250 to 280
      12  // Rounded corners like HUD
    )
    popupBg.strokeRoundedRect(
      GameSettings.canvas.width / 2 - 175,
      GameSettings.canvas.height / 2 - 140,  // Moved up slightly
      350,
      280,  // Increased height from 250 to 280
      12  // Rounded corners like HUD
    )
    popupBg.setDepth(300).setScrollFactor(0)
    
    // Title - split into two lines
    const title = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 95,  // Adjusted position
      `LEVEL ${levelNum}\nCOMPLETE!`,  // Split into two lines
      {
        fontSize: '22px',
        color: '#9acf07',  // Green color to match HUD level text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)
    
    // Stats
    const stats = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 10,  // Adjusted position for new layout
      `Score: ${this.accumulatedScore + this.score}\nFloors Climbed: ${this.currentFloor}`,
      {
        fontSize: '14px',
        color: '#ffd700',  // Gold color to match HUD score text
        fontFamily: '"Press Start 2P", system-ui',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)
    
    // Next level preview
    const shouldHaveBonus = this.levelManager.shouldHaveBonusAfter(levelNum)
    const isInBonus = this.levelManager.isBonusLevel()
    let previewText = ''
    
    if (shouldHaveBonus && !isInBonus) {
      // We're completing a level that triggers a bonus (10, 20, 30, 40)
      previewText = 'Next: BONUS LEVEL!'
    } else if (isInBonus) {
      // We're in a bonus level, next is the regular level
      const nextLevel = levelNum + 1
      previewText = `Next: Level ${nextLevel}`
    } else {
      // Regular progression
      const nextLevel = levelNum + 1
      const nextConfig = this.levelManager.getLevelConfig(nextLevel)
      previewText = nextConfig.isEndless ? 'Next: BEAST MODE!' : `Next: Level ${nextLevel}`
    }
    
    const preview = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 50,  // Adjusted position for new layout
      previewText,
      {
        fontSize: '12px',
        color: '#ff69b4',  // Pink color to match HUD lives text
        fontFamily: '"Press Start 2P", system-ui',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)
    
    // Continue button (changed to teal)
    const continueBtn = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 100,  // Adjusted position for new layout
      150,
      40,
      0x20b2aa  // Teal color
    ).setDepth(301).setScrollFactor(0)
    continueBtn.setInteractive({ useHandCursor: true })
    continueBtn.setStrokeStyle(2, 0x188a82)  // Darker teal border
    
    const continueText = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 100,  // Adjusted position for new layout
      'CONTINUE',
      {
        fontSize: '16px',
        color: '#ffd700',  // Gold color to match HUD
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(302).setScrollFactor(0)
    
    // Continue button handler
    continueBtn.on('pointerdown', () => {
      // Play continue button sound
      this.playSoundEffect('continue-button', 0.5)
      
      // Save accumulated score and crystals before progressing
      const registry = this.game.registry
      registry.set('levelProgression', true)
      // Add current level score to accumulated score
      const newAccumulatedScore = this.accumulatedScore + this.score
      registry.set('accumulatedScore', newAccumulatedScore)
      registry.set('totalCoins', this.totalCoinsCollected)
      registry.set('totalGems', this.totalGemsCollected)
      registry.set('totalBlueGems', this.totalBlueGemsCollected)
      registry.set('totalDiamonds', this.totalDiamondsCollected)
      registry.set('livesEarned', this.livesEarned)
      
      // Save accumulated values (locked in from completed levels)
      registry.set('accumulatedCoins', this.totalCoinsCollected)
      registry.set('accumulatedGems', this.totalGemsCollected)
      registry.set('accumulatedBlueGems', this.totalBlueGemsCollected)
      registry.set('accumulatedDiamonds', this.totalDiamondsCollected)
      
      // Check if we're about to enter a bonus level BEFORE advancing
      const wasInBonus = this.levelManager.isBonusLevel()
      const currentLevelBeforeAdvance = this.levelManager.getCurrentLevel()
      const willEnterBonus = !wasInBonus && this.levelManager.shouldHaveBonusAfter(currentLevelBeforeAdvance)
      
      // Advance to next level
      const nextLevel = this.levelManager.nextLevel()
      const isNowInBonus = this.levelManager.isBonusLevel()
      
      console.log(`📊 Level transition: ${currentLevelBeforeAdvance} -> ${nextLevel} (Bonus: ${isNowInBonus})`)
      console.log(`💚 Current lives: ${this.lives}, Gems: ${this.totalCoinsCollected}`)
      
      // Update the registry with the new level
      registry.set('currentLevel', nextLevel)
      
      // Check for chapter transition (happens after bonus → next chapter)
      if (this.backgroundManager.isChapterTransition(nextLevel, isNowInBonus)) {
        // Preload next chapter backgrounds
        const nextChapter = this.backgroundManager.getChapterForLevel(nextLevel, isNowInBonus)
        this.backgroundManager.loadChapterBackgrounds(nextChapter).then(() => {
          // Unload previous chapter if needed
          const prevChapter = this.backgroundManager.getChapterForLevel(nextLevel - 1, false)
          this.backgroundManager.unloadChapterBackgrounds(prevChapter)
        })
      }
      
      // Check if entering BEAST MODE (level 51)
      if (nextLevel === 51) {
        this.showBeastModeNotification(() => {
          // Set isReplay flag to skip loading screen
          registry.set('isReplay', true)
          // Restart scene after BEAST MODE notification
          this.scene.restart()
        })
      } else if (wasInBonus && !isNowInBonus && nextLevel > 1) {
        // Coming out of bonus level to a new chapter - show splash
        // (e.g., completing bonus after level 10 → going to level 11)
        console.log('📍 Transitioning from bonus to chapter, showing splash for level', nextLevel)
        registry.set('showChapterSplash', true)
        registry.set('chapterSplashLevel', nextLevel)
        // Set isReplay flag to skip loading screen
        registry.set('isReplay', true)
        this.scene.restart()
      } else {
        // Regular level progression
        // Set isReplay flag to skip loading screen
        registry.set('isReplay', true)
        this.scene.restart()
      }
    })
  }

  private showChapterTransition(nextLevel: number, onComplete: () => void): void {
    const chapterName = this.backgroundManager.getChapterName(nextLevel)
    
    // Create overlay
    const overlay = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.7
    ).setDepth(299).setScrollFactor(0)

    // Create notification background
    const notificationBg = this.add.graphics()
    notificationBg.fillStyle(0x4a148c, 1.0)  // Dark purple fill
    notificationBg.lineStyle(2, 0x7b1fa2, 1.0) // Lighter purple border
    notificationBg.fillRoundedRect(
      GameSettings.canvas.width / 2 - 150,
      GameSettings.canvas.height / 2 - 60,
      300,
      120,
      12
    )
    notificationBg.strokeRoundedRect(
      GameSettings.canvas.width / 2 - 150,
      GameSettings.canvas.height / 2 - 60,
      300,
      120,
      12
    )
    notificationBg.setDepth(300).setScrollFactor(0)

    // Chapter name text
    const titleText = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 20,
      'ENTERING',
      {
        fontSize: '14px',
        color: '#FFD700',
        fontFamily: '"Press Start 2P", system-ui',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)

    const chapterText = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 10,
      chapterName.toUpperCase(),
      {
        fontSize: '16px',
        color: '#9ACF07',
        fontFamily: '"Press Start 2P", system-ui',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)

    // Fade in
    overlay.setAlpha(0)
    notificationBg.setAlpha(0)
    titleText.setAlpha(0)
    chapterText.setAlpha(0)

    this.tweens.add({
      targets: [overlay, notificationBg, titleText, chapterText],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // Hold for a moment
        this.time.delayedCall(1500, () => {
          // Fade out
          this.tweens.add({
            targets: [overlay, notificationBg, titleText, chapterText],
            alpha: 0,
            duration: 500,
            onComplete: () => {
              overlay.destroy()
              notificationBg.destroy()
              titleText.destroy()
              chapterText.destroy()
              onComplete()
            }
          })
        })
      }
    })
  }

  private showBeastModeNotification(onComplete: () => void): void {
    // Create dramatic overlay
    const overlay = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.8
    ).setDepth(299).setScrollFactor(0)

    // Create HUD-style notification background with rounded corners
    const notificationBg = this.add.graphics()
    notificationBg.fillStyle(0x4a148c, 1.0)  // Dark purple fill to match HUD
    notificationBg.lineStyle(2, 0x7b1fa2, 1.0) // Lighter purple border to match HUD
    notificationBg.fillRoundedRect(
      GameSettings.canvas.width / 2 - 200,
      GameSettings.canvas.height / 2 - 100,
      400,
      200,
      12  // Rounded corners like HUD
    )
    notificationBg.strokeRoundedRect(
      GameSettings.canvas.width / 2 - 200,
      GameSettings.canvas.height / 2 - 100,
      400,
      200,
      12  // Rounded corners like HUD
    )
    notificationBg.setDepth(300).setScrollFactor(0)
    
    // Main BEAST MODE title
    const beastModeTitle = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 - 40,
      'BEAST MODE',
      {
        fontSize: '24px',
        color: '#ff69b4',  // Pink color to match HUD lives (but for special BEAST MODE)
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)
    
    // Subtitle
    const subtitle = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      'ACTIVATED',
      {
        fontSize: '16px',
        color: '#9acf07',  // Green color to match HUD level text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)
    
    // Description
    const description = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2 + 30,
      'Infinite floors at maximum difficulty!',
      {
        fontSize: '10px',
        color: '#ffd700',  // Gold color to match HUD score text
        fontFamily: '"Press Start 2P", system-ui',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0)
    
    // Trigger haptic feedback for BEAST MODE activation
    this.triggerFarcadeHapticFeedback()
    
    // Add pulsing effect to title
    this.tweens.add({
      targets: beastModeTitle,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Power2'
    })
    
    // Auto-close after 3 seconds
    this.time.delayedCall(3000, () => {
      // Clean up
      overlay.destroy()
      notificationBg.destroy()
      beastModeTitle.destroy()
      subtitle.destroy()
      description.destroy()
      
      // Call completion callback
      onComplete()
    })
  }

  private updateCoinCounterDisplay(): void {
    const crystalsTowardNext = this.totalCoinsCollected % this.COINS_PER_EXTRA_LIFE
    this.coinCounterText.setText(`${crystalsTowardNext}/${this.COINS_PER_EXTRA_LIFE}`)
  }

  private updateLivesDisplay(): void {
    // Show actual count for lives (up to 99)
    const livesToShow = this.lives
    const livesText = livesToShow > 0 ? `x${livesToShow}` : 'GAME OVER'
    this.livesText.setText(livesText)
    
    // Hide heart icon when game over
    if (this.livesIcon) {
      this.livesIcon.setVisible(livesToShow > 0)
    }
  }
  
  private showBeastModeLoadingIndicator(): void {
    // Create loading text in the center-top of the screen
    this.beastModeLoadingText = this.add.text(
      this.cameras.main.width / 2,
      100,
      'BEAST MODE: LOADING CHAOS... 0%',
      {
        fontSize: '16px',
        color: '#ff00ff',
        fontFamily: '"Press Start 2P", system-ui',
        stroke: '#000000',
        strokeThickness: 3
      }
    )
    this.beastModeLoadingText.setOrigin(0.5)
    this.beastModeLoadingText.setScrollFactor(0)
    this.beastModeLoadingText.setDepth(200)
    
    // Update loading progress every 500ms
    this.beastModeLoadingTimer = this.time.addEvent({
      delay: 500,
      repeat: -1,
      callback: () => {
        if (this.backgroundManager && this.beastModeLoadingText) {
          const progress = this.backgroundManager.getBeastModeLoadingProgress()
          
          if (this.backgroundManager.isBeastModeFullyLoaded()) {
            // Fully loaded - show completion message then hide
            this.beastModeLoadingText.setText('BEAST MODE: FULLY LOADED!')
            this.beastModeLoadingText.setColor('#00ff00')
            
            // Remove after 2 seconds
            this.time.delayedCall(2000, () => {
              if (this.beastModeLoadingText) {
                this.beastModeLoadingText.destroy()
                this.beastModeLoadingText = undefined
              }
              if (this.beastModeLoadingTimer) {
                this.beastModeLoadingTimer.destroy()
                this.beastModeLoadingTimer = undefined
              }
            })
          } else {
            // Still loading - update percentage
            this.beastModeLoadingText.setText(`BEAST MODE: LOADING CHAOS... ${progress.percentage}%`)
          }
        }
      }
    })
  }

  private checkForExtraLife(): void {
    // Calculate how many lives should have been earned based on total gems
    const livesFromGems = Math.floor(this.totalCoinsCollected / this.COINS_PER_EXTRA_LIFE)
    
    // Check if more lives should be awarded than have been earned so far
    if (livesFromGems > this.livesEarned) {
      const newLivesToAward = livesFromGems - this.livesEarned
      
      console.log(`💎 Checking extra lives: ${newLivesToAward} new lives to award (${this.totalCoinsCollected} gems / ${this.COINS_PER_EXTRA_LIFE})`)
      
      // Award all earned lives (handles multiple lives at once in bonus levels)
      for (let i = 0; i < newLivesToAward; i++) {
        if (this.lives < this.MAX_LIVES) {
          const oldLives = this.lives
          this.lives++
          this.livesEarned++
          this.game.registry.set('playerLives', this.lives)  // Save to registry
          this.game.registry.set('livesEarned', this.livesEarned)  // Save earned count
          this.updateLivesDisplay()
          
          console.log(`💚 Extra life earned from gems! Lives: ${oldLives} -> ${this.lives}`)
          
          // Play heart collect sound for earning extra life
          this.playSoundEffect('heart-collect', 0.5)
          
          // Show extra life popup with reason
          this.showExtraLifePopup('150 Gems!')
        } else {
          // Still track that the life was "earned" even if at max
          this.livesEarned++
          this.game.registry.set('livesEarned', this.livesEarned)
          console.log(`💛 Extra life earned but at max (${this.MAX_LIVES})`)
        }
      }
    }
  }

  private showExtraLifePopup(reason: string = ''): void {
    // Main extra life text
    const popup = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      'EXTRA LIFE!',
      {
        fontSize: '20px',
        color: '#00ff00',
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 0,
          stroke: false,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0)
    
    // Show reason if provided (e.g., "150 Gems!" or "Heart Crystal!")
    let reasonText: Phaser.GameObjects.Text | null = null
    if (reason) {
      reasonText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 20,
        reason,
        {
          fontSize: '14px',
          color: '#ffd700',
          fontFamily: '"Press Start 2P", system-ui',
          fontStyle: 'bold',
          stroke: '#4a148c',
          strokeThickness: 1,
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 0,
            stroke: false,
            fill: true
          }
        }
      ).setOrigin(0.5).setDepth(300).setScrollFactor(0)
    }

    // Animate popup
    const animTargets = reasonText ? [popup, reasonText] : [popup]
    this.tweens.add({
      targets: animTargets,
      y: '-=30',
      alpha: 0,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        popup.destroy()
        if (reasonText) reasonText.destroy()
      }
    })
  }

  private showLostLifePopup(): void {
    // STOP ALL GAMEPLAY - Pause physics and disable controls
    this.physics.pause() // Freezes all physics bodies and stops all movement
    this.touchControls.disable() // Disable touch controls
    this.input.keyboard!.enabled = false // Disable keyboard input
    
    // Create semi-transparent overlay
    const overlay = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.7
    ).setDepth(199).setScrollFactor(0)
    
    // Create popup background
    const popupWidth = 280
    const popupHeight = 180
    const popupX = this.cameras.main.width / 2
    const popupY = this.cameras.main.height / 2
    
    // Create HUD-style popup background with rounded corners
    const popupBg = this.add.graphics()
    popupBg.fillStyle(0x4a148c, 1.0)  // Dark purple fill to match HUD
    popupBg.lineStyle(2, 0x7b1fa2, 1.0) // Lighter purple border to match HUD
    popupBg.fillRoundedRect(
      popupX - popupWidth/2,
      popupY - popupHeight/2,
      popupWidth,
      popupHeight,
      12  // Rounded corners like HUD
    )
    popupBg.strokeRoundedRect(
      popupX - popupWidth/2,
      popupY - popupHeight/2,
      popupWidth,
      popupHeight,
      12  // Rounded corners like HUD
    )
    popupBg.setDepth(200).setScrollFactor(0)
    
    // Lost life title
    const title = this.add.text(
      popupX,
      popupY - 45,
      'LIFE LOST!',
      {
        fontSize: '22px',
        color: '#ff69b4',  // Pink color to match HUD lives text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Lives remaining
    const livesText = this.add.text(
      popupX,
      popupY - 10,
      `Lives Remaining: ${this.lives}`,
      {
        fontSize: '14px',
        color: '#ffd700',  // Gold color to match HUD score text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Continue button (changed to teal)
    const continueBtn = this.add.rectangle(
      popupX,
      popupY + 40,
      140,
      35,
      0x20b2aa  // Teal color
    ).setDepth(201).setScrollFactor(0)
    continueBtn.setInteractive({ useHandCursor: true })
    continueBtn.setStrokeStyle(2, 0x188a82)  // Darker teal border
    
    const continueText = this.add.text(
      popupX,
      popupY + 40,
      'CONTINUE',
      {
        fontSize: '12px',
        color: '#9acf07',  // Green color to match HUD level text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(202).setScrollFactor(0)
    
    // Continue button handler - restart current level
    continueBtn.on('pointerdown', () => {
      // Play continue button sound
      this.playSoundEffect('continue-button', 0.5)
      
      // Set flag to indicate this is a death retry, not a fresh start
      this.game.registry.set('isDeathRetry', true)
      
      this.scene.restart() // This will keep current level and not reset lives/coins
    })
    
    // Hover effects
    continueBtn.on('pointerover', () => {
      continueBtn.setFillStyle(0x66ff66)
    })
    
    continueBtn.on('pointerout', () => {
      continueBtn.setFillStyle(0x44ff44)
    })
  }

  private showGameOverScreen(): void {
    // Play game over sound
    this.playSoundEffect('game-over', 0.5)
    
    // STOP ALL GAMEPLAY - Pause physics and disable controls
    this.physics.pause() // Freezes all physics bodies and stops all movement
    this.touchControls.disable() // Disable touch controls
    this.input.keyboard!.enabled = false // Disable keyboard input
    
    // Store final score for later SDK notification
    const finalScore = this.accumulatedScore + this.score
    // SDK game over will now be triggered when START OVER is clicked
    
    // Create semi-transparent overlay
    const overlay = this.add.rectangle(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height,
      0x000000,
      0.7
    ).setDepth(199).setScrollFactor(0)
    
    // Create popup background (much larger for enhanced stats)
    const popupWidth = 380
    const popupHeight = 470  // Increased from 450 to accommodate Rex
    const popupX = this.cameras.main.width / 2
    const popupY = this.cameras.main.height / 2
    
    // Create HUD-style popup background with rounded corners
    const popupBg = this.add.graphics()
    popupBg.fillStyle(0x4a148c, 1.0)  // Dark purple fill to match HUD
    popupBg.lineStyle(2, 0x7b1fa2, 1.0) // Lighter purple border to match HUD
    popupBg.fillRoundedRect(
      popupX - popupWidth/2,
      popupY - popupHeight/2,
      popupWidth,
      popupHeight,
      12  // Rounded corners like HUD
    )
    popupBg.strokeRoundedRect(
      popupX - popupWidth/2,
      popupY - popupHeight/2,
      popupWidth,
      popupHeight,
      12  // Rounded corners like HUD
    )
    popupBg.setDepth(200).setScrollFactor(0)
    
    // Game over title
    const gameOverTitle = this.add.text(
      popupX,
      popupY - 190,
      'GAME OVER!',
      {
        fontSize: '24px',
        color: '#ff69b4',  // Pink color to match HUD lives text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Display final score
    const scoreText = this.add.text(
      popupX,
      popupY - 155,
      `Score: ${this.accumulatedScore + this.score}`,
      {
        fontSize: '16px',
        color: '#ffd700',  // Gold color to match HUD score text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // PERFORMANCE STATS Section Header
    const perfHeader = this.add.text(
      popupX,
      popupY - 125,
      '📊 PERFORMANCE STATS',
      {
        fontSize: '12px',
        color: '#ffd700',  // Gold color
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Floors Climbed
    const floorsText = this.add.text(
      popupX,
      popupY - 100,
      `Floors Climbed: ${this.gameStats.highestFloor}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Level Reached
    const levelText = this.add.text(
      popupX,
      popupY - 80,
      `Level Reached: ${this.levelManager.getCurrentLevel()}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Gems Collected
    const gemsText = this.add.text(
      popupX,
      popupY - 60,
      `Gems Collected: ${this.totalGemsCollected + this.totalBlueGemsCollected + this.totalDiamondsCollected}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Treasure Chests
    const chestsText = this.add.text(
      popupX,
      popupY - 40,
      `Treasure Chests: ${this.gameStats.treasureChestsOpened}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // COMBAT STATS Section Header
    const combatHeader = this.add.text(
      popupX,
      popupY - 10,
      '⚔️ ENEMIES DEFEATED',
      {
        fontSize: '12px',
        color: '#ffd700',  // Gold color
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Enemy stats in single vertical column with proper spacing
    let enemyY = popupY + 15
    
    // All enemies in center
    const caterpillarText = this.add.text(
      popupX,
      enemyY,
      `Caterpillar: ${this.gameStats.enemyKills.caterpillar}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const rollzText = this.add.text(
      popupX,
      enemyY + 18,
      `Rollz: ${this.gameStats.enemyKills.rollz}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const chomperText = this.add.text(
      popupX,
      enemyY + 36,
      `Chomper: ${this.gameStats.enemyKills.chomper}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const snailText = this.add.text(
      popupX,
      enemyY + 54,
      `Snail: ${this.gameStats.enemyKills.snail}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const bouncerText = this.add.text(
      popupX,
      enemyY + 72,
      `Bouncer: ${this.gameStats.enemyKills.bouncer}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const stalkerText = this.add.text(
      popupX,
      enemyY + 90,
      `Stalker: ${this.gameStats.enemyKills.stalker}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const rexText = this.add.text(
      popupX,
      enemyY + 108,
      `Rex: ${this.gameStats.enemyKills.rex}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    const bluText = this.add.text(
      popupX,
      enemyY + 126,
      `Blu: ${this.gameStats.enemyKills.blu}`,
      {
        fontSize: '10px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Total enemies line
    const totalText = this.add.text(
      popupX,
      enemyY + 148,
      `Total Enemies: ${this.gameStats.totalEnemiesDefeated}`,
      {
        fontSize: '11px',
        color: '#9acf07',  // Green
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
    
    // Restart button (full game restart, changed to teal)
    const restartButton = this.add.rectangle(
      popupX,
      popupY + 195,
      150,
      40,
      0x20b2aa  // Teal color
    ).setDepth(201).setScrollFactor(0)
    restartButton.setInteractive({ useHandCursor: true })
    restartButton.setStrokeStyle(2, 0x188a82)  // Darker teal border
    
    const restartText = this.add.text(
      popupX,
      popupY + 195,
      'CONTINUE',
      {
        fontSize: '14px',
        color: '#9acf07',  // Green color to match HUD level text
        fontFamily: '"Press Start 2P", system-ui',
        fontStyle: 'bold',
        stroke: '#4a148c',  // Dark purple stroke to match HUD
        strokeThickness: 1,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',  // Black drop shadow
          blur: 3,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(202).setScrollFactor(0)
    
    // Start over handler - for dgen1, restart directly without SDK
    restartButton.on('pointerdown', () => {
      console.log('🔄 Continue button clicked!')

      // Play.fun: report score via platform, then restart
      const platform = this.game.registry.get('platform')
      if (platform) {
        platform.gameOver(finalScore)
      }
      console.log('[PlayFun] Score reported, restarting game...')
      this.restartGame()
    })
    
    // Hover effects
    restartButton.on('pointerover', () => {
      restartButton.setFillStyle(0x25c7c3)  // Lighter teal on hover
      restartText.setScale(1.1)  // Slightly enlarge text
    })
    
    restartButton.on('pointerout', () => {
      restartButton.setFillStyle(0x20b2aa)  // Back to original teal
      restartText.setScale(1.0)  // Reset text scale
    })
    
    // Keyboard support
    this.input.keyboard!.on('keydown-R', () => {
      const platform = this.game.registry.get('platform')
      if (platform) {
        platform.gameOver(finalScore)
      }
      this.restartGame()
    })
  }

  private changePlayerTexture(textureKey: string): void {
    if (this.textures.exists(textureKey)) {
      this.player.setTexture(textureKey)
      this.player.setDisplaySize(48, 64)
    }
  }

  private initializeBubbleSystem(): void {
    // Create placeholder bubble sprites if they don't exist
    this.createPlaceholderBubbles()
    
    // Connect player bubble trigger callback
    this.player.setBubbleTriggerCallback(() => {
      this.showRandomBubble()
    })
    
    // Connect player movement callback to hide bubble immediately
    this.player.setMovementStartCallback(() => {
      this.hideBubble()
    })
  }
  
  private createDebugGrid(): void {
    // Clear any existing debug grid
    this.children.list.forEach(child => {
      if (child.getData && child.getData('debugGrid')) {
        child.destroy()
      }
    })
    
    const graphics = this.add.graphics()
    graphics.setDepth(200) // Above everything
    graphics.setScrollFactor(1) // Follow the world
    graphics.setData('debugGrid', true)
    
    // Grid centered on player with 20px spacing
    const centerX = this.player.x
    const centerY = this.player.y
    const gridSize = 20
    const gridExtent = 200 // 200px in each direction
    
    // Set grid color
    graphics.lineStyle(1, 0xff0000, 0.5) // Red, semi-transparent
    
    // Draw vertical lines
    for (let x = centerX - gridExtent; x <= centerX + gridExtent; x += gridSize) {
      graphics.lineBetween(x, centerY - gridExtent, x, centerY + gridExtent)
    }
    
    // Draw horizontal lines
    for (let y = centerY - gridExtent; y <= centerY + gridExtent; y += gridSize) {
      graphics.lineBetween(centerX - gridExtent, y, centerX + gridExtent, y)
    }
    
    // Draw thicker center lines
    graphics.lineStyle(2, 0x00ff00, 0.8) // Green, more opaque
    graphics.lineBetween(centerX, centerY - gridExtent, centerX, centerY + gridExtent) // Vertical center
    graphics.lineBetween(centerX - gridExtent, centerY, centerX + gridExtent, centerY) // Horizontal center
    
    // Add coordinate labels at intersections (every 40px)
    const labelSize = 40
    for (let x = centerX - gridExtent; x <= centerX + gridExtent; x += labelSize) {
      for (let y = centerY - gridExtent; y <= centerY + gridExtent; y += labelSize) {
        const relativeX = x - centerX
        const relativeY = y - centerY
        
        const label = this.add.text(x, y, `${relativeX},${relativeY}`, {
          fontSize: '8px',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 1, y: 1 }
        }).setOrigin(0.5).setDepth(201).setScrollFactor(1)
        label.setData('debugGrid', true)
      }
    }
    
    // Mark player center with a red dot
    const playerDot = this.add.circle(centerX, centerY, 3, 0xff0000)
    playerDot.setDepth(202).setScrollFactor(1)
    playerDot.setData('debugGrid', true)
    
    // Auto-remove grid after 10 seconds
    this.time.delayedCall(10000, () => {
      this.children.list.forEach(child => {
        if (child.getData && child.getData('debugGrid')) {
          child.destroy()
        }
      })
    })
  }
  
  private createPlaceholderBubbles(): void {
    // No longer need placeholder bubbles - using custom sprite
  }
  
  private showRandomBubble(): void {
    // Don't show bubble if one is already active
    if (this.speechBubble || this.thoughtBubble) {
      return
    }
    
    // Only show speech bubble (thought bubble disabled)
    this.showSpeechBubble()
  }
  
  private showSpeechBubble(): void {
    const bubble = this.add.image(0, 0, 'talking-bubble')
    bubble.setDepth(150) // Above most game elements but below HUD
    bubble.setScrollFactor(1) // Follow the world/player
    
    // Position bubble with bottom-left corner at 20,20 relative to player
    // Assuming bubble is roughly 120x80 pixels, center would be at 20+60, 20+40 from bottom-left
    bubble.x = this.player.x + 20 + (bubble.width * 0.5) // 20 + half width for center positioning
    bubble.y = this.player.y + 20 - (bubble.height * 0.5) // 20 - half height for center positioning
    
    this.speechBubble = bubble
    this.player.notifyBubbleActive(true)
    
    // Set timer to hide bubble after 3 seconds or when player moves
    this.bubbleTimer = this.time.delayedCall(this.BUBBLE_DISPLAY_TIME, () => {
      this.hideBubble()
    })
  }
  
  private showThoughtBubble(): void {
    const bubble = this.add.image(0, 0, 'thoughtBubblePlaceholder')  
    bubble.setDepth(150) // Above most game elements but below HUD
    bubble.setScrollFactor(1) // Follow the world/player
    
    // Position at 12:30 relative to player (about -75 degrees from 12 o'clock)
    const angle = (-90 - 15) * (Math.PI / 180) // 12:30 position
    const distance = 45 // Distance from player center
    
    // Add slight random offset for natural feel
    const offsetX = (Math.random() - 0.5) * 8
    const offsetY = (Math.random() - 0.5) * 8
    
    bubble.x = this.player.x + Math.cos(angle) * distance + offsetX
    bubble.y = this.player.y + Math.sin(angle) * distance + offsetY
    
    this.thoughtBubble = bubble
    this.player.notifyBubbleActive(true)
    
    // Set timer to hide bubble after 3 seconds or when player moves
    this.bubbleTimer = this.time.delayedCall(this.BUBBLE_DISPLAY_TIME, () => {
      this.hideBubble()
    })
  }
  
  private hideBubble(): void {
    // Clean up active bubble
    if (this.speechBubble) {
      this.speechBubble.destroy()
      this.speechBubble = null
    }
    
    if (this.thoughtBubble) {
      this.thoughtBubble.destroy() 
      this.thoughtBubble = null
    }
    
    // Clean up timer
    if (this.bubbleTimer) {
      this.bubbleTimer.destroy()
      this.bubbleTimer = null
    }
    
    // Notify player that bubble is no longer active
    this.player.notifyBubbleActive(false)
  }


  private updateBackgroundPosition(): void {
    if (!this.backgroundSprite) return
    
    // Get current camera position
    const cameraY = this.cameras.main.scrollY
    
    // Calculate how far the camera has moved from the initial position
    // With scrollFactor 0.05, the background moves at 5% of camera speed
    const parallaxOffset = cameraY * 0.05
    
    // Calculate the desired background Y position
    let desiredY = this.backgroundInitialY - parallaxOffset
    
    // Get the screen height for boundary calculations
    const screenHeight = GameSettings.canvas.height
    
    // Calculate the actual height of the scaled background
    const bgHeight = this.backgroundHeight
    
    // Ensure the background never shows gray areas:
    // - The top of the background should never go below Y = 0 (would show gray above)
    // - The bottom of the background should never go above screenHeight (would show gray below)
    const minY = 0 // Background top edge should not go below screen top
    const maxY = screenHeight - bgHeight // Background should cover the entire screen
    
    // Clamp the Y position to stay within bounds
    // Since backgrounds are typically taller than the screen (scaled 1.2x), 
    // we mainly need to prevent it from moving too far down (showing gray at top)
    if (bgHeight > screenHeight) {
      // Background is taller than screen (normal case)
      desiredY = Math.min(minY, desiredY) // Prevent moving too far down
      desiredY = Math.max(maxY, desiredY) // Prevent moving too far up
    } else {
      // Background is shorter than screen (shouldn't happen but handle it)
      desiredY = minY // Just pin to top
    }
    
    // Update the background position with clamped value
    this.backgroundSprite.setY(desiredY)
  }

  // Helper method to get enemy type name for stats tracking
  private getEnemyTypeName(enemy: any): string {
    if (enemy.constructor.name === 'Cat') {
      // Use getter methods if available, fallback to properties
      const color = enemy.getCatColor ? enemy.getCatColor() : 
                     enemy.catColor || enemy.color || enemy.getData?.('color')
      const isStalker = enemy.getIsStalker ? enemy.getIsStalker() : 
                        enemy.isStalker || enemy.getData?.('isStalker')
      
      // Debug logging to verify it's working
      console.log(`🎯 Enemy type detection - Color: ${color}, Stalker: ${isStalker}`)
      
      switch(color) {
        case 'yellow': return 'caterpillar'
        case 'blue_caterpillar': return 'caterpillar'  // Track blue caterpillar as caterpillar
        case 'blue': return 'chomper'
        case 'purple': return 'chomper'  // Track purple chomper as chomper
        case 'red': return isStalker ? 'stalker' : 'snail'
        case 'green': return 'bouncer'
        default: 
          console.warn('❌ Unknown enemy color:', color)
          return 'unknown'
      }
    } else if (enemy.constructor.name === 'Beetle') {
      return 'rollz'
    } else if (enemy.constructor.name === 'Rex') {
      return 'rex'
    } else if (enemy.constructor.name === 'BaseBlu') {
      return 'blu'
    }
    return 'unknown'
  }

  // Farcade SDK Integration Methods
  private notifyFarcadeGameReady(): void {
    try {
      if (typeof window !== 'undefined' && (window as any).FarcadeSDK) {
        (window as any).FarcadeSDK.singlePlayer.actions.ready()
      }
    } catch (error) {
      // Fail silently if SDK not available
    }
  }

  private notifyFarcadeGameOver(score: number): void {
    try {
      if (typeof window !== 'undefined' && (window as any).FarcadeSDK) {
        (window as any).FarcadeSDK.singlePlayer.actions.gameOver({ score })
      }
    } catch (error) {
      // Fail silently if SDK not available
    }
  }

  private triggerFarcadeHapticFeedback(): void {
    try {
      if (typeof window !== 'undefined' && (window as any).FarcadeSDK) {
        (window as any).FarcadeSDK.singlePlayer.actions.hapticFeedback()
      }
    } catch (error) {
      // Fail silently if SDK not available
    }
  }

  private setupFarcadeEventHandlers(): void {
    try {
      if (typeof window !== 'undefined' && (window as any).FarcadeSDK) {
        const sdk = (window as any).FarcadeSDK
        
        // Handle play_again event
        sdk.singlePlayer.events.on('play_again', () => {
          this.restartGame()
        })
        
        // Handle toggle_mute event (placeholder for when audio is added)
        sdk.singlePlayer.events.on('toggle_mute', () => {
          // TODO: Implement audio mute/unmute when audio system is added
        })
      }
    } catch (error) {
      // Fail silently if SDK not available
    }
  }

  private restartGame(): void {
    // Reset game state for new game
    this.game.registry.set('isDeathRetry', false)
    this.game.registry.set('isLevelProgression', false)
    this.game.registry.set('currentLevel', 1)  // Always start at level 1
    this.game.registry.set('playerLives', 3) // Use correct key
    this.game.registry.set('totalCoins', 0) // Use correct key
    this.game.registry.set('livesEarned', 0) // Reset lives earned counter
    this.game.registry.set('accumulatedScore', 0)
    
    // Restart the scene
    this.scene.restart()
  }

  /**
   * Check for stuck Chompers and replace them with Snails as a last resort
   * This is a nuclear option to ensure gameplay continues
   */
  private checkAndReplaceStuckChompers(): void {
    if (!this.cats) return
    
    this.cats.children.entries.forEach(enemy => {
      if (enemy instanceof Cat) {
        const cat = enemy as Cat
        
        // Check if this is a Chomper that's been stuck multiple times
        const stuckCount = cat.getData('stuckRecoveryCount') || 0
        if (cat.getCatColor() === CatColor.BLUE && stuckCount >= 3) {
          console.warn('Replacing chronically stuck Chomper with Snail at position', cat.x, cat.y)
          
          // Store the enemy's position and floor info
          const enemyX = cat.x
          const enemyY = cat.y
          const platformBounds = cat.platformBounds
          
          // Destroy the stuck Chomper
          cat.destroy()
          
          // Create a Snail enemy as replacement
          const newEnemy = new Cat(
            this,
            enemyX,
            enemyY,
            platformBounds.left,
            platformBounds.right,
            CatColor.RED, // Snail color
            false // Not a stalker
          )
          
          // Add to cats group
          this.cats.add(newEnemy)
          
          // Log the replacement for debugging
          console.log('Successfully replaced stuck Chomper with Snail')
        }
      }
    })
  }

  shutdown() {
    // Clean up background references
    this.backgroundSprite = null
    this.backgroundInitialY = 0
    this.backgroundHeight = 0
  }
}