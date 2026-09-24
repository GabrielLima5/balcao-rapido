import { labelPrincipio } from '../game/products.js'
import './Embalagem.css'

// Desenho da embalagem do medicamento. O objetivo não é enfeite: é fazer a
// prateleira parecer uma prateleira, e principalmente dar ao jogador a mesma
// pista visual que ele teria no balcão de verdade —
//
//   · a forma diz a apresentação (caixa, frasco, bisnaga, tubo, conta-gotas);
//   · a tarja vermelha/preta é a tarja de verdade, atravessando a caixa;
//   · a faixa amarela com "G" é a marca do genérico, como na farmácia.
//
// O que NÃO pode aparecer aqui é a validade do lote: na prateleira dois lotes
// do mesmo produto têm que ser indistinguíveis, senão o turno 06 deixa de
// ensinar a conferir a validade. O carimbo "VENCIDO" só é desenhado quando o
// chamador passa `vencido` — o que só a tela de confirmação faz.

// --- cor da embalagem -------------------------------------------------------
//
// Uma cor por MARCA, não por categoria: o que faz o jogador reconhecer a caixa
// na gôndola é a cor da marca (Novalgina é vermelha, Naldecon Noite é azul
// escuro), não a classe terapêutica. Com cor por categoria, onze analgésicos
// viravam onze caixas azuis idênticas.
//
// ⚠️ Estas cores são a identidade visual conhecida de cada marca, não amostras
// tiradas de foto da caixa — vale como reconhecimento, não como referência.
// Corrigir qualquer uma é trocar um hex aqui; o resto do desenho (faces, faixa,
// tarja, brilho) se ajusta sozinho a partir dele.
const COR_DA_MARCA = {
  Novalgina: '#d3352c',
  Tylenol: '#c8322b',
  Advil: '#1f4fa0',
  Alivium: '#e8762a',
  Aspirina: '#0f6fb8',
  Claritin: '#1857a4',
  Zyrtec: '#3f9c35',
  Polaramine: '#2b7fa8',
  Losec: '#6d4b9b',
  Mylanta: '#1f63b0',
  Buscopan: '#0e4f9e',
  Luftal: '#cf3f34',
  Imosec: '#0f7a5f',
  Pedialyte: '#1a73b8',
  Vibral: '#7a4fa0',
  Fluimucil: '#ef7c1f',
  Mucosolvan: '#c8342e',
  Sorine: '#1f7fc4',
  Bepantol: '#1b74bd',
  Canesten: '#1160a8',
  'Gyno-Daktarin': '#b0417c',
  Zovirax: '#2a63a8',
  Nizoral: '#b83a2e',
  CataflamPro: '#d4362c',
  Amoxil: '#e08a2c',
  Aradois: '#2f7f8c',
  Marevan: '#7a5c34',
  Glifage: '#2f6fb0',
  'Puran T4': '#6a5aa8',
  Valium: '#1f4f9c',
  Tylex: '#2c6e4f',
}

// Linhas da mesma marca que têm cor própria na prateleira de verdade.
const COR_DO_PRODUTO = {
  'naldecon-dia': '#f0a52a',
  'naldecon-noite': '#23407e',
}

// Genérico não tem marca: a caixa é branca e quem identifica é a faixa amarela
// com "G". O cinza-azulado aqui é só a moldura do cartucho.
const COR_GENERICO = '#8d99a6'

// Último recurso, para produto sem marca que também não é genérico (soro
// fisiológico) — aí a categoria é a única pista que sobra.
const COR_DA_CATEGORIA = {
  analgesicos: '#2f6fb0',
  antialergicos: '#7b56b8',
  antigripais: '#cf7128',
  gastrointestinal: '#2f9a7e',
  respiratorios: '#2a8fa8',
  dermatologicos: '#bf5480',
  antibioticos: '#4457b0',
  cronicos: '#56707f',
  controlados: '#8d97a3',
}
const COR_PADRAO = '#56707f'

