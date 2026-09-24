import { AnimatePresence, motion } from 'framer-motion'
import { patienceRatio } from '../game/engine.js'
import Avatar from './Avatar.jsx'
import './CardCliente.css'

const HUMOR_LABEL = {
  neutro: 'Tranquilo',
  apressado: 'Com pressa',
  estressado: 'Irritado',
}

export default function CardCliente({ customer, onClick, isActive, custoPergunta }) {
  const ratio = patienceRatio(customer)
  const nivel = ratio < 0.3 ? 'baixa' : ratio < 0.6 ? 'media' : 'alta'
  const segundosRestantes = Math.max(0, Math.ceil(customer.patienceMs / 1000))

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
        <Avatar customer={customer} tamanho={46} />

        <span className="card-cliente__identificacao">
          <span className="card-cliente__nome">{customer.nome}</span>
          <span className="card-cliente__humor">
            {customer.idade} anos · {HUMOR_LABEL[customer.humor] ?? HUMOR_LABEL.neutro}
          </span>
        </span>

        {/* o preço da pergunta salta do cartão de quem pagou por ela: sem isso
            a dedução some dentro da barra e a anamnese parece de graça. */}
        <AnimatePresence>
          {custoPergunta && (
            <motion.span
              key={custoPergunta.key}
              className="card-cliente__custo"
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            >
              −{Math.round(custoPergunta.custoMs / 1000)}s
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className="card-cliente__balao">
        {customer.request.mensagem}
        {customer.request.type === 'receita' && customer.itensPendentes?.length > 1 ? (
          <span className="card-cliente__receita-badge">receita · {customer.itensPendentes.length} itens</span>
        ) : null}
      </p>

      <div className="card-cliente__rodape">
        <div className="card-cliente__paciencia">
          <div
            className={`card-cliente__paciencia-preenchimento card-cliente__paciencia-preenchimento--${nivel}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className={`card-cliente__segundos card-cliente__segundos--${nivel}`}>{segundosRestantes}s</span>
      </div>
    </motion.button>
  )
}
