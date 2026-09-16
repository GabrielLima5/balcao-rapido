import { useState } from 'react'
import { motion } from 'framer-motion'
import { TAGS } from '../game/products.js'
import './ConfirmacaoEntrega.css'

const CATEGORIA_CONTROLADA_LABEL = {
  nenhuma: 'Nenhuma',
  tarja_vermelha: 'Tarja vermelha',
  tarja_preta: 'Tarja preta',
}

export default function ConfirmacaoEntrega({ item, customer, onEntregar, onRecusar, onVoltar }) {
  const [receitaRetida, setReceitaRetida] = useState(false)
  const { produto } = item
  const precisaRetencao = produto.classeControlada !== 'nenhuma'

  return (
    <motion.div
      className="confirmacao"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <div className="confirmacao__colunas">
        <section className="confirmacao__coluna">
          <h3 className="confirmacao__titulo">Produto selecionado</h3>
          <dl className="confirmacao__lista">
            <div>
              <dt>Nome</dt>
              <dd>{item.rotulo}</dd>
            </div>
            <div>
              <dt>Princípio ativo</dt>
              <dd className="confirmacao__capitalize">{produto.principioAtivo}</dd>
            </div>
            <div>
              <dt>Exige receita?</dt>
              <dd>{produto.exigeReceita ? 'Sim' : 'Não'}</dd>
            </div>
            <div>
              <dt>Classe controlada</dt>
              <dd>{CATEGORIA_CONTROLADA_LABEL[produto.classeControlada]}</dd>
            </div>
            <div>
              <dt>Validade do lote</dt>
              <dd className={item.validadeStatus === 'vencido' ? 'confirmacao__alerta' : ''}>
                {item.validadeStatus === 'vencido' ? 'VENCIDO' : 'Dentro da validade'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="confirmacao__coluna">
          <h3 className="confirmacao__titulo">Cliente — {customer.nome}</h3>
          <dl className="confirmacao__lista">
            <div>
              <dt>Idade</dt>
              <dd>{customer.idade} anos</dd>
            </div>
            <div>
              <dt>Condições</dt>
              <dd>{customer.tags.length ? customer.tags.map((t) => TAGS[t] ?? t).join(', ') : 'Nenhuma informada'}</dd>
            </div>
            <div>
              <dt>Já toma</dt>
              <dd className="confirmacao__capitalize">
                {customer.jaTomaPrincipiosAtivos.length ? customer.jaTomaPrincipiosAtivos.join(', ') : 'Nada informado'}
              </dd>
            </div>
            <div>
              <dt>Apresentou receita?</dt>
              <dd>{customer.hasReceita ? 'Sim' : 'Não'}</dd>
            </div>
            <div>
              <dt>Pedido original</dt>
              <dd>“{customer.request.mensagem}”</dd>
            </div>
          </dl>
        </section>
      </div>

      {precisaRetencao && (
        <label className="confirmacao__checkbox">
          <input type="checkbox" checked={receitaRetida} onChange={(e) => setReceitaRetida(e.target.checked)} />
          Reter a receita do cliente
        </label>
      )}

      <div className="confirmacao__acoes">
        <button type="button" className="confirmacao__botao confirmacao__botao--secundario" onClick={onVoltar}>
          Voltar à prateleira
        </button>
        <button
          type="button"
          className="confirmacao__botao confirmacao__botao--recusar"
          onClick={() => onRecusar({ receitaRetida })}
        >
          Recusar
        </button>
        <button
          type="button"
          className="confirmacao__botao confirmacao__botao--entregar"
          onClick={() => onEntregar({ receitaRetida })}
        >
          Entregar
        </button>
      </div>
    </motion.div>
  )
}
