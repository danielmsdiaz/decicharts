# Progresso do projeto

## Estado atual

- Fase atual: 5 — Testes e finalização (concluída localmente)
- Status: Bloqueado
- Última atualização: 2026-11-23
- Implementação tecnicamente possível concluída; aceite final depende da autenticação Google real.

## Resumo das fases

| Fase | Status |
|------|--------|
| 1. Setup | Concluído |
| 2. Autenticação | Bloqueado |
| 3. Importação | Concluído |
| 4. Gráficos | Concluído |
| 5. Finalização | Concluído |

A fase 2 possui código e testes concluídos; o bloqueio é exclusivamente sua validação externa.

## Trabalho concluído

- React/Vite/TypeScript strict, Tailwind, shadcn/ui, Router e tema claro/escuro.
- Login Google com popup, persistência local, proteção de rotas, perfil e logout; configuração ausente tratada sem simulação.
- CSV/XLS/XLSX, seleção de aba/cabeçalho, mapeamento manual, Web Worker, cancelamento e prévia.
- Datas brasileiras/ISO/Excel 1900/1904, fusos IANA, decimais, duplicados preservados e diagnóstico de inválidos.
- Gráfico temporal ECharts, zoom, filtros inclusivos, indicadores e tabela acessível.
- PNG 3200×1800 e SVG com título, unidade, fuso e intervalo aplicado.
- Testes unitários, testes Chrome, inspeção visual desktop/mobile/escuro e exportação.
- README completo, .env.example e configuração SPA da Vercel. Nenhum deploy realizado.
- Commits por etapa autorizados pelo usuário e realizados localmente.

## Trabalho em andamento

Nenhuma implementação local pendente. Validação externa da autenticação aguardando configuração.

## Próximas tarefas

1. Criar/configurar Firebase Authentication e provedor Google conforme README.
2. Preencher .env.local e reiniciar a aplicação. Não versionar valores reais.
3. Validar popup, perfil, recarga com persistência, proteção de rota e logout com uma conta real.
4. Conferir arquivos reais dos equipamentos e registrar eventuais formatos adicionais.
5. Atualizar o aceite no plano e este progresso após as verificações externas.

## Decisões técnicas

- Uma série por vez; troca somente após confirmação. Medições exclusivamente na memória.
- Limites: 20 MiB e 250 mil registros não vazios. Cabeçalho nas primeiras 100 linhas; área física Excel limitada a 250.100 linhas.
- America/Recife como fuso inicial, editável; Luxon interpreta IANA e respeita offsets explícitos.
- Ambiguidades de horário de verão são rejeitadas; não se adivinham instantes.
- Timestamps duplicados preservados com contagem de ocorrências adicionais.
- Sem agregação, interpolação, sampling ou suavização; nenhum cálculo normativo.
- SheetJS oficial 0.20.3; Papa Parse; ECharts modular e carregado sob demanda.
- Vitest atualizado e override compatível gRPC resolvem a auditoria inicial.
- Fixture autenticada exclusivamente em tests/browser; confirmada ausente do build de produção.
- Exportação de instante único usa margem de layout ±1 ms com apenas o instante real rotulado.

## Bloqueios e pendências

- Configuração Firebase iniciada pelo usuário. Validação completa de login, persistência e logout com Google real continua pendente; não declarar o MVP integralmente validado.
- Não há amostras reais de decibelímetros; compatibilidade foi testada com fixtures sintéticas.
- Erro de contexto do tema na rota protegida reportado pelo usuário e corrigido; sem erros conhecidos após a validação desta correção.
- Publicação exige autorização específica; não houve deploy nem push.

## Validações

| Verificação | Resultado |
|-------------|-----------|
| Vitest | 39 testes aprovados em 6 arquivos |
| Chrome/Playwright | 7 cenários aprovados após simplificação da interface |
| TypeScript strict | Aprovado: npm run typecheck |
| ESLint | Aprovado |
| Build de produção | Aprovado, sem avisos de tamanho de chunks |
| npm audit | Zero vulnerabilidades reportadas |
| Capacidade | 250 mil registros processados, renderizados e filtrados no Chrome |
| Exportação | PNG real 3200×1800 e SVG inspecionados |
| Responsividade | Desktop 1440px e mobile 390px, sem overflow horizontal |
| Inspeção de dist | Nenhuma fixture de autenticação de teste |
| Detector visual | Nenhum achado na execução |
| Google real | Bloqueado por configuração externa |

