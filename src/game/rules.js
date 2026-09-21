// Catálogo de regras de erro do atendimento.
//
// Cada regra é uma função-fábrica pura `make() => instance`, registrada em
// RULE_FACTORIES. As regras são sempre TODAS ativas em todo turno — o jogo não
// esconde regras (ver tela de ajuda); a dificuldade vem de quantas precisam ser
// checadas ao mesmo tempo, sob pressão de tempo, e de que boa parte dos dados
// necessários para checá-las só aparece se o atendente PERGUNTAR (ver
// src/game/anamnese.js).
//
// ctx = { product, shelfItem, customer, options }
//   product:   entrada de src/game/products.js
//   shelfItem: entrada de shift.estoque ({ id, produtoId, validadeStatus })
//   customer:  cliente da fila (ver engine.js)
//   options:   { receitaRetida?: boolean } — decisões extras tomadas na confirmação
//
// IMPORTANTE: as regras avaliam o PACIENTE, não o cliente. Quem está no balcão
// nem sempre é quem vai tomar o remédio ("é para minha mãe, ela é hipertensa") —
// getPaciente() resolve isso e é o único ponto que as regras usam para ler
// idade, condições e medicamentos em uso.

import { ALERGIA_LABEL, classesDosPrincipios, labelPrincipio } from './products.js'

const IDADE_CRIANCA = 12
const IDADE_IDOSO = 65

function intersects(listA = [], listB = []) {
  return listA.some((item) => listB.includes(item))
}

// Normaliza "quem vai tomar o remédio". Aceita tanto um cliente já montado pela
// engine (que carrega customer.paciente) quanto um arrival cru — o validador
// monta clientes sintéticos sem passar pela engine.
export function getPaciente(customer) {
  const base = customer?.paciente ?? {
    relacao: 'proprio',
    descricao: 'o próprio cliente',
    idade: customer?.idade,
    tags: customer?.tags ?? [],
    jaTomaPrincipiosAtivos: customer?.jaTomaPrincipiosAtivos ?? [],
    alergias: customer?.alergias ?? [],
  }

  // Idade implica condição: menor de 12 e idoso valem como tag mesmo quando o
  // turno não escreve a tag à mão. Evita que o conteúdo precise repetir a
  // mesma informação em dois lugares e possa divergir.
  const tags = [...(base.tags ?? [])]
  if (typeof base.idade === 'number') {
    if (base.idade < IDADE_CRIANCA && !tags.includes('menor_de_12')) tags.push('menor_de_12')
    if (base.idade >= IDADE_IDOSO && !tags.includes('idoso')) tags.push('idoso')
  }

  return {
    ...base,
    tags,
    jaTomaPrincipiosAtivos: base.jaTomaPrincipiosAtivos ?? [],
    alergias: base.alergias ?? [],
  }
}

export function isCrianca(paciente) {
  return paciente.tags.includes('menor_de_12') || (typeof paciente.idade === 'number' && paciente.idade < IDADE_CRIANCA)
}

// O pedido do cliente pode ser: produto exato, genérico de um produto de
// referência, sintoma (mapeado para uma lista de princípios ativos aceitáveis)
// ou receita (1-3 itens; customer.itensPendentes traz os princípios ativos que
// ainda faltam entregar dessa receita).
function productSatisfiesRequest(product, request, customer) {
  if (!product || !request) return false
  if (request.type === 'produto') {
    return request.produtoId === product.id
  }
  if (request.type === 'generico') {
    // Intercambialidade: só vale o genérico com o MESMO princípio ativo e a
    // MESMA dose do medicamento de referência que o cliente citou.
    return (
      Boolean(product.generico) &&
      product.principioAtivo === request.principioAtivo &&
      product.dose === request.dose
    )
  }
  if (request.type === 'sintoma') {
    return request.principiosAceitos?.includes(product.principioAtivo) ?? false
  }
  if (request.type === 'receita') {
    return customer?.itensPendentes?.includes(product.principioAtivo) ?? false
  }
  return false
}

const requiresPrescription = () => ({
  id: 'requiresPrescription',
  tag: 'requiresPrescription',
  blocksSale: true,
  describe: () =>
    'Produtos que exigem receita não podem ser vendidos sem que o cliente a apresente.',
  test: ({ product, customer }) => Boolean(product?.exigeReceita) && !customer?.hasReceita,
  explain: ({ product }) =>
    `${product.nome} exige receita médica e o cliente não apresentou uma.`,
})

