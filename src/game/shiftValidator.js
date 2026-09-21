// Validador de conteúdo: em vez de um BFS ótimo (que não se traduz bem a uma
// simulação soft real-time), simula um "jogador razoável" dirigindo as
// funções REAIS da engine (tick/startService/askQuestion/attemptServe/
// resolveDistraction) em loop. Isso também funciona como cobertura de
// regressão comportamental da engine, já que o projeto não usa um framework de
// testes — ver README.
//
// O jogador simulado agora também CONDUZ A ANAMNESE: antes de decidir, faz as
// perguntas que aquele atendimento exigia. Isso é o que garante que os turnos
// continuam vencíveis depois que perguntar passou a custar paciência — um turno
// que só fecha se o jogador adivinhar sem perguntar é um turno mal calibrado.

import { PRODUCTS, getProductById } from './products.js'
import { RULE_FACTORIES, evaluateAll, productSatisfiesRequest } from './rules.js'
import { camposCriticos, jaPerguntou } from './anamnese.js'
import {
  createShiftState,
  arrivalToCustomer,
  tick,
  startService,
  askQuestion,
  attemptServe,
  resolveDistraction,
  findServableItem,
  getActiveCustomer,
  summarize,
} from './engine.js'

const STEP_MS = 500
const SERVICE_BASE_MS = 5000
const SERVICE_PER_RULE_MS = 1200
// tempo real que o jogador gasta clicando/lendo cada resposta da anamnese — a
// paciência do cliente entrevistado já é cobrada pela engine; isto aqui é a
// pressão que a entrevista coloca sobre o RESTO da fila.
const SERVICE_PER_QUESTION_MS = 700
const REPUTATION_SLACK = 8
const MAX_GUARD_ITERATIONS = 20000

function candidateItemsFor(customer, shift) {
  return shift.estoque.filter((s) =>
    productSatisfiesRequest(getProductById(s.produtoId), customer.request, customer),
  )
}

// Ground truth: dado um cliente e o estoque do turno, decide qual item e qual
// decisão um atendente perfeito tomaria — entrega sem violação se existir uma
// opção limpa; senão recusa (usando o candidato com menos violações).
function decideAction(shift, customer) {
  const candidates = candidateItemsFor(customer, shift)
  if (candidates.length === 0) return null

  let best = null
  for (const shelfItem of candidates) {
    const product = getProductById(shelfItem.produtoId)
    const violations = evaluateAll({ product, shelfItem, customer, options: { receitaRetida: true, orientacaoDada: true } })
    const blocking = violations.some((v) => v.blocksSale)
    if (!blocking) {
      return { itemId: shelfItem.id, decision: 'entregar', violations: [] }
    }
    if (!best || violations.length < best.violations.length) {
      best = { itemId: shelfItem.id, violations }
    }
  }
  return { itemId: best.itemId, decision: 'recusar', violations: best.violations }
}

export function simulateShift(shift, options = {}) {
  const stepMs = options.stepMs ?? STEP_MS
  let state = createShiftState(shift)
  const trace = []
  let guard = 0
  let error = null

  while (state.status === 'playing' && guard < MAX_GUARD_ITERATIONS) {
    guard += 1

    if (state.activeDistractions.length > 0) {
      const distraction = state.activeDistractions[0]
      const choiceId = distraction.tipo === 'troco' ? distraction.correctChoiceId : null
      const res = resolveDistraction(state, distraction.id, choiceId)
      state = res.state
      trace.push(res.event)
      continue
    }

    if (!state.activeCustomerId) {
      const waiting = state.queue.find((c) => c.state === 'waiting')
      if (!waiting) {
        const t = tick(state, stepMs)
        state = t.state
        trace.push(...t.events)
        continue
      }
      const res = startService(state, waiting.id)
      state = res.state
      continue
    }

    let customer = getActiveCustomer(state)
    if (!customer) {
      state = { ...state, activeCustomerId: null }
      continue
    }

    // 1. anamnese: pergunta o que esse atendimento exigia (a engine cobra a
    //    paciência do cliente entrevistado em cada pergunta).
    let perguntasFeitas = 0
    for (const campo of camposCriticos(customer, shift)) {
      if (jaPerguntou(customer, campo)) continue
      const res = askQuestion(state, customer.id, campo)
      state = res.state
      customer = getActiveCustomer(state) ?? customer
      perguntasFeitas += 1
    }

    // 2. decide com base na verdade sobre o paciente
    const decision = decideAction(shift, customer)
    if (!decision) {
      error = `Sem item válido no estoque para atender "${customer.nome}" (${customer.id}) — pedido: ${JSON.stringify(customer.request)}`
      break
    }

    const thinkMs =
      SERVICE_BASE_MS +
      perguntasFeitas * SERVICE_PER_QUESTION_MS +
      decision.violations.length * SERVICE_PER_RULE_MS
    let elapsed = 0
    while (elapsed < thinkMs && state.status === 'playing' && state.activeDistractions.length === 0) {
      const step = Math.min(stepMs, thinkMs - elapsed)
      const t = tick(state, step)
      state = t.state
      trace.push(...t.events)
      elapsed += step
    }
    if (state.status !== 'playing') break
    if (state.activeDistractions.length > 0) continue
    // o cliente pode ter ido embora durante a entrevista/consulta
    if (!getActiveCustomer(state)) continue

    const res = attemptServe(state, shift, customer.id, decision.itemId, decision.decision, {
      receitaRetida: true,
      orientacaoDada: true,
    })
    state = res.state
    trace.push(res.event)
  }

  if (guard >= MAX_GUARD_ITERATIONS && state.status === 'playing') {
    error = 'Simulação não convergiu (loop guard atingido) — possível ciclo infinito no turno'
  }

  return { state, trace, error }
}

