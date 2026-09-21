import { motion, AnimatePresence } from 'framer-motion'
import { PERGUNTAS, getPergunta } from '../game/anamnese.js'
import './Anamnese.css'

// Painel de entrevista, sempre visível durante o atendimento (fica ao lado da
// prateleira). Cada pergunta só pode ser feita uma vez e custa paciência do
// cliente — por isso o custo aparece no botão: a escolha de perguntar ou
// arriscar é o centro do jogo, e o preço dela não pode ficar escondido.
export default function Anamnese({ customer, onPerguntar }) {
  const disponiveis = PERGUNTAS.filter((p) => !customer.perguntasFeitas.includes(p.id))
  // total já gasto com este cliente — o preço acumulado precisa estar à vista,
  // senão cada pergunta parece barata isoladamente.
  const gastoMs = customer.perguntasFeitas.reduce((total, id) => total + (getPergunta(id)?.custoMs ?? 0), 0)

  return (
    <section className="anamnese">
      <h3 className="anamnese__titulo">
        <span>Anamnese</span>
        {gastoMs > 0 && <span className="anamnese__gasto">−{Math.round(gastoMs / 1000)}s de paciência</span>}
      </h3>

      {disponiveis.length > 0 ? (
        <div className="anamnese__perguntas">
          {disponiveis.map((pergunta) => (
            <button
              key={pergunta.id}
              type="button"
              className="anamnese__pergunta"
              onClick={() => onPerguntar(pergunta.id)}
            >
              <span className="anamnese__pergunta-texto">{pergunta.label}</span>
              <span className="anamnese__pergunta-custo">−{Math.round(pergunta.custoMs / 1000)}s</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="anamnese__vazio">Você já perguntou tudo que dava.</p>
      )}

      <div className="anamnese__respostas">
        <AnimatePresence initial={false}>
          {customer.anamnese.map((entrada) => (
            <motion.div
              key={entrada.perguntaId}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="anamnese__resposta"
            >
              <span className="anamnese__resposta-pergunta">{entrada.label}</span>
              <span className="anamnese__resposta-texto">“{entrada.resposta}”</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {customer.anamnese.length === 0 && (
          <p className="anamnese__dica">
            Você ainda não sabe nada sobre este cliente além do que ele disse. Pergunte antes de decidir.
          </p>
        )}
      </div>
    </section>
  )
}
