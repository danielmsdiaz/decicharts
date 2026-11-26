# Progresso do projeto

## Estado atual

- Fase atual: 14 — Salvamento da importação inteira
- Status: Salvamento em lote implementado; migração 0002 já aplicada ao banco da aplicação. Confirmar no PostgreSQL descartável o último ajuste da conclusão concorrente legada; aceites Google real e integração em Neon separado pendentes.
- Última atualização: 2026-11-26
- Exportação com proporções, prévia no modal, identificação em destaque, gráfico mais baixo, cores personalizáveis e envio de logomarca com limites explícitos implementados. Escala de 0 a 110 dB, cabeçalho fixo e transições preservados. Google real, reprodução do reinício do Vite e integração em banco separado continuam pendentes.

Salvar/reabrir/atualizar/excluir agora opera sobre a importação inteira da aba escolhida, com ajustes individuais, tentativas idempotentes e publicação atômica. Migração ensaiada em PostgreSQL descartável e aplicada ao Neon configurado após autorização em 26/11/2026; consulta real do histórico e schema conferidos.

O salvamento de dez pontos pequenos agora usa três chamadas à API, e a atualização dos ajustes usa duas. Inserções em massa e publicação podem compartilhar a transação de um lote completo; pontos maiores continuam usando blocos. Essa otimização não exige migração.

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
| 10. Navegação e detalhe dos gráficos | Concluído |
| 11. Redesenho e confirmações próprias | Concluído |
| 12. Skeletons de carregamento | Concluído |
| 13. Exportação de figuras e transições de interface | Concluído |
| 14. Salvamento da importação inteira | Implementação e migração concluídas; aceites externos pendentes |
| 15. Editor clicável e exportação Word | Planejado na seção 27; implementação não iniciada |

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

Implementação e validação local das fases 9 a 14 concluídas. Reprodução com Google real e servidor dev reiniciado continua manual.

Próxima funcionalidade planejada: editor clicável para compor o trecho de medições do relatório, com textos, tabelas, fotos e gráficos, e exportação Word. Escopo, proposta técnica e aceites estão na seção 27 de docs/implementation-plan.md. Nenhuma funcionalidade de documentos foi implementada.

## Próximas tarefas

1. Confirmar o último ajuste de idempotência na conclusão concorrente legada com `test:postgres:local`, quando a execução for autorizada. A suíte passou inicialmente; uma repetição revelou falha intermitente nesse cenário e a nova execução foi recusada.
2. Criar manualmente um branch/banco Neon separado e configurar TEST_DATABASE_URL; aplicar as migrações nesse destino explícito e repetir as integrações. PostgreSQL descartável local já validou a migração, o legado e o conjunto completo antes do último ajuste de concorrência.
3. Validar Google real → importar → salvar conjunto → recarregar → reabrir todos os pontos; conferir ajustes, logout e reinício do Vite. Migração 0002 aplicada ao Neon configurado e schema conferido em 26/11/2026.
4. Conferir outros layouts reais e a ponderação efetiva do equipamento; o arquivo recebido não comprova ponderação A nem integração energética.
5. Adicionar busca e filtros paginados ao histórico em entrega futura.
6. Publicar somente após autorização explícita.

## Decisões técnicas

