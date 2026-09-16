import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  createShiftState,
  tick,
  startService,
  cancelService,
  attemptServe,
  resolveDistraction,
  remainingSeconds,
} from './game/engine.js'
import { SHIFTS } from './game/shifts.js'
import { getProgress, recordShiftCompletion } from './game/storage.js'
import * as sound from './game/sound.js'
import { useGameClock } from './hooks/useGameClock.js'

import HUD from './components/HUD.jsx'
import Fila from './components/Fila.jsx'
import PainelAtendimento from './components/PainelAtendimento.jsx'
import FeedbackAtendimento from './components/FeedbackAtendimento.jsx'
import DistracaoOverlay from './components/DistracaoOverlay.jsx'
import { TelaInicio, SelecaoTurno, TelaResultadoTurno, TelaAjuda } from './components/Screens.jsx'

import './App.css'

const FEEDBACK_TYPES = new Set(['serve_success', 'serve_error', 'refuse_correct', 'refuse_incorrect', 'serve_item_success'])

function buildFeedback(event) {
  if (!event || !FEEDBACK_TYPES.has(event.type)) return null
  return {
    key: `${event.type}-${event.customerId}-${Date.now()}`,
    type: event.type,
    messages: (event.violations ?? []).map((v) => v.message),
  }
}

