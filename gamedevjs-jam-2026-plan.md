# Gamedev.js Jam 2026 - Kế hoạch tham gia

## Tổng quan Jam

- **Thời gian:** 13/04 - 26/04/2026 (13 ngày)
- **Yêu cầu:** Game HTML5 chạy trên trình duyệt, nội dung mới, tiếng Anh mặc định
- **Theme:** Công bố lúc bắt đầu jam (13/04, 22:00 giờ Việt Nam)
- **Voting:** 26/04 - 09/05, do người tham gia bình chọn lẫn nhau
- **Tiêu chí đánh giá:** Innovation, Theme, Gameplay, Graphics, Audio
- **Giải thưởng tổng:** $30k
- **Số người tham gia:** 1,345+
- **Solo hoặc team**, có thể nộp nhiều bài

## Chiến lược: Nhắm 3 Challenge cùng lúc

Làm 1 game, đăng ký cả 3 challenge - không xung đột nhau:

### 1. Build it with Phaser

- Dùng Phaser làm engine chính
- **Giải:** 10x Phaser Editor Pro (annual) + 5x Vampire Survivors bundle

### 2. Deploy to Wavedash

- Deploy game lên Wavedash
- **Giải tiền mặt:** $1,000 / $750 / $500 / $250

### 3. Open Source by GitHub

- Public repo trên GitHub
- **Giải:** 5x GitHub Copilot Pro 12 tháng

## Tech Stack đã chọn

- **Game engine:** Phaser (v3.88.2 stable hoặc v4.0.0-rc.7)
- **Frontend:** React + Vite (Phaser hỗ trợ template React sẵn)
- **Deploy:** Wavedash (CLI + wavedash.toml)
- **Source control:** GitHub (public repo)

## Phaser - Thông tin chính

- Framework game 2D miễn phí, hỗ trợ Canvas và WebGL
- Setup nhanh: `npm create @phaserjs/game@latest` - có template React + Vite
- Phiên bản hiện tại: v3.88.2 (stable), v4.0.0-rc.7 (mới nhất)
- Tài liệu: https://docs.phaser.io
- Ví dụ: https://phaser.io/examples

## Wavedash - Thông tin chính

- Nền tảng phân phối game web, hỗ trợ bất kỳ game HTML5 nào
- Quy trình deploy:
  1. Cài CLI: `brew install wvdsh/tap/wavedash`
  2. Tạo file `wavedash.toml` (khai báo game_id, upload_dir)
  3. Push build: `wavedash build push`
- SDK có sẵn: leaderboard, multiplayer, achievements, cloud save (tùy chọn)
- Docs: https://docs.wavedash.com
- Dashboard: https://wavedash.com/developers

## Việc cần làm trước jam (07/04 - 12/04)

### Ngày 1-2: Làm quen Phaser

- [ ] Chạy `npm create @phaserjs/game@latest`, chọn template React + Vite
- [ ] Học API cơ bản: load sprite, tạo scene, xử lý input, collision
- [ ] Đọc docs và xem examples trên phaser.io

### Ngày 3-4: Làm prototype

- [ ] Build một mini game đơn giản để nắm workflow
- [ ] Thử nghiệm build output (thư mục dist)

### Ngày 5: Setup deploy pipeline

- [ ] Tạo GitHub repo public
- [ ] Cài Wavedash CLI, tạo tài khoản developer
- [ ] Thử deploy prototype lên Wavedash

### Ngày 6: Chuẩn bị tinh thần

- [ ] Join Discord Gamedev.js: https://gamedevjs.com/discord
- [ ] Join Discord Wavedash
- [ ] Chuẩn bị asset tools (Aseprite, sfxr, v.v.)
- [ ] Nghỉ ngơi, chờ theme

## Trong jam (13/04 - 26/04)

- [ ] Ngày 1: Nhận theme, brainstorm, lên game design document ngắn
- [ ] Ngày 2-5: Core gameplay loop
- [ ] Ngày 6-9: Content, level design, UI
- [ ] Ngày 10-12: Polish - graphics, audio, juice effects
- [ ] Ngày 13: Test, fix bug, deploy final build lên Wavedash, submit trên itch.io

## Links hữu ích

- Jam page: https://itch.io/jam/gamedevjs-2026
- Phaser docs: https://docs.phaser.io
- Phaser examples: https://phaser.io/examples
- Wavedash docs: https://docs.wavedash.com
- Gamedev.js Discord: https://gamedevjs.com/discord