- Firebase apenas para Google; JOSE valida assinatura RS256, emissor, audiência, tempo e provedor.
- API filtra todas as consultas por UID do token verificado. Identidade do corpo é ignorada.
- DATABASE_URL nunca possui prefixo VITE_ nem é enviada ao navegador.
- Arquivos originais e células brutas dos diagnósticos permanecem locais. Salvamento remoto é explícito.
- Até 250 mil registros. Salvamento em lotes de até 100 pontos/480 KiB UTF-8, incluindo medições de pontos pequenos; fallback em blocos de até 5 mil medições. Fila global de três requisições simultâneas e corpo da API limitado a 512 KiB.
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
| Vitest padrão | 90 aprovados; 4 testes de integração de banco ignorados por padrão |
| Neon real com Prisma | Migração 0002 e consulta real do histórico conferidas; integração ampliada com gravações sintéticas aguarda banco separado |
| Chrome/Playwright | 25 cenários cobertos; sete pertinentes aprovados nesta otimização; regressão anterior de 24 registrada abaixo |
| TypeScript/ESLint/build | Aprovados; build sem avisos de tamanho |
| npm audit | Zero vulnerabilidades reportadas |
| Capacidade local | 250 mil registros lidos, normalizados, renderizados e filtrados |
| Migração Prisma | Baseline preservada; 0002 aplicada ao Neon configurado, schema sem drift e contagens/fingerprints anteriores e posteriores idênticos |
| PostgreSQL descartável | Quatro testes aprovados inicialmente; última repetição com três aprovados e falha intermitente na conclusão concorrente legada. Último ajuste de idempotência aguarda reexecução autorizada |
| Isolamento/exclusão | Outro UID não lê/altera/exclui dados; cascata verificada |
| Bundle frontend | Conexão Neon, Prisma Client, adaptador/driver e fixtures ausentes |
| Inspeção visual | Redesenho aprovado e seis capturas adicionais de skeletons; detector atual com avisos consultivos de tokens existentes |
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

### 2026-11-25 — Navegação e gráficos refinados

- Setas anterior/próximo sincronizadas ao seletor, desabilitadas nas extremidades; ajustes por ponto preservados.
- Ajuda de salvamento, leitura, período, figura e Leq movida para tooltips com portal, cursor, foco, Escape e toque. Instruções repetidas retiradas do painel; erros e progresso mantidos visíveis.
- Gráfico com grade principal/secundária, guias de leitura, extremos identificados, marcadores em séries curtas e referência do Leq estimado. Visão geral na faixa de zoom, sem alterar os pontos desenhados ou os cálculos.
- Exportação mantém a validação da série completa para não desenhar Leq em um recorte regular de uma série irregular. Dois testes de referência acrescentados.
- 75 testes unitários, 13 cenários Chrome, tipagem/build e lint aprovados. Capacidade com 250 mil registros mantida (~5,1 s nesta execução).
- Inspeção conjunta desktop/mobile/escuro concluída; ajuste único de rótulos próximos à borda confirmado em nova rodada. Detector Impeccable sem achados.
- Sem dependências novas, mudanças na API ou no banco. Aceites externos anteriores continuam pendentes; nenhum deploy ou push.
- Commits de implementação: cd00794 (navegação e ajuda contextual) e 3675f5f (detalhes dos gráficos); documentação em commit separado.

### 2026-11-25 — Redesenho e confirmações próprias

- Impeccable e Emil Design Engineering aplicados ao redesenho de todas as telas. Header em uma linha no desktop, navegação abaixo da marca no celular, tema e menu da conta; nome/e-mail sem ocupar a barra inteira.
- Fonte DM Sans incluída localmente, superfícies e espaçamentos unificados. Login direto, perfil com seções abertas e histórico com ações claras. Rodapé e slogans removidos; explicações de processamento e preferências em ajuda contextual.
- Seis confirmações nativas substituídas por diálogo próprio assíncrono: trocar/fechar arquivo, abrir análise, começar outra, excluir e sair. Cancelar/Escape preservam trabalho e conta; Tab contido no modal, foco inicial em Cancelar e retorno ao controle ou avatar.
- Aviso nativo ao fechar/recarregar a aba mantido por escolha expressa do usuário. Não houve alteração em cálculos, leitura, formato salvo ou tabelas.
- 75 testes unitários aprovados e uma integração externa ignorada por padrão. Quinze cenários Chrome aprovados, incluindo matriz visual e proteção por teclado. Extensão de cancelamento ao abrir análise validada em execução focada adicional.
- Lint e build final aprovados. Bundle inspecionado: onze módulos sem conexão/host Neon, driver Prisma ou fixture de autenticação. Fonte instalada sem scripts; auditoria da instalação reportou zero vulnerabilidades.
- Dezoito capturas de login, importação vazia/prévia, gráfico, histórico vazio/preenchido, perfil, menu e confirmação conferidas em desktop claro e celular escuro. Correção única de borda no ícone de ajuda confirmada; detector executado uma vez, sem achados.
- Revisão independente Impeccable: disposition ship, sem correções materiais. DESIGN.md e sidecar registrados a partir do resultado construído.
- Capturas e evidências locais em .impeccable/review/, ignoradas pelo Git. Fixtures sintéticas reutilizam o App real para testar a mesma estrutura da aplicação.
- Pendências externas preservadas: Google real, reinício do Vite e integração em branch Neon separado. Sem migração, escrita no Neon, push ou deploy.
- Commits: 5edea24 (interface e confirmações) e 47ae81c (regressão e matriz de telas); documentação consolidada em commit separado.

