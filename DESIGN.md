# RACHA! — Design Doc Final (v1.0, definitivo)

Decisões do presidente: as críticas venceram em todos os 10 conflitos apontados. Raiz resolvida: **um único esquema de controle (portrait, um polegar), um único dono da largura da pista (120px), rede autenticada com poll pausado em corrida, escopo v1 cortado com disciplina.** Onde crítica e conselheiro divergem abaixo, o número da crítica é o canônico.

---

## 1. Nome + Tagline

**RACHA!** — gritável, PT-BR, é literalmente o que o grupo faz na mesa.
Tagline: **"A mesa é o grid."**
Logo em Bungee, vermelho `#D94A38` com hard-shadow `#2B2620` (3,3), sobre faixa diagonal.

Pistas têm nome próprio gritável: `PALAVRA-DÍGITO` (BATATA-7, JACARÉ-3) — ver §5.

---

## 2. Identidade Visual

**Vibe: "Rali de Pôster Anos-60"** — papel creme, tinta chapada, poeira. Oposto deliberado do GAUNTLET (claro vs. escuro, quente vs. frio, tinta chapada vs. glow). **Proibido:** blur, glow, neon, magenta/ciano.

### Paleta (canônica, completa)

| Hex | Uso |
|---|---|
| `#F2E8D5` | papel-creme: fundo de UI, faixas, highlight |
| `#2B2620` | tinta: contorno universal, texto, sombras duras (nunca `#000`) |
| `#57534E` | asfalto |
| `#8FA65A` | grama oliva (off-road) |
| `#E0C48A` | areia/terra |
| `#C9B58F` | poeira (partículas) |
| `#D94A38` | vermelho: zebra, logo, avisos, delta positivo |
| `#6A994E` | delta negativo (verde skin 4 reaproveitado) |
| `#E8B23A` | dourado: boost, chevrons, medalhas, turbo máximo, botão CORRER |

**8 skins** (roundel numerado obrigatório — cor nunca é o único sinal):
1 `#D94A38` · 2 `#3E7CB1` · 3 `#E8B23A` · 4 `#6A994E` · 5 `#7D5BA6` · 6 `#E0762F` · 7 `#2F8F83` · 8 `#D96A9B`

### Fontes (Google Fonts, únicas dependências externas)
- **Bungee** (400): logo, countdown, "VOLTA 2/3", pódio, avisos gigantes.
- **Rubik** (600, 800): HUD, nomes, tempos (`font-variant-numeric: tabular-nums`), leaderboard.
- Todo título: texto desenhado 2× (tinta com offset 3,3 por baixo, cor por cima). Zero blur.

---

## 3. Câmera, Orientação, Controles (decisão única)

### Orientação: PORTRAIT, sempre. Uma mão, um polegar.
Layout lógico de referência 390×844. `viewport-fit=cover`, `100dvh`, `touch-action:none` no canvas, `overscroll-behavior:none`, `user-select:none`, `preventDefault` em touchmove, canvas em resolução física (`width = cssWidth × devicePixelRatio`). Wake lock (`navigator.wakeLock`) em corrida e ranking. `visibilitychange` pausa e oferece retomar.

### Câmera: top-down rotacionada
- Kart ancorado em **(50% largura, 68% altura)** da tela; pista vem de cima.
- **A câmera rastreia a direção da VELOCIDADE, não do chassi** (vence Crítica 2.2): `camAngle` lerpa para `atan2(vy,vx)` com fator `1 − exp(−8·dt)`. Em drift o kart gira na tela mostrando o ângulo de escorregão (o espetáculo), mas o mundo aponta pra onde você vai.
- **Zoom dinâmico acoplado à curvatura** (vence Crítica 2.3): 1.0 parado → 0.85 na vmax em reta (lerp 3/s). Amostre a curvatura da centerline nos próximos 300px; se raio < 180px, lerpe zoom até **0.72**.
- **Look-ahead 60px** na direção da velocidade, deslocado 30px extra pro lado **interno** da curva que vem (lerp 5/s). Em drift, +25px pro lado externo.
- Shake de 4px/120ms em colisão com limite do mundo.

