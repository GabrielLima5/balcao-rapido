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
  summarize,
} from './game/engine.js'
import { getPergunta } from './game/anamnese.js'
import { SHIFTS } from './game/shifts.js'
import {
  aceitarAviso,
  getAvisoAceito,
  getPerfil,
  getProgress,
  recordShiftCompletion,
  savePerfil,
} from './game/storage.js'
import {
  BAUS_ESTRELAS,
  abrirBau,
  aplicarRecompensasDoTurno,
  bauDisponivel,
  calcularEstrelas,
  comprarItem,
  equiparItem,
  presenteDisponivel,
  resgatarPresenteDiario,
} from './game/rewards.js'
import * as sound from './game/sound.js'
import { useGameClock } from './hooks/useGameClock.js'

import HUD from './components/HUD.jsx'
import Fila from './components/Fila.jsx'
import PainelAtendimento from './components/PainelAtendimento.jsx'
import FeedbackAtendimento from './components/FeedbackAtendimento.jsx'
import DistracaoOverlay from './components/DistracaoOverlay.jsx'
import ModalConfirmacao from './components/ModalConfirmacao.jsx'
import { TelaAviso, TelaInicio, SelecaoTurno, TelaResultadoTurno, TelaAjuda } from './components/Screens.jsx'
import { PresenteDiario, TelaConquistas, TelaLoja, ToastsConquista } from './components/Recompensas.jsx'

import './App.css'

const FEEDBACK_TYPES = new Set(['serve_success', 'serve_error', 'refuse_correct', 'refuse_incorrect', 'serve_item_success'])

// Data local 'AAAA-MM-DD' — o presente diário vira à meia-noite do jogador, não
// à meia-noite UTC.
function hojeLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TOAST_DURACAO_MS = 4200

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
    moedas: event.moedasGanhas ?? 0,
    combo: event.combo ?? 0,
    comboQuebrado: Boolean(event.comboQuebrado),
  }
}