### 2026-11-25 — Skeletons de carregamento

- Componentes compartilhados para lista de análises, paginação, preferências, recuperação da sessão e fallbacks específicos de páginas e gráfico.
- Preservados o visual aprovado, os resultados já carregados durante paginação e o feedback de salvar/exportar/processar arquivos. Sem atraso artificial; os placeholders seguem a conclusão ou falha real da operação.
- Skeletons com status acessível, blocos decorativos ocultos e animação desativada em movimento reduzido. Nova tentativa do histórico volta ao skeleton; falhas encerram o carregamento sem painel vazio.
- Validação: 75 testes unitários e 18 cenários Chrome aprovados; uma integração externa continua ignorada. Lint e build aprovados; seis capturas de histórico, perfil e gráfico conferidas em desktop claro/celular escuro. Ajuste de quebra no gráfico móvel confirmado em execução focada dos três novos cenários.
- Detector executado uma vez: avisos consultivos sobre cores, tipografia e raios existentes no CSS frente à documentação; sem alterar a identidade aprovada para silenciá-los. O raio local do skeleton foi documentado. Sem auditoria adicional de documentação ou mudança no banco.

### 2026-11-26 — Exportação de figuras, tema e movimento

- Modal ao lado de **Salvar análise** reúne PNG, SVG e as proporções retrato (8:9), quadrada (1:1) e paisagem (8:5). O retrato é o padrão para figuras lado a lado. O navegador guarda a última proporção escolhida.
- A prévia no modal exibe o mesmo arquivo usado no download. Os testes verificaram a identidade do conteúdo em PNG e SVG e a atualização da prévia ao mudar a proporção.
- Eixo de 0 a 110 dB na tela e nas figuras. Rótulos alinhados à margem dos indicadores. Leituras fora da escala continuam nos indicadores e geram aviso.
- Cabeçalho fixo e transições na navegação, no menu da conta, nos painéis e nos modais. A troca de tema ganhou um efeito de cortina e um brilho breve na marca. Os efeitos respeitam a preferência de movimento reduzido.
- Validação local com 77 testes unitários e 16 cenários Chrome das suítes de interface e fluxos, incluindo cabeçalho fixo, navegação por teclado, arquivos baixados e retorno do foco. Tipagem, lint e build do frontend passaram. A integração Neon separada permaneceu pendente.
- `AGENTS.md` registra o fluxo para consultar este arquivo, seguir `DESIGN.md` e commitar cada tarefa concluída.

### 2026-11-26 — Checklist de segurança da RocketMove

- Revisão estática dos 14 itens do artigo. Seis se aplicam: isolamento por UID, segredos no navegador, XSS, tratamento de arquivos, segredos no Git e consultas ao banco/RLS. O item de uploads foi adaptado para planilhas e logotipos.
- A API usa o UID do token Firebase verificado e consultas Prisma com filtro por usuário. A consulta SQL de trava usa parâmetros. A migração versionada não define RLS. A integração existente cobre leitura, blocos e exclusão entre contas e segue pendente de reexecução no Neon separado.
- `DATABASE_URL` fica no servidor. A configuração pública do Firebase está no cliente. A busca por padrões de chaves privadas, tokens GitHub, IDs de acesso AWS e URLs Neon com senha não encontrou correspondências nos 29 commits alcançáveis antes deste registro. Apenas `.env.example` apareceu no histórico de nomes `.env*` e `.env.local` está ignorado. Falta uma varredura dedicada no CI.
- Planilhas originais são processadas no navegador. O logotipo é normalizado para PNG no cliente e a API verifica prefixo, assinatura inicial e tamanho, sem decodificar o PNG inteiro ou conferir suas dimensões. Nome e e-mail são renderizados como texto no React. A configuração Vercel versionada não declara CSP.
- Antes de publicar, validar Google real, isolamento no Neon separado, permissões do usuário do banco e restrições da chave pública Firebase. A revisão não executou a aplicação ou testes ativos e não identificou vulnerabilidade crítica confirmada.

