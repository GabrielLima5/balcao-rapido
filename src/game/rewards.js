// Camada de gamificação ENTRE turnos: estrelas, moedas, XP/níveis, conquistas,
// presente diário, baús de estrelas e loja.
//
// Assim como engine.js, nada aqui toca DOM, localStorage ou Date.now(): quem
// lê/grava o perfil é storage.js e quem sabe "que dia é hoje" é App.jsx, que
// passa a data como string 'AAAA-MM-DD'. Toda função recebe um perfil e
// devolve um perfil NOVO (nunca muta).
//
// Princípio que guia tudo aqui: recompensa segue o BOM ATENDIMENTO. A 3ª
// estrela exige anamnese completa, a conquista mais cara exige zero acertos no
// escuro, e nada que se compra na loja muda as regras ou a dificuldade — são
// só cosméticos. Moeda não compra atalho pedagógico.

// --- estrelas ----------------------------------------------------------------

export const CRITERIOS_ESTRELAS = [
  'Concluir o turno',
  'Nenhum erro de venda nem recusa indevida',
  'Anamnese completa em tudo e ninguém indo embora',
]

export function calcularEstrelas(resumo) {
  if (resumo.status !== 'won') return 0
  const semErros = resumo.errors === 0 && resumo.refusedIncorrect === 0
  if (!semErros) return 1
  if (resumo.acertosNoEscuro === 0 && resumo.lost === 0) return 3
  return 2
}

export function totalEstrelas(progress) {
  return Object.values(progress.results ?? {}).reduce((soma, r) => soma + (r.estrelas ?? 0), 0)
}

export function turnosConcluidos(progress) {
  return Object.values(progress.results ?? {}).filter((r) => r.won).length
}

// --- níveis ------------------------------------------------------------------

export const NIVEIS = [
  { nivel: 1, titulo: 'Estagiário', xp: 0 },
  { nivel: 2, titulo: 'Balconista', xp: 600 },
  { nivel: 3, titulo: 'Atendente', xp: 1500 },
  { nivel: 4, titulo: 'Atendente Sênior', xp: 2800 },
  { nivel: 5, titulo: 'Técnico em Farmácia', xp: 4500 },
  { nivel: 6, titulo: 'Farmacêutico', xp: 6800 },
  { nivel: 7, titulo: 'Farmacêutico Responsável', xp: 9600 },
  { nivel: 8, titulo: 'Mestre do Balcão', xp: 13000 },
]

const MOEDAS_POR_NIVEL = 50

export function nivelDoXp(xp) {
  let atual = NIVEIS[0]
  for (const n of NIVEIS) if (xp >= n.xp) atual = n
  const proximo = NIVEIS.find((n) => n.nivel === atual.nivel + 1) ?? null
  const progresso = proximo ? (xp - atual.xp) / (proximo.xp - atual.xp) : 1
  return { ...atual, proximo, progresso: Math.min(1, Math.max(0, progresso)) }
}

// --- loja --------------------------------------------------------------------
//
// Só cosméticos. Tema troca a paleta (ver [data-theme] em index.css); mascote
// fica no HUD e reage aos atendimentos.

