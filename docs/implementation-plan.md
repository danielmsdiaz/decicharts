# Plano de implementação — Plataforma de Análise de Ruído

## 1. Objetivo

Desenvolver uma aplicação web para importar, visualizar e exportar séries temporais de medições acústicas realizadas por decibelímetros.

O público-alvo inicial é um engenheiro que utiliza os dados das medições na elaboração de relatórios ambientais.

O MVP deve oferecer:

- Autenticação exclusivamente com Google.
- Importação de planilhas Excel e arquivos CSV.
- Identificação e normalização das medições.
- Visualização de séries temporais interativas.
- Filtragem dos dados por intervalo de tempo.
- Exportação dos gráficos em formatos adequados para relatórios técnicos.

Priorizar simplicidade, qualidade visual, precisão dos dados e manutenção do código.

## 2. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | React + Vite |
| Linguagem | TypeScript (strict) |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |
| Autenticação | Firebase Authentication |
| Gráficos | Apache ECharts |
| Planilhas Excel | SheetJS |
| Arquivos CSV | Papa Parse |
| Rotas | React Router |
| Testes | Vitest |
| Hospedagem | Vercel |

Utilizar versões estáveis e compatíveis das dependências.

### Restrições

- Não utilizar Next.js.
- Não criar backend próprio.
- Não utilizar banco de dados inicialmente.
- Não implementar Docker ou microsserviços.
- Processar as planilhas localmente no navegador.
- Não adicionar dependências ou abstrações desnecessárias.

## 3. Autenticação com Google

Utilizar Firebase Authentication com o provedor Google.

Implementar:

- Página de login.
- Botão "Continuar com Google".
- Autenticação por popup.
- Persistência de sessão.
- Proteção de rotas com `ProtectedRoute`.
- Estado de carregamento durante a recuperação da sessão.
- Exibição de nome, foto e e-mail do usuário.
- Logout.
- Tratamento de erros.

Não implementar autenticação por senha.

Inicialmente, qualquer conta Google autenticada poderá acessar a aplicação.

Não utilizar Firestore ou Firebase Storage.

Centralizar a configuração em `lib/firebase.ts`, utilizando variáveis de ambiente.

Criar `.env.example` e documentar no README como configurar o Firebase.

Não incluir credenciais reais no repositório.

Caso faltem configurações externas, implementar o código necessário, documentar a pendência e continuar as fases independentes. Não simular autenticação em produção.

## 4. Interface

Criar uma interface profissional, moderna e minimalista.

### Diretrizes

- Desktop-first e responsiva.
- Light/dark mode.
- Tailwind CSS e shadcn/ui.
- Tipografia e espaçamento consistentes.
- Componentes reutilizáveis.
- Estados de loading, erro e ausência de dados.
- Feedback visual para ações.

### Páginas

**Login**

- Identidade visual simples.
- Descrição resumida da aplicação.
- Botão de login Google.

**Dashboard**

- Header com usuário e logout.
- Área de importação de arquivos.
- Visualização dos gráficos.
- Filtros temporais.
- Indicadores das medições.
- Controles de exportação.

Não criar páginas adicionais sem necessidade funcional.

## 5. Importação de arquivos

Permitir importação por seleção de arquivo e drag-and-drop.

Formatos:

- `.xlsx`
- `.xls`, quando adequadamente suportado
- `.csv`

### Funcionalidades

1. Validar formato e tamanho.
2. Ler os arquivos localmente.
3. Identificar abas de planilhas.
4. Detectar possíveis colunas de data, hora e nível sonoro.
5. Permitir mapeamento manual das colunas.
6. Normalizar os dados.
7. Identificar registros inválidos.
8. Ordenar cronologicamente.
9. Disponibilizar os dados para o módulo de gráficos.

### Modelo inicial

```ts
interface Measurement {
  timestamp: number;
  value: number;
}

interface MeasurementDataset {
  fileName: string;
  measurements: Measurement[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  unit: string;
}
```

Adaptar o modelo caso a estrutura real das planilhas exija.

Tratar corretamente:

- Datas serializadas do Excel.
- Datas em formato brasileiro.
- Colunas separadas de data e hora.
- Vírgulas e pontos decimais.
- Registros vazios ou inválidos.
- Timestamps duplicados.
- Intervalos irregulares entre medições.

Não inventar nem interpolar medições ausentes.

## 6. Séries temporais

Utilizar Apache ECharts.

### Gráfico principal

- Eixo X: data/hora da medição.
- Eixo Y: nível sonoro, com unidade adequada.
- Tooltip com data, hora e valor.
- Zoom horizontal.
- Controle de intervalo visível.
- Restauração de zoom.
- Formatação de datas e unidades.
- Suporte a grandes conjuntos de registros.

Os pontos devem ser posicionados conforme seus timestamps reais.

Não aplicar suavização artificial.

### Filtros

- Data/hora inicial.
- Data/hora final.
- Restaurar intervalo.

### Indicadores

- Quantidade de medições válidas.
- Valor mínimo.
- Valor máximo.
- Início e fim do período analisado.

Não implementar LAeq, L10, L90 ou cálculos normativos no MVP.

## 7. Exportação

Implementar exportação em:

