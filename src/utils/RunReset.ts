// Single source of truth for "start a brand-new run" registry state.
// Used by the Remix play_again handler (RemixUtils) and GameScene.restartGame
// (web / kids / Telegram). Previously each kept its own list and both drifted:
// play_again kept livesEarned + gameStats from the last run, and both reset
// 'isLevelProgression', a key nothing reads (the real key is 'levelProgression').
export function resetRegistryForNewRun(registry: Phaser.Data.DataManager): void {
  registry.set('isDeathRetry', false)
  registry.set('levelProgression', false)
  registry.set('showChapterSplash', false)
  registry.remove('chapterSplashLevel')

  registry.set('currentLevel', 1)
  registry.set('playerLives', 3)
  registry.set('livesEarned', 0)

  registry.set('totalCoins', 0)
  registry.set('totalGems', 0)
  registry.set('totalBlueGems', 0)
  registry.set('totalDiamonds', 0)
  registry.set('accumulatedScore', 0)
  registry.set('currentScore', 0)
  registry.set('accumulatedDiamonds', 0)

  // GameScene.init() creates a fresh gameStats object when the key is absent
  registry.remove('gameStats')

  const chapterLevels = [1, 11, 21, 31, 41, 51]
  chapterLevels.forEach(level => {
    registry.remove(`chapterSplashShown_${level}`)
  })
}
