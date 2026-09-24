import { useMemo } from 'react'
import './Avatar.css'

// Retrato vetorial do cliente, gerado a partir do nome — nada de emoji.
//
// Regra que não pode ser quebrada: o rosto só pode expressar o que já é
// PÚBLICO na ficha do cliente (nome, idade e humor). Condição declarada,
// alergia, gravidez e uso contínuo são informação de anamnese; se vazassem
// para o desenho, o jogador leria a resposta sem pagar a pergunta e o jogo
// inteiro perderia o sentido.
//
// A aparência é derivada por hash do nome, então o mesmo cliente é sempre a
// mesma pessoa entre partidas, sem precisar escrever um retrato à mão para
// cada um dos ~100 clientes de shifts.js.

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed
  return function random() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const escolher = (rand, lista) => lista[Math.floor(rand() * lista.length)]

// Tom mais escuro da mesma cor, para o volume do cabelo que fica atrás do
// rosto não virar uma mancha chapada junto com a franja.
function escurecer(hex, fator = 0.72) {
  const n = parseInt(hex.slice(1), 16)
  const canal = (deslocamento) => Math.round(((n >> deslocamento) & 0xff) * fator)
  return `#${[canal(16), canal(8), canal(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// Gênero só define o repertório de cabelo/barba do desenho. O palpite vem da
// terminação do nome (em pt-BR "-a" é feminino na esmagadora maioria), com as
// duas listas de exceção cobrindo os nomes que aparecem nos turnos. Um arrival
// pode passar `genero: 'f' | 'm'` para cravar o resultado.
const MASCULINOS_TERMINADOS_EM_A = new Set(['ubirajara', 'juca', 'luca', 'nicola', 'jeremias', 'noa'])
const FEMININOS_NAO_TERMINADOS_EM_A = new Set([
  'beatriz', 'clarice', 'cristiane', 'dani', 'denise', 'simone', 'solange', 'sirlene',
  'aline', 'eliane', 'elaine', 'ariane', 'raquel', 'ester', 'isabel', 'ingrid', 'carmen',
  'iris', 'ruth', 'madalena', 'mercedes', 'lourdes', 'ines',
])

function inferirGenero(nome, explicito) {
  if (explicito === 'f' || explicito === 'm') return explicito
  const chave = String(nome ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)[0]
  if (!chave) return 'f'
  if (MASCULINOS_TERMINADOS_EM_A.has(chave)) return 'm'
  if (FEMININOS_NAO_TERMINADOS_EM_A.has(chave)) return 'f'
  return chave.endsWith('a') ? 'f' : 'm'
}

const PELES = [
  { base: '#f7d9c4', sombra: '#e4bda3' },
  { base: '#eec49f', sombra: '#d6a780' },
  { base: '#dba374', sombra: '#c0865a' },
  { base: '#b87c50', sombra: '#9a613a' },
  { base: '#8d5a34', sombra: '#714426' },
  { base: '#5f3b21', sombra: '#492c17' },
]

const CABELOS = ['#1b191a', '#241c18', '#3a2619', '#4f3623', '#6b4a2d', '#8d6435', '#b3863d', '#9c4527']
const CABELOS_GRISALHOS = ['#b6bac0', '#d4d7dc', '#8f949b', '#e6e8ec']

const ROUPAS = [
  '#3a6ea8', '#b4554a', '#47906f', '#7d61a4', '#c08f42',
  '#4d5a68', '#a85278', '#2f7b86', '#6d7f3f', '#a7643a',
]

const OLHOS = ['#4a2c17', '#2f1c10', '#3f5a3a', '#3a5570', '#5a4433']

const PENTEADOS_M = ['curto', 'raspado', 'ondulado', 'cacheado', 'calvo']
const PENTEADOS_F = ['longo', 'coque', 'chanel', 'cacheado', 'rabo']

function derivarAparencia(customer) {
  const rand = mulberry32(hashString(`${customer.nome ?? ''}#${customer.id ?? ''}`))
  const idade = customer.idade ?? 30
  const genero = inferirGenero(customer.nome, customer.genero)
  const crianca = idade < 13
  const idoso = idade >= 65

  const pele = escolher(rand, PELES)
  // Aos 65+ o cabelo grisalha sempre; entre 50 e 64 é sorteado — é o tipo de
  // variação que faz a fila parecer gente, e não seis clones com idades
  // diferentes escritas embaixo.
  const grisalho = idoso || (idade >= 50 && rand() < 0.5)
  const corCabelo = grisalho ? escolher(rand, CABELOS_GRISALHOS) : escolher(rand, CABELOS)
  const penteado = crianca
    ? escolher(rand, genero === 'f' ? ['longo', 'chanel', 'rabo'] : ['curto', 'cacheado'])
    : escolher(rand, genero === 'f' ? PENTEADOS_F : PENTEADOS_M)

  return {
    genero,
    crianca,
    idoso,
    pele,
    corCabelo,
    penteado,
    corOlhos: escolher(rand, OLHOS),
    roupa: escolher(rand, ROUPAS),
    // barba só em homem adulto, e não em todos
    barba: genero === 'm' && !crianca && rand() < 0.42 ? escolher(rand, ['cheia', 'bigode', 'cavanhaque']) : null,
    // óculos ficam mais prováveis com a idade
    oculos: rand() < (idoso ? 0.55 : crianca ? 0.12 : 0.24),
    brinco: genero === 'f' && !crianca && rand() < 0.6,
    sardas: !crianca && rand() < 0.12,
  }
}

