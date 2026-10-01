import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from './Avatar.jsx'
import Anamnese from './Anamnese.jsx'
import Prateleira from './Prateleira.jsx'
import ConfirmacaoEntrega from './ConfirmacaoEntrega.jsx'
import './PainelAtendimento.css'

export default function PainelAtendimento({
  shift,
  customer,
  step,
  selectedItem,
  onSelecionarItem,
  onPerguntar,
  onVoltarPrateleira,
  onEntregar,
  onRecusar,
  onCancelar,
}) {
  const painelRef = useRef(null)

  // no responsivo a prateleira fica embaixo da entrevista: ao escolher um
  // remédio o jogador está lá no fim, e a ficha abriria fora da vista.
  // Volta para o começo do painel, onde estão o cliente e o botão de entregar.
  useEffect(() => {
    if (step !== 'confirmacao' || !window.matchMedia('(max-width: 900px)').matches) return
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    painelRef.current?.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'start' })
  }, [step])

  return (
    <motion.div
      ref={painelRef}
      className="painel-atendimento"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
    >
      <div className="painel-atendimento__topo">
        {/* o cliente em tamanho grande: quem está sendo atendido precisa estar
            presente na tela, não só citado no título */}
        <Avatar customer={customer} tamanho={64} className="painel-atendimento__avatar" />
        <div className="painel-atendimento__cliente">
          <h2 className="painel-atendimento__titulo">Atendendo {customer.nome}</h2>
          <p className="painel-atendimento__pedido">{customer.request.mensagem}</p>
        </div>
        <button
          type="button"
          className="painel-atendimento__cancelar painel-atendimento__cancelar--topo"
          onClick={onCancelar}
        >
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
            className="painel-atendimento__conteudo painel-atendimento__conteudo--balcao"
          >
            {/* entrevista e prateleira lado a lado de propósito: perguntar não é
                uma etapa antes de escolher, é uma decisão que compete com ela
                pelo mesmo tempo. */}
            <Anamnese customer={customer} onPerguntar={onPerguntar} />
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

      {/* no celular o botão sai do topo (onde espremia o nome e o pedido) e vai
          para o fim do painel, junto das outras ações */}
      <button
        type="button"
        className="painel-atendimento__cancelar painel-atendimento__cancelar--rodape"
        onClick={onCancelar}
      >
        Cancelar atendimento
      </button>
    </motion.div>
  )
}