- PNG.
- SVG, quando compatível.

Os gráficos exportados devem conter:

- Título.
- Eixos identificados.
- Unidades.
- Séries visíveis.
- Intervalo temporal selecionado.

Garantir legibilidade para utilização em relatórios ambientais.

Não implementar geração automática de laudos.

## 8. Arquitetura

Adotar organização por funcionalidades (*feature-based*).

Estrutura sugerida:

```text
project/
├── docs/
│   ├── implementation-plan.md
│   └── progress.md
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── features/
│   │   ├── auth/
│   │   ├── file-import/
│   │   ├── measurements/
│   │   └── charts/
│   ├── lib/
│   │   └── firebase.ts
│   ├── hooks/
│   ├── types/
│   └── main.tsx
│
├── .env.example
├── package.json
└── README.md
```

### Princípios arquiteturais

- Separar parsing, normalização e visualização.
- Manter a lógica de negócio independente dos componentes.
- Criar funções puras e testáveis quando possível.
- Evitar dependências circulares.
- Utilizar TypeScript estrito.
- Não introduzir gerenciamento global de estado sem necessidade.
- Evitar abstrações prematuras.

## 9. Fases de implementação

### Fase 1 — Setup e estrutura

- [x] Inicializar React + Vite + TypeScript.
- [x] Configurar Tailwind CSS.
- [x] Configurar shadcn/ui.
- [x] Configurar ESLint e TypeScript strict.
- [x] Criar estrutura de diretórios.
- [x] Configurar React Router.
- [x] Implementar layout inicial.
- [x] Configurar light/dark mode.

**Critério de conclusão:** aplicação inicial executando e build sem erros.

### Fase 2 — Autenticação

- [x] Configurar Firebase Authentication.
- [x] Criar página de login.
- [x] Implementar login Google.
- [x] Implementar persistência de sessão.
- [x] Criar `ProtectedRoute`.
- [x] Implementar logout.
- [x] Tratar erros de autenticação.
- [x] Documentar configuração do Firebase.

**Critério de conclusão:** fluxo de autenticação implementado e validado quando houver configuração real disponível.

### Fase 3 — Importação

- [x] Criar componente de upload.
- [x] Implementar leitura de Excel/CSV.
- [x] Criar seleção de abas.
- [x] Implementar identificação de colunas.
- [x] Permitir mapeamento manual.
- [x] Normalizar datas e valores.
- [x] Validar registros.
- [x] Exibir prévia dos dados importados.
- [x] Criar testes do parser.

**Critério de conclusão:** importar arquivos válidos e produzir um conjunto de medições corretamente normalizadas.

### Fase 4 — Gráficos

- [x] Integrar Apache ECharts.
- [x] Criar gráfico temporal.
- [x] Implementar tooltip.
- [x] Implementar zoom.
- [x] Adicionar filtros temporais.
- [x] Exibir indicadores.
- [x] Implementar exportação PNG/SVG.
- [x] Testar fluxo completo de importação e visualização.

**Critério de conclusão:** importar dados, visualizá-los e exportar corretamente o gráfico.

### Fase 5 — Testes e finalização

- [x] Revisar responsividade.
- [x] Validar estados de erro.
- [x] Executar testes unitários.
- [x] Validar tipagem.
- [x] Executar lint.
- [x] Executar build.
- [x] Preparar configuração da Vercel.
- [x] Documentar instalação e execução no README.
- [x] Registrar limitações e pendências.

**Critério de conclusão:** aplicação funcional, testes automatizados passando e build de produção concluído.

## 10. Critérios gerais de aceitação

O MVP estará concluído quando:

1. O login Google estiver implementado e validado com configuração real.
2. O dashboard exigir sessão autenticada.
3. O usuário conseguir importar Excel/CSV.
4. A aplicação identificar ou mapear as colunas.
5. Os dados forem normalizados corretamente.
6. O gráfico representar timestamps reais.
7. Filtros e zoom funcionarem.
8. O gráfico puder ser exportado.
9. As planilhas forem processadas localmente.
10. Testes e build passarem.

## 11. Fora do escopo

Não implementar:

- Backend próprio.
- Banco de dados.
- Armazenamento de arquivos na nuvem.
- Integração direta com o decibelímetro.
- Google Drive.
- Geração automática de laudos.
- Análises acústicas normativas.
- Pagamentos.
- Controle complexo de usuários.

## 12. Documentação obrigatória do desenvolvimento

Antes de implementar as funcionalidades, criar os seguintes arquivos:

### `docs/implementation-plan.md`

Este arquivo deverá conter o plano completo de implementação, incluindo:

- Objetivo do projeto.
- Stack tecnológica.
- Arquitetura.
- Estrutura de diretórios.
- Funcionalidades.
- Fases de implementação.
- Tarefas de cada fase.
- Critérios de aceitação.
- Restrições técnicas.

O documento será a **fonte principal de referência para o escopo do projeto**.

Regras:

1. Criar o arquivo antes de iniciar a implementação.
2. Organizar as tarefas utilizando checklists.
3. Atualizar os checklists conforme as tarefas forem realmente concluídas.
4. Registrar alterações relevantes nas decisões técnicas.
5. Não marcar tarefas como concluídas sem implementação e validação adequadas.
6. Não remover requisitos pendentes para aparentar conclusão.
7. Evitar reescrever o plano inteiro sem necessidade.
8. Manter consistência com o código efetivamente implementado.

