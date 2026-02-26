/**
 * Enemy Spawning System for Bizarre Underground
 * Handles weighted enemy spawning based on difficulty scoring
 */

export enum EnemyType {
  BASEBLU = 'baseblu',         // Blue blocker - very slow, immovable obstacle
  BEETLE = 'beetle',           // Red beetle - simple patrol
  CATERPILLAR = 'caterpillar', // Yellow cat - slow random movement
  BLUE_CATERPILLAR = 'blue_caterpillar', // Blue caterpillar variant - slightly faster
  CHOMPER = 'chomper',         // Blue cat - standard patrol
  SNAIL = 'snail',            // Red cat - faster patrol  
  JUMPER = 'jumper',          // Green cat - bouncing movement
  STALKER = 'stalker',        // Red cat - mine-like activation + chase
  REX = 'rex'                 // Flipping enemy - patrol with jumps
}

export interface EnemyDefinition {
  type: EnemyType
  color: string
  difficultyScore: number
  speed: number
  pointValue: number  // Points awarded for defeating this enemy
  description: string
}

export interface SpawnWeights {
  [key: string]: number // EnemyType -> weight percentage
}

export class EnemySpawningSystem {
  private static readonly ENEMY_DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
    [EnemyType.BASEBLU]: {
      type: EnemyType.BASEBLU,
      color: 'blue',
      difficultyScore: 2.0,
      speed: 0.25,
      pointValue: 1000,  // High value when killed by invincible player
      description: 'Immovable blocker, can only be killed when invincible'
    },
    [EnemyType.BEETLE]: {
      type: EnemyType.BEETLE,
      color: 'red',
      difficultyScore: 0.8,
      speed: 1.0,
      pointValue: 75,
      description: 'Simple patrol beetle'
    },
    [EnemyType.CATERPILLAR]: {
      type: EnemyType.CATERPILLAR,
      color: 'yellow',
      difficultyScore: 0.5,
      speed: 0.6,
      pointValue: 50,
      description: 'Slow random movement'
    },
    [EnemyType.BLUE_CATERPILLAR]: {
      type: EnemyType.BLUE_CATERPILLAR,
      color: 'blue_caterpillar',
      difficultyScore: 0.7,
      speed: 0.7,
      pointValue: 50,  // Same points as yellow caterpillar
      description: 'Slightly faster caterpillar variant'
    },
    [EnemyType.CHOMPER]: {
      type: EnemyType.CHOMPER,
      color: 'blue', 
      difficultyScore: 1.0,
      speed: 1.0,
      pointValue: 100,
      description: 'Standard patrol with bite animations'
    },
    [EnemyType.SNAIL]: {
      type: EnemyType.SNAIL,
      color: 'red',
      difficultyScore: 1.5,
      speed: 1.2,
      pointValue: 150,
      description: 'Faster patrol enemy'
    },
    [EnemyType.JUMPER]: {
      type: EnemyType.JUMPER,
      color: 'green',
      difficultyScore: 2.5,
      speed: 1.5,
      pointValue: 200,
      description: 'Fast bouncing movement'
    },
    [EnemyType.STALKER]: {
      type: EnemyType.STALKER,
      color: 'red',
      difficultyScore: 4.0,
      speed: 1.5,
      pointValue: 300,
      description: 'Hidden activation + chase AI'
    },
    [EnemyType.REX]: {
      type: EnemyType.REX,
      color: 'rex',
      difficultyScore: 1.2,
      speed: 0.75,
      pointValue: 500,
      description: 'Flipping enemy with periodic jumps'
    }
  }

  private static readonly LEVEL_SPAWN_WEIGHTS: Record<string, SpawnWeights> = {
    // Levels 1-4: Learning Phase
    'tutorial_early': {
      [EnemyType.CATERPILLAR]: 0.40,  // 40% - Yellow Cat
      [EnemyType.BEETLE]: 0.40,       // 40% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.20, // 20% - Blue Caterpillar
      [EnemyType.BASEBLU]: 0.00,
      [EnemyType.CHOMPER]: 0.00,
      [EnemyType.SNAIL]: 0.00,
      [EnemyType.JUMPER]: 0.00,
      [EnemyType.STALKER]: 0.00,
      [EnemyType.REX]: 0.00
    },
    // Levels 5-7: Patrol Patterns
    'patrol': {
      [EnemyType.CATERPILLAR]: 0.30,  // 30% - Yellow Cat
      [EnemyType.BEETLE]: 0.25,       // 25% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.20, // 20% - Blue Caterpillar
      [EnemyType.CHOMPER]: 0.25,      // 25% - Chomper introduced
      [EnemyType.BASEBLU]: 0.00,
      [EnemyType.SNAIL]: 0.00,
      [EnemyType.JUMPER]: 0.00,
      [EnemyType.STALKER]: 0.00,
      [EnemyType.REX]: 0.00
    },
    // Levels 8-11: Speed Challenge
    'speed_intro': {
      [EnemyType.CATERPILLAR]: 0.20,  // 20% - Yellow Cat
      [EnemyType.BEETLE]: 0.20,       // 20% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.15, // 15% - Blue Caterpillar
      [EnemyType.CHOMPER]: 0.30,      // 30% - Chomper
      [EnemyType.SNAIL]: 0.15,        // 15% - Snail introduced
      [EnemyType.BASEBLU]: 0.00,
      [EnemyType.JUMPER]: 0.00,
      [EnemyType.STALKER]: 0.00,
      [EnemyType.REX]: 0.00
    },
    // Levels 12-14: High Value Target (Rex introduced)
    'rex_intro': {
      [EnemyType.CATERPILLAR]: 0.15,  // 15% - Yellow Cat
      [EnemyType.BEETLE]: 0.15,       // 15% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.10, // 10% - Blue Caterpillar
      [EnemyType.CHOMPER]: 0.25,      // 25% - Chomper
      [EnemyType.SNAIL]: 0.20,        // 20% - Snail
      [EnemyType.REX]: 0.15,          // 15% - Rex appears as 500-point reward
      [EnemyType.BASEBLU]: 0.00,
      [EnemyType.JUMPER]: 0.00,
      [EnemyType.STALKER]: 0.00
    },
    // Levels 15-19: Obstacles
    'obstacles': {
      [EnemyType.CATERPILLAR]: 0.10,  // 10% - Yellow Cat
      [EnemyType.BEETLE]: 0.10,       // 10% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.10, // 10% - Blue Caterpillar
      [EnemyType.REX]: 0.15,          // 15% - Rex
      [EnemyType.CHOMPER]: 0.20,      // 20% - Chomper
      [EnemyType.SNAIL]: 0.20,        // 20% - Snail
      [EnemyType.BASEBLU]: 0.15,      // 15% - BaseBlu adds strategy
      [EnemyType.JUMPER]: 0.00,
      [EnemyType.STALKER]: 0.00
    },
    // Levels 20-24: The Hunter (Stalker introduced)
    'hunter': {
      [EnemyType.CATERPILLAR]: 0.10,  // 10% - Yellow Cat
      [EnemyType.BEETLE]: 0.10,       // 10% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.05, // 5% - Blue Caterpillar
      [EnemyType.REX]: 0.15,          // 15% - Rex
      [EnemyType.CHOMPER]: 0.20,      // 20% - Chomper
      [EnemyType.SNAIL]: 0.20,        // 20% - Snail
      [EnemyType.BASEBLU]: 0.10,      // 10% - BaseBlu (max 1 per floor)
      [EnemyType.STALKER]: 0.10,      // 10% - Stalker adds tension
      [EnemyType.JUMPER]: 0.00
    },
    // Levels 25-29: Bouncing Variety (Jumper introduced)
    'bouncing': {
      [EnemyType.CATERPILLAR]: 0.05,  // 5% - Yellow Cat
      [EnemyType.BEETLE]: 0.05,       // 5% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.05, // 5% - Blue Caterpillar
      [EnemyType.REX]: 0.10,          // 10% - Rex (will alternate with Jumper)
      [EnemyType.JUMPER]: 0.15,       // 15% - Jumper introduced
      [EnemyType.CHOMPER]: 0.15,      // 15% - Chomper
      [EnemyType.SNAIL]: 0.20,        // 20% - Snail
      [EnemyType.BASEBLU]: 0.10,      // 10% - BaseBlu (max 1 per floor)
      [EnemyType.STALKER]: 0.15       // 15% - Stalker
    },
    // Levels 30-34: Advanced Mix
    'advanced': {
      [EnemyType.CATERPILLAR]: 0.05,  // 5% - Yellow Cat
      [EnemyType.BEETLE]: 0.05,       // 5% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.05, // 5% - Blue Caterpillar
      [EnemyType.REX]: 0.15,          // 15% - Rex (will alternate with Jumper)
      [EnemyType.JUMPER]: 0.15,       // 15% - Jumper
      [EnemyType.CHOMPER]: 0.15,      // 15% - Chomper
      [EnemyType.SNAIL]: 0.15,        // 15% - Snail
      [EnemyType.BASEBLU]: 0.10,      // 10% - BaseBlu (max 1 per floor)
      [EnemyType.STALKER]: 0.15       // 15% - Stalker
    },
    // Levels 35-39: Advanced Mix II
    'advanced_2': {
      [EnemyType.CATERPILLAR]: 0.05,  // 5% - Yellow Cat
      [EnemyType.BEETLE]: 0.05,       // 5% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.00, // 0% - Blue Caterpillar
      [EnemyType.REX]: 0.10,          // 10% - Rex (will alternate with Jumper)
      [EnemyType.JUMPER]: 0.20,       // 20% - Jumper
      [EnemyType.CHOMPER]: 0.15,      // 15% - Chomper
      [EnemyType.SNAIL]: 0.20,        // 20% - Snail
      [EnemyType.BASEBLU]: 0.10,      // 10% - BaseBlu (max 1 per floor)
      [EnemyType.STALKER]: 0.15       // 15% - Stalker
    },
    // Levels 40-49: Expert Balance
    'expert': {
      [EnemyType.CATERPILLAR]: 0.05,  // 5% - Yellow Cat
      [EnemyType.BEETLE]: 0.05,       // 5% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.00, // 0% - Blue Caterpillar
      [EnemyType.REX]: 0.15,          // 15% - Rex (will alternate with Jumper)
      [EnemyType.JUMPER]: 0.15,       // 15% - Jumper
      [EnemyType.CHOMPER]: 0.10,      // 10% - Chomper
      [EnemyType.SNAIL]: 0.15,        // 15% - Snail
      [EnemyType.BASEBLU]: 0.15,      // 15% - BaseBlu (max 1 per floor)
      [EnemyType.STALKER]: 0.20       // 20% - Stalker
    },
    // Levels 50+: BEAST MODE - All enemies balanced
    'beast': {
      [EnemyType.CATERPILLAR]: 0.05,  // 5% - Yellow Cat
      [EnemyType.BEETLE]: 0.05,       // 5% - Beetle
      [EnemyType.BLUE_CATERPILLAR]: 0.05, // 5% - Blue Caterpillar
      [EnemyType.REX]: 0.10,          // 10% - Rex (will alternate with Jumper)
      [EnemyType.JUMPER]: 0.10,       // 10% - Jumper
      [EnemyType.CHOMPER]: 0.15,      // 15% - Chomper
      [EnemyType.SNAIL]: 0.15,        // 15% - Snail
      [EnemyType.BASEBLU]: 0.15,      // 15% - BaseBlu (max 1 per floor)
      [EnemyType.STALKER]: 0.20       // 20% - Stalker
    }
  }

  /**
   * Get max enemies per floor based on level tier
   * From Simple Enemy Distribution Plan
   */
  static getMaxEnemiesPerFloor(levelNumber: number): number {
    if (levelNumber <= 10) return 2      // Levels 1-10: 1-2 enemies
    else if (levelNumber <= 20) return 3 // Levels 11-20: 2-3 enemies
    else if (levelNumber <= 30) return 3 // Levels 21-30: 2-3 enemies
    else if (levelNumber <= 40) return 4 // Levels 31-40: 3-4 enemies
    else if (levelNumber <= 50) return 4 // Levels 41-50: 3-4 enemies
    else return 5                        // Levels 51+: 4-5 enemies (BEAST MODE)
  }

  /**
   * Get speed scaling multiplier based on level
   */
  static getSpeedMultiplier(levelNumber: number): number {
    if (levelNumber <= 10) {
      // 1.0x → 1.05x
      const progress = (levelNumber - 1) / 9
      return 1.0 + (progress * 0.05)
    } else if (levelNumber <= 20) {
      // 1.05x → 1.10x
      const progress = (levelNumber - 10) / 10
      return 1.05 + (progress * 0.05)
    } else if (levelNumber <= 30) {
      // 1.10x → 1.15x
      const progress = (levelNumber - 20) / 10
      return 1.10 + (progress * 0.05)
    } else if (levelNumber <= 40) {
      // 1.15x → 1.20x
      const progress = (levelNumber - 30) / 10
      return 1.15 + (progress * 0.05)
    } else if (levelNumber <= 50) {
      // 1.20x → 1.25x
      const progress = (levelNumber - 40) / 10
      return 1.20 + (progress * 0.05)
    } else {
      // BEAST MODE: capped at 1.25x
      return 1.25
    }
  }

  /**
   * Get BaseBlu max per floor - ALWAYS 1 maximum
   */
  static getBaseBluMaxPerFloor(levelNumber: number): number {
    if (levelNumber <= 14) return 0      // No BaseBlu until level 15
    else return 1                        // Max 1 per floor for ALL levels
  }

  /**
   * Get spawn weights based on level
   */
  static getSpawnWeights(levelNumber: number): SpawnWeights {
    if (levelNumber <= 4) {
      return this.LEVEL_SPAWN_WEIGHTS['tutorial_early']  // Levels 1-4: Learning Phase
    } else if (levelNumber <= 7) {
      return this.LEVEL_SPAWN_WEIGHTS['patrol']          // Levels 5-7: Patrol Patterns
    } else if (levelNumber <= 11) {
      return this.LEVEL_SPAWN_WEIGHTS['speed_intro']     // Levels 8-11: Speed Challenge
    } else if (levelNumber <= 14) {
      return this.LEVEL_SPAWN_WEIGHTS['rex_intro']       // Levels 12-14: Rex appears
    } else if (levelNumber <= 19) {
      return this.LEVEL_SPAWN_WEIGHTS['obstacles']       // Levels 15-19: BaseBlu introduced
    } else if (levelNumber <= 24) {
      return this.LEVEL_SPAWN_WEIGHTS['hunter']          // Levels 20-24: Stalker appears
    } else if (levelNumber <= 29) {
      return this.LEVEL_SPAWN_WEIGHTS['bouncing']        // Levels 25-29: Jumper introduced
    } else if (levelNumber <= 34) {
      return this.LEVEL_SPAWN_WEIGHTS['advanced']        // Levels 30-34: Advanced Mix
    } else if (levelNumber <= 39) {
      return this.LEVEL_SPAWN_WEIGHTS['advanced_2']      // Levels 35-39: Advanced Mix II
    } else if (levelNumber <= 49) {
      return this.LEVEL_SPAWN_WEIGHTS['expert']          // Levels 40-49: Expert Balance
    } else {
      return this.LEVEL_SPAWN_WEIGHTS['beast']           // Levels 50+: BEAST MODE
    }
  }

  /**
   * Select enemies to spawn for a floor
   */
  static selectEnemiesForFloor(levelNumber: number, floorNumber: number): EnemyType[] {
    const weights = {...this.getSpawnWeights(levelNumber)} // Clone weights to modify
    const maxEnemies = this.getMaxEnemiesPerFloor(levelNumber)
    const baseBluMaxPerFloor = this.getBaseBluMaxPerFloor(levelNumber)
    
    // Apply "one bouncing enemy per floor" rule
    // If both Rex and Jumper have weights > 0, choose one for this floor
    if (weights[EnemyType.REX] > 0 && weights[EnemyType.JUMPER] > 0) {
      // Randomly choose which bouncing enemy this floor gets
      if (Math.random() < 0.5) {
        weights[EnemyType.JUMPER] = 0  // No Jumper on Rex floors
      } else {
        weights[EnemyType.REX] = 0      // No Rex on Jumper floors
      }
    }
    
    const selectedEnemies: EnemyType[] = []
    let baseBluCount = 0
    
    // Special case for level 1: Start extra gentle with just 1 enemy guaranteed
    let actualEnemyCount: number
    if (levelNumber === 1) {
      // Level 1: Always just 1 enemy per floor for a gentle introduction
      actualEnemyCount = 1
    } else {
      // Randomly determine actual enemy count (e.g., 2 max becomes 1-2 random)
      const minEnemies = Math.max(1, maxEnemies - 1)
      actualEnemyCount = Math.floor(Math.random() * 2) + minEnemies
    }
    
    // Keep selecting enemies up to the count
    for (let i = 0; i < actualEnemyCount; i++) {
      // Build weighted selection array, excluding enemies at 0% spawn rate
      const availableTypes: { type: EnemyType, weight: number }[] = []
      let totalWeight = 0
      
      for (const [typeStr, weight] of Object.entries(weights)) {
        if (weight > 0) {
          const type = typeStr as EnemyType
          
          // Check BaseBlu spawn limit
          if (type === EnemyType.BASEBLU && baseBluCount >= baseBluMaxPerFloor) {
            continue // Skip BaseBlu if we've hit the limit
          }
          
          // Skip Chomper (blue enemy) on floor 9 due to animation issues
          if (type === EnemyType.CHOMPER && floorNumber === 9) {
            continue // Skip chompers on floor 9
          }
          
          availableTypes.push({ type, weight })
          totalWeight += weight
        }
      }
      
      if (availableTypes.length === 0) break
      
      // Select enemy based on weights
      const rand = Math.random() * totalWeight
      let cumulativeWeight = 0
      let selectedType: EnemyType | null = null
      
      for (const item of availableTypes) {
        cumulativeWeight += item.weight
        if (rand <= cumulativeWeight) {
          selectedType = item.type
          break
        }
      }
      
      if (selectedType) {
        selectedEnemies.push(selectedType)
        if (selectedType === EnemyType.BASEBLU) {
          baseBluCount++
        }
      }
    }
    
    return selectedEnemies
  }

  /**
   * @deprecated Use selectEnemiesForFloor instead
   */
  static selectEnemies(difficultyBudget: number, levelNumber: number): EnemyType[] {
    return this.selectEnemiesForFloor(levelNumber, 0)
  }

  /**
   * Get enemy definition
   */
  static getEnemyDefinition(type: EnemyType): EnemyDefinition {
    return this.ENEMY_DEFINITIONS[type]
  }

  /**
   * Convert EnemyType to color string for existing Cat constructor
   */
  static getColorForEnemyType(type: EnemyType): string {
    return this.ENEMY_DEFINITIONS[type].color
  }

  /**
   * Check if enemy type is a stalker (needs special spawning)
   */
  static isStalkerType(type: EnemyType): boolean {
    return type === EnemyType.STALKER
  }

  /**
   * Check if enemy type is BaseBlu (needs special spawning)
   */
  static isBaseBluType(type: EnemyType): boolean {
    return type === EnemyType.BASEBLU
  }

  /**
   * Check if enemy type is Beetle (needs special spawning)
   */
  static isBeetleType(type: EnemyType): boolean {
    return type === EnemyType.BEETLE
  }

  /**
   * Check if enemy type is Rex (needs special spawning)
   */
  static isRexType(type: EnemyType): boolean {
    return type === EnemyType.REX
  }

  /**
   * Get point value for defeating an enemy type
   */
  static getPointValue(type: EnemyType): number {
    return this.ENEMY_DEFINITIONS[type].pointValue
  }

  /**
   * Get all available enemy types
   */
  static getAllEnemyTypes(): EnemyType[] {
    return Object.values(EnemyType)
  }

  /**
   * Log spawning statistics for debugging
   */
  static logSpawnInfo(levelNumber: number, floorNumber: number, selectedEnemies: EnemyType[]): void {
    const budget = this.getDifficultyBudget(levelNumber, floorNumber)
    const usedBudget = selectedEnemies.reduce((sum, type) => 
      sum + this.ENEMY_DEFINITIONS[type].difficultyScore, 0
    )
    
    // Enemy spawn info (replaced console.log)
  }
}