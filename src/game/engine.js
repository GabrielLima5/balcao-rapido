// Estado puro do turno + funções de transição.
//
// Nenhuma função aqui toca DOM, timers ou Date.now() — quem dirige o relógio é
// src/hooks/useGameClock.js, que chama tick(state, deltaMs) a cada frame. A UI
// (App.jsx) só chama createShiftState e as funções de transição abaixo; toda a
// lógica de fila, paciência, anamnese, reputação e vitória/derrota vive aqui.

import { getProductById } from './products.js'
import { evaluateAll, productSatisfiesRequest } from './rules.js'
import { anamneseCompleta, criticasNaoPerguntadas, getPergunta, responder } from './anamnese.js'

export const REPUTATION_MAX = 100

const SERVE_SUCCESS_REPUTATION = 6
const SERVE_ERROR_REPUTATION_PER_VIOLATION = 10
const REFUSE_CORRECT_REPUTATION = 4
const REFUSE_INCORRECT_REPUTATION = 6
const IMPATIENT_REPUTATION_PENALTY = 8
const DISTRACTION_IGNORED_PENALTY = 3
const DISTRACTION_WRONG_PENALTY = 4

const SERVE_SUCCESS_BASE_SCORE = 80
const SERVE_SUCCESS_PATIENCE_BONUS = 60
const REFUSE_CORRECT_SCORE = 30
const ITEM_SUCCESS_REPUTATION = 3
const ITEM_SUCCESS_SCORE = 40

// Bônus por ter decidido COM a informação na mão: todas as perguntas que aquele
// atendimento exigia foram feitas antes de entregar/recusar. Não existe punição
// por decidir no escuro e acertar — só a ausência deste bônus. Ver
// src/game/anamnese.js#camposCriticos.
const ANAMNESE_BONUS_SCORE = 35

const DEFAULT_DISTRACTION_DURATION_MS = 12000

// Assim que uma vaga abre na fila (cliente atendido ou foi embora), o próximo
// pedido pendente é "puxado" para chegar logo em seguida — no máximo esse
// intervalo depois — em vez de esperar o horário original do roteiro, que
// pode estar bem mais à frente. Isso evita o jogador ficar parado esperando
// enquanto ainda há gente para atender. Se a fila ficar totalmente vazia, o
// intervalo é ainda menor — o jogador nunca deveria ficar olhando para uma
// fila vazia por muito tempo.
const MIN_GAP_AFTER_DEPARTURE_MS = 3000
const MIN_GAP_AFTER_QUEUE_EMPTY_MS = 1200

