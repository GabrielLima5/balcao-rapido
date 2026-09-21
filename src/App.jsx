import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  createShiftState,
  tick,
  startService,
  cancelService,
  askQuestion,
  attemptServe,
  resolveDistraction,
  remainingSeconds,
} from './game/engine.js'
import { getPergunta } from './game/anamnese.js'
import { SHIFTS } from './game/shifts.js'
import { aceitarAviso, getAvisoAceito, getProgress, recordShiftCompletion } from './game/storage.js'
import * as sound from './game/sound.js'
import { useGameClock } from './hooks/useGameClock.js'

import HUD from './components/HUD.jsx'
import Fila from './components/Fila.jsx'
import PainelAtendimento from './components/PainelAtendimento.jsx'
import FeedbackAtendimento from './components/FeedbackAtendimento.jsx'
import DistracaoOverlay from './components/DistracaoOverlay.jsx'
import ModalConfirmacao from './components/ModalConfirmacao.jsx'
import { TelaAviso, TelaInicio, SelecaoTurno, TelaResultadoTurno, TelaAjuda } from './components/Screens.jsx'

import './App.css'

const FEEDBACK_TYPES = new Set(['serve_success', 'serve_error', 'refuse_correct', 'refuse_incorrect', 'serve_item_success'])

function buildFeedback(event) {
  if (!event || !FEEDBACK_TYPES.has(event.type)) return null
  const messages = (event.violations ?? []).map((v) => v.message)

  // Decidiu certo sem ter feito as perguntas que importavam: não custa
  // reputação, mas é o momento de dizer que aquilo foi sorte, não atendimento.
  const acertouNoEscuro =
    (event.type === 'serve_success' || event.type === 'refuse_correct') && event.faltouPerguntar?.length > 0
  if (acertouNoEscuro) {
    const perguntas = event.faltouPerguntar.map((id) => `“${getPergunta(id)?.label}”`).join(' ')
    messages.push(`Deu certo, mas você decidiu sem perguntar: ${perguntas}`)
  }
  // Errou e a informação que teria evitado o erro estava a uma pergunta de distância.
  if (event.type === 'serve_error' && event.faltouPerguntar?.length > 0) {
    const perguntas = event.faltouPerguntar.map((id) => `“${getPergunta(id)?.label}”`).join(' ')
    messages.push(`Você não chegou a perguntar: ${perguntas}`)
  }

  return {
    key: `${event.type}-${event.customerId}-${Date.now()}`,
    type: event.type,
    variante: acertouNoEscuro ? 'alerta' : null,
    messages,
  }
}

export default function App() {
  const [screen, setScreen] = useState('inicio') // 'inicio' | 'selecao' | 'jogando' | 'resultado'
  const [shiftIndex, setShiftIndex] = useState(0)
  const [shiftState, setShiftState] = useState(() => createShiftState(SHIFTS[0]))
  const [progress, setProgress] = useState(() => getProgress())
  const [avisoAceito, setAvisoAceito] = useState(() => getAvisoAceito())
  const [atendimentoAtivo, setAtendimentoAtivo] = useState(null)
  const [feedback, setFeedback] = useState(null)
  // "−4s" flutuante no cartão de quem acabou de responder uma pergunta
  const [custoPergunta, setCustoPergunta] = useState(null)
  const [paused, setPaused] = useState(false)
  const [mostrarAjuda, setMostrarAjuda] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  const shift = SHIFTS[shiftIndex]
  const resultadoRegistrado = useRef(false)

  // --- relógio do turno ------------------------------------------------
  // o relógio do turno para enquanto qualquer coisa modal está aberta — decidir
  // se vai sair não pode custar clientes ao jogador
  const tickAtivo =
    screen === 'jogando' &&
    !paused &&
    !mostrarAjuda &&
    !confirmandoSaida &&
    shiftState.status === 'playing'
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

  // o "−4s" também
  useEffect(() => {
    if (!custoPergunta) return undefined
    const timeout = setTimeout(() => setCustoPergunta(null), 900)
    return () => clearTimeout(timeout)
  }, [custoPergunta])

  function startShift(index) {
    resultadoRegistrado.current = false
    setShiftIndex(index)
    setShiftState(createShiftState(SHIFTS[index]))
    setAtendimentoAtivo(null)
    setFeedback(null)
    setCustoPergunta(null)
    setPaused(false)
    setConfirmandoSaida(false)
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

  function handlePerguntar(perguntaId) {
    if (!atendimentoAtivo) return
    const { state, event } = askQuestion(shiftState, atendimentoAtivo.customerId, perguntaId)
    setShiftState(state)
    if (event.type !== 'question_answered') return
    sound.playClick()
    setCustoPergunta({
      customerId: atendimentoAtivo.customerId,
      custoMs: getPergunta(perguntaId)?.custoMs ?? 0,
      key: `${atendimentoAtivo.customerId}-${perguntaId}`,
    })
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

  // Abandonar o turno: nada é gravado em `progress`, porque recordShiftCompletion
  // só roda quando um turno TERMINA. O estado volta ao início do turno para o
  // caso de o jogador reabri-lo depois — sair não é pausar, é desistir.
  function handleConfirmarSaida() {
    resultadoRegistrado.current = false
    setConfirmandoSaida(false)
    setAtendimentoAtivo(null)
    setFeedback(null)
    setCustoPergunta(null)
    setPaused(false)
    setShiftState(createShiftState(SHIFTS[shiftIndex]))
    setScreen('inicio')
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
            onSair={() => setConfirmandoSaida(true)}
          />

          <Fila
            queue={shiftState.queue}
            activeCustomerId={shiftState.activeCustomerId}
            maxQueueVisible={shiftState.maxQueueVisible}
            custoPergunta={custoPergunta}
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
                  onPerguntar={handlePerguntar}
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
                {/* o overlay de pausa cobre o HUD, então a saída precisa estar
                    aqui também — senão o jogador teria que despausar só para
                    conseguir desistir do turno. */}
                <div className="app__pausado-acoes">
                  <button type="button" onClick={() => setPaused(false)}>
                    Continuar
                  </button>
                  <button
                    type="button"
                    className="app__pausado-sair"
                    onClick={() => setConfirmandoSaida(true)}
                  >
                    Sair do turno
                  </button>
                </div>
              </div>
            </div>
          )}

          <DistracaoOverlay distraction={distracaoAtiva} onResolver={handleResolverDistracao} />
          <FeedbackAtendimento feedback={feedback} />

          <ModalConfirmacao
            aberto={confirmandoSaida}
            titulo="Sair do turno?"
            mensagem={`Você volta para o menu inicial e perde tudo o que fez em "${shift.nome}" — reputação, pontos e clientes atendidos. O turno não será registrado e vai começar do zero na próxima vez.`}
            textoCancelar="Continuar atendendo"
            textoConfirmar="Sair e perder o progresso"
            onCancelar={() => setConfirmandoSaida(false)}
            onConfirmar={handleConfirmarSaida}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {!avisoAceito && (
          <TelaAviso
            key="aviso"
            onAceitar={() => {
              aceitarAviso()
              setAvisoAceito(true)
            }}
          />
        )}
        {avisoAceito && screen === 'inicio' && !mostrarAjuda && (
          <TelaInicio key="inicio" onJogar={() => setScreen('selecao')} onComoJogar={() => setMostrarAjuda(true)} />
        )}
        {avisoAceito && screen === 'selecao' && !mostrarAjuda && (
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
