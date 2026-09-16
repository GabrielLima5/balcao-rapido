// Validador de conteúdo: em vez de um BFS ótimo (que não se traduz bem a uma
// simulação soft real-time), simula um "jogador razoável" dirigindo as
// funções REAIS da engine (tick/startService/attemptServe/resolveDistraction)
// em loop. Isso também funciona como cobertura de regressão comportamental da
// engine, já que o projeto não usa um framework de testes — ver README.

import { PRODUCTS, getProductById } from './products.js'
import { RULE_FACTORIES, evaluateAll } from './rules.js'
import {
  createShiftState,
  tick,
  startService,
  attemptServe,
  resolveDistraction,
  getActiveCustomer,
  summarize,
} from './engine.js'

const STEP_MS = 500
const SERVICE_BASE_MS = 6000
const SERVICE_PER_RULE_MS = 1500
const REPUTATION_SLACK = 8
const MAX_GUARD_ITERATIONS = 20000

function candidateItemsFor(customer, shift) {
  if (customer.request.type === 'produto') {
    return shift.estoque.filter((s) => s.produtoId === customer.request.produtoId)
  }
  const wantedPrincipios =
    customer.request.type === 'receita' ? customer.itensPendentes : customer.request.principiosAceitos
  return shift.estoque.filter((s) => wantedPrincipios?.includes(getProductById(s.produtoId)?.principioAtivo))
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
    const violations = evaluateAll({ product, shelfItem, customer, options: { receitaRetida: true } })
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

    const customer = getActiveCustomer(state)
    if (!customer) {
      state = { ...state, activeCustomerId: null }
      continue
    }

    const decision = decideAction(shift, customer)
    if (!decision) {
      error = `Sem item válido no estoque para atender "${customer.nome}" (${customer.id}) — pedido: ${JSON.stringify(customer.request)}`
      break
    }

    const thinkMs = SERVICE_BASE_MS + decision.violations.length * SERVICE_PER_RULE_MS
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

    const res = attemptServe(state, shift, customer.id, decision.itemId, decision.decision, {
      receitaRetida: true,
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
    if (arrival.request.type === 'receita') {
      if (!arrival.request.itens?.length || arrival.request.itens.length > 3) {
        problems.push(`arrivals["${arrival.id}"]: receita precisa ter entre 1 e 3 itens`)
      }
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

export function validateShift(shift) {
  const problems = checkReferentialIntegrity(shift)
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
      problems.push(`${summary.lost} cliente(s) perdido(s) por impaciência mesmo com atendimento ideal`)
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
    const customer = {
      ...arrival,
      itensPendentes: arrival.request.type === 'receita' ? arrival.request.itens.map((i) => i.principioAtivo) : null,
    }
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
