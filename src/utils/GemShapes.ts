/**
 * Gem Shape Generator - Creates varied cut gem shapes for collectibles
 * Replaces bubble-like circles with realistic gem cuts
 */

export enum GemCut {
  ROUND = 'round',
  EMERALD = 'emerald', 
  PEAR = 'pear',
  MARQUISE = 'marquise',
  OVAL = 'oval',
  CUSHION = 'cushion',
  DIAMOND = 'diamond'
}

export interface GemStyle {
  cut: GemCut
  size: number
  color: number
  facetColor?: number
  highlightColor?: number
}

export class GemShapeGenerator {
  
  /**
   * Generate a random gem style for variety
   */
  static getRandomGemStyle(baseColor: number, size: number = 4): GemStyle {
    const cuts = Object.values(GemCut)
    const randomCut = cuts[Math.floor(Math.random() * cuts.length)]
    
    return {
      cut: randomCut,
      size: size + Math.random() * 2 - 1, // Size variation
      color: baseColor,
      facetColor: this.getFacetColor(baseColor),
      highlightColor: 0xffffff
    }
  }
  
  /**
   * Draw a cut gem shape on graphics object with drop shadow
   */
  static drawGem(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // First draw the drop shadow (offset down and right)
    const shadowOffsetX = 3
    const shadowOffsetY = 3
    
    // Draw shadow version of the gem shape
    switch (style.cut) {
      case GemCut.ROUND:
        this.drawRoundCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
      case GemCut.EMERALD:
        this.drawEmeraldCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
      case GemCut.PEAR:
        this.drawPearCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
      case GemCut.MARQUISE:
        this.drawMarquiseCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
      case GemCut.OVAL:
        this.drawOvalCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
      case GemCut.CUSHION:
        this.drawCushionCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
      case GemCut.DIAMOND:
        this.drawDiamondCutShadow(graphics, x + shadowOffsetX, y + shadowOffsetY, style)
        break
    }
    
    // Then draw the actual gem on top
    switch (style.cut) {
      case GemCut.ROUND:
        this.drawRoundCut(graphics, x, y, style)
        break
      case GemCut.EMERALD:
        this.drawEmeraldCut(graphics, x, y, style)
        break
      case GemCut.PEAR:
        this.drawPearCut(graphics, x, y, style)
        break
      case GemCut.MARQUISE:
        this.drawMarquiseCut(graphics, x, y, style)
        break
      case GemCut.OVAL:
        this.drawOvalCut(graphics, x, y, style)
        break
      case GemCut.CUSHION:
        this.drawCushionCut(graphics, x, y, style)
        break
      case GemCut.DIAMOND:
        this.drawDiamondCut(graphics, x, y, style)
        break
    }
  }
  
  private static drawRoundCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Standardized to 18x18 (radius = 9)
    const radius = 9
    
    // Main gem body
    graphics.fillStyle(style.color, 0.8)
    graphics.fillCircle(x, y, radius)
    
