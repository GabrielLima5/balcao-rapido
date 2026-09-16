// Efeitos sonoros gerados via WebAudio — sem arquivos de áudio.

let ctx = null

function getContext() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    ctx = new AudioContextClass()
  }
  return ctx
}

function tone({ freq, durationMs, type = 'sine', gain = 0.08, delayMs = 0 }) {
  const audio = getContext()
  if (!audio) return
  if (audio.state === 'suspended') audio.resume().catch(() => {})

  const startAt = audio.currentTime + delayMs / 1000
  const osc = audio.createOscillator()
  const gainNode = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startAt)
  gainNode.gain.setValueAtTime(0, startAt)
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000)
  osc.connect(gainNode)
  gainNode.connect(audio.destination)
  osc.start(startAt)
  osc.stop(startAt + durationMs / 1000 + 0.02)
}

export function playSuccess() {
  tone({ freq: 660, durationMs: 90, type: 'sine' })
  tone({ freq: 880, durationMs: 140, type: 'sine', delayMs: 70 })
}

export function playItemSuccess() {
  tone({ freq: 720, durationMs: 90, type: 'sine' })
}

export function playError() {
  tone({ freq: 220, durationMs: 160, type: 'sawtooth', gain: 0.07 })
  tone({ freq: 160, durationMs: 200, type: 'sawtooth', gain: 0.07, delayMs: 90 })
}

export function playRefuseCorrect() {
  tone({ freq: 520, durationMs: 110, type: 'triangle' })
}

export function playImpatientLeave() {
  tone({ freq: 300, durationMs: 140, type: 'square', gain: 0.05 })
}

export function playDistraction() {
  tone({ freq: 900, durationMs: 90, type: 'square', gain: 0.05 })
  tone({ freq: 700, durationMs: 90, type: 'square', gain: 0.05, delayMs: 130 })
}

export function playWin() {
  ;[523, 659, 784, 1046].forEach((freq, i) => tone({ freq, durationMs: 160, delayMs: i * 110, gain: 0.09 }))
}

export function playLose() {
  ;[440, 370, 300].forEach((freq, i) => tone({ freq, durationMs: 220, delayMs: i * 140, type: 'sawtooth', gain: 0.06 }))
}

export function playClick() {
  tone({ freq: 500, durationMs: 40, type: 'sine', gain: 0.04 })
}
