# SPEC FINAL v2 — RACHA! GRAND PRIX
*Presidente do conselho. Documento canônico: onde houver conflito com os pareceres, vale o que está aqui. Referências de código verificadas em `/home/user/kart/index.html` (2208 linhas, M1–M21).*

---

## DECISÕES DE DESEMPATE (registro)

| # | Conflito | Decisão | Racional |
|---|---|---|---|
| D1 | Invencibilidade: CARNAVAL (itens) vs MODO BOIADA (engine) | **CARNAVAL** | Visual da máscara + agogô já especificados; mais "rali anos-60" que chifres |
| D2 | 6 itens (itens) vs 5 (engine) | **6 — TROVOADA entra**, mas é o 1º corte de escopo (§5) | Papel "virada do último" cobre o pedido "toda a mecânica de bônus" |
| D3 | Nomes de bots: 3 listas divergentes | **Roster da lente de bots** (traços são o valor), com **tag curta ≤7 chars** exigida pela UX. ZÉ FURICO descartado — dificuldade é global, não existe "bot do Extreme" | Bots = dono de personalidade; UX = dono de largura de banner |
| D4 | Modelo de IA: racing line pré-computada (bots) vs fórmula de 12 linhas (engine) | **Racing line pré-computada** (vCap + passada reversa) | Custo O(600) no load, comprovado trivial; mata o risco nº 1 do engine ("trilho demais") |
| D5 | Update dos bots: 120Hz (bots) vs por frame (engine) | **Por frame (fdt), fora do while de STEP** | 9.3px/frame máx vs raios 16–26 → zero tunneling; sem determinismo no GP |
| D6 | Velocidade: tabela vmax/aLat (bots) vs diffMul 0.80–1.06 (engine) | **Tabela vmax/aLat da lente de bots** | Números batem com sanidade do hairpin; diffMul vira só o ±4% pessoal |
| D7 | Roleta: 1.5s / 1.2s / 0.8s | **1.2s** (UX) | UX é dono do feel de HUD; item sorteado **no travamento** pela posição naquele instante (sem pré-computo) |
| D8 | Slot: 44px quadrado (itens) vs 56px círculo (UX) | **Círculo 56px, canto sup. esquerdo** (UX) | UX é dono do HUD |
| D9 | Zona de item: 50% (UX/itens) vs linha 698 usa 0.45 | **y < 45%** — reusa a fronteira existente do código | Zero mudança na zona de steer; hint continua dizendo "metade de cima" |
| D10 | Spin: 0.9s/×0.25 (bots) vs por-item + exp decay (itens) vs 540° (UX) | **Durações por item (tabela §1) + decay `exp(−3·dt)` até piso 60 px/s + 2 voltas visuais (720°)** | Itens é dono das regras de acerto; 720° em ambas as lentes de gameplay |
| D11 | Empurrão no jogador: 120 px/s (bots) vs 90 (engine) | **90 px/s radial** | Risco de empurrar pra wrongZone/respawn é do engine; regras anti-exploit da lente de bots mantidas |
| D12 | Chinelo: 620 px/s, 6s, atan2 final (itens) vs 640, 5s, só (d,lat) (engine) | **640 px/s, vida 5s, perseguição 100% em (d,lat)** (sem fase atan2) | 640>560 alcança sempre; sem coordenada de mundo = sem edge case fora da pista |
| D13 | Óleo cap: 8 (itens) vs 10 (engine) | **8**, em ring buffer `TRAPS[8]` | Itens = dono do caos de pista; ring buffer = mecanismo do engine |
| D14 | Boxes: 15%/hairpin/chicane (itens) vs cps 1/3/5 (engine) | **Âncoras `tr.cps[1|3|5]*tr.step+120`** (verificado: `cps` existe, M6 linha 533); offsets laterais **−0.3/0/+0.3·hw** (itens); respawn **4s** | Engine leu o código; offsets de itens são decisão de gameplay |
| D15 | Bots × boost pads | **Bots NUNCA tocam pads** (nem estado, nem boost); latRace de DIFÍCIL/EXTREMO nem desvia até eles | `pad.cool=1.5s` é único (linha 861–866) — bot roubaria o pad do jogador; vantagem já está no vCap |
| D16 | Resultado: REVANCHE/TROCAR PISTA (UX) vs 3 botões (engine) | **2 botões da UX** (TROCAR PISTA volta pra HOME, onde nível se troca) | Menos é mais na tela de resultado |
| D17 | Item na mão ao ser atingido | **Mantém** (exceto TAMPA ativa, sempre destruída) | Regra da lente de itens, anti-frustração |

