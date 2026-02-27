import { LoadingScene } from "./scenes/LoadingScene"
import { SplashScene } from "./scenes/SplashScene"
import { InstructionsScene } from "./scenes/InstructionsScene"
import { GameScene } from "./scenes/GameScene"
import { initPlayFunSDK } from "./utils/RemixUtils"
import GameSettings from "./config/GameSettings"

// Import TestScene conditionally (will be tree-shaken in production if debug is false)
import { TestScene } from "./scenes/TestScene"

// Build scene list
const scenes: any[] = [LoadingScene, SplashScene, InstructionsScene, GameScene]

// Add TestScene only in debug mode
if (GameSettings.debug) {
  scenes.push(TestScene)
  console.log("TestScene enabled - Press 'T' in game to access")
}

// Game configuration — 480x720 portrait, Phaser.Scale.FIT scales to viewport
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GameSettings.canvas.width,
  height: GameSettings.canvas.height,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: document.body,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Support for high DPI displays
    resolution: window.devicePixelRatio || 1,
  },
  backgroundColor: "#000000",
  scene: scenes,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: GameSettings.game.gravity },
      debug: false,
    },
  },
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
  fps: {
    target: 60,
  },
  pixelArt: false,
  antialias: true,
  render: {
    pixelArt: false,
    roundPixels: false,
  },
}

// Create the game instance
const game = new Phaser.Game(config)

// Initialize game state - this is NOT a replay on first start
game.registry.set('isReplay', false)

// Debug viewport dimensions
console.log('[PlayFun] Viewport Debug:', {
  innerHeight: window.innerHeight,
  innerWidth: window.innerWidth,
  clientHeight: document.documentElement.clientHeight,
  clientWidth: document.documentElement.clientWidth,
  devicePixelRatio: window.devicePixelRatio
})

// Initialize Play.fun SDK on game ready
game.events.once("ready", () => {
  initPlayFunSDK('352aad5d-b6fa-4ad7-9ccf-ab9da95d4867')

  // Set up audio context resumption on user interaction
  let audioUnlocked = false
  const ensureAudioContext = () => {
    if (game.sound.context) {
      if (game.sound.context.state === 'suspended') {
        game.sound.context.resume()
          .then(() => {
            console.log('[PlayFun] Audio context resumed')
            audioUnlocked = true
          })
          .catch((e: Error) => {
            console.warn('[PlayFun] Could not resume audio:', e)
          })
      } else if (game.sound.context.state === 'running' && !audioUnlocked) {
        audioUnlocked = true
      }
    }
  }

  game.canvas.addEventListener('click', ensureAudioContext, { passive: true })
  game.canvas.addEventListener('touchstart', ensureAudioContext, { passive: false })
  game.canvas.addEventListener('touchend', ensureAudioContext, { passive: false })
  document.addEventListener('keydown', ensureAudioContext, { passive: true })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureAudioContext()
  })
})
