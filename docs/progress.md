# Progresso do projeto

## Estado atual

- Fase atual: 9 — Monitoramento por ponto e figura completa
- Status: Implementação local concluída; aceites externos pendentes
- Última atualização: 2026-11-25
- Importação dinâmica, tempo relativo, indicadores, figura completa e salvamento por ponto concluídos localmente. Google real, reprodução da queda/reinício do Vite e integração em banco separado continuam pendentes; nenhum deploy ou escrita no Neon nesta etapa.

## Resumo das fases

| Fase | Status |
|------|--------|
| 1. Setup | Concluído |
| 2. Autenticação | Em andamento |
| 3. Importação | Concluído |
| 4. Gráficos | Concluído |
| 5. Finalização | Concluído |
| 6. Perfil e Neon | Concluído |
| 7. Adoção do Prisma | Concluído |
| 8. Estabilidade e próximos incrementos | Parcial: proteções/rede concluídas; aceites e busca pendentes |
| 9. Monitoramento por ponto e figura completa | Implementação local concluída |

A implementação da fase 2 e seus testes estão concluídos; falta registrar o aceite manual completo da conta Google real.

## Trabalho concluído

- MVP React/Vite/TypeScript, autenticação Google, importação CSV/Excel em worker, gráfico, filtros e PNG/SVG.
- Interface simplificada: prévia automática, campos condicionais, arquivo ativo visível e cancelamento destacado.
- API Node autenticada e PostgreSQL Neon, mantendo segredos somente no servidor.
- Prisma ORM 7 com adaptador Neon, modelos tipados e Prisma Migrate; baseline do schema decicharts registrada sem alterar dados existentes. Histórico legado preservado.
- Perfil Google e preferências persistentes de fuso/unidade para novas importações.
- Salvar/reabrir/atualizar/excluir análises, com título, intervalo e todos os pontos preservados.
- Blocos de 5 mil pontos, publicação após validação completa, tentativas idempotentes na sessão e isolamento por UID.
- Workspace em memória preservado ao navegar; limpar/logout não apagam análises salvas.
- Testes de servidor, Neon real e navegador; documentação e preparação para Vercel atualizadas.

## Trabalho em andamento

Implementação e validação local da fase 9 concluídas. Mensagens de rota/sessão diferenciadas, saída protegida e erro temporário de token separado de sessão inválida. Reprodução com Google real e servidor dev reiniciado continua manual.

## Próximas tarefas

1. Criar manualmente um branch/banco Neon separado e configurar TEST_DATABASE_URL; executar a integração preparada sem usar o banco atual como alternativa.
2. Validar Google real → importar → salvar ponto → recarregar → reabrir; conferir persistência, logout protegido e o cenário de reinício do Vite durante login.
3. Conferir outros layouts reais e a ponderação efetiva do equipamento; o arquivo recebido não comprova ponderação A nem integração energética.
4. Adicionar busca e filtros paginados ao histórico em entrega futura.
5. Publicar somente após autorização explícita.

## Decisões técnicas

- Firebase apenas para Google; JOSE valida assinatura RS256, emissor, audiência, tempo e provedor.
- API filtra todas as consultas por UID do token verificado. Identidade do corpo é ignorada.
- DATABASE_URL nunca possui prefixo VITE_ nem é enviada ao navegador.
- Arquivos originais e células brutas dos diagnósticos permanecem locais. Salvamento remoto é explícito.
- Até 250 mil registros, transferidos em blocos de até 5 mil pontos e três requisições simultâneas; corpo da API limitado a 512 KiB.
- Análises incompletas permanecem ocultas; rascunhos antigos são limpos na próxima tentativa de salvar do mesmo usuário.
- Exclusão usa cascata no PostgreSQL. Fechar análise limpa somente a sessão.
- Migração executada manualmente com npm run db:migrate; login e build não criam tabelas.
- Prisma Client gerado na instalação/build, exclusivamente no servidor; Prisma Migrate substitui o executor SQL manual. CLI usa conexão direta e a aplicação usa DATABASE_URL.
- Modelos mapeiam tabelas existentes. Trava de linha parametrizada protege transações concorrentes de gravação/publicação; demais consultas da aplicação usam modelos Prisma.
- Sem novos cálculos normativos, interpolação, sampling ou suavização.
- Nenhum deploy ou push realizado nesta etapa.