---

## 1) ITENS

### 1.1 Tabela canônica

| Item | Papel | Números | Visual canvas (ícone 24px) |
|---|---|---|---|
| **PIMENTA** | turbo instantâneo | `addBoost(170, 1.2, 'item')` decaimento linear; durante o boost **ignora penalidade de off-road** (flag `K.pimT`) | Meia-lua vermelha `#D94A38` (2 arcos, ponta pra baixo), talo triângulo 4px `#6A994E`, contorno tinta 2px `lineJoin:'round'`, highlight creme 1.5px à esquerda |
| **CHINELO** ("CHINELADA!") | projétil teleguiado | 640 px/s na centerline, vida 5s; alvo = kart imediatamente à frente no ranking no disparo (1º lugar → tiro reto, morre em 5s); `lat` converge pro `lat` do alvo com `damp(6,dt)`; acerto `|dd|<20 && |Δlat|<22` → spin 1.1s; morre se `|lat|>hw+40` ou alvo finished; chinelos não colidem entre si; bloqueado por TAMPA, atravessa quem está em CARNAVAL | Solado rect arredondado 11×19 dourado `#E8B23A`, tiras "V" 2 traços 2.5px `#D94A38`, contorno tinta. Em voo gira 6 rad/s soltando poeira `#C9B58F`. **Aviso ao alvo**: ícone piscando 8Hz na base da tela + beep grave quando ETA < 0.8s (`ddAlvo/(640−vAlvo)`) |
| **ÓLEO** | armadilha | Larga mancha em `{d: d−45, lat: lat atual}`; raio de colisão: `|dd|<18 && |Δlat|<16`; acerto → spin 1.0s + `v×0.5`, mancha some; persiste até acerto ou fim; cap **8** (ring, mais velha some com fade 300ms); TAMPA sobreposta destrói mancha sem spin (consome a TAMPA) | Ícone: lata rect arredondado 12×16 `#57534E`, rótulo creme, gota tinta. Na pista: blob de 3 elipses `#2B2620` (~44×32), arco-highlight creme 1.5px no topo |
| **CARNAVAL** | invencibilidade | 6.5s: vmax ×1.25 (425), imune a tudo, off-road sem penalidade, contato derruba o outro (spin 1.2s + knock lateral 30px em bot), quebra TAMPA alheia | Máscara: losango dourado 16×10 com 2 furos-olho tinta + 3 penas-triângulo (vermelho/verde `#6A994E`/roxo `#7D5BA6`), contorno tinta. Ativo: corpo do kart cicla as 8 cores de skin a 8Hz (contorno tinta fixo, zero glow), confete de rects 3×6 atrás (reusa confete do ranking), motor +1 oitava + agogô (2 osc square, colcheias); últimos 1.5s ciclo cai pra 3Hz |
| **TROVOADA** | virada do último | Todos **à frente** do usuário: spin 0.8s + vmax ×0.65 por 3.5s; CARNAVAL imune; TAMPA **não** bloqueia | Nuvem 3 círculos creme contorno tinta + raio zigzag 4 segmentos `#E8B23A` 3px. Uso: flash papel↔tinta 120ms ×2, zigzag dourado 300ms sobre cada vítima, trovão = burst de ruído com pitch caindo |
| **TAMPA** | escudo | Flutua 22px atrás (bob senoidal ±2px) por 10s ou até bloquear 1 acerto (Chinelo, contato traseiro, 1 mancha de Óleo); bloqueio = "CLANG" (osc metálico + ruído), tampa voa girando 400ms | Círculo `#57534E` r=10, anel interno creme r=7, puxador tinta r=3 com miolo dourado r=1.5, contorno tinta |