const controlledWithoutRetention = () => ({
  id: 'controlledWithoutRetention',
  tag: 'controlledWithoutRetention',
  blocksSale: true,
  describe: () =>
    'Retenha a receita quando ela tiver que ficar na farmácia: produtos de tarja preta e de tarja ' +
    'vermelha de lista especial, e também os antimicrobianos.',
  test: ({ product, options }) => Boolean(product?.retencaoDeReceita) && !options?.receitaRetida,
  explain: ({ product }) => {
    const motivo =
      product.classeControlada === 'tarja_preta'
        ? 'produto de tarja preta'
        : product.classeControlada === 'tarja_vermelha'
          ? 'produto de tarja vermelha de lista especial'
          : 'antimicrobiano'
    return `${product.nome} é ${motivo} — a receita precisa ser retida antes de confirmar a venda.`
  },
})

// Alergia medicamentosa: bloqueia a família inteira, não só o item exato.
const allergy = () => ({
  id: 'allergy',
  tag: 'allergy',
  blocksSale: true,
  describe: () =>
    'Não entregue nada da família a que o paciente é alérgico — a reação é cruzada: quem é alérgico ' +
    'a penicilina reage a qualquer derivado, e quem é alérgico a AINE reage a ibuprofeno e a AAS.',
  test: (ctx) =>
    Boolean(ctx.product?.classeAlergenica) &&
    getPaciente(ctx.customer).alergias.includes(ctx.product.classeAlergenica),
  explain: (ctx) => {
    const paciente = getPaciente(ctx.customer)
    return `${ctx.product.nome} pertence à classe "${
      ALERGIA_LABEL[ctx.product.classeAlergenica] ?? ctx.product.classeAlergenica
    }", e ${paciente.relacao === 'proprio' ? 'o cliente' : paciente.descricao} declarou alergia a ela.`
  },
})

// Sinal de alerta: há quadros que não são de automedicação. Nesse caso nenhum
// item da prateleira resolve — o atendimento certo é recusar a venda e
// encaminhar ao médico.
const redFlagReferral = () => ({
  id: 'redFlagReferral',
  tag: 'redFlagReferral',
  blocksSale: true,
  describe: () =>
    'Alguns quadros não são de automedicação: duração longa ou progressiva, sinais sistêmicos ' +
    'graves, sangramento, dor torácica irradiada, icterícia. Aí o atendimento certo é recusar a ' +
    'venda e encaminhar ao médico.',
  test: ({ customer }) => Boolean(customer?.request?.sinalDeAlerta),
  explain: ({ customer }) =>
    `${customer.request.sinalDeAlerta} — esse quadro é sinal de alerta e pede encaminhamento médico, ` +
    `não medicamento de balcão.`,
})

// Cautela NÃO é contraindicação. O que a lista de cautelas do produto diz é
// "avalie e oriente", não "nunca". Tratar as duas como a mesma coisa é o erro
// mais comum de quem está aprendendo — e era o erro que este jogo cometia antes
// de ter esta regra: ele mandava recusar situações que a farmácia resolve
// dispensando com orientação.
const cautionWithoutCounseling = () => ({
  id: 'cautionWithoutCounseling',
  tag: 'cautionWithoutCounseling',
  blocksSale: true,
  describe: () =>
    'Cautela é diferente de contraindicação: quando o produto exige cautela para a condição do ' +
    'paciente ou para algo que ele já toma, a venda pode ser feita — mas só com orientação. ' +
    'Recusar nesses casos é deixar o cliente sem atendimento; entregar calado é dispensar no escuro.',
  test: (ctx) => {
    if (ctx.options?.orientacaoDada) return false
    const paciente = getPaciente(ctx.customer)
    return (
      intersects(ctx.product?.cautelas, paciente.tags) ||
      intersects(ctx.product?.cautelasInteracao, paciente.jaTomaPrincipiosAtivos)
    )
  },
  explain: (ctx) => {
    const paciente = getPaciente(ctx.customer)
    const tag = (ctx.product.cautelas ?? []).find((t) => paciente.tags.includes(t))
    if (tag) {
      return `${ctx.product.nome} exige cautela para ${TAG_LABEL[tag] ?? tag} — dá pra dispensar, mas ` +
        `o paciente precisava ser orientado antes de você confirmar a venda.`
    }
    const ativo = (ctx.product.cautelasInteracao ?? []).find((a) =>
      paciente.jaTomaPrincipiosAtivos.includes(a),
    )
    return `${ctx.product.nome} exige cautela com ${labelPrincipio(ativo)}, que o paciente já toma — ` +
      `dá pra dispensar, mas com orientação, não calado.`
  },
})