function checkReferentialIntegrity(shift) {
  const problems = []
  const productIds = new Set(PRODUCTS.map((p) => p.id))
  const shelfIds = new Set()

  for (const item of shift.estoque) {
    if (shelfIds.has(item.id)) problems.push(`estoque: id de prateleira duplicado "${item.id}"`)
    shelfIds.add(item.id)
    if (!productIds.has(item.produtoId)) {
      problems.push(`estoque: produtoId desconhecido "${item.produtoId}" (item "${item.id}")`)
    }
  }

  const customerIds = new Set()
  for (const arrival of shift.arrivals) {
    if (customerIds.has(arrival.id)) problems.push(`arrivals: id de cliente duplicado "${arrival.id}"`)
    customerIds.add(arrival.id)

    if (arrival.request.type === 'produto' && !productIds.has(arrival.request.produtoId)) {
      problems.push(`arrivals["${arrival.id}"]: produtoId desconhecido "${arrival.request.produtoId}"`)
    }
    if (arrival.request.type === 'generico') {
      if (!productIds.has(arrival.request.produtoReferenciaId)) {
        problems.push(
          `arrivals["${arrival.id}"]: produtoReferenciaId desconhecido "${arrival.request.produtoReferenciaId}"`,
        )
      }
      if (!arrival.request.principioAtivo || !arrival.request.dose) {
        problems.push(`arrivals["${arrival.id}"]: pedido de genérico sem principioAtivo/dose`)
      }
    }
    if (arrival.request.type === 'receita') {
      if (!arrival.request.itens?.length || arrival.request.itens.length > 3) {
        problems.push(`arrivals["${arrival.id}"]: receita precisa ter entre 1 e 3 itens`)
      }
    }
    if (arrival.paciente && typeof arrival.paciente.idade !== 'number') {
      problems.push(`arrivals["${arrival.id}"]: paciente de terceiro precisa declarar idade`)
    }
    if (arrival.paciente && !arrival.paciente.descricao) {
      problems.push(`arrivals["${arrival.id}"]: paciente de terceiro precisa de "descricao" (ex.: "minha mãe")`)
    }
  }

  for (const distraction of shift.distractions ?? []) {
    if (distraction.tipo === 'troco') {
      const ids = distraction.options?.map((o) => o.id) ?? []
      if (!ids.includes(distraction.correctChoiceId)) {
        problems.push(`distractions["${distraction.id}"]: correctChoiceId não existe em options`)
      }
    }
  }

  return problems
}

// Estado mínimo para exercitar attemptServe fora de uma partida completa.
function loneCustomerState(customer) {
  return {
    status: 'playing',
    clockMs: 0,
    durationMs: 999999,
    reputation: 60,
    reputationTarget: 100,
    minReputation: 0,
    score: 0,
    served: 0,
    lost: 0,
    queue: [customer],
    activeCustomerId: customer.id,
    arrivalsPending: [],
    log: [],
  }
}