function caminhoRosto({ cx, cy, rx, ry, queixo }) {
  const topo = cy - ry
  const base = cy + ry
  return [
    `M ${cx} ${topo}`,
    `C ${cx + rx * 0.72} ${topo} ${cx + rx} ${cy - ry * 0.46} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry * 0.5} ${cx + rx * queixo} ${base} ${cx} ${base}`,
    `C ${cx - rx * queixo} ${base} ${cx - rx} ${cy + ry * 0.5} ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry * 0.46} ${cx - rx * 0.72} ${topo} ${cx} ${topo}`,
    'Z',
  ].join(' ')
}

// Cada humor mexe em sobrancelha e boca ao mesmo tempo: só a boca não basta
// para separar "com pressa" de "puto da vida" num desenho de 44px.
const EXPRESSOES = {
  neutro: { sobrancelhaY: -1.5, sobrancelhaAng: 0, boca: 'leve-sorriso' },
  apressado: { sobrancelhaY: -3, sobrancelhaAng: -6, boca: 'tensa' },
  estressado: { sobrancelhaY: 0.5, sobrancelhaAng: 14, boca: 'brava' },
}

function caminhoBoca(tipo, cx, y, largura) {
  const m = largura / 2
  if (tipo === 'brava') return `M ${cx - m} ${y + 2.2} Q ${cx} ${y - 3} ${cx + m} ${y + 2.2}`
  if (tipo === 'tensa') return `M ${cx - m * 0.8} ${y} L ${cx + m * 0.8} ${y}`
  return `M ${cx - m} ${y - 1} Q ${cx} ${y + 3.6} ${cx + m} ${y - 1}`
}

// O cabelo vem em duas camadas porque só assim ele existe: o volume passa
// ATRÁS do rosto e a franja passa NA FRENTE. Desenhar tudo antes da face
// esconde a franja e todo mundo fica careca.

