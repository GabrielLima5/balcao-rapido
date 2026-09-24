import { motion } from 'framer-motion'
import { AVISO_MARCAS } from '../game/products.js'
import { RULE_FACTORIES } from '../game/rules.js'
import { summarize } from '../game/engine.js'
import { totalEstrelas } from '../game/rewards.js'
import { Estrelas, PerfilResumo, RelatorioRecompensas } from './Recompensas.jsx'
import './Screens.css'

export function Overlay({ children, className = '' }) {
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`overlay__card ${className}`}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// Porta de entrada: o aviso não é um parágrafo que se pula, é um passo. Só se
// sai dele confirmando, e o aceite fica gravado (ver storage.js) para não virar
// atrito a cada partida. É a diferença entre "estava escrito lá" e "a pessoa
// leu antes de aprender qualquer coisa errada".
export function TelaAviso({ onAceitar }) {
  return (
    <Overlay className="overlay__card--intro">
      <p className="overlay__eyebrow">Antes de começar</p>
      <h1 className="overlay__titulo">Isto é um jogo, não uma bula</h1>

      <p className="overlay__texto">
        O <strong>catálogo</strong> deste jogo é real: os medicamentos, os princípios ativos, as
        apresentações e as concentrações existem e foram conferidos. As <strong>regras</strong> de
        atendimento, não — elas foram simplificadas para caber numa partida de dois minutos.
      </p>
      <p className="overlay__texto">
        Na prática isso significa que uma contraindicação daqui pode ser, na vida real, apenas uma
        cautela; que um limite de idade pode ser mais nuançado; e que nenhuma decisão do jogo
        substitui a bula, o protocolo do serviço ou o julgamento de um farmacêutico. Se você estuda
        Farmácia: use este jogo para treinar o raciocínio do atendimento, nunca como fonte para
        prova ou para balcão.
      </p>

      <p className="overlay__aviso">{AVISO_MARCAS}</p>

      <div className="overlay__acoes">
        <button type="button" className="overlay__botao overlay__botao--primario" onClick={onAceitar}>
          Li e entendi
        </button>
      </div>
    </Overlay>
  )
}

export function TelaInicio({
  perfil,
  progress,
  presenteHoje,
  bausDisponiveis,
  onJogar,
  onComoJogar,
  onConquistas,
  onLoja,
  onPresente,
}) {
  return (
    <Overlay className="overlay__card--intro">
      <p className="overlay__eyebrow">Balcão Rápido</p>
      <h1 className="overlay__titulo">Bem-vindo ao seu plantão</h1>
      <PerfilResumo perfil={perfil} progress={progress} />
      <div className="menu-recompensas">
        <button type="button" className="menu-recompensas__botao" onClick={onPresente}>
          {presenteHoje && <span className="menu-recompensas__badge">!</span>}
          <span className="menu-recompensas__icone">🎁</span>
          Presente diário
        </button>
        <button type="button" className="menu-recompensas__botao" onClick={onConquistas}>
          {bausDisponiveis > 0 && <span className="menu-recompensas__badge">{bausDisponiveis}</span>}
          <span className="menu-recompensas__icone">🏆</span>
          Conquistas
        </button>
        <button type="button" className="menu-recompensas__botao" onClick={onLoja}>
          <span className="menu-recompensas__icone">🛍️</span>
          Loja
        </button>
      </div>
      <p className="overlay__texto">
        Você é o atendente de uma farmácia. Clientes chegam com pedidos — um produto, um
        genérico, um sintoma ou uma receita — e quase nunca contam de cara o que importa:
        se estão grávidas, o que já tomam, para quem é o remédio. Cabe a você{' '}
        <strong>perguntar</strong>, achar o item certo na prateleira e decidir entregar ou
        recusar. Tudo com o relógio correndo e mais gente entrando na fila.
      </p>
      <p className="overlay__aviso">{AVISO_MARCAS}</p>
      <div className="overlay__acoes">
        <button type="button" className="overlay__botao overlay__botao--secundario" onClick={onComoJogar}>
          Como jogar
        </button>
        <button type="button" className="overlay__botao overlay__botao--primario" onClick={onJogar}>
          Ver turnos
        </button>
      </div>
    </Overlay>
  )
}

