---
name: Decicharts
description: Bancada acústica compacta para conferir medições e preparar figuras.
colors:
  background: "#f2f4f3"
  foreground: "#1e2d2b"
  card: "#ffffff"
  primary: "#116b5c"
  primary-foreground: "#ffffff"
  muted-foreground: "#5c6972"
  accent: "#e8eeeb"
  input: "#c8d0d5"
  border: "#dce3df"
  ring: "#0b7566"
  danger: "#b42318"
  danger-soft: "#fff1ef"
  soft-primary: "#e9f5f1"
  dark-background: "#111a18"
  dark-foreground: "#edf1f3"
  dark-card: "#192420"
  dark-primary: "#68d9c1"
  dark-primary-foreground: "#102b24"
  dark-muted-foreground: "#a7b4bd"
  dark-accent: "#25332e"
  dark-input: "#47555f"
  dark-border: "#34413b"
  dark-ring: "#68d9c1"
  dark-danger: "#ffb4aa"
  dark-danger-soft: "#432b2b"
  dark-soft-primary: "#203b35"
typography:
  headline:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "28px"
    fontWeight: 650
    letterSpacing: "-.035em"
  title:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-.025em"
  body:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  measurement:
    fontFamily: '"DM Sans Variable", sans-serif'
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-.03em"
rounded:
  tag: "4px"
  compact: "6px"
  control: "8px"
  panel: "12px"
spacing:
  micro: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "28px"
  gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  navigation:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
  file-tag:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.tag}"
    padding: "1px 6px"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
  file-bar:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.panel}"
    padding: "16px 20px"
---

# Design System: Decicharts

## Overview

**Creative North Star: "Bancada acústica compacta"**

Uma ferramenta profissional em português, com densidade suficiente para conferir medições sem disputar atenção com o gráfico. A identidade aparece na DM Sans, nos neutros esverdeados, no teal dos controles e no ritmo preciso de bordas e alinhamentos.

O trabalho visível conduz a interface: arquivo, ponto, período, gráfico e ações explícitas. Títulos curtos, informações técnicas recolhidas e ajuda contextual mantêm as telas de entrada, histórico e perfil tão diretas quanto a análise. Não há slogans nem rodapé explicativo.

**Key Characteristics:**
- Navegação integrada e contexto do arquivo persistente.
- Superfícies neutras, bordas discretas e teal funcional.
- Números tabulares e controles com foco visível.
- Confirmações internas que protegem o trabalho e devolvem o foco.

Fonte de verdade: `src/styles.css`, componentes compartilhados e telas implementadas em `src/`. Os tokens acima registram o tema claro; as entradas `dark-*` substituem seus pares quando `.dark` está na raiz. O sidecar `.impeccable/design.json` contém sombras, movimento, breakpoints e exemplos independentes. Atualizar os dois documentos quando esses fundamentos mudarem.

## Colors

### Primary

O teal identifica a ação principal, o destino ativo, o foco e estados positivos do trabalho. `primary-foreground` acompanha o preenchimento em cada tema; `soft-primary` oferece suporte tonal aos símbolos de arquivo e avatar. Não criar uma segunda cor de marca para diferenciar telas.

### Neutral

O fundo cinza esverdeado separa a bancada das superfícies `card`. `foreground` sustenta títulos e dados; `muted-foreground` identifica contexto, rótulos e informações secundárias. `border` organiza painéis e linhas; `input` delimita controles; `accent` responde ao hover. O tema escuro preserva essa hierarquia com superfícies verdes profundas e teal claro.

Estados de risco usam `danger` e `danger-soft`, acompanhados de verbo explícito. Erros e avisos têm tratamentos próprios nos dois temas em `src/styles.css`; não usar somente cor para transmitir seu significado.

**The Estado explícito Rule.** Cor acompanha texto, ícone ou estado acessível; nunca substitui a identificação de erro, salvamento ou ação destrutiva.

## Typography

DM Sans Variable é empacotada localmente por `@fontsource-variable/dm-sans`; a interface não depende de carregar fontes externas. O fallback é sans-serif. Uma família resolve títulos, navegação, formulários e medições; não acrescentar uma fonte de exibição decorativa.

A hierarquia normativa está no frontmatter. O título de página reduz para (25px) no celular; a entrada usa título de (32px), reduzido a (29px). O título do gráfico usa (20px), reduzido a (19px); números dos indicadores reduzem de (24px) a (22px). Contexto fino e metadados usam (12–13px), enquanto formulários e ações usam (14px). Não há escala geométrica obrigatória.