**Direcionalidade fixa por item** (nunca do input): Pimenta/Chinelo/Trovoada = frente/global; Óleo/Tampa = trás.

### 1.2 Peso por posição (%, coluna soma 100 — a tabela É o rubber-band de itens)

| Item | 1º | 2º | 3º | 4º | 5º | 6º | 7º | 8º |
|---|---|---|---|---|---|---|---|---|
| ÓLEO | 45 | 30 | 20 | 10 | 5 | 0 | 0 | 0 |
| TAMPA | 35 | 25 | 20 | 15 | 10 | 5 | 5 | 0 |
| CHINELO | 10 | 25 | 30 | 30 | 25 | 20 | 10 | 5 |
| PIMENTA | 10 | 20 | 25 | 30 | 35 | 35 | 30 | 25 |
| CARNAVAL | 0 | 0 | 5 | 15 | 25 | 30 | 35 | 35 |
| TROVOADA | 0 | 0 | 0 | 0 | 0 | 10 | 20 | 35 |

Sorteio no **travamento da roleta** pela posição naquele instante. PRNG separado: `mulberry32(hash(seed + "#itens" + idxKart))` — modo mesa byte a byte intocado.

### 1.3 Regras de acerto (canônicas, iguais pra jogador e bot)

- **Spin**: sem steering, `v` decai `exp(−3·dt)` até piso 60 px/s, 2 voltas visuais (720°) na duração; poeira + vibração 60ms (120ms se for o jogador). Durações: Chinelo 1.1s · Óleo 1.0s · contato-Carnaval 1.2s · Trovoada 0.8s.
- **Imunidade pós-acerto: 2.0s**, pisca 8Hz (`globalAlpha` 1↔0.4). Sem combo.
- Item na mão: **mantém** (TAMPA ativa sempre destruída; roleta rodando termina normal).
- Colisão kart×kart normal **nunca causa spin** — spin é privilégio de item (exceção: CARNAVAL, e o anti-exploit do §2.6).
- Todo projétil/mancha guarda `owner` (índice do kart) — alimenta o banner de autoria (§3.4).

### 1.4 Caixas
9 boxes: 3 clusters em `tr.cps[1]`, `tr.cps[3]`, `tr.cps[5]` (`*tr.step + 120`), cada um com 3 boxes em `lat = {−0.3, 0, +0.3}·hw`. Respawn 4s por box (`cool` individual — box comida por bot fica fechada pro jogador, disputa de recurso é desejável). Só pega com slot vazio E roleta parada; senão atravessa. Colisão `dd∈[0,40] && |Δlat|<20` com wrap de meia-pista (padrão dos pads, linha 861–863). Visual: losango creme contorno tinta 2.5px, "?" Bungee 12px dourado com hard-shadow tinta (1,1), `scaleX=sin(t·3)` (falso 3D) + bob ±2px, sombra elipse `rgba(43,38,32,.25)`.

---

## 2) BOTS

### 2.1 Modelo: cinemático na centerline ("trilho com alma")
Estado por bot (factory única `createBot()`, monomórfico):
```js
{ d, lat, latTgt, v, x, y, ang,                 // (d,lat) é a verdade; x/y/ang derivados 1×/frame via sampleInto
  prog, lap:1, finished:false, finMs:0, rank,
  skin, name, tag, persMul,                      // ±4% pessoal
  item:0, roulT:0, spinT:0, spinDir, immuneT:0, shieldT:0, carnT:0, slowT:0, boostT:0,
  itemDelayT:0, aiT:0, errT:0, wobF, wobPh, laneBias, aggro }
```
Update **por frame** (`fdt`), fora do `while(S.acc>=STEP)` e fora do gate `!S.finished` (gated só por `state==='RACE' && !S.paused`): `d += v·fdt`; `lat` lerpa pro `latTgt` a 6/s; decisões a **10Hz** (`aiT`), decisão de item a **4Hz**. Bots nunca chamam `project()` nem `physStep`; volta = `d >= total·lap` local; nunca emitem `EV:'finish'`.

