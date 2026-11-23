# Progresso do projeto

## Estado atual

- Fase atual: 6 — Perfil e persistência Neon
- Status: Concluído
- Última atualização: 2026-11-23
- Implementação e validações locais/Neon concluídas. Aceite manual com Google real e eventual deploy permanecem pendentes.

## Resumo das fases

| Fase | Status |
|------|--------|
| 1. Setup | Concluído |
| 2. Autenticação | Em andamento |
| 3. Importação | Concluído |
| 4. Gráficos | Concluído |
| 5. Finalização | Concluído |
| 6. Perfil e Neon | Concluído |

A implementação da fase 2 e seus testes estão concluídos; falta registrar o aceite manual completo da conta Google real.

## Trabalho concluído

- MVP React/Vite/TypeScript, autenticação Google, importação CSV/Excel em worker, gráfico, filtros e PNG/SVG.
- Interface simplificada: prévia automática, campos condicionais, arquivo ativo visível e cancelamento destacado.
- API Node autenticada e PostgreSQL Neon, mantendo segredos somente no servidor.
- Migração explícita e idempotente: schema decicharts com profiles, analyses, analysis_chunks e schema_migrations. Aplicada e reexecutada no Neon real.
- Perfil Google e preferências persistentes de fuso/unidade para novas importações.
- Salvar/reabrir/atualizar/excluir análises, com título, intervalo e todos os pontos preservados.
- Blocos de 5 mil pontos, publicação após validação completa, tentativas idempotentes na sessão e isolamento por UID.
- Workspace em memória preservado ao navegar; limpar/logout não apagam análises salvas.
- Testes de servidor, Neon real e navegador; documentação e preparação para Vercel atualizadas.

## Trabalho em andamento

Nenhuma implementação local pendente. Aceite manual Google real → API → Neon aguardando uso da conta real.

## Próximas tarefas

1. Reiniciar npm run dev para carregar API/configuração atualizada.
2. Entrar com Google real, importar o exemplo, salvar, recarregar, abrir pelo histórico e conferir preferências.
3. Registrar o aceite manual, incluindo sessão persistente e logout.
4. Conferir planilhas reais dos equipamentos.
5. Publicar na Vercel somente após autorização; configurar as variáveis de servidor no ambiente escolhido.

## Decisões técnicas

- Firebase apenas para Google; JOSE valida assinatura RS256, emissor, audiência, tempo e provedor.
- API filtra todas as consultas por UID do token verificado. Identidade do corpo é ignorada.
- DATABASE_URL nunca possui prefixo VITE_ nem é enviada ao navegador.
- Arquivos originais e células brutas dos diagnósticos permanecem locais. Salvamento remoto é explícito.
- Até 250 mil registros, transferidos em blocos de até 5 mil pontos e três requisições simultâneas; corpo da API limitado a 512 KiB.
- Análises incompletas permanecem ocultas; rascunhos antigos são limpos na próxima tentativa de salvar do mesmo usuário.
- Exclusão usa cascata no PostgreSQL. Fechar análise limpa somente a sessão.
- Migração executada manualmente com npm run db:migrate; login e build não criam tabelas.
- Sem novos cálculos normativos, interpolação, sampling ou suavização.
- Nenhum deploy ou push realizado nesta etapa.

## Bloqueios e pendências

- Aceite manual completo com conta Google real ainda não registrado. Testes criptográficos e de interface não o substituem.
- Sem arquivos reais de equipamentos; fixtures são sintéticas.
- Roteamento Vercel preparado e API local testada; publicação real ainda não executada.
- Sem erros conhecidos nos fluxos automatizados e na integração real Neon.

## Validações

| Verificação | Resultado |
|-------------|-----------|
| Vitest padrão | 56 aprovados; integração real separada fica ignorada por padrão |
| Neon real | 1 teste aprovado, 5.001 pontos e dois usuários sintéticos; cleanup concluído |
| Chrome/Playwright | 10 cenários aprovados |
| TypeScript/ESLint/build | Aprovados; build sem avisos de tamanho |
| npm audit | Zero vulnerabilidades reportadas |
| Capacidade local | 250 mil registros lidos, normalizados, renderizados e filtrados |
| Migração | Aplicada e reexecutada; quatro tabelas confirmadas no schema decicharts |
| Isolamento/exclusão | Outro UID não lê/altera/exclui dados; cascata verificada |
| Bundle frontend | Conexão Neon, driver e fixtures ausentes |
| Inspeção visual | Desktop/mobile do perfil e histórico aprovados; detector sem achados |
| Google real até API | Aceite manual pendente |

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

### 2026-11-23 — Início da persistência Neon

- Usuário configurou DATABASE_URL e confirmou prontidão. Presença conferida sem exibir valores.
- Escopo ampliado: API serverless, perfil, preferências e salvar/reabrir/excluir análises.
- Decisão: salvar somente dados normalizados, por ação explícita, em blocos de até 5 mil pontos.
- Original da planilha permanece no navegador.
- Migração somente em schema próprio decicharts; validar com registros sintéticos isolados e removê-los ao finalizar o teste.
- Em andamento: dependências, contratos e API autenticada.

### 2026-11-23 — Migração Neon aplicada

- npm run db:migrate executado contra a conexão real configurada.
- Tabelas confirmadas: decicharts.profiles, analyses, analysis_chunks e schema_migrations.
- Somente schema próprio criado; nenhum dado ou tabela externa alterado.
- API autentica JWT Firebase por assinatura, emissor, audiência, validade e provedor Google.
- Perfil, histórico e workspace persistente em implementação; testes de servidor e Neon preparados.

### 2026-11-23 — API e persistência validadas

- 56 testes unitários aprovados, incluindo validação criptográfica dos tokens Firebase e contratos/erros da API.
- Integração real Neon aprovada com 5.001 pontos em dois blocos, UID isolado, retomada idempotente, publicação atômica e exclusão em cascata.
- Registros sintéticos removidos ao final.
- Perfil, preferências e histórico implementados; trabalho em memória preservado entre rotas.
- Primeira rodada Chrome: 9 de 10 cenários aprovados; a primeira importação sofreu recarga de descoberta de dependências do Vite. Papaparse/SheetJS pré-otimizados para evitar a recarga no primeiro uso do worker.
- Confirmação de interface, documentação e commits em andamento.

### 2026-11-23 — Encerramento da fase 6

- Migração executada no Neon real e reaplicação idempotente confirmada.
- 56 testes unitários, integração Neon real e 10 cenários Chrome aprovados; fluxos de gráfico e salvamento/reabertura confirmados após ajustes finais.
- Perfil, preferências, histórico, atualização e exclusão concluídos.
- Teste de integração removeu seus registros sintéticos e verificou séries incompletas/fora de ordem, duplicados e isolamento.
- Auditoria sem vulnerabilidades; bundle inspecionado sem conexão/driver/fixture de teste.
- Endpoint público de chaves RS256 do Google conferido; testes de assinatura usam chaves locais de teste, sem token real do usuário.
- Cálculos puros separados da formatação temporal para manter bibliotecas de datas fora do carregamento inicial.
- Próxima ação: reiniciar aplicação e validar o fluxo real com a conta Google do usuário.
