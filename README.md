# Decicharts

Importe medições acústicas, confira os dados e exporte gráficos para relatórios ambientais. CSV e Excel são lidos localmente em Web Worker. O salvamento opcional guarda as medições normalizadas no PostgreSQL Neon, vinculadas à sua conta Google.

## Executar

Requisitos: Node.js **22.12+** e npm.

```bash
npm ci
cp .env.example .env.local
# Preencha Firebase e DATABASE_URL do Neon. Preserve .env.local se já existir.
npm run db:migrate
npm run dev
```

Abra a URL informada pelo Vite. Sem configuração Firebase, a página explica a pendência e mantém o login desabilitado. Não há autenticação simulada na aplicação de produção.

## Firebase Authentication

1. Crie ou selecione um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Registre um aplicativo **Web** em Configurações do projeto. Copie `apiKey`, `authDomain`, `projectId` e `appId` para as variáveis correspondentes de `.env.local`:

   ```dotenv
   VITE_FIREBASE_API_KEY=valor-do-seu-projeto
   VITE_FIREBASE_AUTH_DOMAIN=dominio-do-seu-projeto
   VITE_FIREBASE_PROJECT_ID=id-do-seu-projeto
   VITE_FIREBASE_APP_ID=id-do-seu-aplicativo-web
   ```

3. Em **Authentication → Sign-in method**, habilite **Google** e configure o e-mail de suporte.
4. Em **Authentication → Settings → Authorized domains**, autorize `localhost` e o domínio da hospedagem. Projetos recentes podem não incluir localhost automaticamente.
5. Reinicie o Vite. Permita popups e armazenamento local no navegador.

Qualquer conta Google autenticada pode acessar. A aplicação usa somente Authentication, sem Firestore ou Storage. Nunca coloque chaves privadas de service accounts no frontend. `.env.local` é ignorado pelo Git; `.env.example` contém variáveis vazias.

Validação real: entrar com Google, conferir nome/foto/e-mail, recarregar e verificar persistência, sair e confirmar redirecionamento, tentar acessar `/` sem sessão. Esses passos exigem configuração e conta reais; mocks dos testes não os substituem.

## Como usar

1. Selecione ou arraste um Excel ou CSV. O nome e o estado do arquivo aparecem imediatamente.
2. Quando as colunas forem reconhecidas, a prévia é gerada automaticamente. Em planilhas com blocos Tempo (s)/dB, confira os pontos detectados e clique em **Gerar gráfico**. Quantidade de pontos e duração são variáveis.
3. Use **Cancelar importação** para descartar o arquivo pendente. Se já houver uma série no gráfico, ela será mantida.
4. Depois de gerar, o painel **Arquivo em análise** mostra qual arquivo está ativo. **Trocar arquivo** inicia outra importação e **Remover arquivo** limpa a série da sessão.

A escolha de aba só aparece para planilhas com várias abas. Quando uma coluna não é reconhecida, a tela pede somente essa escolha. Os demais campos ficam em **Ajustar leitura do arquivo**; a data de referência aparece apenas para arquivos com horários sem data.

No gráfico, escolha **Ponto de medição** quando houver vários pontos. Cada um mantém título, período e informações da figura ao alternar. O período e o título podem ser alterados em **Ajustar período e título**; dados de localização, data inicial e logotipo ficam em **Informações da figura**. Abra **Prévia da figura exportada** para conferir a composição completa. PNG e SVG permanecem na barra do gráfico.

As setas ao lado do seletor avançam/voltam entre pontos e param nas extremidades. Explicações ficam nos ícones de ajuda: passe o cursor, use foco pelo teclado ou toque no celular; Escape ou toque fora fecha a ajuda.

## Perfil e análises salvas