## Bloqueios e pendências

- Aceite manual completo com conta Google real ainda não registrado. Testes criptográficos e de interface não o substituem.
- EXEMPLO.xlsx recebido e validado localmente em 25/11/2026: dez pontos, 600 medições e localização associada. Fixtures versionadas continuam sintéticas; outros layouts e propriedades acústicas ainda precisam de confirmação.
- Roteamento Vercel preparado e API local testada; publicação real ainda não executada.
- Relato de oscilação visual ao recuperar a conta depois de reiniciar o Vite durante login. Logout real não confirmado; cenário ainda não reproduzido e não coberto pelos testes atuais de navegador com sessão sintética.
- TEST_DATABASE_URL ainda não configurado; integração de escrita da fase 9 não executada. Há bloqueio para o banco da aplicação, inclusive pooled/direto. Proteção de saída e mensagens de carregamento já implementadas.

## Validações

| Verificação | Resultado |
|-------------|-----------|
| Vitest padrão | 73 aprovados; 1 integração externa ignorada por padrão |
| Neon real com Prisma | Aprovação histórica da fase 7; fase 9 preparada, não reexecutada sem banco separado |
| Chrome/Playwright | 12 cenários aprovados; PNG com logotipo também conferido por pixels |
| TypeScript/ESLint/build | Aprovados; build sem avisos de tamanho |
| npm audit | Zero vulnerabilidades reportadas |
| Capacidade local | 250 mil registros lidos, normalizados, renderizados e filtrados |
| Migração Prisma | Baseline aplicada; deploy/status sem pendências; diff sem diferenças; fingerprints dos dados preservados |
| Isolamento/exclusão | Outro UID não lê/altera/exclui dados; cascata verificada |
| Bundle frontend | Conexão Neon, Prisma Client, adaptador/driver e fixtures ausentes |
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

### 2026-11-23 — Início da adoção do Prisma

- Pedido explícito para usar Prisma ORM.
- Estado inicial limpo; banco Neon já possui tabelas e pode conter dados reais.
- Transição será por baseline e verificação de compatibilidade, preservando registros.
- Prisma 7 estável escolhido para evitar a versão 8 ainda em release candidate na documentação consultada.
- Em andamento: schema, Client, adaptador e migrações.

### 2026-11-23 — Baseline Prisma registrada

- Prisma Client/CLI/adaptador Neon 7.10.1 instalados; Effect transitivo corrigido com override compatível 3.22.5.
- Modelos Prisma mapeiam tabelas/colunas e relações existentes no schema decicharts.
- Baseline 0001_initial comparada ao banco e marcada como aplicada, sem executar DDL sobre tabelas existentes.
- Contagens e fingerprints antes/depois iguais: uma análise, um bloco, um perfil e um registro do histórico legado preservados.
- Primeira integração Prisma real aprovada com 5.001 pontos; 56 testes unitários aprovados.
- Executor SQL antigo removido; comandos de migração agora chamam Prisma Migrate.
- Em andamento: confirmação de concorrência, migrações pendentes, build e regressão no navegador.

### 2026-11-23 — Adoção do Prisma concluída

- Repositório migrado para Prisma, com transações e trava parametrizada para proteger início, blocos e publicação concorrentes. API e contratos frontend mantidos.
- Baseline preservou um perfil, uma análise, um bloco e o registro legado; fingerprints novamente conferidos após os testes, sem alteração dos dados originais ou resíduos sintéticos.
- Prisma Migrate confirmou histórico atualizado, nenhuma migração pendente e nenhuma diferença entre banco e modelos.
- 56 testes unitários, integração real com concorrência e 5.001 pontos e 10 cenários Chrome aprovados. TypeScript/build e ESLint aprovados; npm audit sem vulnerabilidades.
- Bundle frontend inspecionado: sem conexão Neon, Prisma Client, adaptador ou fixtures. Client gerado na instalação/build e ignorado pelo Git.
- README documenta banco novo, baseline da versão anterior, comandos oficiais Prisma e criação de migrações em banco de desenvolvimento.
- Implementação registrada no commit 4eb1644; documentação consolidada em commit separado.
- Aceite Google real continua manual. Nenhum deploy ou push realizado.

