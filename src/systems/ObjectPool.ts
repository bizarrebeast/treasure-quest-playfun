export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private pool: T[] = []
  private activeObjects: Set<T> = new Set()
  private createFunction: () => T
  private resetFunction: (obj: T) => void
  private maxSize: number
  
  constructor(
    createFunction: () => T,
    resetFunction: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFunction = createFunction
    this.resetFunction = resetFunction
    this.maxSize = maxSize
    
    // Pre-populate the pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.createFunction()
      obj.setActive(false).setVisible(false)
      this.pool.push(obj)
    }
  }
  
  get(): T {
    let obj: T
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!
      this.resetFunction(obj)
    } else if (this.activeObjects.size < this.maxSize) {
      obj = this.createFunction()
    } else {
      // Pool is exhausted and at max size - reuse the oldest active object
      const oldest = this.activeObjects.values().next().value
      this.release(oldest)
      obj = this.pool.pop()!
      this.resetFunction(obj)
    }
    
    this.activeObjects.add(obj)
    obj.setActive(true).setVisible(true)
    return obj
  }
  
  release(obj: T): void {
    if (!this.activeObjects.has(obj)) return
    
    this.activeObjects.delete(obj)
    obj.setActive(false).setVisible(false)
    this.resetFunction(obj)
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj)
    } else {
      // Pool is full, destroy the object
      obj.destroy()
    }
  }
  
  releaseAll(): void {
    this.activeObjects.forEach(obj => {
      obj.setActive(false).setVisible(false)
      this.resetFunction(obj)
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj)
      } else {
        obj.destroy()
      }
    })
    this.activeObjects.clear()
  }
  
  getActiveCount(): number {
    return this.activeObjects.size
  }
  
  getPooledCount(): number {
    return this.pool.length
  }
  
  getTotalCount(): number {
    return this.activeObjects.size + this.pool.length
  }
  
  destroy(): void {
    this.releaseAll()
    this.pool.forEach(obj => obj.destroy())
    this.pool = []
  }
}

// Specific pool for coins/collectibles with particle effects
export class CollectiblePool extends ObjectPool<Phaser.GameObjects.Image> {
  private scene: Phaser.Scene
  private particleEmitters: Map<Phaser.GameObjects.Image, Phaser.GameObjects.Particles.ParticleEmitter> = new Map()
  
  constructor(
    scene: Phaser.Scene,
    texture: string,
    initialSize: number = 20,
    maxSize: number = 50
  ) {
    super(
      () => this.createCollectible(texture),
      (obj) => this.resetCollectible(obj),
      initialSize,
      maxSize
    )
    this.scene = scene
  }
  
  private createCollectible(texture: string): Phaser.GameObjects.Image {
    const collectible = this.scene.add.image(0, 0, texture)
    collectible.setScale(0.4)
    
    // Add physics body
    this.scene.physics.add.existing(collectible)
    const body = collectible.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(20, 20)
    
    return collectible
  }
  
  private resetCollectible(obj: Phaser.GameObjects.Image): void {
    obj.setPosition(-1000, -1000) // Move off-screen
    obj.setAlpha(1)
    obj.setScale(0.4)
    obj.setRotation(0)
    
    // Reset physics body
    const body = obj.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.setAllowGravity(false)
    
    // Clean up particle emitter if exists
    const emitter = this.particleEmitters.get(obj)
    if (emitter) {
      emitter.stop()
      emitter.remove()
      this.particleEmitters.delete(obj)
    }
  }
  
  getWithPosition(x: number, y: number): Phaser.GameObjects.Image {
    const obj = this.get()
    obj.setPosition(x, y)
    
    // Add floating animation
    this.scene.tweens.add({
      targets: obj,
      y: y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Add rotation animation
    this.scene.tweens.add({
      targets: obj,
      rotation: Math.PI * 2,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    })
    
    return obj
  }
  
  releaseWithEffect(obj: Phaser.GameObjects.Image, particleTexture?: string): void {
    // Stop any active tweens
    this.scene.tweens.killTweensOf(obj)
    
    // Create collection particle effect
    if (particleTexture) {
      const emitter = this.scene.add.particles(obj.x, obj.y, particleTexture, {
        speed: { min: 50, max: 150 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 500
      })
      
      // Auto-remove emitter after effect
      this.scene.time.delayedCall(600, () => {
        emitter.destroy()
      })
    }
    
    // Fade and scale out effect
    this.scene.tweens.add({
      targets: obj,
      alpha: 0,
      scale: 0.6,
      y: obj.y - 20,
      duration: 300,
      onComplete: () => {
        this.release(obj)
      }
    })
  }
  
  destroy(): void {
    // Clean up all particle emitters
    this.particleEmitters.forEach(emitter => {
      emitter.stop()
      emitter.remove()
    })
    this.particleEmitters.clear()
    
    super.destroy()
  }
}