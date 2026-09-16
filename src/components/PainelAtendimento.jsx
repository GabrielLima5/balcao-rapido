import { motion, AnimatePresence } from 'framer-motion'
import Prateleira from './Prateleira.jsx'
import ConfirmacaoEntrega from './ConfirmacaoEntrega.jsx'
import './PainelAtendimento.css'

export default function PainelAtendimento({
  shift,
  customer,
  step,
  selectedItem,
  onSelecionarItem,
  onVoltarPrateleira,
  onEntregar,
  onRecusar,
  onCancelar,
}) {
  return (
    <motion.div
      className="painel-atendimento"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
    >
      <div className="painel-atendimento__topo">
        <div>
          <h2 className="painel-atendimento__titulo">Atendendo {customer.nome}</h2>
          <p className="painel-atendimento__pedido">“{customer.request.mensagem}”</p>
        </div>
        <button type="button" className="painel-atendimento__cancelar" onClick={onCancelar}>
          Cancelar atendimento
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 'prateleira' ? (
          <motion.div
            key="prateleira"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="painel-atendimento__conteudo"
          >
            <Prateleira shift={shift} onSelecionarItem={onSelecionarItem} />
          </motion.div>
        ) : (
          <motion.div
            key="confirmacao"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="painel-atendimento__conteudo"
          >
            <ConfirmacaoEntrega
              item={selectedItem}
              customer={customer}
              onEntregar={onEntregar}
              onRecusar={onRecusar}
              onVoltar={onVoltarPrateleira}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
