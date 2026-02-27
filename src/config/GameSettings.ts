/**
 * Game Settings for Bizarre Underground
 * Centralized configuration for all tunable game parameters
 */

export const GameSettings = {
  debug: false,  // Debug mode disabled for production

  canvas: {
    width: 480,  // Portrait mode - 2:3 aspect ratio for Remix Native App
    height: 720, // Exact 2:3 ratio (480:720 = 2:3)
  },

  game: {
    tileSize: 32,
    floorHeight: 12, // tiles per floor (visible area)
    floorWidth: 24,  // tiles wide - much wider for more interesting levels
    gravity: 800,
    playerSpeed: 160,
    climbSpeed: 120,
    jumpVelocity: -350,
  },

  scoring: {
    enemyDefeat: 100,
    coinCollect: 50,
    floorBonus: 500,
  },
}

export default GameSettings