### `docs/progress.md`

Criar um segundo documento responsável por acompanhar o andamento real do projeto.

Utilizar a seguinte estrutura inicial:

```md
# Progresso do projeto

## Estado atual

- Fase atual: 1 — Setup e estrutura
- Status: Não iniciado
- Última atualização: YYYY-MM-DD

## Resumo das fases

| Fase | Status |
|------|--------|
| 1. Setup | Pendente |
| 2. Autenticação | Pendente |
| 3. Importação | Pendente |
| 4. Gráficos | Pendente |
| 5. Finalização | Pendente |

## Trabalho concluído

Nenhuma tarefa concluída.

## Trabalho em andamento

Nenhuma tarefa iniciada.

## Próximas tarefas

- Inicializar o projeto.
- Configurar as dependências.
- Criar a estrutura inicial.

## Decisões técnicas

Nenhuma decisão adicional registrada.

## Bloqueios e pendências

Nenhum bloqueio identificado.

## Validações

Nenhum teste executado.

## Histórico de progresso

Nenhuma atualização registrada.
```

### Regras de atualização do progresso

**O arquivo `progress.md` deve ser atualizado continuamente durante o desenvolvimento, e não apenas no encerramento da execução.**

Atualizar obrigatoriamente:

1. Ao iniciar uma nova fase.
2. Ao concluir uma tarefa relevante.
3. Ao encontrar um bloqueio.
4. Ao tomar uma decisão técnica importante.
5. Ao finalizar os testes de uma fase.
6. Antes de encerrar a sessão de desenvolvimento.

Cada atualização deve refletir o estado real do projeto.

Utilizar os estados:

- `Pendente`
- `Em andamento`
- `Concluído`
- `Bloqueado`

Não registrar funcionalidades como concluídas quando apenas parcialmente implementadas.

### Histórico de progresso

Manter um registro cronológico resumido, por exemplo:

```md
### YYYY-MM-DD — Fase 1

Implementado:
- Inicialização do projeto React + Vite.
- Configuração do Tailwind CSS.
- Configuração do TypeScript strict.

Validações:
- TypeScript: aprovado.
- Build: aprovado.
- ESLint: aprovado.

Pendências:
- Configurar shadcn/ui.
- Implementar layout inicial.

Próxima ação:
- Continuar a Fase 1.
```

Não é necessário registrar cada pequena alteração. Priorizar marcos relevantes.

## 13. Continuidade entre sessões

O projeto poderá ser desenvolvido em múltiplas sessões de um agente de programação.

Para evitar perda de contexto, seguir este protocolo:

### No início de cada sessão

1. Ler `docs/implementation-plan.md`.
2. Ler `docs/progress.md`.
3. Inspecionar o estado atual do repositório.
4. Comparar a documentação com os arquivos realmente existentes.
5. Identificar tarefas concluídas, parcialmente implementadas e pendentes.
6. Continuar a partir da primeira tarefa pendente ou bloqueada que possa ser executada.

**Não reiniciar o projeto nem repetir implementações já concluídas.**

Se a documentação estiver desatualizada em relação ao código, verificar o estado real, corrigir a documentação e continuar.

### Durante a execução

- Manter os documentos sincronizados com o desenvolvimento.
- Não sobrescrever informações relevantes de progresso.
- Registrar dependências externas ou decisões pendentes.
- Continuar automaticamente entre as fases sempre que possível.

### Antes de encerrar a sessão

Atualizar `progress.md` com:

- Estado atual.
- Última fase trabalhada.
- Funcionalidades concluídas.
- Funcionalidades parcialmente implementadas.
- Testes executados e respectivos resultados.
- Erros conhecidos.
- Bloqueios.
- Próxima ação recomendada.

A próxima sessão deve conseguir continuar o desenvolvimento apenas lendo os documentos e inspecionando o repositório.

## 14. Instruções de execução para o agente

### Preparação

1. Inspecione o repositório.
2. Verifique se já existem arquivos e funcionalidades.
3. Crie `docs/implementation-plan.md` com base neste documento, preservando os requisitos e critérios de aceitação.
4. Crie `docs/progress.md` com a estrutura de acompanhamento especificada.
5. Defina a ordem de execução das tarefas.
6. Inicie a implementação.

Se os arquivos de documentação já existirem, atualize-os preservando o histórico relevante.

### Execução

**Execute todas as cinco fases sequencialmente, sem exigir aprovação manual entre elas.**

Para cada fase:

1. Identifique as tarefas pendentes.
2. Atualize o status no `progress.md`.
3. Implemente as funcionalidades.
4. Execute os testes e validações pertinentes.
5. Corrija os problemas encontrados.
6. Atualize os checklists do `implementation-plan.md`.
7. Registre os resultados no `progress.md`.
8. Prossiga automaticamente para a próxima fase.

Não interrompa a implementação apenas para apresentar relatórios intermediários.

### Autonomia

