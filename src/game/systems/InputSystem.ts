import Phaser from 'phaser';

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  up: boolean;
  jump: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  attackHeld: boolean;
  attackPressed: boolean;
  specialPressed: boolean;
  interactPressed: boolean;
}

export class InputSystem {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
  };
  private pointerDown = false;
  private pointerDownEdge = false;
  private rightEdge = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = {
      a: kb.addKey('A'),
      d: kb.addKey('D'),
      w: kb.addKey('W'),
      s: kb.addKey('S'),
      space: kb.addKey('SPACE'),
      shift: kb.addKey('SHIFT'),
      j: kb.addKey('J'),
      k: kb.addKey('K'),
      e: kb.addKey('E'),
    };

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button === 0) {
        this.pointerDown = true;
        this.pointerDownEdge = true;
      } else if (p.button === 2) {
        this.rightEdge = true;
      }
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button === 0) this.pointerDown = false;
    });
    // prevent context menu on right-click
    scene.input.mouse?.disableContextMenu();
  }

  snapshot(): InputState {
    const justDown = (k: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(k);
    const jump = justDown(this.keys.w) || justDown(this.cursors.up!) || justDown(this.keys.space);
    const dash = justDown(this.keys.shift);
    const attackPressed = justDown(this.keys.j) || this.pointerDownEdge;
    const attackHeld = this.keys.j.isDown || this.pointerDown;
    const special = justDown(this.keys.k) || this.rightEdge;
    const interact = justDown(this.keys.e);

    const state: InputState = {
      left: this.keys.a.isDown || this.cursors.left!.isDown,
      right: this.keys.d.isDown || this.cursors.right!.isDown,
      up: this.keys.w.isDown || this.cursors.up!.isDown,
      down: this.keys.s.isDown || this.cursors.down!.isDown,
      jump: this.keys.w.isDown || this.cursors.up!.isDown || this.keys.space.isDown,
      jumpPressed: jump,
      dashPressed: dash,
      attackHeld,
      attackPressed,
      specialPressed: special,
      interactPressed: interact,
    };

    this.pointerDownEdge = false;
    this.rightEdge = false;
    return state;
  }
}
