# CRASH — Game Design Spec
**Date:** 2026-04-07  
**Jam:** Gamedev.js Jam 2026 (13/04 – 26/04)  
**Engine:** Phaser 3.88.2 + React + Vite + TypeScript

---

## Concept

Top-down roguelite với mechanics hoàn toàn movement-based. Không có súng — player kill enemy bằng cách dash vào chúng hoặc kích hoạt environmental hazards. Di chuyển liên tục = bất tử; đứng yên = chết.

**Theme adaptability:**
- Loop → roguelite loop là theme tự nhiên
- Flow → movement is power
- Chaos → chain reactions
- Broken → environments shatter
- Power → momentum = power

---

## Core Loop

```
Vào phòng → Dash vào enemy/object → Chain reaction → Clear room
     ↓
Chọn 1 trong 3 upgrade
     ↓
Phòng tiếp theo (khó hơn)
     ↓
[Chết] → Restart, giữ meta-upgrade
```

---

## Combat Rules

| Action | Result |
|--------|--------|
| Dash vào enemy | Kill ngay (combo bắt đầu ở x1, luôn đủ điều kiện) |
| Dash vào Explosive Barrel | AOE explosion, chain sang barrels khác |
| Dash vào Boulder | Boulder bay theo hướng dash, crush enemy |
| Dash vào Cracked Wall | Tường vỡ, debris 8 hướng |
| Dash vào Electric Panel | Shock enemy trên sàn ướt |
| Đứng yên > 2 giây | Vulnerable — enemy 1-shot player |
| Đang dash | I-frames (bất tử) |

**Combo Multiplier:**
- Kill liên tiếp trong vòng 1.5s → x1 → x2 → x3…
- Multiplier cao → dash nhanh hơn, xa hơn, cooldown ngắn hơn
- Break combo → reset về x1

---

## Room Design & Progression

**Map structure:**
- 5 tầng (floor), mỗi tầng 4–5 phòng + 1 boss room
- Mỗi phòng: grid 16×12 tiles, proc-gen layout
- Phòng types: **Combat** 80% / **Shop** 10% / **Elite** 10%

**Environmental Objects:**

| Object | Trigger | Damage |
|--------|---------|--------|
| Explosive Barrel | Dash collision | AOE, chains |
| Boulder | Dash collision | Linear crush |
| Electric Panel | Dash collision | Floor AOE |
| Cracked Wall | Dash collision | 8-dir debris |

**Enemies — 4 loại:**

| Loại | Behavior |
|------|----------|
| Grunt | Move thẳng về phía player |
| Shielder | Luôn xoay mặt về phía player, block dash từ phía trước — phải vòng ra sau mới kill được |
| Bomber | Chạy lại rồi nổ, có thể redirect bằng dash |
| Turret | Đứng yên, bắn theo pattern |

**Upgrade categories:**
- *Dash*: cooldown giảm, distance tăng, extra dash charge
- *Explosion*: chain radius to hơn, double chain, sticky fire
- *Momentum*: combo window dài hơn, multiplier cap cao hơn
- *Utility*: room preview, 1 revival, HP tăng

**Meta-progression (giữ sau khi chết):**
- Mở khóa upgrade pool mới
- Starting stats tăng nhẹ
- Mở character thứ 2 (dash style khác)

---

## Visual Style

- Pixel art top-down, 16×16px sprites
- Palette tối, industrial/dungeon
- Player animation tập trung vào dash trail (afterimage effect)

**Juice effects (must-have):**
- Screen shake: mỗi dash + mỗi explosion
- Afterimage trail khi dash (ghost copies mờ dần)
- Particle burst khi kill
- 2–3 frame slow-mo flash khi combo x3+
- Camera zoom-out nhẹ khi room clear

---

## Technical Architecture

**Scene flow:**
```
BootScene → PreloadScene → MenuScene → GameScene + UIScene (parallel)
                                              ↓
                                       UpgradeScene (overlay)
```

**Phaser systems:**
- Arcade Physics: player + enemy collision, dash velocity
- Tilemaps: proc-gen room bằng weighted random placement
- Groups: enemy pool, particle pool, debris pool
- EventEmitter: combo system, room clear trigger
- Camera: shake, zoom, follow

**Data flow:**
```
PlayerController → DashSystem → CollisionHandler
                                      ↓
                             EnvironmentSystem
                                      ↓
                             ComboTracker → UIScene
```

**File structure:**
```
src/game/
  scenes/          BootScene, PreloadScene, MenuScene, GameScene, UIScene, UpgradeScene
  entities/        Player.ts, Enemy.ts, Barrel.ts, Boulder.ts, CrackedWall.ts
  systems/         DashSystem.ts, ComboSystem.ts, RoomGenerator.ts, UpgradeSystem.ts
  data/            upgrades.ts, enemies.ts
  utils/           ObjectPool.ts
```

---

## Audio

- SFX: jsfxr (toàn bộ, nhanh, miễn phí)
- Music: 1 bài lo-fi/synthwave loop cho gameplay, 1 bài riêng cho boss
- Generated hoặc Creative Commons

---

## Scope Management (cut nếu cần)

| Feature | Priority | Cut nếu |
|---------|----------|---------|
| Core dash combat | Must | Không bao giờ |
| Barrel + Boulder | Must | Không bao giờ |
| Cracked Wall | Should | Tuần 2 hết thời gian |
| Electric Panel | Could | Dễ cut |
| Boss room | Should | Cut nếu thiếu thời gian |
| Meta-progression | Could | Cut, chỉ giữ per-run |
| Character thứ 2 | Won't | Cut hoàn toàn nếu cần |

---

## Challenges (3 cùng lúc)

- **Build it with Phaser** → dùng Phaser làm engine chính ✓
- **Deploy to Wavedash** → `wavedash.toml` đã có, cần `game_id` thực
- **Open Source by GitHub** → repo public ✓
