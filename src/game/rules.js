// Catálogo de regras de erro do atendimento.
//
// Cada regra é uma função-fábrica pura `make() => instance`, registrada em
// RULE_FACTORIES. As regras são sempre TODAS ativas em todo turno — o jogo não
// esconde regras (ver tela de ajuda); a dificuldade vem de quantas precisam ser
// checadas ao mesmo tempo sob pressão de tempo, não de descobri-las.
//
// ctx = { product, shelfItem, customer, options }
//   product:   entrada de src/game/products.js
//   shelfItem: entrada de shift.estoque ({ id, produtoId, validadeStatus })
//   customer:  cliente da fila (ver engine.js)
//   options:   { receitaRetida?: boolean } — decisões extras tomadas na confirmação

function intersects(listA = [], listB = []) {
  return listA.some((item) => listB.includes(item))
}

// O pedido do cliente pode ser: produto exato, sintoma (mapeado para uma lista de
// princípios ativos aceitáveis) ou receita (1-3 itens; customer.itensPendentes traz
// os princípios ativos que ainda faltam entregar dessa receita).
function productSatisfiesRequest(product, request, customer) {
  if (!product || !request) return false
  if (request.type === 'produto') {
    return request.produtoId === product.id
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
    'Produtos de tarja vermelha ou tarja preta exigem retenção da receita no ato da venda.',
  test: ({ product, options }) =>
    Boolean(product?.classeControlada && product.classeControlada !== 'nenhuma') &&
    !options?.receitaRetida,
  explain: ({ product }) =>
    `${product.nome} é um produto controlado (${
      product.classeControlada === 'tarja_preta' ? 'tarja preta' : 'tarja vermelha'
    }) — a receita precisa ser retida antes de confirmar a venda.`,
})

const contraindication = () => ({
  id: 'contraindication',
  tag: 'contraindication',
  blocksSale: true,
  describe: () =>
    'Não venda um produto quando o cliente tem uma condição listada nas contraindicações do produto.',
  test: ({ product, customer }) => intersects(product?.contraindicacoes, customer?.tags),
  explain: ({ product, customer }) => {
    const tag = product.contraindicacoes.find((t) => customer.tags.includes(t))
    return `${product.nome} é contraindicado para quem está na condição "${TAG_LABEL[tag] ?? tag}".`
  },
})

const drugInteraction = () => ({
  id: 'drugInteraction',
  tag: 'drugInteraction',
  blocksSale: true,
  describe: () =>
    'Não venda um produto quando ele interage com um princípio ativo que o cliente já toma.',
  test: ({ product, customer }) =>
    intersects(product?.interacoes, customer?.jaTomaPrincipiosAtivos),
  explain: ({ product, customer }) => {
    const ativo = product.interacoes.find((a) => customer.jaTomaPrincipiosAtivos.includes(a))
    return `${product.nome} interage com ${ativo}, que o cliente já toma.`
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
  explain: ({ customer }) => {
    if (customer.request.type === 'produto') {
      return `O cliente pediu especificamente "${customer.request.rotulo}", e esse não é o item certo.`
    }
    return `Esse produto não atende ao pedido do cliente ("${customer.request.rotulo}").`
  },
})

export const TAG_LABEL = {
  gravidez: 'gestante',
  lactante: 'lactante',
  menor_de_12: 'menor de 12 anos',
  hipertensao: 'hipertensão',
}

export const RULE_FACTORIES = {
  requiresPrescription,
  controlledWithoutRetention,
  contraindication,
  drugInteraction,
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