// Regressão do exploit "pego qualquer coisa errada e clico Recusar".
//
// Recusar tem que ser julgado pelo CLIENTE, não pelo item que o jogador estava
// segurando: enquanto existir na prateleira algo que atenda aquele cliente com
// segurança, recusar é errado — mesmo segurando um item que de fato não podia
// ser vendido (produto errado, lote vencido tendo lote bom ao lado).
function checkRefusalIntegrity(shift) {
  const problems = []

  for (const arrival of shift.arrivals) {
    const customer = arrivalToCustomer(arrival)
    const atendivel = findServableItem(shift, customer)
    if (!atendivel) continue // cliente que realmente deve ser recusado

    for (const shelfItem of shift.estoque) {
      if (shelfItem.id === atendivel.id) continue
      const product = getProductById(shelfItem.produtoId)
      const violations = evaluateAll({ product, shelfItem, customer, options: { receitaRetida: true, orientacaoDada: true } })
      if (violations.length === 0) continue // esse item também atendia; não é o caso de teste

      const { event } = attemptServe(
        loneCustomerState(customer),
        shift,
        customer.id,
        shelfItem.id,
        'recusar',
        { receitaRetida: true, orientacaoDada: true },
      )
      if (event.type !== 'refuse_incorrect') {
        problems.push(
          `recusa premiada indevidamente: "${arrival.id}" podia ser atendido com ` +
            `"${atendivel.produtoId}", mas recusar segurando "${shelfItem.produtoId}" ` +
            `resultou em "${event.type}"`,
        )
        return problems // um exemplo basta
      }
    }
  }

  return problems
}

export function validateShift(shift) {
  const problems = [...checkReferentialIntegrity(shift), ...checkRefusalIntegrity(shift)]
  const { state, trace, error } = simulateShift(shift)
  if (error) problems.push(error)

  const summary = summarize(state)
  if (!error) {
    if (state.status !== 'won') {
      problems.push(`simulação não venceu o turno (status final: "${state.status}")`)
    } else if (state.reputation < shift.reputationTarget + REPUTATION_SLACK) {
      problems.push(
        `reputação final da simulação (${state.reputation}) não tem margem suficiente sobre a meta ` +
          `(${shift.reputationTarget}); esperado >= ${shift.reputationTarget + REPUTATION_SLACK}`,
      )
    }
    if (summary.lost > 0) {
      problems.push(
        `${summary.lost} cliente(s) perdido(s) por impaciência mesmo com atendimento ideal ` +
          `(a anamnese cabe no orçamento de paciência? ver patienceMaxMs)`,
      )
    }
    // Um jogador que faz a entrevista direito não deveria acertar "no escuro":
    // se isso acontece, camposCriticos não está enxergando o turno.
    if (summary.acertosNoEscuro > 0) {
      problems.push(
        `${summary.acertosNoEscuro} decisão(ões) certa(s) sem anamnese completa mesmo com o jogador ideal ` +
          `perguntando tudo que era crítico — inconsistência em camposCriticos`,
      )
    }
  }

  const refuseTags = trace
    .filter((e) => e.type === 'refuse_correct')
    .flatMap((e) => e.violations.map((v) => v.tag))

  return { ok: problems.length === 0, problems, summary, refuseTags }
}

// Cobertura de regra != regra ter sido o motivo de uma recusa no jogo ideal —
// para regras como wrongProduct/expiredProduct/controlledWithoutRetention, o
// jogador "perfeito" simplesmente evita a armadilha (pega o lote certo, o
// produto certo, marca a retenção). O que importa para "todo turno exercita
// suas regras" é que a ARMADILHA EXISTA: cruzamos todo cliente do turno com
// todo item do estoque e coletamos quais regras teriam sido violadas se o
// jogador tivesse escolhido aquela combinação.
function reachableViolationTags(shift) {
  const tags = new Set()
  for (const arrival of shift.arrivals) {
    const customer = arrivalToCustomer(arrival)
    for (const shelfItem of shift.estoque) {
      const product = getProductById(shelfItem.produtoId)
      const violations = evaluateAll({ product, shelfItem, customer, options: { receitaRetida: false } })
      violations.forEach((v) => tags.add(v.tag))
    }
  }
  return tags
}

export function validateAllShifts(shifts) {
  const perShift = shifts.map((shift) => ({ shiftId: shift.id, nome: shift.nome, ...validateShift(shift) }))

  const coveredTags = new Set(shifts.flatMap((shift) => [...reachableViolationTags(shift)]))
  const allTags = Object.keys(RULE_FACTORIES)
  const missingCoverage = allTags.filter((tag) => !coveredTags.has(tag))

  // aviso não bloqueante: a curva de dificuldade percebida deveria crescer
  const warnings = []
  for (let i = 1; i < shifts.length; i += 1) {
    const prev = shifts[i - 1]
    const curr = shifts[i]
    if (curr.arrivals.length < prev.arrivals.length - 1) {
      warnings.push(`"${curr.nome}" tem menos clientes que "${prev.nome}" — confira a curva de dificuldade`)
    }
  }

  return {
    ok: perShift.every((r) => r.ok) && missingCoverage.length === 0,
    perShift,
    missingCoverage,
    warnings,
  }
}