- **Meu perfil:** nome/foto/e-mail do Google e preferências de fuso/unidade para novas importações. Alterar preferências não reinterpreta medições já abertas ou salvas.
- **Salvar análise:** salva somente o ponto selecionado, suas medições, metadados e configuração da figura. **Salvar alterações** atualiza título, período, informações da figura e logotipo. Os demais pontos continuam apenas na sessão até serem salvos individualmente; reabrir pelo histórico recupera somente o ponto salvo.
- **Minhas análises:** histórico paginado de sua conta, com Abrir e Excluir. Excluir remove os metadados e blocos de medições por cascata no banco.
- **Fechar análise:** remove apenas a cópia do workspace; a versão salva continua no histórico.
- O arquivo original Excel/CSV e as células originais dos diagnósticos não são enviados ao Neon. Guardamos somente os dados necessários para reabrir a análise, incluindo razões e números de linhas inválidas. Um logotipo opcional é normalizado localmente para PNG de até 512 px/128 KiB e enviado somente ao salvar.

## Neon, Prisma e criação das tabelas

1. Crie o projeto no Neon. Ele normalmente já contém um banco padrão; use a conexão mostrada em **Connect**.
2. Preencha `DATABASE_URL` em `.env.local`. A variável é exclusiva do servidor: **não use prefixo VITE_** e não versione seu valor.
3. Em um **banco novo**, execute `npm run db:migrate`. Este é o gatilho explícito da criação das tabelas. Login, importação e build não executam migrações.
4. Reinicie `npm run dev` depois de alterar variáveis.

O projeto usa **Prisma ORM 7** com adaptador Neon. Os modelos estão em `prisma/schema.prisma`, as migrações SQL versionadas em `prisma/migrations/` e a configuração da CLI em `prisma.config.ts`. O comando `db:migrate` chama `prisma migrate deploy`: aplica somente migrações pendentes e pode ser repetido. A migração inicial cria o schema **decicharts**, com `profiles`, `analyses`, `analysis_chunks` e o histórico legado `schema_migrations`. O histórico atual é controlado por `_prisma_migrations` no mesmo schema.

**Banco da versão anterior, com tabelas/dados existentes:** execute `npm run db:baseline` uma vez, antes de `db:migrate`. Esse comando compara os modelos ao banco, registra a migração inicial como já aplicada e confere contagens e fingerprints antes/depois, sem recriar tabelas. Isso **já foi realizado no Neon configurado durante esta implementação**; os dados existentes foram preservados. A baseline exige um banco compatível e não serve para inicializar um banco vazio.

Comandos disponíveis:

| Comando | Finalidade |
|---------|------------|
| `npm run db:generate` | Gerar o Prisma Client tipado a partir dos modelos |
| `npm run db:migrate` | Aplicar migrações pendentes no banco configurado |
| `npm run db:status` | Conferir o histórico de migrações |
| `npm run db:check` | Comparar estrutura do banco e modelos, sem alterar dados |
| `npm run db:studio` | Abrir o Prisma Studio para consultar e editar dados |

O Client é gerado automaticamente na instalação e no build, em `server/generated/prisma/`, que não é versionado. **Gerar o Client não cria tabelas.** A aplicação usa `DATABASE_URL`; a CLI usa `DATABASE_URL_UNPOOLED` quando informada. Em Neon, quando a conexão direta não é informada, a CLI deriva o host direto removendo `-pooler` do host da conexão. As duas URLs devem apontar para o mesmo banco/branch.

Para futuras alterações de estrutura, use um **banco ou branch Neon de desenvolvimento**: altere `prisma/schema.prisma`, execute `npm run db:migrate:dev -- --name nome_da_alteracao`, revise e versione o SQL gerado. O comando de desenvolvimento pode pedir reset ao detectar divergências; não o execute no banco que contém os dados do usuário. Em produção, aplique o SQL revisado com `npm run db:migrate`. Restrições PostgreSQL `CHECK` são mantidas no SQL das migrações, pois não são representadas pelos modelos Prisma.

O repositório usa consultas tipadas do Prisma e transações para salvar/publicar blocos. A única consulta SQL da aplicação é uma trava de linha parametrizada (`SELECT ... FOR UPDATE`) para proteger gravações simultâneas. As verificações administrativas da baseline também usam SQL parametrizado.

A API valida a assinatura RS256, emissor, audiência, expiração e provedor Google dos tokens Firebase usando as chaves públicas do Google. `FIREBASE_PROJECT_ID` é opcional; quando vazio, o servidor usa `VITE_FIREBASE_PROJECT_ID`. Não é necessário baixar uma chave privada de service account. O UID é extraído do token verificado e filtra todas as consultas.

