import { ref, onUnmounted } from 'vue'
import { CARD_VALUE_WORDS, CARD_SUIT_WORDS } from '~/utils/cardParser'

const CARD_GRAMMAR = [
  '#JSGF V1.0 UTF-8 ru;',
  'grammar cards;',
  `public <value> = ${CARD_VALUE_WORDS.join(' | ')};`,
  `public <suit>  = ${CARD_SUIT_WORDS.join(' | ')};`,
  'public <card>  = <value> <suit> | <suit> <value>;',
].join('\n')

const LOOPBACK_RE = /стерео\s*микш|stereo\s*mix|what\s*u\s*hear|wave\s*out\s*mix/i

export function useSpeechRecognition(
  onResult: (transcripts: string[]) => void,
  onError: (message: string) => void,
  onSoundStart?: () => void,
  onInterim?: (text: string) => void,
) {
  const isSessionActive = ref(false)
  const isListening    = ref(false)
  const isSupported    = ref(false)
  let current: any = null
  let restartTimer: ReturnType<typeof setTimeout> | null = null

  if (import.meta.client) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    console.log('[SR] API:', SR ? 'found' : 'NOT FOUND')
    if (SR) isSupported.value = true
  }

  function scheduleRestart(): void {
    if (!isSessionActive.value) return
    restartTimer = setTimeout(() => {
      if (isSessionActive.value) doRecognition()
    }, 300)
  }

  function doRecognition(): void {
    if (!import.meta.client || !isSessionActive.value) return
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!API) return

    const r = new API()
    r.lang = 'ru-RU'
    r.continuous = true   // Stay active after each utterance — critical for iOS auto-restart
    r.interimResults = true
    r.maxAlternatives = 5

    const GL = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList
    if (GL) {
      const list = new GL()
      list.addFromString(CARD_GRAMMAR, 1)
      r.grammars = list
    }

    r.onaudiostart  = () => console.log('[SR] onaudiostart')
    r.onaudioend    = () => console.log('[SR] onaudioend')
    r.onsoundstart  = () => { console.log('[SR] onsoundstart'); onSoundStart?.() }
    r.onsoundend    = () => console.log('[SR] onsoundend')
    r.onspeechstart = () => console.log('[SR] onspeechstart')
    r.onspeechend   = () => console.log('[SR] onspeechend')

    r.onresult = (event: any) => {
      // With continuous=true, event.results accumulates all results — only process the latest
      const result = event.results[event.results.length - 1]
      if (!result.isFinal) {
        const interim = result[0]?.transcript ?? ''
        console.log('[SR] interim:', JSON.stringify(interim))
        onInterim?.(interim)
        return
      }
      // Final result: collect all alternatives from this one result only
      onInterim?.('')  // clear interim display
      const all: string[] = []
      for (let j = 0; j < result.length; j++) {
        const t = result[j].transcript.trim()
        console.log(`[SR] final[${j}]:`, JSON.stringify(t), 'conf:', result[j].confidence)
        if (t) all.push(t)
      }
      onResult(all)
    }

    r.onnomatch = () => console.warn('[SR] onnomatch')

    r.onerror = (event: any) => {
      console.error('[SR] onerror:', event.error)
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') return  // onend fires next → scheduleRestart
      if (event.error === 'not-allowed') {
        isSessionActive.value = false
        isListening.value = false
        onError('Нет доступа к микрофону')
        return
      }
      if (event.error === 'network') {
        onError('Нет сети — распознавание недоступно')
        return
      }
      onError(`Ошибка: ${event.error}`)
    }

    r.onend = () => {
      console.log('[SR] onend')
      isListening.value = false
      current = null
      // iOS terminates continuous sessions after ~60s; restart immediately from onend
      // (iOS allows start() within onend context even without a fresh user gesture)
      scheduleRestart()
    }

    current = r
    try {
      r.start()
      isListening.value = true
      console.log('[SR] start() OK')
    } catch (e) {
      console.error('[SR] start() threw:', e)
      isListening.value = false
      current = null
      scheduleRestart()
    }
  }

  async function startSession(): Promise<void> {
    if (isSessionActive.value) return

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const track  = stream.getAudioTracks()[0]
        console.log('[SR] getUserMedia OK:', track?.label)
        stream.getTracks().forEach(t => t.stop())

        if (LOOPBACK_RE.test(track?.label ?? '')) {
          onError(`"${track?.label}" — не микрофон. Выберите реальный микрофон в Параметры → Звук → Ввод.`)
          return
        }
      } catch (err: any) {
        console.error('[SR] getUserMedia failed:', err.name)
        if (err.name === 'NotFoundError') {
          onError('Микрофон не найден')
        } else {
          onError('Нет доступа к микрофону')
        }
        return
      }
    }

    console.log('[SR] Session started')
    isSessionActive.value = true
    doRecognition()
  }

  function stopSession(): void {
    console.log('[SR] Session stopped')
    isSessionActive.value = false
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null }
    if (current) { try { current.abort() } catch {}; current = null }
    isListening.value = false
  }

  function toggleSession(): void {
    if (isSessionActive.value) stopSession()
    else startSession()
  }

  onUnmounted(stopSession)

  return { isSessionActive, isListening, isSupported, toggleSession }
}