function CabeloAtras({ penteado, g, cor, corSombra }) {
  const { cx, cy, rx, ry } = g
  const topo = cy - ry

  if (penteado === 'longo') {
    return (
      <path
        fill={corSombra}
        d={[
          `M ${cx - rx - 2} ${cy - ry * 0.2}`,
          `C ${cx - rx - 3} ${topo - ry * 0.3} ${cx + rx + 3} ${topo - ry * 0.3} ${cx + rx + 2} ${cy - ry * 0.2}`,
          `L ${cx + rx + 4.5} ${cy + ry * 1.5}`,
          `L ${cx - rx - 4.5} ${cy + ry * 1.5}`,
          'Z',
        ].join(' ')}
      />
    )
  }

  if (penteado === 'chanel') {
    return (
      <path
        fill={corSombra}
        d={[
          `M ${cx - rx - 2} ${cy - ry * 0.2}`,
          `C ${cx - rx - 3} ${topo - ry * 0.3} ${cx + rx + 3} ${topo - ry * 0.3} ${cx + rx + 2} ${cy - ry * 0.2}`,
          `C ${cx + rx + 4.5} ${cy + ry * 0.5} ${cx + rx + 3.5} ${cy + ry * 0.86} ${cx + rx * 0.7} ${cy + ry * 0.88}`,
          `L ${cx - rx * 0.7} ${cy + ry * 0.88}`,
          `C ${cx - rx - 3.5} ${cy + ry * 0.86} ${cx - rx - 4.5} ${cy + ry * 0.5} ${cx - rx - 2} ${cy - ry * 0.2}`,
          'Z',
        ].join(' ')}
      />
    )
  }

  if (penteado === 'rabo') {
    return (
      <path
        fill={corSombra}
        d={`M ${cx + rx * 0.5} ${cy - ry * 0.5} q ${rx * 1.25} ${ry * 0.05} ${rx * 1.05} ${ry * 0.85} q ${-rx * 0.2} ${ry * 0.7} ${-rx * 0.8} ${ry * 0.55} q ${rx * 0.62} ${-ry * 0.68} ${-rx * 0.1} ${-ry * 1.45} Z`}
      />
    )
  }

  if (penteado === 'cacheado') {
    const cachos = []
    for (let i = 0; i <= 12; i += 1) {
      const ang = Math.PI * 0.94 + (Math.PI * 1.12 * i) / 12
      cachos.push(
        <circle
          key={i}
          cx={cx + Math.cos(ang) * rx * 1.04}
          cy={cy - ry * 0.16 + Math.sin(ang) * ry * 0.96}
          r={rx * 0.28}
          fill={i % 2 ? corSombra : cor}
        />,
      )
    }
    return <g>{cachos}</g>
  }

  return null
}

function CabeloFrente({ penteado, g, cor, corSombra }) {
  const { cx, cy, rx, ry } = g
  const topo = cy - ry

  if (penteado === 'calvo') {
    // Ferradura: o cabelo sobrou só nas laterais, colado no crânio. Se ele se
    // afasta da silhueta um milímetro, vira fone de ouvido.
    const lado = (s) =>
      [
        `M ${cx + s * (rx + 0.2)} ${cy + ry * 0.46}`,
        `C ${cx + s * (rx + 0.8)} ${cy - ry * 0.12} ${cx + s * rx * 0.88} ${cy - ry * 0.48} ${cx + s * rx * 0.52} ${cy - ry * 0.4}`,
        `C ${cx + s * rx * 0.72} ${cy - ry * 0.16} ${cx + s * rx * 0.84} ${cy + ry * 0.12} ${cx + s * rx * 0.85} ${cy + ry * 0.46}`,
        'Z',
      ].join(' ')
    return <path fill={cor} d={`${lado(-1)} ${lado(1)}`} />
  }

  // Altura da linha do cabelo: o quanto a franja invade a testa. É o parâmetro
  // que separa um corte raspado de um topete.
  const linha = penteado === 'raspado' ? 0.52 : 0.3
  const capa = (
    <path
      fill={cor}
      d={[
        `M ${cx - rx - 1.5} ${cy + ry * 0.12}`,
        `C ${cx - rx - 2.5} ${topo - ry * 0.32} ${cx + rx + 2.5} ${topo - ry * 0.32} ${cx + rx + 1.5} ${cy + ry * 0.12}`,
        `C ${cx + rx * 0.98} ${cy - ry * 0.12} ${cx + rx * 0.78} ${cy - ry * (linha - 0.02)} ${cx + rx * 0.34} ${cy - ry * linha}`,
        `C ${cx - rx * 0.2} ${cy - ry * (linha + 0.1)} ${cx - rx * 0.78} ${cy - ry * (linha - 0.14)} ${cx - rx - 1.5} ${cy + ry * 0.12}`,
        'Z',
      ].join(' ')}
    />
  )

  if (penteado === 'ondulado') {
    return (
      <g>
        {capa}
        <path
          fill={corSombra}
          opacity="0.4"
          d={`M ${cx - rx * 0.85} ${cy - ry * 0.62} q ${rx * 0.28} ${-ry * 0.14} ${rx * 0.56} 0 q ${rx * 0.28} ${ry * 0.14} ${rx * 0.56} 0 l 0 ${ry * 0.14} q ${-rx * 0.28} ${ry * 0.14} ${-rx * 0.56} 0 q ${-rx * 0.28} ${-ry * 0.14} ${-rx * 0.56} 0 Z`}
        />
      </g>
    )
  }

  if (penteado === 'coque') {
    return (
      <g>
        <circle cx={cx} cy={topo - ry * 0.16} r={rx * 0.36} fill={corSombra} />
        {capa}
      </g>
    )
  }

  if (penteado === 'rabo') {
    return (
      <g>
        {capa}
        <circle cx={cx + rx * 0.72} cy={cy - ry * 0.46} r={rx * 0.16} fill={corSombra} />
      </g>
    )
  }

  return capa
}