### 2026-11-26 — Textos da figura e envio de logomarca

- Identificação reorganizada em uma área própria, com rótulos alinhados, linhas discretas e valores em seminegrito de 24–26px. Indicadores e título ampliados; o gráfico cede altura para os textos sem alterar os dados, a escala ou as três proporções disponíveis.
- Removida a redução extrema da fonte nos metadados longos. Em casos excepcionais, reticências e um aviso identificam a abreviação; todos os rótulos continuam presentes, inclusive coordenadas e período. Textos completos permanecem nos ajustes.
- Campo de logomarca diretamente no modal de exportação e componente compartilhado com Informações da figura. PNG/JPEG até 5 MiB, até 4096px por dimensão e proporção entre 1:1 e 4:1; recomendação 2:1 visível junto ao campo. Área limitada no cabeçalho, sem cortes ou distorção e compatível com marcas já salvas.
- Validação rejeita formato, arquivo corrompido, dimensões, proporção ou peso inválidos e conserva a marca anterior. Download bloqueado enquanto a imagem é preparada; adicionar/remover atualiza a mesma prévia usada no download. Salvamento remoto continua explícito por ponto.
- Validação: 77 testes unitários aprovados e uma integração externa ignorada. Regressão de 17 cenários Chrome de fluxos/interface, com ajuste do teste de comparação de SVG (IDs internos variam na regeneração) e reexecução focada de quatro cenários aprovada. Teste de PNG confirma pixels reais da logomarca; testes cobrem os dois extremos de proporção aceitos, limites inválidos, remoção e reabertura da análise salva. Caso de textos longos revalidado após o último ajuste de espaço.
- Lint, TypeScript e build aprovados. Capturas desktop claro e celular escuro conferidas em duas rodadas. Detector executado uma vez, com avisos consultivos de tokens existentes no CSS e tamanhos contextuais de 12px já usados no projeto; as regras específicas da figura e do controle foram documentadas em DESIGN.md.
- Alteração preexistente em ProfilePage.tsx preservada fora desta tarefa e do commit. Sem novas dependências, escrita no banco, push ou deploy. Aceites externos anteriores continuam pendentes.

### 2026-11-26 — Controle de logomarca e ajuda contextual

- Input nativo substituído por botão outline do projeto, com ícone de upload e ações Selecionar/Trocar logomarca. Aplicado ao modal e às informações da figura, preservando prévia, remoção e validação.
- Formatos, tamanho e proporção movidos para o “?” ao lado do rótulo. Erros e processamento continuam junto ao controle. Tooltips em diálogos usam portal associado ao modal e popover manual para permanecer acima da camada modal, sem recorte ou bloqueio de interação; Escape fecha a ajuda antes do diálogo.
- Validação: 77 testes unitários aprovados, uma integração externa ignorada, lint e TypeScript aprovados. Quatro cenários Chrome aprovados: telas/temas, fluxo por ponto com PNG/SVG, seleção/validação/remoção da logomarca e ajuda por toque. Conferidos acionamento do seletor de arquivos pelo novo botão, tooltip visível acima do modal, descrição acessível, Escape, limites do celular e fechamento ao tocar fora.
- Capturas desktop e celular inspecionadas; detector dos componentes alterados sem achados. DESIGN.md atualizado. Nenhuma dependência nova, alteração de banco, push ou deploy; modificação anterior em ProfilePage.tsx mantida fora do commit. Pendências externas preservadas.

