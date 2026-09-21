// Catálogo de produtos da farmácia — medicamentos REAIS.
//
// Princípios ativos e nomes comerciais existem de verdade e são vendidos no
// Brasil; as apresentações e concentrações foram conferidas em bula/farmácia
// online (ver README). A ideia é que, ao ver "Novalgina® 500mg", o estudante
// reconheça a caixa que ele vai encontrar no balcão — e saiba que ali dentro
// tem dipirona.
//
// ⚠️ AVISO DE MARCAS E DE CONTEÚDO — ver AVISO_MARCAS abaixo, exibido na tela
// inicial e na tela de ajuda. Resumo: as marcas citadas pertencem a seus
// titulares, este jogo não tem vínculo com elas, e as REGRAS de
// contraindicação, interação, alergia e controle usadas aqui são
// SIMPLIFICADAS para fins de jogo. Não são bula e não servem de referência
// clínica. Ao contrário do resto do catálogo, que é fiel à realidade, as
// regras foram escolhidas para caber num jogo de 2 minutos.
//
// Formato de cada produto:
// { id, nome, marca, principioAtivo, composicao, dose, apresentacao,
//   publicoAlvo, categoria, generico, equivalenteA, exigeReceita,
//   classeControlada, retencaoDeReceita, contraindicacoes, cautelas,
//   interacoes, cautelasInteracao }
//
// DUAS FORÇAS DE RESTRIÇÃO, de propósito — é a distinção que o balcão de
// verdade faz, e confundir as duas é justamente o erro que este jogo quer
// desensinar:
//   contraindicacoes / interacoes  -> MURO. Não dispense, ponto.
//   cautelas / cautelasInteracao   -> AVALIAÇÃO. Pode dispensar, desde que o
//                                     paciente seja orientado (o jogador marca
//                                     isso na tela de confirmação).
// Na dúvida entre as duas, escolha CAUTELA: o jogo erra menos dizendo "oriente"
// do que dizendo "nunca" sobre um medicamento real.
//
// composicao  — todos os princípios ativos da fórmula (associações como
//               Naldecon® e Tylex® têm mais de um). Usada pela regra de
//               duplicidade terapêutica. Omitida => [principioAtivo].
// principioAtivo — o que DEFINE o produto para o pedido do cliente. Numa
//               associação é o componente que a caracteriza (fenilefrina no
//               Naldecon® Dia), não todos os da fórmula.
// publicoAlvo — 'adulto' | 'pediatrico' | 'todos'.
// generico    — true para o genérico; equivalenteA aponta a referência
//               (mesmo princípio ativo, mesma dose).
//
// classeControlada: 'nenhuma' | 'tarja_vermelha' | 'tarja_preta'

export const AVISO_MARCAS =
  'Os medicamentos citados aqui são produtos reais e os nomes comerciais — Novalgina®, Tylenol®, ' +
  'Advil®, Alivium®, Aspirina®, Claritin®, Zyrtec®, Polaramine®, Naldecon®, Losec®, Mylanta®, Buscopan®, ' +
  'Luftal®, Imosec®, Pedialyte®, Bepantol®, Canesten®, Gyno-Daktarin®, Zovirax®, Nizoral®, ' +
  'CataflamPro®, Amoxil®, Vibral®, Fluimucil®, Mucosolvan®, Sorine®, Aradois®, Marevan®, ' +
  'Glifage®, Puran T4®, Valium® e Tylex® — são marcas registradas de seus respectivos ' +
  'titulares. Este é um material educativo independente, sem vínculo, patrocínio ou aprovação ' +
  'das empresas detentoras dessas marcas. As regras de contraindicação, interação, alergia e ' +
  'controle usadas no jogo são SIMPLIFICADAS para caber na partida e NÃO reproduzem a bula — ' +
  'não use este jogo como fonte de informação sobre nenhum medicamento real. Consulte sempre a ' +
  'bula e um farmacêutico ou médico.'

export const CATEGORIAS = [
  { id: 'analgesicos', nome: 'Analgésicos e antitérmicos' },
  { id: 'antialergicos', nome: 'Antialérgicos' },
  { id: 'antigripais', nome: 'Antigripais' },
  { id: 'gastrointestinal', nome: 'Gastrointestinal' },
  { id: 'respiratorios', nome: 'Tosse e vias aéreas' },
  { id: 'dermatologicos', nome: 'Dermatológicos' },
  { id: 'antibioticos', nome: 'Antibióticos' },
  { id: 'cronicos', nome: 'Uso contínuo' },
  { id: 'controlados', nome: 'Controlados' },
]

