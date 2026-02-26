/**
 * Wallet UI Component for Phaser
 * Handles wallet connection button and status display
 */

import { Web3Manager } from '../utils/Web3Utils';

export class WalletUI {
  private scene: Phaser.Scene;
  private walletButton: Phaser.GameObjects.Container;
  private walletText: Phaser.GameObjects.Text;
  private walletIcon: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Rectangle;
  private isConnected: boolean = false;
  private address: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createWalletButton();
    this.setupEventListeners();
  }

  /**
   * Create the wallet connection button
   */
  private createWalletButton(): void {
    const x = this.scene.cameras.main.width - 100;
    const y = 40;

    // Create container for button elements
    this.walletButton = this.scene.add.container(x, y);

    // Background
    this.background = this.scene.add.rectangle(0, 0, 180, 40, 0x6366f1, 1);
    this.background.setStrokeStyle(2, 0xffffff);
    this.background.setInteractive({ useHandCursor: true });

    // Icon
    this.walletIcon = this.scene.add.text(-80, 0, '🔗', {
      fontSize: '20px',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Text
    this.walletText = this.scene.add.text(0, 0, 'Connect', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Add to container
    this.walletButton.add([this.background, this.walletIcon, this.walletText]);
    
    // Set depth to appear above game elements
    this.walletButton.setDepth(1000);

    // Add click handler
    this.background.on('pointerdown', () => this.handleClick());

    // Add hover effects
    this.background.on('pointerover', () => {
      this.background.setFillStyle(0x5558e3);
      this.scene.input.setDefaultCursor('pointer');
    });

    this.background.on('pointerout', () => {
      this.background.setFillStyle(0x6366f1);
      this.scene.input.setDefaultCursor('default');
    });

    // Check initial connection status
    this.checkConnectionStatus();
  }

  /**
   * Setup event listeners for wallet changes
   */
  private setupEventListeners(): void {
    // Listen for wallet changes
    window.addEventListener('walletChanged', (event: any) => {
      this.updateConnectionStatus(event.detail.address);
    });
  }

  /**
   * Check current connection status
   */
  private async checkConnectionStatus(): Promise<void> {
    const platform = this.scene.registry.get('platform');
    
    if (platform && platform.web3Manager) {
      const address = platform.web3Manager.getAddress();
      if (address) {
        this.updateConnectionStatus(address);
      }
    }
  }

  /**
   * Handle button click
   */
  private async handleClick(): Promise<void> {
    const platform = this.scene.registry.get('platform');
    
    if (!platform) {
      console.error('Platform not found');
      return;
    }

    if (this.isConnected) {
      // Show account modal if connected
      if (platform.showWalletAccount) {
        await platform.showWalletAccount();
      }
    } else {
      // Connect wallet
      this.setLoading(true);
      
      try {
        const address = await platform.connectWallet();
        if (address) {
          this.updateConnectionStatus(address);
          
          // Show success feedback
          this.showConnectionFeedback('Connected!', 0x4ade80);
        }
      } catch (error) {
        console.error('Connection failed:', error);
        this.showConnectionFeedback('Failed', 0xff4444);
      } finally {
        this.setLoading(false);
      }
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(address: string | null): void {
    this.isConnected = !!address;
    this.address = address;

    if (address) {
      // Format address for display
      const formatted = `${address.slice(0, 6)}...${address.slice(-4)}`;
      this.walletText.setText(formatted);
      this.walletIcon.setText('👛');
      this.background.setFillStyle(0x4ade80); // Green when connected
    } else {
      this.walletText.setText('Connect');
      this.walletIcon.setText('🔗');
      this.background.setFillStyle(0x6366f1); // Blue when disconnected
    }
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    if (loading) {
      this.walletText.setText('...');
      this.walletIcon.setText('⏳');
      this.background.setInteractive(false);
    } else {
      this.background.setInteractive(true);
      this.checkConnectionStatus();
    }
  }

  /**
   * Show connection feedback
   */
  private showConnectionFeedback(message: string, color: number): void {
    const feedback = this.scene.add.text(
      this.walletButton.x,
      this.walletButton.y + 30,
      message,
      {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
        backgroundColor: `#${color.toString(16)}`,
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5).setDepth(1001);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      y: feedback.y - 20,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => feedback.destroy()
    });
  }

  /**
   * Update button position (for responsive layouts)
   */
  public updatePosition(x?: number, y?: number): void {
    if (x !== undefined) this.walletButton.x = x;
    if (y !== undefined) this.walletButton.y = y;
  }

  /**
   * Show/hide the wallet button
   */
  public setVisible(visible: boolean): void {
    this.walletButton.setVisible(visible);
  }

  /**
   * Destroy the wallet UI
   */
  public destroy(): void {
    window.removeEventListener('walletChanged', this.checkConnectionStatus);
    this.walletButton.destroy();
  }
}

/**
 * Factory function to add wallet UI to a scene
 */
export function addWalletUI(scene: Phaser.Scene): WalletUI {
  return new WalletUI(scene);
}