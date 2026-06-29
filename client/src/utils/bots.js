// 11 bot trải đều từ 800 đến 2800 Elo, cách nhau 200.
// Tên không dấu, không space (đồng nhất với bot online).
// Mỗi bot có {depth, randomChance} điều chỉnh sức cờ thật của engine minimax.
export const BOTS = [
  { id: 'bot1',  name: 'Bot 1',  elo:  800, depth: 1, randomChance: 0.60 },
  { id: 'bot2',  name: 'Bot 2',  elo: 1000, depth: 1, randomChance: 0.30 },
  { id: 'bot3',  name: 'Bot 3',  elo: 1200, depth: 2, randomChance: 0.30 },
  { id: 'bot4',  name: 'Bot 4',  elo: 1400, depth: 2, randomChance: 0.12 },
  { id: 'bot5',  name: 'Bot 5',  elo: 1600, depth: 2, randomChance: 0 },
  { id: 'bot6',  name: 'Bot 6',  elo: 1800, depth: 3, randomChance: 0.08 },
  { id: 'bot7',  name: 'Bot 7',  elo: 2000, depth: 3, randomChance: 0 },
  { id: 'bot8',  name: 'Bot 8',  elo: 2200, depth: 3, randomChance: 0 },
  { id: 'bot9',  name: 'Bot 9',  elo: 2400, depth: 4, randomChance: 0 },
  { id: 'bot10', name: 'Bot 10', elo: 2600, depth: 4, randomChance: 0 },
  { id: 'bot11', name: 'Bot 11', elo: 2800, depth: 4, randomChance: 0 },
]

export const DEFAULT_BOT_ID = 'bot5'

export function getBot(id) {
  return BOTS.find(b => b.id === id) || BOTS.find(b => b.id === DEFAULT_BOT_ID)
}
