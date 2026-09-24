import { AnimatePresence, motion } from 'framer-motion'
import { Mascote, Moedas } from './Recompensas.jsx'
import './HUD.css'

const REPUTATION_MAX = 100

function formatClock(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function HUD({
  shift,
  remainingSeconds,
  reputation,
  reputationTarget,
  score,
  combo = 0,
  moedas = 0,
  perfil,
  reacaoMascote,
  onAjuda,
  onPausar,
  onSair,
}) {
  // preenchimento e marcador da meta usam a mesma escala (0..REPUTATION_MAX),
  // senão a barra "cheia" não bate com a posição da marquinha da meta.
  const ratio = Math.min(1, reputation / REPUTATION_MAX)
  const metaRatio = Math.min(1, reputationTarget / REPUTATION_MAX)
  const nivel = reputation < reputationTarget * 0.5 ? 'baixa' : reputation < reputationTarget ? 'media' : 'alta'
  const urgente = remainingSeconds <= 20

  return (
    <div className="hud">
      <div className="hud__turno">
        <span className="hud__turno-nome">{shift.nome}</span>
        <span className="hud__turno-meta">Meta de reputação: {shift.reputationTarget}</span>
      </div>

      <div className={`hud__tempo ${urgente ? 'hud__tempo--urgente' : ''}`}>
        <span className="hud__tempo-label">Tempo</span>
        <span className="hud__tempo-valor">{formatClock(remainingSeconds)}</span>
      </div>

      <div className="hud__reputacao">
        <div className="hud__reputacao-topo">
          <span>Reputação</span>
          <span>
            {reputation} <span className="hud__reputacao-max">/ {REPUTATION_MAX}</span>
          </span>
        </div>
        <div className="hud__reputacao-barra">
          <div
            className={`hud__reputacao-preenchimento hud__reputacao-preenchimento--${nivel}`}
            style={{ width: `${ratio * 100}%` }}
          />
          <div
            className="hud__reputacao-meta"
            style={{ left: `${metaRatio * 100}%` }}
            title={`Meta do turno: ${reputationTarget}`}
          />
        </div>
      </div>

      <div className="hud__score">
        <span className="hud__score-label">Pontos</span>
        <span className="hud__score-valor">{score}</span>
      </div>

      {/* combo só aparece a partir de 2 — um acerto sozinho ainda não é sequência */}
      <div className="hud__combo-slot">
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div
              key={combo}
              className={`hud__combo ${combo >= 5 ? 'hud__combo--quente' : ''}`}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <span className="hud__combo-fogo">🔥</span>
              <span className="hud__combo-valor">x{combo}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hud__moedas" title="Gorjetas deste turno">
        <span className="hud__score-label">Gorjetas</span>
        <motion.span key={moedas} initial={{ scale: 1.35 }} animate={{ scale: 1 }}>
          <Moedas valor={moedas} />
        </motion.span>
      </div>

      {perfil && <Mascote perfil={perfil} reacao={reacaoMascote} />}

      <div className="hud__acoes">
        <button type="button" className="hud__botao" onClick={onAjuda}>
          Ajuda
        </button>
        <button type="button" className="hud__botao" onClick={onPausar}>
          Pausar
        </button>
        <button type="button" className="hud__botao hud__botao--sair" onClick={onSair}>
          Sair do turno
        </button>
      </div>
    </div>
  )
}