### Controles (esquema único — resolve Críticas 1.1 e 2.1)
- Zona de toque = **metade inferior da tela** (nunca os 24px inferiores — home indicator). Dividida em esquerda/direita.
- **Tocar/segurar esquerda = virar à esquerda; direita = direita.** Aceleração 100% automática. Sem freio, sem ré.
- Steer interno analógico: alvo ±1, attack **80ms**, release **120ms** (taps = micro-correções).
- **DRIFT = double-tap-and-hold**: soltar e re-tocar o MESMO lado em **≤150ms**, mantendo pressionado. Hop visual de 90ms (squash/stretch) marca a entrada. Soltar o dedo libera o mini-turbo. Chain em S: "tap-tap esquerda, tap-tap direita". O hold de 400ms do C3 e o segundo dedo do C1 estão **descartados**.
- Multi-touch rastreado por `touch.identifier` mesmo assim (dedos apoiados não podem quebrar o input).
- **Largada** (vence Crítica 1.4): durante countdown e **400ms pós-GO**, qualquer toque conta APENAS como tentativa de boost de largada; steering ignorado. Janela ±150ms do GO = **+130 px/s**.
- Setas fantasma translúcidas na zona de toque só nos primeiros 10s da primeira sessão.

---

## 4. Handling — números iniciais (canônicos)

Unidades: px de mundo. Kart 28px de comprimento. **Largura de pista canônica: 120px base** (dono do número: este doc — resolve Crítica 1.2).

| Parâmetro | Valor |
|---|---|
| vmax base | **340 px/s** |
| Aceleração | `dv = (vmax_efetiva − v) · 1.8 · dt` |
| Taxa de curva (grip) | **2.6 rad/s**, escalada por `min(1, v/120)` |
| Custo de curvar | `\|steer\| > 0.5` → vmax efetiva ×**0.88** |
| Grip lateral | velocidade decomposta forward/lateral; lateral amortecido `exp(−8·dt)` normal, `exp(−2.5·dt)` em drift ← primeiro número a afinar |
| Drift: taxa de curva | **3.4 rad/s**; chassi aponta **0.45 rad** pra dentro do vetor velocidade; vmax ×0.94 |
| Mini-turbo (retunado — Crítica 2.5) | **0.5s → azul** (+70 px/s por 0.9s) · **1.1s → laranja** (+110 por 1.2s) · **1.9s → roxo** (+150 por 1.5s). Roxo deve sair 1-2×/volta pra jogador bom |
| Carga em drift aberto | continua carregando enquanto `\|steer\| > 0.3` |
| Anti-cheese | `\|steer efetivo\| < 0.3` por 0.5s cancela a carga sem turbo |
| Boost pad | **+160 px/s** instantâneo, decai linear em 1.3s |
| Boost de largada | **+130 px/s**, janela ±150ms do GO |
| Teto duro de velocidade | **560 px/s** (todos os boosts empilham até aqui) |
| Off-road (grama/areia) | vmax ×**0.45**, desaceleração `exp(−4·dt)` até o teto novo; jitter visual 1.5px |
| Paredes | só nos limites externos do mundo: refletem componente normal ×**0.35** + shake |
| Encalhe | v < 30 px/s por 1s → respawn no centro da pista no último checkpoint, fade 400ms |
| dt | clampado a 50ms, física em passo semi-fixo (feel idêntico 60/120Hz) |

Sanidade geométrica (fecha com §5): raio de curva em grip ≈ 115px, em drift ≈ 94px; o gerador garante raio mínimo de centerline de 110px → hairpin justo mas fechável em drift perfeito.

Ordem de tuning pós-deploy: (1) amortecimento lateral do drift (2.5), (2) taxa de curva base (2.6), (3) tempos de carga do turbo.

---

## 5. Pista

