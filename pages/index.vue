<script setup lang="ts">
import { parseCard, type Suit } from '~/utils/cardParser'
import {
  useGameState,
  SUITS,
  VALUES,
  SUIT_NAMES,
  SUIT_SYMBOLS,
  VALUE_DISPLAY,
} from '~/composables/useGameState'
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'

const { totalPlayed, history, isPlayed, playCard, undoLast, resetGame } =
  useGameState()

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success' as 'success' | 'warning' | 'error' | 'info',
})
const confirmReset = ref(false)
const isSoundDetected = ref(false)
const interimText = ref('')

function showSnack(message: string, color: typeof snackbar.color) {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function handleTranscripts(transcripts: string[]) {
  for (const t of transcripts) {
    const card = parseCard(t)
    if (card) {
      const result = playCard(card)
      if (result === 'ok') {
        const label = `${VALUE_DISPLAY[card.value]} ${SUIT_SYMBOLS[card.suit]}`
        showSnack(`✓ ${label}`, 'success')
      } else {
        showSnack('Эта карта уже вышла!', 'warning')
      }
      return
    }
  }
  // Show what was heard so user can understand if it's a parsing or recognition issue
  const heard = transcripts[0] ? `"${transcripts[0]}"` : ''
  showSnack(heard ? `Не понял: ${heard}` : 'Карта не распознана', 'error')
}

function handleError(msg: string) {
  showSnack(msg, 'error')
}

function handleSoundStart() {
  isSoundDetected.value = true
}

function handleInterim(text: string) {
  interimText.value = text
}

const { isListening, isSupported, startListening, stopListening } =
  useSpeechRecognition(handleTranscripts, handleError, handleSoundStart, handleInterim)

watch(isListening, (val) => {
  if (!val) {
    interimText.value = ''
    isSoundDetected.value = false
  }
})

function onMicClick() {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

function handleUndo() {
  const card = undoLast()
  if (card) {
    const label = `${VALUE_DISPLAY[card.value]} ${SUIT_SYMBOLS[card.suit]}`
    showSnack(`Отменено: ${label}`, 'info')
  }
}

function handleReset() {
  resetGame()
  confirmReset.value = false
  showSnack('Новая игра', 'info')
}

const suitColorClass = (suit: Suit) =>
  suit === 'hearts' || suit === 'diamonds' ? 'suit--red' : 'suit--black'
</script>

<template>
  <v-app>
    <!-- App bar -->
    <v-app-bar
      color="primary"
      density="compact"
      flat
    >
      <v-app-bar-title class="app-title">
        <span class="app-title__icon">♠</span> Белка
      </v-app-bar-title>
      <template #append>
        <v-btn
          icon
          variant="text"
          color="white"
          :disabled="history.length === 0"
          aria-label="Отменить"
          @click="handleUndo"
        >
          <v-icon>mdi-undo</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          color="white"
          aria-label="Новая игра"
          @click="confirmReset = true"
        >
          <v-icon>mdi-restart</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <v-main class="main-bg">
      <div class="content-area">
        <!-- Stats bar -->
        <div class="stats-bar">
          <span class="stats-bar__text">Вышло карт:</span>
          <span class="stats-bar__count">{{ totalPlayed }} / 32</span>
          <div class="stats-bar__progress">
            <div
              class="stats-bar__fill"
              :style="{ width: `${(totalPlayed / 32) * 100}%` }"
            />
          </div>
        </div>

        <!-- Card grid by suit -->
        <div class="suits-grid">
          <div
            v-for="suit in SUITS"
            :key="suit"
            class="suit-row"
          >
            <div class="suit-row__header">
              <span :class="['suit-row__symbol', suitColorClass(suit)]">
                {{ SUIT_SYMBOLS[suit] }}
              </span>
              <span class="suit-row__name">{{ SUIT_NAMES[suit] }}</span>
            </div>
            <div class="suit-row__cards">
              <PlayingCard
                v-for="value in VALUES"
                :key="`${suit}-${value}`"
                :value="value"
                :suit="suit"
                :played="isPlayed(value, suit)"
              />
            </div>
          </div>
        </div>

        <!-- Listening hint -->
        <Transition name="fade">
          <div v-if="isListening" class="listening-hint" :class="{ 'listening-hint--sound': !!interimText }">
            <template v-if="interimText">
              {{ interimText }}
            </template>
            <template v-else-if="isSoundDetected">
              Обрабатываю...
            </template>
            <template v-else>
              Назовите карту
            </template>
          </div>
        </Transition>

        <!-- Spacer for FAB -->
        <div style="height: 104px" />
      </div>
    </v-main>

    <!-- Voice FAB -->
    <div class="voice-fab">
      <div v-if="!isSupported" class="no-support-msg">
        Распознавание речи не поддерживается
      </div>
      <VoiceButton
        :is-listening="isListening"
        :is-supported="isSupported"
        @click="onMicClick"
      />
    </div>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="2200"
      location="top"
      rounded="lg"
    >
      <span class="snack-text">{{ snackbar.message }}</span>
    </v-snackbar>

    <!-- Reset dialog -->
    <v-dialog v-model="confirmReset" max-width="300" :scrim-opacity="0.5">
      <v-card rounded="xl">
        <v-card-title class="dialog-title">Новая игра?</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis">
          Все сыгранные карты будут сброшены.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmReset = false">Отмена</v-btn>
          <v-btn color="error" variant="tonal" @click="handleReset">
            Сбросить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.main-bg {
  background: #f5f5f5;
}

.content-area {
  padding: 0 12px 16px;
  max-width: 520px;
  margin: 0 auto;
}

/* Stats */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 8px;
  font-size: 13px;
}

.stats-bar__text {
  color: #616161;
}

.stats-bar__count {
  font-weight: 700;
  color: #1a237e;
  min-width: 48px;
}

.stats-bar__progress {
  flex: 1;
  height: 5px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.stats-bar__fill {
  height: 100%;
  background: #1a237e;
  border-radius: 3px;
  transition: width 0.35s ease;
}

/* Suits */
.suits-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.suit-row__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.suit-row__symbol {
  font-size: 18px;
  line-height: 1;
}

.suit--red {
  color: #c62828;
}

.suit--black {
  color: #212121;
}

.suit-row__name {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #424242;
  text-transform: uppercase;
}

.suit-row__cards {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 5px;
}

/* Listening hint */
.listening-hint {
  text-align: center;
  font-size: 13px;
  color: #757575;
  font-weight: 500;
  padding: 12px 0 0;
  animation: blink 1.2s ease-in-out infinite;
}

.listening-hint--sound {
  color: #2e7d32;
  animation: none;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* FAB */
.voice-fab {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.no-support-msg {
  font-size: 11px;
  color: #757575;
  text-align: center;
  max-width: 200px;
}

/* Snackbar */
.snack-text {
  font-size: 15px;
  font-weight: 500;
}

/* Dialog */
.dialog-title {
  font-size: 17px !important;
  padding-top: 20px !important;
}

/* App bar title */
.app-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.app-title__icon {
  opacity: 0.85;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