Aplicar números tabulares a indicadores, períodos e contagens. Rótulos em caixa normal, pesos intermediários e tracking negativo nos títulos criam a hierarquia sem caixa alta ornamental.

## Layout

Header e conteúdo compartilham largura máxima de (1440px). O header permanece no topo durante a rolagem. No desktop, tem altura mínima de (76px), gutter de (40px) e reúne marca, navegação, tema e conta numa única faixa. O conteúdo usa padding (36px 40px 64px) e intervalo vertical de (24px).

Até (900px), o gutter passa a (24px). Até (640px), o conteúdo usa (26px 18px 48px) e gap de (20px); a navegação ocupa uma faixa de (52px) abaixo da marca e dos controles. A página suporta largura mínima de (320px). As larguras de verificação desta entrega foram (1440px) e (390px).

O arquivo ativo ocupa uma faixa própria, seguida do seletor de ponto quando há vários e do painel de gráfico em toda a largura. Os quatro indicadores ficam numa linha no desktop e em duas colunas no celular. Salvar e exportar ocupam a mesma faixa e podem quebrar linha quando o espaço é limitado. Os rótulos do eixo Y compartilham a margem dos indicadores. Tabelas usam rolagem no seu contêiner, sem alargar a página.

Login centralizado, com conteúdo de até (400px), sem cartão elevado. Histórico usa linhas separadas; perfil separa identidade e preferências por bordas. Preferências e ajustes aparecem em duas colunas quando há espaço e uma coluna no celular.

## Elevation & Depth

A bancada é plana: superfícies, bordas e espaçamento estabelecem grupos. Sombras ficam nas camadas temporárias: tooltip (leve), conta (intermediária) e confirmação modal (profunda). Os valores completos estão no sidecar e em `src/styles.css`; não aplicar sombra decorativa aos painéis de trabalho.

A confirmação escurece o restante da interface com backdrop, entra em (180ms) e deslocamento de (6px). Hover de importação usa (150ms ease); botões usam transição de cor e pequeno deslocamento no pressionamento. `prefers-reduced-motion: reduce` desativa animações e transições.

Os skeletons usam uma pulsação discreta de opacidade em (1,8s), sem shimmer, atraso artificial ou transição de entrada. A preferência de movimento reduzido mantém os blocos estáticos.

## Shapes

Bordas finas e cantos moderados delimitam elementos sem parecer brinquedos: painéis e faixa de arquivo seguem `rounded.panel`; inputs, botões e tabelas seguem `rounded.control`; etiquetas de formato usam `rounded.tag`. O avatar é circular. A área inicial de importação usa cantos de (14px), a confirmação (16px): são formas específicas desses componentes, não uma nova escala geral.

## Components

### Loading skeletons

Usar `Skeleton` e os padrões de `LoadingStates` para conteúdo ainda desconhecido: lista e paginação de análises, preferências, recuperação de sessão e módulos de página/gráfico carregados sob demanda. Os blocos reproduzem o espaço de textos, campos, ações e área gráfica; combinam foreground (9%) com card, com cantos específicos de (6px). Não desenham medições fictícias.

Cada grupo expõe um status para leitores de tela; os blocos decorativos ficam ocultos e não entram na navegação por teclado. Erros encerram o skeleton e permitem nova tentativa. Na paginação, preservar as linhas já carregadas. Ações sobre conteúdo disponível, como salvar, exportar ou processar arquivos, mantêm os controles e o feedback de progresso.

### Buttons

Ações legíveis, altura padrão de (44px), ícones de (16px) e distância de (8px) entre ícone e texto. Existem variantes primária, outline, ghost e destrutiva; a pequena tem (40px), e a de ícone (44px) em ambas as dimensões. Desabilitados perdem opacidade e interação. O foco dos controles usa contorno de (2px), com offset de (2px); o foco global tem offset de (3px).

### Inputs / Fields

Campos e selects compartilham altura, borda, fundo e cantos. Cada campo tem rótulo visível e gap de (8px); a seta do select é um SVG separado. Estado inválido recebe mensagem contextual; ações assíncronas apresentam progresso ou erro em português. Não esconder diagnósticos em tooltip.

### Navigation

Links de navegação mantêm cor discreta. A rota ativa recebe teal e um traço inferior de (3px). O menu da conta é um disclosure ancorado no avatar, com nome, e-mail, configurações e sair. Fecha ao clicar fora, sair do grupo ou pressionar Escape. Escape devolve o foco ao disparador. Fotos indisponíveis recebem fallback de inicial.

