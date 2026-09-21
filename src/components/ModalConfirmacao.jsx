import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './ModalConfirmacao.css'

// Modal de confirmação do próprio jogo — nada de window.confirm, que trava a
// aba, não combina com o visual e não dá para estilizar. Quem abre é
// responsável por pausar o que precisa ser pausado (ver App.jsx: o relógio do
// turno para enquanto este modal está aberto).
//
// Fecha por Esc, por clique no fundo e pelo botão de cancelar — em qualquer um
// deles o resultado é NÃO confirmar, que é sempre a opção segura.
export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
}) {
  const cancelarRef = useRef(null)

  // Esc cancela. O listener só existe enquanto o modal está aberto.
  useEffect(() => {
    if (!aberto) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancelar()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aberto, onCancelar])

  // o foco começa no botão seguro, não no destrutivo
  useEffect(() => {
    if (aberto) cancelarRef.current?.focus()
  }, [aberto])

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="modal-confirmacao"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancelar}
        >
          <motion.div
            className="modal-confirmacao__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-confirmacao-titulo"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            // sem isto, o clique dentro do card borbulharia até o fundo e cancelaria
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-confirmacao__titulo" id="modal-confirmacao-titulo">
              {titulo}
            </h2>
            {mensagem && <p className="modal-confirmacao__mensagem">{mensagem}</p>}

            <div className="modal-confirmacao__acoes">
              <button
                type="button"
                ref={cancelarRef}
                className="modal-confirmacao__botao modal-confirmacao__botao--cancelar"
                onClick={onCancelar}
              >
                {textoCancelar}
              </button>
              <button
                type="button"
                className="modal-confirmacao__botao modal-confirmacao__botao--confirmar"
                onClick={onConfirmar}
              >
                {textoConfirmar}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
