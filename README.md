# Balcão Rápido

Simulador de atendimento de balcão de farmácia, estilo time-management (Diner
Dash / Overcooked, em ritmo mais calmo, com turnos por dia). React + Vite +
JavaScript puro (sem TypeScript), CSS simples por componente, framer-motion
para transições. Interface e textos em português do Brasil.

**Os princípios ativos são reais** (nomes genéricos comuns no Brasil — dipirona,
paracetamol, ibuprofeno, loratadina etc.), mas as regras de contraindicação,
interação e classe controlada usadas no jogo são **simplificadas para fins de
gameplay**, não uma bula. O jogo não deve ser lido como orientação médica —
ver aviso na tela inicial e na tela de ajuda.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # valida os 10 turnos (ver abaixo)
npm run build
```

## O loop

Um cliente entra na fila com um pedido (produto, sintoma ou receita de 1-3
itens) e uma barra de paciência que esvazia em tempo real. O jogador clica no
cliente, navega pela prateleira (por categoria) até achar o produto certo,
confere os dados relevantes do produto e do cliente na tela de confirmação, e
decide **entregar** ou **recusar**. O turno passa se a reputação final atingir
a meta; falha se a reputação zerar ou a fila estourar o limite visível.

## Arquitetura

Mesma filosofia do projeto irmão `numero-proibido`: engine puro e testável,
desacoplado da UI; regras como funções-fábrica puras; conteúdo validado por
script antes de ir para produção. Principal diferença: aqui o jogo é em tempo
real (fila com múltiplos clientes e paciência), não por turnos discretos — a
engine ganha um `tick(state, deltaMs)` além do `attemptServe(...)`, mas
continua sem tocar DOM/timers diretamente.

- **`src/game/engine.js`** — estado puro do turno (fila, timers, reputação) +
  transições: `createShiftState`, `tick`, `startService`, `cancelService`,
  `attemptServe`, `resolveDistraction`. Toda função retorna um novo estado
  (nunca muta) e um evento (ou array de eventos, no caso de `tick`) para a UI
  reagir com som/feedback.
- **`src/game/rules.js`** — catálogo de 6 regras de erro (receita obrigatória,
  controlado sem retenção, contraindicação, interação medicamentosa, produto
  vencido, produto errado) como fábricas puras `make() => instance`, sempre
  todas ativas — o jogo não esconde regras (ver tela de Ajuda no jogo); a
  dificuldade vem de checar várias ao mesmo tempo sob pressão de tempo.
- **`src/game/products.js`** — catálogo estático de ~20 produtos com princípios
  ativos reais (nomes genéricos), mas contraindicações/interações simplificadas
  para o jogo (ver comentário no topo do arquivo).
- **`src/game/shifts.js`** — os 10 turnos, escritos à mão (não gerados — ver
  comentário no arquivo sobre por quê).
- **`src/game/shiftValidator.js` + `scripts/validateShifts.mjs`** — em vez de
  testes unitários, simula um "jogador razoável" dirigindo as funções reais da
  engine para confirmar que cada turno é vencível com folga, a fila nunca
  estoura sob jogo ideal, e as 6 regras são exercitadas em algum turno. Rode
  `npm run validate` sempre que mexer em `shifts.js` ou `products.js`.
- **`src/hooks/useGameClock.js`** — único lugar com `requestAnimationFrame`;
  chama `engine.tick` a cada frame enquanto o turno está ativo.
- **`src/components/`** — Fila, CardCliente, Prateleira, PainelAtendimento,
  ConfirmacaoEntrega, FeedbackAtendimento, DistracaoOverlay, HUD, Screens
  (telas de início/seleção/resultado/ajuda).

## Fora de escopo (nesta versão)

Sem gestão financeira/estoque de longo prazo, sem multiplayer, sem conteúdo
médico real.
