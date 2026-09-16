import { useMemo, useState } from 'react'
import { CATEGORIAS, getProductById } from '../game/products.js'
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
            <span className="prateleira__item-nome">{item.rotulo}</span>
            <span className="prateleira__item-principio">{item.produto.principioAtivo}</span>
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
          </button>
        ))}
      </div>
    </div>
  )
}
