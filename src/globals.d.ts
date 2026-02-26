// Phaser loaded globally via CDN
declare const Phaser: typeof import("phaser");

// Play.fun SDK loaded globally via CDN
declare const OpenGameSDK: any;

declare global {
  interface Window {
    OpenGameSDK?: any;
    FarcadeSDK?: any;
    ethereum?: any;
    game?: Phaser.Game;
    platform?: any;
    gamePlatform?: any;
  }
}

// Build-time defines
declare const DGEN1_BUILD: boolean;

export {};