- Não solicitar confirmação para decisões técnicas triviais.
- Não adicionar funcionalidades fora do escopo.
- Não realizar deploy sem autorização explícita.
- Não criar commits automaticamente, salvo quando solicitado.
- Não modificar arquivos não relacionados ao projeto.
- Não utilizar credenciais inventadas.
- Não mascarar funcionalidades incompletas com mocks em produção.
- Não declarar testes como aprovados quando não foram executados.

### Bloqueios externos

Quando uma etapa depender de intervenção humana, como configurar credenciais do Firebase:

1. Implemente o código que puder ser desenvolvido sem essa intervenção.
2. Documente a configuração pendente.
3. Marque a validação correspondente como bloqueada.
4. Continue as tarefas independentes.
5. Não considere a funcionalidade totalmente validada.

Interrompa somente quando houver um bloqueio que realmente impeça a continuação do trabalho.

### Entrega final

Ao concluir a execução, apresente:

- Fases implementadas.
- Funcionalidades concluídas.
- Estrutura final do projeto.
- Testes executados e resultados.
- Pendências e bloqueios.
- Configurações externas necessárias.
- Instruções para executar localmente.
- Estado final do `docs/implementation-plan.md`.
- Estado final do `docs/progress.md`.

## 15. Instrução final

**Inicie a implementação agora.**

Primeiro, crie os arquivos:

- `docs/implementation-plan.md`
- `docs/progress.md`

Em seguida, implemente as funcionalidades seguindo as cinco fases.

Atualize ambos os documentos durante o desenvolvimento.

Não pare ao terminar uma fase. Continue automaticamente até concluir todas as etapas tecnicamente possíveis.

Se a execução for interrompida, deixe o `progress.md` suficientemente atualizado para que outra sessão consiga retomar exatamente de onde o projeto parou.

Priorize uma aplicação simples, moderna, confiável e bem estruturada.


## 16. Decisões aprovadas — 2026-11-23

- Uma série, um arquivo, uma aba e uma coluna sonora por vez. Nova importação só substitui a anterior após confirmação.
- Limites: 20 MiB por arquivo e 250.000 linhas não vazias de dados.
- Fuso IANA selecionável; padrão America/Recife. Offsets explícitos prevalecem.
- Preservar timestamps repetidos e informar ocorrências adicionais.
- Parsing e normalização em Web Worker. Luxon para datas e fusos.
- Interface em português, construída diretamente em código, com superfícies neutras e destaque verde-petróleo.
- Indicadores, zoom, filtros e exportação compartilham o intervalo inclusivo aplicado.
- PNG em alta resolução e SVG com fundo claro para relatórios.
- Sem configuração Firebase, login desabilitado com orientação; nunca simular autenticação.
- Dados exclusivamente na memória; nenhuma persistência de medições.
- Fonte do escopo: requisitos acima e decisões desta seção.

### Autorização posterior

Em 2026-11-23, o usuário autorizou commits por parte implementada. Deploy continua sem autorização.

### Validação da autenticação

Código e testes locais implementados. Login, persistência e logout com Google real continuam bloqueados por configuração externa. Checklists de implementação não representam validação externa concluída.

### Exportação de intervalo com um único instante

Quando início e fim são iguais, o eixo exportado usa apenas uma margem gráfica de ±1 ms e identifica somente o instante real. Essa margem impede a expansão automática do ECharts para vários dias; não cria, altera ou agrega medições.

## 17. Situação de aceite — 2026-11-23

- [x] Fases 1, 3, 4 e 5 implementadas e verificadas localmente.
- [x] Código da fase 2 e seus testes automatizados implementados.
- [x] 39 testes unitários aprovados. Quatro cenários Chrome aprovados na implementação inicial; fluxo completo revalidado com a rota protegida após a correção de contexto.
- [x] Tipagem, ESLint e build de produção aprovados.
- [x] Auditoria final: zero vulnerabilidades reportadas.
- [x] Build inspecionado: fixture de autenticação dos testes ausente de dist.
- [ ] Validar login, recuperação/persistência da sessão e logout com Firebase e conta Google reais. Pendente: configuração iniciada pelo usuário; validar o fluxo completo com conta real.
- [ ] Conferir compatibilidade com arquivos reais dos decibelímetros utilizados pelo usuário. Sem amostras disponíveis.

O MVP não é declarado integralmente validado enquanto o aceite de autenticação real permanecer pendente. Deploy não executado e não autorizado.

### Regressão corrigida — contexto da rota protegida

ProtectedRoute deve encaminhar o contexto do Outlet do layout ao dashboard autenticado. O teste de regressão usa App → ProtectedRoute → Dashboard e verifica a troca de tema; a fixture do navegador também percorre a rota protegida. O erro reportado pelo usuário foi reproduzido antes da correção e os testes passaram depois.

## 18. Simplificação da interface aprovada — 2026-11-23

Esta revisão substitui a apresentação inicial dos campos e os rótulos do fluxo, preservando parsing e precisão.

