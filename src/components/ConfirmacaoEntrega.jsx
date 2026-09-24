import { useState } from 'react'
import { motion } from 'framer-motion'
import { ALERGIA_LABEL, APRESENTACAO_LABEL, PUBLICO_LABEL, TAGS, labelPrincipio, labelPrincipios } from '../game/products.js'
import { TAG_LABEL } from '../game/rules.js'
import { jaPerguntou } from '../game/anamnese.js'
import Avatar from './Avatar.jsx'
import Embalagem from './Embalagem.jsx'
import './ConfirmacaoEntrega.css'

const CATEGORIA_CONTROLADA_LABEL = {
  nenhuma: 'Nenhuma',
  tarja_vermelha: 'Tarja vermelha',
  tarja_preta: 'Tarja preta',
}

// Campo da ficha do paciente. O que não foi perguntado não aparece — e o vazio
// é explícito, porque decidir sem saber precisa PARECER decidir sem saber.
function CampoPerguntado({ rotulo, revelado, children }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      {revelado ? <dd>{children}</dd> : <dd className="confirmacao__oculto">não perguntado</dd>}
    </div>
  )
}

export default function ConfirmacaoEntrega({ item, customer, onEntregar, onRecusar, onVoltar }) {
  const [receitaRetida, setReceitaRetida] = useState(false)
  const [orientacaoDada, setOrientacaoDada] = useState(false)
  const { produto } = item
  // não é só tarja preta/vermelha: receita de antimicrobiano também fica retida
  const precisaRetencao = produto.retencaoDeReceita
  // o checkbox aparece sempre que o PRODUTO tem cautela, mesmo que este paciente
  // não se encaixe nela: quem decide se a cautela se aplica é o jogador, não a UI
  const temCautela = produto.cautelas.length > 0 || produto.cautelasInteracao.length > 0
  const paciente = customer.paciente
  const composicaoDeAssociacao = produto.composicao.length > 1

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

          {/* Aqui — e só aqui — a embalagem mostra a validade. É o momento em
              que o jogador tem a caixa na mão: o carimbo é a etiqueta que ele
              deveria ter virado para ler antes de entregar. */}
          <div className="confirmacao__produto">
            <Embalagem
              produto={produto}
              tamanho={132}
              comTexto
              vencido={item.validadeStatus === 'vencido'}
            />
            <span className="confirmacao__produto-rotulo">{item.rotulo}</span>
          </div>

          <dl className="confirmacao__lista">
            <div>
              <dt>Nome</dt>
              <dd>{item.rotulo}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>
                {produto.generico
                  ? 'Genérico'
                  : produto.marca
                    ? `Referência (${produto.marca})`
                    : 'Sem marca'}
              </dd>
            </div>
            <div>
              <dt>{composicaoDeAssociacao ? 'Composição' : 'Princípio ativo'}</dt>
              <dd className="confirmacao__capitalize">{produto.composicao.map(labelPrincipio).join(' + ')}</dd>
            </div>
            <div>
              <dt>Classe terapêutica</dt>
              <dd className="confirmacao__classe">{produto.classeTerapeutica}</dd>
            </div>
            <div>
              <dt>Dose</dt>
              <dd>{produto.dose}</dd>
            </div>
            <div>
              <dt>Apresentação</dt>
              <dd>
                {APRESENTACAO_LABEL[produto.apresentacao] ?? produto.apresentacao} ·{' '}
                {PUBLICO_LABEL[produto.publicoAlvo]}
              </dd>
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
              <dt>Receita retida?</dt>
              <dd className={produto.retencaoDeReceita ? 'confirmacao__atencao' : ''}>
                {produto.retencaoDeReceita ? 'Sim' : 'Não'}
              </dd>
            </div>
            <div>
              <dt>Classe alergênica</dt>
              <dd>
                {produto.classeAlergenica
                  ? (ALERGIA_LABEL[produto.classeAlergenica] ?? produto.classeAlergenica)
                  : 'Nenhuma'}
              </dd>
            </div>
            <div>
              <dt>Contraindicações</dt>
              <dd className={produto.contraindicacoes.length ? 'confirmacao__atencao' : ''}>
                {produto.contraindicacoes.length
                  ? produto.contraindicacoes.map((t) => TAG_LABEL[t] ?? t).join(', ')
                  : 'Nenhuma registrada'}
              </dd>
            </div>
            <div>
              <dt>Interage com</dt>
              <dd className={produto.interacoes.length ? 'confirmacao__alerta' : ''}>
                {produto.interacoes.length ? labelPrincipios(produto.interacoes) : 'Nada registrado'}
              </dd>
            </div>
            <div>
              <dt>Exige cautela</dt>
              <dd className={temCautela ? 'confirmacao__atencao' : ''}>
                {temCautela
                  ? [
                      ...produto.cautelas.map((t) => TAG_LABEL[t] ?? t),
                      ...produto.cautelasInteracao.map(labelPrincipio),
                    ].join(', ')
                  : 'Nada registrado'}
              </dd>
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
          <h3 className="confirmacao__titulo confirmacao__titulo--cliente">
            <Avatar customer={customer} tamanho={38} />
            No balcão — {customer.nome}
          </h3>
          <dl className="confirmacao__lista">
            <div>
              <dt>Pedido</dt>
              <dd>“{customer.request.mensagem}”</dd>
            </div>
            <div>
              <dt>Idade do cliente</dt>
              <dd>{customer.idade} anos</dd>
            </div>

            <CampoPerguntado rotulo="Quem vai tomar" revelado={jaPerguntou(customer, 'paciente')}>
              {paciente.relacao === 'proprio'
                ? `O próprio cliente (${paciente.idade} anos)`
                : `${paciente.descricao} (${paciente.idade} anos)`}
            </CampoPerguntado>

            <CampoPerguntado rotulo="Condições" revelado={jaPerguntou(customer, 'condicoes')}>
              {paciente.tags.length ? paciente.tags.map((t) => TAGS[t] ?? t).join(', ') : 'Nenhuma'}
            </CampoPerguntado>

            <CampoPerguntado rotulo="Já toma" revelado={jaPerguntou(customer, 'medicamentos')}>
              <span className="confirmacao__capitalize">
                {paciente.jaTomaPrincipiosAtivos.length
                  ? labelPrincipios(paciente.jaTomaPrincipiosAtivos)
                  : 'Nada'}
              </span>
            </CampoPerguntado>

            <CampoPerguntado rotulo="Alergias" revelado={jaPerguntou(customer, 'alergias')}>
              <span className={paciente.alergias.length ? 'confirmacao__alerta' : ''}>
                {paciente.alergias.length
                  ? paciente.alergias.map((a) => ALERGIA_LABEL[a] ?? a).join(', ')
                  : 'Nenhuma'}
              </span>
            </CampoPerguntado>

            <CampoPerguntado rotulo="Quadro clínico" revelado={jaPerguntou(customer, 'detalhes')}>
              {customer.request.quadro ?? 'Nada além da queixa.'}
            </CampoPerguntado>

            <CampoPerguntado rotulo="Apresentou receita?" revelado={jaPerguntou(customer, 'receita')}>
              {customer.hasReceita ? 'Sim' : 'Não'}
            </CampoPerguntado>
          </dl>
        </section>
      </div>

      <div className="confirmacao__condutas">
        {precisaRetencao && (
          <label className="confirmacao__checkbox">
            <input type="checkbox" checked={receitaRetida} onChange={(e) => setReceitaRetida(e.target.checked)} />
            Reter a receita do cliente
          </label>
        )}
        {temCautela && (
          <label className="confirmacao__checkbox confirmacao__checkbox--cautela">
            <input
              type="checkbox"
              checked={orientacaoDada}
              onChange={(e) => setOrientacaoDada(e.target.checked)}
            />
            Orientar o paciente sobre a cautela
          </label>
        )}
      </div>

      <div className="confirmacao__acoes">
        <button type="button" className="confirmacao__botao confirmacao__botao--secundario" onClick={onVoltar}>
          Voltar ao balcão
        </button>
        <button
          type="button"
          className="confirmacao__botao confirmacao__botao--recusar"
          onClick={() => onRecusar({ receitaRetida, orientacaoDada })}
        >
          Recusar
        </button>
        <button
          type="button"
          className="confirmacao__botao confirmacao__botao--entregar"
          onClick={() => onEntregar({ receitaRetida, orientacaoDada })}
        >
          Entregar
        </button>
      </div>
    </motion.div>
  )
}