Séries são transferidas em blocos de até 5.000 pontos, com até três requisições simultâneas, evitando ultrapassar o limite de corpo das funções da Vercel. A API aceita até 512 KiB por requisição. Uma análise só aparece no histórico depois de conferir todos os blocos, sua ordem, duplicados e contagens. Repetir o salvamento após falha na mesma sessão usa o mesmo ID; não cria outra análise. Rascunhos incompletos com mais de 24 horas são removidos na próxima tentativa de salvar do mesmo usuário.

Rotas da API: `GET/PUT /api/profile`, `GET/POST /api/analyses`, `GET/PATCH/DELETE /api/analyses/:id`, `GET/PUT /api/analyses/:id/chunks/:index`, `POST /api/analyses/:id/complete`. Campos de identidade enviados pelo cliente não determinam propriedade.

## Importação e precisão

- Um arquivo e uma aba selecionada, com vários pontos e um gráfico ativo por vez. A próxima importação só substitui a coleção atual após confirmação quando houver trabalho não salvo.
- CSV, XLSX e XLS binário genuíno; até **20 MiB** e **250.000 medições válidas somadas entre os pontos da aba selecionada**. Cada série mantém o limite de 250 mil registros não vazios. Cabeçalho selecionável nas primeiras 100 linhas. A área física de uma aba Excel também fica limitada a 250.100 linhas para impedir leituras truncadas.
- Blocos adjacentes Tempo (s)/dB são reconhecidos dinamicamente; os IDs nos cabeçalhos são associados à tabela de localização pelo ID, independentemente da ordem. Células mescladas, colunas vazias e extensões diferentes são preservadas. IDs duplicados ou ausentes em vários blocos exigem revisão do arquivo. Não há regra fixa P1–P10 ou duração de 60 segundos.
- Tempo decorrido usa segundos, inclusive frações com precisão máxima de 1 ms. Não é convertido em datas Excel nem ganha uma data fictícia. Data/hora inicial opcional aparece somente como informação da figura.
- Arquivos HTML/XML renomeados como `.xls` devem ser salvos novamente como XLSX ou CSV.
- CSV: delimitador detectado automaticamente, UTF-8/BOM e alternativa Windows-1252. Valores com vírgula decimal em arquivos delimitados por vírgulas devem estar entre aspas.
- Confira aba, cabeçalho, colunas, formato de data, decimal, unidade e fuso antes de confirmar. Colunas ambíguas permanecem sem seleção automática.
- Datas brasileiras, ISO, segundos/milissegundos e datas seriais Excel 1900/1904. Horários separados aceitam `HH:mm[:ss[.SSS]]` ou fração numérica Excel.
- Para arquivos só com horários, informe uma data de referência. Todas as linhas usam essa data; não se deduz mudança de dia. Para vários dias, forneça datas nas linhas.
- Fuso IANA selecionável, inicialmente `America/Recife` ou a preferência salva no perfil. Offsets ISO explícitos preservam o instante; os demais horários usam o fuso escolhido. Mudanças históricas são respeitadas. Horários ambíguos/inexistentes exigem correção ou offset explícito.
- Valores usam o separador decimal escolhido, sem separador de milhar. Zero e negativos não são descartados automaticamente. Células numéricas Excel preservam seu valor.
- Unidade inicial `dB` ou a preferência salva no perfil para a leitura genérica; blocos explícitos dB mantêm essa unidade. Confirme a ponderação em **Ajustar leitura do arquivo** para usar dB(A/C/Z). Uma preferência escrita como dB(A) não comprova ponderação A.
- Linhas vazias são ignoradas; inválidas são contadas e diagnosticadas com a linha original, até 100 exemplos. A prévia visível mostra até 5 registros.
- Duplicados permanecem em ordem original no mesmo instante. A contagem informa ocorrências adicionais, não grupos.
- Mínimo, média aritmética, máximo e Leq estimado são calculados sobre o período selecionado. Não há cálculos normativos, interpolação, preenchimento de lacunas ou suavização. Segmentos retos unem os pontos existentes, sem criar medições.