**Racing line pré-computada** (1× por corrida em `raceInit`, por dificuldade, O(600)):
- `latRace[i] = smooth30(−sign(curv[i]) · clamp(|curv[i]|·9000, 0, hw[i]−16))`, deslocada 8 amostras pra trás (apex atrasado, entra por fora).
- **Perfil de velocidade reverso**: `vCap[i] = min(vmaxBot, sqrt(aLat·r[i]))`; depois de trás pra frente `vAlvo[i] = min(vCap[i], sqrt(vAlvo[i+1]² + 2·400·ds))`. Runtime: `dv = (vAlvo·mults − v)·2.2·dt`, frenagem capada a 450 px/s².

**Linha individual**: `latTgt = latRace·lineSkill + laneBias + wobble + desvio`
- `laneBias` sorteado no grid em `{−18,−12,−6,0,+6,+12,+18}` px (sem trenzinho).
- `wobble = sin(t·f+fase)·A`, `f∈[0.4,0.7]Hz`; `A`: FÁCIL 14 · MÉDIO 10 · DIFÍCIL 6 · EXTREMO 3 px.
- **Ultrapassagem**: com bots ordenados por progresso, se gap à frente <55px e fechando → `desvio = ladoLivre·34px` até gap >90px; `ladoLivre = sign(minhaLat − latDele)`, invertido se estourar `hw−14`.
- **Erro humano** (evento, não ruído): a cada `errInterval` (rolado em entrada de curva): `latTgt += ladoExterno·rand(20,45)` por 0.7s + `v×0.92`. FÁCIL: 25% dos erros saem da pista (0.5s off-road visual, `v×0.6`). `errInterval`: 9s / 16s / 30s / 75s (±30%).

### 2.2 Dificuldades (nomes de UX + números de bots)

| Nome na HOME | Interno | vmaxBot | aLat | média volta | % jogador | boost largada (+130) | delay de item |
|---|---|---|---|---|---|---|---|
| **CAFÉ COM LEITE** — "eles deixam você ganhar" | easy | 280 | 500 | ~255 | 85% | 20% | 2.5–4s |
| **ESTRADEIRO** — "briga honesta" *(default)* | med | 315 | 700 | ~288 | 96% | 50% | 1.2–2.5s |
| **PÉ NA TÁBUA** — "eles não perdoam" | hard | 340 | 900 | ~312 | 104% | 80% | 0.6–1.5s |
| **SEM FREIO** — "boa sorte." | ext | 360 | 1050 | ~330 | 110% | 100% | 0.3–0.8s |

FÁCIL extra: 20% de chance de nunca usar o item. **Drift visual dos bots** (puro render, disfarce da dificuldade): chassi 0.4 rad pra dentro + marca de pneu + poeira quando raio local < limiar — FÁCIL nunca, MÉDIO r<150, DIFÍCIL r<180, EXTREMO r<240 **+ faíscas douradas na saída com +40 px/s por 0.6s** (scriptado).

### 2.3 Rubber-band (velocidade)
`gap` = Δprog total pro jogador. Zona morta 250px; rampa linear 250→1500px:

| | atrás (turbo até) | à frente (freio até) |
|---|---|---|
| FÁCIL | +6% | −12% |
| MÉDIO | +8% | −7% |
| DIFÍCIL | +8% | −4% |
| EXTREMO | +12% | 0% |

Freio nunca derruba abaixo de `0.85·vAlvo`. Lado "sorte de item" do rubber-band já é a tabela §1.2.