O último teste de capacidade levou aproximadamente 5,4 segundos nesta máquina, incluindo interações de teste; não é uma garantia para outros dispositivos.

## Histórico de progresso

### 2026-11-23 — Fase 1

- Documentação criada antes das funcionalidades.
- Repositório inicial sem código de aplicação.
- Próxima ação: configurar dependências e estrutura.

### 2026-11-23 — Fases 1 a 3

Implementado:
- Configuração React/Vite/TypeScript strict, Tailwind e componentes shadcn/ui.
- Login Google, persistência, proteção de rotas e erros sem simulação em produção.
- Parser CSV/Excel, worker e normalização com diagnósticos e fusos.

Validações:
- Dependências instaladas após liberação da rede.
- Auditoria inicial reportou dependências vulneráveis; investigação em andamento.
- Build e testes ainda não executados; fases não marcadas como concluídas.

Próxima ação:
- Completar interface de importação e gráfico, testar e corrigir.

### 2026-11-23 — Organização da entrega

- Usuário autorizou commits incrementais por parte.
- Atualização de Vitest e override compatível de gRPC em andamento para resolver a auditoria inicial.

### 2026-11-23 — Fase 4 e primeiras validações

- Interface completa de importação, prévia, diagnóstico e substituição implementada.
- Gráfico ECharts, intervalo compartilhado, indicadores, PNG e SVG implementados.
- Primeiro build de produção aprovado.
- Primeiro lint identificou conflito entre ECharts.use e a regra de hooks; corrigido com alias explícito.
- Auditoria após atualização de Vitest e gRPC: zero vulnerabilidades reportadas.
- Testes unitários e validação no navegador em andamento.
- Commit inicial da documentação: a8e2730.

### 2026-11-23 — Estrutura e autenticação

- Setup validado: build e lint aprovados.
- Testes de acesso e provedor Firebase executados; resultados registrados após execução.
- Código de autenticação implementado; validação Google real bloqueada sem configuração.
- Checklists distinguem implementação de validação externa.
- Primeira execução no Chrome: rota real protegida, mobile e 250 mil registros aprovados; fluxo completo interrompido na leitura e sob investigação.
- Capacidade: 250 mil registros carregados e renderizados em aproximadamente 6 segundos nesta máquina, incluindo interações do teste.

### 2026-11-23 — Importação validada

- 22 testes de parsing/normalização aprovados: CSV, XLS/XLSX, calendários Excel, fusos, duplicados, limites e diagnósticos.
- Mapeamento editável, prévia e processamento em worker validados no Chrome com CSV.
- Limite adicional de 250.100 linhas físicas por aba Excel documentado; leituras truncadas são rejeitadas.
- Commit de setup e autenticação: 06c0999.
- Próxima ação: concluir o commit de importação e integrar o workspace de gráficos.

### 2026-11-23 — Validação integrada e revisão visual

- 37 testes unitários e 4 cenários Chrome aprovados; lint e build aprovados.
- PNG real validado em 3200×1800 e SVG validado com título, unidade e intervalo.
- Capacidade: 250 mil registros em aproximadamente 5,1 segundos nesta execução, incluindo interações de teste.
- Detector visual: nenhum achado. Capturas desktop, mobile, escuro e login inspecionadas.
- Revisão encontrou expansão inadequada do eixo na exportação de um único instante; corrigida com margem de layout de 1 ms, sem inserir dados, e teste de regressão acrescentado.
- Área de upload fica compacta após importar, para dar prioridade ao gráfico.
- Nova validação dessas duas correções em andamento.
- Sem alterações de layout adicionais previstas.

### 2026-11-23 — Gráficos e exportação concluídos

