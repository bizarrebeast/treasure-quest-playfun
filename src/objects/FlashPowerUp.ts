export class FlashPowerUp {
  public sprite: Phaser.GameObjects.Rectangle
  public flashGraphics: Phaser.GameObjects.Graphics
  private scene: Phaser.Scene
  private lightningBolts: Phaser.GameObjects.Graphics[] = []
  private aura: Phaser.GameObjects.Arc | null = null
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    
    // Create invisible rectangle for physics
    this.sprite = scene.add.rectangle(x, y, 24, 24, 0x000000, 0)
    this.sprite.setDepth(13)
    
    // Add physics to the invisible sprite
    scene.physics.add.existing(this.sprite, true) // Static body
    
    // Create visible flash graphics
    this.flashGraphics = scene.add.graphics()
    this.createFlashShape(x, y)
    this.flashGraphics.setDepth(13)
    
    // Add dramatic pulsing animation to graphics
    scene.tweens.add({
      targets: this.flashGraphics,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Power2.easeInOut'
    })
    
    // Add floating motion to both sprites
    scene.tweens.add({
      targets: [this.sprite, this.flashGraphics],
      y: y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Create lightning bolt effects
    this.createLightningEffects(x, y)
  }
  
  private createFlashShape(x: number, y: number): void {
    this.flashGraphics.clear()
    this.flashGraphics.setPosition(x, y)
    
    // Draw lightning bolt shape
    this.flashGraphics.fillStyle(0xffff00, 1) // Bright yellow
    
    // Lightning bolt path
    const points = [
      [0, -12],   // Top
      [-4, -4],   // Upper left bend
      [0, -4],    // Center left
      [-6, 4],    // Lower left
      [0, 4],     // Center right
      [4, -4],    // Upper right bend
      [0, -4],    // Center
      [6, 12]     // Bottom point
    ]
    
    this.flashGraphics.beginPath()
    points.forEach((point, index) => {
      if (index === 0) {
        this.flashGraphics.moveTo(point[0], point[1])
      } else {
        this.flashGraphics.lineTo(point[0], point[1])
      }
    })
    this.flashGraphics.closePath()
    this.flashGraphics.fillPath()
    
    // Add white core
    this.flashGraphics.fillStyle(0xffffff, 1)
    this.flashGraphics.beginPath()
    points.forEach((point, index) => {
      const innerPoint = [point[0] * 0.6, point[1] * 0.6]
      if (index === 0) {
        this.flashGraphics.moveTo(innerPoint[0], innerPoint[1])
      } else {
        this.flashGraphics.lineTo(innerPoint[0], innerPoint[1])
      }
    })
    this.flashGraphics.closePath()
    this.flashGraphics.fillPath()
    
    // Add electric outline
    this.flashGraphics.lineStyle(2, 0x00ffff, 1)
    this.flashGraphics.beginPath()
    points.forEach((point, index) => {
      if (index === 0) {
        this.flashGraphics.moveTo(point[0], point[1])
      } else {
        this.flashGraphics.lineTo(point[0], point[1])
      }
    })
    this.flashGraphics.closePath()
    this.flashGraphics.strokePath()
  }
  
  private createLightningEffects(x: number, y: number): void {
    // Create small lightning bolts around the main power-up
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 / 4) * i
      const distance = 30
      const boltX = x + Math.cos(angle) * distance
      const boltY = y + Math.sin(angle) * distance
      
      const bolt = this.scene.add.graphics()
      bolt.setPosition(boltX, boltY)
      bolt.setDepth(12)
      
      // Draw small lightning bolt
      bolt.lineStyle(2, 0x00ffff, 0.8)
      bolt.beginPath()
      bolt.moveTo(-3, -3)
      bolt.lineTo(0, 0)
      bolt.lineTo(3, 3)
      bolt.strokePath()
      
      this.lightningBolts.push(bolt)
      
      // Animate with random flicker
      this.scene.tweens.add({
        targets: bolt,
        alpha: 0,
        duration: 200,
        delay: Math.random() * 1000,
        repeat: -1,
        yoyo: true,
        ease: 'Power2.easeInOut'
      })
      
      // Random rotation
      this.scene.tweens.add({
        targets: bolt,
        rotation: Math.PI * 2,
        duration: 2000 + Math.random() * 1000,
        repeat: -1,
        ease: 'Linear'
      })
    }
    
    // Create electric aura
    this.aura = this.scene.add.circle(x, y, 35, 0x00ffff)
    this.aura.setAlpha(0.1)
    this.aura.setDepth(11)
    
    this.scene.tweens.add({
      targets: this.aura,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
  
  collect(): void {
    // Simple collection - just fade out and destroy
    this.scene.tweens.add({
      targets: [this.sprite, this.flashGraphics],
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.sprite.destroy()
        this.flashGraphics.destroy()
      }
    })
    
    // Clean up any lightning bolts
    this.lightningBolts.forEach(bolt => bolt.destroy())
    
    // Clean up aura if it exists
    if (this.aura) {
      this.aura.destroy()
    }
  }
  
  destroy(): void {
    this.sprite.destroy()
    this.flashGraphics.destroy()
    this.lightningBolts.forEach(bolt => bolt.destroy())
    if (this.aura) {
      this.aura.destroy()
    }
  }
}