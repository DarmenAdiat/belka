<script setup lang="ts">
defineProps<{
  isListening: boolean
  isSupported: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <div class="voice-wrap">
    <div v-if="isListening" class="pulse-ring" />
    <div v-if="isListening" class="pulse-ring pulse-ring--delay" />
    <button
      class="voice-btn"
      :class="{ 'voice-btn--active': isListening }"
      :disabled="!isSupported"
      :aria-label="isListening ? 'Остановить' : 'Назвать карту'"
      @click="$emit('click')"
    >
      <v-icon size="34" color="white">
        {{ isListening ? 'mdi-microphone-outline' : 'mdi-microphone' }}
      </v-icon>
    </button>
  </div>
</template>

<style scoped>
.voice-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
}

.voice-btn {
  position: relative;
  z-index: 2;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: #1a237e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(26, 35, 126, 0.45);
  transition: background 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.voice-btn--active {
  background: #c62828;
}

.voice-btn:disabled {
  background: #9e9e9e;
  cursor: not-allowed;
}

.voice-btn:not(:disabled):active {
  transform: scale(0.93);
}

.pulse-ring {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid #c62828;
  animation: pulse 1.4s ease-out infinite;
  opacity: 0;
  z-index: 1;
}

.pulse-ring--delay {
  animation-delay: 0.5s;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
</style>
