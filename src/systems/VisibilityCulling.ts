export class VisibilityCulling {
  private scene: Phaser.Scene
  private camera: Phaser.Cameras.Scene2D.Camera
  private cullPadding: number
  private debugMode: boolean = false
  private culledObjects: Set<Phaser.GameObjects.GameObject> = new Set()
  private performanceStats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    lastUpdateTime: 0
  }
  
  constructor(scene: Phaser.Scene, cullPadding: number = 100) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.cullPadding = cullPadding
  }
  
  // Check if an object is visible within camera bounds (with padding)
  isVisible(obj: Phaser.GameObjects.Components.Transform): boolean {
    const camLeft = this.camera.scrollX - this.cullPadding
    const camRight = this.camera.scrollX + this.camera.width + this.cullPadding
    const camTop = this.camera.scrollY - this.cullPadding
    const camBottom = this.camera.scrollY + this.camera.height + this.cullPadding
    
    // Get object bounds
    const objX = obj.x
    const objY = obj.y
    
    // Simple bounds check
    return objX >= camLeft && objX <= camRight && 
           objY >= camTop && objY <= camBottom
  }
  
  // Update visibility for a group of objects
  updateGroup(group: Phaser.GameObjects.Group | Phaser.Physics.Arcade.Group): void {
    const children = group.getChildren()
    let visibleCount = 0
    let culledCount = 0
    
    children.forEach(child => {
      if (child && 'x' in child && 'y' in child) {
        const isVis = this.isVisible(child as Phaser.GameObjects.Components.Transform)
        
        if (isVis) {
          // Object is visible - enable it
          if (this.culledObjects.has(child)) {
            child.setActive(true)
            if ('body' in child && child.body) {
              (child.body as Phaser.Physics.Arcade.Body).enable = true
            }
            this.culledObjects.delete(child)
          }
          visibleCount++
        } else {
          // Object is not visible - disable it
          if (!this.culledObjects.has(child)) {
            child.setActive(false)
            if ('body' in child && child.body) {
              (child.body as Phaser.Physics.Arcade.Body).enable = false
            }
            this.culledObjects.add(child)
          }
          culledCount++
        }
      }
    })
    
    // Update stats
    this.performanceStats.visibleObjects += visibleCount
    this.performanceStats.culledObjects += culledCount
    this.performanceStats.totalObjects += children.length
  }
  
  // Update visibility for an array of objects
  updateArray<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform>(
    objects: T[]
  ): void {
    let visibleCount = 0
    let culledCount = 0
    
    objects.forEach(obj => {
      if (!obj || !obj.active) return
      
      const isVis = this.isVisible(obj)
      
      if (isVis) {
        // Object is visible
        if (!obj.visible) {
          obj.setVisible(true)
          if ('body' in obj && obj.body) {
            (obj.body as Phaser.Physics.Arcade.Body).enable = true
          }
        }
        visibleCount++
      } else {
        // Object is not visible
        if (obj.visible) {
          obj.setVisible(false)
          if ('body' in obj && obj.body) {
            (obj.body as Phaser.Physics.Arcade.Body).enable = false
          }
        }
        culledCount++
      }
    })
    
    // Update stats
    this.performanceStats.visibleObjects += visibleCount
    this.performanceStats.culledObjects += culledCount
    this.performanceStats.totalObjects += objects.length
  }
  
  // Main update method to call each frame
  update(): void {
    const startTime = performance.now()
    
    // Reset stats for this frame
    this.performanceStats.totalObjects = 0
    this.performanceStats.visibleObjects = 0
    this.performanceStats.culledObjects = 0
    
    // Update all registered groups and arrays here
    // This would be called from GameScene.update()
    
    this.performanceStats.lastUpdateTime = performance.now() - startTime
    
    if (this.debugMode && this.scene.time.now % 60 === 0) {
      this.logPerformance()
    }
  }
  
  // Set debug mode
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    if (enabled) {
      console.log('🔍 Visibility Culling Debug Mode Enabled')
    }
  }
  
  // Get performance statistics
  getStats() {
    return { ...this.performanceStats }
  }
  
  // Log performance metrics
  private logPerformance(): void {
    const percent = this.performanceStats.totalObjects > 0 
      ? Math.round((this.performanceStats.culledObjects / this.performanceStats.totalObjects) * 100)
      : 0
      
    console.log(`📊 Culling Stats: ${this.performanceStats.culledObjects}/${this.performanceStats.totalObjects} objects culled (${percent}%) | Update time: ${this.performanceStats.lastUpdateTime.toFixed(2)}ms`)
  }
  
  // Clean up
  destroy(): void {
    this.culledObjects.clear()
  }
}

// Specialized culling for large static groups (platforms, decorations)
export class StaticGroupCulling {
  private visibleObjects: Set<Phaser.GameObjects.GameObject> = new Set()
  private scene: Phaser.Scene
  private camera: Phaser.Cameras.Scene2D.Camera
  private gridSize: number
  private spatialGrid: Map<string, Phaser.GameObjects.GameObject[]> = new Map()
  
  constructor(scene: Phaser.Scene, gridSize: number = 256) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.gridSize = gridSize
  }
  
  // Register a static group for spatial indexing
  registerStaticGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    const children = group.getChildren()
    
    children.forEach(child => {
      if ('x' in child && 'y' in child) {
        const obj = child as Phaser.GameObjects.Components.Transform
        const gridKey = this.getGridKey(obj.x, obj.y)
        
        if (!this.spatialGrid.has(gridKey)) {
          this.spatialGrid.set(gridKey, [])
        }
        this.spatialGrid.get(gridKey)!.push(child)
      }
    })
  }
  
  // Get grid key for spatial indexing
  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize)
    const gridY = Math.floor(y / this.gridSize)
    return `${gridX},${gridY}`
  }
  
  // Update visible objects based on camera position
  updateVisibility(): void {
    const newVisible = new Set<Phaser.GameObjects.GameObject>()
    
    // Calculate visible grid cells
    const startX = Math.floor(this.camera.scrollX / this.gridSize) - 1
    const endX = Math.floor((this.camera.scrollX + this.camera.width) / this.gridSize) + 1
    const startY = Math.floor(this.camera.scrollY / this.gridSize) - 1
    const endY = Math.floor((this.camera.scrollY + this.camera.height) / this.gridSize) + 1
    
    // Get all objects in visible grid cells
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const gridKey = `${x},${y}`
        const objects = this.spatialGrid.get(gridKey)
        
        if (objects) {
          objects.forEach(obj => {
            newVisible.add(obj)
            if (!this.visibleObjects.has(obj)) {
              obj.setVisible(true)
            }
          })
        }
      }
    }
    
    // Hide objects that are no longer visible
    this.visibleObjects.forEach(obj => {
      if (!newVisible.has(obj)) {
        obj.setVisible(false)
      }
    })
    
    this.visibleObjects = newVisible
  }
  
  // Clean up
  destroy(): void {
    this.visibleObjects.clear()
    this.spatialGrid.clear()
  }
}