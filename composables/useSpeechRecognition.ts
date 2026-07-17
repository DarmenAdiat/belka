import { ref, onUnmounted } from 'vue'

export function useSpeechRecognition(
  onResult: (transcripts: string[]) => void,
  onError: (message: string) => void,
  onSoundStart?: () => void,
) {
  const isListening = ref(false)
  const isSupported = ref(false)
  let current: any = null

  if (import.meta.client) {
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (API) isSupported.value = true
  }

  function startListening(): void {
    if (!import.meta.client || isListening.value) return

    // Create a fresh instance every time — iOS Safari cannot reuse ended instances
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!API) return

    const r = new API()
    r.lang = 'ru-RU'
    r.continuous = false
    r.interimResults = false
    r.maxAlternatives = 5

    r.onsoundstart = () => {
      onSoundStart?.()
    }

    r.onresult = (event: any) => {
      isListening.value = false
      const results = event.results[0]
      const transcripts: string[] = []
      for (let i = 0; i < results.length; i++) {
        transcripts.push(results[i].transcript)
      }
      onResult(transcripts)
    }

    r.onerror = (event: any) => {
      isListening.value = false
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') {
        onError('Ничего не услышано — попробуйте ещё раз')
      } else if (event.error === 'not-allowed') {
        onError('Нет доступа к микрофону')
      } else if (event.error === 'network') {
        onError('Нет сети — распознавание недоступно')
      } else {
        onError(`Ошибка: ${event.error}`)
      }
    }

    r.onend = () => {
      isListening.value = false
      current = null
    }

    current = r
    try {
      r.start()
      isListening.value = true
    } catch {
      isListening.value = false
      current = null
      onError('Не удалось запустить микрофон')
    }
  }

  function stopListening(): void {
    if (current) {
      try { current.abort() } catch {}
      current = null
    }
    isListening.value = false
  }

  onUnmounted(stopListening)

  return { isListening, isSupported, startListening, stopListening }
}