export const ITENS_LOJA = [
  { id: 'tema-classico', tipo: 'tema', nome: 'Verde Farmácia', preco: 0, cor: '#2fbf8f', descricao: 'O balcão de sempre.' },
  { id: 'tema-oceano', tipo: 'tema', nome: 'Oceano', preco: 150, cor: '#3ba7f5', descricao: 'Azul calmo para plantões longos.' },
  { id: 'tema-lavanda', tipo: 'tema', nome: 'Lavanda', preco: 200, cor: '#a78bfa', descricao: 'Um toque de manipulação artesanal.' },
  { id: 'tema-ambar', tipo: 'tema', nome: 'Âmbar', preco: 250, cor: '#f59e0b', descricao: 'A cor do vidro de xarope.' },
  { id: 'tema-cereja', tipo: 'tema', nome: 'Cereja', preco: 300, cor: '#f43f5e', descricao: 'Para quem atende com energia.' },
  {
    id: 'tema-dourado',
    tipo: 'tema',
    nome: 'Dourado',
    preco: null,
    cor: '#e8c15a',
    descricao: 'Exclusivo: abra o baú de 45 estrelas.',
  },
  { id: 'mascote-nenhum', tipo: 'mascote', nome: 'Sem mascote', preco: 0, emoji: '', descricao: 'Balcão minimalista.' },
  { id: 'mascote-samambaia', tipo: 'mascote', nome: 'Samambaia', preco: 80, emoji: '🪴', descricao: 'Não reclama, só cresce.' },
  { id: 'mascote-gato', tipo: 'mascote', nome: 'Gato do balcão', preco: 150, emoji: '🐈', descricao: 'Dorme em cima das caixas.' },
  { id: 'mascote-peixe', tipo: 'mascote', nome: 'Aquário', preco: 200, emoji: '🐠', descricao: 'Acalma a fila, dizem.' },
  { id: 'mascote-coruja', tipo: 'mascote', nome: 'Coruja do plantão', preco: 300, emoji: '🦉', descricao: 'Acordada na madrugada com você.' },
  { id: 'mascote-caramelo', tipo: 'mascote', nome: 'Caramelo', preco: 350, emoji: '🐕', descricao: 'O vira-lata mais querido do bairro.' },
]

export function getItemLoja(id) {
  return ITENS_LOJA.find((i) => i.id === id) ?? null
}

// --- baús de estrelas --------------------------------------------------------

export const BAUS_ESTRELAS = [
  { estrelas: 5, moedas: 50 },
  { estrelas: 12, moedas: 100 },
  { estrelas: 20, moedas: 150 },
  { estrelas: 30, moedas: 200 },
  { estrelas: 38, moedas: 250 },
  { estrelas: 45, moedas: 400, desbloqueia: 'tema-dourado' },
]

// --- presente diário ---------------------------------------------------------

export const PRESENTES_DIARIOS = [20, 30, 40, 50, 60, 80, 150]

function diaAnterior(data) {
  const [a, m, d] = data.split('-').map(Number)
  const ontem = new Date(a, m - 1, d - 1)
  return `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`
}

export function presenteDisponivel(perfil, hoje) {
  return perfil.diario.ultimoResgate !== hoje
}

// Sequência que o jogador TERIA ao resgatar hoje: continua se resgatou ontem,
// recomeça do dia 1 se pulou algum dia.
export function sequenciaAoResgatar(perfil, hoje) {
  const { ultimoResgate, sequencia } = perfil.diario
  if (ultimoResgate === hoje) return sequencia
  return ultimoResgate === diaAnterior(hoje) ? sequencia + 1 : 1
}

export function diaDoCiclo(sequencia) {
  return (Math.max(1, sequencia) - 1) % PRESENTES_DIARIOS.length
}

// --- conquistas --------------------------------------------------------------
//
// `check(ctx)` recebe { perfil, progress, turno? } — `turno` só existe quando
// a avaliação acontece no fim de um turno: { resumo, log, shiftIndex,
// estrelas, resultadoAnterior }. Conquistas cumulativas têm `progresso(ctx)`
// para a tela de conquistas mostrar quanto falta.

const decisoesCertasDoLog = (log) => log.filter((e) => e.type === 'serve_success' || e.type === 'refuse_correct')

