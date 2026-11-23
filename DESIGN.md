# Decicharts — interface

Modo Operate. Direção aprovada: ferramenta técnica minimalista, construída diretamente em código.

- Superfícies neutras claras ou escuras; destaque verde-petróleo apenas nas ações e série.
- Tipografia de sistema, valores tabulares, corpo 16px, rótulos 14px.
- Header compacto; importação e mapeamento inline; gráfico ocupa a largura útil.
- Sem sidebar, hero decorativo ou dados demonstrativos em produção.
- Controles shadcn/ui com foco visível, erros acionáveis e alternativas acessíveis.
- Exportação sempre com fundo branco e texto escuro.

## Sistema implementado e verificado

- Fundo claro #f7f8fa, texto #172b36, destaque #0f766e; tema escuro #10191f, texto #edf2f5, destaque #5ee0cc.
- Upload compacto após confirmação; gráfico e controles assumem a área principal.
- Tabela de medições e indicadores oferecem alternativa textual ao Canvas.
- Datas do gráfico em 14px; exportações usam eixos de 18px em layout 1600×900, com PNG em densidade 2×.
- Estados de foco, erro, processamento, vazio e cancelamento presentes.
- Revisão em Chrome: desktop 1440px, mobile 390px e tema escuro. Detector mecânico sem achados.