// Vocabulário de tags de contexto do paciente / contraindicação do produto.
export const TAGS = {
  gravidez: 'Gestante',
  lactante: 'Lactante',
  menor_de_12: 'Menor de 12 anos',
  hipertensao: 'Hipertensão',
  idoso: 'Idoso (65+)',
}

export const APRESENTACAO_LABEL = {
  comprimido: 'Comprimido',
  capsula: 'Cápsula',
  gotas: 'Solução em gotas',
  xarope: 'Xarope',
  suspensao: 'Suspensão oral',
  solucao: 'Solução oral',
  creme: 'Creme',
  gel: 'Gel',
  xampu: 'Xampu',
  efervescente: 'Comprimido efervescente',
}

export const PUBLICO_LABEL = {
  adulto: 'Adulto',
  pediatrico: 'Infantil',
  todos: 'Adulto e infantil',
}

// Os ids de princípio ativo são ASCII sem espaço (usados como chave em regras e
// pedidos); aqui eles viram texto lido por gente. Só precisa entrar no mapa o
// que não fica certo trocando "_" por espaço.
const PRINCIPIO_LABEL = {
  acido_acetilsalicilico: 'ácido acetilsalicílico',
  hidroxido_de_aluminio: 'hidróxido de alumínio',
  hidroxido_de_magnesio: 'hidróxido de magnésio',
  sais_de_reidratacao: 'sais de reidratação oral',
  codeina: 'codeína',
  acetilcisteina: 'acetilcisteína',
  cloreto_de_sodio: 'cloreto de sódio',
}

// Classe terapêutica: o que o produto É, em uma palavra. É o dado que faltava
// para a prateleira fazer sentido — a aba "Gastrointestinal" junta antiácido,
// antiespasmódico, antiflatulento e antidiarreico, e sem a classe à vista a
// escolha entre eles vira decorar qual molécula é qual. Com ela, o jogador
// raciocina antes de escolher, e a recusa deixa de ser um mistério ("por que
// esse não serve, se está na mesma gôndola?").
//
// A classe é propriedade da molécula, então mora aqui e não em cada produto; as
// associações (Naldecon®, Tylex®, Mylanta®) declaram a sua na própria entrada.
const CLASSE_POR_PRINCIPIO = {
  dipirona: 'analgésico e antitérmico',
  paracetamol: 'analgésico e antitérmico',
  ibuprofeno: 'anti-inflamatório (AINE)',
  acido_acetilsalicilico: 'anti-inflamatório (AINE)',
  diclofenaco: 'anti-inflamatório (AINE) tópico',
  loratadina: 'anti-histamínico de 2ª geração',
  cetirizina: 'anti-histamínico de 2ª geração',
  dexclorfeniramina: 'anti-histamínico de 1ª geração (seda)',
  carbinoxamina: 'anti-histamínico de 1ª geração (seda)',
  fenilefrina: 'descongestionante',
  omeprazol: 'inibidor de bomba de prótons',
  hidroxido_de_aluminio: 'antiácido',
  butilescopolamina: 'antiespasmódico',
  simeticona: 'antiflatulento',
  loperamida: 'antidiarreico',
  sais_de_reidratacao: 'reidratante oral',
  dropropizina: 'antitussígeno',
  acetilcisteina: 'mucolítico',
  ambroxol: 'expectorante',
  nafazolina: 'descongestionante nasal (vasoconstritor)',
  cloreto_de_sodio: 'solução salina nasal',
  dexpantenol: 'cicatrizante e reepitelizante',
  clotrimazol: 'antifúngico tópico',
  miconazol: 'antifúngico tópico',
  cetoconazol: 'antifúngico tópico',
  aciclovir: 'antiviral tópico',
  amoxicilina: 'antibiótico (penicilina)',
  diazepam: 'ansiolítico benzodiazepínico',
  codeina: 'analgésico opioide',
  losartana: 'anti-hipertensivo (BRA)',
  varfarina: 'anticoagulante oral',
  metformina: 'antidiabético oral',
  levotiroxina: 'hormônio tireoidiano',
}

