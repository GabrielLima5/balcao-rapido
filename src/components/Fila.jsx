import { AnimatePresence } from 'framer-motion'
import CardCliente from './CardCliente.jsx'
import './Fila.css'

export default function Fila({ queue, activeCustomerId, maxQueueVisible, onSelecionar }) {
  return (
    <div className="fila">
      <div className="fila__topo">
        <h2 className="fila__titulo">Fila</h2>
        <span className="fila__contagem">
          {queue.length}/{maxQueueVisible}
        </span>
      </div>
      <div className="fila__cartoes">
        <AnimatePresence>
          {queue.map((customer) => (
            <CardCliente
              key={customer.id}
              customer={customer}
              isActive={customer.id === activeCustomerId}
              onClick={onSelecionar}
            />
          ))}
        </AnimatePresence>
        {queue.length === 0 && <p className="fila__vazia">Nenhum cliente esperando.</p>}
      </div>
    </div>
  )
}
