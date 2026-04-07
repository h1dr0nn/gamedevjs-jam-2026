import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'Preload' }); }

  preload(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    const bar = this.add.rectangle(width / 2, height / 2, 0, 8, 0x00ff99);
    this.add.rectangle(width / 2, height / 2, 304, 12).setStrokeStyle(1, 0x334455);

    this.add.text(width / 2, height / 2 - 30, 'CRASH', {
      fontSize: '32px', color: '#00ffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => { bar.width = 300 * v; });

    // Generate all procedural textures
    this.generateTextures();
  }

  private generateTextures(): void {
    // ── Player (24x24): cyan diamond with inner highlight ──
    {
      const g = this.add.graphics();
      g.fillStyle(0x00ffff, 1);
      g.beginPath();
      g.moveTo(12, 0);
      g.lineTo(24, 12);
      g.lineTo(12, 24);
      g.lineTo(0, 12);
      g.closePath();
      g.fillPath();
      // Inner highlight
      g.fillStyle(0x88ffff, 0.6);
      g.beginPath();
      g.moveTo(12, 3);
      g.lineTo(21, 12);
      g.lineTo(12, 21);
      g.lineTo(3, 12);
      g.closePath();
      g.fillPath();
      // Center dot
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(12, 10, 3);
      g.generateTexture('player', 24, 24);
      g.destroy();
    }

    // ── Grunt (20x20): orange triangle pointing right ──
    {
      const g = this.add.graphics();
      g.fillStyle(0xff6600, 1);
      g.beginPath();
      g.moveTo(18, 10);
      g.lineTo(2, 2);
      g.lineTo(2, 18);
      g.closePath();
      g.fillPath();
      // Darker outline
      g.lineStyle(1, 0xcc4400, 1);
      g.strokeTriangle(18, 10, 2, 2, 2, 18);
      g.generateTexture('grunt', 20, 20);
      g.destroy();
    }

    // ── Shielder (22x22): blue body with yellow shield bar ──
    {
      const g = this.add.graphics();
      // Blue body
      g.fillStyle(0x0044ff, 1);
      g.fillRect(3, 3, 16, 16);
      g.lineStyle(1, 0x0022aa, 1);
      g.strokeRect(3, 3, 16, 16);
      // Yellow shield bar on left side
      g.fillStyle(0xffcc00, 1);
      g.fillRect(1, 3, 3, 16);
      g.generateTexture('shielder', 22, 22);
      g.destroy();
    }

    // ── Bomber (20x20): hot-pink circle with fuse dot ──
    {
      const g = this.add.graphics();
      g.fillStyle(0xff0066, 1);
      g.fillCircle(10, 11, 8);
      g.lineStyle(1, 0xaa0044, 1);
      g.strokeCircle(10, 11, 8);
      // Fuse dot on top
      g.fillStyle(0xffff00, 1);
      g.fillCircle(10, 3, 2);
      g.lineStyle(1, 0x888800, 1);
      g.lineBetween(10, 5, 10, 9);
      g.generateTexture('bomber', 20, 20);
      g.destroy();
    }

    // ── Turret (24x24): purple octagon with dark outline ──
    {
      const g = this.add.graphics();
      const cx = 12, cy = 12, r = 10;
      g.fillStyle(0xaa00aa, 1);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0x660066, 1);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
      // Center circle
      g.fillStyle(0x880088, 1);
      g.fillCircle(cx, cy, 4);
      g.generateTexture('turret', 24, 24);
      g.destroy();
    }

    // ── Barrel (20x20): red circle with yellow hazard stripes ──
    {
      const g = this.add.graphics();
      g.fillStyle(0xff3300, 1);
      g.fillCircle(10, 10, 9);
      g.lineStyle(1, 0xaa2200, 1);
      g.strokeCircle(10, 10, 9);
      // Diagonal hazard stripes
      g.lineStyle(2, 0xffcc00, 0.9);
      g.lineBetween(4, 4, 16, 16);
      g.lineBetween(4, 16, 16, 4);
      g.generateTexture('barrel', 20, 20);
      g.destroy();
    }

    // ── Boulder (22x22): grey irregular circle with cracks ──
    {
      const g = this.add.graphics();
      g.fillStyle(0x888888, 1);
      // Slightly irregular polygon
      g.beginPath();
      g.moveTo(11, 1);
      g.lineTo(18, 3);
      g.lineTo(21, 10);
      g.lineTo(19, 18);
      g.lineTo(12, 21);
      g.lineTo(4, 19);
      g.lineTo(1, 12);
      g.lineTo(3, 4);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, 0x555555, 1);
      g.strokePath();
      // Crack lines
      g.lineStyle(1, 0x555555, 0.8);
      g.lineBetween(8, 5, 11, 11);
      g.lineBetween(11, 11, 15, 8);
      g.lineBetween(11, 11, 13, 17);
      g.generateTexture('boulder', 22, 22);
      g.destroy();
    }

    // ── Wall tile (50x50): dark blue-grey with 3D bevel ──
    {
      const g = this.add.graphics();
      // Base fill
      g.fillStyle(0x2a3040, 1);
      g.fillRect(0, 0, 50, 50);
      // Top/left lighter edge (highlight)
      g.lineStyle(2, 0x3a4858, 1);
      g.lineBetween(0, 0, 50, 0);
      g.lineBetween(0, 0, 0, 50);
      // Bottom/right darker edge (shadow)
      g.lineStyle(2, 0x1a2030, 1);
      g.lineBetween(50, 0, 50, 50);
      g.lineBetween(0, 50, 50, 50);
      // Inner bevel lines
      g.lineStyle(1, 0x3a4858, 0.5);
      g.lineBetween(2, 2, 48, 2);
      g.lineBetween(2, 2, 2, 48);
      g.lineStyle(1, 0x1a2030, 0.5);
      g.lineBetween(48, 2, 48, 48);
      g.lineBetween(2, 48, 48, 48);
      g.generateTexture('wall', 50, 50);
      g.destroy();
    }

    // ── Floor tile (50x50): very dark navy with subtle grid lines ──
    {
      const g = this.add.graphics();
      // Base fill
      g.fillStyle(0x14182a, 1);
      g.fillRect(0, 0, 50, 50);
      // Subtle grid lines
      g.lineStyle(1, 0x1a1e32, 1);
      g.lineBetween(49, 0, 49, 50);
      g.lineBetween(0, 49, 50, 49);
      // Occasional tiny texture dots
      g.fillStyle(0x1e2238, 1);
      g.fillRect(8, 8, 2, 2);
      g.fillRect(28, 18, 1, 1);
      g.fillRect(18, 38, 2, 2);
      g.fillRect(40, 30, 1, 1);
      g.fillRect(35, 10, 2, 1);
      g.generateTexture('floor', 50, 50);
      g.destroy();
    }
  }

  create(): void { this.scene.start('Menu'); }
}
