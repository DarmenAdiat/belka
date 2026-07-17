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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const gum = !!navigator.mediaDevices?.getUserMedia
    console.log('[SR] SpeechRecognition API:', SR ? 'found' : 'NOT FOUND')
    console.log('[SR] getUserMedia:', gum ? 'found' : 'NOT FOUND')
    if (SR) isSupported.value = true
  }

  function startRecognition(): void {
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!API) return

    const r = new API()
    r.lang = 'ru-RU'
    r.continuous = false
    r.interimResults = true
    r.maxAlternatives = 5

    console.log('[SR] Starting recognition with lang=ru-RU')

    r.onaudiostart = () => console.log('[SR] onaudiostart — mic opened')
    r.onaudioend  = () => console.log('[SR] onaudioend — mic closed')
    r.onsoundstart = () => { console.log('[SR] onsoundstart'); onSoundStart?.() }
    r.onsoundend  = () => console.log('[SR] onsoundend')
    r.onspeechstart = () => console.log('[SR] onspeechstart — SPEECH detected!')
    r.onspeechend   = () => console.log('[SR] onspeechend')

    r.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      console.log('[SR] onresult isFinal:', result.isFinal)
      for (let j = 0; j < result.length; j++) {
        console.log(`[SR]   [${j}]: "${result[j].transcript}" (confidence: ${result[j].confidence})`)
      }
      if (result.isFinal) {
        isListening.value = false
        const all: string[] = []
        for (let i = 0; i < event.results.length; i++)
          for (let j = 0; j < event.results[i].length; j++) {
            const t = event.results[i][j].transcript.trim()
            if (t) all.push(t)
          }
        onResult(all)
      } else {
        onInterim?.(result[0]?.transcript ?? '')
      }
    }

    r.onnomatch = () => console.warn('[SR] onnomatch')
    r.onerror = (event: any) => {
      console.error('[SR] onerror:', event.error, '| message:', event.message)
      isListening.value = false
      if (event.error === 'aborted') return
      if (event.error === 'no-speech')  onError('Ничего не услышано — попробуйте ещё раз')
      else if (event.error === 'not-allowed') onError('Нет доступа к микрофону')
      else if (event.error === 'network')     onError('Нет сети — распознавание недоступно')
      else onError(`Ошибка: ${event.error}`)
    }
    r.onend = () => { console.log('[SR] onend'); isListening.value = false; current = null }

    current = r
    try {
      r.start()
      isListening.value = true
      console.log('[SR] start() OK')
    } catch (e) {
      console.error('[SR] start() threw:', e)
      isListening.value = false
      current = null
      onError('Не удалось запустить микрофон')
    }
  }

  function startListening(): void {
    if (!import.meta.client || isListening.value) return

    // Test getUserMedia first to see if the mic is reachable at all
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[SR] getUserMedia not available, starting SR directly')
      startRecognition()
      return
    }

    console.log('[SR] Testing mic with getUserMedia...')
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const t = stream.getAudioTracks()[0]
        const label = t?.label ?? ''
        console.log('[SR] getUserMedia OK → track:', label,
          '| enabled:', t?.enabled,
          '| muted:', t?.muted,
          '| readyState:', t?.readyState)

        stream.getTracks().forEach(tr => tr.stop())

        // Loopback devices (Stereo Mix, What U Hear, etc.) capture speaker output,
        // not the microphone. Chrome Speech API uses the same default device.
        const LOOPBACK = /стерео\s*микш|stereo\s*mix|what\s*u\s*hear|wave\s*out\s*mix|sum\s*\(/i
        if (LOOPBACK.test(label)) {
          console.warn('[SR] Loopback device detected:', label, '— speech recognition will not work')
          onError(`Устройство "${label}" не является микрофоном. Установите микрофон устройством по умолчанию в Параметры звука → Ввод.`)
          isListening.value = false
          return
        }

        console.log('[SR] Track stopped, starting SpeechRecognition...')
        startRecognition()
      })
      .catch(err => {
        console.error('[SR] getUserMedia FAILED:', err.name, '—', err.message)
        isListening.value = false
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          onError('Доступ к микрофону запрещён')
        } else if (err.name === 'NotFoundError') {
          onError('Микрофон не найден')
        } else {
          onError('Ошибка микрофона: ' + err.message)
        }
      })
  }

  function stopListening(): void {
    console.log('[SR] stopListening')
    if (current) { try { current.abort() } catch {}; current = null }
    isListening.value = false
  }

  onUnmounted(stopListening)
  return { isListening, isSupported, startListening, stopListening }
}