### 2026-11-26 — Cores da figura

- Três seletores no modal de exportação: cabeçalho, fundo do gráfico e linha. Controles com rótulo, código hexadecimal, amostra de cor, ajuda “?” e ação Restaurar cores. Prévia e arquivos PNG/SVG recebem a mesma personalização; o tema do aplicativo continua independente.
- Contraste calculado para o título e os eixos, com texto preto/branco; grade, bordas e anotações acompanham o fundo. A cor da linha é preservada conforme a escolha do usuário, com orientação de contraste na ajuda. Sem alterações nos valores, escala, cálculos ou amostragem.
- Cores opcionais nos metadados da figura, preservadas por ponto ao salvar/reabrir. API aceita somente #RRGGBB e normaliza para minúsculas; análises anteriores continuam usando os padrões. Restaurar remove as preferências e recupera a aparência original. Sem mudança de schema ou migração.
- Validação: 79 testes unitários aprovados e uma integração externa ignorada. Novos testes verificam contraste mínimo de 4,5:1 para os textos calculados, cores no SVG, pontos originais preservados e rejeição de cores inválidas pela API. Lint, TypeScript e build aprovados.
- Quatro cenários Chrome cobertos: telas/temas, cores, logomarca e ajuda por toque. Cenário de cores reexecutado com sucesso após explicitar os nomes acessíveis dos seletores; verifica atualização da prévia, SVG, pixels reais do PNG, restauração, independência entre pontos e reabertura com cores salvas. Capturas desktop claro, celular escuro e figura com cabeçalho claro/fundo escuro inspecionadas. Detector dos componentes sem achados.
- DESIGN.md atualizado. Nenhuma dependência nova, escrita no banco, push ou deploy. Alteração preexistente de ProfilePage.tsx preservada fora da tarefa e do commit. Aceites externos anteriores continuam pendentes.

### 2026-11-26 — Viabilidade de salvar a importação inteira

- Solicitada análise de viabilidade e preparação de prompt para planejamento, sem implementar a nova regra. Revisados importador/worker, coleção local, serviço de salvamento, API, repositório Prisma, histórico e critérios da seção 22 do plano.
- Viável: a coleção de pontos e os ajustes individuais já existem no workspace. O salvamento, carregamento, histórico e modelo Analysis persistem apenas um ponto por análise e não registram um identificador comum de importação. Repetir o salvamento atual para todos os pontos produziria itens independentes, sem reabertura conjunta ou garantia de conclusão do conjunto.
- Direção recomendada para avaliar no Plan: importação com ID próprio e pontos associados, reutilizando os blocos existentes. Salvar/reabrir/atualizar/excluir o conjunto, preservar ajustes individuais e manter análises antigas como conjuntos de um ponto, sem inferir agrupamento por nome de arquivo.
- Planejamento deve definir publicação completa, falhas parciais, repetição sem duplicação, concorrência global de envio e consistência das atualizações. Preservar isolamento por UID, limite total de 250 mil medições na aba/importação e contratos anteriores. CSV com coluna identificadora por linha requer avaliação do layout; a descoberta atual reconhece blocos Tempo/dB com IDs nos cabeçalhos.
- Premissas propostas, ainda sujeitas à confirmação no planejamento: salvamento explícito de todos os pontos normalizados da importação/aba selecionada; arquivo binário original e demais abas fora do escopo. Salvamento automático ou armazenamento do original são decisões distintas. TEST_DATABASE_URL separado continua necessário para validar futuras migrações e integração.
- Revisão estática apenas; nenhuma mudança funcional, migração, acesso ao banco ou nova execução de testes. Verificação documental com git diff --check. Prompt entregue na conversa para planejar antes de implementar.

### 2026-11-26 — Salvamento por importação, etapa 1: persistência e API