export const CONQUISTAS = [
  {
    id: 'primeiro-plantao',
    icone: '🩺',
    nome: 'Primeiro Plantão',
    descricao: 'Conclua seu primeiro turno.',
    moedas: 20,
    check: ({ progress }) => turnosConcluidos(progress) >= 1,
  },
  {
    id: 'mao-firme',
    icone: '🎯',
    nome: 'Mão Firme',
    descricao: 'Conclua um turno sem nenhum erro de venda nem recusa indevida.',
    moedas: 40,
    check: ({ turno }) => turno?.estrelas >= 2,
  },
  {
    id: 'detetive',
    icone: '🔍',
    nome: 'Detetive Clínico',
    descricao: 'Conclua um turno com anamnese completa em todas as decisões (mínimo de 5).',
    moedas: 60,
    check: ({ turno }) =>
      turno?.resumo.status === 'won' && turno.resumo.decisoesCertas >= 5 && turno.resumo.acertosNoEscuro === 0,
  },
  {
    id: 'saber-dizer-nao',
    icone: '✋',
    nome: 'Saber Dizer Não',
    descricao: 'Faça 3 recusas corretas em um mesmo turno.',
    moedas: 40,
    check: ({ turno }) => turno?.resumo.refusedCorrect >= 3,
  },
  {
    id: 'sentinela',
    icone: '🚨',
    nome: 'Sentinela',
    descricao: 'Reconheça um sinal de alerta e encaminhe o cliente ao médico.',
    moedas: 30,
    check: ({ turno }) =>
      turno?.log.some((e) => e.type === 'refuse_correct' && e.violations?.some((v) => v.id === 'redFlagReferral')),
  },
  {
    id: 'combo-5',
    icone: '🔥',
    nome: 'Em Chamas',
    descricao: 'Acerte 5 atendimentos seguidos.',
    moedas: 30,
    check: ({ perfil }) => perfil.stats.melhorCombo >= 5,
  },
  {
    id: 'combo-10',
    icone: '☄️',
    nome: 'Imparável',
    descricao: 'Acerte 10 atendimentos seguidos.',
    moedas: 80,
    check: ({ perfil }) => perfil.stats.melhorCombo >= 10,
  },
  {
    id: 'relampago',
    icone: '⚡',
    nome: 'Relâmpago',
    descricao: 'Faça uma venda certa com mais de 80% da paciência do cliente.',
    moedas: 20,
    check: ({ turno }) => turno?.log.some((e) => e.type === 'serve_success' && e.patienceRatio > 0.8),
  },
  {
    id: 'casa-cheia',
    icone: '🤝',
    nome: 'Ninguém Fica pra Trás',
    descricao: 'Conclua um turno do 5 em diante sem nenhum cliente ir embora.',
    moedas: 40,
    check: ({ turno }) => turno?.shiftIndex >= 4 && turno.resumo.status === 'won' && turno.resumo.lost === 0,
  },
  {
    id: 'reputacao-impecavel',
    icone: '💯',
    nome: 'Reputação Impecável',
    descricao: 'Termine um turno com reputação 95 ou mais.',
    moedas: 50,
    check: ({ turno }) => turno?.resumo.status === 'won' && turno.resumo.reputation >= 95,
  },
  {
    id: 'persistencia',
    icone: '💪',
    nome: 'Persistência',
    descricao: 'Vença um turno em que você já tinha falhado.',
    moedas: 30,
    check: ({ turno }) => turno?.resumo.status === 'won' && turno.resultadoAnterior && !turno.resultadoAnterior.won,
  },
  {
    id: 'excelencia',
    icone: '⭐',
    nome: 'Excelência',
    descricao: 'Ganhe 3 estrelas em um turno.',
    moedas: 60,
    check: ({ turno }) => turno?.estrelas === 3,
  },
  {
    id: 'constelacao',
    icone: '🌟',
    nome: 'Constelação',
    descricao: 'Some 20 estrelas.',
    moedas: 100,
    progresso: ({ progress }) => [totalEstrelas(progress), 20],
    check: ({ progress }) => totalEstrelas(progress) >= 20,
  },
  {
    id: 'galaxia',
    icone: '🌌',
    nome: 'Galáxia Completa',
    descricao: 'Conquiste todas as 45 estrelas.',
    moedas: 300,
    progresso: ({ progress }) => [totalEstrelas(progress), 45],
    check: ({ progress }) => totalEstrelas(progress) >= 45,
  },
  {
    id: 'plantonista',
    icone: '🏥',
    nome: 'Plantonista',
    descricao: 'Conclua 8 turnos diferentes.',
    moedas: 80,
    progresso: ({ progress }) => [turnosConcluidos(progress), 8],
    check: ({ progress }) => turnosConcluidos(progress) >= 8,
  },
  {
    id: 'formado',
    icone: '🎓',
    nome: 'Formado',
    descricao: 'Conclua todos os 15 turnos.',
    moedas: 200,
    progresso: ({ progress }) => [turnosConcluidos(progress), 15],
    check: ({ progress }) => turnosConcluidos(progress) >= 15,
  },
  {
    id: 'veterano',
    icone: '🧑‍⚕️',
    nome: 'Veterano do Balcão',
    descricao: 'Acumule 100 decisões certas.',
    moedas: 100,
    progresso: ({ perfil }) => [perfil.stats.decisoesCertas, 100],
    check: ({ perfil }) => perfil.stats.decisoesCertas >= 100,
  },
  {
    id: 'cofrinho',
    icone: '🐷',
    nome: 'Cofrinho',
    descricao: 'Ganhe 1.000 moedas no total.',
    moedas: 50,
    progresso: ({ perfil }) => [perfil.moedasTotais, 1000],
    check: ({ perfil }) => perfil.moedasTotais >= 1000,
  },
  {
    id: 'fregues',
    icone: '📅',
    nome: 'Freguês da Casa',
    descricao: 'Resgate o presente diário 5 dias seguidos.',
    moedas: 60,
    progresso: ({ perfil }) => [perfil.diario.sequencia, 5],
    check: ({ perfil }) => perfil.diario.sequencia >= 5,
  },
  {
    id: 'colecionador',
    icone: '🛍️',
    nome: 'Colecionador',
    descricao: 'Compre 3 itens na loja.',
    moedas: 40,
    progresso: ({ perfil }) => [perfil.loja.comprados.filter((id) => getItemLoja(id)?.preco > 0).length, 3],
    check: ({ perfil }) => perfil.loja.comprados.filter((id) => getItemLoja(id)?.preco > 0).length >= 3,
  },
]

