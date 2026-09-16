// Catálogo estático de produtos da farmácia.
//
// Os nomes e princípios ativos aqui são REAIS (nomes genéricos/DCB comuns no
// Brasil). As REGRAS do jogo — quais tags contraindicam qual produto, quais
// princípios ativos "interagem" entre si, o que é controlado — foram
// escolhidas para se aproximar de cautelas reais e bem documentadas (ex.:
// anti-inflamatório na gravidez/hipertensão, sedativo + benzodiazepínico,
// codeína restrita para menores de 12), mas são uma SIMPLIFICAÇÃO para fins
// de jogo, não uma bula. Nada aqui substitui orientação de um farmacêutico
// ou profissional de saúde — ver aviso na tela inicial e na tela de ajuda.
//
// Formato de cada produto:
// { id, nome, principioAtivo, categoria, exigeReceita, classeControlada,
//   contraindicacoes: [tags], interacoes: [principioAtivoIds] }
//
// classeControlada: 'nenhuma' | 'tarja_vermelha' | 'tarja_preta'

export const CATEGORIAS = [
  { id: 'analgesicos', nome: 'Analgésicos e antitérmicos' },
  { id: 'antialergicos', nome: 'Antialérgicos' },
  { id: 'antigripais', nome: 'Antigripais' },
  { id: 'gastrointestinal', nome: 'Gastrointestinal' },
  { id: 'dermatologicos', nome: 'Dermatológicos' },
  { id: 'antibioticos', nome: 'Antibióticos' },
  { id: 'controlados', nome: 'Controlados' },
]

// Vocabulário de tags de contexto do cliente / contraindicação do produto.
export const TAGS = {
  gravidez: 'Gestante',
  lactante: 'Lactante',
  menor_de_12: 'Menor de 12 anos',
  hipertensao: 'Hipertensão',
}

export const PRODUCTS = [
  // --- Analgésicos e antitérmicos ---
  {
    id: 'doralgin-500',
    nome: 'Dipirona Sódica 500mg',
    principioAtivo: 'dipirona',
    categoria: 'analgesicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'doralgin-generico-500',
    nome: 'Dipirona Sódica 500mg (Genérico)',
    principioAtivo: 'dipirona',
    categoria: 'analgesicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'doralgin-forte-750',
    nome: 'Dipirona Sódica 750mg',
    principioAtivo: 'dipirona',
    categoria: 'analgesicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'tempranol-750',
    nome: 'Paracetamol 750mg',
    principioAtivo: 'paracetamol',
    categoria: 'analgesicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['menor_de_12'],
    interacoes: [],
  },
  {
    id: 'tempranol-infantil',
    nome: 'Paracetamol Infantil (gotas) 200mg/mL',
    principioAtivo: 'paracetamol',
    categoria: 'analgesicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'inflamex-400',
    nome: 'Ibuprofeno 400mg',
    principioAtivo: 'ibuprofeno',
    categoria: 'analgesicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez', 'hipertensao'],
    interacoes: [],
  },

  // --- Antialérgicos ---
  {
    id: 'alergitin-10',
    nome: 'Loratadina 10mg',
    principioAtivo: 'loratadina',
    categoria: 'antialergicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['menor_de_12'],
    interacoes: [],
  },
  {
    id: 'alergitin-infantil',
    nome: 'Loratadina Xarope 1mg/mL',
    principioAtivo: 'loratadina',
    categoria: 'antialergicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'sonofen-4',
    nome: 'Dexclorfeniramina 2mg',
    principioAtivo: 'dexclorfeniramina',
    categoria: 'antialergicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['menor_de_12', 'gravidez'],
    interacoes: ['diazepam'],
  },

  // --- Antigripais ---
  {
    id: 'resfrian-dia',
    nome: 'Antigripal Diurno (Fenilefrina + Paracetamol)',
    principioAtivo: 'fenilefrina',
    categoria: 'antigripais',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['hipertensao'],
    interacoes: [],
  },
  {
    id: 'resfrian-noite',
    nome: 'Antigripal Noturno (Fenilefrina + Dexclorfeniramina)',
    principioAtivo: 'fenilefrina',
    categoria: 'antigripais',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['hipertensao'],
    interacoes: ['diazepam'],
  },

  // --- Gastrointestinal ---
  {
    id: 'gastrilan-20',
    nome: 'Omeprazol 20mg',
    principioAtivo: 'omeprazol',
    categoria: 'gastrointestinal',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'espasmolyn-10',
    nome: 'Hioscina (Butilescopolamina) 10mg',
    principioAtivo: 'hioscina',
    categoria: 'gastrointestinal',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    interacoes: [],
  },

  // --- Dermatológicos ---
  {
    id: 'dermacreme',
    nome: 'Dexpantenol Creme',
    principioAtivo: 'dexpantenol',
    categoria: 'dermatologicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'fungotop',
    nome: 'Clotrimazol Creme 1%',
    principioAtivo: 'clotrimazol',
    categoria: 'dermatologicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'inflamex-gel',
    nome: 'Ibuprofeno Gel 5%',
    principioAtivo: 'ibuprofeno',
    categoria: 'dermatologicos',
    exigeReceita: false,
    classeControlada: 'nenhuma',
    contraindicacoes: ['gravidez'],
    interacoes: [],
  },

  // --- Antibióticos (exigem receita, mas não são "controlados") ---
  {
    id: 'bacterol-500',
    nome: 'Amoxicilina 500mg',
    principioAtivo: 'amoxicilina',
    categoria: 'antibioticos',
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },
  {
    id: 'bacterol-suspensao',
    nome: 'Amoxicilina Suspensão Infantil 250mg/5mL',
    principioAtivo: 'amoxicilina',
    categoria: 'antibioticos',
    exigeReceita: true,
    classeControlada: 'nenhuma',
    contraindicacoes: [],
    interacoes: [],
  },

  // --- Controlados ---
  {
    id: 'calmapan-5',
    nome: 'Diazepam 5mg',
    principioAtivo: 'diazepam',
    categoria: 'controlados',
    exigeReceita: true,
    classeControlada: 'tarja_preta',
    contraindicacoes: ['gravidez'],
    interacoes: ['dexclorfeniramina', 'fenilefrina'],
  },
  {
    id: 'dorcodin-30',
    nome: 'Codeína 30mg',
    principioAtivo: 'codeina',
    categoria: 'controlados',
    exigeReceita: true,
    classeControlada: 'tarja_vermelha',
    contraindicacoes: ['menor_de_12'],
    interacoes: [],
  },
]

export function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) ?? null
}

export function getProductsByCategoria(categoriaId) {
  return PRODUCTS.filter((p) => p.categoria === categoriaId)
}
