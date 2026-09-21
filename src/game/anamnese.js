// Anamnese: as perguntas que o atendente pode fazer no balcão.
//
// Este módulo é a razão pela qual o jogo deixou de ser "leia a ficha e compare".
// Os dados clínicos do cliente (condições, medicamentos em uso, para quem é o
// remédio, se tem receita) NÃO aparecem de graça: eles só entram na ficha
// depois que o jogador PERGUNTA, e cada pergunta consome paciência daquele
// cliente. Entregar sem perguntar continua sendo possível — e é exatamente a
// aposta que o jogo quer que o estudante aprenda a não fazer.
//
// As regras (src/game/rules.js) continuam avaliando a VERDADE sobre o paciente,
// perguntada ou não. Esconder o dado muda o que o jogador sabe, nunca o que é
// certo dispensar.
//
// Tudo aqui é puro: as respostas são texto derivado dos dados do cliente, sem
// aleatoriedade, para que o validador consiga simular a entrevista.

import { ALERGIA_LABEL, getProductById, labelPrincipio } from './products.js'
import { getPaciente, productSatisfiesRequest } from './rules.js'

// O custo é o coração do jogo: perguntar tudo a todo mundo tem que DOER, senão
// a escolha "pergunto ou arrisco?" não existe e a anamnese vira uma checklist
// que o jogador executa no piloto automático. Somando as seis dá 26s — mais que
// o tempo de um atendimento inteiro e mais de um terço da paciência típica de um
// cliente. Mexer aqui muda o equilíbrio de todos os turnos: rode
// `npm run validate` depois.
export const PERGUNTAS = [
  {
    id: 'paciente',
    label: 'É para você mesmo?',
    custoMs: 4000,
    revela: 'paciente',
  },
  {
    id: 'condicoes',
    label: 'Alguma condição de saúde? Gestante, amamentando, pressão alta?',
    custoMs: 5000,
    revela: 'condicoes',
  },
  {
    id: 'medicamentos',
    label: 'Está tomando algum outro medicamento?',
    custoMs: 5000,
    revela: 'medicamentos',
  },
  {
    id: 'alergias',
    label: 'Tem alergia a algum medicamento?',
    custoMs: 4000,
    revela: 'alergias',
  },
  {
    // A pergunta que separa o balconista do farmacêutico: caracterizar o
    // quadro. Duração, evolução e sintomas associados são o que distingue
    // "dor de barriga" de gases, cólica, azia — e o que revela um sinal de
    // alerta que não é caso de automedicação.
    id: 'detalhes',
    label: 'Como é exatamente? Há quanto tempo?',
    custoMs: 5000,
    revela: 'detalhes',
  },
  {
    id: 'receita',
    label: 'Tem a receita em mãos?',
    custoMs: 3000,
    revela: 'receita',
  },
]

export const PERGUNTA_IDS = PERGUNTAS.map((p) => p.id)

export function getPergunta(id) {
  return PERGUNTAS.find((p) => p.id === id) ?? null
}