- [x] Remover o placeholder “Seu próximo gráfico começa aqui”.
- [x] Mostrar imediatamente o arquivo escolhido e seu estado; manter identificação após gerar o gráfico.
- [x] Conferir automaticamente quando as colunas forem reconhecidas; ação principal Gerar gráfico.
- [x] Pedir apenas colunas desconhecidas; opções avançadas ficam em Ajustar leitura do arquivo.
- [x] Mostrar escolha de aba apenas quando houver várias.
- [x] Destacar Cancelar importação e Remover arquivo; cancelamento de troca mantém a série anterior.
- [x] Recolher período e título; preservar início/fim na consulta detalhada.
- [x] Revisar temas, espaçamento, estados e responsividade.
- [x] Validar os 7 cenários Chrome e manter os 39 testes unitários aprovados.

A detecção automática gera a prévia; a confirmação do usuário continua necessária para utilizar ou substituir a série. Nenhuma configuração Firebase foi alterada por esta revisão.

## 19. Persistência no Neon e perfil — 2026-11-23

Ampliação autorizada na conversa: usuário escolheu Neon, configurou DATABASE_URL e confirmou prontidão para a integração. Esta seção substitui as restrições iniciais de ausência de banco/backend exclusivamente para as funcionalidades abaixo. Firebase continua responsável pelo login Google. Sem deploy automático.

- [x] API Node serverless na Vercel e no desenvolvimento Vite; conexão PostgreSQL somente no servidor.
- [x] Validar tokens Firebase assinados, expirados, audiência e emissor; identidade nunca aceita do corpo enviado pelo navegador.
- [x] Tabelas próprias em schema decicharts, migração idempotente e isolamento de todas as consultas pelo UID.
- [x] Perfil com dados Google e preferências de fuso/unidade para novas importações.
- [x] Salvar análise somente por ação explícita: metadados, medições normalizadas, título e intervalo. Não armazenar o arquivo original nem células originais dos diagnósticos.
- [x] Dividir até 250 mil pontos em blocos de até 5 mil pontos; requisições pequenas, retomada idempotente e publicação da análise apenas após conferir todos os blocos.
- [x] Histórico paginado, reabertura e exclusão das próprias análises.
- [x] Preservar o trabalho na memória ao navegar entre análise, histórico e perfil; limpar no logout.
- [x] Gráfico, filtros e exportação continuam no navegador; importação local funciona sem salvar.
- [x] Testes de autenticação/API, isolamento, validação, blocos, integração Neon e interfaces.
- [x] Atualizar README, .env.example e progresso com configuração e resultados reais.

Critérios de aceite: salvar/reabrir preserva todos os pontos e duplicados, título e intervalo; usuário não acessa registros de outro; falhas não publicam séries incompletas; excluir remove metadados e blocos; credenciais ausentes do build frontend.

### Validações da fase 6

- Migração real aplicada e reexecutada com sucesso; tabelas confirmadas no Neon.
- 56 testes unitários aprovados, mais um teste de integração real executado separadamente.
- Integração real com dois usuários e 5.001 pontos: contagens, duplicados entre blocos, repetição idempotente, blocos incompletos/fora de ordem, isolamento, atualização e exclusão em cascata. Registros sintéticos removidos.
- 10 cenários Chrome aprovados, com confirmação final dos fluxos de gráfico e atualização/reabertura de análise.
- Build/tipagem/lint aprovados. Conexão Neon, driver de banco e fixtures ausentes do bundle frontend. Auditoria final sem vulnerabilidades.
- [ ] Aceite manual de login Google real → API → salvar/reabrir com a conta do usuário. Não foi obtido nem utilizado um token real da conta durante os testes automatizados.
- [ ] Deploy na Vercel, somente após autorização explícita.

## 20. Adoção do Prisma — 2026-11-23

Solicitada pelo usuário: substituir SQL direto como camada principal por Prisma ORM e Prisma Migrate. Preservar dados e tabelas existentes, UID, API e contratos frontend.

- [x] Modelar as tabelas existentes com nomes/campos mapeados ao schema decicharts.
- [x] Configurar Prisma Client e adaptador Neon, exclusivamente no servidor.
- [x] Registrar uma baseline compatível com o banco existente, sem reset, drop ou recriação de dados.
- [x] Prisma Migrate passa a controlar migrações pendentes; desativar o executor SQL manual.
- [x] Migrar o repositório para consultas tipadas, mantendo publicação atômica e proteção contra concorrência nos blocos.
- [x] Gerar Client na instalação/build; oferecer comandos de geração, migração e inspeção.
- [x] Validar dados antes/depois, migrações sem mudanças pendentes, isolamento, reabertura, exclusão e testes existentes.
- [x] Atualizar documentação e registrar commits por etapa.

SQL parametrizado pontual é permitido para travas de linha, que o Prisma não oferece na API tipada; consultas e validações de domínio devem usar os modelos do Prisma.

Validações: baseline registrada sem alterar fingerprints dos dados existentes; migrate deploy/status sem pendências e migrate diff sem diferenças; 56 testes unitários, integração Prisma no Neon com concorrência e 5.001 pontos e 10 cenários Chrome aprovados. Tipagem/build e lint aprovados; auditoria com zero vulnerabilidades. Bundle frontend sem Client, adaptador, conexão Neon ou fixtures. Dados originais novamente conferidos após a integração.

## 21. Pendências de estabilidade e próximos incrementos — 2026-11-23