    // Facet lines to make it look cut, not bubble-like
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const x1 = x + Math.cos(angle) * radius * 0.3
      const y1 = y + Math.sin(angle) * radius * 0.3
      const x2 = x + Math.cos(angle) * radius * 0.9
      const y2 = y + Math.sin(angle) * radius * 0.9
      graphics.lineBetween(x1, y1, x2, y2)
    }
    
    // Highlight
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.3)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.strokeCircle(x, y, radius)
  }
  
  private static drawEmeraldCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Determine size based on usage - BlueCoin uses 22x22, regular gems would use 18x18
    const isBlueGem = style.size >= 10 // BlueCoin uses size 10, regular gems use size 8
    const width = isBlueGem ? 11 : 9   // 22x22 or 18x18
    const height = isBlueGem ? 11 : 9
    
    // Emerald cut - vertical rectangular with cut corners
    const points = [
      [-width * 0.6, -height],      // Top left
      [width * 0.6, -height],       // Top right  
      [width, -height * 0.7],       // Top right cut
      [width, height * 0.7],        // Bottom right cut
      [width * 0.6, height],        // Bottom right
      [-width * 0.6, height],       // Bottom left
      [-width, height * 0.7],       // Bottom left cut
      [-width, -height * 0.7]       // Top left cut
    ]
    
    // Main gem body
    graphics.fillStyle(style.color, 0.8)
    graphics.beginPath()
    graphics.moveTo(x + points[0][0], y + points[0][1])
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i][0], y + points[i][1])
    }
    graphics.closePath()
    graphics.fillPath()
    
    // Step cut facet lines
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    // Horizontal facet lines
    for (let i = 1; i <= 3; i++) {
      const yLine = -height * 0.7 + (i * height * 1.4 / 4)
      graphics.lineBetween(x - width * 0.4, y + yLine, x + width * 0.4, y + yLine)
    }
    // Vertical facet lines
    for (let i = 1; i <= 2; i++) {
      const xLine = -width * 0.3 + (i * width * 0.6 / 3)
      graphics.lineBetween(x + xLine, y - height * 0.6, x + xLine, y + height * 0.6)
    }
    
    // Highlight
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillRect(x - width * 0.3, y - height * 0.5, width * 0.25, height * 0.3)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.beginPath()
    graphics.moveTo(x + points[0][0], y + points[0][1])
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i][0], y + points[i][1])
    }
    graphics.closePath()
    graphics.strokePath()
  }
  
  private static drawPearCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Standardized to 18x18 - vertical pear/teardrop shape
    const width = 9
    const height = 9
    
    // Pear cut - vertical teardrop shape
    graphics.fillStyle(style.color, 0.8)
    graphics.beginPath()
    graphics.moveTo(x, y - height)                    // Top point
    graphics.lineTo(x + width * 0.5, y - height * 0.3)  // Upper right
    graphics.lineTo(x + width * 0.7, y + height * 0.3)  // Lower right
    graphics.lineTo(x, y + height)                    // Bottom point
    graphics.lineTo(x - width * 0.7, y + height * 0.3)  // Lower left
    graphics.lineTo(x - width * 0.5, y - height * 0.3)  // Upper left
    graphics.lineTo(x, y - height)                    // Back to top
    graphics.closePath()
    graphics.fillPath()
    
    // Facet lines
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    // Vertical center line
    graphics.lineBetween(x, y - height * 0.7, x, y + height * 0.7)
    // Horizontal lines
    graphics.lineBetween(x - width * 0.3, y - height * 0.2, x + width * 0.3, y - height * 0.2)
    graphics.lineBetween(x - width * 0.4, y + height * 0.2, x + width * 0.4, y + height * 0.2)
    // Diagonal lines
    graphics.lineBetween(x - width * 0.2, y - height * 0.5, x + width * 0.2, y + height * 0.5)
    graphics.lineBetween(x + width * 0.2, y - height * 0.5, x - width * 0.2, y + height * 0.5)
    
    // Highlight
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillEllipse(x - width * 0.2, y - height * 0.4, width * 0.3, height * 0.2)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.beginPath()
    graphics.moveTo(x, y - height)
    graphics.lineTo(x + width * 0.5, y - height * 0.3)
    graphics.lineTo(x + width * 0.7, y + height * 0.3)
    graphics.lineTo(x, y + height)
    graphics.lineTo(x - width * 0.7, y + height * 0.3)
    graphics.lineTo(x - width * 0.5, y - height * 0.3)
    graphics.lineTo(x, y - height)
    graphics.strokePath()
  }
  
  private static drawMarquiseCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Standardized to 18x18 - vertical marquise/eye shape
    const width = 9
    const height = 9
    
    // Marquise cut - vertical football/eye shape
    graphics.fillStyle(style.color, 0.8)
    graphics.beginPath()
    graphics.moveTo(x, y - height)                    // Top point
    graphics.lineTo(x + width * 0.6, y)              // Right middle
    graphics.lineTo(x, y + height)                    // Bottom point
    graphics.lineTo(x - width * 0.6, y)              // Left middle
    graphics.lineTo(x, y - height)                    // Back to top
    graphics.closePath()
    graphics.fillPath()
    
    // Facet lines
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    // Vertical center line
    graphics.lineBetween(x, y - height * 0.7, x, y + height * 0.7)
    // Horizontal center line
    graphics.lineBetween(x - width * 0.4, y, x + width * 0.4, y)
    
    // Diagonal facets
    graphics.lineBetween(x - width * 0.3, y - height * 0.5, x + width * 0.3, y + height * 0.5)
    graphics.lineBetween(x + width * 0.3, y - height * 0.5, x - width * 0.3, y + height * 0.5)
    
    // Highlight
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillEllipse(x - width * 0.2, y - height * 0.3, width * 0.3, height * 0.2)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.beginPath()
    graphics.moveTo(x, y - height)
    graphics.lineTo(x + width * 0.6, y)
    graphics.lineTo(x, y + height)
    graphics.lineTo(x - width * 0.6, y)
    graphics.lineTo(x, y - height)
    graphics.strokePath()
  }
  
  private static drawOvalCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Standardized to 18x18 - vertical oval
    const width = 9
    const height = 9
    
    // Oval cut - vertical ellipse
    graphics.fillStyle(style.color, 0.8)
    graphics.fillEllipse(x, y, width * 1.6, height * 2.0) // Vertical orientation
    
    // Facet lines
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const x1 = x + Math.cos(angle) * width * 0.4
      const y1 = y + Math.sin(angle) * height * 0.6
      const x2 = x + Math.cos(angle) * width * 0.7
      const y2 = y + Math.sin(angle) * height * 0.9
      graphics.lineBetween(x1, y1, x2, y2)
    }
    
    // Highlight
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillEllipse(x - width * 0.2, y - height * 0.4, width * 0.3, height * 0.3)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.strokeEllipse(x, y, width * 1.6, height * 2.0)
  }
  
  private static drawCushionCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Standardized to 18x18 - rounded square
    const size = 9
    const radius = size * 0.3
    
    graphics.fillStyle(style.color, 0.8)
    graphics.fillRoundedRect(x - size, y - size, size * 2, size * 2, radius)
    
    // Facet lines
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    // Cross pattern
    graphics.lineBetween(x - size * 0.6, y, x + size * 0.6, y)
    graphics.lineBetween(x, y - size * 0.6, x, y + size * 0.6)
    // Diagonal lines
    graphics.lineBetween(x - size * 0.4, y - size * 0.4, x + size * 0.4, y + size * 0.4)
    graphics.lineBetween(x - size * 0.4, y + size * 0.4, x + size * 0.4, y - size * 0.4)
    
    // Highlight
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillRoundedRect(x - size * 0.4, y - size * 0.4, size * 0.3, size * 0.3, radius * 0.5)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.strokeRoundedRect(x - size, y - size, size * 2, size * 2, radius)
  }
  
  private static drawDiamondCut(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    // Standardized to 24x24 - classic diamond emoji shape
    const size = 12 // Half of 24x24
    
    // Classic diamond shape - vertical orientation
    graphics.fillStyle(style.color, 0.8)
    graphics.beginPath()
    graphics.moveTo(x, y - size)                      // Top point
    graphics.lineTo(x + size * 0.5, y - size * 0.3)  // Upper right
    graphics.lineTo(x + size * 0.3, y + size)        // Lower right
    graphics.lineTo(x, y + size * 0.6)               // Bottom center
    graphics.lineTo(x - size * 0.3, y + size)        // Lower left
    graphics.lineTo(x - size * 0.5, y - size * 0.3)  // Upper left
    graphics.lineTo(x, y - size)                      // Back to top
    graphics.closePath()
    graphics.fillPath()
    
    // Diamond facet lines
    graphics.lineStyle(0.5, style.facetColor!, 0.6)
    // Table (top flat surface)
    graphics.lineBetween(x - size * 0.3, y - size * 0.3, x + size * 0.3, y - size * 0.3)
    // Crown facets
    graphics.lineBetween(x, y - size, x, y - size * 0.3)
    graphics.lineBetween(x - size * 0.25, y - size * 0.3, x - size * 0.5, y - size * 0.3)
    graphics.lineBetween(x + size * 0.25, y - size * 0.3, x + size * 0.5, y - size * 0.3)
    // Girdle line
    graphics.lineBetween(x - size * 0.5, y - size * 0.3, x + size * 0.5, y - size * 0.3)
    // Pavilion facets
    graphics.lineBetween(x, y - size * 0.3, x, y + size * 0.6)
    graphics.lineBetween(x - size * 0.2, y - size * 0.1, x - size * 0.3, y + size)
    graphics.lineBetween(x + size * 0.2, y - size * 0.1, x + size * 0.3, y + size)
    
    // Highlight on table
    graphics.fillStyle(style.highlightColor!, 0.7)
    graphics.fillRect(x - size * 0.15, y - size * 0.4, size * 0.3, size * 0.15)
    
    // Outline
    graphics.lineStyle(1, 0xffffff, 0.8)
    graphics.beginPath()
    graphics.moveTo(x, y - size)
    graphics.lineTo(x + size * 0.5, y - size * 0.3)
    graphics.lineTo(x + size * 0.3, y + size)
    graphics.lineTo(x, y + size * 0.6)
    graphics.lineTo(x - size * 0.3, y + size)
    graphics.lineTo(x - size * 0.5, y - size * 0.3)
    graphics.lineTo(x, y - size)
    graphics.strokePath()
  }
  
  static getFacetColor(baseColor: number): number {
    // Create a slightly lighter version of the base color for facet lines
    const r = (baseColor >> 16) & 0xFF
    const g = (baseColor >> 8) & 0xFF
    const b = baseColor & 0xFF
    
    // Lighten by 40
    const newR = Math.min(255, r + 40)
    const newG = Math.min(255, g + 40)
    const newB = Math.min(255, b + 40)
    
    return (newR << 16) | (newG << 8) | newB
  }
  
  // Shadow drawing functions - simplified versions without details
  private static drawRoundCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const radius = 9
    graphics.fillStyle(0x000000, 0.3) // Black shadow with 30% opacity
    graphics.fillCircle(x, y, radius)
  }
  
  private static drawEmeraldCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const isBlueGem = style.size >= 10
    const width = isBlueGem ? 11 : 9
    const height = isBlueGem ? 11 : 9
    
    const points = [
      [-width * 0.6, -height], [width * 0.6, -height], [width, -height * 0.7],
      [width, height * 0.7], [width * 0.6, height], [-width * 0.6, height],
      [-width, height * 0.7], [-width, -height * 0.7]
    ]
    
    graphics.fillStyle(0x000000, 0.3)
    graphics.beginPath()
    graphics.moveTo(x + points[0][0], y + points[0][1])
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(x + points[i][0], y + points[i][1])
    }
    graphics.closePath()
    graphics.fillPath()
  }
  
  private static drawPearCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const width = 9
    const height = 9
    
    graphics.fillStyle(0x000000, 0.3)
    graphics.beginPath()
    graphics.moveTo(x, y - height)
    graphics.lineTo(x + width * 0.5, y - height * 0.3)
    graphics.lineTo(x + width * 0.7, y + height * 0.3)
    graphics.lineTo(x, y + height)
    graphics.lineTo(x - width * 0.7, y + height * 0.3)
    graphics.lineTo(x - width * 0.5, y - height * 0.3)
    graphics.closePath()
    graphics.fillPath()
  }
  
  private static drawMarquiseCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const width = 9
    const height = 9
    
    graphics.fillStyle(0x000000, 0.3)
    graphics.beginPath()
    graphics.moveTo(x, y - height)
    graphics.lineTo(x + width * 0.6, y)
    graphics.lineTo(x, y + height)
    graphics.lineTo(x - width * 0.6, y)
    graphics.closePath()
    graphics.fillPath()
  }
  
  private static drawOvalCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const width = 9
    const height = 9
    
    graphics.fillStyle(0x000000, 0.3)
    graphics.fillEllipse(x, y, width * 1.6, height * 2.0)
  }
  
  private static drawCushionCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const size = 9
    const radius = size * 0.3
    
    graphics.fillStyle(0x000000, 0.3)
    graphics.fillRoundedRect(x - size, y - size, size * 2, size * 2, radius)
  }
  
  private static drawDiamondCutShadow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, style: GemStyle): void {
    const size = 12
    
    graphics.fillStyle(0x000000, 0.3)
    graphics.beginPath()
    graphics.moveTo(x, y - size)
    graphics.lineTo(x + size * 0.5, y - size * 0.3)
    graphics.lineTo(x + size * 0.3, y + size)
    graphics.lineTo(x, y + size * 0.6)
    graphics.lineTo(x - size * 0.3, y + size)
    graphics.lineTo(x - size * 0.5, y - size * 0.3)
    graphics.closePath()
    graphics.fillPath()
  }
}