- Modelos MeasurementImport, ImportSave e ImportSavePoint adicionados, reutilizando Analysis/AnalysisChunk para pontos e blocos imutáveis. Migração 0002 converte cada registro antigo em conjunto unitário, sem agrupar nomes iguais, preservando IDs, conteúdo, datas e estado de rascunho/publicação.
- API /imports com tentativas idempotentes, fotografias completas dos ajustes, publicação transacional por referência, revisão otimista, leitura por versão, metadados paginados por bytes e exclusão em cascata. Endpoints antigos continuam operando conjuntos unitários; mutações individuais de conjuntos múltiplos são bloqueadas. Rascunhos/versões inativas expiram após 24h; a versão publicada é preservada.
- Limites de 250 mil medições por conjunto, 5 mil por bloco e 512 KiB por requisição preservados. Relações compostas e consultas incluem UID. Blocos repetidos com conteúdo diferente são recusados, e pontos selados não recebem reescrita.
- Sem TEST_DATABASE_URL configurada: criado ensaio com PostgreSQL 17 descartável local via pg_virtualenv, proteção explícita de destino e adaptador PostgreSQL apenas de desenvolvimento. Migração com legado publicado/rascunho, fingerprints, schema Prisma sem drift e duas integrações reais de banco aprovados (legado unitário e dez pontos, última falha, repetição, versões, paginação de logomarcas, concorrência e isolamento). Nenhuma conexão da aplicação recebeu escrita.
- Baseline histórica separada em prisma/baseline.prisma para registrar bancos anteriores ao Prisma sem confundir a estrutura 0001 com as migrações novas. Baseline já registrada permanece idempotente.
- Próxima etapa: concluir workspace, histórico, regressões e documentação do fluxo completo. A migração ainda não foi aplicada ao Neon da aplicação; Google real e Neon separado continuam pendentes.

### 2026-11-26 — Salvamento por importação, etapa 2: workspace e histórico

- Salvar análise movido para a faixa do arquivo; agora inclui todos os pontos, independentemente da seleção. Nome do conjunto separado do título de cada figura. Progresso, erro, conflito e avisos de alterações são globais; edição e alternância continuam disponíveis durante envio.
- Fotografias de configurações capturadas no clique. Edições posteriores permanecem pendentes; repetir após falha mantém IDs e a fotografia original. Um limitador global de três requisições abrange todos os pontos; cada ponto é selado assim que seus blocos terminam. Atualizações de ajustes não reenviam medições.
- Histórico com uma entrada por importação, contagens e data de atualização. Abertura carrega/valida todo o conjunto antes de substituir o workspace, fixa a versão e repete uma vez se ela mudar durante leitura. Reimportação com o mesmo nome cria outro UUID. Excluir remove o conjunto e informa sua quantidade de pontos na confirmação.
- Pontos vazios permanecem visíveis na prévia e bloqueiam a conclusão; o workspace e o serviço também recusam o conjunto incompleto. Formatos atuais de CSV e escolha de uma aba preservados. Nenhum armazenamento do arquivo original ou recuperação local automática introduzido.
- Validação final: 86 testes unitários/API aprovados, duas integrações de banco aprovadas no PostgreSQL 17 descartável e ignoradas na suíte comum. Ensaio inclui baseline histórica, dados publicados/rascunhos legados, fingerprints de metadados/configurações/blocos/datas e schema final sem drift.
- Chrome: 24 cenários cobertos; 23 aprovados na regressão completa e a confirmação restante aprovada em reexecução após corrigir expectativa do teste. Novos cenários exercitam falha no décimo ponto, edição durante envio, retomada sem duplicação, atualização sem blocos, ordem dos dez pontos, reabertura, nomes iguais, exclusão, ponto vazio e conflito com cancelamento seguro. As regressões existentes de exportação, logos, cores, carregamento e capacidade de 250 mil leituras foram preservadas.
- Lint, TypeScript e build aprovados. Capturas desktop claro e celular escuro inspecionadas; detector dos componentes sem achados. README, PRODUCT, DESIGN e plano atualizados. Adaptador PostgreSQL acrescentado apenas ao desenvolvimento; bundle da aplicação continua usando Neon somente no servidor.
- Persistência/API registrada no commit 779762a. Nenhuma migração ou escrita no Neon da aplicação, push ou deploy. A migração 0002 precisa ser aplicada antes de disponibilizar esta versão; integração em Neon separado e aceite Google real continuam pendentes.