const contraindication = () => ({
  id: 'contraindication',
  tag: 'contraindication',
  blocksSale: true,
  describe: () =>
    'Contraindicação é muro: quando o paciente tem uma condição listada nas contraindicações do ' +
    'produto, não há venda possível — nem com orientação.',
  test: (ctx) => intersects(ctx.product?.contraindicacoes, getPaciente(ctx.customer).tags),
  explain: (ctx) => {
    const paciente = getPaciente(ctx.customer)
    const tag = ctx.product.contraindicacoes.find((t) => paciente.tags.includes(t))
    return `${ctx.product.nome} é contraindicado para ${
      paciente.relacao === 'proprio' ? 'quem' : `${paciente.descricao}, que`
    } está na condição "${TAG_LABEL[tag] ?? tag}".`
  },
})

const drugInteraction = () => ({
  id: 'drugInteraction',
  tag: 'drugInteraction',
  blocksSale: true,
  describe: () =>
    'Interação que contraindica: não venda um produto que some perigosamente com algo que o ' +
    'paciente já toma — o caso mais duro é anti-inflamatório sobre anticoagulante.',
  test: (ctx) => intersects(ctx.product?.interacoes, getPaciente(ctx.customer).jaTomaPrincipiosAtivos),
  explain: (ctx) => {
    const paciente = getPaciente(ctx.customer)
    const ativo = ctx.product.interacoes.find((a) => paciente.jaTomaPrincipiosAtivos.includes(a))
    return `${ctx.product.nome} interage com ${labelPrincipio(ativo)}, que ${
      paciente.relacao === 'proprio' ? 'o cliente' : paciente.descricao
    } já toma.`
  },
})

// Duplicidade terapêutica: o produto CONTÉM (na fórmula, não só como princípio
// ativo principal) algo que o paciente já está tomando. Clássico com
// antigripais, que escondem paracetamol na associação.
// Duplicidade terapêutica é sobre dose SOMADA: o paciente terminando com o mesmo
// princípio ativo vindo de dois produtos ao mesmo tempo.
//
// A exceção é RENOVAÇÃO: quem chega pedindo pelo nome, com receita, o próprio
// medicamento de uso contínuo que já toma não está somando nada — está
// continuando o tratamento. As três condições juntas importam:
//   - pediu aquele produto pelo nome (não descreveu um sintoma),
//   - tem a receita,
//   - e o princípio que DEFINE o produto é o que ele já toma.
// Sem a terceira, o Tylex® (codeína + paracetamol) passaria como "renovação"
// para quem toma paracetamol, quando na verdade ele soma paracetamol escondido.
function ehRenovacaoDeUsoContinuo(product, customer) {
  const tipo = customer?.request?.type
  const pedidoPeloNome = tipo === 'produto' || tipo === 'generico'
  return (
    pedidoPeloNome &&
    Boolean(customer?.hasReceita) &&
    Boolean(product?.exigeReceita) &&
    getPaciente(customer).jaTomaPrincipiosAtivos.includes(product.principioAtivo)
  )
}

const duplicateTherapy = () => ({
  id: 'duplicateTherapy',
  tag: 'duplicateTherapy',
  blocksSale: true,
  describe: () =>
    'Não entregue um produto que traga na fórmula um princípio ativo que o paciente já está tomando ' +
    '— a dose soma. O caso clássico é o antigripal com paracetamol para quem já toma paracetamol. ' +
    'Renovar, com receita, o próprio medicamento de uso contínuo não conta: isso é continuidade.',
  test: (ctx) => {
    if (ehRenovacaoDeUsoContinuo(ctx.product, ctx.customer)) return false
    return intersects(ctx.product?.composicao, getPaciente(ctx.customer).jaTomaPrincipiosAtivos)
  },
  explain: (ctx) => {
    const paciente = getPaciente(ctx.customer)
    const ativo = (ctx.product.composicao ?? []).find((a) =>
      paciente.jaTomaPrincipiosAtivos.includes(a),
    )
    const quem = paciente.relacao === 'proprio' ? 'o cliente' : paciente.descricao
    const oculto = ativo !== ctx.product.principioAtivo
    return oculto
      ? `${ctx.product.nome} leva ${labelPrincipio(ativo)} escondido na fórmula, e ${quem} já toma ` +
        `${labelPrincipio(ativo)} — a dose somaria sem ninguém perceber.`
      : `${quem} já toma ${labelPrincipio(ativo)}, e ${ctx.product.nome} é ${labelPrincipio(ativo)} ` +
        `também — seria dose dobrada.`
  },
})

