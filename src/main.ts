/**
 * Treasure Quest - Play.fun Version
 * Entry point for the Play.fun platform
 */

import { LoadingScene } from "./scenes/LoadingScene"
import { SplashScene } from "./scenes/SplashScene"
import { InstructionsScene } from "./scenes/InstructionsScene"
import { GameScene } from "./scenes/GameScene"
import GameSettings from "./config/GameSettings"
import { detectPlatform } from "./utils/GamePlatform"
import { initPlayFunSDK } from "./utils/RemixUtils"

// Scene list
const scenes: any[] = [LoadingScene, SplashScene, InstructionsScene, GameScene]

// Game configuration — 720x720 internal, Phaser.Scale.FIT scales to viewport
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GameSettings.canvas.width,
  height: GameSettings.canvas.height,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: document.body,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GameSettings.canvas.width,
    height: GameSettings.canvas.height,
  },
  backgroundColor: "#2e2348",
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
  pixelArt: true,
  antialias: false,
  render: {
    pixelArt: true,
    roundPixels: true,
  },
}

// Wait for fonts before creating game
async function waitForFonts() {
  await document.fonts.ready
  try {
    await document.fonts.load('400 16px "Press Start 2P"')
  } catch (e) {
    // Font may not be available yet, continue anyway
  }
  await new Promise(resolve => setTimeout(resolve, 50))
}

async function initializeApp() {
  await waitForFonts()

  // Create the game instance
  const game = new Phaser.Game(config)

  // Store game reference globally
  ;(window as any).game = game

  // Initialize platform handler (play.fun)
  const platform = detectPlatform()
  game.registry.set('platform', platform)
  game.registry.set('isPlayFun', true)
  ;(window as any).platform = platform
  ;(window as any).gamePlatform = platform

  // Initialize game state
  game.registry.set('isReplay', false)

  console.log('[PlayFun] Treasure Quest initialized', {
    canvas: `${GameSettings.canvas.width}x${GameSettings.canvas.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    platform: 'play.fun',
  })

  // Setup game ready event
  game.events.once("ready", () => {
    platform.ready()

    // Initialize Play.fun SDK
    // Game ID will be set after registration — use placeholder for now
    initPlayFunSDK('PLAYFUN_GAME_ID_PLACEHOLDER')

    // Set up audio context for mobile
    const canvas = game.canvas
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

    canvas.addEventListener('click', ensureAudioContext, { passive: true })
    canvas.addEventListener('touchstart', ensureAudioContext, { passive: false })
    document.addEventListener('keydown', ensureAudioContext, { passive: true })

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) ensureAudioContext()
    })
  })
}

initializeApp().catch(error => console.error('[PlayFun] Failed to initialize:', error))