function clarear(hex, fator) {
  const n = parseInt(hex.slice(1), 16)
  const canal = (deslocamento) => {
    const v = (n >> deslocamento) & 0xff
    return Math.round(v + (255 - v) * fator)
  }
  return `#${[canal(16), canal(8), canal(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function corDoProduto(produto) {
  const base =
    COR_DO_PRODUTO[produto.id] ??
    (produto.generico
      ? COR_GENERICO
      : (COR_DA_MARCA[produto.marca] ?? COR_DA_CATEGORIA[produto.categoria] ?? COR_PADRAO))
  // A face de cima pega luz, a da frente é a cor cheia. Derivar o tom claro da
  // própria cor mantém a tabela acima com um hex por marca.
  return { forte: base, claro: clarear(base, 0.3) }
}

const FORMATO_POR_APRESENTACAO = {
  comprimido: 'caixa',
  capsula: 'caixa',
  efervescente: 'tubo',
  xarope: 'frasco',
  suspensao: 'frasco',
  solucao: 'frasco',
  gotas: 'conta-gotas',
  creme: 'bisnaga',
  gel: 'bisnaga',
  xampu: 'xampu',
}

const PAPEL = '#f2f5f7'
const PAPEL_SOMBRA = '#d5dde2'
const PAPEL_LUZ = '#ffffff'
const LINHA = '#b9c5cd'
const PLASTICO_ESCURO = '#39424a'

const CORES_TARJA = {
  tarja_vermelha: '#cf3a30',
  tarja_preta: '#16181b',
}

function Tarja({ x, y, largura, cor }) {
  return (
    <g>
      <rect x={x} y={y} width={largura} height="7" fill={cor} />
      <rect x={x + 3} y={y + 2.6} width={largura - 6} height="1.6" fill="#ffffff" opacity="0.75" />
    </g>
  )
}

// A faixa do genérico é o único elemento que o jogador pode usar como atalho
// legítimo: é assim que ele identifica o genérico na farmácia de verdade.
function FaixaGenerico({ x, y, largura, altura }) {
  return (
    <g>
      <rect x={x} y={y} width={largura} height={altura} fill="#f2c230" />
      <text
        x={x + altura * 0.62}
        y={y + altura * 0.78}
        fontSize={altura * 0.86}
        fontWeight="700"
        fontFamily="Georgia, serif"
        fill="#1d1d1d"
        textAnchor="middle"
      >
        G
      </text>
      <rect x={x + altura * 1.1} y={y + altura * 0.3} width={largura - altura * 1.4} height="1.6" fill="#1d1d1d" opacity="0.55" />
      <rect x={x + altura * 1.1} y={y + altura * 0.58} width={(largura - altura * 1.4) * 0.7} height="1.6" fill="#1d1d1d" opacity="0.4" />
    </g>
  )
}

// O corpo da fonte é calculado a partir da largura do rótulo (0.58 é a largura
// média de glifo desta fonte): o nome encolhe até caber em vez de vazar para
// fora da embalagem — um frasco de gotas não tem a largura de uma caixa.
function LinhasDeTexto({ x, y, largura, etiqueta, dose }) {
  if (etiqueta) {
    const corpoTitulo = Math.min(7.5, (largura - 5) / (0.58 * etiqueta.length))
    const corpoDose = dose ? Math.min(6, (largura - 5) / (0.54 * dose.length)) : 0
    return (
      <g>
        <text
          x={x + largura / 2}
          y={y + 6}
          fontSize={corpoTitulo}
          fontWeight="700"
          fontFamily="Segoe UI, system-ui, sans-serif"
          fill="#25313a"
          textAnchor="middle"
        >
          {etiqueta}
        </text>
        {dose && (
          <text
            x={x + largura / 2}
            y={y + 15}
            fontSize={corpoDose}
            fontFamily="Segoe UI, system-ui, sans-serif"
            fill="#61727e"
            textAnchor="middle"
          >
            {dose}
          </text>
        )}
      </g>
    )
  }
  // Sem texto legível (miniatura da prateleira): manchas que leem como
  // impressão da caixa em vez de letras ilegíveis.
  return (
    <g fill={LINHA}>
      <rect x={x + largura * 0.12} y={y} width={largura * 0.76} height="2.6" rx="1.3" />
      <rect x={x + largura * 0.24} y={y + 5.4} width={largura * 0.52} height="2.2" rx="1.1" />
    </g>
  )
}

function Caixa({ cor, produto, etiqueta }) {
  const tarja = CORES_TARJA[produto.classeControlada]
  return (
    <g>
      {/* face superior e lateral dão volume: uma caixa chapada parece ícone */}
      <path d="M 24 24 L 36 13 L 88 13 L 76 24 Z" fill={cor.claro} />
      <path d="M 76 24 L 88 13 L 88 79 L 76 90 Z" fill={cor.forte} />
      <path d="M 76 24 L 88 13 L 88 79 L 76 90 Z" fill="#000000" opacity="0.18" />
      <rect x="24" y="24" width="52" height="66" rx="1.5" fill={PAPEL} />

      {/* cartucho: faixa de cor no topo da face frontal */}
      <rect x="24" y="24" width="52" height="17" fill={cor.forte} />
      <path d="M 24 41 L 76 34 L 76 41 Z" fill={cor.claro} opacity="0.8" />

      {tarja && <Tarja x={24} y={43} largura={52} cor={tarja} />}
      <LinhasDeTexto x={24} y={tarja ? 54 : 49} largura={52} etiqueta={etiqueta} dose={produto.dose} />
      {produto.generico && <FaixaGenerico x={24} y={73} largura={52} altura={13} />}
      {!produto.generico && !tarja && (
        <g fill={LINHA}>
          <rect x="30" y="74" width="26" height="2" rx="1" />
          <rect x="30" y="79" width="18" height="2" rx="1" />
          <rect x="60" y="72" width="10" height="12" rx="1" fill={PAPEL_SOMBRA} />
        </g>
      )}

      {/* brilho do verniz */}
      <path d="M 24 24 L 34 24 L 28 90 L 24 90 Z" fill={PAPEL_LUZ} opacity="0.35" />
    </g>
  )
}

// Dois frascos diferentes, porque na prateleira eles são dois objetos
// diferentes: gotas vêm em vidro âmbar estreito (o âmbar é funcional, protege
// da luz) e xarope/suspensão/solução vêm em frasco plástico claro, onde quem
// manda na cor é o rótulo da marca — e não o vidro.
function Frasco({ cor, produto, etiqueta, gotas = false }) {
  const tarja = CORES_TARJA[produto.classeControlada]
  const meia = gotas ? 16 : 22
  const esq = 50 - meia
  const dir = 50 + meia
  const tampaY = gotas ? 4 : 6
  const tampaH = gotas ? 17 : 12
  const corpoTopo = tampaY + tampaH + 4
  const rotuloX = esq + 3
  const rotuloL = meia * 2 - 6
  // no frasco plástico o rótulo é quase o corpo todo; no de vidro ele é uma
  // tira no meio, e o âmbar aparece em cima e embaixo
  const rotuloY = gotas ? 40 : 34
  const rotuloH = gotas ? 40 : 48
  const cabecalhoH = gotas ? 10 : 17

  const corpo = `M ${esq} ${corpoTopo + 10} Q ${esq} ${corpoTopo} ${esq + 9} ${corpoTopo} L ${dir - 9} ${corpoTopo} Q ${dir} ${corpoTopo} ${dir} ${corpoTopo + 10} L ${dir} 86 Q ${dir} 92 ${dir - 6} 92 L ${esq + 6} 92 Q ${esq} 92 ${esq} 86 Z`

  return (
    <g>
      {/* tampa */}
      <rect x="40" y={tampaY} width="20" height={tampaH} rx="2" fill={PLASTICO_ESCURO} />
      <rect x="40" y={tampaY + 2} width="20" height="1.6" fill="#ffffff" opacity="0.18" />
      <rect x="43" y={tampaY + tampaH} width="14" height="4" fill="#4c565f" />

      <path d={corpo} fill={gotas ? '#c69a55' : '#e7ecef'} />
      {gotas && (
        /* o líquido não chega até a boca: é o nível que faz o desenho parecer
           um frasco de verdade em vez de um bloco colorido */
        <path
          d={`M ${esq} 52 L ${dir} 52 L ${dir} 86 Q ${dir} 92 ${dir - 6} 92 L ${esq + 6} 92 Q ${esq} 92 ${esq} 86 Z`}
          fill={cor.forte}
          opacity="0.6"
        />
      )}
      <rect x={esq + 3} y={corpoTopo + 6} width="4" height="62" rx="2" fill="#ffffff" opacity={gotas ? 0.28 : 0.6} />

      {/* rótulo */}
      <rect x={rotuloX} y={rotuloY} width={rotuloL} height={rotuloH} rx="1.5" fill={PAPEL} />
      <rect x={rotuloX} y={rotuloY} width={rotuloL} height={cabecalhoH} fill={cor.forte} />
      {tarja && <Tarja x={rotuloX} y={rotuloY + cabecalhoH + 1} largura={rotuloL} cor={tarja} />}
      <LinhasDeTexto
        x={rotuloX}
        y={rotuloY + cabecalhoH + (tarja ? 10 : 5)}
        largura={rotuloL}
        etiqueta={etiqueta}
        dose={produto.generico ? null : produto.dose}
      />
      {produto.generico && (
        <FaixaGenerico x={rotuloX} y={rotuloY + rotuloH - 11} largura={rotuloL} altura={10} />
      )}
    </g>
  )
}

function Bisnaga({ cor, produto, etiqueta }) {
  const tarja = CORES_TARJA[produto.classeControlada]
  return (
    <g>
      <rect x="42" y="5" width="16" height="13" rx="2" fill={cor.forte} />
      <rect x="42" y="7" width="16" height="1.6" fill="#ffffff" opacity="0.25" />
      <path d="M 42 18 L 58 18 L 69 31 L 31 31 Z" fill={PAPEL_SOMBRA} />
      <rect x="31" y="31" width="38" height="53" rx="2" fill={PAPEL} />
      <rect x="31" y="35" width="38" height="15" fill={cor.forte} />
      {tarja && <Tarja x={31} y={52} largura={38} cor={tarja} />}
      <LinhasDeTexto
        x={31}
        y={tarja ? 61 : 56}
        largura={38}
        etiqueta={etiqueta}
        dose={produto.generico ? null : produto.dose}
      />
      {produto.generico && <FaixaGenerico x={31} y={70} largura={38} altura={10} />}

      {/* dobra prensada do fundo — é o que diferencia bisnaga de frasco */}
      <rect x="31" y="84" width="38" height="9" fill={PAPEL_SOMBRA} />
      <g stroke="#a9b6bf" strokeWidth="1.2">
        <path d="M 34 84 L 34 93 M 39 84 L 39 93 M 44 84 L 44 93 M 49 84 L 49 93 M 54 84 L 54 93 M 59 84 L 59 93 M 64 84 L 64 93" />
      </g>
      <rect x="33" y="31" width="4" height="53" rx="2" fill={PAPEL_LUZ} opacity="0.5" />
    </g>
  )
}

function Tubo({ cor, produto, etiqueta }) {
  const tarja = CORES_TARJA[produto.classeControlada]
  return (
    <g>
      <rect x="35" y="7" width="30" height="13" rx="3" fill={cor.forte} />
      <ellipse cx="50" cy="7" rx="15" ry="3.5" fill={cor.claro} />
      <rect x="35" y="20" width="30" height="72" rx="3" fill={PAPEL} />
      <rect x="35" y="34" width="30" height="18" fill={cor.forte} />
      {tarja && <Tarja x={35} y={54} largura={30} cor={tarja} />}
      <LinhasDeTexto
        x={35}
        y={tarja ? 63 : 58}
        largura={30}
        etiqueta={etiqueta}
        dose={produto.generico ? null : produto.dose}
      />
      {produto.generico && <FaixaGenerico x={35} y={72} largura={30} altura={10} />}
      <rect x="37" y="20" width="4" height="72" rx="2" fill={PAPEL_LUZ} opacity="0.55" />
      <ellipse cx="50" cy="92" rx="15" ry="3" fill={PAPEL_SOMBRA} />
    </g>
  )
}

function Xampu({ cor, produto, etiqueta }) {
  const tarja = CORES_TARJA[produto.classeControlada]
  return (
    <g>
      <rect x="41" y="5" width="18" height="9" rx="2" fill={PLASTICO_ESCURO} />
      <path
        d="M 28 34 Q 28 18 42 15 L 58 15 Q 72 18 72 34 L 72 86 Q 72 93 65 93 L 35 93 Q 28 93 28 86 Z"
        fill={cor.claro}
      />
      <path d="M 28 34 Q 28 18 42 15 L 46 15 Q 34 20 34 36 L 34 93 L 35 93 Q 28 93 28 86 Z" fill="#ffffff" opacity="0.3" />
      <rect x="31" y="40" width="38" height="40" rx="2" fill={PAPEL} />
      <rect x="31" y="40" width="38" height="11" fill={cor.forte} />
      {tarja && <Tarja x={31} y={52} largura={38} cor={tarja} />}
      <LinhasDeTexto
        x={31}
        y={tarja ? 61 : 56}
        largura={38}
        etiqueta={etiqueta}
        dose={produto.generico ? null : produto.dose}
      />
      {produto.generico && <FaixaGenerico x={31} y={69} largura={38} altura={10} />}
    </g>
  )
}

function CarimboVencido() {
  return (
    <g transform="rotate(-16 50 58)" opacity="0.92">
      <rect x="10" y="46" width="80" height="24" rx="3" fill="none" stroke="#e13b30" strokeWidth="3" />
      <text
        x="50"
        y="63"
        fontSize="15"
        fontWeight="800"
        letterSpacing="1.5"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fill="#e13b30"
        textAnchor="middle"
      >
        VENCIDO
      </text>
    </g>
  )
}

// `etiqueta` só é usada nos tamanhos grandes; na miniatura o nome do produto
// já está escrito ao lado, e texto de 3px vira sujeira.
function etiquetaCurta(produto) {
  const bruto = produto.marca ?? labelPrincipio(produto.principioAtivo)
  const texto = bruto.charAt(0).toUpperCase() + bruto.slice(1)
  return texto.length > 13 ? `${texto.slice(0, 12)}.` : texto
}

export default function Embalagem({ produto, tamanho = 46, vencido = false, comTexto = false, className = '' }) {
  const cor = corDoProduto(produto)
  const formato = FORMATO_POR_APRESENTACAO[produto.apresentacao] ?? 'caixa'
  const etiqueta = comTexto ? etiquetaCurta(produto) : null
  const props = { cor, produto, etiqueta }

  return (
    <span className={`embalagem ${className}`} style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Embalagem de ${produto.nome}`}>
        <ellipse cx="50" cy="94" rx="30" ry="4.5" fill="#000000" opacity="0.28" />
        {formato === 'caixa' && <Caixa {...props} />}
        {formato === 'frasco' && <Frasco {...props} />}
        {formato === 'conta-gotas' && <Frasco {...props} gotas />}
        {formato === 'bisnaga' && <Bisnaga {...props} />}
        {formato === 'tubo' && <Tubo {...props} />}
        {formato === 'xampu' && <Xampu {...props} />}
        {vencido && <CarimboVencido />}
      </svg>
    </span>
  )
}
