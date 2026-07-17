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
    console.log('[SR] SpeechRecognition API:', API ? 'found' : 'NOT FOUND')
    console.log('[SR] webkitSpeechRecognition:', !!(window as any).webkitSpeechRecognition)
    console.log('[SR] SpeechRecognition:', !!(window as any).SpeechRecognition)
    if (API) isSupported.value = true
  }

  function startListening(): void {
    if (!import.meta.client || isListening.value) return

    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!API) {
      console.error('[SR] No SpeechRecognition API available')
      return
    }

    const r = new API()
    r.lang = 'ru-RU'
    r.continuous = false
    r.interimResults = true
    r.maxAlternatives = 5

    console.log('[SR] Created instance, lang=ru-RU, starting...')

    r.onaudiostart = () => console.log('[SR] onaudiostart — microphone opened')
    r.onaudioend = () => console.log('[SR] onaudioend — microphone closed')

    r.onsoundstart = () => {
      console.log('[SR] onsoundstart — sound detected')
      onSoundStart?.()
    }
    r.onsoundend = () => console.log('[SR] onsoundend')

    r.onspeechstart = () => console.log('[SR] onspeechstart — SPEECH detected!')
    r.onspeechend = () => console.log('[SR] onspeechend')

    r.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      console.log('[SR] onresult isFinal:', result.isFinal)
      for (let j = 0; j < result.length; j++) {
        console.log(`[SR]   alternative[${j}]:`, JSON.stringify(result[j].transcript), 'confidence:', result[j].confidence)
      }

      if (result.isFinal) {
        isListening.value = false
        const transcripts: string[] = []
        for (let i = 0; i < event.results.length; i++) {
          for (let j = 0; j < event.results[i].length; j++) {
            const t = event.results[i][j].transcript.trim()
            if (t) transcripts.push(t)
          }
        }
        console.log('[SR] Final transcripts:', transcripts)
        onResult(transcripts)
      } else {
        const interim = result[0]?.transcript ?? ''
        console.log('[SR] Interim:', JSON.stringify(interim))
        if (interim) onInterim?.(interim)
      }
    }

    r.onnomatch = () => console.warn('[SR] onnomatch — no match found')

    r.onerror = (event: any) => {
      console.error('[SR] onerror:', event.error, '| message:', event.message)
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
      console.log('[SR] onend — recognition ended')
      isListening.value = false
      current = null
    }

    current = r
    try {
      r.start()
      isListening.value = true
      console.log('[SR] start() called OK, isListening=true')
    } catch (e) {
      console.error('[SR] start() threw:', e)
      isListening.value = false
      current = null
      onError('Не удалось запустить микрофон')
    }
  }

  function stopListening(): void {
    console.log('[SR] stopListening called')
    if (current) {
      try { current.abort() } catch {}
      current = null
    }
    isListening.value = false
  }

  onUnmounted(stopListening)

  return { isListening, isSupported, startListening, stopListening }
}
