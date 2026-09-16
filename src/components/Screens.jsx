import { motion } from 'framer-motion'
import { RULE_FACTORIES } from '../game/rules.js'
import { summarize } from '../game/engine.js'
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

export function TelaInicio({ onJogar, onComoJogar }) {
  return (
    <Overlay className="overlay__card--intro">
      <p className="overlay__eyebrow">Balcão Rápido</p>
      <h1 className="overlay__titulo">Bem-vindo ao seu plantão</h1>
      <p className="overlay__texto">
        Você é o atendente de uma farmácia. Clientes chegam com pedidos — um produto, um
        sintoma ou uma receita — e você precisa entender o que eles precisam, achar o item
        certo na prateleira e checar se está tudo em ordem antes de entregar. Tudo isso com
        o relógio correndo e mais gente entrando na fila.
      </p>
      <p className="overlay__texto overlay__texto--muted">
        Os princípios ativos citados aqui são reais (nomes genéricos), mas as regras de
        contraindicação, interação e controle deste jogo são simplificadas para fins de jogo.
        Isto não é orientação médica — siga sempre a bula e o que um farmacêutico ou médico
        de verdade indicar.
      </p>
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

export function TelaResultadoTurno({ shift, shiftState, onTentarNovamente, onProximo, onTurnos, temProximo }) {
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
      </p>

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
          <span className="resultado-turno__numero">{resumo.score}</span>
          <span className="resultado-turno__label">pontos</span>
        </div>
      </div>

      {shiftState.log.some((e) => e.type === 'serve_error') && (
        <div className="resultado-turno__erros">
          <h3>O que deu errado</h3>
          <ul>
            {shiftState.log
              .filter((e) => e.type === 'serve_error')
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
        <h2 className="overlay__titulo">Regras do atendimento</h2>
      </div>
      <p className="overlay__texto overlay__texto--muted">
        Estas regras estão sempre ativas em todos os turnos. A dificuldade não vem de
        esconder regras — vem de checar todas elas, para vários clientes, com o tempo
        correndo.
      </p>
      <ul className="ajuda__lista">
        {regras.map((regra) => (
          <li key={regra.id}>{regra.describe()}</li>
        ))}
      </ul>
      <p className="overlay__texto overlay__texto--muted">
        Os princípios ativos são reais, mas quais tags contraindicam qual produto e quais
        princípios ativos "interagem" entre si foram simplificados para o jogo — não é uma
        lista farmacológica completa nem substitui a bula ou orientação profissional.
      </p>
      <button type="button" className="overlay__botao overlay__botao--primario" onClick={onFechar}>
        Entendi
      </button>
    </Overlay>
  )
}
