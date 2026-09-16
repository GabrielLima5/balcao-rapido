import { AnimatePresence, motion } from 'framer-motion'
import './DistracaoOverlay.css'

const TITLES = {
  telefone: '📞 O telefone está tocando',
  troco: '💰 O cliente diz que o troco está errado',
}

export default function DistracaoOverlay({ distraction, onResolver }) {
  return (
    <div className="distracao-wrap">
      <AnimatePresence>
        {distraction && (
          <motion.div
            key={distraction.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="distracao"
          >
            <strong>{TITLES[distraction.tipo] ?? 'Distração'}</strong>

            {distraction.tipo === 'telefone' ? (
              <div className="distracao__acoes">
                <button type="button" onClick={() => onResolver(distraction.id, null)}>
                  Atender e desligar
                </button>
              </div>
            ) : (
              <div className="distracao__acoes distracao__acoes--coluna">
                <p className="distracao__pergunta">Qual é o troco correto?</p>
                {distraction.options.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => onResolver(distraction.id, opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
