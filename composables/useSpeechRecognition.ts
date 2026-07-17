import { ref, onUnmounted } from 'vue'

export function useSpeechRecognition(
  onResult: (transcripts: string[]) => void,
  onError: (message: string) => void,
) {
  const isListening = ref(false)
  const isSupported = ref(false)

  let recognition: SpeechRecognition | null = null

  if (import.meta.client) {
    const API =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (API) {
      isSupported.value = true
      recognition = new API() as SpeechRecognition
      recognition.lang = 'ru-RU'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 5

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        isListening.value = false
        const results = event.results[0]
        const transcripts: string[] = []
        for (let i = 0; i < results.length; i++) {
          transcripts.push(results[i].transcript)
        }
        onResult(transcripts)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        isListening.value = false
        if (event.error === 'no-speech') {
          onError('Ничего не услышано. Попробуйте ещё раз.')
        } else if (event.error === 'not-allowed') {
          onError('Нет доступа к микрофону.')
        } else if (event.error === 'aborted') {
          // Silent abort
        } else {
          onError('Ошибка распознавания.')
        }
      }

      recognition.onend = () => {
        isListening.value = false
      }
    }
  }

  function startListening(): void {
    if (!recognition || isListening.value) return
    try {
      recognition.start()
      isListening.value = true
    } catch {
      isListening.value = false
    }
  }

  function stopListening(): void {
    if (!recognition || !isListening.value) return
    recognition.abort()
    isListening.value = false
  }

  onUnmounted(() => {
    stopListening()
  })

  return { isListening, isSupported, startListening, stopListening }
}
