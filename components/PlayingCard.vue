<script setup lang="ts">
import type { Suit, Value } from '~/utils/cardParser'
import { VALUE_DISPLAY, SUIT_SYMBOLS } from '~/composables/useGameState'

const props = defineProps<{
  value: Value
  suit: Suit
  played: boolean
}>()

const isRed = computed(() => props.suit === 'hearts' || props.suit === 'diamonds')
const color = computed(() => (props.played ? '#bdbdbd' : isRed.value ? '#c62828' : '#212121'))
const displayValue = computed(() => VALUE_DISPLAY[props.value])
const suitSymbol = computed(() => SUIT_SYMBOLS[props.suit])
</script>

<template>
  <div class="card-wrap">
    <svg
      viewBox="0 0 44 62"
      xmlns="http://www.w3.org/2000/svg"
      class="playing-card"
      :class="{ 'playing-card--played': played }"
    >
      <!-- Card background -->
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="61"
        rx="3.5"
        fill="white"
        :stroke="played ? '#e0e0e0' : '#9e9e9e'"
        stroke-width="0.8"
      />

      <!-- Top-left: value -->
      <text
        x="3"
        y="12"
        font-size="10.5"
        font-family="Georgia, 'Times New Roman', serif"
        font-weight="bold"
        :fill="color"
      >{{ displayValue }}</text>

      <!-- Top-left: suit -->
      <text
        x="3"
        y="22"
        font-size="9"
        font-family="Arial, sans-serif"
        :fill="color"
      >{{ suitSymbol }}</text>

      <!-- Center suit -->
      <text
        x="22"
        y="37"
        font-size="20"
        font-family="Arial, sans-serif"
        :fill="color"
        text-anchor="middle"
        dominant-baseline="middle"
      >{{ suitSymbol }}</text>

      <!-- Bottom-right (rotated 180°) -->
      <g transform="rotate(180, 22, 31)">
        <text
          x="3"
          y="12"
          font-size="10.5"
          font-family="Georgia, 'Times New Roman', serif"
          font-weight="bold"
          :fill="color"
        >{{ displayValue }}</text>
        <text
          x="3"
          y="22"
          font-size="9"
          font-family="Arial, sans-serif"
          :fill="color"
        >{{ suitSymbol }}</text>
      </g>

      <!-- X overlay when played -->
      <template v-if="played">
        <line
          x1="3" y1="3" x2="41" y2="59"
          stroke="#e53935" stroke-width="2.2"
          stroke-linecap="round" opacity="0.85"
        />
        <line
          x1="41" y1="3" x2="3" y2="59"
          stroke="#e53935" stroke-width="2.2"
          stroke-linecap="round" opacity="0.85"
        />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.card-wrap {
  width: 100%;
  aspect-ratio: 44 / 62;
  cursor: default;
  user-select: none;
}

.playing-card {
  width: 100%;
  height: 100%;
  display: block;
  transition: opacity 0.2s;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18));
}

.playing-card--played {
  opacity: 0.75;
}
</style>