// Apresentação incompatível com a faixa etária do paciente: comprimido de
// adulto para criança, ou apresentação infantil (subdosada) para adulto.
const wrongAgeGroup = () => ({
  id: 'wrongAgeGroup',
  tag: 'wrongAgeGroup',
  blocksSale: true,
  describe: () =>
    'A apresentação precisa servir à faixa etária de quem vai tomar: nada de comprimido de adulto ' +
    'para criança, nem apresentação infantil para adulto.',
  test: (ctx) => {
    const publico = ctx.product?.publicoAlvo
    if (!publico || publico === 'todos') return false
    return isCrianca(getPaciente(ctx.customer)) ? publico === 'adulto' : publico === 'pediatrico'
  },
  explain: (ctx) => {
    const paciente = getPaciente(ctx.customer)
    const quem = paciente.relacao === 'proprio' ? 'o cliente' : paciente.descricao
    return isCrianca(paciente)
      ? `${ctx.product.nome} é apresentação de adulto, e quem vai tomar é ${quem} (${paciente.idade} anos).`
      : `${ctx.product.nome} é apresentação infantil e ficaria subdosada para ${quem}.`
  },
})

const expiredProduct = () => ({
  id: 'expiredProduct',
  tag: 'expiredProduct',
  blocksSale: true,
  describe: () => 'Nunca entregue um item cujo lote esteja vencido.',
  test: ({ shelfItem }) => shelfItem?.validadeStatus === 'vencido',
  explain: ({ product }) => `O lote selecionado de ${product.nome} está vencido.`,
})

const wrongProduct = () => ({
  id: 'wrongProduct',
  tag: 'wrongProduct',
  blocksSale: true,
  describe: () => 'O produto entregue precisa corresponder ao que o cliente pediu.',
  test: ({ product, customer }) => !productSatisfiesRequest(product, customer?.request, customer),
  // A mensagem aqui importa mais do que parece. Dizer "Vibral® não atende ao
  // pedido ('tosse')" é confuso e ensina errado: o Vibral® É um xarope para
  // tosse — o que não serve é ANTITUSSÍGENO numa tosse produtiva. Então a
  // explicação nunca diz "não é para isso"; diz qual era a conduta esperada, e
  // usa o `criterio` do pedido quando o turno escreveu o raciocínio clínico.
  explain: ({ customer, product }) => {
    const request = customer.request
    if (request.type === 'produto') {
      return `O cliente pediu especificamente "${request.rotulo}", e ${product.nome} não é esse item.`
    }
    if (request.type === 'generico') {
      return `O cliente pediu o genérico de ${request.rotulo} (${labelPrincipio(request.principioAtivo)} ` +
        `${request.dose}) — ${product.nome} não é o genérico correspondente.`
    }
    if (request.type === 'receita') {
      return `${product.nome} não corresponde a nenhum item ainda pendente da receita.`
    }
    // A classe do produto vem primeiro: é ela que responde "por que esse não
    // serve, se está na mesma gôndola?". Buscopan® e Luftal® são ambos
    // gastrointestinais, mas um é antiespasmódico e o outro antiflatulento.
    const classe = product.classeTerapeutica
    const abertura = classe ? `${product.nome} é ${classe}.` : `${product.nome} não serve para esse quadro.`

    // Com `criterio`, ele já diz o que o quadro pede e por quê — repetir as
    // classes esperadas aqui só deixaria a frase redundante.
    if (request.criterio) {
      const razao = request.criterio.charAt(0).toUpperCase() + request.criterio.slice(1)
      return `${abertura} ${razao}.`
    }
    const esperadas = classesDosPrincipios(request.principiosAceitos ?? [])
    return esperadas ? `${abertura} Esse quadro pede ${esperadas}.` : abertura
  },
})

export const TAG_LABEL = {
  gravidez: 'gestante',
  lactante: 'lactante',
  menor_de_12: 'menor de 12 anos',
  hipertensao: 'hipertensão',
  idoso: 'idoso (65+)',
}

export const RULE_FACTORIES = {
  requiresPrescription,
  controlledWithoutRetention,
  contraindication,
  cautionWithoutCounseling,
  drugInteraction,
  duplicateTherapy,
  allergy,
  redFlagReferral,
  wrongAgeGroup,
  expiredProduct,
  wrongProduct,
}

export function instantiateRule(type) {
  const factory = RULE_FACTORIES[type]
  if (!factory) throw new Error(`Regra desconhecida: ${type}`)
  return factory()
}

export function instantiateAllRules() {
  return Object.keys(RULE_FACTORIES).map((type) => instantiateRule(type))
}

// Avalia todas as regras contra o contexto e retorna as violações encontradas.
export function evaluateAll(ctx) {
  return instantiateAllRules()
    .filter((rule) => rule.test(ctx))
    .map((rule) => ({
      id: rule.id,
      tag: rule.tag,
      blocksSale: rule.blocksSale,
      message: rule.explain(ctx),
    }))
}

export { productSatisfiesRequest }
