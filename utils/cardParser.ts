export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Value = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface CardId {
  value: Value
  suit: Suit
}

// ─── Value map ────────────────────────────────────────────────────────────────
const VALUE_MAP: Record<string, Value> = {
  // Standard
  семь: '7',   восемь: '8',  девять: '9',  десять: '10',
  валет: 'J',  дама: 'Q',    король: 'K',  туз: 'A',

  // Digit strings (ASR sometimes emits digits directly)
  '7': '7', '8': '8', '9': '9', '10': '10',

  // Inflected & truncated forms
  семи: '7',     семью: '7',
  восем: '8',    восьми: '8',    восьмью: '8',
  девяти: '9',   девят: '9',     девятью: '9',
  десяти: '10',  десят: '10',    десятью: '10', десяток: '10',

  валету: 'J',   валета: 'J',    валетом: 'J',
  дамы: 'Q',     даму: 'Q',      дамой: 'Q',
  короля: 'K',   королей: 'K',   королю: 'K',  королём: 'K', королем: 'K',
  туза: 'A',     тузу: 'A',      тузы: 'A',    тузом: 'A',

  // Known iOS / Chrome ASR misrecognitions
  балет: 'J',    // валет → балет  (в/б confusion)
  залет: 'J',    // валет → залет
  лама: 'Q',     // дама → лама
  тус: 'A',      // туз (informal)
  туса: 'A',
  двести: '10',  // "десять" → "двести" (iOS ASR confusion)
  '200': '10',   // same, digit form
  десятки: '10',
}

// ─── Suit map ─────────────────────────────────────────────────────────────────
const SUIT_MAP: Record<string, Suit> = {
  // Spades
  пики: 'spades',  пик: 'spades',   пику: 'spades',  пике: 'spades',
  пиков: 'spades', пикой: 'spades', пиком: 'spades',
  пиковый: 'spades', пиковая: 'spades', пиковой: 'spades',

  // Hearts
  червей: 'hearts',  черви: 'hearts',  черва: 'hearts',  червы: 'hearts',
  чёрви: 'hearts',   черво: 'hearts',
  червям: 'hearts',  червями: 'hearts', червях: 'hearts',
  червонный: 'hearts', червонная: 'hearts', червонной: 'hearts',

  // Diamonds
  бубен: 'diamonds', бубны: 'diamonds', бубна: 'diamonds', бубей: 'diamonds',
  бубну: 'diamonds',
  бубнам: 'diamonds', бубнами: 'diamonds', бубнах: 'diamonds',
  бубновый: 'diamonds', бубновая: 'diamonds', бубновой: 'diamonds',

  // Clubs
  треф: 'clubs',    трефы: 'clubs',  трефей: 'clubs',  трефу: 'clubs',
  трефам: 'clubs',  трефами: 'clubs',
  трефовый: 'clubs', трефовая: 'clubs', трефовой: 'clubs',
  крести: 'clubs',   крестей: 'clubs', кресту: 'clubs',  крест: 'clubs',
  крестам: 'clubs',  крестами: 'clubs',
  крестовый: 'clubs', крестовая: 'clubs', крестовой: 'clubs',
}

// ─── Fuzzy matching ───────────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1])
      prev = tmp
    }
  }
  return row[n]
}

// Max allowed edit distance scaled by word length
function distLimit(len: number): number {
  if (len <= 3) return 0  // short words: exact only
  if (len <= 5) return 1  // medium: 1 char diff
  return 2                 // longer: 2 chars diff
}

function fuzzyLookup<T>(word: string, map: Record<string, T>): T | undefined {
  if (map[word] !== undefined) return map[word]
  const limit = distLimit(word.length)
  if (limit === 0) return undefined
  let best: T | undefined
  let bestDist = limit + 1
  for (const key in map) {
    if (Math.abs(key.length - word.length) > limit) continue
    const d = levenshtein(word, key)
    if (d <= limit && d < bestDist) {
      bestDist = d
      best = map[key]
    }
  }
  return best
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function parseCard(transcript: string): CardId | null {
  const words = transcript
    .toLowerCase()
    .replace(/[.,!?;:'"«»]/g, '')
    .trim()
    .split(/\s+/)

  let value: Value | undefined
  let suit: Suit | undefined

  for (const word of words) {
    if (value === undefined) {
      const v = fuzzyLookup(word, VALUE_MAP)
      if (v !== undefined) { value = v; continue }
    }
    if (suit === undefined) {
      const s = fuzzyLookup(word, SUIT_MAP)
      if (s !== undefined) suit = s
    }
  }

  if (value !== undefined && suit !== undefined) return { value, suit }
  return null
}

// Exported for grammar hints
export const CARD_VALUE_WORDS = ['семь','восемь','девять','десять','валет','дама','король','туз']
export const CARD_SUIT_WORDS  = ['пики','пик','червей','черви','бубен','бубны','треф','трефы','крести','крест']