### 2.4 Roster (traço = multiplicadores sobre o modelo único)

| Nome | Tag (banner/pódio) | Traço | Números |
|---|---|---|---|
| TONHO FUMAÇA | FUMAÇA | foguete de reta, manco de curva | vmax +4%, aLat −10% |
| NEIDE VELOZ | NEIDE | agressiva | delay de item ofensivo ×0.4; fecha linha (desvio espelhado 25px) |
| SEU OSMAR | OSMAR | linha fina | lineSkill 1.15, vmax −3% |
| CACÁ BIRUTA | CACÁ | erra e volta | errInterval ×0.6, wobble ×1.5, rubber-band de recuperação ×1.2 |
| DONA LOURDES | LOURDES | metrônomo | wobble ×0.5, errInterval ×2 |
| GALO CEGO | GALO | bloqueador | à frente do jogador <150px: `latTgt` lerpa pra lat do jogador (3/s); segura TAMPA até o fim |
| RATINHO | RATINHO | vácuo | <120px atrás de qualquer kart: +3% v; desvio de ultrapassagem 42px |

Jogador escolhe skin; bots pegam as 7 restantes por ordem (mapeamento nome→traço fixo).

### 2.5 Bots usando itens (delay §2.2 vencido → 1ª condição verdadeira, checada a 4Hz)

| Item | Condição | Nota |
|---|---|---|
| PIMENTA | raio lookahead 300px > 250 e não-offroad | EXTREMO segura pro retão; FÁCIL 30% de chance de soltar em curva (engraçado) |
| CHINELO | alvo à frente <500px | NEIDE ignora distância e delay |
| ÓLEO | alguém <200px atrás com `|Δlat|<30` | senão solta no apex da próxima curva |
| TAMPA | chinelo inimigo flagrado <300px (evento no spawn) | GALO segura sempre; demais descartam usando após 8s |
| CARNAVAL | ≥2 karts num raio 200px, ou <3s após ser atingido | senão usa após 6s |
| TROVOADA | imediato ao vencer o delay | é global, não há timing melhor |

### 2.6 Ser atingido / colisões (mesmos números do §1.3 pra bot e jogador)
- Bot atingido: spin por-item no render (720°), `v` pelo decay, rampa de volta pela aceleração normal (~1.8–2.2s de perda efetiva); imunidade 2.0s piscando.
- **Kart×kart** (círculos r=13, teste `dist2<26²` em x/y): jogador recebe separação + impulso radial **90 px/s** + camShake; bot recebe `latTgt ±14px` + `v×0.95` por 0.5s. **Anti-exploit**: jogador batendo por trás com Δv>60 → jogador perde 15% de v, bot nada; com CARNAVAL ativo inverte (bot roda 1.2s + knock 30px). **Bot×bot**: só separação lateral 12px, testando apenas vizinhos na lista ordenada com `|Δd|<80` → O(n).

---

## 3) CONTROLES + HUD + TELAS

### 3.1 Zonas de toque (M8, linha 698)
- **`touchstart` com `y < innerHeight·0.45` = USAR ITEM** (dispara no touchstart, latência zero). Trocar o `continue` da linha 698 por: `if(S.mode==='GP' && K.item && !K.roulT){ useItem(); } continue;`.
- Toque iniciado em cima nunca vira steer; iniciado embaixo nunca dispara item (decidido pelo y do touchstart, rastreado por `touch.identifier` como hoje).
- Slot vazio → ignorado em silêncio. Countdown + 400ms pós-GO: toque em cima segue sendo só tentativa de boost de largada (regra existente, inalterada — e o slot está vazio no GO).
- Sem swipe, sem hold, sem mira: **direção é propriedade do item**. Feedback de uso: vibração 20ms + pop (osc quadrada 80ms, 600→900Hz).
- **Sem botão de pausa** no GP (igual v1: `visibilitychange`, linha 2163, pausa bots junto).

