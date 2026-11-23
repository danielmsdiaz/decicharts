# Decicharts — interface de análise

Modo Operate. Refinamento da ferramenta existente com Impeccable/distill e princípios de design engineering; React, Tailwind e componentes shadcn/ui preservados. Fluxo construído diretamente em código conforme preferência confirmada.

## Direção

Ferramenta de trabalho calma, legível e direta. Um arquivo visível, uma ação principal e o gráfico como foco. Sem navegação decorativa, ilustração, frases promocionais ou painéis de preenchimento.

## Sistema visual

- Conteúdo limitado a 1280px e alinhado ao header. Espaçamento principal de 28px; padding de 32px desktop e 18px mobile.
- Tipografia de sistema; corpo 16px, controles/legendas 14px e valores tabulares.
- Tema claro: fundo #f5f6f7, superfície branca, texto #20282e, secundário #5c6972, destaque #0b7566.
- Tema escuro: fundo #111518, superfície #1a2024, texto #edf1f3, secundário #a7b4bd, destaque #68d9c1.
- Bordas definem superfícies, sem sombras decorativas. Painéis com raio de 12px; controles de 44px com foco visível.
- Cancelar e remover usam texto, borda e fundo próprios de ação destrutiva, com rótulo explícito.
- Motion restrito ao feedback breve de controles; respeitar reduced motion.

## Estados de importação

1. Vazio: área de seleção/arraste; não há placeholder de gráfico.
2. Arquivo escolhido: nome, formato e tamanho visíveis, estado de leitura e botão Cancelar importação.
3. Conferido: contagem real, prévia de até cinco linhas, fuso e Gerar gráfico.
4. Coluna desconhecida: somente a escolha que falta é exibida. Ambiguidades nunca são resolvidas silenciosamente.
5. Ajustar leitura: opções avançadas recolhidas; aba visível somente se houver várias.
6. Arquivo ativo: nome e número de medições persistem no painel, com Trocar arquivo e Remover arquivo.
7. Troca pendente: a série anterior permanece até confirmação. Cancelar descarta apenas a nova importação.

## Gráfico

- PNG/SVG no cabeçalho; três indicadores principais: quantidade, menor e maior nível.
- Período/título sob demanda. Primeira/última medição e tabela acessível na consulta detalhada.
- Sem sampling, médias, interpolação ou suavização.
- Exportação com fundo claro; eixos de 18px no layout 1600×900, PNG 2×.

## Verificação

- Inspeção conjunta em desktop 1440px, mobile 390px e tema escuro; confirmação final sem nova rodada de mudanças visuais.
- Capturas com transições desabilitadas para evitar estados intermediários de troca de tema.
- Detector mecânico sem achados. Testes cobrem leitura automática, campos condicionais, abas, cancelamento, troca, remoção e exportação.

## Conta e histórico — 2026-11-23

- Navegação autenticada por Análise, Minhas análises e Meu perfil, mantendo o tema do layout.
- Workspace preservado ao navegar entre essas rotas; perfil exibe dados Google e dois campos de preferências.
- Salvar análise é ação primária no gráfico; estado salvo/alterações pendentes explícito.
- Histórico paginado com Abrir e Excluir; excluir requer confirmação e não se confunde com Fechar análise do workspace.
- Leituras, erros, repetição após falha e progresso de envio recebem feedback em português.
- Inspeção desktop/mobile das telas de conta e histórico concluída; sistema visual existente preservado.
