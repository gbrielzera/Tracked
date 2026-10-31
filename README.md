# Tracked

Aplicativo de reviews de músicas, inspirado no Letterboxd. Você pesquisa qualquer música, álbum ou
artista, dá uma nota de 0,5 a 5 estrelas, escreve sua review e acompanha o que outras pessoas
estão ouvindo. Não toca músicas.

Feito com React Native (Expo), TypeScript e Supabase. O plano completo está em [plan.md](plan.md).

## O que você precisa instalar

| Ferramenta | Para quê | Como conferir |
|---|---|---|
| [Node.js](https://nodejs.org) 20 ou mais novo (testado com 24) | Rodar o projeto | `node -v` |
| [Git](https://git-scm.com) | Baixar o código | `git --version` |
| Um celular **Android** com o app de desenvolvimento do Tracked instalado | Ver o app rodando | veja a seção "Instalar o app no celular" |
| Conta no [Expo](https://expo.dev) | Só para gerar o APK do app de desenvolvimento | |

Não precisa de Docker, Android Studio nem Xcode.

## Rodar o projeto

**1. Baixe o código e instale as dependências**

```bash
git clone https://github.com/gbrielzera/Tracked.git
cd Tracked
npm install
```

O arquivo `.npmrc` do projeto já resolve um conflito de versões do React, então não precisa de
nenhuma flag extra.

**2. Crie o arquivo `.env`**

Ele guarda a URL e a chave pública do Supabase e **não vai para o GitHub**. Copie o modelo:

```bash
cp .env.example .env
```

No Windows (PowerShell), use `Copy-Item .env.example .env`.

Abra o `.env` e preencha os dois valores:

```
EXPO_PUBLIC_SUPABASE_URL=https://utzuyvaroyjmaullrbzy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<chave anon do projeto>
```

A chave `anon` fica no painel do Supabase, em **Project Settings > API** (ou no botão **Connect**
do projeto). Ela é pública por definição: quem protege os dados são as regras de acesso do banco.
Se você não tem acesso ao painel, peça a chave para quem criou o projeto.

**3. Inicie o servidor de desenvolvimento**

```bash
npx expo start --dev-client
```

Vai aparecer um QR code no terminal.

**4. Abra no celular**

Com o app de desenvolvimento do Tracked instalado, abra-o e escaneie o QR code, ou digite o
endereço que o terminal mostra. O celular e o computador precisam estar na **mesma rede Wi-Fi**.
Se a rede bloquear a conexão (Wi-Fi de faculdade, por exemplo), use o túnel:

```bash
npx expo start --dev-client --tunnel
```

## Instalar o app no celular

O login com Google e o link de confirmação por e-mail abrem o app pelo endereço `tracked://`, e isso
só funciona num app "de desenvolvimento" gerado pelo EAS. Você gera o APK uma vez e o reutiliza
(só precisa gerar outro se instalar uma biblioteca com código nativo).

```bash
npx eas-cli login
npx eas-cli env:push development --path .env
npx eas-cli build --profile development --platform android
```

O build roda na nuvem e leva de 10 a 20 minutos. No final o terminal mostra um link e um QR code do
APK: abra no celular, baixe e instale (o Android pede para permitir instalar de fontes
desconhecidas).

> O projeto EAS pertence à conta `gbrielzera`. Se você for gerar o APK com **outra conta Expo**,
> rode `npx eas-cli init` antes: ele cria um projeto novo e troca o `projectId` e o `owner` no
> `app.json`.

### APK de demonstração (funciona sem o computador)

O APK de desenvolvimento só abre o app se o `npx expo start` estiver rodando. Para a apresentação,
gere o APK **independente**, que já leva o código dentro:

```bash
npx eas-cli env:push preview --path .env
npx eas-cli build --profile preview --platform android
```

Instale pelo link do build, como no passo anterior. Dois cuidados:

- Ele usa o **mesmo pacote** do app de desenvolvimento, então **substitui** o que está instalado
  (os dados da conta ficam no Supabase, não se perdem). Para voltar ao modo desenvolvimento, instale
  o APK de desenvolvimento de novo.
- O push e o login com Google funcionam igual, pois dependem da mesma conta Firebase e do mesmo
  endereço `tracked://`.

O roteiro de apresentação está em [`docs/roteiro-demo.md`](docs/roteiro-demo.md).

Para testar sem gerar o APK, tente o Expo Go com `npx expo start --go`. **Não foi testado**, e o
login com Google e o link do e-mail provavelmente não voltam para o app por esse caminho.

No iPhone, um app de desenvolvimento próprio exige conta paga da Apple (US$ 99 por ano). Sem ela só
dá para tentar o Expo Go.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor (o mesmo que `npx expo start`) |
| `npx expo start --dev-client` | Inicia abrindo no app de desenvolvimento |
| `npx expo start -c` | Inicia limpando o cache (resolve erros estranhos de build) |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run test:db` | Roda os testes do banco (regras de acesso, feed, limites, rankings) num Postgres local em memória, sem Docker nem Supabase |
| `npm run test:functions` | Testa a lógica das mensagens de push (precisa de Node 22.18 ou mais novo) |
| `npm run test:app` | Testa a lógica do app sem rede: formatação, validação, filtro de palavrões, países, histórico de busca e o provedor do Deezer (com um cliente falso) |
| `npm test` | Roda os três conjuntos de testes |
| `npx expo export --platform android` | Testa se o app compila, sem precisar de celular |

## Estrutura do projeto

```
app/              Telas. No Expo Router, cada arquivo vira uma rota.
  (auth)/           Entrada: boas-vindas, login, cadastro, recuperar senha
  (tabs)/           Barra inferior: feed, trending, pesquisa, perfil
  track/ album/ artist/ user/   Telas de detalhe
src/
  components/       Componentes de interface (botões, estrelas, listas)
  features/         Lógica por assunto: auth, music, reviews, rankings, search, profile
  services/
    music/            Catálogo (Deezer) por trás de uma interface trocável
    supabase/         Cliente do Supabase e tipos gerados do banco
  stores/           Estado da sessão (Zustand)
  lib/ theme.ts     Formatação, validação e o tema visual
supabase/
  migrations/       Banco de dados: tabelas, regras de acesso, funções e rankings
  functions/        Edge Functions: music-info (Last.fm) e delete-account
```

## Backend (só se for criar um projeto Supabase novo)

O projeto atual já está pronto. Siga esta parte apenas se quiser rodar com o **seu próprio**
Supabase. Para isso, crie um projeto em [supabase.com](https://supabase.com) e use o terminal:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Depois publique as funções e guarde a chave do Last.fm (gratuita, em
[last.fm/api](https://www.last.fm/api)). A chave fica só no servidor, nunca no app:

```bash
npx supabase secrets set LASTFM_API_KEY=SUA_CHAVE
npx supabase functions deploy music-info
npx supabase functions deploy delete-account
```

Gere os tipos do banco no **Git Bash** (no PowerShell o `>` grava o arquivo em UTF-16 e quebra o
TypeScript):

```bash
npx supabase gen types typescript --linked > src/services/supabase/database.types.ts
```

No painel do Supabase, configure:

1. **Authentication > Sign In / Providers > User Signups**: ative **Allow manual linking** e
   **Allow anonymous sign-ins**. **Confirm email** está **desligado de propósito** até a apresentação
   do trabalho, para cadastrar contas de teste sem depender de e-mail. **Antes de publicar o app de
   verdade, ligue de novo** (ver "Antes de publicar" no fim).
2. **Authentication > URL Configuration > Redirect URLs**: adicione `tracked://**` e `exp://**`.
3. **Sign In / Providers > Google**: crie um cliente OAuth do tipo **Aplicativo da Web** no
   [Google Cloud](https://console.cloud.google.com), com o redirect
   `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`, e cole o ID e a chave secreta ali. Em
   modo de teste, só os e-mails cadastrados em **Público-alvo > Usuários de teste** conseguem entrar.

O ranking "Mais bem avaliados" é recalculado a cada hora. Para atualizar na hora, rode no
**SQL Editor** do painel: `select public.refresh_rankings();`

## Notificações push (Android)

As notificações dentro do app (sino, lista e contador) funcionam sozinhas. O **push**, aquele aviso
que chega com o app fechado, precisa de configuração extra em contas externas. Tudo é gratuito.

**1. Firebase (envio no Android)**

1. Em [console.firebase.google.com](https://console.firebase.google.com), crie um projeto (pode ser
   ligado ao projeto `Tracked` do Google Cloud).
2. Adicione um app **Android** com o nome de pacote `com.gbrielzera.tracked`.
3. Baixe o `google-services.json` e coloque na **raiz** do projeto, ao lado do `package.json`. Esse
   arquivo é configuração do app e pode ir para o git. Sem ele o app roda normalmente, só que sem
   push (o `app.config.js` só usa o arquivo quando ele existe).
4. Em **Configurações do projeto > Contas de serviço**, gere uma **chave privada** (arquivo JSON).
   Ela é **secreta**: não vai para o git.
5. Envie essa chave para o Expo, que entrega o push ao Firebase:

```bash
npx eas-cli credentials
```

Escolha **Android > development > Google Service Account > Manage your Google Service Account Key
for Push Notifications (FCM V1)** e envie o arquivo da etapa 4.

**2. Servidor (função e webhook)**

Gere um segredo qualquer, que só o banco e a função conhecem:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Guarde e publique a função (sem verificação de JWT, porque ela se autentica pelo segredo):

```bash
npx supabase secrets set WEBHOOK_SECRET=SEGREDO_GERADO
npx supabase functions deploy send-push --no-verify-jwt
```

No painel do Supabase, em **Database > Webhooks > Create a new hook**:

| Campo | Valor |
|---|---|
| Name | `send-push` |
| Table | `notifications` |
| Events | **Insert** |
| Type | Supabase Edge Functions, função `send-push` |
| HTTP Headers | adicione `x-webhook-secret` com o **mesmo** segredo gerado acima |

**3. Novo app de desenvolvimento**

O push usa um módulo nativo (`expo-notifications`), então é preciso gerar o APK de novo e instalar:

```bash
npx eas-cli build --profile development --platform android
```

Ao entrar numa conta, o app pede permissão para notificações e registra o aparelho. Teste com duas
contas: uma segue ou curte a review da outra, e a segunda recebe o aviso. Push **não funciona em
emulador**, e no iPhone exige conta paga da Apple (US$ 99 por ano).


## Antes de publicar

Estas escolhas valem para a fase acadêmica. Se o app virar um produto de verdade:

- **Ligue `Confirm email`** no Supabase (Authentication > Sign In / Providers > Email). Hoje qualquer
  pessoa cria conta com um e-mail que não é dela.
- **Tire o Google Cloud do modo de teste** (ele limita o login a e-mails cadastrados) e revise a
  tela de consentimento.
- **Troque a fonte das descrições**: a chave do Last.fm é só para uso não comercial.
- **Conta Apple paga** para distribuir no iPhone (US$ 99 por ano); sem ela só dá para tentar o Expo Go.
- **Excluir conta** já funciona no app (Editar perfil > Excluir conta) e remove avatar, reviews,
  comentários e curtidas, como as lojas exigem.

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| Erro "Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY" | Falta o `.env` ou ele está vazio. Preencha e reinicie com `npx expo start -c`. |
| O app instalado abre e fecha na hora | O APK foi gerado sem as variáveis do `.env`. Rode `npx eas-cli env:push development --path .env` e gere o APK de novo. |
| O celular não encontra o servidor | Confira se estão na mesma rede Wi-Fi, libere o Node no firewall do Windows ou use `--tunnel`. |
| `ERESOLVE` ao rodar `npm install` | Confirme que o arquivo `.npmrc` existe na raiz com `legacy-peer-deps=true`. |
| Login com Google dá "acesso bloqueado" | O app do Google Cloud está em modo de teste. Adicione o e-mail em **Público-alvo > Usuários de teste**. |
| O link do e-mail abre `localhost` | Ajuste o **Site URL** em **Authentication > URL Configuration** para `tracked://`. |
| "Muitas buscas em pouco tempo" | O Deezer limita cerca de 50 pedidos a cada 5 segundos por IP. Todo mundo no mesmo Wi-Fi divide esse limite. Espere alguns segundos. |
| Tudo falha com erro de conexão ao banco | O Supabase gratuito pausa o projeto após 7 dias sem uso. Reative em **Restore project** no painel. |
| Ranking vazio | Um item só entra com pelo menos 2 avaliações, e a lista atualiza de hora em hora. |

## Créditos e termos

- Catálogo, capas e charts: [API do Deezer](https://developers.deezer.com/api), de uso gratuito sem
  chave.
- Descrições de artistas, álbuns e faixas: [Last.fm](https://www.last.fm/api). A chave gratuita é
  para uso **não comercial**; se o projeto virar um produto comercial, troque a fonte (a interface
  `MusicProvider` em `src/services/music` existe para isso).
