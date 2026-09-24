import { AnimatePresence, motion } from 'framer-motion'
import {
  BAUS_ESTRELAS,
  CONQUISTAS,
  CRITERIOS_ESTRELAS,
  ITENS_LOJA,
  PRESENTES_DIARIOS,
  bauDisponivel,
  diaDoCiclo,
  getItemLoja,
  nivelDoXp,
  presenteDisponivel,
  sequenciaAoResgatar,
  totalEstrelas,
} from '../game/rewards.js'
import { Overlay } from './Screens.jsx'
import './Recompensas.css'

const formatar = (n) => n.toLocaleString('pt-BR')

export function Moedas({ valor, tamanho = 'normal' }) {
  return (
    <span className={`moedas moedas--${tamanho}`}>
      <span className="moedas__icone" aria-hidden="true" />
      {formatar(valor)}
    </span>
  )
}

export function Estrelas({ quantidade, total = 3, animar = false, tamanho = 'normal' }) {
  return (
    <span className={`estrelas estrelas--${tamanho}`} aria-label={`${quantidade} de ${total} estrelas`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className={`estrelas__item ${i < quantidade ? 'estrelas__item--cheia' : ''}`}
          initial={animar ? { scale: 0, rotate: -40 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: animar ? 0.35 + i * 0.28 : 0, type: 'spring', stiffness: 420, damping: 14 }}
        >
          ★
        </motion.span>
      ))}
    </span>
  )
}

