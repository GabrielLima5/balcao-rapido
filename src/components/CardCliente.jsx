import { motion } from 'framer-motion'
import { patienceRatio } from '../game/engine.js'
import './CardCliente.css'

const HUMOR_ICONS = {
  neutro: '🙂',
  apressado: '⏱️',
  estressado: '😤',
}

export default function CardCliente({ customer, onClick, isActive }) {
  const ratio = patienceRatio(customer)
  const nivel = ratio < 0.3 ? 'baixa' : ratio < 0.6 ? 'media' : 'alta'

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`card-cliente ${isActive ? 'card-cliente--ativo' : ''}`}
      onClick={() => onClick(customer.id)}
    >
      <div className="card-cliente__topo">
        <span className="card-cliente__humor" aria-hidden="true">
          {HUMOR_ICONS[customer.humor] ?? '🙂'}
        </span>
        <span className="card-cliente__nome">{customer.nome}</span>
      </div>

      <p className="card-cliente__balao">
        {customer.request.mensagem}
        {customer.request.type === 'receita' && customer.itensPendentes?.length > 1 ? (
          <span className="card-cliente__receita-badge">receita · {customer.itensPendentes.length} itens</span>
        ) : null}
      </p>

      <div className="card-cliente__paciencia">
        <div
          className={`card-cliente__paciencia-preenchimento card-cliente__paciencia-preenchimento--${nivel}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </motion.button>
  )
}