### 2026-11-26 — Correção do erro no histórico após a atualização

- Imagem enviada pelo usuário mostrava o erro genérico de conexão/migrações em Minhas análises. Diagnóstico em transação somente leitura confirmou análises legadas presentes como tabela, mas ausência de measurement_imports/import_saves/import_save_points. Prisma informou somente 0002_import_collections pendente.
- Conferido que as conexões da aplicação e migração apontam para o mesmo banco, normalizando hosts pooled/direto sem expor credenciais. Após autorização específica do comando, aplicado migrate deploy com a migração 0002 já revisada e ensaiada localmente.
- Conferências antes/depois: zero registros em analyses e analysis_chunks em ambos os momentos, fingerprints idênticos e nenhuma análise antiga a converter neste banco. Nenhum conteúdo de usuário foi exportado; os arquivos temporários de verificação contêm somente contagens e fingerprints.
- Migração concluída com sucesso, consulta Prisma dos campos do histórico funcional e migrate diff contra o schema atual sem diferenças. Nenhum novo registro de teste gravado, reset, push ou deploy. Não foram repetidos testes de aplicação porque o ajuste foi exclusivamente a aplicação da migração já validada.
- README e plano atualizados para refletir o estado real. Fluxo completo com conta Google real e integrações sintéticas em Neon separado continuam pendentes.

### 2026-11-26 — Alinhamento vertical dos selects

- Corrigido o texto no topo dos selects personalizados do Chrome: o seletor compartilhado para appearance: base-select agora usa flex com alinhamento vertical central, mantendo a altura de 44px e a seta no mesmo eixo. O menu de opções e o fallback nativo permanecem com seus próprios layouts.
- Verificação pertinente: cenário existente de telas responsivas aprovado no Chrome, cobrindo desktop claro/celular escuro, abertura/fechamento do select por teclado e ausência de overflow. Capturas da prévia de importação inspecionadas nos dois tamanhos, confirmando texto centralizado. git diff --check aprovado; sem novos testes ou dependências para esta correção de CSS.
- DESIGN.md atualizado. Nenhuma alteração funcional de importação/salvamento, banco, push ou deploy. Aceites externos anteriores preservados.

### 2026-11-26 — Diagnóstico da demora ao salvar

- Revisão estática do fluxo confirmou excesso de idas e voltas: primeira gravação de dez pontos com menos de 5 mil leituras cada usa 33 requisições (criar conjunto/tentativa, dez configurações, dez blocos, dez conclusões de ponto e publicação). Atualizar os ajustes dos dez pontos ainda usa 12 requisições.
- Cada operação executa várias consultas sequenciais no Neon. pending/lockImport toma a mesma trava da importação em configurações, blocos e conclusões, serializando essas transações mesmo com três requisições simultâneas. O processamento por lotes no cliente também aguarda terminar o grupo atual antes de começar o próximo.
- Próxima otimização recomendada: reduzir chamadas com envio/gravação em lote para conjuntos pequenos e ajustes, preservando limite de corpo, publicação atômica, idempotência, isolamento e fallback em blocos para dados maiores. Esta etapa apenas explica os gargalos identificados; não mediu tempos reais por etapa nem alterou o protocolo ou o banco.
- git diff --check pertinente ao registro documental; nenhuma nova execução de testes, escrita no Neon, push ou deploy.

### 2026-11-26 — Redução das etapas de salvamento