### 3.2 HUD (M15)
- Delta-ghost SAI; **ghosts/pacers não existem no GP**. No lugar de honra (centro-topo): **posição** — numeral+"º" Bungee 2.6rem paper com hard-shadow tinta, "/8" Rubik 800 1rem; ao mudar: pop existente + flash `#6A994E` 300ms se subiu / `#D94A38` se caiu. Relógio rebaixado pra Rubik 800 1.0rem logo abaixo.
- VOLTA 2/3 à esquerda (igual), minimapa 72px à direita (igual). Minimapa: bots = pontos r=3.5 cor da skin com contorno tinta 1px; **jogador r=5 com anel creme 2px, desenhado por último**. Sem coroa no líder.
- **Slot de item**: círculo 56px estilo adesivo (fill `#FBF4E4`, contorno 3px tinta, hard-shadow 3px 3px), canto sup. esquerdo abaixo de VOLTA (14px da borda, ~`calc(safe+64px)` do topo). Com item pronto: pulso scale 1→1.06 loop 600ms. É display; o alvo de toque é a metade de cima inteira.

### 3.3 Roleta (dentro do slot, nunca no centro)
1.2s total: ícones 24px ciclam a 60ms/ícone com tick (osc curto 1200Hz), desacelera pra 150ms, **trava** com pop (scale 1.25→1) + "plim" duplo (600/900Hz) + vibração 20ms. Item sorteado no travamento (§1.2); utilizável a partir dele.

### 3.4 Feedback de acerto com autoria (pacote 300ms)
Jogador atingido: spin (§1.3) + squash, shake de câmera **6px/200ms** (> parede 4px/120ms), vibração 120ms, "wah" (square 400→120Hz, 350ms), e **banner** sob a posição: roundel do atacante (16px, cor+número da skin) + `NEIDE TE ACERTOU!` (Rubik 800 0.9rem creme, shadow tinta, slide-in da direita, 1.4s). Armadilha: `PRESENTE DO FUMAÇA`. Jogador acerta alguém: `ACERTOU O GALO!` em dourado + vibração 30ms. Nome sempre presente (campo `owner`).

### 3.5 HOME
Seletor de modo entre nome e contexto — segmented "bilhete de corrida" (2 células, borda 3px tinta; ativa fill vermelho/texto creme):
```
SEU NOME [ LUCA ]
[ GRAND PRIX — você × 7 bots | CONTRA A MESA — time-trial ]
se GP:  pills 2×2: (CAFÉ COM LEITE)(ESTRADEIRO)(PÉ NA TÁBUA)(SEM FREIO)
        PISTA [ BATATA-7 ][🎲]  ← mesmo campo seed=pista
se MESA: sala + sync + token, byte a byte como hoje
[fileira de skins]  [ CORRER 🏁 ]
```
Pills: Bungee .85rem + sub-legenda Rubik 0.6rem; ativa fill dourado contorno tinta; **SEM FREIO invertida** (fill tinta, texto dourado). Persistência: `racha:mode`, `racha:gpDiff`. Fluxo GP **sem lobby, zero rede**: `HOME → COUNTDOWN(grid 8) → CORRIDA → RESULTADO-GP`. **Jogador larga em P8.**

### 3.6 RESULTADO-GP (tela nova `scr-gpresult`, ≠ time-trial)
```
Pista BATATA-7 · Grand Prix · Pé na Tábua      (eyebrow)
3º LUGAR                                        (Bungee 3rem)
"NO PÓDIO!"                                     (frase por faixa)
[pódio 3 caixas — reusa .podio/.pod, kart 32px 2× + tag]
tabela 8 linhas: pos · roundel · tag · gap "+2.4s" vs líder
  (linha do jogador com fundo dourado; DNF não existe)
chips: MELHOR VOLTA 27.8 · 3 ACERTOS
[ REVANCHE ↻ ]  (vermelho — mesma pista+nível, direto pro countdown)
[ TROCAR PISTA ] (linha — HOME com 🎲 já re-sorteado)
```
Frases: 1º "REI DA ESTRADA!" (+confete do ranking) · 2º–3º "NO PÓDIO!" · 4º–5º "QUASE…" · 6º–8º "FICOU NA POEIRA". Pódio entra com slide + fanfarra existente. **Nada publica no GitHub.**

