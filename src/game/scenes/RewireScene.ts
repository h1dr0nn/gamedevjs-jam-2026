import Phaser from 'phaser';
import { pickChips } from '../data/chips';
import { runState } from '../systems/RunState';
import { EVENTS } from '../types';
import { playSfx } from '../systems/AudioSystem';
import type { ChipDef } from '../types';

const ICON_MAP: Record<number, number> = {};
[1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49].forEach((id) => (ICON_MAP[id] = id));

function nearestIcon(iconId: number): number {
  const keys = Object.keys(ICON_MAP).map(Number);
  let best = keys[0];
  let bestDist = Infinity;
  for (const k of keys) {
    const d = Math.abs(k - iconId);
    if (d < bestDist) { bestDist = d; best = k; }
  }
  return best;
}

export class RewireScene extends Phaser.Scene {
  constructor() { super({ key: 'Rewire' }); }

  create(): void {
    const { width, height } = this.scale;
    // dim overlay
    this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0, 0);

    this.add
      .text(width / 2, 60, 'REWIRE', { fontFamily: 'monospace', fontSize: '40px', color: '#00ffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 100, 'Install one chip', { fontFamily: 'monospace', fontSize: '14px', color: '#88bbbb' })
      .setOrigin(0.5);

    const run = runState.current!;
    const choices = pickChips(run.seenChipIds, 3);

    const cardW = 240;
    const cardH = 280;
    const gap = 30;
    const totalW = cardW * choices.length + gap * (choices.length - 1);
    const startX = (width - totalW) / 2 + cardW / 2;
    const y = height / 2 + 20;

    choices.forEach((chip, i) => {
      const x = startX + i * (cardW + gap);
      this.buildCard(x, y, cardW, cardH, chip, i, choices.length);
    });

    this.add
      .text(width / 2, height - 40, '1 / 2 / 3  or  ← → + ENTER', { fontFamily: 'monospace', fontSize: '12px', color: '#556677' })
      .setOrigin(0.5);

    let selected = 0;
    const selectionBoxes: Phaser.GameObjects.Rectangle[] = [];
    choices.forEach((_c, i) => {
      const x = startX + i * (cardW + gap);
      const box = this.add.rectangle(x, y, cardW + 6, cardH + 6, 0, 0).setStrokeStyle(3, 0x00ffff, 0).setOrigin(0.5);
      selectionBoxes.push(box);
    });
    const updateSel = () => {
      selectionBoxes.forEach((b, i) => b.setStrokeStyle(3, 0x00ffff, i === selected ? 1 : 0));
    };
    updateSel();

    const chose = (idx: number) => {
      if (idx < 0 || idx >= choices.length) return;
      const chip = choices[idx];
      this.chooseChip(chip);
    };

    this.input.keyboard!.on('keydown-ONE', () => chose(0));
    this.input.keyboard!.on('keydown-TWO', () => chose(1));
    this.input.keyboard!.on('keydown-THREE', () => chose(2));
    this.input.keyboard!.on('keydown-LEFT', () => { selected = (selected - 1 + choices.length) % choices.length; updateSel(); });
    this.input.keyboard!.on('keydown-RIGHT', () => { selected = (selected + 1) % choices.length; updateSel(); });
    this.input.keyboard!.on('keydown-A', () => { selected = (selected - 1 + choices.length) % choices.length; updateSel(); });
    this.input.keyboard!.on('keydown-D', () => { selected = (selected + 1) % choices.length; updateSel(); });
    this.input.keyboard!.on('keydown-ENTER', () => chose(selected));
    this.input.keyboard!.on('keydown-SPACE', () => chose(selected));
  }

  private buildCard(x: number, y: number, w: number, h: number, chip: ChipDef, index: number, total: number): void {
    void total;
    const rarityColor = chip.rarity === 'epic' ? 0xff66ff : chip.rarity === 'rare' ? 0x00aaff : chip.rarity === 'cursed' ? 0xff3355 : 0x88aabb;

    const bg = this.add.rectangle(x, y, w, h, 0x0a1220, 1).setStrokeStyle(2, rarityColor);
    void bg;

    const iconKey = `chip-icon-${nearestIcon(chip.iconId)}`;
    if (this.textures.exists(iconKey)) {
      const icon = this.add.image(x, y - 60, iconKey).setScale(0.18);
      icon.setTint(rarityColor);
    }
    this.add
      .text(x, y + 20, chip.name, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: w - 20 }, align: 'center' })
      .setOrigin(0.5);
    this.add
      .text(x, y + 60, chip.desc, { fontFamily: 'monospace', fontSize: '12px', color: '#88bbbb', align: 'center', wordWrap: { width: w - 20 } })
      .setOrigin(0.5);
    this.add
      .text(x, y + h / 2 - 24, chip.rarity.toUpperCase(), { fontFamily: 'monospace', fontSize: '11px', color: Phaser.Display.Color.IntegerToColor(rarityColor).rgba })
      .setOrigin(0.5);
    this.add
      .text(x, y - h / 2 + 16, `[${index + 1}]`, { fontFamily: 'monospace', fontSize: '12px', color: '#556677' })
      .setOrigin(0.5);
  }

  private chooseChip(chip: ChipDef): void {
    playSfx('pickup');
    const run = runState.current!;
    run.chipIds.push(chip.id);
    run.seenChipIds.add(chip.id);
    // Apply to current player via event so GameScene can pick it up
    const gs = this.scene.get('Game');
    gs.events.emit(EVENTS.REWIRE_CHOSEN, chip);
    // Re-apply chips to player in-place
    const player = (gs as Phaser.Scene & { player?: { applyChip: (fn: (s: any) => any) => void } }).player;
    if (player) player.applyChip(chip.apply);
    gs.events.emit(EVENTS.CHIPS_UPDATE, run.chipIds);
    gs.events.emit('rewire-done');
    this.scene.resume('Game');
    this.scene.stop();
  }
}