### Nome = seed
Sala/pista: `PALAVRA-DÍGITO` sorteada de lista embutida de 64 palavras PT-BR (BATATA, JACARÉ, CHURRASCO, PICANHA, FUSCA, GAMBÁ, …) + dígito 0-9. String → **xmur3 → mulberry32**. Campo de sala aceita qualquer texto (vira seed igual); o botão "SORTEAR" só sorteia da lista. Seed da rodada R: `xmur3(SALA + "#R" + rodada)`. Jogar solo = sala de 1. Primeira sessão solo de cada jogador usa **OVAL-0** (seed constante `"0"`, gerador com parâmetros mansos) como warm-up — nunca em sala (Crítica 1.10).

### Algoritmo de geração (prosa precisa)
1. **Pontos de controle**: sorteie N ∈ [10,14] ângulos ordenados no círculo; raio de cada ponto = `R_base · uniforme(0.55, 1.0)`. R_base dimensionado para centerline final de **6.000–9.000px** (volta de 20-30s a ~300px/s média). Radial-monótono → sem auto-interseção grossa.
2. **Retão obrigatório**: escolha 3 pontos consecutivos, alinhe-os quase colineares com raio igual → reta de 25-30% do perímetro. Linha de largada no meio dela.
3. **Hairpin**: force ≥1 ponto com fator de raio < 0.62.
4. **Chicane obrigatória** (vence Crítica 2.6): escolha 1 arco médio (fora do retão e do hairpin) e desloque 2 pontos intermediários **±70px perpendicular** à direção do arco, alternando o lado → garante ≥1 complexo esquerda-direita por pista.
5. **Spline**: Catmull-Rom fechada pelos pontos → amostrada em **400-600 pontos equidistantes**. Cada amostra: `{x, y, largura, tangente, distAcum}`.
6. **Largura por amostra**: base **120px**; nos trechos de curvatura alta afunila até **85px** mínimo; no retão alarga até **145px**. Transições suavizadas (média móvel de ~15 amostras).
7. **Validação** (re-roll determinístico com `seed+1` interno até passar; converge em 1-3 tentativas):
   a. distância mínima entre segmentos não-adjacentes > 2.5× largura máxima;
   b. **raio de curvatura mínimo da centerline ≥ 110px** (Crítica 2.4 — mata curva infazível);
   c. existem curvas pros dois lados.
8. **Elementos ancorados na centerline** (posição = distAcum + offset lateral, tudo via PRNG da seed):
   - **3 boost pads**: 1 na reta principal ("de graça"), 2 na saída de curvas fortes em linha de risco (borda externa).
   - Off-road automático: fora da largura = grama.
   - **Sem lama, sem obstáculos móveis, sem itens no v1.**

### Física de pista
Posição do kart → projeção na centerline (busca local a partir do índice do frame anterior, O(1)) → distância lateral vs. largura decide on/off-road. A `distAcum` dá progresso contínuo, posição relativa e alimenta o score.

### Voltas, checkpoints, invalidação (resolve Críticas 1.8 e 2.7)
- **3 voltas**, corrida de 60-90s.
- **Sistema único: 6 checkpoints** equidistantes pela centerline. Volta conta ao cruzar os 6 em ordem + linha de chegada. Agrupados 2-a-2 = **3 setores de timing** por volta.
- **Em jogo, NUNCA "volta inválida"**: 2s fora da sequência de checkpoints → fade 400ms + teleporte pro último checkpoint válido (a punição é o ~2s perdidos). A validação completa da ordem é só **filtro de publicação** no leaderboard, invisível pra quem joga honesto.

---

## 6. Assets Canvas (spec desenhável)

Tudo por código. Kart e texturas pré-renderizados 1× em offscreen canvas a 2× e blitados rotacionados.