export default function App() {
  const [screen, setScreen] = useState('inicio') // 'inicio' | 'selecao' | 'jogando' | 'resultado' | 'conquistas' | 'loja'
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

  // --- gamificação ---
  const [perfil, setPerfil] = useState(() => getPerfil())
  const [relatorio, setRelatorio] = useState(null)
  const [toasts, setToasts] = useState([])
  const [reacaoMascote, setReacaoMascote] = useState(null)
  const [mostrarPresente, setMostrarPresente] = useState(false)
  const [hoje, setHoje] = useState(() => hojeLocal())
  const presenteOferecido = useRef(false)

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
      if (event.type === 'combo_broken') {
        sound.playComboBroken()
        reagirMascote('triste')
      }
    }
  })

  // tema comprado na loja: troca só as variáveis de cor (ver index.css)
  useEffect(() => {
    document.documentElement.dataset.theme = perfil.loja.tema
  }, [perfil.loja.tema])

  // o dia pode virar com o jogo aberto; conferir ao voltar para o menu basta
  useEffect(() => {
    if (screen === 'inicio') setHoje(hojeLocal())
  }, [screen])

  // o presente diário se oferece sozinho uma vez por sessão, no menu inicial
  useEffect(() => {
    if (!avisoAceito || screen !== 'inicio' || presenteOferecido.current) return
    presenteOferecido.current = true
    if (presenteDisponivel(perfil, hoje)) setMostrarPresente(true)
  }, [avisoAceito, screen, perfil, hoje])

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
    const resumo = summarize(shiftState)
    const progressAntes = getProgress()
    const nextProgress = recordShiftCompletion(shiftIndex, {
      won,
      score: shiftState.score,
      reputation: shiftState.reputation,
      estrelas: calcularEstrelas(resumo),
    })
    setProgress(nextProgress)

    // perfil relido do storage (e não do estado) para a conta fechar sobre o
    // último valor gravado, mesmo que algo o tenha mudado durante o turno
    const recompensas = aplicarRecompensasDoTurno(getPerfil(), {
      resumo,
      log: shiftState.log,
      shiftIndex,
      progressAntes,
      progressDepois: nextProgress,
    })
    setPerfil(savePerfil(recompensas.perfil))
    setRelatorio(recompensas.relatorio)

    const timeout = setTimeout(() => setScreen('resultado'), 900)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftState.status, screen, shiftIndex])

  // as conquistas do turno estouram depois que a tela de resultado já abriu,
  // junto com a animação das estrelas
  const relatorioAnunciado = useRef(null)
  useEffect(() => {
    if (screen !== 'resultado' || !relatorio || relatorioAnunciado.current === relatorio) return undefined
    relatorioAnunciado.current = relatorio
    // o "plim" de cada estrela acompanha o delay da animação em <Estrelas animar>
    const timeouts = Array.from({ length: relatorio.estrelas }, (_, i) =>
      setTimeout(() => sound.playStar(i), 350 + i * 280),
    )
    timeouts.push(setTimeout(() => mostrarConquistas(relatorio.conquistas), 1300))
    return () => timeouts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, relatorio])

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

  // os toasts somem sozinhos; cada um carrega a própria chave
  function mostrarConquistas(conquistas, extras = []) {
    const novos = [
      ...extras,
      ...conquistas.map((c) => ({
        key: `conquista-${c.id}`,
        icone: c.icone,
        eyebrow: 'Conquista desbloqueada',
        titulo: c.nome,
        moedas: c.moedas,
      })),
    ]
    if (novos.length === 0) return
    if (conquistas.length > 0) sound.playAchievement()
    setToasts((prev) => [...prev, ...novos])
    const chaves = new Set(novos.map((t) => t.key))
    setTimeout(() => setToasts((prev) => prev.filter((t) => !chaves.has(t.key))), TOAST_DURACAO_MS)
  }

  function reagirMascote(tipo) {
    setReacaoMascote({ tipo, key: `${tipo}-${Date.now()}` })
  }

  function atualizarPerfil(novo) {
    setPerfil(savePerfil(novo))
  }

  function handleResgatarPresente() {
    const { perfil: novo, moedas, novas } = resgatarPresenteDiario(perfil, hoje, progress)
    if (moedas === 0) return
    atualizarPerfil(novo)
    sound.playChest()
    setMostrarPresente(false)
    mostrarConquistas(novas, [
      {
        key: `presente-${hoje}`,
        icone: '🎁',
        eyebrow: 'Presente diário',
        titulo: `Dia ${novo.diario.sequencia} resgatado`,
        moedas,
      },
    ])
  }

  function handleAbrirBau(bau) {
    const { perfil: novo, novas } = abrirBau(perfil, progress, bau)
    if (novo === perfil) return
    atualizarPerfil(novo)
    sound.playChest()
    mostrarConquistas(novas, [
      {
        key: `bau-${bau.estrelas}`,
        icone: '🎁',
        eyebrow: `Baú de ${bau.estrelas} estrelas`,
        titulo: bau.desbloqueia ? 'Tema Dourado desbloqueado!' : 'Baú aberto!',
        moedas: bau.moedas,
      },
    ])
  }

  function handleComprar(itemId) {
    const { perfil: novo, novas } = comprarItem(perfil, progress, itemId)
    if (novo === perfil) return
    atualizarPerfil(novo)
    sound.playCoin()
    mostrarConquistas(novas)
  }

  function handleEquipar(itemId) {
    atualizarPerfil(equiparItem(perfil, itemId))
    sound.playClick()
  }

  function startShift(index) {
    resultadoRegistrado.current = false
    setShiftIndex(index)
    setShiftState(createShiftState(SHIFTS[index]))
    setAtendimentoAtivo(null)
    setFeedback(null)
    setCustoPergunta(null)
    setPaused(false)
    setConfirmandoSaida(false)
    setRelatorio(null)
    setReacaoMascote(null)
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

    if (event.moedasGanhas > 0) setTimeout(() => sound.playCoin(), 180)
    if (event.combo >= 2) setTimeout(() => sound.playCombo(event.combo), 320)
    if (event.comboQuebrado) sound.playComboBroken()
    if (event.type === 'serve_error' || event.type === 'refuse_incorrect') reagirMascote('triste')
    else if (event.combo >= 5 && event.combo % 5 === 0) reagirMascote('festa')
    else if (event.moedasGanhas > 0) reagirMascote('feliz')

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
            combo={shiftState.combo}
            moedas={shiftState.moedas}
            perfil={perfil}
            reacaoMascote={reacaoMascote}
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
        {avisoAceito && screen === 'inicio' && !mostrarAjuda && !mostrarPresente && (
          <TelaInicio
            key="inicio"
            perfil={perfil}
            progress={progress}
            presenteHoje={presenteDisponivel(perfil, hoje)}
            bausDisponiveis={BAUS_ESTRELAS.filter((b) => bauDisponivel(perfil, progress, b)).length}
            onJogar={() => setScreen('selecao')}
            onComoJogar={() => setMostrarAjuda(true)}
            onConquistas={() => setScreen('conquistas')}
            onLoja={() => setScreen('loja')}
            onPresente={() => setMostrarPresente(true)}
          />
        )}
        {avisoAceito && screen === 'inicio' && !mostrarAjuda && mostrarPresente && (
          <PresenteDiario
            key="presente"
            perfil={perfil}
            hoje={hoje}
            onResgatar={handleResgatarPresente}
            onFechar={() => setMostrarPresente(false)}
          />
        )}
        {avisoAceito && screen === 'conquistas' && (
          <TelaConquistas
            key="conquistas"
            perfil={perfil}
            progress={progress}
            onAbrirBau={handleAbrirBau}
            onVoltar={() => setScreen('inicio')}
          />
        )}
        {avisoAceito && screen === 'loja' && (
          <TelaLoja
            key="loja"
            perfil={perfil}
            onComprar={handleComprar}
            onEquipar={handleEquipar}
            onVoltar={() => setScreen('inicio')}
          />
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
            relatorio={relatorio}
            temProximo={shiftIndex < SHIFTS.length - 1}
            onTentarNovamente={() => startShift(shiftIndex)}
            onProximo={() => startShift(shiftIndex + 1)}
            onTurnos={() => setScreen('selecao')}
          />
        )}
        {mostrarAjuda && <TelaAjuda key="ajuda" onFechar={() => setMostrarAjuda(false)} />}
      </AnimatePresence>

      <ToastsConquista toasts={toasts} />
    </div>
  )
}
