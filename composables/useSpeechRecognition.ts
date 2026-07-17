import { ref, onUnmounted } from 'vue'

export function useSpeechRecognition(
  onResult: (transcripts: string[]) => void,
  onError: (message: string) => void,
  onSoundStart?: () => void,
  onInterim?: (text: string) => void,
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

    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!API) return

    // Always create a fresh instance — reusing an ended instance silently fails on
    // both iOS Safari and some Chrome versions
    const r = new API()
    r.lang = 'ru-RU'
    r.continuous = false
    r.interimResults = true   // Fires results as user speaks → avoids early no-speech timeout
    r.maxAlternatives = 5

    r.onsoundstart = () => {
      onSoundStart?.()
    }

    r.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]

      if (result.isFinal) {
        isListening.value = false
        // Collect all alternatives from every result in the session
        const transcripts: string[] = []
        for (let i = 0; i < event.results.length; i++) {
          for (let j = 0; j < event.results[i].length; j++) {
            const t = event.results[i][j].transcript.trim()
            if (t) transcripts.push(t)
          }
        }
        onResult(transcripts)
      } else {
        // Show interim text so user can see the engine is hearing them
        const interim = result[0]?.transcript ?? ''
        if (interim) onInterim?.(interim)
      }
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