// --- perfil ------------------------------------------------------------------

export function perfilInicial() {
  return {
    moedas: 0,
    moedasTotais: 0,
    xp: 0,
    conquistas: {},
    stats: { turnosJogados: 0, decisoesCertas: 0, recusasCertas: 0, melhorCombo: 0 },
    loja: { comprados: ['tema-classico', 'mascote-nenhum'], tema: 'tema-classico', mascote: 'mascote-nenhum' },
    diario: { ultimoResgate: null, sequencia: 0 },
    baus: { abertos: [] },
  }
}

// Mescla um perfil salvo com o formato atual — um save antigo ou parcial não
// pode quebrar o jogo quando um campo novo aparecer.
export function normalizarPerfil(salvo) {
  const base = perfilInicial()
  if (!salvo || typeof salvo !== 'object') return base
  return {
    ...base,
    ...salvo,
    conquistas: { ...base.conquistas, ...salvo.conquistas },
    stats: { ...base.stats, ...salvo.stats },
    loja: { ...base.loja, ...salvo.loja },
    diario: { ...base.diario, ...salvo.diario },
    baus: { ...base.baus, ...salvo.baus },
  }
}

function creditar(perfil, moedas) {
  return { ...perfil, moedas: perfil.moedas + moedas, moedasTotais: perfil.moedasTotais + moedas }
}

// Desbloqueia toda conquista cujo check passa agora e ainda não foi ganha,
// creditando as moedas de cada uma. Roda em laço porque uma conquista pode
// render moedas que destravam outra (o Cofrinho).
export function avaliarConquistas(perfil, ctx) {
  let atual = perfil
  const novas = []
  for (;;) {
    const ganhas = CONQUISTAS.filter((c) => !atual.conquistas[c.id] && c.check({ ...ctx, perfil: atual }))
    if (ganhas.length === 0) break
    for (const c of ganhas) {
      atual = creditar({ ...atual, conquistas: { ...atual.conquistas, [c.id]: true } }, c.moedas)
      novas.push(c)
    }
  }
  return { perfil: atual, novas }
}

