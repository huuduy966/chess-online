# Chess Online

Website chơi cờ vua với 3 chế độ:

- **Local** — 2 người chơi trên cùng một máy
- **vs AI** — đấu với máy (minimax + alpha-beta, 3 mức độ)
- **Online** — chơi qua mạng, tạo/tham gia phòng bằng mã phòng, có chat trong ván

## Tech stack

- **Client:** React 18, Vite, `chess.js` (luật cờ), `react-chessboard` (UI bàn cờ), `react-router-dom`, `socket.io-client`
- **Server:** Node.js, Express, Socket.io, `chess.js` (validate move server-side)

## Cài đặt

```bash
# Cài dependencies cho cả client và server (cần Node 18+)
npm run install:all
```

## Chạy

```bash
# Chạy đồng thời cả client (port 5173) và server (port 3001)
npm run dev
```

Mở `http://localhost:5173` trong trình duyệt.

- Client dev server: `http://localhost:5173`
- Game server: `http://localhost:3001`

Chạy riêng:

```bash
npm run dev:client   # chỉ client
npm run dev:server   # chỉ server (cần cho mode Online)
```

## Build production

```bash
cd client && npm run build       # build vào client/dist
cd server && npm start           # chạy server
```

Để deploy server riêng, đặt biến môi trường `VITE_SERVER_URL` cho client trỏ về URL server thật.

## Cấu trúc

```
Chess/
├── client/                  # Vite + React
│   ├── src/
│   │   ├── pages/           # Home, LocalGame, AIGame, OnlineLobby, OnlineGame
│   │   ├── components/      # Board, StatusBar, MoveHistory, GameOverModal
│   │   ├── utils/           # ai.js (minimax), socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── server/
    ├── index.js             # Express + Socket.io, room management
    └── package.json
```

## Tính năng

- Bàn cờ kéo-thả hoặc click để di chuyển, highlight nước đi hợp lệ
- Phong cấp tự động lên Hậu (có thể mở rộng để chọn quân)
- Phát hiện chiếu, chiếu hết, hết nước, lặp 3 lần, không đủ quân
- Lịch sử nước đi (PGN notation)
- Undo (mode Local), reset, chọn màu (mode AI)
- Multiplayer: room code 6 ký tự, server validate mọi nước đi, chat, đầu hàng, khán giả