export function BarraNivel({ xp }) {
  const nivel = nivelDoXp(xp)
  return (
    <div className="barra-nivel">
      <div className="barra-nivel__topo">
        <span className="barra-nivel__selo">Nv. {nivel.nivel}</span>
        <span className="barra-nivel__titulo">{nivel.titulo}</span>
        <span className="barra-nivel__xp">
          {nivel.proximo ? `${formatar(xp - nivel.xp)} / ${formatar(nivel.proximo.xp - nivel.xp)} XP` : 'nível máximo'}
        </span>
      </div>
      <div className="barra-nivel__trilho">
        <motion.div
          className="barra-nivel__preenchimento"
          initial={false}
          animate={{ width: `${nivel.progresso * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function PerfilResumo({ perfil, progress }) {
  const mascote = getItemLoja(perfil.loja.mascote)
  const conquistadas = Object.keys(perfil.conquistas).length
  return (
    <div className="perfil-resumo">
      {mascote?.emoji && <span className="perfil-resumo__mascote">{mascote.emoji}</span>}
      <BarraNivel xp={perfil.xp} />
      <div className="perfil-resumo__numeros">
        <Moedas valor={perfil.moedas} />
        <span className="perfil-resumo__chip">
          <span className="perfil-resumo__estrela">★</span> {totalEstrelas(progress)} / 45
        </span>
        <span className="perfil-resumo__chip">
          🏆 {conquistadas} / {CONQUISTAS.length}
        </span>
      </div>
    </div>
  )
}

// --- mascote no HUD ------------------------------------------------------------

const ANIMACOES_MASCOTE = {
  feliz: { y: [0, -14, 0, -6, 0], rotate: [0, -8, 8, 0, 0] },
  triste: { x: [0, -5, 5, -4, 4, 0], rotate: [0, -4, 4, 0] },
  festa: { y: [0, -18, 0], scale: [1, 1.3, 1], rotate: [0, 360] },
}

export function Mascote({ perfil, reacao }) {
  const mascote = getItemLoja(perfil.loja.mascote)
  if (!mascote?.emoji) return null
  return (
    <motion.span
      key={reacao?.key ?? 'parado'}
      className="mascote"
      title={mascote.nome}
      animate={reacao ? ANIMACOES_MASCOTE[reacao.tipo] : { y: [0, -2, 0] }}
      transition={reacao ? { duration: 0.7 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {mascote.emoji}
    </motion.span>
  )
}

// --- toasts de conquista -------------------------------------------------------

export function ToastsConquista({ toasts }) {
  return (
    <div className="toasts-conquista">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.key}
            className="toast-conquista"
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          >
            <span className="toast-conquista__icone">{t.icone}</span>
            <span className="toast-conquista__texto">
              <span className="toast-conquista__eyebrow">{t.eyebrow}</span>
              <strong>{t.titulo}</strong>
            </span>
            {t.moedas > 0 && <Moedas valor={t.moedas} tamanho="pequeno" />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// --- relatório do fim do turno -------------------------------------------------

export function RelatorioRecompensas({ relatorio, venceu }) {
  if (!relatorio) return null
  const subiu = relatorio.nivelDepois.nivel > relatorio.nivelAntes.nivel
  return (
    <div className="relatorio">
      <div className="relatorio__estrelas">
        <Estrelas quantidade={relatorio.estrelas} animar tamanho="grande" />
        <ul className="relatorio__criterios">
          {CRITERIOS_ESTRELAS.map((c, i) => (
            <li key={c} className={i < relatorio.estrelas ? 'relatorio__criterio--ok' : ''}>
              {i < relatorio.estrelas ? '★' : '☆'} {c}
            </li>
          ))}
        </ul>
      </div>

      {!venceu && (
        <p className="relatorio__dica">Conclua o turno para ganhar estrelas — as gorjetas e o XP ficam com você mesmo assim.</p>
      )}

      <div className="relatorio__colunas">
        <div className="relatorio__moedas">
          <h3>Moedas ganhas</h3>
          {relatorio.moedas.length === 0 ? (
            <p className="relatorio__vazio">Nenhuma desta vez.</p>
          ) : (
            <ul>
              {relatorio.moedas.map((m, i) => (
                <motion.li
                  key={m.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + i * 0.12 }}
                >
                  <span>{m.label}</span>
                  <Moedas valor={m.valor} tamanho="pequeno" />
                </motion.li>
              ))}
              <li className="relatorio__total">
                <span>Total</span>
                <Moedas valor={relatorio.totalMoedas} />
              </li>
            </ul>
          )}
        </div>

        <div className="relatorio__xp">
          <h3>Experiência</h3>
          <p className="relatorio__xp-ganho">+{formatar(relatorio.xpGanho)} XP</p>
          {subiu && (
            <motion.p
              className="relatorio__nivel-novo"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.4, type: 'spring', stiffness: 300, damping: 12 }}
            >
              ⬆ Nível {relatorio.nivelDepois.nivel}: {relatorio.nivelDepois.titulo}!
            </motion.p>
          )}
        </div>
      </div>

      {relatorio.conquistas.length > 0 && (
        <div className="relatorio__conquistas">
          {relatorio.conquistas.map((c, i) => (
            <motion.span
              key={c.id}
              className="relatorio__conquista"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.6 + i * 0.15, type: 'spring', stiffness: 400, damping: 15 }}
            >
              {c.icone} {c.nome}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  )
}

// --- tela de conquistas + baús ---------------------------------------------------

export function TelaConquistas({ perfil, progress, onAbrirBau, onVoltar }) {
  const estrelas = totalEstrelas(progress)
  const ctx = { perfil, progress }
  return (
    <Overlay className="overlay__card--largo">
      <div className="overlay__topo-com-voltar">
        <button type="button" className="overlay__link" onClick={onVoltar}>
          ← Voltar
        </button>
        <h2 className="overlay__titulo">Conquistas</h2>
        <span className="recompensas__cabecalho-extra">
          <Moedas valor={perfil.moedas} />
        </span>
      </div>

      <h3 className="recompensas__subtitulo">Baús de estrelas · você tem ★ {estrelas}</h3>
      <div className="baus">
        {BAUS_ESTRELAS.map((bau) => {
          const aberto = perfil.baus.abertos.includes(bau.estrelas)
          const disponivel = bauDisponivel(perfil, progress, bau)
          return (
            <motion.button
              key={bau.estrelas}
              type="button"
              className={`bau ${aberto ? 'bau--aberto' : ''} ${disponivel ? 'bau--disponivel' : ''}`}
              disabled={!disponivel}
              onClick={() => onAbrirBau(bau)}
              animate={disponivel ? { rotate: [0, -4, 4, -4, 0] } : {}}
              transition={disponivel ? { duration: 0.6, repeat: Infinity, repeatDelay: 1.4 } : {}}
            >
              <span className="bau__icone">{aberto ? '📭' : disponivel ? '🎁' : '🔒'}</span>
              <span className="bau__meta">★ {bau.estrelas}</span>
              <Moedas valor={bau.moedas} tamanho="pequeno" />
              {bau.desbloqueia && <span className="bau__extra">+ tema {getItemLoja(bau.desbloqueia).nome}</span>}
              {disponivel && <span className="bau__abrir">Abrir!</span>}
            </motion.button>
          )
        })}
      </div>

      <h3 className="recompensas__subtitulo">
        Conquistas · {Object.keys(perfil.conquistas).length} de {CONQUISTAS.length}
      </h3>
      <div className="conquistas">
        {CONQUISTAS.map((c) => {
          const ganha = Boolean(perfil.conquistas[c.id])
          const progresso = !ganha && c.progresso ? c.progresso(ctx) : null
          return (
            <div key={c.id} className={`conquista ${ganha ? 'conquista--ganha' : ''}`}>
              <span className="conquista__icone">{c.icone}</span>
              <span className="conquista__texto">
                <strong>{c.nome}</strong>
                <span>{c.descricao}</span>
                {progresso && (
                  <span className="conquista__progresso">
                    <span
                      className="conquista__progresso-barra"
                      style={{ width: `${Math.min(100, (progresso[0] / progresso[1]) * 100)}%` }}
                    />
                    <span className="conquista__progresso-texto">
                      {Math.min(progresso[0], progresso[1])} / {progresso[1]}
                    </span>
                  </span>
                )}
              </span>
              <span className="conquista__premio">{ganha ? '✔' : <Moedas valor={c.moedas} tamanho="pequeno" />}</span>
            </div>
          )
        })}
      </div>
    </Overlay>
  )
}

// --- loja ------------------------------------------------------------------------

function ItemLoja({ item, perfil, onComprar, onEquipar }) {
  const comprado = perfil.loja.comprados.includes(item.id)
  const equipado = perfil.loja.tema === item.id || perfil.loja.mascote === item.id
  const exclusivo = item.preco == null
  const podeComprar = !comprado && !exclusivo && perfil.moedas >= item.preco

  let acao
  if (equipado) acao = <span className="item-loja__status">Em uso</span>
  else if (comprado)
    acao = (
      <button type="button" className="item-loja__botao" onClick={() => onEquipar(item.id)}>
        Usar
      </button>
    )
  else if (exclusivo) acao = <span className="item-loja__status">🔒 Exclusivo</span>
  else
    acao = (
      <button
        type="button"
        className="item-loja__botao item-loja__botao--comprar"
        disabled={!podeComprar}
        onClick={() => onComprar(item.id)}
      >
        <Moedas valor={item.preco} tamanho="pequeno" />
      </button>
    )

  return (
    <div className={`item-loja ${equipado ? 'item-loja--equipado' : ''}`}>
      <span className="item-loja__visual" style={item.tipo === 'tema' ? { background: item.cor } : undefined}>
        {item.tipo === 'mascote' ? item.emoji || '∅' : ''}
      </span>
      <strong className="item-loja__nome">{item.nome}</strong>
      <span className="item-loja__descricao">{item.descricao}</span>
      {acao}
    </div>
  )
}

export function TelaLoja({ perfil, onComprar, onEquipar, onVoltar }) {
  const grupos = [
    { tipo: 'tema', titulo: 'Temas do balcão' },
    { tipo: 'mascote', titulo: 'Mascotes' },
  ]
  return (
    <Overlay className="overlay__card--largo">
      <div className="overlay__topo-com-voltar">
        <button type="button" className="overlay__link" onClick={onVoltar}>
          ← Voltar
        </button>
        <h2 className="overlay__titulo">Loja</h2>
        <span className="recompensas__cabecalho-extra">
          <Moedas valor={perfil.moedas} />
        </span>
      </div>
      <p className="overlay__texto overlay__texto--muted">
        Tudo aqui é cosmético: nenhum item muda as regras ou facilita o atendimento. O mascote fica no
        balcão durante o turno e torce por você.
      </p>
      {grupos.map((g) => (
        <div key={g.tipo}>
          <h3 className="recompensas__subtitulo">{g.titulo}</h3>
          <div className="loja">
            {ITENS_LOJA.filter((i) => i.tipo === g.tipo).map((item) => (
              <ItemLoja key={item.id} item={item} perfil={perfil} onComprar={onComprar} onEquipar={onEquipar} />
            ))}
          </div>
        </div>
      ))}
    </Overlay>
  )
}

// --- presente diário ----------------------------------------------------------------

export function PresenteDiario({ perfil, hoje, onResgatar, onFechar }) {
  const disponivel = presenteDisponivel(perfil, hoje)
  const sequencia = sequenciaAoResgatar(perfil, hoje)
  const diaHoje = diaDoCiclo(sequencia)
  return (
    <Overlay className="overlay__card--presente">
      <p className="overlay__eyebrow">Presente diário</p>
      <h2 className="overlay__titulo">
        {disponivel ? 'Seu presente de hoje chegou!' : 'Presente de hoje já resgatado'}
      </h2>
      <p className="overlay__texto overlay__texto--muted">
        Volte todo dia para manter a sequência — o 7º dia vale um baú. Se pular um dia, a sequência
        recomeça.
      </p>
      <div className="presente__dias">
        {PRESENTES_DIARIOS.map((valor, i) => {
          const resgatado = disponivel ? i < diaHoje : i <= diaHoje
          const ehHoje = i === diaHoje
          return (
            <div
              key={i}
              className={`presente__dia ${resgatado ? 'presente__dia--resgatado' : ''} ${
                ehHoje && disponivel ? 'presente__dia--hoje' : ''
              } ${i === PRESENTES_DIARIOS.length - 1 ? 'presente__dia--grande' : ''}`}
            >
              <span className="presente__dia-label">Dia {i + 1}</span>
              <span className="presente__dia-icone">
                {resgatado ? '✔' : i === PRESENTES_DIARIOS.length - 1 ? '🎁' : '🪙'}
              </span>
              <Moedas valor={valor} tamanho="pequeno" />
            </div>
          )
        })}
      </div>
      <div className="overlay__acoes">
        <button type="button" className="overlay__botao overlay__botao--secundario" onClick={onFechar}>
          {disponivel ? 'Depois' : 'Fechar'}
        </button>
        {disponivel && (
          <button type="button" className="overlay__botao overlay__botao--primario" onClick={onResgatar}>
            Resgatar {formatar(PRESENTES_DIARIOS[diaHoje])} moedas
          </button>
        )}
      </div>
    </Overlay>
  )
}