Solicitação do usuário: registrar o que ainda falta desenvolver. Os itens abaixo são backlog; não representam funcionalidades implementadas ou correções já verificadas.

### Prioridade 1 — Sessão após reinício do servidor de desenvolvimento

Relato: o usuário estava fazendo login com o servidor de desenvolvimento parado; após reiniciá-lo, a interface oscilou como se saísse e entrasse na conta. O próprio usuário suspeita de efeito apenas visual. Esse relato não confirma logout real nem problema em produção.

- [ ] Reproduzir login com servidor indisponível e reinício do Vite; observar reconexão, recarga completa, restauração da sessão Firebase e redirecionamentos.
- [ ] Distinguir recarga da página, carregamento de rota e mudança efetiva da sessão; investigar também retomada da aba e rede lenta. Coletar somente eventos técnicos necessários, sem tokens, credenciais ou dados pessoais.
- [ ] Corrigir os problemas que forem reproduzidos e adicionar testes de regressão para a causa identificada.
- [ ] Validar com Google real a persistência da conta após reinício/recarga e comparar com execução fora do servidor de desenvolvimento.

Evidência da revisão: `AuthProvider` aguarda o observador Firebase para restaurar a sessão; `signOut` é chamado na ação de logout. Não foi reproduzida uma desconexão automática. Os testes de navegador existentes usam uma sessão sintética e não validam reconexão do Vite com login Google real.

Aceite: em uma sessão ainda válida, a interface aguarda a restauração sem exibir login prematuramente; uma recarga não exige novo popup Google; logout explícito continua funcionando. Não se deve manter acesso autenticado quando o Firebase confirmar o encerramento da sessão. Recarga completa ainda descarta trabalho não salvo conforme a arquitetura atual.

### Prioridade 1 — Proteção do trabalho não salvo

- [x] Avisar antes de recarregar/fechar a aba quando houver análise ou alterações ainda não salvas, usando os mecanismos permitidos pelo navegador.
- [x] Confirmar saída voluntária da conta quando houver trabalho não salvo e permitir cancelar.
- [x] Cobrir arquivo recém-importado, alteração de título/período, análise já salva e salvamento em andamento.

Aceite: oferecer proteção nas ações suportadas pelo navegador sem impedir saída após salvar; cancelamento conserva o gráfico. Não prometer proteção contra queda do processo ou recarga forçada pelo servidor. Persistência local automática fica para decisão futura; não enviar dados ao Neon sem ação de salvar.

### Prioridade 1 — Separar desenvolvimento e produção

- [ ] Configurar um branch/banco Neon de desenvolvimento e documentar qual conexão pertence a cada ambiente.
- [ ] Usar o ambiente de desenvolvimento para `db:migrate:dev`, testes e dados sintéticos; reservar `db:migrate` para aplicar migrações revisadas em produção.
- [ ] Conferir que conexão da aplicação e conexão direta das migrações apontam para o mesmo branch em cada ambiente.

Aceite: mudanças e testes locais não alteram os dados de produção; configuração documentada sem expor URLs ou senhas. Nenhum branch ou recurso de nuvem foi criado nesta etapa.

### Prioridade 1 — Leq nas informações do gráfico e na figura exportada

Solicitação aprovada e implementada em 25/11/2026 após receber EXEMPLO.xlsx. O usuário confirmou leituras instantâneas de campo, salvamento por ponto e figura limpa. A seção 22 consolida a entrega e as pendências externas.

- [x] Examinar o arquivo real e confirmar a origem: leituras instantâneas de campo. Ponderação permanece desconhecida até confirmação explícita; duração de integração não é presumida.
- [x] Calcular estimativa por média energética de amostras regulares, separada da média aritmética. Agregação de Leq integrado por durações fica fora da versão, pois os dados foram confirmados como leituras instantâneas.
- [x] Preservar irregularidades e limites inclusivos; tornar Leq estimado indisponível para lacunas, duplicados, inválidos ou amostra única. Não inventar duração ou extrapolar energia.
- [x] Recalcular a estimativa com as amostras selecionadas, sem atribuir frações de integração a leituras instantâneas.
- [x] Acrescentar Leq depois de “Maior nível” na tela e incluir menor nível, maior nível, Leq e período na própria figura PNG/SVG; os cartões da tela atualmente não são exportados com o gráfico.
- [x] Identificar como estimado o resultado derivado de leituras instantâneas, explicitando a hipótese de amostragem. Exibir `LAeq` em `dB(A)` somente quando a ponderação A for confirmada; alterar o rótulo não converte a ponderação dos dados.
- [x] Calcular a partir dos dados completos do intervalo, sem arredondamentos intermediários ou dependência de simplificação visual do gráfico; manter estabilidade numérica e consistência entre tela, exportação e reabertura de análise salva.
- [x] Validar exemplos energéticos, série constante, ausência de dados, leitura isolada, irregularidades e filtros. Comparação com Leq integrado do equipamento permanece dependente de dados comparáveis.

Aceite: 50, 60 e 70 dB em três intervalos de igual duração resultam em aproximadamente 65,68 dB (65,7 dB com uma casa), e não 60 dB. Tela e figura mostram o mesmo valor e período. Quando os dados não sustentarem o cálculo, informar a limitação em vez de apresentar um Leq exato. O cálculo não comprova conformidade normativa por si só. Implementado na seção 22, sem alteração das tabelas Prisma ou do banco de produção.

