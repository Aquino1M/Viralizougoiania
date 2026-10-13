# Auto Edit Context Library

Gerado automaticamente pelo Real Hub. Organiza B-roll, palavras de contexto, emojis, memória de estilo e referências oficiais usadas pela Mini IA local.

## Emojis por contexto

| Emoji | Palavras/contextos |
|---|---|
| 💰 | dinheiro, faturamento, receita, lucro, milhao, milhoes, valor, preco, venda, vendas, vender, comprar, investimento, premio, salario |
| 📈 | crescer, cresce, crescimento, multiplicar, aumentar, alta, subir, resultado, performance, prosperidade, desenvolvimento |
| 📉 | queda, cair, perda, prejuizo, diminuir, baixa |
| 💼 | empresa, negocio, empreendedor, empreender, consultoria, trabalho, cliente, mercado |
| 👥 | pessoas, pessoa, time, equipe, grupo, caras, outros, clientes, publico |
| 🧠 | ideia, pensar, mente, mentalidade, estrategia, estrategista, logica, decisao |
| 💡 | ideia, descoberta, solucao, sacada, insight, aprendizado |
| ⚠️ | perigo, risco, cuidado, problema, erro, falha, alerta |
| 🚫 | impossivel, proibido, nunca, nao, recusa, recusar |
| ✅ | certo, certos, conseguiu, sucesso, funciona, aprovado, confirmado |
| 👀 | olhos, vi, ver, veja, olhar, observe |
| ⏰ | tempo, minuto, minutos, hora, horas, anos, ano, idade |
| 🌍 | mundo, global, pais, cidade, brasil |
| 🏆 | melhor, campeao, vitoria, ganha, ganhar, premio |
| 🤝 | confiar, parceria, juntos, ajuda, delegar, delega |
| 🔢 | numero, numeros, conta, quantidade |
| 👑 | lideranca, lider, comando, conduz |
| 🕊️ | liberdade, livre |
| ⛓️ | escravizando, escravizar, preso, prisao |
| 📖 | biblia, livro, texto, escrito |
| 🎁 | generoso, presente, doar, doacao |
| 😲 | surpresa, surpreendido, chocante, inacreditavel |
| 🤯 | louco, absurdo, insano |

## Memória de estilo

| Preset | Amostras | Receita aprendida |
|---|---:|---|
| viral | 622 | punchZoom: 4 · kenBurns: 6.52 · sceneBigword: 4 · impactFlashes: 3 · transitions: {"crashZoom":5.36,"glitch":3,"flash":3,"zoomOut":1,"zoomIn":1,"shake":1} · sfx: 8.86 · filters: {"bw-noir":4,"saturado":1} · filterId: saturado · filterIntensity: 0.5 · progressBar: 1 · hookBars: 1 |

## Política editorial aprendida

A Mini IA aprende também **quando não usar** um recurso. Cada beat dos Vision Plans oficiais vira um exemplo positivo ou negativo para cena, B-roll, reação e zoom. O arquivo `editorial-policy.json` guarda essa memória.

Amostras editoriais oficiais: **50**.

- scene: 254/582 beats com uso oficial (44%)
- broll: 59/582 beats com uso oficial (10%)
- reaction: 39/582 beats com uso oficial (7%)
- zoom: 180/582 beats com uso oficial (31%)

## Cérebro contínuo da Mini IA

Arquivo principal: `mini-ai-brain.json`. Histórico append-only: `edit-experiences.jsonl`. Diferente da memória antiga, **todo corte concluído** vira uma experiência. O cérebro guarda padrões por preset, layout, duração e contexto semântico e recupera as experiências mais parecidas antes de planejar o próximo corte.

Experiências registradas: **809** · elegíveis brutas: **782** · lições únicas consolidadas: **699** · locais válidas: **697** · professores Real IA: **92** · falhas catalogadas: **20**.
Modelo consolidado v2: 699 lições únicas; 72 repetições não recebem peso duplicado.

> O cérebro não retreina pesos de um modelo neural sozinho. Ele faz aprendizado contínuo por memória, estatística, similaridade e políticas editoriais, com trava de qualidade para não reforçar edições ruins.

## Motor profissional v7

- Reserva os primeiros ~2,35 s para o hook, evitando empilhar Big Word, reação e B-roll em cima do gancho.
- Resolve colisões entre cenas, B-roll, reações, zooms, flashes e transições antes de materializar a timeline.
- Distribui transições em round-robin e impõe espaçamento mínimo para evitar repetição mecânica.
- Classifica cenas semanticamente (Big Word / Stat / Compare) de forma conservadora.
- B-roll usa correspondência por conceito e penaliza repetição recente; mídia contextual forte substitui Big Word genérico no mesmo instante.
- Emojis são esparsos, contextuais e limitados por minuto; regras aprendidas exigem confiança.
- A memória de estilo usa média móvel, evitando que um único corte sobrescreva todo o comportamento.
- A política editorial aprende exemplos positivos **e negativos** dos Auto Edits oficiais e pode escolher deliberadamente não usar efeito em um beat.
- Cada beat recebe uma decisão auditável (`usar` / `não usar`) para cena, B-roll, reação e zoom.
- Beats de baixa necessidade visual podem ser marcados como `quiet`, criando respiração profissional em vez de preencher todo espaço.

## Regras

- A Mini IA só reutiliza B-roll quando existe correspondência semântica suficiente com a fala.
- B-roll oficial já gerado é indexado por conceito/prompt/evidência e pode ser reutilizado em frases equivalentes.
- Emojis são escolhidos por significado; emojis antigos fora de contexto são descartados.
- Em lote, até os 3 primeiros Vision Plans oficiais existentes são lidos em paralelo e viram sementes; essa leitura não gera créditos.
- Os efeitos do preset escolhido continuam sendo do preset escolhido; referências oficiais de outro preset só fornecem âncoras semânticas.
- A comparação A/B continua opcional.
- `Salvar na timeline do Real` fica sempre ativo no Auto Edit local.
- Layout `Choquei + Movimento`: AE-246 em X321/Y1564, fonte 60, sem CTA e com sincronização de fim para remover cauda preta.
- Esta biblioteca fica em `context/` e sobrevive às atualizações.