Menu, navegação, disclosures e modais usam transições curtas de (150ms) a (220ms). As listas dos selects usam transições nos navegadores com suporte ao seletor personalizável e ponteiro preciso. A preferência de movimento reduzido desativa essas transições.

### Cards / Containers

O painel organiza gráfico e importação conferida; a faixa do arquivo preserva nome, formato/contexto e situação de salvamento. O estado vazio oferece uma ação de importação, sem gráfico fictício. Etiquetas indicam formatos; não são filtros nem botões. A prévia mantém até cinco linhas, campos condicionais e ajustes recolhidos. Cancelar uma importação pendente conserva o arquivo anterior.

### Chart workspace

O gráfico é a superfície principal. Arquivo, ponto e período permanecem verificáveis; setas e seletor alternam pontos sem perder ajustes locais. Média aritmética e Leq estimado são indicadores distintos. Preservar medições, duplicados e escala; não suavizar, interpolar ou amostrar para fins estéticos. A ajuda contextual, a faixa de zoom, as guias e a consulta de valores originais apoiam a leitura.

A figura PNG/SVG usa fundo claro e reúne identificação, quatro indicadores e nota técnica. O diálogo de exportação usa cartões de seleção única para o tipo de arquivo e a proporção e mostra a figura que será baixada. O foco começa no tipo selecionado e retorna ao botão de exportação ao fechar.

A identificação da figura ocupa uma superfície clara com rótulos alinhados e valores em seminegrito (24–26px no arquivo vetorial), separada dos indicadores. O gráfico cede altura para essa leitura; as três proporções de exportação permanecem disponíveis. Campos excepcionalmente longos recebem reticências e aviso de identificação abreviada, mantendo todos os rótulos presentes. Os valores completos continuam nos ajustes da figura.

O envio de logomarca aparece no modal e nas informações da figura como botão outline de 44px, com ícone de upload e ações Selecionar/Trocar logomarca. O input nativo fica oculto. O rótulo de 14px tem um “?” para formatos, limites e proporção: PNG/JPEG até 5 MiB e 4096px por dimensão; proporção entre 1:1 e 4:1, recomendação 2:1. A marca cabe em até 136×72 unidades no cabeçalho, com espaço transparente para preservar a proporção. A prévia da marca no controle tem fundo branco, 112×56px e cantos de 6px. Seleção inválida mostra erro e preserva a marca anterior; preparar a imagem desabilita o download até sua conclusão.

### Contextual help

Tooltips abrem por cursor, foco ou toque e fecham por Escape/toque fora. Renderizam em portal para escapar do recorte de painéis, com largura máxima de (320px), texto de (13px) e contraste invertido. Instruções de controles ficam aqui ou em disclosures; erros, progresso e alterações não salvas continuam visíveis.

Dentro de um diálogo, o portal permanece associado a ele e usa popover manual para aparecer acima da camada modal sem recorte. Escape fecha primeiro a ajuda, preservando o diálogo aberto.

### Confirmations

Modal contextual para substituir/fechar arquivo, abrir outra análise, iniciar análise, excluir e sair quando a ação precisa de confirmação. Título e descrição explicam a consequência, Cancelar recebe foco inicial, Tab fica contido e Escape cancela. Ao fechar, o foco volta ao disparador ou ao fallback conectado. A variante destrutiva usa ícone e botão de risco; a confirmação fica limitada a (440px), respeitando a viewport.

**The Proteção do trabalho Rule.** Confirmações internas usam o componente próprio; o aviso nativo fica restrito a fechar/recarregar a aba com trabalho não salvo, por decisão expressa do usuário.

## Do's and Don'ts

### Do:

- **Do** alinhar header e conteúdo e preservar a hierarquia arquivo → ponto → gráfico.
- **Do** reutilizar tokens dos dois temas, DM Sans local e componentes compartilhados.
- **Do** manter foco visível, suporte a teclado/toque e redução de movimento.
- **Do** manter dados originais, unidades, período e a identificação de Leq estimado verificáveis.
- **Do** expor progresso, erros e situação de salvamento em português.

### Don't:

- **Don't** recolocar slogans, rodapés explicativos ou parágrafos permanentes para controles já identificados.
- **Don't** acrescentar cartões elevados ou novas cores de marca para preencher espaço.
- **Don't** transformar tooltip em único lugar para erro ou consequência destrutiva.
- **Don't** trocar a confirmação de fechamento/recarregamento da aba por um modal interno.
- **Don't** tratar capturas com identidade sintética como validação de Google real ou integração de escrita no banco.
