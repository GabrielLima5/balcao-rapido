import { AnimatePresence, motion } from 'framer-motion'
import { Moedas } from './Recompensas.jsx'
import './FeedbackAtendimento.css'

const POSITIVE_TYPES = new Set(['serve_success', 'serve_item_success', 'refuse_correct'])

const TITLES = {
  serve_success: 'Venda concluída!',
  serve_item_success: 'Item entregue!',
  serve_error: 'Atendimento incorreto',
  refuse_correct: 'Recusa correta',
  refuse_incorrect: 'Recusa incorreta',
}

export default function FeedbackAtendimento({ feedback }) {
  return (
    <div className="feedback-atendimento-wrap">
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.key}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`feedback-atendimento ${
              feedback.variante === 'alerta'
                ? 'feedback-atendimento--alerta'
                : POSITIVE_TYPES.has(feedback.type)
                  ? 'feedback-atendimento--positivo'
                  : 'feedback-atendimento--negativo'
            }`}
          >
            <strong>
              {TITLES[feedback.type] ?? 'Atendimento'}
              {feedback.variante === 'alerta' && ' — no escuro'}
            </strong>
            {(feedback.moedas > 0 || feedback.combo >= 2 || feedback.comboQuebrado) && (
              <span className="feedback-atendimento__recompensas">
                {feedback.moedas > 0 && (
                  <span className="feedback-atendimento__chip">
                    +<Moedas valor={feedback.moedas} tamanho="pequeno" />
                  </span>
                )}
                {feedback.combo >= 2 && (
                  <span className="feedback-atendimento__chip feedback-atendimento__chip--combo">🔥 Combo x{feedback.combo}</span>
                )}
                {feedback.comboQuebrado && (
                  <span className="feedback-atendimento__chip feedback-atendimento__chip--quebrado">Combo perdido</span>
                )}
              </span>
            )}
            {feedback.messages?.length > 0 && (
              <ul>
                {feedback.messages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
