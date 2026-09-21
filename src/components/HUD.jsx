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
  onAjuda,
  onPausar,
  onSair,
}) {
  const ratio = Math.min(1, reputation / Math.max(reputationTarget, 1))
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
          <span>{reputation}</span>
        </div>
        <div className="hud__reputacao-barra">
          <div
            className={`hud__reputacao-preenchimento hud__reputacao-preenchimento--${nivel}`}
            style={{ width: `${ratio * 100}%` }}
          />
          <div className="hud__reputacao-meta" style={{ left: `${Math.min(100, (reputationTarget / REPUTATION_MAX) * 100)}%` }} />
        </div>
      </div>

      <div className="hud__score">
        <span className="hud__score-label">Pontos</span>
        <span className="hud__score-valor">{score}</span>
      </div>

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