### 3.7 Onboarding — exatamente 1 hint
Primeira roleta travada da vida (`racha:gpHint` ausente): `#hint` existente mostra **"TOQUE NA METADE DE CIMA PRA USAR"** + seta ↑ pulsando sobre a linha dos 45% por 600ms. Some no 1º uso ou em 5s; grava flag. Zero hints adicionais.

---

## 4) INTEGRAÇÃO TÉCNICA

### 4.1 Dados (tudo pré-alocado em `raceInit`, zero alocação no caminho quente)
`BOTS[7]` (§2.1) · `PROJ[4]` pool com flag `on` (cheio → mata o mais velho) `{d,lat,spd:640,tgt,life:5,owner,on}` · `TRAPS[8]` ring `{d,lat,owner,on}` · `BOXES[9]` `{d,lat,cool}` · arrays `latRace/vAlvo` da dificuldade · array de 8 índices reutilizado pro ranking · `sampleInto(tr,d,out)` novo (variante de `sampleAt` linha 654 escrevendo em scratch — evita ~660 objetos/s). `project()` continua exclusivo do jogador.

### 4.2 Loop (M20, `frame` linha 1969)
`botsUpdate(fdt)` e `itemsUpdate(fdt)` **por frame, fora** do `while(S.acc>=STEP)` e fora do gate `!S.finished` (só `state==='RACE' && !S.paused`) — bots seguem correndo nos 1400ms entre o finish do jogador e `finishRace()`. Ranking por frame: prog de todos → sort de 8 → `rank`. Orçamento: 7×sampleInto + 7×`curvAhead` (linha 661) ≈ <0.05ms/frame.

### 4.3 Colisões
~212 testes/frame no pior caso — **sem broadphase**; pré-filtro `|dd|>60 → skip` mata 95%. Kart×kart em x/y (§2.6); kart×armadilha/box/projétil em (d,lat) com wrap de meia-pista (copiar padrão dos pads, linhas 861–863).

### 4.4 Spin do jogador (M9, `physStep` linha 783)
Novo `K.spinT` checado no **topo** de `physStep`: `tgt=0`, `turn=11·spinDir` (≈2 voltas via `bodyAng`), decay §1.3. **No hit, checklist de reset**: `drift.on=false, charge=0, turboStage=0, boosts.length=0, hopT=0, IN.driftId=null` (guard de `driftRelease` já protege o release posterior). Hit não zera `clean` (conceito de TT). Testar: hit durante hop, drift carregado e boost.

### 4.5 Mudanças por módulo do index.html