// Fecha a conta de um turno terminado. `progressAntes`/`progressDepois` são o
// progresso antes e depois de recordShiftCompletion.
export function aplicarRecompensasDoTurno(perfil, { resumo, log, shiftIndex, progressAntes, progressDepois }) {
  const venceu = resumo.status === 'won'
  const estrelas = calcularEstrelas(resumo)
  const resultadoAnterior = progressAntes.results[shiftIndex] ?? null
  const estrelasAntes = resultadoAnterior?.estrelas ?? 0
  const estrelasNovas = Math.max(0, estrelas - estrelasAntes)
  const primeiraVitoria = venceu && !resultadoAnterior?.won

  const moedas = []
  if (resumo.moedas > 0) moedas.push({ label: 'Gorjetas dos clientes', valor: resumo.moedas })
  if (venceu) moedas.push({ label: 'Turno concluído', valor: 10 + 2 * shiftIndex })
  if (primeiraVitoria) moedas.push({ label: 'Primeira vez neste turno', valor: 30 })
  if (estrelasNovas > 0) moedas.push({ label: `${estrelasNovas} estrela${estrelasNovas > 1 ? 's' : ''} nova${estrelasNovas > 1 ? 's' : ''}`, valor: 15 * estrelasNovas })

  const xpGanho = Math.max(0, resumo.score) + (venceu ? 100 : 25)
  const nivelAntes = nivelDoXp(perfil.xp)
  const nivelDepois = nivelDoXp(perfil.xp + xpGanho)
  const niveisSubidos = nivelDepois.nivel - nivelAntes.nivel
  if (niveisSubidos > 0) moedas.push({ label: `Subiu para ${nivelDepois.titulo}`, valor: MOEDAS_POR_NIVEL * niveisSubidos })

  let atual = creditar(
    {
      ...perfil,
      xp: perfil.xp + xpGanho,
      stats: {
        turnosJogados: perfil.stats.turnosJogados + 1,
        decisoesCertas: perfil.stats.decisoesCertas + decisoesCertasDoLog(log).length,
        recusasCertas: perfil.stats.recusasCertas + resumo.refusedCorrect,
        melhorCombo: Math.max(perfil.stats.melhorCombo, resumo.maxCombo),
      },
    },
    moedas.reduce((s, m) => s + m.valor, 0),
  )

  const { perfil: comConquistas, novas } = avaliarConquistas(atual, {
    progress: progressDepois,
    turno: { resumo, log, shiftIndex, estrelas, resultadoAnterior },
  })
  atual = comConquistas
  for (const c of novas) moedas.push({ label: `Conquista: ${c.nome}`, valor: c.moedas })

  return {
    perfil: atual,
    relatorio: {
      estrelas,
      estrelasNovas,
      moedas,
      totalMoedas: moedas.reduce((s, m) => s + m.valor, 0),
      xpGanho,
      nivelAntes,
      nivelDepois,
      conquistas: novas,
    },
  }
}

export function resgatarPresenteDiario(perfil, hoje, progress) {
  if (!presenteDisponivel(perfil, hoje)) return { perfil, moedas: 0, novas: [] }
  const sequencia = sequenciaAoResgatar(perfil, hoje)
  const moedas = PRESENTES_DIARIOS[diaDoCiclo(sequencia)]
  const atual = creditar({ ...perfil, diario: { ultimoResgate: hoje, sequencia } }, moedas)
  const { perfil: final, novas } = avaliarConquistas(atual, { progress })
  return { perfil: final, moedas, novas }
}

export function bauDisponivel(perfil, progress, bau) {
  return totalEstrelas(progress) >= bau.estrelas && !perfil.baus.abertos.includes(bau.estrelas)
}

export function abrirBau(perfil, progress, bau) {
  if (!bauDisponivel(perfil, progress, bau)) return { perfil, novas: [] }
  let atual = creditar({ ...perfil, baus: { abertos: [...perfil.baus.abertos, bau.estrelas] } }, bau.moedas)
  if (bau.desbloqueia && !atual.loja.comprados.includes(bau.desbloqueia)) {
    atual = { ...atual, loja: { ...atual.loja, comprados: [...atual.loja.comprados, bau.desbloqueia] } }
  }
  return avaliarConquistas(atual, { progress })
}

export function comprarItem(perfil, progress, itemId) {
  const item = getItemLoja(itemId)
  if (!item || item.preco == null || perfil.loja.comprados.includes(itemId) || perfil.moedas < item.preco) {
    return { perfil, novas: [] }
  }
  const atual = {
    ...perfil,
    moedas: perfil.moedas - item.preco,
    loja: { ...perfil.loja, comprados: [...perfil.loja.comprados, itemId] },
  }
  return avaliarConquistas(equiparItem(atual, itemId), { progress })
}

export function equiparItem(perfil, itemId) {
  const item = getItemLoja(itemId)
  if (!item || !perfil.loja.comprados.includes(itemId)) return perfil
  const campo = item.tipo === 'tema' ? 'tema' : 'mascote'
  return { ...perfil, loja: { ...perfil.loja, [campo]: itemId } }
}
