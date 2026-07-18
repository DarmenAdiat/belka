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

  // Digit strings — Chrome ASR often emits digits directly
  '7': '7', '8': '8', '9': '9', '10': '10',

  // Inflected & truncated forms
  семи: '7',     семью: '7',
  восем: '8',    восьми: '8',   восьмью: '8',
  девяти: '9',   девят: '9',    девятью: '9',

  // "Десять" — many forms because Chrome is inconsistent here
  десяти: '10',  десят: '10',   десятью: '10',
  десятка: '10', десятки: '10', десятку: '10', десятке: '10',
  десяткой: '10', десяткою: '10',
  десятый: '10', десятая: '10', десятую: '10', десятого: '10',
  десяток: '10',

  валету: 'J',   валета: 'J',   валетом: 'J',
  дамы: 'Q',     даму: 'Q',     дамой: 'Q',
  короля: 'K',   королей: 'K',  королю: 'K',  королём: 'K', королем: 'K',
  туза: 'A',     тузу: 'A',     тузы: 'A',    тузом: 'A',

  // Known iOS / Chrome misrecognitions
  балет: 'J',   залет: 'J',
  лама: 'Q',
  тус: 'A',     туса: 'A',
  двести: '10', '200': '10',  // "десять" misheard as "двести"

  // English fallback (in case lang detection glitches)
  ten: '10', jack: 'J', queen: 'Q', king: 'K', ace: 'A',
  seven: '7', eight: '8', nine: '9',
}

// ─── Suit map ─────────────────────────────────────────────────────────────────
const SUIT_MAP: Record<string, Suit> = {
  // Spades
  пики: 'spades',  пик: 'spades',   пику: 'spades',  пике: 'spades',
  пиков: 'spades', пикой: 'spades', пиком: 'spades',
  пиковый: 'spades', пиковая: 'spades', пиковой: 'spades',

  // Hearts
  червей: 'hearts', черви: 'hearts', черва: 'hearts',  червы: 'hearts',
  чёрви: 'hearts',  черво: 'hearts',
  червям: 'hearts', червями: 'hearts', червях: 'hearts',
  червонный: 'hearts', червонная: 'hearts', червонной: 'hearts',

  // Diamonds
  бубен: 'diamonds', бубны: 'diamonds', бубна: 'diamonds', бубей: 'diamonds',
  бубну: 'diamonds',
  бубнам: 'diamonds', бубнами: 'diamonds', бубнах: 'diamonds',
  бубновый: 'diamonds', бубновая: 'diamonds', бубновой: 'diamonds',

  // Clubs
  треф: 'clubs',  трефы: 'clubs',  трефей: 'clubs',  трефу: 'clubs',
  трефам: 'clubs', трефами: 'clubs',
  трефовый: 'clubs', трефовая: 'clubs', трефовой: 'clubs',
  крести: 'clubs',  крестей: 'clubs', кресту: 'clubs',  крест: 'clubs',
  крестам: 'clubs', крестами: 'clubs',
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

function distLimit(len: number): number {
  if (len <= 3) return 0
  if (len <= 5) return 1
  return 2
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

export function normalizeWords(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[.,!?;:'"«»\-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

// Greedy parse from startIndex; returns matched card and index past last consumed word.
export function parseCardFromWords(
  words: string[],
  startIndex: number,
): { value: Value; suit: Suit; endIndex: number } | null {
  let value: Value | undefined
  let suit: Suit | undefined
  let valueIdx = -1
  let suitIdx = -1

  for (let i = startIndex; i < words.length; i++) {
    const word = words[i]
    if (!word) continue

    if (value === undefined) {
      const v = fuzzyLookup(word, VALUE_MAP)
      if (v !== undefined) { value = v; valueIdx = i; continue }
    }

    if (suit === undefined) {
      const s = fuzzyLookup(word, SUIT_MAP)
      if (s !== undefined) { suit = s; suitIdx = i }
    }

    if (value !== undefined && suit !== undefined) break
  }

  if (value !== undefined && suit !== undefined) {
    return { value, suit, endIndex: Math.max(valueIdx, suitIdx) + 1 }
  }
  return null
}

export function parseCard(transcript: string): CardId | null {
  const words = normalizeWords(transcript)
  console.log('[PARSE] transcript:', JSON.stringify(transcript), '→ words:', words)

  let value: Value | undefined
  let suit: Suit | undefined

  for (const word of words) {
    if (value === undefined) {
      const v = fuzzyLookup(word, VALUE_MAP)
      console.log(`[PARSE]   "${word}" → value: ${v ?? 'none'}`)
      if (v !== undefined) { value = v; continue }
    }

    if (suit === undefined) {
      const s = fuzzyLookup(word, SUIT_MAP)
      console.log(`[PARSE]   "${word}" → suit: ${s ?? 'none'}`)
      if (s !== undefined) suit = s
    }
  }

  const result = value !== undefined && suit !== undefined ? { value, suit } : null
  console.log('[PARSE] result:', result)
  return result
}

// Exported for SpeechGrammarList hints
export const CARD_VALUE_WORDS = ['семь','восемь','девять','десять','валет','дама','король','туз']
export const CARD_SUIT_WORDS  = ['пики','пик','червей','черви','бубен','бубны','треф','трефы','крести','крест']