function Barba({ tipo, g, cor, bocaY }) {
  const { cx, cy, rx, ry } = g
  const bigode = `M ${cx - rx * 0.4} ${bocaY - 4.2} q ${rx * 0.4} -2.6 ${rx * 0.8} 0 q ${-rx * 0.4} 2.4 ${-rx * 0.8} 0 Z`

  if (tipo === 'bigode') return <path fill={cor} d={bigode} />

  if (tipo === 'cavanhaque') {
    return (
      <g fill={cor}>
        <path d={bigode} />
        <path
          d={`M ${cx - rx * 0.28} ${bocaY + 3.4} q ${rx * 0.28} -1.6 ${rx * 0.56} 0 q ${-rx * 0.1} ${ry * 0.3} ${-rx * 0.28} ${ry * 0.3} q ${-rx * 0.18} 0 ${-rx * 0.28} ${-ry * 0.3} Z`}
        />
      </g>
    )
  }

  // 'cheia' — acompanha o maxilar; o recorte do rosto apara o excesso
  return (
    <path
      fill={cor}
      d={[
        `M ${cx - rx} ${cy - ry * 0.05}`,
        `C ${cx - rx} ${cy + ry * 0.75} ${cx - rx * 0.55} ${cy + ry} ${cx} ${cy + ry}`,
        `C ${cx + rx * 0.55} ${cy + ry} ${cx + rx} ${cy + ry * 0.75} ${cx + rx} ${cy - ry * 0.05}`,
        `C ${cx + rx * 0.82} ${cy + ry * 0.16} ${cx + rx * 0.6} ${cy - ry * 0.06} ${cx + rx * 0.42} ${cy + ry * 0.1}`,
        `C ${cx + rx * 0.2} ${cy + ry * 0.42} ${cx - rx * 0.2} ${cy + ry * 0.42} ${cx - rx * 0.42} ${cy + ry * 0.1}`,
        `C ${cx - rx * 0.6} ${cy - ry * 0.06} ${cx - rx * 0.82} ${cy + ry * 0.16} ${cx - rx} ${cy - ry * 0.05}`,
        'Z',
      ].join(' ')}
    />
  )
}

