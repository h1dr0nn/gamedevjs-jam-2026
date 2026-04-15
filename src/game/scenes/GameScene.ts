import Phaser from 'phaser';
import { FLOORS } from '../data/floors';
import { ENEMIES } from '../data/enemies';
import { CHIPS } from '../data/chips';
import { getRoom, ROOM_HEIGHT, ROOM_WIDTH } from '../data/rooms';
import { defaultStats, EVENTS } from '../types';
import type { EnemyId, HazardId } from '../types';
import { runState } from '../systems/RunState';
import { metaStore } from '../systems/MetaStore';
import { InputSystem } from '../systems/InputSystem';
import { JuiceSystem } from '../systems/JuiceSystem';
import { ChainSystem } from '../systems/ChainSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Hazard } from '../entities/Hazard';
import { Projectile } from '../entities/Projectile';
import { playSfx, unlockAudio } from '../systems/AudioSystem';

const TILE = 32;
const WORLD_W = ROOM_WIDTH * TILE;
const WORLD_H = ROOM_HEIGHT * TILE;

export class GameScene extends Phaser.Scene {
  private input$!: InputSystem;
  private juice!: JuiceSystem;
  private chain!: ChainSystem;

  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private hazards: Hazard[] = [];
  private interactables: { x: number; y: number; hazard: Hazard }[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private oneways!: Phaser.Physics.Arcade.StaticGroup;
  private ladderRects: Phaser.GameObjects.Rectangle[] = [];
  private doorSprite!: Phaser.Physics.Arcade.Sprite;

  private bgLayers: Phaser.GameObjects.TileSprite[] = [];

  private projPlayer!: Phaser.Physics.Arcade.Group;
  private projEnemy!: Phaser.Physics.Arcade.Group;

  private interactHintAt: Hazard | null = null;
  private interactLabel!: Phaser.GameObjects.Text;

  private roomCleared = false;
  private transitioning = false;

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    if (!runState.current) {
      this.scene.start('Menu');
      return;
    }

    this.roomCleared = false;
    this.transitioning = false;
    this.hazards = [];
    this.interactables = [];
    this.ladderRects = [];
    this.bgLayers = [];

    const run = runState.current;
    const floor = FLOORS[run.floorIndex];
    const room = getRoom(floor.id, run.roomIndex);

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor('#050811');

    this.buildParallax(floor.biome);

    this.walls = this.physics.add.staticGroup();
    this.oneways = this.physics.add.staticGroup();

    this.input$ = new InputSystem(this);
    this.juice = new JuiceSystem(this);
    unlockAudio();

    this.projPlayer = this.physics.add.group({ classType: Projectile, maxSize: 24, runChildUpdate: false });
    this.projEnemy = this.physics.add.group({ classType: Projectile, maxSize: 32, runChildUpdate: false });

    // Build tiles from template
    let playerSpawn = { x: 80, y: WORLD_H - 80 };
    let doorPos = { x: WORLD_W - 60, y: WORLD_H - 80 };

    room.tiles.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        const x = c * TILE;
        const y = r * TILE;
        if (ch === '#') {
          this.spawnSolidTile(x, y, floor.tileKeyPrefix);
        } else if (ch === '=') {
          this.spawnOneway(x, y, floor.tileKeyPrefix);
        } else if (ch === 'H') {
          this.spawnLadder(x, y);
        } else if (ch === 'P') {
          playerSpawn = { x: x + TILE / 2, y: y - 20 };
        } else if (ch === 'X') {
          doorPos = { x: x + TILE / 2, y: y - 8 };
        }
      }
    });

    // Back-tiles decoration behind walls
    this.buildBackdrop(floor.tileKeyPrefix);

    // Hazards
    const haz = new Map<HazardId, number>();
    room.hazards.forEach((h) => {
      const hazard = new Hazard(this, h.type, h.x, h.y, this.juice, { sawDamage: floor.sawDamage });
      this.hazards.push(hazard);
      if (h.type === 'generator') this.interactables.push({ x: h.x, y: h.y, hazard });
      haz.set(h.type, (haz.get(h.type) ?? 0) + 1);
    });

    // Player
    let baseStats = defaultStats(run.proto);
    // Re-apply chips so persistence across room transitions works
    run.chipIds.forEach((id) => {
      const chip = CHIPS.find((c) => c.id === id);
      if (chip) baseStats = chip.apply(baseStats);
    });
    this.player = new Player(this, playerSpawn.x, playerSpawn.y, run.proto, baseStats, this.juice, this.projPlayer);

    this.chain = new ChainSystem(this, baseStats.chainWindow, baseStats.chainCap);
    this.chain.on('chain', (n: number) => this.events.emit(EVENTS.CHAIN_UPDATE, n));
    this.chain.on('reset', () => this.events.emit(EVENTS.CHAIN_RESET));

    // Enemies — scale stats with floor (1.0 / 1.15 / 1.3)
    this.enemies = this.add.group();
    const floorMul = 1 + run.floorIndex * 0.15;
    room.spawns.forEach((sp) => this.spawnEnemy(sp.type, sp.x, sp.y, floorMul));

    // Door (locked until room clear)
    this.doorSprite = this.physics.add.staticSprite(doorPos.x, doorPos.y, 'door');
    this.doorSprite.setOrigin(0.5, 1);
    this.doorSprite.setTint(0xff4466);

    // Colliders
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.projPlayer, this.walls, (p) => (p as Projectile).kill());
    this.physics.add.collider(this.projEnemy, this.walls, (p) => (p as Projectile).kill());

    // One-way platform behavior
    this.physics.add.collider(this.player, this.oneways, undefined, (player, platform) => {
      const p = player as Phaser.Physics.Arcade.Sprite;
      const plat = platform as Phaser.Physics.Arcade.Sprite;
      const downKey = this.input.keyboard?.addKey('S');
      const downCursor = this.input.keyboard?.createCursorKeys().down;
      if (downKey?.isDown || downCursor?.isDown) return false;
      return (p.body as Phaser.Physics.Arcade.Body).velocity.y >= 0 && p.y < plat.y - 8;
    });
    this.physics.add.collider(this.enemies, this.oneways);

    // Projectile vs enemy
    this.physics.add.overlap(this.projPlayer, this.enemies, (pp, ee) => {
      const p = pp as Projectile;
      const e = ee as Enemy;
      if (!p.active || e.isDead) return;
      if (!p.canHit(e.enemyId)) return;
      const keepGoing = p.recordHit(e.enemyId);
      e.tryDamage(p.damage, p.x);
      this.juice.hitstop(40);
      if (!keepGoing) p.kill();
    });

    // Enemy projectile vs player
    this.physics.add.overlap(this.projEnemy, this.player, (pp, _pl) => {
      const p = pp as Projectile;
      if (!p.active) return;
      const hit = this.player.tryDamage(p.damage, p.x);
      if (hit) p.kill();
    });

    // Enemy contact damage
    this.physics.add.overlap(this.enemies, this.player, (ee, _pl) => {
      const e = ee as Enemy;
      if (e.isDead) return;
      this.player.tryDamage(e.def.contactDamage, e.x);
    });

    // Ladder overlap
    this.events.on('update', this.checkLadder, this);

    // Camera follow with deadzone & zoom for platformer feel
    this.cameras.main.setZoom(1.5);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(80, 60);

    // Chip pickup spawned for shop rooms — not used yet; card at end of each room
    // Interact label
    this.interactLabel = this.add
      .text(0, 0, '[ E ] OVERLOAD', { fontFamily: 'monospace', fontSize: '11px', color: '#88ffff', backgroundColor: '#00222288', padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 1)
      .setDepth(500)
      .setVisible(false);

    // Melee swing from Swordsman — arc visual + hit detection
    this.events.on('melee-swing', (opts: { x: number; y: number; dir: number; range: number; damage: number }) => {
      // Slash arc: two lines growing outward
      const cx = opts.x + opts.dir * opts.range * 0.4;
      const arc = this.add.graphics().setDepth(60);
      arc.lineStyle(3, 0xffffff, 0.85);
      arc.strokeRect(-opts.range * 0.5, -30, opts.range, 60);
      arc.setPosition(cx, opts.y);
      this.tweens.add({ targets: arc, alpha: 0, scaleX: 0.3, duration: 140, ease: 'Quad.easeOut', onComplete: () => arc.destroy() });
      // Slash line
      const slash = this.add.graphics().setDepth(61);
      slash.lineStyle(2, 0x88eeff, 1);
      slash.lineBetween(0, -35, 0, 35);
      slash.setPosition(opts.x + opts.dir * opts.range * 0.5, opts.y);
      this.tweens.add({ targets: slash, alpha: 0, x: slash.x + opts.dir * 20, duration: 100, onComplete: () => slash.destroy() });

      let hitAny = false;
      this.enemies.getChildren().forEach((obj) => {
        const e = obj as Enemy;
        if (e.isDead) return;
        const dx = e.x - opts.x;
        const dy = e.y - opts.y;
        if (Math.abs(dy) < 55 && ((opts.dir > 0 && dx > -10 && dx < opts.range + 10) || (opts.dir < 0 && dx < 10 && dx > -opts.range - 10))) {
          e.tryDamage(opts.damage, this.player.x);
          hitAny = true;
        }
      });
      if (hitAny) this.juice.hitstop(55);
    });

    // Enemy killed
    this.events.on(EVENTS.ENEMY_KILLED, (info: { envKill: boolean; scrap: number; x: number; y: number }) => {
      const n = this.chain.registerKill(info.envKill);
      this.player.addSpecialCharge(info.envKill ? 18 : 12);
      run.kills++;
      if (info.envKill) run.envKills++;
      run.scrapEarned += info.scrap;
      if (n >= 4) this.juice.slowMo(180, 0.4);
      if (n >= 6 && n % 2 === 0) this.player.heal(1);
      this.events.emit(EVENTS.RUN_STATS, run);
      // Check clear
      this.checkRoomClear();
    });

    this.events.on(EVENTS.PLAYER_DIED, () => this.onPlayerDied());

    // HUD
    this.scene.launch('UI', { gameScene: this, proto: run.proto });

    // Short boot flash at run start (only on first room of a run)
    if (run.roomIndex === 0 && run.floorIndex === 0 && Date.now() - run.startedAt < 500) {
      this.cameras.main.fadeIn(500, 0, 0, 0);
    } else {
      this.cameras.main.fadeIn(200, 0, 0, 0);
    }

    // Initial event push
    this.events.emit(EVENTS.PLAYER_HP, baseStats.hp, baseStats.maxHp);
    this.events.emit(EVENTS.CHIPS_UPDATE, run.chipIds);
    this.events.emit(EVENTS.RUN_STATS, run);
    this.events.emit('floor-room', run.floorIndex, run.roomIndex);

    // Pause on ESC
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.transitioning) return;
      this.scene.launch('Pause');
      this.scene.pause();
    });
  }

  private spawnSolidTile(x: number, y: number, prefix: 'factory' | 'power'): void {
    const n = 1 + Math.floor(Math.random() * 6);
    const key = `tile-${prefix}-tile_${n.toString().padStart(2, '0')}`;
    const sprite = this.walls.create(x + TILE / 2, y + TILE / 2, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(10);
    sprite.refreshBody();
  }

  private spawnOneway(x: number, y: number, prefix: 'factory' | 'power'): void {
    const n = 7 + Math.floor(Math.random() * 3);
    const key = `tile-${prefix}-tile_${Math.min(12, n).toString().padStart(2, '0')}`;
    const sprite = this.oneways.create(x + TILE / 2, y + TILE / 2 - 8, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setOrigin(0.5, 0.5).setDepth(10);
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TILE, 10);
    body.setOffset(0, 0);
    body.updateFromGameObject();
  }

  private spawnLadder(x: number, y: number): void {
    this.add.image(x, y, 'obj-ladder').setOrigin(0, 0).setDepth(9);
    const rect = this.add.rectangle(x + TILE / 2, y + TILE / 2, TILE, TILE, 0, 0).setOrigin(0.5);
    this.ladderRects.push(rect);
  }

  private buildBackdrop(prefix: 'factory' | 'power'): void {
    // sparse backtiles on empty columns
    for (let r = 1; r < ROOM_HEIGHT - 2; r++) {
      for (let c = 0; c < ROOM_WIDTH; c++) {
        if (Math.random() > 0.12) continue;
        const key = prefix === 'factory'
          ? `tile-factory-back_${(1 + Math.floor(Math.random() * 8)).toString().padStart(2, '0')}`
          : `tile-power-tile_${(7 + Math.floor(Math.random() * 6)).toString().padStart(2, '0')}`;
        this.add.image(c * TILE, r * TILE, key).setOrigin(0, 0).setAlpha(0.35).setDepth(5);
      }
    }
  }

  private buildParallax(biome: string): void {
    const { width, height } = this.scale;
    const scale = height / 324;
    for (let i = 1; i <= 4; i++) {
      const key = `bg-${biome}-${i}`;
      if (!this.textures.exists(key)) continue;
      const layer = this.add
        .tileSprite(0, 0, width, height, key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10 + i)
        .setTileScale(scale, scale);
      layer.setData('factor', (i - 1) * 0.12);
      this.bgLayers.push(layer);
    }
  }

  private spawnEnemy(type: EnemyId, x: number, y: number, floorMul = 1): Enemy {
    const base = ENEMIES[type];
    const def = { ...base, hp: Math.ceil(base.hp * floorMul), attackDamage: Math.ceil(base.attackDamage * floorMul) };
    const e = new Enemy(this, x, y, def, this.player, this.juice, this.projEnemy);
    this.enemies.add(e);
    return e;
  }

  private checkLadder = () => {
    let onLadder = false;
    const px = this.player.x;
    const py = this.player.y;
    for (const r of this.ladderRects) {
      if (Math.abs(px - r.x) < 18 && Math.abs(py - r.y) < 28) {
        onLadder = true;
        break;
      }
    }
    this.player.setLadderOverlap(onLadder);
  };

  update(time: number, delta: number): void {
    if (this.transitioning) return;
    const input = this.input$.snapshot();

    this.player.update(time, delta, input);
    this.enemies.getChildren().forEach((e) => (e as Enemy).update(time, delta));
    this.chain.update();

    // Hazard updates
    this.hazards.forEach((h) => h.update(time));

    // Hazard damage to enemies
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as Enemy;
      if (e.isDead) return;
      for (const h of this.hazards) {
        if (!h.activeDamageZone || !h.lethalToEnemies) continue;
        if (h.intersectsEnemy(e)) {
          e.killByHazard();
          break;
        }
      }
    });

    // Hazard damage to player
    for (const h of this.hazards) {
      if (h.intersectsPlayer(this.player)) {
        this.player.tryDamage(h.activeDamage, this.player.x + (h.sprite.x < this.player.x ? -40 : 40));
        break;
      }
    }

    // Projectile frame cleanup (ensure offscreen dead)
    this.projPlayer.getChildren().forEach((p) => {
      const pr = p as Projectile;
      if (!pr.active) return;
      if (pr.x < -50 || pr.x > WORLD_W + 50) pr.kill();
    });
    this.projEnemy.getChildren().forEach((p) => {
      const pr = p as Projectile;
      if (!pr.active) return;
      if (pr.x < -50 || pr.x > WORLD_W + 50) pr.kill();
    });

    // Interact prompt
    this.interactHintAt = null;
    for (const it of this.interactables) {
      if (Math.abs(this.player.x - it.x) < 40 && Math.abs(this.player.y - it.y) < 60) {
        this.interactHintAt = it.hazard;
        break;
      }
    }
    if (this.interactHintAt) {
      this.interactLabel.setPosition(this.interactHintAt.sprite.x, this.interactHintAt.sprite.y - 30).setVisible(true);
      if (input.interactPressed) {
        this.interactHintAt.interact(this.player);
      }
    } else {
      this.interactLabel.setVisible(false);
    }

    // Exit door interaction
    if (this.roomCleared && Math.abs(this.player.x - this.doorSprite.x) < 28 && Math.abs(this.player.y - this.doorSprite.y) < 60) {
      if (input.interactPressed || input.up) {
        this.advanceRoom();
      }
    }

    // Parallax scroll
    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    this.bgLayers.forEach((layer) => {
      const f = layer.getData('factor') as number;
      layer.tilePositionX = camX * f;
      layer.tilePositionY = camY * f * 0.3;
    });
  }

  private checkRoomClear(): void {
    if (this.roomCleared) return;
    const alive = this.enemies.getChildren().filter((e) => !(e as Enemy).isDead).length;
    if (alive === 0) {
      this.roomCleared = true;
      this.doorSprite.setTint(0x00ffcc);
      this.juice.flash(0x00ffcc, 0.2);
      playSfx('door');
      this.events.emit(EVENTS.ROOM_CLEARED);
      const hint = this.add
        .text(this.doorSprite.x, this.doorSprite.y - 60, '[ E ] PROCEED', { fontFamily: 'monospace', fontSize: '11px', color: '#00ffcc' })
        .setOrigin(0.5)
        .setDepth(500);
      this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  private advanceRoom(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const run = runState.current!;
    const floor = FLOORS[run.floorIndex];
    const shouldRewire = (run.roomIndex + 1) % 3 === 0 && run.roomIndex < floor.rooms - 1;

    // Register listener BEFORE launching Rewire to avoid race
    if (shouldRewire) {
      this.events.once('rewire-done', () => this.advanceRoomCore());
    }

    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (shouldRewire) {
        this.scene.launch('Rewire');
        this.scene.pause();
      } else {
        this.advanceRoomCore();
      }
    });
  }

  private advanceRoomCore(): void {
    const run = runState.current!;
    const floor = FLOORS[run.floorIndex];
    run.roomIndex++;
    if (run.roomIndex >= floor.rooms) {
      // finished floor
      run.floorIndex++;
      run.roomIndex = 0;
      if (run.floorIndex >= FLOORS.length) {
        // won
        run.won = true;
        run.deepestFloorReached = Math.max(run.deepestFloorReached, FLOORS.length);
        metaStore.addScrap(run.scrapEarned);
        metaStore.recordRun(run.deepestFloorReached, true);
        this.scene.stop('UI');
        this.scene.start('Shutdown', { won: true });
        return;
      }
      run.deepestFloorReached = Math.max(run.deepestFloorReached, run.floorIndex + 1);
    }
    this.scene.stop('UI');
    this.scene.restart();
  }

  private onPlayerDied(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const run = runState.current!;
    metaStore.addScrap(Math.floor(run.scrapEarned * 0.5));
    metaStore.recordRun(run.deepestFloorReached, false);
    this.juice.slowMo(600, 0.2);
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('UI');
        this.scene.start('Shutdown', { won: false });
      });
    });
  }
}
