# Balcão Rápido

Simulador de atendimento de balcão de farmácia, estilo time-management (Diner
Dash / Overcooked, em ritmo mais calmo, com turnos por dia). React + Vite +
JavaScript puro (sem TypeScript), CSS simples por componente, framer-motion
para transições. Interface e textos em português do Brasil.

O público-alvo são estudantes de Farmácia: o jogo não é "leia a ficha e ache a
caixa", é **conduzir um atendimento** — entrevistar quem está no balcão,
descobrir o que muda a decisão e escolher entre dispensar e recusar.

## Os medicamentos são reais

Princípios ativos **e** nomes comerciais existem de verdade e são vendidos no
Brasil — Novalgina®, Tylenol®, Advil®, Alivium®, Aspirina®, Claritin®, Zyrtec®,
Polaramine®, Naldecon®, Losec®, Mylanta®, Buscopan®, Luftal®, Imosec®,
Pedialyte®, Vibral®, Fluimucil®, Mucosolvan®, Sorine®, Bepantol®, Canesten®,
Gyno-Daktarin®, Zovirax®, Nizoral®, CataflamPro®, Amoxil®, Aradois®, Marevan®,
Glifage®, Puran T4®, Valium® e Tylex®. Cada um foi conferido em bula ou
farmácia online antes de entrar no catálogo, junto com a apresentação e a
concentração. A ideia é que quem joga reconheça a caixa que vai encontrar no
balcão de verdade — e saiba o que tem dentro dela.

> **Aviso.** As marcas citadas são registradas de seus respectivos titulares.
> Este é um material educativo independente, sem vínculo, patrocínio ou
> aprovação das empresas detentoras dessas marcas.
>
> **As regras de atendimento usadas no jogo são SIMPLIFICADAS para caber numa
> partida de dois minutos e NÃO reproduzem a bula.** Ao contrário do catálogo,
> que é fiel à realidade, elas foram escolhidas por valor pedagógico. Não use
> este jogo como fonte de informação sobre nenhum medicamento real — consulte
> sempre a bula e um farmacêutico ou médico.
>
> O jogo **não deixa começar** sem passar por essa tela: `TelaAviso` bloqueia a
> entrada até o jogador confirmar, e o aceite fica em `storage.js`, numa chave
> própria, separada do progresso — resetar o progresso não deve fazer o aviso
> voltar, e vice-versa. O texto canônico das marcas vive em `AVISO_MARCAS`
> (`src/game/products.js`).

### Contraindicação não é cautela

A distinção mais importante do jogo para quem vai levá-lo a sério. Cada produto
tem **duas** forças de restrição, e confundi-las é justamente o erro que o jogo
quer desensinar:

| No catálogo | Significado | Conduta certa |
|---|---|---|
| `contraindicacoes` / `interacoes` | muro | recusar — não há venda possível |
| `cautelas` / `cautelasInteracao` | avaliação | entregar **marcando a orientação ao paciente** |

Recusar uma cautela conta como recusa indevida (havia como atender); entregar
uma cautela sem orientar conta como erro de dispensação. Na dúvida ao escrever
conteúdo novo, **escolha cautela**: o jogo erra menos dizendo "oriente" do que
dizendo "nunca" sobre um medicamento real. Buscopan® em idoso, Polaramine® na
gravidez e AINE sobre anti-hipertensivo são cautela; AAS em criança, codeína
abaixo de 12 anos, losartana na gravidez e AINE sobre anticoagulante são muro.