export default function App() {
  const [screen, setScreen] = useState('inicio') // 'inicio' | 'selecao' | 'jogando' | 'resultado'
  const [shiftIndex, setShiftIndex] = useState(0)
  const [shiftState, setShiftState] = useState(() => createShiftState(SHIFTS[0]))
  const [progress, setProgress] = useState(() => getProgress())
  const [atendimentoAtivo, setAtendimentoAtivo] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [paused, setPaused] = useState(false)
  const [mostrarAjuda, setMostrarAjuda] = useState(false)

  const shift = SHIFTS[shiftIndex]
  const resultadoRegistrado = useRef(false)

  // --- relógio do turno ------------------------------------------------
  const tickAtivo = screen === 'jogando' && !paused && !mostrarAjuda && shiftState.status === 'playing'
  useGameClock(tickAtivo, (deltaMs) => {
    const { state, events } = tick(shiftState, deltaMs)
    setShiftState(state)
    for (const event of events) {
      if (event.type === 'customer_left_impatient') sound.playImpatientLeave()
      if (event.type === 'distraction_expired') sound.playError()
    }
  })

  // fecha o painel de atendimento se o cliente ativo sumir (foi embora, etc.)
  useEffect(() => {
    if (atendimentoAtivo && shiftState.activeCustomerId !== atendimentoAtivo.customerId) {
      setAtendimentoAtivo(null)
    }
  }, [shiftState.activeCustomerId, atendimentoAtivo])

  // transição para a tela de resultado quando o turno termina
  useEffect(() => {
    if (screen !== 'jogando' || shiftState.status === 'playing') return undefined
    if (resultadoRegistrado.current) return undefined
    resultadoRegistrado.current = true

    const won = shiftState.status === 'won'
    sound[won ? 'playWin' : 'playLose']()
    const nextProgress = recordShiftCompletion(shiftIndex, {
      won,
      score: shiftState.score,
      reputation: shiftState.reputation,
    })
    setProgress(nextProgress)

    const timeout = setTimeout(() => setScreen('resultado'), 900)
    return () => clearTimeout(timeout)
  }, [shiftState.status, screen, shiftIndex, shiftState.score, shiftState.reputation])

  // toast de feedback some sozinho
  useEffect(() => {
    if (!feedback) return undefined
    const timeout = setTimeout(() => setFeedback(null), 3400)
    return () => clearTimeout(timeout)
  }, [feedback])

  function startShift(index) {
    resultadoRegistrado.current = false
    setShiftIndex(index)
    setShiftState(createShiftState(SHIFTS[index]))
    setAtendimentoAtivo(null)
    setFeedback(null)
    setPaused(false)
    setScreen('jogando')
  }

  function handleSelecionarCliente(customerId) {
    const { state, event } = startService(shiftState, customerId)
    setShiftState(state)
    if (event.type === 'service_started') {
      setAtendimentoAtivo({ customerId, step: 'prateleira', selectedItem: null })
      sound.playClick()
    }
  }

  function handleSelecionarItem(item) {
    setAtendimentoAtivo((prev) => (prev ? { ...prev, step: 'confirmacao', selectedItem: item } : prev))
  }

  function handleVoltarPrateleira() {
    setAtendimentoAtivo((prev) => (prev ? { ...prev, step: 'prateleira', selectedItem: null } : prev))
  }

  function handleCancelarAtendimento() {
    if (!atendimentoAtivo) return
    const { state } = cancelService(shiftState, atendimentoAtivo.customerId)
    setShiftState(state)
    setAtendimentoAtivo(null)
  }

  function handleDecisao(decisao, options) {
    if (!atendimentoAtivo?.selectedItem) return
    const { state, event } = attemptServe(
      shiftState,
      shift,
      atendimentoAtivo.customerId,
      atendimentoAtivo.selectedItem.id,
      decisao,
      options,
    )
    setShiftState(state)
    setFeedback(buildFeedback(event))

    if (event.type === 'serve_success' || event.type === 'refuse_correct') sound.playSuccess()
    else if (event.type === 'serve_item_success') sound.playItemSuccess()
    else if (event.type === 'serve_error' || event.type === 'refuse_incorrect') sound.playError()
    if (event.type === 'refuse_correct') sound.playRefuseCorrect()

    if (event.type === 'serve_item_success') {
      setAtendimentoAtivo((prev) => (prev ? { ...prev, step: 'prateleira', selectedItem: null } : prev))
    } else {
      setAtendimentoAtivo(null)
    }
  }

  function handleResolverDistracao(distractionId, choiceId) {
    const { state, event } = resolveDistraction(shiftState, distractionId, choiceId)
    setShiftState(state)
    if (event.type === 'distraction_resolved' && !event.correct) sound.playError()
    else sound.playDistraction()
  }

  const activeCustomer = shiftState.queue.find((c) => c.id === atendimentoAtivo?.customerId) ?? null
  const distracaoAtiva = shiftState.activeDistractions[0] ?? null

  return (
    <div className="app">
      {screen === 'jogando' && (
        <div className="app__jogo">
          <HUD
            shift={shift}
            remainingSeconds={remainingSeconds(shiftState)}
            reputation={shiftState.reputation}
            reputationTarget={shiftState.reputationTarget}
            score={shiftState.score}
            onAjuda={() => setMostrarAjuda(true)}
            onPausar={() => setPaused((p) => !p)}
          />

          <Fila
            queue={shiftState.queue}
            activeCustomerId={shiftState.activeCustomerId}
            maxQueueVisible={shiftState.maxQueueVisible}
            onSelecionar={handleSelecionarCliente}
          />

          <div className="app__area-atendimento">
            <AnimatePresence mode="wait">
              {activeCustomer ? (
                <PainelAtendimento
                  key={activeCustomer.id}
                  shift={shift}
                  customer={activeCustomer}
                  step={atendimentoAtivo.step}
                  selectedItem={atendimentoAtivo.selectedItem}
                  onSelecionarItem={handleSelecionarItem}
                  onVoltarPrateleira={handleVoltarPrateleira}
                  onEntregar={(options) => handleDecisao('entregar', options)}
                  onRecusar={(options) => handleDecisao('recusar', options)}
                  onCancelar={handleCancelarAtendimento}
                />
              ) : (
                <div key="vazio" className="app__placeholder">
                  <p>Clique em um cliente da fila para começar o atendimento.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {paused && (
            <div className="app__pausado">
              <div className="app__pausado-card">
                <h2>Pausado</h2>
                <button type="button" onClick={() => setPaused(false)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          <DistracaoOverlay distraction={distracaoAtiva} onResolver={handleResolverDistracao} />
          <FeedbackAtendimento feedback={feedback} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === 'inicio' && !mostrarAjuda && (
          <TelaInicio key="inicio" onJogar={() => setScreen('selecao')} onComoJogar={() => setMostrarAjuda(true)} />
        )}
        {screen === 'selecao' && !mostrarAjuda && (
          <SelecaoTurno
            key="selecao"
            shifts={SHIFTS}
            progress={progress}
            onSelecionar={startShift}
            onVoltar={() => setScreen('inicio')}
          />
        )}
        {screen === 'resultado' && (
          <TelaResultadoTurno
            key="resultado"
            shift={shift}
            shiftState={shiftState}
            temProximo={shiftIndex < SHIFTS.length - 1}
            onTentarNovamente={() => startShift(shiftIndex)}
            onProximo={() => startShift(shiftIndex + 1)}
            onTurnos={() => setScreen('selecao')}
          />
        )}
        {mostrarAjuda && <TelaAjuda key="ajuda" onFechar={() => setMostrarAjuda(false)} />}
      </AnimatePresence>
    </div>
  )
}
