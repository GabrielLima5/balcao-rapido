// Progresso salvo em localStorage: turnos desbloqueados e melhor resultado de
// cada turno já jogado. Sem backend, sem conta de usuário.

import { normalizarPerfil } from './rewards.js'

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
// Estrelas e "já venceu" nunca regridem: uma partida pior depois não apaga a
// melhor, mesmo quando o melhor placar em pontos veio de outra partida.
export function recordShiftCompletion(shiftIndex, { won, score, reputation, estrelas = 0 }) {
  const progress = getProgress()
  const previous = progress.results[shiftIndex]
  const best = previous && previous.score > score ? previous : { won, score, reputation }

  const results = {
    ...progress.results,
    [shiftIndex]: {
      ...best,
      won: Boolean(best.won || previous?.won || won),
      estrelas: Math.max(previous?.estrelas ?? 0, estrelas),
    },
  }
  const unlockedIndex = won ? Math.max(progress.unlockedIndex, shiftIndex + 1) : progress.unlockedIndex

  const next = { unlockedIndex, results }
  writeRaw(next)
  return next
}

export function resetProgress() {
  writeRaw({ unlockedIndex: 0, results: {} })
  return { unlockedIndex: 0, results: {} }
}

// Perfil de gamificação (moedas, XP, conquistas, loja, presente diário). Chave
// própria: o formato vive em rewards.js#perfilInicial e normalizarPerfil
// completa o que faltar num save antigo.
const PERFIL_KEY = 'balcao-rapido:perfil'

export function getPerfil() {
  try {
    const raw = window.localStorage.getItem(PERFIL_KEY)
    return normalizarPerfil(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizarPerfil(null)
  }
}

export function savePerfil(perfil) {
  try {
    window.localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil))
  } catch {
    // mesma política do progresso: sem persistência, mas o jogo segue
  }
  return perfil
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
