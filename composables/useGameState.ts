import { ref, computed } from 'vue'
import type { CardId, Suit, Value } from '~/utils/cardParser'


export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const VALUES: Value[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const SUIT_NAMES: Record<Suit, string> = {
  spades: 'Пики',
  hearts: 'Червы',
  diamonds: 'Бубны',
  clubs: 'Трефы',
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export const VALUE_DISPLAY: Record<Value, string> = {
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'В',
  Q: 'Д',
  K: 'К',
  A: 'Т',
}

function cardKey(value: Value, suit: Suit): string {
  return `${value}|${suit}`
}

function keyToCard(key: string): CardId {
  const [value, suit] = key.split('|') as [Value, Suit]
  return { value, suit }
}

export function useGameState() {
  const playedSet = ref<Set<string>>(new Set())
  const history = ref<string[]>([])

  const totalPlayed = computed(() => playedSet.value.size)

  function isPlayed(value: Value, suit: Suit): boolean {
    return playedSet.value.has(cardKey(value, suit))
  }

  function playCard(card: CardId): 'ok' | 'already' {
    const key = cardKey(card.value, card.suit)
    if (playedSet.value.has(key)) return 'already'
    playedSet.value = new Set([...playedSet.value, key])
    history.value = [...history.value, key]
    return 'ok'
  }

  function undoLast(): CardId | null {
    if (!history.value.length) return null
    const last = history.value[history.value.length - 1]
    history.value = history.value.slice(0, -1)
    const next = new Set(playedSet.value)
    next.delete(last)
    playedSet.value = next
    return keyToCard(last)
  }

  function resetGame(): void {
    playedSet.value = new Set()
    history.value = []
  }

  return {
    totalPlayed,
    history,
    isPlayed,
    playCard,
    undoLast,
    resetGame,
  }
}
