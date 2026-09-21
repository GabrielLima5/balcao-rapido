// Progresso salvo em localStorage: turnos desbloqueados e melhor resultado de
// cada turno já jogado. Sem backend, sem conta de usuário.

const STORAGE_KEY = 'balcao-rapido:progress'

function readRaw() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeRaw(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage indisponível (modo privado etc.) — falha silenciosa, o
    // jogo continua funcionando só sem persistência entre sessões.
  }
}

export function getProgress() {
  const data = readRaw()
  if (!data) {
    return { unlockedIndex: 0, results: {} }
  }
  return { unlockedIndex: data.unlockedIndex ?? 0, results: data.results ?? {} }
}

// Registra o resultado de um turno e desbloqueia o próximo se o jogador
// passou. `shiftIndex` é a posição do turno na lista SHIFTS.
export function recordShiftCompletion(shiftIndex, { won, score, reputation }) {
  const progress = getProgress()
  const previous = progress.results[shiftIndex]
  const best = previous && previous.score > score ? previous : { won, score, reputation }

  const results = { ...progress.results, [shiftIndex]: best }
  const unlockedIndex = won ? Math.max(progress.unlockedIndex, shiftIndex + 1) : progress.unlockedIndex

  const next = { unlockedIndex, results }
  writeRaw(next)
  return next
}

export function resetProgress() {
  writeRaw({ unlockedIndex: 0, results: {} })
  return { unlockedIndex: 0, results: {} }
}

// Aceite do aviso de marcas e de conteúdo. Fica separado do progresso de
// propósito: resetar o progresso do jogo não deve fazer o jogador aceitar o
// aviso de novo — e apagar o aceite não deve custar o progresso dele.
const AVISO_KEY = 'balcao-rapido:aviso-aceito'

export function getAvisoAceito() {
  try {
    return window.localStorage.getItem(AVISO_KEY) === '1'
  } catch {
    // sem localStorage o aviso reaparece a cada sessão — que é o lado seguro
    return false
  }
}

export function aceitarAviso() {
  try {
    window.localStorage.setItem(AVISO_KEY, '1')
  } catch {
    // falha silenciosa: o jogo segue, o aviso só volta na próxima sessão
  }
  return true
}