### Kart (espaço lógico 32×24, legível a 30px) — spec do C4, canônica
1. Sombra: elipse 30×14, `rgba(43,38,32,.25)`, offset (0,+2).
2. Rodas: 4 rects arredondados 7×5 `#2B2620`, salientes pra fora do corpo; dianteiras rotacionam ±20° com o steer.
3. Corpo: trapézio 26×16 (traseira 16 → frente 10, nariz triangular 4px), fill = skin, contorno 2px `#2B2620`, `lineJoin:'round'`.
4. Highlight: traço creme 1.5px na borda esquerda.
5. Roundel: círculo r=5 creme, contorno tinta, número em Bungee 7px `#2B2620`.
6. Piloto: capacete creme r=4.5 atrás do roundel, faixa 2px na cor da skin, visor = arco escuro frontal.
7. Escape: 2 quadrados 2×2 cinza na traseira.
8. Inclinação visual: +0.12 rad extra na direção do steer; em drift, chassi renderizado a 0.45 rad do vetor velocidade.

### Pista (render canônico = strip de quads — resolve Crítica 1.6)
- **Asfalto**: triangle-strip/quads da centerline usando a **largura por amostra** (fill `#57534E`), bordas com contorno tinta 2px. `stroke` com lineWidth fixo está **proibido** — não faz largura variável.
- Linha central tracejada creme (segmentos 12×2 a cada 22px de distAcum).
- **Zebra**: onde raio < 200px, rects alternados 10×6 `#D94A38`/`#F2E8D5` na borda externa, seguindo a normal — sinaliza curva forte.
- **Fundo**: `#8FA65A` com 500 speckles 1-2px em 2 tons ±10% (posições do PRNG), pré-renderizado em offscreen tile. Elipses de areia `#E0C48A` fora das curvas.
- **Largada**: faixa quadriculada 2×10 células 8×8 tinta/creme + faixa creme "START" em Bungee.
- **Boost pad**: 3 chevrons empilhados `#E8B23A`, contorno tinta, gradiente animado por fase.

### Efeitos (arrays com cap)
- **Marca de pneu**: 2 polilinhas (rodas traseiras), `rgba(43,38,32,.35)` 2.5px, fade 2s, cap 120 pts/kart. Ativa em drift.
- **Faíscas de turbo**: quadrados 2-3px ejetados, vida 300ms, encolhendo; cor por estágio `#3E7CB1` azul → `#E0762F` laranja → `#E8B23A` dourado (dourado = recompensa máxima).
- **Poeira off-road**: círculos `#C9B58F` r 2→6, alpha .5→0, spawn 40ms.
- **Linhas de velocidade**: 6 radiais por 300ms ao pegar boost + zoom 0.80 por 300ms.
- **Confete**: rects 3×6 nas 8 cores de skin, queda senoidal com rotação — só na tela de ranking.
- **Ghost**: `globalAlpha 0.45`, **sem sombra**, nome flutuante em Rubik 10px.

### HUD (portrait)
Topo (dentro de `env(safe-area-inset-top)`): `VOLTA 2/3` esq · tempo corrente centro (Rubik 800 tabular, o maior número da tela) · delta vs. ghost de referência dir (`+0.8` vermelho / `−0.3` verde). **Nunca mostrar posição fake.** Minimapa 72px fixo (sem rotação) no canto sup. direito: traço da pista + ponto do jogador + pontos dos ghosts. Terço inferior: zero UI.

### Áudio (WebAudio 100% sintetizado)
`AudioContext` desbloqueado no primeiro toque da HOME (iOS). Motor = oscilador com pitch acoplado à velocidade; skid em drift; beeps de countdown (3 curtos + 1 longo agudo, altos — sincronizam a mesa acusticamente); fanfarra de pódio local. `navigator.vibrate`: colisão 60ms, boost 20ms, PB triplo (iOS não vibra → todo evento tem som + flash; nunca só vibração).

---

## 7. Pontuação com profundidade