Medições não salvas ficam apenas na memória. Navegar entre Análise, Minhas análises e Meu perfil preserva o trabalho; recarregar ou sair limpa a cópia local. As ações internas de substituir/fechar arquivo, abrir outra análise, começar uma nova análise, excluir e sair da conta usam confirmações próprias, com cancelamento por Escape e retorno do foco. Apenas fechar ou recarregar a aba mantém o aviso nativo do navegador, quando suportado, conforme preferência confirmada. Esses avisos não protegem contra encerramento forçado do processo. As análises salvas podem ser reabertas pela sua conta. A preferência de tema permanece local; fuso/unidade preferidos ficam no Neon.

### Leq estimado

Origem confirmada pelo usuário: leituras instantâneas de campo feitas com decibelímetro. O aplicativo calcula a média energética dessas amostras, com pesos iguais, e identifica o resultado como **Leq estimado**, sem equipará-lo ao Leq integrado pelo equipamento. 50, 60 e 70 dB com pesos iguais resultam em aproximadamente 65,68 dB, enquanto a média aritmética é 60 dB.

A estimativa exige pelo menos duas leituras selecionadas, série completa igualmente espaçada, sem duplicados ou registros inválidos e unidade em decibéis. Se essas condições não forem atendidas, o indicador fica indisponível com o motivo; gráfico e demais estatísticas continuam disponíveis. Não se inventam durações, não se calcula ponderação temporal a partir de lacunas e não se presume integração de 60 segundos porque existem registros de 1 a 60.

## Interface

Header com navegação integrada, controle de tema e menu da conta. Login, importação, histórico e perfil compartilham a mesma tipografia DM Sans, incluída no bundle sem requisições a serviços de fontes. Explicações de funcionamento ficam nos ícones de ajuda; erros, progresso e resultados de ações continuam visíveis.

## Gráfico e exportação

Filtros são inclusivos: segundos para tempo decorrido, data/hora e fuso para séries absolutas. Ajuste a faixa inferior ou use **Ctrl + rolagem** para zoom; **Restaurar** retorna à série completa. Indicadores e exportação acompanham o intervalo aplicado. A largura permanece responsiva; o eixo X adapta sua escala à duração real, sem descartar dados ou comprimir lacunas.

O gráfico inclui grade principal/secundária, marcações de mínimo/máximo e linha do Leq estimado quando disponível. Séries curtas mostram os pontos; a consulta por cursor usa guias nos eixos e a faixa de zoom inclui uma visão geral. As referências são recalculadas com o filtro e também aparecem na figura exportada; os dados originais não são modificados.

Exporte uma figura completa em **PNG com largura de 3200 pixels** ou **SVG vetorial**: título, empreendimento, ponto, endereço/coordenadas disponíveis, data inicial quando informada, indicadores, gráfico e identificação da estimativa. Layout base de 1600 × 1000, altura ampliada quando o conteúdo exigir; PNG em escala 2×. Não se presumem datum, zona ou hemisfério. Campos vazios são omitidos. Intervalos sem medições não podem ser exportados.

Metadados novos usam versão 2 e tipo temporal explícito. Análises antigas sem versão continuam sendo interpretadas como datas absolutas. As tabelas Prisma e a migração inicial permanecem intactas; essa evolução usa os campos JSON existentes.

