# Roteiro de apresentação do Tracked

Duração prevista: **8 a 10 minutos**. Tudo roda num celular Android com o APK de demonstração
(perfil `preview`, ver o README). Não precisa de computador na hora.

## Na semana anterior

- [ ] **Reative o Supabase.** O plano gratuito pausa o projeto após 7 dias sem uso. Se estiver
      pausado, abra o painel e clique em **Restore project** (leva alguns minutos).
- [ ] Gere o APK de demonstração e instale: `npx eas-cli build --profile preview --platform android`.
- [ ] Crie **duas contas de verdade** (Google ou e-mail), por exemplo uma sua e uma de um colega,
      cada uma com @, foto e país. Não escreva as senhas neste arquivo.
- [ ] Faça as duas contas **avaliarem as mesmas 4 ou 5 músicas** com notas diferentes. Um item só
      entra em "Mais bem avaliados" com pelo menos 2 avaliações de contas (visitantes não contam).
- [ ] Monte o **Top 5 artistas** da conta principal e deixe um comentário em uma review.
- [ ] Crie **uma conta descartável** só para mostrar "Excluir conta" (não use a principal).

## 30 minutos antes

- [ ] Rode no SQL Editor do Supabase: `select public.refresh_rankings();` (o ranking é recalculado
      a cada hora; isso atualiza na hora).
- [ ] Abra o app, entre na conta principal e **permita as notificações**. Confira com
      `select count(*) from public.push_tokens;` que o aparelho aparece.
- [ ] Teste a internet **do celular**. Se o Wi-Fi do local bloquear ou for lento, use os dados móveis.
- [ ] Deixe a bateria carregada e desligue o modo "Não perturbe" (ele esconde as notificações).

## Roteiro

| Tempo | O que mostrar | O que dizer |
|---|---|---|
| 0:00 | Tela de boas-vindas | "Tracked é um Letterboxd de música: você avalia faixas, álbuns e artistas, e acompanha o que seus amigos acham." |
| 0:30 | **Continuar como visitante**, abrir o Trending e uma review | "Dá para explorar sem conta. Visitante comenta até 3 vezes por dia, mas não avalia, curte nem segue. O limite é garantido pelo banco, não só pela tela." |
| 1:30 | Tentar avaliar como visitante e tocar em "Criar conta" | "O convite para criar conta mantém os comentários que ele já fez." Entre na conta principal. |
| 2:00 | **Pesquisa**: digitar "avril" | "Os resultados aparecem enquanto digita. A aba Tudo mostra um pouco de cada tipo, e os filtros refinam." Toque em "Ver todos". Volte e mostre o **histórico** de buscas. |
| 3:00 | Abrir uma música, dar **nota com meia estrela** e publicar uma review | "Uma review por pessoa por item, editável. Dá para arrastar o dedo nas estrelas." Mostre o resumo com **editar/excluir**. |
| 4:00 | **Trending > Em alta**, trocar o país (ex.: Portugal) | "O Deezer só tem o ranking global, então usamos as playlists oficiais de cada país." |
| 4:45 | **Trending > Mais bem avaliados** | "Ranking da própria comunidade, pela média bayesiana: uma nota 5 sozinha não passa na frente de um item com muitas notas boas." |
| 5:30 | **Perfil**: foto, bandeira, Top 5, contadores; abrir *Editar perfil* e mostrar **Reviews privadas** | "Com o interruptor ligado, nenhuma review aparece para os outros. A regra está no banco (RLS), e foi testada." |
| 6:30 | **Notificações**: com o app **fechado**, a segunda conta segue ou curte uma review | Mostre o **push** chegando, toque nele e mostre que abre a tela certa. Depois abra o sino e o contador zerando. |
| 7:30 | Puxar a tela para atualizar no Feed | "Feed só com quem eu sigo, paginado sem pular nem repetir." |
| 8:00 | (Opcional) Entrar na conta **descartável** e usar **Excluir conta** | "Exigência das lojas: apaga avatar, reviews e comentários de verdade." |
| 8:30 | Encerrar | Stack: Expo/React Native, Supabase (Postgres, RLS, Realtime, Edge Functions), Deezer e Last.fm. 184 testes automáticos. |

## Se algo der errado

| Problema | O que fazer |
|---|---|
| Busca ou Trending vazios, ou "muitas buscas" | O Deezer limita ~50 pedidos a cada 5 s por IP. Todo mundo no mesmo Wi-Fi divide esse limite. Espere 10 s, puxe a tela para atualizar ou troque para dados móveis. |
| Tudo dá erro de conexão | O Supabase pausou. Painel > **Restore project** e aguarde. Se não der tempo, mostre os vídeos ou capturas de tela de reserva. |
| O push não chega | Confira se o app foi aberto uma vez logado e se o modo "Não perturbe" está desligado. Plano B: mostre o sino com o contador em tempo real e **avise** que o push não chegou. |
| Só há um celular | A segunda conta pode agir de outro aparelho ou do navegador. Se não houver como, simule a ação no SQL Editor **dizendo que é uma simulação** (o gatilho e o push percorrem o mesmo caminho). |
| Login com Google dá "acesso bloqueado" | O app do Google Cloud está em modo de teste: o e-mail precisa estar em **Público-alvo > Usuários de teste**. Use o login por e-mail. |

## Preparado para as perguntas

- **Por que Deezer e não Spotify?** Apps novos do Spotify ficam em modo de desenvolvimento, com
  limite de usuários. O Deezer lê sem chave.
- **Como a privacidade é garantida?** Pela RLS do Postgres: a consulta direta à API também não
  devolve reviews privadas (há teste para isso).
- **E o iPhone?** Para instalar um app próprio é preciso a conta Apple paga; sem ela, só pelo Expo Go.
- **O que ficou fora?** Tocar músicas (de propósito), publicação nas lojas e a confirmação de e-mail,
  desligada só até a apresentação.