### Prioridade 2 — Mensagens de carregamento e falhas de conexão

- [x] Separar a mensagem de recuperação da sessão da mensagem de carregamento das páginas. Hoje os fallbacks de `Suspense` das rotas reutilizam `SessionLoading`.
- [x] Diferenciar falha de rede/API de sessão efetivamente inválida, incluindo falha de rede ao obter um token, sem induzir novo login desnecessário.
- [x] Oferecer nova tentativa de carregar o perfil após uma falha temporária, preservando a análise aberta e a conta autenticada enquanto forem válidas.

Aceite: abrir Perfil/Minhas análises não informa que o usuário está entrando novamente; falhas temporárias apresentam recuperação clara e não apagam o trabalho em memória. Expiração/revogação real continua sendo tratada como autenticação necessária.

### Prioridade 2 — Encontrar análises no histórico

- [ ] Adicionar busca por nome da análise/arquivo e filtro por período das medições, com consultas paginadas na API.
- [ ] Manter filtros ao carregar mais resultados, com ordenação estável, estado vazio e opção de limpar a busca.
- [ ] Verificar isolamento por UID também nas consultas filtradas e nos totais.

Aceite: localizar análises além da primeira página sem carregar todos os pontos; nenhum resultado de outra conta é exibido.

Continuam pendentes os aceites anteriores: fluxo completo Google real → API → Neon e compatibilidade com arquivos reais dos equipamentos. Publicação permanece dependente de autorização explícita.

## 22. Monitoramento por ponto e figura completa — 2026-11-25

Plano aprovado implementado preservando a identidade visual, o processamento local e as análises antigas. Pontos e durações variam; dez pontos/600 medições são apenas o caso de EXEMPLO.xlsx.

- [x] Reconhecer blocos e IDs dinamicamente, preservar células mescladas e associar localização por ID; conflitos exigem revisão.
- [x] Importar uma aba com até 250 mil medições válidas somadas, dentro de 20 MiB; manter importação genérica de datas e CSV.
- [x] Distinguir tempo absoluto/decorrido, manter milissegundos inteiros internamente e segundos na interface; nunca criar datas de 1900.
- [x] Manter largura responsiva e ajustar escala/marcações ao período, preservando medições, lacunas, zoom e filtros.
- [x] Manter coleção local e ajustes independentes por ponto; salvamento individual entregue nesta etapa, posteriormente substituído pelo conjunto completo na seção 26.
- [x] Mínimo, média aritmética, máximo e Leq estimado sob as condições explícitas da seção 21; ponderação acústica não inferida da preferência.
- [x] Figura completa com prévia, PNG/SVG, identificação, localização, campos opcionais e logotipo local normalizado, enviado somente ao salvar.
- [x] Metadados v2 e informações da figura nos JSON existentes; compatibilidade de leitura com contratos antigos, sem migração ou reset.
- [x] Proteger trabalho não salvo e logout voluntário; separar carregamento de página/sessão e falhas transitórias de token; permitir repetir perfil.
- [x] Documentar branch dev manual e exigir TEST_DATABASE_URL diferente das conexões da aplicação, incluindo host pooled/direto.
- [x] Validar arquivo recebido localmente, fixtures sintéticas com quantidades/durações variáveis, 73 testes unitários e 12 cenários de navegador.
- [x] Tipagem/build e lint aprovados; auditoria com zero vulnerabilidades; inspeção visual e detector sem achados.
- [ ] Provisionar branch/banco exclusivo e executar a integração Neon ampliada para tempo relativo e informações da figura.
- [ ] Registrar aceite completo Google real e reprodução de reinício do Vite durante login.

Limites de entrega: leitura instantânea é a origem confirmada; agregação de Leq por intervalos, exportação em lote e busca no histórico seguem para futuras etapas. O salvamento do conjunto foi acrescentado na seção 26. Nenhum arquivo real, endereço real ou segredo foi versionado. Nenhum deploy, push, migração ou escrita no Neon foi realizado nesta fase.

## 23. Navegação, ajuda contextual e gráficos — 2026-11-25

Solicitação do usuário: setas para alternar pontos, explicações sob demanda e maior detalhe nos gráficos.

- [x] Adicionar setas junto ao seletor e desabilitar os limites, preservando seleção e ajustes locais.
- [x] Mover explicações para ícones de ajuda, acessíveis por cursor, teclado e toque, sem recorte pelos painéis.
- [x] Manter o estado real de erro/progresso visível e a identificação de Leq estimado.
- [x] Acrescentar grade fina, guias de leitura, extremos, referência energética e visão geral no zoom, preservando valores e escala temporal.
- [x] Recalcular referências com os filtros e preservar consistência entre tela e PNG/SVG.
- [x] Validar 75 testes unitários, 13 cenários Chrome, tipagem/build/lint, capacidade e inspeção visual em desktop/mobile/escuro.

Nenhum cálculo normativo, sampling ou suavização introduzido. As pendências externas da seção 22 permanecem abertas.

## 24. Redesenho da interface e confirmações próprias — 2026-11-25