## Validação

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
npm run test:neon  # Exige TEST_DATABASE_URL exclusivo e diferente da aplicação
```

`npm run dev` serve frontend e API local. `npm run preview` serve apenas o frontend estático e não substitui o servidor da API.

O teste Neon é separado dos testes comuns: cria dois usuários sintéticos e 5.001 medições, testa persistência/isolamento/exclusão e remove seus registros ao final. Requer migração aplicada e conexão de rede. **TEST_DATABASE_URL é obrigatório**; não há alternativa automática para DATABASE_URL. O teste bloqueia o mesmo host/banco da aplicação, incluindo URLs pooled/diretas.

Para preparar o ambiente separado:

1. No dashboard Neon, crie manualmente um branch de desenvolvimento, por exemplo `decicharts-dev`.
2. Copie a conexão desse branch para `TEST_DATABASE_URL` em `.env.local`; mantenha as URLs da aplicação apontando para seu ambiente atual enquanto roda a integração.
3. Se o branch copiar o esquema atual, confira-o; em banco vazio, aplique migrações com uma configuração explícita dedicada ao branch de desenvolvimento.
4. Execute `npm run test:neon`. Nunca use `db:migrate:dev` ou reset no banco com dados reais. Para desenvolvimento cotidiano, use configuração/arquivo de ambiente próprio do branch dev; mantenha as variáveis de produção na hospedagem correspondente.

Nenhum branch é provisionado automaticamente pelo aplicativo. Na entrega de 25/11/2026, a integração de escrita não foi repetida porque não havia TEST_DATABASE_URL separado.

Os testes Playwright usam Chrome em `/usr/bin/google-chrome`. Em outro ambiente, defina `CHROME_PATH` com o executável instalado. O runner inicia Vite em `127.0.0.1:4173` e encerra o servidor ao terminar. Resultados e screenshots dos fluxos ficam em `/tmp/decicharts-*`. A matriz de interface em `tests/browser/interface.spec.ts` captura desktop claro e celular escuro em `.impeccable/review/`, ignorado pelo Git.

A entrada autenticada `tests/browser/fixture.html` é exclusiva dos testes e não integra `dist`. A aplicação de produção continua exigindo Firebase. Os testes do provedor usam mocks apenas nos testes. Os fluxos de conta no navegador usam uma API simulada restrita ao token sintético da fixture; o teste Neon separado verifica o banco real. O login Google real até a API deve ser validado manualmente com uma conta real.

As fixtures versionadas são sintéticas. EXEMPLO.xlsx foi validado localmente em 25/11/2026: dez pontos, 600 medições, nenhum registro inválido e localização associada por ID; o arquivo e seus endereços não foram versionados. Outros layouts específicos de equipamentos ainda podem exigir revisão de leitura. O teste de capacidade cobre 250 mil registros no navegador desktop; tempos dependem da máquina e não garantem desempenho equivalente em celulares.

## Estrutura

```text
api/                         entrada serverless Vercel
server/                      autenticação, validação e repositório Prisma
shared/                      contratos entre frontend e API
prisma/schema.prisma         modelos mapeados às tabelas do Neon
prisma/migrations/           migrações SQL controladas pelo Prisma Migrate
prisma.config.ts             configuração de migrações e conexão direta
scripts/                     CLI Prisma e baseline do banco existente
docs/                        escopo, checklists e progresso
src/app/                     aplicação e rotas
src/components/              layout e componentes shadcn/ui
src/features/auth/           Google e proteção de rotas
src/features/account/        perfil e preferências
src/features/analyses/       workspace e histórico salvo
src/features/file-import/    parsing, worker e prévia
src/features/measurements/   modelos, intervalos e dashboard
src/features/charts/         ECharts e exportação
src/hooks/                   preferência de tema
src/lib/                     Firebase e utilitários
tests/                       testes unitários e de navegador
```

Leia `docs/implementation-plan.md` e `docs/progress.md` antes de continuar o desenvolvimento. O plano é a fonte principal do escopo; atualize checklists somente após implementação e validação.

## Vercel e dependências

Frontend: `npm run build`, saída `dist`. A Vercel também executa a função Node em `api/[...path].ts`; o roteamento preserva arquivos/API antes do fallback SPA. Configure as variáveis Firebase e `DATABASE_URL` nos ambientes correspondentes da Vercel, aplique a migração ao banco escolhido e autorize o domínio no Firebase. Variáveis Vite são incorporadas no build; alterações exigem novo build. **Nenhum deploy foi realizado.** Publicação depende de autorização explícita.

SheetJS usa a distribuição oficial mantida `xlsx@0.20.3` em `cdn.sheetjs.com`. O lockfile registra versões instaladas. Overrides compatíveis de `@grpc/grpc-js` e `effect` corrigem advisories nas árvores transitivas Firebase e Prisma, respectivamente; Firestore não é importado pelo aplicativo.

A API é serverless; o banco é PostgreSQL Neon. Não há armazenamento dos arquivos originais, geração de laudos ou cálculos normativos. Custos e retenção de backups dependem do plano Neon contratado.