// Tags que o cliente conta quando perguntado. As tags derivadas da idade
// (menor_de_12, idoso) ficam de fora de propósito: elas vêm da idade, que é
// visível para o próprio cliente e só aparece para um terceiro depois da
// pergunta "é para você mesmo?".
const TAG_FRASE = {
  gravidez: { proprio: 'estou grávida', outro: 'está grávida' },
  lactante: { proprio: 'estou amamentando', outro: 'está amamentando' },
  hipertensao: { proprio: 'tenho pressão alta', outro: 'tem pressão alta' },
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function listar(itens) {
  if (itens.length === 0) return ''
  if (itens.length === 1) return itens[0]
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

function responderPaciente(customer) {
  const paciente = getPaciente(customer)
  if (paciente.relacao === 'proprio') return 'É pra mim mesmo, sim.'
  return `Não, é pra ${paciente.descricao}. ${capitalizar(paciente.pronome ?? 'ela')} tem ${paciente.idade} anos.`
}

function responderCondicoes(customer) {
  const paciente = getPaciente(customer)
  const proprio = paciente.relacao === 'proprio'
  const frases = paciente.tags.map((tag) => TAG_FRASE[tag]?.[proprio ? 'proprio' : 'outro']).filter(Boolean)

  if (frases.length === 0) {
    return proprio ? 'Não, nada. Sou saudável.' : `Que eu saiba, ${paciente.descricao} não tem nada.`
  }
  return proprio
    ? `${capitalizar(listar(frases))}.`
    : `${capitalizar(paciente.descricao)} ${listar(frases)}.`
}

function responderMedicamentos(customer) {
  const paciente = getPaciente(customer)
  const proprio = paciente.relacao === 'proprio'
  const emUso = paciente.jaTomaPrincipiosAtivos

  if (emUso.length === 0) {
    return proprio ? 'Não, só isso mesmo.' : `Não, ${paciente.descricao} não toma mais nada.`
  }
  const sujeito = proprio ? 'Tomo' : `${capitalizar(paciente.descricao)} toma`
  return `${sujeito} ${listar(emUso.map(labelPrincipio))} todo dia.`
}

function responderAlergias(customer) {
  const paciente = getPaciente(customer)
  const proprio = paciente.relacao === 'proprio'
  if (paciente.alergias.length === 0) {
    return proprio ? 'Alergia a remédio? Não, nenhuma.' : `Não, ${paciente.descricao} não tem alergia a remédio.`
  }
  const nomes = listar(paciente.alergias.map((a) => ALERGIA_LABEL[a] ?? a))
  return proprio
    ? `Tenho sim — não posso tomar ${nomes}.`
    : `${capitalizar(paciente.descricao)} não pode tomar ${nomes}.`
}

function responderDetalhes(customer) {
  return customer.request.quadro ?? 'É só isso mesmo, começou faz pouco tempo e não tem mais nada.'
}

function responderReceita(customer) {
  return customer.hasReceita ? 'Tenho sim, está aqui comigo.' : 'Receita eu não tenho, não.'
}

const RESPOSTAS = {
  paciente: responderPaciente,
  condicoes: responderCondicoes,
  medicamentos: responderMedicamentos,
  alergias: responderAlergias,
  detalhes: responderDetalhes,
  receita: responderReceita,
}

// Texto que o cliente responde — puro, derivado só dos dados do cliente.
export function responder(customer, perguntaId) {
  const gerar = RESPOSTAS[perguntaId]
  return gerar ? gerar(customer) : ''
}

export function jaPerguntou(customer, perguntaId) {
  return (customer?.perguntasFeitas ?? []).includes(perguntaId)
}

// Quais perguntas esse atendimento realmente exigia. É o gabarito da entrevista:
// perguntar além disso só custa tempo, mas deixar uma dessas de fora significa
// ter decidido no escuro — mesmo que a decisão tenha dado certo por sorte.
export function camposCriticos(customer, shift) {
  const criticos = []
  const paciente = getPaciente(customer)

  // Quem vai tomar não é quem está no balcão: sem essa pergunta, idade e
  // condições lidas na ficha são as da pessoa errada.
  if (paciente.relacao !== 'proprio') criticos.push('paciente')

  // Só conta como crítica a condição declarada — as derivadas da idade
  // (menor_de_12/idoso) vêm junto com a idade, não com essa pergunta.
  const tagsDeclaradas = (customer.paciente?.tags ?? customer.tags ?? []).filter((t) => TAG_FRASE[t])
  if (tagsDeclaradas.length > 0) criticos.push('condicoes')

  if (paciente.jaTomaPrincipiosAtivos.length > 0) criticos.push('medicamentos')

  if (paciente.alergias.length > 0) criticos.push('alergias')

  // O quadro clínico é crítico sempre que o turno escreveu um: ou ele estreita
  // o diferencial (dor abdominal é gases? cólica? azia?), ou esconde um sinal
  // de alerta. Quando o pedido não tem `quadro`, não havia nada a caracterizar.
  if (customer.request.quadro) criticos.push('detalhes')

  // A receita importa quando algum item capaz de atender o pedido a exige.
  const exigeReceitaNoPedido = (shift?.estoque ?? []).some((shelfItem) => {
    const product = getProductById(shelfItem.produtoId)
    return product?.exigeReceita && productSatisfiesRequest(product, customer.request, customer)
  })
  if (exigeReceitaNoPedido) criticos.push('receita')

  return criticos
}

export function anamneseCompleta(customer, shift) {
  return camposCriticos(customer, shift).every((campo) => jaPerguntou(customer, campo))
}

// Perguntas críticas que ficaram sem resposta — usado no feedback de erro
// ("você entregou sem perguntar se ela estava grávida").
export function criticasNaoPerguntadas(customer, shift) {
  return camposCriticos(customer, shift).filter((campo) => !jaPerguntou(customer, campo))
}
