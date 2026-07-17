export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Value = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface CardId {
  value: Value
  suit: Suit
}

const VALUE_MAP: Record<string, Value> = {
  семь: '7',
  восемь: '8',
  девять: '9',
  десять: '10',
  валет: 'J',
  дама: 'Q',
  король: 'K',
  туз: 'A',
}

const SUIT_MAP: Record<string, Suit> = {
  // Spades
  пик: 'spades',
  пики: 'spades',
  пиков: 'spades',
  пиковый: 'spades',
  пиковая: 'spades',
  пиковой: 'spades',
  пику: 'spades',
  // Hearts
  червей: 'hearts',
  червы: 'hearts',
  черви: 'hearts',
  черва: 'hearts',
  червонный: 'hearts',
  червонная: 'hearts',
  червонной: 'hearts',
  // Diamonds
  бубен: 'diamonds',
  бубны: 'diamonds',
  бубна: 'diamonds',
  бубей: 'diamonds',
  бубновый: 'diamonds',
  бубновая: 'diamonds',
  бубновой: 'diamonds',
  бубну: 'diamonds',
  // Clubs
  треф: 'clubs',
  трефы: 'clubs',
  трефей: 'clubs',
  трефовый: 'clubs',
  трефовая: 'clubs',
  трефовой: 'clubs',
  трефу: 'clubs',
  крести: 'clubs',
  крестей: 'clubs',
  крестовый: 'clubs',
  крестовая: 'clubs',
  крестовой: 'clubs',
  крест: 'clubs',
}

export function parseCard(transcript: string): CardId | null {
  const words = transcript.toLowerCase().trim().split(/\s+/)

  let value: Value | null = null
  let suit: Suit | null = null

  for (const word of words) {
    if (!value && VALUE_MAP[word]) value = VALUE_MAP[word]
    if (!suit && SUIT_MAP[word]) suit = SUIT_MAP[word]
  }

  if (value && suit) return { value, suit }
  return null
}