- **Ranking da corrida = tempo total (ms). Ponto.** Profundidade entra como leitura e bônus, nunca corrompe a clareza.
- Gravado em TODA corrida: tempo total, 3 tempos de volta, 9 tempos de setor, drift score, flag volta limpa, acerto da largada.
- **Drift score 0-100**: Σ(duração do drift × ângulo mantido × bônus de saída na tangente), normalizado pelo comprimento da pista.
- **Volta limpa**: sem tocar off-road nem parede.
- **Pós-corrida** (resolve Crítica 2.8b): destaque gigante em Bungee = **delta vs. o jogador imediatamente acima** ("FALTOU 0.4s PRO RAFA"), colado no botão CORRER DE NOVO. Abaixo: breakdown de setores com delta por setor vs. esse mesmo jogador ("perdeu 0.8s no setor 2"), melhor volta, drift score, selo de volta limpa.
- **Ranking da noite**: pontos por rodada **10/8/6/5/4/3/2(/1)**, computados client-side a partir da listagem de arquivos. Bônus +1 melhor volta / +1 melhor drift: **v2**.

---

## 8. Escopo EXATO do one-shot v1

### ENTRA (v1 — um deploy)
- Corrida completa: física §4, câmera §3, controle §3, 3 voltas, checkpoints/teleporte §5.
- Gerador procedural com validação, nomes PALAVRA-DÍGITO, OVAL-0 de warm-up (só primeira sessão solo).
- Identidade visual completa §2/§6, HUD, áudio sintetizado, vibração, wake lock, safe-areas.
- **Time-trial da mesa com leaderboard via GitHub** (infra validada): entrar na sala, presença no lobby, publicar score, listar ranking da rodada + da noite. Regra de publicação: só se bater o próprio melhor da rodada (novo PB substitui o anterior via SHA).
- **Ghost local do próprio PB** (gravador sempre ligado, formato §9 fixado desde o dia 1) + **2 pacer-ghosts** = a centerline percorrida em tempo fixo, tempos-alvo `comprimento/235` e `comprimento/260` px/s (zero IA — resolve Críticas 1.9 e 2.8a; a rodada 1 nunca é vazia).
- Boost de largada, boost pads, mini-turbo 3 estágios, marcas de pneu, partículas, confete no ranking.
- Onboarding: link → nome + sala (≤2 inputs, nome em localStorage) → controle do kart em <15s.

### FICA PRA v2+
- **v2**: lama na pista, revelação de pódio sincronizada (com timeout de 60s pós-primeiro-finisher OU toque do host — nunca gatilho "todos postaram" puro, Crítica 1.10), bônus de pontos, dials de dificuldade por rodada.
- **v3**: download dos ghosts top-3 da rodada (máx. 3 + seu PB na tela), toasts de ultrapassagem ("RAFA TOMOU SEU 2º LUGAR"), validação anti-cheat leitora completa com flag visual.
- **v4**: GP formal de 4 corridas com largada sincronizada por timestamp (offset via header `Date` da API).
- **Nunca**: itens/armas, posições ao vivo, chat, espectador, contas, IA adversária, editor de pistas, moderação.

### Rede (resolve Crítica 1.5 — inegociável)
- **Token fine-grained embutido no fonte**, escopo contents-RW num repo público dedicado só de scores (risco aceito entre 7 amigos; 5.000 req/h autenticado).
- Poll da listagem: **10s** em LOBBY e RANKING. **ZERO poll durante a corrida.** Fetch de ranking dispara 1× ao cruzar a linha. Cache-bust só no fim da rodada. (7 celulares × 360 req/h ≈ 2.520/h — folga.)

---

## 9. Esquema de dados

### Diretório único `s/` no repo de scores; dados no filename

```
s/BATATA-7__J__LUCA.json                      ← presença (join na sala)
s/BATATA-7__R01__0083450__LUCA__k7f2.json     ← score
   sala        rodada  ms 7díg  nome  checksum
```
- ms zero-padded 7 dígitos ANTES do nome → **1 listagem alfabética filtrada por prefixo `SALA__R01__` = leaderboard ordenado**, sem abrir arquivo.
- Rodada 2 dígitos. Nome 3-6 chars A-Z0-9. Checksum = 4 chars de `hash(sala+ms+nome+primeiros 64 bytes do ghost+salt)` — mata edição casual de URL.
- 1 arquivo por jogador/rodada; PB novo deleta o anterior (DELETE via SHA).
- **Rodada corrente** = maior `Rnn` visto na listagem; "CORRER DE NOVO" entra na rodada corrente se ainda não postou nela, senão `Rnn+1`. Seed da rodada = `xmur3(SALA + "#R" + nn)`.

