import { useMemo, useState } from 'react'
import { CATEGORIAS, getProductById, labelPrincipio } from '../game/products.js'
import Embalagem from './Embalagem.jsx'
import './Prateleira.css'

const LOTE_LETRAS = ['A', 'B', 'C', 'D']

// Quando o mesmo produto aparece mais de uma vez no estoque do turno (lotes
// diferentes), rotula como "Lote A" / "Lote B" — sem indicar validade aqui;
// isso só é revelado na confirmação, para forçar o jogador a checar.
function useEstoqueRotulado(estoque) {
  return useMemo(() => {
    const contagem = {}
    return estoque.map((item) => {
      contagem[item.produtoId] = (contagem[item.produtoId] ?? -1) + 1
      const indice = contagem[item.produtoId]
      const totalDoProduto = estoque.filter((e) => e.produtoId === item.produtoId).length
      const produto = getProductById(item.produtoId)
      const rotulo = totalDoProduto > 1 ? `${produto.nome} — Lote ${LOTE_LETRAS[indice] ?? indice + 1}` : produto.nome
      return { ...item, produto, rotulo }
    })
  }, [estoque])
}

export default function Prateleira({ shift, onSelecionarItem }) {
  const categoriasDisponiveis = CATEGORIAS.filter((c) => shift.unlockedCategories.includes(c.id))
  const [categoriaAtiva, setCategoriaAtiva] = useState(categoriasDisponiveis[0]?.id)
  const estoqueRotulado = useEstoqueRotulado(shift.estoque)

  const itensDaCategoria = estoqueRotulado.filter((item) => item.produto.categoria === categoriaAtiva)

  return (
    <div className="prateleira">
      <div className="prateleira__abas">
        {categoriasDisponiveis.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={`prateleira__aba ${categoriaAtiva === categoria.id ? 'prateleira__aba--ativa' : ''}`}
            onClick={() => setCategoriaAtiva(categoria.id)}
          >
            {categoria.nome}
          </button>
        ))}
      </div>

      <div className="prateleira__grade">
        {itensDaCategoria.map((item) => (
          <button
            key={item.id}
            type="button"
            className="prateleira__item"
            onClick={() => onSelecionarItem(item)}
          >
            {/* a embalagem NÃO recebe `vencido`: dois lotes do mesmo produto
                têm que ser idênticos aqui — a validade só aparece na
                confirmação, que é onde o jogador precisa lembrar de conferir */}
            <Embalagem produto={item.produto} tamanho={58} className="prateleira__item-embalagem" />

            <span className="prateleira__item-info">
              <span className="prateleira__item-nome">{item.rotulo}</span>
              <span className="prateleira__item-principio">
                {item.produto.composicao.map(labelPrincipio).join(' + ')}
                {/* a dose fica fora do capitalize: "500mg/mL" não pode virar "500mg/ML" */}
                <span className="prateleira__item-dose"> · {item.produto.dose}</span>
              </span>
              {/* a classe é o que permite escolher dentro da mesma gôndola: sem
                  ela, antiespasmódico e antiflatulento são duas caixas iguais */}
              <span className="prateleira__item-classe">{item.produto.classeTerapeutica}</span>
              <span className="prateleira__item-tags">
                {item.produto.generico && (
                  <span className="prateleira__item-tag prateleira__item-tag--generico">genérico</span>
                )}
                {item.produto.publicoAlvo === 'pediatrico' && (
                  <span className="prateleira__item-tag prateleira__item-tag--infantil">infantil</span>
                )}
                {item.produto.exigeReceita && <span className="prateleira__item-tag">receita</span>}
                {item.produto.classeControlada !== 'nenhuma' && (
                  <span
                    className={`prateleira__item-tag prateleira__item-tag--controlado-${
                      item.produto.classeControlada === 'tarja_preta' ? 'preta' : 'vermelha'
                    }`}
                  >
                    {item.produto.classeControlada === 'tarja_preta' ? 'tarja preta' : 'tarja vermelha'}
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
