# RACHA! 🏁

**A mesa é o grid.** Kart 2D de time-trial pra 7 celulares numa mesa — single-player
que evolui pra multiplayer assíncrono sem servidor (GitHub API como banco).

Jogo inteiro em `index.html` (vanilla JS + canvas 2D, zero libs). Deploy = GitHub Pages.

## Como a mesa joga
1. Todo mundo abre o link do grupo (com `#t=github_pat_…` no final — ou cola o token na home).
2. Mesma **sala** pra todo mundo (ex.: `BATATA-7`) — a sala é a seed: mesa inteira na mesma pista sorteada.
3. Corre quando quiser (1–2 min por corrida). Tempo publica sozinho no ranking ao vivo.
4. `CORRER DE NOVO` avança a rodada → pista nova, mesma pra todos.

**Controles:** tocar/segurar esquerda/direita pra virar (aceleração automática).
**Drift:** tap-tap e segura pro mesmo lado; soltar o dedo libera o mini-turbo (azul → laranja → roxo).
**Largada:** toque no instante do VAI! = boost.

## Ritual de versão
Badge de versão na home = contrato de sincronia. Mudou o sorteio/física → mesa
inteira dá refresh e confere o badge igual.

## Infra (padrão validado no GAUNTLET)
- Scores no diretório `s/`, dados no **filename**:
  `SALA__R01__0083450__LUCA__k7f2.json` (ms com 7 dígitos antes do nome →
  1 listagem = leaderboard ordenado). Presença: `SALA__J__LUCA.json`.
- Token fine-grained (este repo, Contents RW) viaja no fragmento `#t=` da URL —
  **nunca** no código (secret-scanning revogaria).
- Ghost do PB gravado localmente (10 Hz, delta binário) e publicado junto do score.
- Poll de 10 s só no lobby/ranking; zero rede durante a corrida.
- PWA network-first: nunca serve versão velha com rede.

## Tuning ao vivo (console)
`RACHA.TUNE` expõe os números. Regra de ouro da 1ª noite, nesta ordem:
`dampLatDrift` (2.5) → `turnRate` (2.6) → `turboT` (0.5/1.1/1.9).
`RACHA.kart()`, `RACHA.track()`, `RACHA.S` pra depurar.

## Docs
- `DESIGN.md` — design doc do conselho (identidade, handling, pista, dados).
- `BLUEPRINT.md` — blueprint de implementação + lista de armadilhas.

## Limpeza entre noites
A listagem da API trunca em 1000 arquivos. De vez em quando, apagar os `s/*.json`
de noites antigas (ou usar sala nova por noite, que é o ritual natural).