// Se o jogador atende tão rápido que esvazia a fila E o roteiro do turno
// (shift.arrivals) inteiro antes do tempo acabar, o turno passa a gerar
// clientes extras "de preenchimento" para que ele nunca fique parado sem
// ninguém para atender perto do fim da fase. Só nasce um cliente extra
// quando a fila já está vazia e não há mais ninguém agendado — ou seja, o
// próprio ritmo do jogador determina se algum extra chega a aparecer.
const FILLER_MIN_REMAINING_MS = 12000
const FILLER_NAMES = [
  'Cláudia', 'Fábio', 'Rita', 'Sérgio', 'Ana', 'Vinícius', 'Débora', 'Rafael', 'Sandra', 'Léo',
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clampReputation(value) {
  return clamp(value, 0, REPUTATION_MAX)
}

// Produtos "seguros" para clientes de preenchimento: sem contraindicação, sem
// interação, sem receita/controle e sem apresentação restrita a uma faixa
// etária — para não introduzir uma pegadinha nova que o turno não planejou. Se
// o turno não tiver nenhum produto assim, cai para qualquer item dentro da
// validade — ainda assim consistente com as regras do turno.
function buildFillerPool(shift) {
  const seguros = shift.estoque.filter((item) => {
    if (item.validadeStatus !== 'ok') return false
    const produto = getProductById(item.produtoId)
    return (
      produto &&
      !produto.exigeReceita &&
      produto.classeControlada === 'nenhuma' &&
      produto.contraindicacoes.length === 0 &&
      produto.interacoes.length === 0 &&
      produto.publicoAlvo !== 'pediatrico'
    )
  })
  const pool = seguros.length > 0 ? seguros : shift.estoque.filter((item) => item.validadeStatus === 'ok')
  return pool.map((item) => {
    const produto = getProductById(item.produtoId)
    return { itemId: item.id, produtoId: item.produtoId, nome: produto.nome }
  })
}

function averagePatienceMs(arrivals) {
  if (arrivals.length === 0) return 30000
  const total = arrivals.reduce((sum, a) => sum + a.patienceMaxMs, 0)
  return Math.round(total / arrivals.length)
}

// Monta o próximo cliente de preenchimento de forma determinística (cicla
// pelos pools por índice) — a engine continua pura, sem Math.random/Date.
function buildFillerArrival(state, referenceMs) {
  const template = state.fillerPool[state.fillerSpawnCount % state.fillerPool.length]
  const nome = FILLER_NAMES[state.fillerSpawnCount % FILLER_NAMES.length]
  return {
    id: `filler-${state.fillerSpawnCount}`,
    arrivalMs: referenceMs + MIN_GAP_AFTER_QUEUE_EMPTY_MS,
    patienceMaxMs: state.fillerPatienceMs,
    nome,
    idade: 30,
    humor: 'neutro',
    tags: [],
    hasReceita: false,
    jaTomaPrincipiosAtivos: [],
    request: {
      type: 'produto',
      produtoId: template.produtoId,
      rotulo: template.nome,
      mensagem: `Oi, você tem ${template.nome}?`,
    },
  }
}

// Se o jogador esvaziou a fila E o roteiro do turno, e ainda sobra tempo
// suficiente de turno, agenda mais um cliente para não deixar ninguém parado.
function ensureFillerScheduled(state, referenceMs) {
  if (state.queue.length > 0) return state
  if (state.arrivalsPending.length > 0) return state
  if (state.fillerPool.length === 0) return state
  if (state.durationMs - referenceMs < FILLER_MIN_REMAINING_MS) return state

  const filler = buildFillerArrival(state, referenceMs)
  return {
    ...state,
    arrivalsPending: [filler],
    fillerSpawnCount: state.fillerSpawnCount + 1,
  }
}

// --- criação de estado -----------------------------------------------------

export function createShiftState(shift) {
  let state = {
    shiftId: shift.id,
    clockMs: 0,
    durationMs: shift.durationMs,
    reputation: shift.reputationStart,
    reputationTarget: shift.reputationTarget,
    minReputation: 0,
    score: 0,
    served: 0,
    lost: 0,
    queue: [],
    activeCustomerId: null,
    arrivalsPending: [...shift.arrivals].sort((a, b) => a.arrivalMs - b.arrivalMs),
    pendingDistractions: [...(shift.distractions ?? [])].sort((a, b) => a.triggerMs - b.triggerMs),
    activeDistractions: [],
    maxQueueVisible: shift.maxQueueVisible,
    status: 'playing',
    log: [],
    fillerPool: buildFillerPool(shift),
    fillerPatienceMs: averagePatienceMs(shift.arrivals),
    fillerSpawnCount: 0,
  }
  state = spawnDueArrivals(state).state
  state = spawnDueDistractions(state)
  return state
}

// Quem vai tomar o remédio. Quando o turno não diz nada, é o próprio cliente —
// assim todo conteúdo antigo continua válido sem precisar repetir os dados.
function normalizePaciente(arrival) {
  const p = arrival.paciente
  if (!p) {
    return {
      relacao: 'proprio',
      descricao: 'o próprio cliente',
      pronome: 'ele',
      idade: arrival.idade,
      tags: arrival.tags ?? [],
      jaTomaPrincipiosAtivos: arrival.jaTomaPrincipiosAtivos ?? [],
      alergias: arrival.alergias ?? [],
    }
  }
  return {
    relacao: p.relacao ?? 'terceiro',
    descricao: p.descricao,
    pronome: p.pronome ?? 'ela',
    idade: p.idade,
    tags: p.tags ?? [],
    jaTomaPrincipiosAtivos: p.jaTomaPrincipiosAtivos ?? [],
    alergias: p.alergias ?? [],
  }
}

export function arrivalToCustomer(arrival) {
  return {
    id: arrival.id,
    nome: arrival.nome,
    idade: arrival.idade,
    humor: arrival.humor ?? 'neutro',
    tags: arrival.tags ?? [],
    hasReceita: Boolean(arrival.hasReceita),
    jaTomaPrincipiosAtivos: arrival.jaTomaPrincipiosAtivos ?? [],
    paciente: normalizePaciente(arrival),
    request: arrival.request,
    // Anamnese: começa vazia. O que o jogador não perguntar continua oculto na
    // ficha — mas as regras seguem valendo sobre a verdade.
    perguntasFeitas: [],
    anamnese: [],
    // Receita com 1-3 itens: lista de princípios ativos ainda não entregues.
    // null para pedidos de item único (produto/genérico/sintoma).
    itensPendentes:
      arrival.request.type === 'receita' ? arrival.request.itens.map((i) => i.principioAtivo) : null,
    patienceMaxMs: arrival.patienceMaxMs,
    patienceMs: arrival.patienceMaxMs,
    state: 'waiting',
  }
}

// Spawna todo arrival cujo arrivalMs já venceu. Se a fila estiver cheia no
// momento em que um novo cliente precisaria entrar, o turno falha ali mesmo —
// é a implementação literal de "fila estoura".
function spawnDueArrivals(state) {
  const events = []
  let queue = state.queue
  let arrivalsPending = state.arrivalsPending
  let status = state.status

  while (arrivalsPending.length > 0 && arrivalsPending[0].arrivalMs <= state.clockMs) {
    if (status !== 'playing') break
    if (queue.length >= state.maxQueueVisible) {
      status = 'lost'
      events.push({ type: 'queue_overflow' })
      break
    }
    const [arrival, ...rest] = arrivalsPending
    arrivalsPending = rest
    queue = [...queue, arrivalToCustomer(arrival)]
    events.push({ type: 'customer_arrived', customerId: arrival.id })
  }

  return { state: { ...state, queue, arrivalsPending, status }, events }
}

// Antecipa o próximo pedido pendente para chegar logo depois de uma vaga
// abrir na fila, em vez de esperar o arrivalMs original do roteiro. Usa um
// intervalo bem mais curto quando isso deixaria a fila vazia.
function pullNextArrivalForward(state, referenceMs) {
  if (state.arrivalsPending.length === 0) return state
  const gapMs = state.queue.length === 0 ? MIN_GAP_AFTER_QUEUE_EMPTY_MS : MIN_GAP_AFTER_DEPARTURE_MS
  const [next, ...rest] = state.arrivalsPending
  const arrivalMs = Math.min(next.arrivalMs, referenceMs + gapMs)
  if (arrivalMs === next.arrivalMs) return state
  return { ...state, arrivalsPending: [{ ...next, arrivalMs }, ...rest] }
}

function spawnDueDistractions(state) {
  let pendingDistractions = state.pendingDistractions
  let activeDistractions = state.activeDistractions

  while (pendingDistractions.length > 0 && pendingDistractions[0].triggerMs <= state.clockMs) {
    const [distraction, ...rest] = pendingDistractions
    pendingDistractions = rest
    activeDistractions = [
      ...activeDistractions,
      {
        id: distraction.id,
        tipo: distraction.tipo,
        options: distraction.options ?? null,
        correctChoiceId: distraction.correctChoiceId ?? null,
        enunciado: distraction.enunciado ?? null,
        expiresAtMs: state.clockMs + (distraction.durationMs ?? DEFAULT_DISTRACTION_DURATION_MS),
      },
    ]
  }

  return { ...state, pendingDistractions, activeDistractions }
}

// --- tick: avanço de tempo real ---------------------------------------------

export function tick(state, deltaMs) {
  if (state.status !== 'playing' || deltaMs <= 0) {
    return { state, events: [] }
  }

  const events = []
  const clockMs = Math.min(state.clockMs + deltaMs, state.durationMs)
  let next = { ...state, clockMs }

  // 1. paciência decai para todo mundo na fila, inclusive quem está sendo atendido
  //    (simplificação deliberada: o atendimento não pausa o relógio do cliente).
  let reputation = next.reputation
  let houveDesistencia = false
  const remainingQueue = []
  for (const customer of next.queue) {
    const patienceMs = customer.patienceMs - deltaMs
    if (patienceMs <= 0) {
      reputation = clampReputation(reputation - IMPATIENT_REPUTATION_PENALTY)
      next.lost += 1
      houveDesistencia = true
      next.log.push({ type: 'customer_left_impatient', customerId: customer.id, atMs: clockMs })
      events.push({ type: 'customer_left_impatient', customerId: customer.id })
      if (next.activeCustomerId === customer.id) next.activeCustomerId = null
    } else {
      remainingQueue.push({ ...customer, patienceMs })
    }
  }
  next.queue = remainingQueue
  next.reputation = reputation
  if (houveDesistencia) next = pullNextArrivalForward(next, clockMs)

  // 2. novas chegadas (pode encerrar o turno por estouro de fila)
  const spawned = spawnDueArrivals(next)
  next = spawned.state
  events.push(...spawned.events)

  // 2b. se o jogador ficou sem ninguém pra atender e ainda sobra tempo de
  //     turno, agenda um cliente extra em vez de deixá-lo esperando à toa.
  next = ensureFillerScheduled(next, clockMs)

  // 3. distrações: dispara as pendentes, penaliza as que expiraram sem resposta
  next = spawnDueDistractions(next)
  const stillActive = []
  for (const distraction of next.activeDistractions) {
    if (distraction.expiresAtMs <= clockMs) {
      next.reputation = clampReputation(next.reputation - DISTRACTION_IGNORED_PENALTY)
      next.log.push({ type: 'distraction_expired', distractionId: distraction.id, atMs: clockMs })
      events.push({ type: 'distraction_expired', distractionId: distraction.id })
    } else {
      stillActive.push(distraction)
    }
  }
  next.activeDistractions = stillActive

  // 4. resolve vitória/derrota
  if (next.status === 'playing') {
    if (next.reputation <= next.minReputation) {
      next.status = 'lost'
    } else if (next.clockMs >= next.durationMs) {
      next.status = next.reputation >= next.reputationTarget ? 'won' : 'lost'
    }
  }

  return { state: next, events }
}

// --- ações do jogador --------------------------------------------------------

export function startService(state, customerId) {
  const customer = state.queue.find((c) => c.id === customerId)
  if (!customer || customer.state !== 'waiting') {
    return { state, event: { type: 'idle' } }
  }
  const queue = state.queue.map((c) => (c.id === customerId ? { ...c, state: 'being_served' } : c))
  return { state: { ...state, queue, activeCustomerId: customerId }, event: { type: 'service_started', customerId } }
}

export function cancelService(state, customerId) {
  if (state.activeCustomerId !== customerId) {
    return { state, event: { type: 'idle' } }
  }
  const queue = state.queue.map((c) => (c.id === customerId ? { ...c, state: 'waiting' } : c))
  return { state: { ...state, queue, activeCustomerId: null }, event: { type: 'service_cancelled', customerId } }
}

// Pergunta da anamnese: revela um dado do cliente e cobra o preço em paciência.
// O que não for perguntado continua oculto na ficha — mas as regras seguem
// valendo sobre a verdade, perguntada ou não.
export function askQuestion(state, customerId, perguntaId) {
  if (state.status !== 'playing') {
    return { state, event: { type: 'idle' } }
  }
  const customer = state.queue.find((c) => c.id === customerId)
  const pergunta = getPergunta(perguntaId)
  if (!customer || !pergunta || customer.perguntasFeitas.includes(perguntaId)) {
    return { state, event: { type: 'idle' } }
  }

  const resposta = responder(customer, perguntaId)
  const entrada = { perguntaId, label: pergunta.label, resposta }
  const queue = state.queue.map((c) =>
    c.id === customerId
      ? {
          ...c,
          // nunca zera direto: quem gastou toda a paciência do cliente
          // perguntando o vê ir embora no próximo tick, como qualquer outro.
          patienceMs: Math.max(1, c.patienceMs - pergunta.custoMs),
          perguntasFeitas: [...c.perguntasFeitas, perguntaId],
          anamnese: [...c.anamnese, entrada],
        }
      : c,
  )

  return {
    state: { ...state, queue },
    event: { type: 'question_answered', customerId, ...entrada },
  }
}

function finishStatusCheck(state) {
  if (state.status === 'playing' && state.reputation <= state.minReputation) {
    return { ...state, status: 'lost' }
  }
  return state
}

// --- avaliação da recusa -----------------------------------------------------
//
// Uma recusa NÃO é julgada pelo item que o jogador por acaso estava segurando:
// é julgada pelo cliente. Recusar só é a decisão certa quando NADA na prateleira
// poderia ser entregue àquele cliente sem violar alguma regra. Pegar um produto
// obviamente errado (ou o lote vencido, tendo um lote bom ao lado) e recusar
// resolve o item, mas não resolve o problema de quem está no balcão.
//
// A retenção de receita entra como `true` aqui de propósito: reter é uma ação do
// jogador, não uma propriedade do estoque, então um controlado com receita em
// mãos conta como atendível.
export function findServableItem(shift, customer) {
  return (
    shift.estoque.find((shelfItem) => {
      const product = getProductById(shelfItem.produtoId)
      if (!product) return false
      return evaluateAll({ product, shelfItem, customer, options: { receitaRetida: true, orientacaoDada: true } }).length === 0
    }) ?? null
  )
}

// Por que esse cliente era mesmo para ser recusado: pega o item que mais se
// aproxima do que ele pediu e devolve o que trava a venda dele.
function motivoDaRecusa(shift, customer) {
  let melhor = null
  for (const shelfItem of shift.estoque) {
    const product = getProductById(shelfItem.produtoId)
    if (!product || !productSatisfiesRequest(product, customer.request, customer)) continue
    const violations = evaluateAll({ product, shelfItem, customer, options: { receitaRetida: true, orientacaoDada: true } })
    if (!melhor || violations.length < melhor.length) melhor = violations
  }
  if (melhor && melhor.length > 0) return melhor
  return [
    {
      id: 'semOpcaoNaPrateleira',
      tag: 'semOpcaoNaPrateleira',
      blocksSale: true,
      message: `Não havia na prateleira nada que atendesse o pedido de ${customer.nome}.`,
    },
  ]
}

// attemptServe(state, shift, clienteId, itemId, decisao, options)
//   decisao: 'entregar' | 'recusar'
export function attemptServe(state, shift, customerId, itemId, decision, options = {}) {
  if (state.status !== 'playing') {
    return { state, event: { type: 'idle' } }
  }
  const customer = state.queue.find((c) => c.id === customerId)
  const shelfItem = shift.estoque.find((s) => s.id === itemId)
  if (!customer || !shelfItem) {
    return { state, event: { type: 'idle' } }
  }
  const product = getProductById(shelfItem.produtoId)
  const violations = evaluateAll({ product, shelfItem, customer, options })
  const patienceRatio = clamp(customer.patienceMs / customer.patienceMaxMs, 0, 1)

  const anamneseOk = anamneseCompleta(customer, shift)
  const faltouPerguntar = criticasNaoPerguntadas(customer, shift)

  // Receita com mais de um item pendente: uma entrega correta resolve só esse
  // item e mantém o cliente na fila (em atendimento) para os próximos — o
  // atendimento só termina de fato quando o último item é entregue, ou em
  // qualquer erro/recusa (a receita inteira é encerrada nesse caso).
  const isReceita = customer.request.type === 'receita'
  if (isReceita && decision === 'entregar' && violations.length === 0 && customer.itensPendentes.length > 1) {
    const itensPendentes = customer.itensPendentes.filter((p) => p !== product.principioAtivo)
    const queue = state.queue.map((c) => (c.id === customerId ? { ...c, itensPendentes } : c))
    const next = {
      ...state,
      queue,
      reputation: clampReputation(state.reputation + ITEM_SUCCESS_REPUTATION),
      score: state.score + ITEM_SUCCESS_SCORE,
      log: [
        ...state.log,
        { type: 'serve_item_success', customerId, produtoId: shelfItem.produtoId, atMs: state.clockMs },
      ],
    }
    return {
      state: next,
      event: { type: 'serve_item_success', customerId, product, itensPendentes, patienceRatio },
    }
  }

  let type
  let reputationDelta = 0
  let scoreDelta = 0
  let eventViolations = violations

  if (decision === 'entregar' && violations.length === 0) {
    type = 'serve_success'
    reputationDelta = SERVE_SUCCESS_REPUTATION
    scoreDelta = Math.round(SERVE_SUCCESS_BASE_SCORE + SERVE_SUCCESS_PATIENCE_BONUS * patienceRatio)
  } else if (decision === 'entregar') {
    type = 'serve_error'
    reputationDelta = -SERVE_ERROR_REPUTATION_PER_VIOLATION * violations.length
  } else {
    const atendivel = findServableItem(shift, customer)
    if (atendivel) {
      type = 'refuse_incorrect'
      reputationDelta = -REFUSE_INCORRECT_REPUTATION
      eventViolations = [
        {
          id: 'recusaEvitavel',
          tag: 'recusaEvitavel',
          blocksSale: false,
          message:
            `Havia como atender ${customer.nome} com segurança — ` +
            `${getProductById(atendivel.produtoId).nome} resolvia o pedido sem violar nenhuma regra.`,
        },
      ]
    } else {
      type = 'refuse_correct'
      reputationDelta = REFUSE_CORRECT_REPUTATION
      scoreDelta = REFUSE_CORRECT_SCORE
      eventViolations = motivoDaRecusa(shift, customer)
    }
  }

  const decisaoCerta = type === 'serve_success' || type === 'refuse_correct'
  if (decisaoCerta && anamneseOk) scoreDelta += ANAMNESE_BONUS_SCORE

  const queue = state.queue.filter((c) => c.id !== customerId)
  const activeCustomerId = state.activeCustomerId === customerId ? null : state.activeCustomerId
  const logEntry = {
    type,
    customerId,
    customerNome: customer.nome,
    produtoId: shelfItem.produtoId,
    decision,
    violations: eventViolations,
    anamneseOk,
    faltouPerguntar,
    atMs: state.clockMs,
  }

  let next = {
    ...state,
    queue,
    activeCustomerId,
    reputation: clampReputation(state.reputation + reputationDelta),
    score: state.score + scoreDelta,
    served: state.served + 1,
    log: [...state.log, logEntry],
  }
  next = pullNextArrivalForward(next, state.clockMs)
  next = finishStatusCheck(next)

  return {
    state: next,
    event: {
      type,
      customerId,
      product,
      violations: eventViolations,
      decision,
      patienceRatio,
      anamneseOk,
      faltouPerguntar,
    },
  }
}

export function resolveDistraction(state, distractionId, choiceId) {
  const distraction = state.activeDistractions.find((d) => d.id === distractionId)
  if (!distraction) {
    return { state, event: { type: 'idle' } }
  }
  const activeDistractions = state.activeDistractions.filter((d) => d.id !== distractionId)
  const correct = distraction.tipo !== 'troco' || choiceId === distraction.correctChoiceId

  let reputation = state.reputation
  if (!correct) {
    reputation = clampReputation(reputation - DISTRACTION_WRONG_PENALTY)
  }

  let next = {
    ...state,
    activeDistractions,
    reputation,
    log: [...state.log, { type: 'distraction_resolved', distractionId, correct, atMs: state.clockMs }],
  }
  next = finishStatusCheck(next)

  return { state: next, event: { type: 'distraction_resolved', distractionId, correct } }
}

// --- seletores puros ---------------------------------------------------------

export function getActiveCustomer(state) {
  return state.queue.find((c) => c.id === state.activeCustomerId) ?? null
}

export function getVisibleQueue(state) {
  return state.queue
}

export function patienceRatio(customer) {
  return clamp(customer.patienceMs / customer.patienceMaxMs, 0, 1)
}

export function elapsedSeconds(state) {
  return Math.floor(state.clockMs / 1000)
}

export function remainingSeconds(state) {
  return Math.max(0, Math.ceil((state.durationMs - state.clockMs) / 1000))
}

export function summarize(state) {
  const decisoes = state.log.filter((e) =>
    ['serve_success', 'serve_error', 'refuse_correct', 'refuse_incorrect'].includes(e.type),
  )
  const errors = state.log.filter((e) => e.type === 'serve_error').length
  const refusedCorrect = state.log.filter((e) => e.type === 'refuse_correct').length
  const refusedIncorrect = state.log.filter((e) => e.type === 'refuse_incorrect').length
  const successes = state.log.filter((e) => e.type === 'serve_success').length
  const decisoesCertas = decisoes.filter((e) => e.type === 'serve_success' || e.type === 'refuse_correct')
  return {
    status: state.status,
    reputation: state.reputation,
    reputationTarget: state.reputationTarget,
    score: state.score,
    served: state.served,
    lost: state.lost,
    successes,
    errors,
    refusedCorrect,
    refusedIncorrect,
    // quantas decisões certas foram tomadas já sabendo o que precisava saber
    anamneseCompleta: decisoesCertas.filter((e) => e.anamneseOk).length,
    decisoesCertas: decisoesCertas.length,
    // acertos "no escuro": certos, mas decididos sem ter feito as perguntas
    acertosNoEscuro: decisoesCertas.filter((e) => !e.anamneseOk).length,
  }
}