Pedido: modernizar todas as telas e o header, remover textos soltos com aparência de template e substituir os alerts/confirms do navegador por popups da aplicação. Usuário confirmou manter apenas o aviso nativo ao fechar/recarregar a aba para proteger trabalho não salvo.

- [x] Header compacto com navegação integrada, tema e menu da conta; nome/e-mail dentro do menu.
- [x] Redesenhar login, importação, gráfico, histórico e perfil com tipografia local DM Sans e superfícies consistentes nos dois temas.
- [x] Remover o rodapé explicativo e slogans; mover explicações de processamento e preferências para ajuda contextual.
- [x] Centralizar confirmações assíncronas para substituir/fechar arquivo, abrir análise, iniciar nova análise, excluir e sair da conta.
- [x] Cancelar/Escape preservam dados e sessão; foco inicial em Cancelar, Tab contido no diálogo e foco devolvido à ação.
- [x] Manter beforeunload nativo e preservar importação, seleção de ponto, indicadores, filtros, zoom e exportação.
- [x] Validar 75 testes unitários, 15 cenários Chrome, lint/build e matriz de capturas desktop claro/celular escuro; detector sem achados.

As pendências externas da seção 22 permanecem abertas. Sem migração, escrita no Neon, push ou deploy nesta etapa. A autenticação real usa Firebase; a matriz visual usa identidade e dados sintéticos apenas na fixture de teste.

## 25. Skeletons de carregamento — 2026-11-25

- [x] Lista inicial e paginação do histórico com placeholders das linhas e ações.
- [x] Preferências e recuperação de sessão com placeholders proporcionais ao conteúdo.
- [x] Fallbacks específicos de páginas e gráfico carregados sob demanda.
- [x] Preservar dados disponíveis durante ações; não substituir conteúdo por skeleton em salvar/exportar/processar arquivos.
- [x] Respeitar movimento reduzido e status acessível; encerrar em sucesso ou erro, reativando na nova tentativa.
- [x] Testar respostas lentas controladas, erro/nova tentativa e paginação sem ocultar resultados. 75 testes unitários, 18 cenários Chrome, lint e build aprovados.

## 26. Salvamento da importação inteira — 2026-11-26

Decisões confirmadas no planejamento: salvar manualmente todos os pontos da aba selecionada; dados processados, sem arquivo original; novos layouts de CSV fora do escopo; pontos vazios exigem correção; permitir editar durante envio; reimportar sempre cria outra análise.

- [x] MeasurementImport como unidade do histórico, com UUID próprio, nome independente dos títulos, pontos ordenados e total de medições. Reutilizar Analysis/AnalysisChunk para dados imutáveis dos pontos.
- [x] Tentativas ImportSave e fotografias ImportSavePoint preservam todos os ajustes, cores e logomarcas. Publicação transacional por referência, revisão otimista e resposta idempotente; atualização incompleta mantém a versão anterior.
- [x] Primeira gravação registra metadados/configurações por ponto e envia blocos com concorrência global de três requisições; pontos já selados são reaproveitados na repetição. Atualização envia apenas configurações, sem blocos.
- [x] Preservar limites de 250 mil medições somadas, 5 mil por bloco e 512 KiB por requisição. Leitura por versão e paginação de metadados também limitada por bytes.
- [x] Proteção por UID em rotas e relações; grupo não publicado não aparece no histórico nem permite baixar blocos. Escritas individuais legadas em conjuntos múltiplos são bloqueadas.
- [x] Salvar na faixa do arquivo, nome global editável, progresso/erro globais e recuperação de conflito com confirmação. Mudanças feitas durante envio permanecem pendentes; fotografia interrompida é retomada sem absorvê-las.
- [x] Uma entrada por importação, reabertura completa antes de substituir o workspace e exclusão em cascata com quantidade de pontos informada. Pontos sem leituras não são descartados silenciosamente e bloqueiam Gerar gráfico.
- [x] Migração aditiva 0002 com conjuntos unitários para todos os registros antigos, inclusive rascunhos, mantendo IDs, datas, configurações e blocos. Baseline histórica separada para bancos anteriores ao Prisma.
- [x] Ensaiar baseline e migração em PostgreSQL 17 descartável local, comparar fingerprints dos dados legados e schema final, executar integrações do legado e dos dez pontos. Nunca usar a conexão da aplicação como destino de teste.
- [x] Testes unitários/API, concorrência global, fotografia após falha, edição durante envio e perda da confirmação; Chrome com dez pontos, ponto vazio, conflito, reabertura, nomes iguais e exclusão. Lint, tipagem e build aprovados.
- [ ] Provisionar/configurar TEST_DATABASE_URL de um Neon separado e repetir as integrações com seu adaptador.
- [ ] Aplicar a migração revisada no banco da aplicação mediante autorização antes de disponibilizar o novo backend/frontend; não executada nesta entrega.
- [ ] Aceite manual completo com Google real e Neon; sem push ou deploy nesta tarefa.

Não há substituição de medições de uma análise existente, inclusão/exclusão individual de pontos, histórico de versões na interface ou recuperação automática após recarga. Rascunhos e fotografias inativas expiram após 24 horas; a fotografia publicada é preservada.
