// Hệ thống Elo chuẩn. K=32.
export const K_FACTOR = 32
export const DEFAULT_ELO = 1200
export const AI_ELO = { easy: 800, medium: 1200, hard: 1600 }

export function expectedScore(myElo, oppElo) {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400))
}

// score: 1 = thắng, 0.5 = hòa, 0 = thua
export function eloDelta(myElo, oppElo, score, k = K_FACTOR) {
  const expected = expectedScore(myElo, oppElo)
  return Math.round(k * (score - expected))
}

// Trả về kết quả (score) cho 2 bên dựa trên trạng thái game
// outcome: 'white_win' | 'black_win' | 'draw'
export function scoresFor(outcome) {
  if (outcome === 'white_win') return { w: 1, b: 0 }
  if (outcome === 'black_win') return { w: 0, b: 1 }
  return { w: 0.5, b: 0.5 }
}