- 38 testes unitários aprovados, incluindo regressão do intervalo com instante único.
- 4 testes Chrome aprovados após as correções: acesso real protegido, fluxo completo, mobile e capacidade.
- PNG 3200×1800 e SVG conferidos; zoom e filtros preservam duplicados e limites inclusivos.
- Build e lint aprovados; divisão de bundles removeu os avisos de tamanho.
- 250 mil registros processados e exibidos em aproximadamente 5,4 segundos na última execução.
- Capturas finais confirmadas sem nova rodada de mudanças visuais.
- Commit de importação: 3c5b72f.
- Próxima ação: consolidar testes de navegador e documentação final.

### 2026-11-23 — Encerramento da implementação local

Implementado:
- Etapas locais finalizadas e documentação sincronizada com o código.
- Commit dos gráficos: d8a83a9.
- Testes de navegador e instruções de execução incluídos no commit final.

Validações:
- 38 testes unitários, 4 cenários Chrome, tipagem, lint e build aprovados.
- Auditoria final sem vulnerabilidades e fixture de testes ausente de dist.
- Segunda inspeção confirmou as correções de upload compacto e eixo de instante único; sem novas mudanças visuais.

Pendências:
- Configuração e validação Google reais.
- Amostras reais de equipamentos.

Próxima ação:
- Configurar Firebase seguindo README e executar a lista de validação real.

### 2026-11-23 — Correção do contexto do dashboard após login

- Usuário reportou Cannot destructure property theme após configurar o Firebase.
- Causa reproduzida: ProtectedRoute criava Outlet sem encaminhar o contexto do App.
- Correção: encaminhar o contexto recebido para o Outlet da rota protegida.
- Novo teste com a hierarquia App → ProtectedRoute → Dashboard reproduziu o erro antes da correção e passou depois, incluindo alternância de tema.
- Fixture Chrome passou a incluir ProtectedRoute, eliminando a lacuna de cobertura anterior.
- 39 testes unitários aprovados; lint e build aprovados.
- Fluxo Chrome de importação, duplicados, filtros, zoom, PNG/SVG, tema e logout aprovado com a rota protegida.
- Nenhum valor de .env.local lido, alterado ou versionado.
- Próxima ação: usuário recarregar o aplicativo e continuar a validação da conta Google real.

### 2026-11-23 — CSV sintético para uso manual

- Criado samples/medicao-ruido-sintetica.csv com 3.601 medições de 09:00 a 10:00, a cada segundo.
- Dados explicitamente sintéticos, com variação de fundo, três picos e um trecho elevado; valores entre 46,0 e 79,7 dB.
- Validado com as funções reais de parsing, sugestão e normalização: 3.601 válidos, zero inválidos, zero duplicados, mapeamento automático correto e uma hora de intervalo.
- Instruções de importação e origem sintética em samples/README.md.

### 2026-11-23 — Simplificação da interface solicitada pelo usuário

- Em andamento: reduzir os campos visíveis e priorizar arquivo, prévia e gráfico.
- Remover o placeholder “Seu próximo gráfico começa aqui”.
- Destacar arquivo carregado, cancelamento e remoção; preservar ajustes técnicos sob demanda.
- Aplicar Impeccable (Operate/distill); Design Taste consultada, com suas regras específicas de marketing fora do escopo deste dashboard.
- Revalidar seleção, troca/cancelamento, processamento e exportação após a revisão.

### 2026-11-23 — Interface simplificada concluída

- Fluxo: selecionar arquivo → prévia automática → Gerar gráfico.
- Apenas escolhas desconhecidas ficam visíveis; ajustes técnicos e filtros/título sob demanda.
- Arquivo carregado/ativo explícitos; cancelar e remover com destaque.
- Cancelar uma substituição conserva a série atual; troca só ocorre após confirmação.
- Placeholder removido; indicadores principais reduzidos a três, com primeira/última medição preservadas na consulta detalhada.
- 39 testes unitários e 7 cenários Chrome aprovados. Na confirmação final, seis cenários passaram e o seletor do teste de coluna ambígua foi ajustado para o nome acessível; o cenário específico passou na reexecução.
- Capacidade mantida: 250 mil registros lidos, normalizados e renderizados em cerca de 6 segundos na execução local.
- Lint, tipagem/build e detector visual aprovados. Inspeção desktop/mobile/escuro concluída em duas rodadas, sem novas mudanças visuais.
- README, exemplo e documentos atualizados para o novo fluxo.
- Sem dependências novas, alterações em .env.local, deploy ou push.
