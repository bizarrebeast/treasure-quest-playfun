/**
 * Platform Abstraction Layer - Play.fun Version
 * Wallet/Web3 functionality commented out for play.fun
 */

import { reportGameOver } from './RemixUtils'

export interface GamePlatform {
  ready(): void;
  gameOver(score: number): void;
  haptic(type: string): void;
  mute(): void;
  unmute(): void;
  saveScore(score: number): Promise<void>;
  getHighScore(): Promise<number>;
  saveGameState?(state: any): Promise<void>;
  loadGameState?(): Promise<any>;
  connectWallet?(): Promise<string | null>;
  disconnectWallet?(): Promise<void>;
  showWalletAccount?(): Promise<void>;
  showWalletButton?(): void;
  hideWalletButton?(): void;
}

/**
 * Play.fun Platform Implementation
 * Reports scores via play.fun SDK, no wallet integration
 */
export class PlayFunPlatform implements GamePlatform {
  ready() {
    console.log('[PlayFun] Game ready')
  }

  gameOver(score: number) {
    console.log(`[PlayFun] Game Over - Score: ${score}`)
    // Report score to play.fun SDK
    reportGameOver(score)
  }

  haptic(type: string) {
    if ('vibrate' in navigator) {
      const duration = type === 'heavy' ? 100 : 50;
      navigator.vibrate(duration);
    }
  }

  mute() {
    if ((window as any).game) {
      (window as any).game.sound.mute = true;
    }
  }

  unmute() {
    if ((window as any).game) {
      (window as any).game.sound.mute = false;
    }
  }

  async saveScore(score: number) {
    // play.fun handles score persistence via SDK
    this.gameOver(score);
  }

  async getHighScore() {
    return 0;
  }

  // Wallet methods — no-op on play.fun
  async connectWallet(): Promise<string | null> { return null; }
  async disconnectWallet(): Promise<void> {}
  showWalletButton(): void {}
  hideWalletButton(): void {}
  async showWalletAccount(): Promise<void> {}
}

// --- Original RemixPlatform and Dgen1Platform commented out for play.fun ---
// (kept for reference if porting back)

/*
export class RemixPlatform implements GamePlatform {
  ready() {
    if (typeof window !== 'undefined' && (window as any).Farcade) {
      (window as any).Farcade.gameReady();
    }
  }
  gameOver(score: number) {
    if (typeof window !== 'undefined' && (window as any).Farcade) {
      (window as any).Farcade.gameOver(score);
    }
  }
  haptic(type: string) {}
  mute() {}
  unmute() {}
  async saveScore(score: number) { this.gameOver(score); }
  async getHighScore() { return 0; }
  async connectWallet(): Promise<string | null> { return null; }
}

export class Dgen1Platform implements GamePlatform {
  // ... wallet/Web3 integration was here ...
}
*/

/**
 * Platform Detection - always returns PlayFunPlatform
 */
export function detectPlatform(): GamePlatform {
  console.log('[PlayFun] Using Play.fun platform')
  return new PlayFunPlatform();
}