export function labelPrincipio(id) {
  return PRINCIPIO_LABEL[id] ?? String(id).replace(/_/g, ' ')
}

// As classes que resolveriam um pedido, a partir dos princípios aceitos. É o
// outro lado da mensagem de recusa: "X é antitussígeno, e aqui se dispensa
// mucolítico ou expectorante".
export function classesDosPrincipios(principios = []) {
  const classes = []
  for (const p of principios) {
    const c = CLASSE_POR_PRINCIPIO[p]
    if (c && !classes.includes(c)) classes.push(c)
  }
  if (classes.length === 0) return ''
  if (classes.length === 1) return classes[0]
  return `${classes.slice(0, -1).join(', ')} ou ${classes[classes.length - 1]}`
}

export function labelPrincipios(ids = []) {
  return ids.map(labelPrincipio).join(', ')
}

const PRODUCTS_RAW = [
  // --- Analgésicos e antitérmicos -----------------------------------------
  {
    id: 'novalgina-500',
    nome: 'Novalgina® 500mg',
    marca: 'Novalgina',
    principioAtivo: 'dipirona',
    dose: '500mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'dipirona-gen-500',
    nome: 'Dipirona Sódica 500mg',
    marca: null,
    principioAtivo: 'dipirona',
    dose: '500mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: true,
    equivalenteA: 'novalgina-500',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'novalgina-gotas',
    nome: 'Novalgina® Gotas 500mg/mL',
    marca: 'Novalgina',
    principioAtivo: 'dipirona',
    dose: '500mg/mL',
    apresentacao: 'gotas',
    publicoAlvo: 'todos',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'tylenol-500',
    nome: 'Tylenol® 500mg',
    marca: 'Tylenol',
    principioAtivo: 'paracetamol',
    dose: '500mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'tylenol-750',
    nome: 'Tylenol® 750mg',
    marca: 'Tylenol',
    principioAtivo: 'paracetamol',
    dose: '750mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'paracetamol-gen-750',
    nome: 'Paracetamol 750mg',
    marca: null,
    principioAtivo: 'paracetamol',
    dose: '750mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: true,
    equivalenteA: 'tylenol-750',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'tylenol-crianca',
    nome: 'Tylenol® Criança Suspensão 32mg/mL',
    marca: 'Tylenol',
    principioAtivo: 'paracetamol',
    dose: '32mg/mL',
    apresentacao: 'suspensao',
    publicoAlvo: 'pediatrico',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'advil-400',
    nome: 'Advil® 400mg',
    marca: 'Advil',
    principioAtivo: 'ibuprofeno',
    dose: '400mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    cautelas: ['hipertensao'],
    // AINE + anticoagulante é risco de sangramento: não sai do balcão.
    interacoes: ['varfarina'],
    // AINE + anti-hipertensivo reduz o controle pressórico: dispensa com orientação.
    cautelasInteracao: ['losartana'],
  },
  {
    id: 'ibuprofeno-gen-400',
    nome: 'Ibuprofeno 400mg',
    marca: null,
    principioAtivo: 'ibuprofeno',
    dose: '400mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: true,
    equivalenteA: 'advil-400',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    cautelas: ['hipertensao'],
    interacoes: ['varfarina'],
    cautelasInteracao: ['losartana'],
  },
  {
    id: 'alivium-gotas',
    nome: 'Alivium® Gotas 100mg/mL',
    marca: 'Alivium',
    principioAtivo: 'ibuprofeno',
    dose: '100mg/mL',
    apresentacao: 'gotas',
    publicoAlvo: 'pediatrico',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    // AAS em criança com quadro febril viral: risco de síndrome de Reye.
    id: 'aspirina-500',
    nome: 'Aspirina® 500mg',
    marca: 'Aspirina',
    principioAtivo: 'acido_acetilsalicilico',
    dose: '500mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'analgesicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['menor_de_12', 'gravidez'],
    interacoes: ['varfarina'],
    cautelasInteracao: ['losartana'],
  },

  // --- Antialérgicos -------------------------------------------------------
  {
    id: 'claritin-10',
    nome: 'Claritin® 10mg',
    marca: 'Claritin',
    principioAtivo: 'loratadina',
    dose: '10mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antialergicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'loratadina-gen-10',
    nome: 'Loratadina 10mg',
    marca: null,
    principioAtivo: 'loratadina',
    dose: '10mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antialergicos',
    generico: true,
    equivalenteA: 'claritin-10',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'claritin-xarope',
    nome: 'Claritin® Xarope 1mg/mL',
    marca: 'Claritin',
    principioAtivo: 'loratadina',
    dose: '1mg/mL',
    apresentacao: 'xarope',
    publicoAlvo: 'pediatrico',
    categoria: 'antialergicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'zyrtec-10',
    nome: 'Zyrtec® 10mg',
    marca: 'Zyrtec',
    principioAtivo: 'cetirizina',
    dose: '10mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antialergicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'cetirizina-gen-10',
    nome: 'Cetirizina 10mg',
    marca: null,
    principioAtivo: 'cetirizina',
    dose: '10mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antialergicos',
    generico: true,
    equivalenteA: 'zyrtec-10',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    // anti-histamínico de 1ª geração: sedativo, e desaconselhado em idoso
    // (efeito anticolinérgico). Some com benzodiazepínico.
    id: 'polaramine-2',
    nome: 'Polaramine® 2mg',
    marca: 'Polaramine',
    principioAtivo: 'dexclorfeniramina',
    dose: '2mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antialergicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    cautelas: ['gravidez', 'idoso'],
    interacoes: [],
    cautelasInteracao: ['diazepam'],
  },

  // --- Antigripais (associações — atenção à duplicidade) -------------------
  {
    id: 'naldecon-dia',
    classeTerapeutica: 'antigripal (descongestionante + analgésico)',
    nome: 'Naldecon® Dia',
    marca: 'Naldecon',
    principioAtivo: 'fenilefrina',
    composicao: ['paracetamol', 'fenilefrina'],
    dose: '400mg + 20mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antigripais',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['hipertensao'],
    interacoes: [],
  },
  {
    id: 'naldecon-noite',
    classeTerapeutica: 'antigripal noturno (anti-histamínico + analgésico)',
    nome: 'Naldecon® Noite',
    marca: 'Naldecon',
    principioAtivo: 'carbinoxamina',
    composicao: ['paracetamol', 'carbinoxamina'],
    dose: '400mg + 4mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'antigripais',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    // carbinoxamina é anti-histamínico de 1ª geração: sedação e efeito
    // anticolinérgico pedem avaliação e orientação, não proibição
    contraindicacoes: [],
    cautelas: ['gravidez', 'idoso'],
    interacoes: [],
    cautelasInteracao: ['diazepam'],
  },

  // --- Gastrointestinal ----------------------------------------------------
  {
    id: 'losec-20',
    nome: 'Losec® 20mg',
    marca: 'Losec',
    principioAtivo: 'omeprazol',
    dose: '20mg',
    apresentacao: 'capsula',
    publicoAlvo: 'adulto',
    categoria: 'gastrointestinal',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'omeprazol-gen-20',
    nome: 'Omeprazol 20mg',
    marca: null,
    principioAtivo: 'omeprazol',
    dose: '20mg',
    apresentacao: 'capsula',
    publicoAlvo: 'adulto',
    categoria: 'gastrointestinal',
    generico: true,
    equivalenteA: 'losec-20',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    // antiácido: alívio rápido da azia, alternativa ao inibidor de bomba.
    // Traz simeticona na fórmula — mas quem quer só gás não quer isso aqui.
    id: 'mylanta-plus',
    classeTerapeutica: 'antiácido com antiflatulento',
    nome: 'Mylanta® Plus Suspensão',
    marca: 'Mylanta',
    principioAtivo: 'hidroxido_de_aluminio',
    composicao: ['hidroxido_de_aluminio', 'hidroxido_de_magnesio', 'simeticona'],
    dose: '400mg + 400mg + 30mg / 5mL',
    apresentacao: 'suspensao',
    publicoAlvo: 'todos',
    categoria: 'gastrointestinal',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    // antiespasmódico anticolinérgico — cautela no idoso.
    id: 'buscopan-10',
    nome: 'Buscopan® 10mg',
    marca: 'Buscopan',
    principioAtivo: 'butilescopolamina',
    dose: '10mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'gastrointestinal',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    cautelas: ['idoso'],
    interacoes: [],
  },
  {
    id: 'luftal-40',
    nome: 'Luftal® 40mg',
    marca: 'Luftal',
    principioAtivo: 'simeticona',
    dose: '40mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'todos',
    categoria: 'gastrointestinal',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    // Antidiarreico: nunca em criança pequena. Em diarreia com sangue e febre
    // (disenteria) o caminho é reidratar e encaminhar, não travar o intestino.
    id: 'imosec-2',
    nome: 'Imosec® 2mg',
    marca: 'Imosec',
    principioAtivo: 'loperamida',
    dose: '2mg',
    apresentacao: 'capsula',
    publicoAlvo: 'adulto',
    categoria: 'gastrointestinal',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['menor_de_12'],
    interacoes: [],
  },
  {
    id: 'pedialyte',
    nome: 'Pedialyte® Solução Oral 500mL',
    marca: 'Pedialyte',
    principioAtivo: 'sais_de_reidratacao',
    dose: '500mL',
    apresentacao: 'solucao',
    publicoAlvo: 'todos',
    categoria: 'gastrointestinal',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },

  // --- Tosse e vias aéreas -------------------------------------------------
  // O diferencial que define esta categoria: tosse SECA pede antitussígeno
  // (dropropizina); tosse PRODUTIVA pede mucolítico/expectorante — e o
  // antitussígeno é contraindicado nela, porque segurar a tosse retém secreção.
  {
    id: 'vibral-adulto',
    nome: 'Vibral® Xarope Adulto 3mg/mL',
    marca: 'Vibral',
    principioAtivo: 'dropropizina',
    dose: '3mg/mL',
    apresentacao: 'xarope',
    publicoAlvo: 'adulto',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'vibral-pediatrico',
    nome: 'Vibral® Pediátrico Xarope 1,5mg/mL',
    marca: 'Vibral',
    principioAtivo: 'dropropizina',
    dose: '1,5mg/mL',
    apresentacao: 'xarope',
    publicoAlvo: 'pediatrico',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'fluimucil-600',
    nome: 'Fluimucil® 600mg',
    marca: 'Fluimucil',
    principioAtivo: 'acetilcisteina',
    dose: '600mg',
    apresentacao: 'efervescente',
    publicoAlvo: 'adulto',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    // mucolítico na gestação pede avaliação antes de dispensar
    cautelas: ['gravidez'],
    interacoes: [],
  },
  {
    id: 'mucosolvan-adulto',
    nome: 'Mucosolvan® Xarope Adulto 30mg/5mL',
    marca: 'Mucosolvan',
    principioAtivo: 'ambroxol',
    dose: '30mg/5mL',
    apresentacao: 'xarope',
    publicoAlvo: 'adulto',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    cautelas: ['gravidez'],
    interacoes: [],
  },
  {
    id: 'mucosolvan-infantil',
    nome: 'Mucosolvan® Infantil Xarope 15mg/5mL',
    marca: 'Mucosolvan',
    principioAtivo: 'ambroxol',
    dose: '15mg/5mL',
    apresentacao: 'xarope',
    publicoAlvo: 'pediatrico',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    cautelas: ['gravidez'],
    interacoes: [],
  },
  {
    // vasoconstritor nasal: não passa de 3-5 dias. Uso prolongado causa rinite
    // medicamentosa (congestão de rebote) — e aí o caso deixa de ser de balcão.
    id: 'sorine-adulto',
    nome: 'Sorine® Adulto Solução Nasal',
    marca: 'Sorine',
    principioAtivo: 'nafazolina',
    dose: '0,5mg/mL',
    apresentacao: 'solucao',
    publicoAlvo: 'adulto',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['hipertensao'],
    interacoes: [],
  },
  {
    id: 'soro-nasal',
    nome: 'Soro Fisiológico Nasal 0,9%',
    marca: null,
    principioAtivo: 'cloreto_de_sodio',
    dose: '9mg/mL',
    apresentacao: 'solucao',
    publicoAlvo: 'todos',
    categoria: 'respiratorios',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },

  // --- Dermatológicos ------------------------------------------------------
  {
    id: 'bepantol-derma',
    nome: 'Bepantol® Derma Creme',
    marca: 'Bepantol',
    principioAtivo: 'dexpantenol',
    dose: '50mg/g',
    apresentacao: 'creme',
    publicoAlvo: 'todos',
    categoria: 'dermatologicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'canesten-creme',
    nome: 'Canesten® Creme 1%',
    marca: 'Canesten',
    principioAtivo: 'clotrimazol',
    dose: '10mg/g',
    apresentacao: 'creme',
    publicoAlvo: 'todos',
    categoria: 'dermatologicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'gyno-daktarin',
    nome: 'Gyno-Daktarin® Creme Vaginal 2%',
    marca: 'Gyno-Daktarin',
    principioAtivo: 'miconazol',
    dose: '20mg/g',
    apresentacao: 'creme',
    publicoAlvo: 'adulto',
    categoria: 'dermatologicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'zovirax-creme',
    nome: 'Zovirax® Creme 5%',
    marca: 'Zovirax',
    principioAtivo: 'aciclovir',
    dose: '50mg/g',
    apresentacao: 'creme',
    publicoAlvo: 'todos',
    categoria: 'dermatologicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'nizoral-xampu',
    nome: 'Nizoral® Xampu 2%',
    marca: 'Nizoral',
    principioAtivo: 'cetoconazol',
    dose: '20mg/g',
    apresentacao: 'xampu',
    publicoAlvo: 'todos',
    categoria: 'dermatologicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'cataflam-emulgel',
    nome: 'CataflamPro® Emulgel',
    marca: 'CataflamPro',
    principioAtivo: 'diclofenaco',
    dose: '11,6mg/g',
    apresentacao: 'gel',
    publicoAlvo: 'adulto',
    categoria: 'dermatologicos',
    generico: false,
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    // Tópico não é oral: a absorção sistêmica do gel é uma fração da do
    // comprimido, então sobre anticoagulante isto é CAUTELA (orientar e
    // monitorar), não muro. O AINE oral sobre varfarina, esse sim, não sai.
    interacoes: [],
    cautelasInteracao: ['varfarina', 'losartana'],
  },

  // --- Antibióticos (receita + retenção: RDC 20/2011) ----------------------
  {
    id: 'amoxil-500',
    nome: 'Amoxil® 500mg',
    marca: 'Amoxil',
    principioAtivo: 'amoxicilina',
    dose: '500mg',
    apresentacao: 'capsula',
    publicoAlvo: 'adulto',
    categoria: 'antibioticos',
    generico: false,
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    // antimicrobiano potencializa anticoagulante oral: orientar e monitorar
    cautelasInteracao: ['varfarina'],
    interacoes: [],
  },
  {
    id: 'amoxicilina-gen-500',
    nome: 'Amoxicilina 500mg',
    marca: null,
    principioAtivo: 'amoxicilina',
    dose: '500mg',
    apresentacao: 'capsula',
    publicoAlvo: 'adulto',
    categoria: 'antibioticos',
    generico: true,
    equivalenteA: 'amoxil-500',
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    // antimicrobiano potencializa anticoagulante oral: orientar e monitorar
    cautelasInteracao: ['varfarina'],
    interacoes: [],
  },
  {
    id: 'amoxil-suspensao',
    nome: 'Amoxil® Suspensão 500mg/5mL',
    marca: 'Amoxil',
    principioAtivo: 'amoxicilina',
    dose: '500mg/5mL',
    apresentacao: 'suspensao',
    publicoAlvo: 'pediatrico',
    categoria: 'antibioticos',
    generico: false,
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    // antimicrobiano potencializa anticoagulante oral: orientar e monitorar
    cautelasInteracao: ['varfarina'],
    interacoes: [],
  },

  // --- Uso contínuo --------------------------------------------------------
  // Exigem receita, mas sem retenção. Importam por dois motivos: são o que o
  // cliente responde em "está tomando algum outro medicamento?", e são a outra
  // ponta das interações mais perigosas do balcão (AINE × anticoagulante,
  // AINE × anti-hipertensivo).
  {
    id: 'aradois-50',
    nome: 'Aradois® 50mg',
    marca: 'Aradois',
    principioAtivo: 'losartana',
    dose: '50mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'cronicos',
    generico: false,
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    interacoes: [],
  },
  {
    id: 'losartana-gen-50',
    nome: 'Losartana Potássica 50mg',
    marca: null,
    principioAtivo: 'losartana',
    dose: '50mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'cronicos',
    generico: true,
    equivalenteA: 'aradois-50',
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    interacoes: [],
  },
  {
    id: 'marevan-5',
    nome: 'Marevan® 5mg',
    marca: 'Marevan',
    principioAtivo: 'varfarina',
    dose: '5mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'cronicos',
    generico: false,
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    interacoes: [],
  },
  {
    id: 'glifage-850',
    nome: 'Glifage® 850mg',
    marca: 'Glifage',
    principioAtivo: 'metformina',
    dose: '850mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'cronicos',
    generico: false,
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'puran-t4-50',
    nome: 'Puran T4® 50mcg',
    marca: 'Puran T4',
    principioAtivo: 'levotiroxina',
    dose: '50mcg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'cronicos',
    generico: false,
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },

  // --- Controlados ---------------------------------------------------------
  {
    id: 'valium-5',
    nome: 'Valium® 5mg',
    marca: 'Valium',
    principioAtivo: 'diazepam',
    dose: '5mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'controlados',
    generico: false,
    exigeReceita: true,
    classeControlada: 'tarja_preta',
    contraindicacoes: ['gravidez', 'lactante'],
    interacoes: [],
    // depressão do SNC somada à de anti-histamínicos sedativos de 1ª geração:
    // dispensa com orientação sobre sonolência e direção, não recusa
    cautelasInteracao: ['dexclorfeniramina', 'carbinoxamina'],
  },
  {
    // associação: paracetamol 500mg + codeína 30mg. A codeína é que faz dele
    // controlado — mas o paracetamol escondido é o que causa duplicidade.
    id: 'tylex-30',
    classeTerapeutica: 'analgésico opioide associado a paracetamol',
    nome: 'Tylex® 30mg',
    marca: 'Tylex',
    principioAtivo: 'codeina',
    composicao: ['paracetamol', 'codeina'],
    dose: '500mg + 30mg',
    apresentacao: 'comprimido',
    publicoAlvo: 'adulto',
    categoria: 'controlados',
    generico: false,
    exigeReceita: true,
    classeControlada: 'tarja_vermelha',
    contraindicacoes: ['menor_de_12', 'lactante'],
    interacoes: [],
  },
]