- Novo PUT /imports/:id/saves/:saveId/batch recebe até 100 pontos; o cliente monta lotes de até 480 KiB UTF-8, com metadados, ajustes e até 5 mil medições por ponto. Servidor usa createMany em uma transação por lote, com publicação na mesma transação quando o lote contém o conjunto completo. Corpos da API continuam limitados a 512 KiB; pontos maiores e pontos em envio interrompido continuam no protocolo de blocos existente.
- Dez pontos pequenos que caibam em um lote usam três chamadas na primeira gravação (antes 33); atualizar os ajustes usa duas (antes 12), sem reenviar medições. Fila global mantém até três envios ocupados; em caso de falha, para de iniciar trabalhos e aguarda os que já estavam em andamento antes de liberar nova tentativa.
- Preservados isolamento por UID, metadados e medições imutáveis, identificação/ordem, limite total de 250 mil leituras, comparação de conteúdo repetido, fotografia dos ajustes, revisão otimista e publicação completa. Falha no último ponto desfaz todas as inserções do lote; atualizações mantêm a versão publicada anterior até a conclusão.
- Comparativo de dez pontos/600 leituras em PostgreSQL descartável: protocolo individual 370 consultas e 264 ms; lote 28 consultas e 30 ms nesta execução. Contagem por eventos Prisma sem imprimir SQL ou parâmetros. Os tempos são locais e não medem nem garantem latência Neon.
- Validação: 90 testes comuns aprovados e quatro integrações ignoradas por padrão; lint, TypeScript e build aprovados. Seis cenários Chrome pertinentes aprovados, mais o novo cenário misto de três e 5.001 leituras: falha no último bloco, histórico oculto, retomada e reabertura das 5.004 leituras sem duplicação. Testes de serviço cobrem divisão por bytes/logomarcas, três envios globais, confirmação perdida e espera dos envios em andamento após erro.
- Banco local: quatro testes aprovados nas primeiras execuções, incluindo rollback do lote, atualização, isolamento, repetição e comparativo; a última repetição teve três aprovados e uma falha intermitente na conclusão concorrente legada. Revisão identificou a janela em que outra chamada já havia publicado a mesma tentativa e o selo atrasado era recusado. Repetir esse selo agora aceita somente ponto já pronto e não altera a versão publicada; acrescentada regressão de banco. A nova execução de banco foi recusada, portanto essa última alteração ainda requer confirmação no PostgreSQL descartável.
- README e plano atualizados. Nenhuma dependência, mudança de schema, migração ou escrita no Neon da aplicação nesta otimização. Sem push ou deploy.

### 2026-11-26 — Planejamento do editor clicável e Word

- Conversa consolidou composição a partir de página em branco para posterior incorporação ao relatório maior. O usuário substituiu a hipótese de modelo recorrente pelo editor livre com inserção de título, subtítulo, tabela, texto, foto e gráfico. Trechos aceitam uma/duas colunas; elementos e legendas podem ser editados, movidos e acrescentados em sequência. Gráficos mantêm uma cópia da versão inserida, atualizável por ação explícita.
- Documento de exemplo e quadros do vídeo examinados localmente como referência de uso. Nenhum arquivo, imagem, texto pessoal ou assinatura foi copiado para o repositório. O áudio do vídeo não foi analisado e não foi usado como fonte de requisitos.
- Revisados rotas, contexto/provider de análises, geração PNG/SVG, guardas de logout, API/limites e schema. Reuso de createFigureBlob é viável; o contexto atual precisa expor cópias dos pontos além do ativo. O guarda único de logout precisa ser coordenado para proteger análise e documento simultaneamente. Imagens exigem persistência separada do manifesto para respeitar 512 KiB por requisição.
- Seção 27 do plano registra interação, proposta de documentos independentes e revisões, mídias em blocos, isolamento, falhas/repetição, biblioteca candidata, paginação e Word editável. Primeira etapa será uma prova vertical com duas colunas e .docx real para validar biblioteca, legibilidade, armazenamento e cotas antes de consolidar a infraestrutura. Cotas de documento são propostas de engenharia; limites existentes de importação permanecem próprios.
- Skill Impeccable aplicada em modo de planejamento, herdando DESIGN.md. Verificação pertinente: revisão documental e git diff --check; sem testes de aplicação, pois não houve alteração de código. Nenhuma dependência instalada, migração, acesso de escrita ao banco, push ou deploy. Aceites externos e confirmação do ajuste legado de concorrência continuam pendentes.
