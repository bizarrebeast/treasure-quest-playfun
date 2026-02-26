/**
 * Game Settings for Treasure Quest - Play.fun Version
 * 720x720 square format (tile-based game requires fixed resolution)
 * Phaser.Scale.FIT handles scaling to viewport
 */

export const GameSettings = {
  buildType: 'playfun',
  debug: false,

  canvas: {
    width: 720,
    height: 720,
  },

  game: {
    tileSize: 32,
    floorHeight: 8,
    floorWidth: 22,
    floorSpacing: 140,
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

  hud: {
    topBarHeight: 80,
    bottomBarHeight: 80,
    gameAreaHeight: 560,
  },

  touchControls: {
    dpadPosition: { x: 100, y: 640 },
    dpadSize: 60,
    jumpPosition: { x: 620, y: 640 },
    jumpSize: 60,
  },

  platform: {
    isDgen1: false,
    isPlayFun: true,
    hasLocalStorage: true,
    hasWallet: false,
    autoSave: false,
    saveInterval: 30000,
  }
}

export default GameSettings