// Classe alergênica é propriedade da FAMÍLIA do fármaco, não do produto: quem
// tem alergia a penicilina reage a qualquer derivado, e quem tem alergia a AINE
// reage a ibuprofeno, AAS e diclofenaco — mas não a paracetamol nem a dipirona,
// que não são AINEs. Declarar por princípio ativo é o que garante que a regra de
// alergia pegue reação cruzada em vez de só o item exato.
const CLASSE_ALERGENICA_POR_PRINCIPIO = {
  amoxicilina: 'penicilina',
  ibuprofeno: 'aine',
  acido_acetilsalicilico: 'aine',
  diclofenaco: 'aine',
  dipirona: 'pirazolona',
}

export const ALERGIA_LABEL = {
  penicilina: 'penicilinas',
  aine: 'anti-inflamatórios (AINEs)',
  pirazolona: 'pirazolonas (dipirona)',
}

// Receita retida não é só tarja preta/vermelha: receita de antimicrobiano
// também fica retida na farmácia (uma das duas vias). Modelar isso separado de
// classeControlada evita ensinar que "só controlado retém".
const CATEGORIAS_COM_RETENCAO = new Set(['antibioticos'])

export const PRODUCTS = PRODUCTS_RAW.map((p) => ({
  ...p,
  classeTerapeutica: p.classeTerapeutica ?? CLASSE_POR_PRINCIPIO[p.principioAtivo] ?? null,
  cautelas: p.cautelas ?? [],
  cautelasInteracao: p.cautelasInteracao ?? [],
  composicao: p.composicao ?? [p.principioAtivo],
  equivalenteA: p.equivalenteA ?? null,
  classeAlergenica: p.classeAlergenica ?? CLASSE_ALERGENICA_POR_PRINCIPIO[p.principioAtivo] ?? null,
  retencaoDeReceita:
    p.retencaoDeReceita ?? (p.classeControlada !== 'nenhuma' || CATEGORIAS_COM_RETENCAO.has(p.categoria)),
}))

export function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) ?? null
}

export function getProductsByCategoria(categoriaId) {
  return PRODUCTS.filter((p) => p.categoria === categoriaId)
}

// Genérico correspondente a um medicamento de referência (mesmo princípio ativo
// e mesma dose) — usado pelos pedidos do tipo "quero o genérico".
export function getGenericoDe(produtoReferenciaId) {
  return PRODUCTS.find((p) => p.generico && p.equivalenteA === produtoReferenciaId) ?? null
}