Ao acrescentar um produto: confira que ele existe, use o nome comercial com ®,
acerte apresentação/concentração, e acrescente a marca à lista de `AVISO_MARCAS`.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # valida os 15 turnos (ver abaixo)
npm run build
```

## O loop

Um cliente entra na fila com um pedido e uma barra de paciência que esvazia em
tempo real. O jogador clica no cliente e cai no **balcão**: à esquerda a
anamnese, à direita a prateleira.

1. **Pergunta.** A ficha do cliente começa em branco — para quem é o remédio,
   condições de saúde, medicamentos de uso contínuo, alergias, o quadro clínico
   detalhado e se há receita só aparecem depois de perguntar. Cada pergunta
   custa 3-5s da paciência daquele cliente (26s pelas seis), então perguntar
   tudo para todo mundo sai caro — e não perguntar é apostar. O preço aparece no
   botão antes do clique, salta do cartão do cliente como "−4s" na hora, e o
   acumulado fica no cabeçalho da anamnese.
2. **Escolhe** o item na prateleira (por categoria) e confere os dados do
   produto e do paciente na tela de confirmação.
3. **Decide** entregar ou recusar.

O turno passa se a reputação final atingir a meta; falha se a reputação zerar ou
a fila estourar o limite visível.

### Tipos de pedido

| Tipo | O que o cliente quer | O que exercita |
|---|---|---|
| `sintoma` | só a queixa ("meu filho está com febre") | chegar no princípio ativo e na apresentação |
| `produto` | um item pelo nome ("Tylenol® 750") | leitura fina de marca e dose |
| `generico` | o genérico de uma referência | intercambialidade: mesmo princípio ativo **e** mesma dose |
| `receita` | 1-3 itens prescritos | atender item a item, recusando só o que não pode sair |

### Por que aquele item não foi aceito

A categoria da prateleira é **gôndola, não classe**: "Gastrointestinal" guarda antiácido,
antiespasmódico, antiflatulento e antidiarreico juntos. Sem dizer qual é qual, uma recusa dentro da
mesma aba parece arbitrária. Duas peças resolvem isso:

- **`classeTerapeutica`** (derivada do princípio ativo em `products.js`) aparece em cada caixa da
  prateleira e na ficha — *antes* da escolha, que é onde ela serve para raciocinar.
- **`criterio`**, no pedido, é o raciocínio clínico em uma frase — *depois* do erro, explicando o que
  aquele quadro pedia e por quê.

Juntas, a recusa vira: *"Vibral® Xarope Adulto é antitussígeno. Tosse produtiva pede mucolítico ou
expectorante; antitussígeno segura a tosse e retém a secreção no pulmão."* — em vez do antigo e
inútil "não atende ao pedido ('tosse')".

Ao escrever um produto novo, confira a classe; ao escrever um sintoma novo, escreva o `criterio`.

**Invariante que a auditoria cobrou:** `findServableItem` devolve o *primeiro* item limpo na ordem
do estoque, então quando `principiosAceitos` mistura classes que **não** são intercambiáveis para
aquela queixa, a "resposta certa" do jogo vira arbitrária — e pode cair justamente sobre a classe que
o `criterio` diz não servir. Foi o que aconteceu com "nariz entupido e corpo doendo", que aceitava
paracetamol e entregava Tylenol® enquanto explicava que analgésico puro não desentope. Ao misturar
classes numa lista, garanta uma destas duas coisas: ou elas são de fato intercambiáveis para a
queixa, ou o `criterio` explica quando cair na segunda opção ("se o descongestionante estiver fora,
trate o que dá para tratar").

**`principiosAceitos` deve conter tudo que é clinicamente razoável para a queixa.** Quem exclui é a
regra de segurança, não a lista: assim uma Aspirina® oferecida a uma criança com febre é recusada
por *contraindicação* (síndrome de Reye), e não pelo inútil "não atende ao pedido". Estreite a lista
só quando a fala do cliente justificar ("só paracetamol funciona comigo").

Do turno 3 em diante `sintoma` é a norma e pedido por nome é exceção — reservado
para o que de fato se pede assim (uso conhecido, receita na mão, controlado) e
para exercitar intercambialidade. Um `sintoma` pode trazer `quadro`: o
detalhamento que só aparece se o jogador perguntar "como é exatamente, há quanto
tempo?", e que às vezes muda completamente a conduta.

### Três decisões que o jogo cobra

**Recusar é sobre o cliente, não sobre a caixa.** Uma recusa só conta como
correta quando *nada* na prateleira pode ser entregue àquele cliente sem violar
uma regra. Pegar um item obviamente errado — ou o lote vencido tendo um lote bom
ao lado — e recusar resolve o item na mão, mas não resolve o problema de quem
está no balcão: conta como recusa indevida. Isso é verificado por
`checkRefusalIntegrity` no validador, que tenta o exploit em todo cruzamento
cliente × item de todo turno.

**Acertar sem perguntar é sorte, não atendimento.** Decisões certas tomadas com
todas as perguntas relevantes feitas ganham um bônus de pontos; as tomadas no
escuro não perdem reputação, mas aparecem no resultado do turno como "acertos no
escuro".

**Nem tudo é caso de farmácia.** Alguns quadros pedem encaminhamento médico, não
medicamento de balcão — cefaleia de semanas com vômito matinal, dor torácica que
aperta ao esforço e irradia para o braço, diarreia com sangue e febre alta.
Nesses casos nenhum item da prateleira é entregável e recusar a venda *é* o bom
atendimento. O sinal de alerta nunca está na fala inicial do cliente: só sai se o
jogador caracterizar o quadro.

## Arquitetura

Mesma filosofia do projeto irmão `numero-proibido`: engine puro e testável,
desacoplado da UI; regras como funções-fábrica puras; conteúdo validado por
script antes de ir para produção. Principal diferença: aqui o jogo é em tempo
real (fila com múltiplos clientes e paciência), não por turnos discretos — a
engine ganha um `tick(state, deltaMs)` além do `attemptServe(...)`, mas
continua sem tocar DOM/timers diretamente.

- **`src/game/engine.js`** — estado puro do turno (fila, timers, reputação) +
  transições: `createShiftState`, `tick`, `startService`, `cancelService`,
  `askQuestion`, `attemptServe`, `resolveDistraction`. Toda função retorna um
  novo estado (nunca muta) e um evento (ou array de eventos, no caso de `tick`)
  para a UI reagir com som/feedback. `findServableItem` é o que define se uma
  recusa era cabível.
- **`src/game/anamnese.js`** — catálogo das 6 perguntas, as respostas (texto puro
  derivado dos dados do cliente) e `camposCriticos`, o gabarito de quais
  perguntas aquele atendimento realmente exigia.
- **`src/game/rules.js`** — catálogo de 11 regras de erro (receita obrigatória,
  receita não retida, contraindicação, **cautela sem orientação**, interação
  medicamentosa, duplicidade terapêutica, alergia medicamentosa, sinal de
  alerta/encaminhamento, faixa etária/apresentação, produto vencido, produto
  errado) como fábricas puras
  `make() => instance`, sempre todas ativas — o jogo não esconde regras (ver tela
  de Ajuda no jogo). As regras avaliam o **paciente** (`getPaciente`), que nem
  sempre é o cliente.
- **`src/game/products.js`** — catálogo estático de 49 produtos reais (31 marcas,
  33 princípios ativos, 9 categorias), carregando composição (para associações como Naldecon® e
  Tylex®), dose, apresentação, público-alvo, par genérico ↔ referência, classe
  alergênica (por família, para pegar reação cruzada) e se a receita fica retida.
  Retenção não é só tarja preta/vermelha: antimicrobiano também retém. Também
  mora aqui o `AVISO_MARCAS` exibido no jogo.
- **`src/game/shifts.js`** — os 15 turnos, escritos à mão (não gerados — ver
  comentário no arquivo sobre por quê, e a regra de ouro para escrever um
  cliente novo).
- **`src/game/shiftValidator.js` + `scripts/validateShifts.mjs`** — em vez de
  testes unitários, simula um "jogador razoável" dirigindo as funções reais da
  engine — incluindo a anamnese — para confirmar que cada turno é vencível com
  folga, que a fila nunca estoura sob jogo ideal, que perguntar cabe no
  orçamento de paciência, que as 8 regras são exercitadas em algum turno e que a
  recusa não pode ser burlada. Rode `npm run validate` sempre que mexer em
  `shifts.js`, `products.js`, `rules.js` ou `anamnese.js`.
- **`src/hooks/useGameClock.js`** — único lugar com `requestAnimationFrame`;
  chama `engine.tick` a cada frame enquanto o turno está ativo.
- **`src/components/`** — Fila, CardCliente, Anamnese, Prateleira,
  PainelAtendimento, ConfirmacaoEntrega, FeedbackAtendimento, DistracaoOverlay,
  ModalConfirmacao, HUD, Screens (telas de início/seleção/resultado/ajuda).

Sair do turno pelo HUD (ou pela tela de pausa) abre o `ModalConfirmacao` — modal
próprio, não `window.confirm`. Enquanto ele está aberto o relógio do turno para,
e confirmar descarta o turno em andamento: nada vai para `storage.js`, porque
`recordShiftCompletion` só roda quando um turno TERMINA.

## Curva dos turnos

| # | Turno | Introduz |
|---|---|---|
| 1 | Primeiro Plantão | ler o nome exato na prateleira |
| 2 | Marca ou Genérico | intercambialidade |
| 3 | O Que Você Sente | o cliente descreve o sintoma — e a primeira anamnese |
| 4 | Não É Para Mim | paciente ≠ cliente, faixa etária |
| 5 | Gestante na Fila | condições declaradas |
| 6 | Estoque Vencido | validade do lote |
| 7 | Tenho Alergia | alergia medicamentosa e reação cruzada de classe |
| 8 | Já Estou Tomando | interação, duplicidade e o primeiro sinal de alerta |
| 9 | Retenção Obrigatória | controlados, retenção, distrações |
| 10 | Fechamento Perfeito | tudo o que veio até aqui |
| 11 | Tosse de Quem? | tosse seca × produtiva, rinite medicamentosa |
| 12 | Uso Contínuo | polifarmácia: AINE × anticoagulante e × anti-hipertensivo |
| 13 | Só Um Minutinho | fila cheia e quatro distrações: escolher o que perguntar |
| 14 | Não Insista | turno de dizer não — clientes pedindo o que não podem levar |
| 15 | Plantão da Madrugada | prova final: nove clientes, tudo ao mesmo tempo |

## Fora de escopo (nesta versão)

Sem gestão financeira/estoque de longo prazo, sem multiplayer, sem conteúdo
médico real.