export default function Avatar({ customer, tamanho = 44, className = '' }) {
  const a = useMemo(
    () => derivarAparencia(customer),
    [customer.id, customer.nome, customer.idade, customer.genero],
  )
  const humor = EXPRESSOES[customer.humor] ? customer.humor : 'neutro'
  const exp = EXPRESSOES[humor]
  // os ids de <defs> são globais no documento: o id do cliente evita que dois
  // avatares na fila compartilhem o mesmo clipPath
  const uid = `av-${String(customer.id ?? customer.nome).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const corCabeloEscuro = escurecer(a.corCabelo)

  const g = a.crianca
    ? { cx: 50, cy: 46, rx: 23, ry: 25, queixo: 0.46 }
    : { cx: 50, cy: 44, rx: 21.5, ry: 25.5, queixo: a.genero === 'm' ? 0.58 : 0.44 }

  const olhoY = g.cy + (a.crianca ? 3 : 1)
  const olhoDx = g.rx * 0.4
  const olhoR = a.crianca ? 4.3 : 3.7
  const narizY = g.cy + g.ry * 0.42
  const bocaY = g.cy + g.ry * 0.68
  const rosto = caminhoRosto(g)

  return (
    <span
      className={`avatar avatar--${humor} ${className}`}
      style={{ width: tamanho, height: tamanho }}
      title={`${customer.nome}, ${customer.idade} anos`}
    >
      <svg viewBox="0 0 100 100" role="img" aria-label={`Retrato de ${customer.nome}`}>
        <defs>
          <clipPath id={`${uid}-quadro`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
          <clipPath id={`${uid}-rosto`}>
            <path d={rosto} />
          </clipPath>
          <linearGradient id={`${uid}-fundo`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c4841" />
            <stop offset="100%" stopColor="#1a2e29" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${uid}-quadro)`}>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-fundo)`} />

          {/* ombros e camiseta */}
          <path fill={a.roupa} d="M 50 72 C 26 72 10 84 8 104 L 92 104 C 90 84 74 72 50 72 Z" />
          <path fill="#ffffff" opacity="0.12" d="M 50 72 L 58 86 L 50 96 L 42 86 Z" />

          {/* pescoço */}
          <path fill={a.pele.sombra} d={`M ${g.cx - 7} ${g.cy + g.ry * 0.6} h 14 v ${g.ry * 0.62} h -14 Z`} />

          {/* volume do cabelo que passa atrás da cabeça */}
          <CabeloAtras penteado={a.penteado} g={g} cor={a.corCabelo} corSombra={corCabeloEscuro} />

          {/* rosto */}
          <path d={rosto} fill={a.pele.base} />

          {/* orelhas depois do rosto, senão elas somem sob o contorno */}
          <ellipse cx={g.cx - g.rx} cy={g.cy + 2} rx="3.4" ry="4.8" fill={a.pele.base} />
          <ellipse cx={g.cx + g.rx} cy={g.cy + 2} rx="3.4" ry="4.8" fill={a.pele.base} />
          <path
            d={`M ${g.cx - g.rx - 0.5} ${g.cy} q 1.6 1 0.6 3 M ${g.cx + g.rx + 0.5} ${g.cy} q -1.6 1 -0.6 3`}
            stroke={a.pele.sombra}
            strokeWidth="0.9"
            fill="none"
          />
          {a.brinco && (
            <g fill="#e8c56a">
              <circle cx={g.cx - g.rx} cy={g.cy + 6.8} r="1.5" />
              <circle cx={g.cx + g.rx} cy={g.cy + 6.8} r="1.5" />
            </g>
          )}

          <g clipPath={`url(#${uid}-rosto)`}>
            {a.barba && <Barba tipo={a.barba} g={g} cor={corCabeloEscuro} bocaY={bocaY} />}
          </g>

          {/* sobrancelhas */}
          <g stroke={a.corCabelo} strokeWidth={a.crianca ? 1.8 : 2.2} strokeLinecap="round" fill="none">
            <path
              d={`M ${g.cx - olhoDx - 4.4} ${olhoY - 6 + exp.sobrancelhaY} q 4.4 -2.2 8.8 0`}
              transform={`rotate(${exp.sobrancelhaAng} ${g.cx - olhoDx} ${olhoY - 6})`}
            />
            <path
              d={`M ${g.cx + olhoDx - 4.4} ${olhoY - 6 + exp.sobrancelhaY} q 4.4 -2.2 8.8 0`}
              transform={`rotate(${-exp.sobrancelhaAng} ${g.cx + olhoDx} ${olhoY - 6})`}
            />
          </g>

          {/* olhos */}
          {[-1, 1].map((lado) => (
            <g key={lado}>
              <ellipse cx={g.cx + lado * olhoDx} cy={olhoY} rx={olhoR} ry={olhoR * 0.78} fill="#fbfdff" />
              <circle cx={g.cx + lado * olhoDx} cy={olhoY} r={olhoR * 0.52} fill={a.corOlhos} />
              <circle cx={g.cx + lado * olhoDx} cy={olhoY} r={olhoR * 0.24} fill="#101416" />
              <circle
                cx={g.cx + lado * olhoDx - olhoR * 0.22}
                cy={olhoY - olhoR * 0.28}
                r={olhoR * 0.16}
                fill="#ffffff"
              />
              <path
                d={`M ${g.cx + lado * olhoDx - olhoR} ${olhoY - olhoR * 0.6} q ${olhoR} ${-olhoR * 0.5} ${olhoR * 2} 0`}
                stroke={a.pele.sombra}
                strokeWidth="1"
                fill="none"
              />
            </g>
          ))}

          {/* nariz e boca */}
          <path
            d={`M ${g.cx - 1.6} ${narizY - 3} q -1.4 3.4 1.6 4.2 q 1.6 0.4 2.6 -0.6`}
            stroke={a.pele.sombra}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={caminhoBoca(exp.boca, g.cx, bocaY, g.rx * 0.56)}
            stroke="#a4514c"
            strokeWidth={a.genero === 'f' ? 2.4 : 2}
            strokeLinecap="round"
            fill="none"
          />

          {a.sardas && (
            <g fill={a.pele.sombra} opacity="0.7">
              {[-6, -3, 0, 3, 6].map((dx, i) => (
                <circle key={dx} cx={g.cx + dx} cy={narizY + (i % 2 ? 1.4 : 3)} r="0.7" />
              ))}
            </g>
          )}

          {/* marcas de expressão: sinalizam idade, que já é dado público */}
          {a.idoso && (
            <g stroke={a.pele.sombra} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.85">
              <path d={`M ${g.cx - olhoDx - 6.5} ${olhoY + 1} l -2 -1.6 M ${g.cx - olhoDx - 6.5} ${olhoY + 3} l -2 0.4`} />
              <path d={`M ${g.cx + olhoDx + 6.5} ${olhoY + 1} l 2 -1.6 M ${g.cx + olhoDx + 6.5} ${olhoY + 3} l 2 0.4`} />
              <path d={`M ${g.cx - 6} ${bocaY - 5} q -2 4 -1 7 M ${g.cx + 6} ${bocaY - 5} q 2 4 1 7`} />
            </g>
          )}

          {/* franja por cima do rosto — é o que dá corte de cabelo ao desenho */}
          <CabeloFrente penteado={a.penteado} g={g} cor={a.corCabelo} corSombra={corCabeloEscuro} />

          {a.oculos && (
            <g stroke="#2b3138" strokeWidth="1.8" fill="rgba(210,235,245,0.18)">
              <rect
                x={g.cx - olhoDx - olhoR - 2.4}
                y={olhoY - olhoR - 2}
                width={(olhoR + 2.4) * 2}
                height={(olhoR + 2) * 2}
                rx="3"
              />
              <rect
                x={g.cx + olhoDx - olhoR - 2.4}
                y={olhoY - olhoR - 2}
                width={(olhoR + 2.4) * 2}
                height={(olhoR + 2) * 2}
                rx="3"
              />
              <path d={`M ${g.cx - olhoDx + olhoR + 2.4} ${olhoY} h ${olhoDx * 2 - (olhoR + 2.4) * 2}`} fill="none" />
            </g>
          )}
        </g>
      </svg>
    </span>
  )
}