export function SelecaoTurno({ shifts, progress, onSelecionar, onVoltar }) {
  return (
    <Overlay className="overlay__card--selecao">
      <div className="overlay__topo-com-voltar">
        <button type="button" className="overlay__link" onClick={onVoltar}>
          ← Início
        </button>
        <h2 className="overlay__titulo">Turnos</h2>
        <span className="selecao-turno__total">
          <span className="selecao-turno__total-estrela">★</span> {totalEstrelas(progress)} / {shifts.length * 3}
        </span>
      </div>
      <div className="selecao-turno__grade">
        {shifts.map((shift, index) => {
          const bloqueado = index > progress.unlockedIndex
          const resultado = progress.results[index]
          return (
            <button
              key={shift.id}
              type="button"
              className={`selecao-turno__item ${bloqueado ? 'selecao-turno__item--bloqueado' : ''}`}
              disabled={bloqueado}
              onClick={() => onSelecionar(index)}
            >
              <span className="selecao-turno__numero">Turno {index + 1}</span>
              <span className="selecao-turno__nome">{bloqueado ? '???' : shift.nome}</span>
              {!bloqueado && <span className="selecao-turno__dificuldade">{shift.dificuldade}</span>}
              {!bloqueado && <span className="selecao-turno__resumo">{shift.resumo}</span>}
              {!bloqueado && (
                <span className="selecao-turno__estrelas">
                  <Estrelas quantidade={resultado?.estrelas ?? 0} tamanho="pequeno" />
                </span>
              )}
              {resultado && (
                <span className={`selecao-turno__resultado ${resultado.won ? 'selecao-turno__resultado--ok' : ''}`}>
                  {resultado.won ? `Concluído · ${resultado.score} pts` : 'Ainda não concluído'}
                </span>
              )}
              {bloqueado && <span className="selecao-turno__cadeado">🔒</span>}
            </button>
          )
        })}
      </div>
    </Overlay>
  )
}