### JSON do score (v1, versionado — idêntico ao registro local)
```json
{"v":1,"room":"BATATA-7","round":1,"seed":"BATATA-7#R1",
 "name":"LUCA","skin":3,"ms":83450,
 "laps":[27810,27650,27990],
 "sectors":[9200,9400,9210,9150,9380,9120,9300,9450,9240],
 "drift":73,"clean":1,"launch":1,
 "ghost":"<base64>"}
```

### Ghost (canônico: **10 Hz** — resolve Crítica 1.7; interpolação linear + lerp angular no replay)
- Frame 0: x int16 LE, y int16 LE, ângulo 1 byte (`round(θ/2π·256)`).
- Frames seguintes: 3 bytes — dx int8, dy int8 (unidades de 1px, com acumulação de resíduo de quantização), dθ int8 (`rad × 40`).
- Escape: dx = **0x80** → seguem 5 bytes de frame absoluto (respawn/teleporte).
- Corrida de 90s ≈ 900 frames ≈ 2,7 KB brutos, ~3,6 KB base64. Sem gzip, sem lib.
- Ghost por **posição, nunca por input** (determinismo cross-device não é premissa).

### localStorage
`racha:name`, `racha:skin`, `racha:tutorialDone`, `racha:pb:<seed>` = JSON do registro completo (com ghost).

---

## 10. Fluxo de telas (uma máquina de estados)

```
HOME ──► LOBBY ──► COUNTDOWN ──► CORRIDA ──► RESULTADO ──► RANKING
  │                    ▲                                      │
  │  (1ª sessão solo)  └────────── "CORRER DE NOVO" (1 toque) ┘
  └─► WARM-UP OVAL-0 (~8s, overlays: "TOQUE ESQ/DIR" → "TAP-TAP PRA DRIFTAR") ─► HOME
```

1. **HOME**: papel-creme com grain, faixa diagonal vermelha, logo RACHA! em Bungee, kart 6× atravessando em loop soltando poeira. Nome (pré-preenchido do localStorage) + sala em células estilo placa (aceita texto livre; botão SORTEAR usa a lista de 64 palavras) + fileira dos 8 karts como seletor de skin (o asset é o menu) + botão CORRER dourado. Primeiro toque desbloqueia o AudioContext. Rodapé quadriculado.
2. **LOBBY**: PUT do arquivo de presença; lista quem está na sala (poll 10s); nome da pista gigante ("PISTA: BATATA-7"); botão CORRER gigante. Cada um larga quando quiser (largada sincronizada é v4).
3. **COUNTDOWN**: 3-2-1-GO em Bungee vermelho gigante com hard-shadow + beeps; toque = só tentativa de boost de largada (steering ignorado até GO+400ms).
4. **CORRIDA** (60-90s): HUD §6, ghost do PB + 2 pacers translúcidos, sem poll de rede, sem pause (sair = abandonar; `visibilitychange` preserva estado e oferece retomar).
5. **RESULTADO**: tempo total, "FALTOU X.Xs PRO ⟨nome acima⟩" em Bungee, breakdown de setores, drift score, melhor volta; PUT do score se PB da rodada; auto-avança em 5s.
6. **RANKING**: desenhada pra erguer o celular — nomes enormes, pódio top-3, confete, linhas deslizam ao reordenar (nunca teleportam); ranking da RODADA em cima, da NOITE embaixo; poll 10s; **CORRER DE NOVO** volta direto ao COUNTDOWN em um toque.

---

**Regra de ouro do deploy**: se só der pra afinar 3 números na primeira noite — amortecimento lateral do drift (2.5), taxa de curva (2.6), tempos de carga do turbo (0.5/1.1/1.9). Todo o resto está travado neste documento.