### 2026-11-23 — Backlog de estabilidade registrado

- Usuário solicitou registrar pendências e relatou oscilação da conta na interface. Esclareceu que fazia login com servidor dev parado e que o comportamento surgiu após reiniciá-lo.
- Hipótese a verificar: reconexão/recarga do Vite seguida de restauração da sessão Firebase. Não há evidência suficiente para afirmar logout real ou falha em produção.
- Revisão estática encontrou a mesma mensagem de recuperação de sessão no fallback das páginas; confirmou que trabalho não salvo fica apenas em memória e não há proteção antes de recarregar/fechar a aba.
- Seção 21 do plano adicionada com prioridades, tarefas e critérios de aceite para sessão, proteção do trabalho, separação de ambientes, carregamento/rede e busca no histórico.
- Mudança somente documental. Não foram executados novos testes nem alterados autenticação, banco ou variáveis de ambiente; resultados anteriores permanecem como histórico, sem validar o relato novo.
- Próxima ação: reproduzir o reinício do servidor dev durante login e identificar a causa antes de corrigir.

### 2026-11-23 — Leq adicionado ao backlog

- Usuário solicitou registrar Leq após menor/maior nível, incluindo as informações da figura exportada. Implementação permanece pendente; arquivo real do sistema previsto pelo usuário para 24/11/2026.
- Critérios registrados na seção 21: distinguir leituras instantâneas de Leq por intervalo, calcular média energética ponderada pela duração quando aplicável e definir tratamento de lacunas, duplicados e recortes do período.
- Tela, PNG e SVG devem usar o mesmo indicador; estimativas e ponderação A devem ser identificadas corretamente. Exemplo de aceite: 50/60/70 dB por durações iguais → 65,68 dB.
- Mudança somente documental, conferida com git diff --check; nenhum teste adicional executado nem código/banco alterado.

### 2026-11-25 — Monitoramento por ponto e figura completa

- Plano aprovado implementado: detecção de quantidade variável de blocos Tempo (s)/dB, IDs arbitrários e durações distintas. Metadados de localização associados por ID; origens/mesclagens das células preservadas.
- Arquivo real conferido sem versionar: 10 pontos, 600 medições, zero inválidos, tempos de 1 a 60 segundos preservados. P1: mínimo 40, média 75,4, máximo 100 e média energética estimada 91,4927309226 dB.
- Workspace mantém ajustes e progresso independentes por ponto, inclusive quando o envio termina após alternar a seleção. Salvar é individual; reabrir recupera somente o ponto salvo.
- Coordenadas internas em milissegundos, tipo temporal explícito e metadados versão 2. Contratos antigos seguem absolutos; campos JSON existentes preservam informações/figura sem alterações de schema Prisma, migração ou reset.
- Quatro indicadores e figura completa em PNG/SVG, com identificação, localização e logotipo opcional. PNG usa a imagem já decodificada; pixels do logo conferidos por teste. Leq sempre identificado como estimado, indisponível para irregularidades, duplicados, inválidos ou amostra única.
- Inspeção visual desktop/mobile/escuro realizada em lote; detector Impeccable sem achados. Gráfico mantém largura e adapta eixo temporal, sem sampling ou suavização.
- 73 testes unitários e 12 cenários Chrome aprovados, incluindo os 250 mil registros (~5,3 s na regressão completa), reabertura da figura e recuperação do perfil. Tipagem/build, lint e auditoria npm aprovados, zero vulnerabilidades.
- Guards de saída, mensagens separadas de rota/sessão e falha de rede do token sem logout implementados. Google real e reinício do Vite permanecem como aceites manuais; os testes não fingem validar esse cenário.
- TEST_DATABASE_URL exclusivo obrigatório para integração. Não configurado nesta sessão; nenhum teste de escrita, migração ou mudança de dados executado no Neon atual. Provisionamento do branch permanece manual.
- Implementação usa Impeccable para preservar a interface existente. Nenhum push ou deploy realizado.
- Bundle final inspecionado: 14 arquivos sem URL/host de banco, Prisma ou fixtures. Schema/migração Prisma permanecem sem diferenças.
- Commits por parte: 5d5443d (contratos e cálculo), 90b03fb (importação/workspace) e 7754dbe (figura, recuperação e testes); documentação em commit separado.
