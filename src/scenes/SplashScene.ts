import GameSettings from "../config/GameSettings"

export class SplashScene extends Phaser.Scene {
  private titleImage!: Phaser.GameObjects.Image
  private transitionComplete: boolean = false

  constructor() {
    super({ key: 'SplashScene' })
  }

  preload(): void {
    // Load title background image
    this.load.image('titleBackground', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/TREASURE%20QUEST%20Bizarre%20Beasts%20BIZarcade%20splash%20page-ydgNu2S0haL0dzmlz4oZLjqZMXaiQo.png?j2A1')
    
    // Load splash page sound
    this.load.audio('splash-sound', 'https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d281be5d-2111-4a73-afb0-19b2a18c80a9/splash%20page%20sfx-2Un9YwdWUGtqQ3ynYGocaBKgQmQTmD.wav?X7j7')
    
    // Add error handler for CORS issues
    this.load.on('loaderror', (file: any) => {
      console.error('❌ Failed to load:', file.key, '- CORS or network issue')
      if (file.key === 'splash-sound') {
        this.registry.set('audioLoadFailed', true)
      }
    })
    
    console.log('🎮 SplashScene: Loading title background and sound')
  }

  create(): void {
    // Check if this is a replay - if so, skip directly to GameScene
    if (this.game.registry.get('isReplay')) {
      this.scene.start('GameScene')
      return
    }
    
    // Set up audio unlock on first user interaction (critical for mobile)
    this.setupAudioUnlock()
    
    // Play splash page sound if sound effects are enabled (SDK mute is handled by Phaser internally)
    const sfxEnabled = this.registry.get('sfxEnabled') !== false
    if (sfxEnabled) {
      // Try to play sound - it might not work until user interaction on mobile
      try {
        this.sound.play('splash-sound', { volume: 0.5 })
      } catch (e) {
        console.log('🔇 Splash sound blocked - will play after user interaction')
      }
    }
    
    // Create title background image
    this.setupTitleBackground()
    
    // Start 2-second timer for automatic transition
    this.startTimer()
  }

  private setupAudioUnlock(): void {
    let audioAttempted = false
    
    const unlockAudio = () => {
      if (audioAttempted) return
      audioAttempted = true
      
      console.log('🔊 Attempting to unlock audio context...')
      
      // Check audio context state
      if (this.sound.context) {
        console.log('🔊 Audio context state:', this.sound.context.state)
        
        if (this.sound.context.state === 'suspended') {
          this.sound.context.resume().then(() => {
            console.log('✅ Audio context successfully resumed!')
            
            // Create and play an empty buffer to unlock iOS audio
            const audioContext = this.sound.context
            const buffer = audioContext.createBuffer(1, 1, 22050)
            const source = audioContext.createBufferSource()
            source.buffer = buffer
            source.connect(audioContext.destination)
            source.start(0)
            console.log('✅ Played empty buffer to unlock iOS audio')
            
            // Also try playing a very quiet sound through Phaser
            try {
              const silentSound = this.sound.add('splash-sound', { volume: 0.001 })
              silentSound.play()
              silentSound.once('complete', () => {
                silentSound.destroy()
                console.log('✅ Audio fully unlocked with silent sound')
              })
            } catch (e) {
              console.log('⚠️ Could not play silent sound:', e)
            }
            
            // Try to play the splash sound again if it hasn't played
            const sfxEnabled = this.registry.get('sfxEnabled') !== false
            if (sfxEnabled && !this.registry.get('splashSoundPlayed')) {
              setTimeout(() => {
                try {
                  this.sound.play('splash-sound', { volume: 0.5 })
                  this.registry.set('splashSoundPlayed', true)
                  console.log('✅ Splash sound played after unlock')
                } catch (e) {
                  console.log('⚠️ Could not play splash sound:', e)
                }
              }, 100)
            }
          }).catch(e => {
            console.error('❌ Failed to resume audio context:', e)
          })
        } else if (this.sound.context.state === 'running') {
          console.log('✅ Audio context already running')
          
          // Still play empty buffer to ensure iOS compatibility
          try {
            const audioContext = this.sound.context
            const buffer = audioContext.createBuffer(1, 1, 22050)
            const source = audioContext.createBufferSource()
            source.buffer = buffer
            source.connect(audioContext.destination)
            source.start(0)
            console.log('✅ Played empty buffer for iOS compatibility')
          } catch (e) {
            console.log('⚠️ Could not play empty buffer:', e)
          }
        }
      }
    }
    
    // Add multiple input listeners to catch any user interaction
    this.input.on('pointerdown', unlockAudio)
    this.input.on('pointerup', unlockAudio)
    
    // Add invisible button covering the entire screen for mobile
    const unlockZone = this.add.zone(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height / 2,
      GameSettings.canvas.width,
      GameSettings.canvas.height
    )
    unlockZone.setInteractive()
    unlockZone.on('pointerdown', unlockAudio)
    unlockZone.on('pointerup', unlockAudio)
    
    // Also add raw DOM listeners as fallback
    const canvas = this.sys.canvas
    const touchHandler = (e: Event) => {
      unlockAudio()
      // Remove listeners after successful unlock
      canvas.removeEventListener('touchstart', touchHandler)
      canvas.removeEventListener('touchend', touchHandler)
      canvas.removeEventListener('mousedown', touchHandler)
    }
    
    canvas.addEventListener('touchstart', touchHandler, { passive: true })
    canvas.addEventListener('touchend', touchHandler, { passive: true })
    canvas.addEventListener('mousedown', touchHandler, { passive: true })
    
    // Also add touch-specific listeners for mobile
    if (this.sys.game.device.input.touch) {
      this.input.addPointer(2) // Support multi-touch
    }
  }

  private setupTitleBackground(): void {
    const screenWidth = GameSettings.canvas.width
    const screenHeight = GameSettings.canvas.height
    
    // Create and position title image as background
    this.titleImage = this.add.image(screenWidth / 2, screenHeight / 2, 'titleBackground')
    this.titleImage.setDepth(0) // Background layer
    
    // Scale image to fill screen while maintaining aspect ratio
    const scaleX = screenWidth / this.titleImage.width
    const scaleY = screenHeight / this.titleImage.height
    const scale = Math.max(scaleX, scaleY) // Use larger scale to fill screen
    
    this.titleImage.setScale(scale)
    
    console.log('🎮 SplashScene: Title background positioned and scaled')
  }

  private startTimer(): void {
    console.log('🎮 SplashScene: Starting 2-second timer')
    
    // Automatically transition to game after 2 seconds
    this.time.delayedCall(2000, () => {
      this.transitionToGame()
    })
  }

  private transitionToGame(): void {
    if (this.transitionComplete) return
    
    this.transitionComplete = true
    console.log('🎮 SplashScene: Auto-transitioning to instructions after 2 seconds')

    // Quick fade out (0.3s) then transition to instructions
    this.cameras.main.fadeOut(300, 0, 0, 0)
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('InstructionsScene')
    })
  }

  update(): void {
    // No updates needed for static splash screen
  }
}