export function TelaResultadoTurno({ shift, shiftState, relatorio, onTentarNovamente, onProximo, onTurnos, temProximo }) {
  const resumo = summarize(shiftState)
  const passou = resumo.status === 'won'

  return (
    <Overlay className="overlay__card--resultado">
      <p className="overlay__eyebrow">{shift.nome}</p>
      <h2 className={`overlay__titulo ${passou ? 'overlay__titulo--sucesso' : 'overlay__titulo--falha'}`}>
        {passou ? 'Turno concluído!' : 'Turno não concluído'}
      </h2>
      <p className="overlay__texto">
        Reputação final: <strong>{resumo.reputation}</strong> (meta: {resumo.reputationTarget})
        {resumo.maxCombo >= 2 && (
          <>
            {' '}
            · Maior combo: <strong>🔥 {resumo.maxCombo}</strong>
          </>
        )}
      </p>

      <RelatorioRecompensas relatorio={relatorio} venceu={passou} />

      <div className="resultado-turno__grade">
        <div>
          <span className="resultado-turno__numero">{resumo.successes}</span>
          <span className="resultado-turno__label">vendas certas</span>
        </div>
        <div>
          <span className="resultado-turno__numero">{resumo.refusedCorrect}</span>
          <span className="resultado-turno__label">recusas certas</span>
        </div>
        <div>
          <span className="resultado-turno__numero">{resumo.errors}</span>
          <span className="resultado-turno__label">erros de venda</span>
        </div>
        <div>
          <span className="resultado-turno__numero">{resumo.refusedIncorrect}</span>
          <span className="resultado-turno__label">recusas erradas</span>
        </div>
        <div>
          <span className="resultado-turno__numero">{resumo.lost}</span>
          <span className="resultado-turno__label">foram embora</span>
        </div>
        <div>
          <span
            className={`resultado-turno__numero ${
              resumo.acertosNoEscuro > 0 ? 'resultado-turno__numero--alerta' : ''
            }`}
          >
            {resumo.acertosNoEscuro}
          </span>
          <span className="resultado-turno__label">acertos no escuro</span>
        </div>
        <div>
          <span className="resultado-turno__numero">{resumo.score}</span>
          <span className="resultado-turno__label">pontos</span>
        </div>
      </div>

      {resumo.acertosNoEscuro > 0 && (
        <p className="overlay__texto overlay__texto--muted">
          “Acerto no escuro” é um atendimento que deu certo sem você ter perguntado o que precisava
          perguntar. Conta como acerto, mas não rende o bônus de anamnese — e, com outro cliente, o
          mesmo palpite teria dado errado.
        </p>
      )}

      {shiftState.log.some((e) => e.type === 'serve_error' || e.type === 'refuse_incorrect') && (
        <div className="resultado-turno__erros">
          <h3>O que deu errado</h3>
          <ul>
            {shiftState.log
              .filter((e) => e.type === 'serve_error' || e.type === 'refuse_incorrect')
              .map((e, i) => (
                <li key={i}>
                  <strong>{e.customerNome}:</strong> {e.violations.map((v) => v.message).join(' ')}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="overlay__acoes">
        <button type="button" className="overlay__botao overlay__botao--secundario" onClick={onTurnos}>
          Turnos
        </button>
        <button type="button" className="overlay__botao overlay__botao--secundario" onClick={onTentarNovamente}>
          Tentar novamente
        </button>
        {passou && temProximo && (
          <button type="button" className="overlay__botao overlay__botao--primario" onClick={onProximo}>
            Próximo turno
          </button>
        )}
      </div>
    </Overlay>
  )
}

export function TelaAjuda({ onFechar }) {
  const regras = Object.values(RULE_FACTORIES).map((factory) => factory())
  return (
    <Overlay className="overlay__card--ajuda">
      <div className="overlay__topo-com-voltar">
        <button type="button" className="overlay__link" onClick={onFechar}>
          ← Voltar
        </button>
        <h2 className="overlay__titulo">Como atender</h2>
      </div>

      <h3 className="ajuda__subtitulo">1. Pergunte antes de decidir</h3>
      <p className="overlay__texto overlay__texto--muted">
        A ficha do cliente começa em branco: condições de saúde, medicamentos de uso contínuo,
        para quem é o remédio e se há receita só aparecem depois que você <strong>pergunta</strong>.
        Cada pergunta consome alguns segundos da paciência daquele cliente, então perguntar tudo
        para todo mundo custa caro — e não perguntar é apostar. Decisões certas tomadas com a
        anamnese completa valem pontos extras.
      </p>

      <h3 className="ajuda__subtitulo">2. Entenda o pedido</h3>
      <p className="overlay__texto overlay__texto--muted">
        Na maioria das vezes o cliente descreve só o que <strong>sente</strong>, e cabe a você
        chegar no princípio ativo e na apresentação. Ele também pode pedir um produto pelo nome,
        pedir o <strong>genérico</strong> de uma marca (mesmo princípio ativo e mesma dose) ou
        trazer uma <strong>receita</strong> com até três itens. Quem pede a marca não aceita o
        genérico, e vice-versa. Quando a queixa for vaga, caracterize o quadro antes de escolher:
        “dor na barriga” pode ser gás, cólica ou azia, e cada uma pede outra coisa.
      </p>
      <p className="overlay__texto overlay__texto--muted">
        A aba da prateleira é <strong>gôndola, não classe</strong>: “Gastrointestinal” guarda
        antiácido, antiespasmódico, antiflatulento e antidiarreico lado a lado. Por isso cada caixa
        mostra a <strong>classe terapêutica</strong> embaixo do princípio ativo — é ela que diz o que
        aquele item faz, e é por ela que você escolhe.
      </p>

      <h3 className="ajuda__subtitulo">3. Existem três condutas, não duas</h3>
      <p className="overlay__texto overlay__texto--muted">
        A ficha do produto separa <strong>contraindicação</strong> de <strong>cautela</strong>, e a
        diferença entre as duas é o julgamento que se espera de você:
      </p>
      <ul className="ajuda__lista">
        <li>
          <strong>Nada restringe</strong> → entregue.
        </li>
        <li>
          <strong>Cautela</strong> (para a condição do paciente ou para algo que ele já toma) →
          entregue, mas marque <em>“Orientar o paciente sobre a cautela”</em>. Recusar aqui é deixar
          o cliente sem atendimento; entregar calado é dispensar no escuro.
        </li>
        <li>
          <strong>Contraindicação, interação, alergia ou sinal de alerta</strong> → não há venda
          possível, nem com orientação.
        </li>
      </ul>

      <h3 className="ajuda__subtitulo">4. Recusar é sobre o cliente, não sobre a caixa</h3>
      <p className="overlay__texto overlay__texto--muted">
        Recusar só é a decisão certa quando <strong>nada</strong> na prateleira pode ser entregue
        àquele cliente com segurança. Pegar um item errado — ou o lote vencido, tendo um lote bom ao
        lado — e recusar não resolve o problema de quem está no balcão, e conta como recusa
        indevida.
      </p>

      <h3 className="ajuda__subtitulo">5. Nem tudo é caso de farmácia</h3>
      <p className="overlay__texto overlay__texto--muted">
        Alguns quadros pedem <strong>encaminhamento médico</strong>, não medicamento de balcão:
        sintoma que dura semanas e piora, dor torácica que aperta ao esforço e irradia, sangramento,
        febre alta persistente, icterícia. Nesses casos recusar a venda <em>é</em> o bom
        atendimento — e você só descobre perguntando há quanto tempo e como é exatamente.
      </p>

      <h3 className="ajuda__subtitulo">Regras que bloqueiam a venda</h3>
      <p className="overlay__texto overlay__texto--muted">
        Estas regras estão sempre ativas em todos os turnos. A dificuldade não vem de esconder
        regras — vem de checar todas elas, para vários clientes, com o tempo correndo e com
        metade da informação dependendo de você perguntar.
      </p>
      <ul className="ajuda__lista">
        {regras.map((regra) => (
          <li key={regra.id}>{regra.describe()}</li>
        ))}
      </ul>
      <p className="overlay__aviso">{AVISO_MARCAS}</p>
      <button type="button" className="overlay__botao overlay__botao--primario" onClick={onFechar}>
        Entendi
      </button>
    </Overlay>
  )
}