| Módulo | Mudança |
|---|---|
| M1 CONFIG | tabelas: dificuldades, pesos de item 6×8, roster de bots, durações de spin |
| M2 PRNG | +1 instância mulberry32 pra itens (seed derivada, §1.2) |
| M5 Estado | `S.mode='TT'|'GP'`, `S.diff`; **gate único: todo código novo atrás de `S.mode==='GP'`** |
| M6 TrackGen | **INTOCADO** (boxes ficam fora de `tryBuild`; `API_TEST.buildTrack` bitwise igual) |
| M7 TrackQuery | +`sampleInto` |
| M8 Input | linha 698: branch de item (§3.1) |
| M9 Physics | `K.spinT` no topo de `physStep`; `addBoost(170,1.2,'item')`; flags `pimT/carnT` (off-road ignore, vmax ×1.25); pads intocados (D15) |
| M10 Ghost | em GP: `ghostRec/ghostPlay/pacers/refGhost=null` |
| M11 Assets | 6 ícones de item 24px + box + mancha + tampa flutuante + chifres/máscara overlay — tudo path 2D |
| M12 Camera | shake 6px/200ms no hit |
| M13 FX | confete atrás no Carnaval (reusa ranking), faíscas EXTREMO, zigzag Trovoada, flash de tela |
| M14 RenderWorld | ordem: pads → BOXES → TRAPS → fxDrawWorld → BOTS (do último pro 1º; jogador sempre em cima) → kart do jogador → PROJ (por cima de tudo) → overlays (tampa/carnaval). Bots reusam `drawKartVector` (linha 1026); culling pelo `r2` da câmera |
| M15 HUD | posição grande + slot 56px + roleta + banner de autoria; delta-ghost condicionado a TT; `mmDraw` (linha 1433): +7 pontos (loop igual pacers) |
| M16 Audio | pop de uso, plim da roleta, wah do hit, CLANG, agogô, trovão, beep de aviso — todos osciladores no padrão existente |
| M17/M18 Net/Leaderboard | **INTOCADOS**; GP nunca chama (100% offline) |
| M19 StateMachine | HOME com seletor+pills; `scr-gpresult` registrado em `SCREENS`; GP pula LOBBY |
| M20 RaceController | `raceInit(seed,warmup,mode)`: cria BOTS/PROJ/TRAPS/BOXES + racing line; grid `d=startD−i·38`, `lat=±0.3hw` alternado, jogador P8; `botsUpdate/itemsUpdate` no frame; `finishRace` (linha 1858) branch GP: não publica, não grava PB, não mexe em `S.remote`; bots restantes extrapolados `finMs = raceClock + distRestante/v`; `drainEV` (linha 1945): eventos `hit, fire, box, shield, carn, trov, pos` |
| M21 Boot | persistência `racha:mode/gpDiff/gpHint`; seed do GP sorteada de `WORDS` (linha 286) com re-roll 🎲 |

Estimativa: **~900 linhas novas, ~45 modificadas** (arquivo → ~3.1k). Riscos e prevenções do parecer de engenharia (§12) adotados integralmente.

---

## 5) ESCOPO EXATO DESTA ENTREGA

**Entra (4 deploys incrementais, cada um jogável):**
1. Modo GP + HOME/pills + bots correndo (racing line, dificuldades, rubber-band, colisão kart×kart, drift visual) + HUD de posição + RESULTADO-GP. *Critério: corrida completa divertida sem nenhum item.*
2. Boxes + roleta + slot + PIMENTA + ÓLEO + spin/imunidade + zona de toque + hint.
3. CHINELO (+aviso) + CARNAVAL + TAMPA + bots usando itens + banner de autoria.
4. TROVOADA + personalidades finas dos 7 (camadas de erro/wobble/traços) + polish de áudio/FX + tuning.

**Ordem de corte se apertar (do primeiro ao último a cair):**
1. TROVOADA (papéis principais já cobertos; tabela §1.2 redistribui a coluna dela pra CARNAVAL/PIMENTA).
2. Traços individuais dos bots (mantém nomes/tags; todos viram modelo base + laneBias + persMul ±4%).
3. Drift visual + faíscas dos bots.
4. Banner de autoria vira genérico "RODOU!" (sem `owner`).
5. Aviso antecipado do Chinelo (fica só o acerto).

**Fica de fora desta entrega (decidido, não é corte):** botão de pausa; ghosts/pacers no GP; qualquer rede/publicação no GP; DNF; multiplayer com itens; itens no modo mesa; mira/direção manual de item; segundo slot; troca de nº de voltas. **Invariante inegociável:** modo mesa (TT) byte a byte intocado — pista, seeds, ghosts, leaderboard.

**Tuning pós-deploy (únicos números abertos, nesta ordem):** aLat do PÉ NA TÁBUA (900) · teto do rubber-band SEM FREIO (+12%) · errInterval do ESTRADEIRO (16s) · força da PIMENTA (170) · duração do CARNAVAL (6.5s) · peso de TROVOADA no 8º (35%). Todo o resto está travado acima.