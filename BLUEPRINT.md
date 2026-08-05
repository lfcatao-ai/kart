# BLUEPRINT ÚNICO — RACHA! v1 (`index.html` single-file)

Fonte canônica: `/home/user/kart/DESIGN.md`. Padrões validados copiados de `/workspace/lfcatao-ai/gauntlet/index.html` (PRNG L356-375, token L1430-1577, sw.js, manifest). Deploy: `index.html`, `sw.js`, `manifest.json`, `icon-180/192/512.png` em `lfcatao-ai/kart` (Pages); scores em `s/`.

---

## 1. LAYOUT DO ARQUIVO (ordem exata + orçamento de linhas)

```
<head>                                                          ~30
  charset · viewport (width=device-width, viewport-fit=cover,
  maximum-scale=1, user-scalable=no) · theme-color #F2E8D5 ·
  preconnect fonts · Bungee:400 + Rubik:600;800 display=swap ·
  manifest.json · apple-touch-icon 180 · apple-mobile-web-app-*
<body>
<style>                                                         ~420
  :root vars → reset → tipografia (.bungee .hs) → .btn/.plate/
  .skin → #hud/#announce/#hint → .scr (home/lobby/result/rank)
  → animações (pop, pulse, barra 5s, confete-fallback nada)
HTML                                                            ~160
  <canvas id=game> <canvas id=fx>
  <div id=ui> #scr-home #scr-lobby #scr-result #scr-rank
  <div id=hud> (lap/time/delta + <canvas id=mm>) · #announce · #hint
<script> IIFE 'use strict', módulos NESTA ordem:
  M1  CONFIG+CONSTS: API, OWNER='lfcatao-ai', REPO='kart',
      DIR='s', VER='v1.0.0', SALT, paleta, SKINS[8],
      WORDS[64], TUNE{...} (regra de ouro no topo comentada)    ~70
  M2  PRNG: xmur3 + mulberry32 (verbatim gauntlet)              ~20
  M3  MathUtil: wrapIdx, angWrap, angLerp, lerp, clamp,
      damp(k,dt)=1−exp(−k·dt)                                   ~25
  M4  Util: $, esc, LS wrapper try/catch, later/clearTimers,
      slug, slugName, b64e/b64d, chk4                           ~60
  M5  Estado global S + kart K + eventos EV[]                   ~40
  M6  TrackGen: buildTrack(seed,opts) — spline, validação,
      cps, pads, + bake render (lx/ly/rx/ry, zebra, dash,
      startQuad, mmTrace)                                       ~280
  M7  TrackQuery: project, sampleAt, curvAhead, widthAt         ~90
  M8  Input: touch FSM drift/steer/largada                      ~120
  M9  Physics: createKart, physStep, respawn, driftScore        ~220
  M10 Ghost: GhostRec, GhostPlay, makePacer                     ~150
  M11 Assets: drawKartVector, bakeSprites, bgTile,
      startBanner, fit() DPR/resize                             ~160
  M12 Camera: camUpdate(frameDt), aplicar transform             ~70
  M13 FX: pools (pneu ring, faíscas, poeira, speedlines,
      confete) + buckets rgba                                   ~180
  M14 RenderWorld: computeVisibleRuns, renderRace pipeline      ~260
  M15 HUD: hudUpdate (textContent-diff), announce, minimapa     ~90
  M16 Audio: unlock, engine, skid, beep, fanfarra, vib          ~120
  M17 Net: hdr, listDir, putJson, delFile, parseListing,
      refresh single-flight, setPoll                            ~110
  M18 Leaderboard: dedupe, currentRound, myNextRound,
      nightPoints, publishPB, presença                          ~130
  M19 StateMachine: go(), ENTER/EXIT hooks, raceReset,
      syncWakeLock, visibilitychange, pausa                     ~170
  M20 RaceController: loop rAF único + acumulador + drain EV    ~90
  M21 Boot: token #t=, restore LS, prune pb, bind UI, SW
      register, fonts.ready→rebake, go('HOME')                  ~80
```
**Total ≈ 3.100 linhas.** Regra: módulo só chama módulo de índice menor ou APIs listadas na §3 (evita dependência circular).

---

## 2. ESTRUTURAS DE DADOS GLOBAIS (formato final)

**TRACK** (fusão Planos 1+2; um só objeto, tudo pré-computado no build):
```js
TRACK = {
  seed, n, step,            // step = total/n EXATO
  total, startIdx,
  x,y, tx,ty, nx,ny,        // Float32Array(n); normal = (-ty,tx)
  hw,                       // Float32Array(n) MEIA-largura 42.5–72.5  ← decisão D3
  curv,                     // Float32Array(n), com sinal, suavizada
  cps: Int32Array(6),       // cps[0] = chegada (meio do retão)
  pads: [{d0,len:60,latMin,latMax,cx,cy,ang,chev:F32(24)}×3],
  aabb: {minx,miny,maxx,maxy},          // +300px = paredes
  // ---- baked p/ render ----
  lx,ly,rx,ry: Float32Array(n),         // bordas = x ± n*hw
  zebra:{n,quad:F32(n*8),cx,cy:F32(n),col:Uint8(n)},
  dash:{n,seg:F32(n*4),mx,my:F32(n)},
  startQuad:F32(20*8), startCol:Uint8(20), startBanner:{x,y,ang},
  sand:[{x,y,rx,ry}×~8], mmS, mmCx, mmCy
}
```

**KART** (jogador; físico + visual num objeto — render só lê):
```js
K = { x,y, dir, vx,vy, speed,          // speed = |v| cacheado por step
  steer, steerTarget,
  drift:{on,side,charge,lowSteerT}, hopT,
  boosts:[{v0,left,dur,linear}], turboStage,   // 0-3 p/ cor de faísca
  projIdx, dCont, lat, totalProgress, lap, cpZone, cpCount,
  offroad, stuckT, wrongZoneT,
  laps:[], sectors:[], driftAcc, clean, launch, skin, name }
// ângulo do chassi (render): dir + (drift.on? side*0.45:0) + 0.12*steer
```

**GHOST**: gravação = `Uint8Array` crescente (×2, cap 1800 frames), 10Hz por raceClock; frame abs 5B `x:i16LE,y:i16LE,θq:u8`; delta 3B `dx,dy:i8 (−127..127), dθq:i8 (rad×40)`; escape = byte `0x80` + frame abs; `dx=−128` nunca emitido. Player decodifica 1× para `{x:F32,y:F32,th:F32 desenrolado,abs:Uint8}`; lerp linear, **sem lerp cruzando frame abs**. Pacers: `makePacer(TRACK, pps∈{235,260}, label)` → `pos(tSec)` via `sampleAt(d = pps·t mod total)`.

**Partículas** (typed pools, swap-with-last): pneu = 2 ring buffers/kart `x,y,t:F32(120)`; faíscas 64 `x,y,vx,vy,born:F32 + stage:U8`; poeira 64; speedlines = 6 ângulos fixos + timer; confete 80 `x0,phase,rotV,fallV,y:F32 + col:U8`. Cores: `TIRE_RGBA[8]` e demais strings criadas no boot.

**Estado global S** (rede/fluxo):
```js
S = { state:'HOME', name,skin,room, round:1,
  paused:false, raceClock:0, acc:0, tPrev:0,       // ← raceClock = Σ STEPs (D1)
  remote:{scores:[],presence:[],at:0}, inFlight:false, pollIv:null,
  pendingPub:null, timers:[], wakeLock:null, mute:false,
  ghostRec:null, ghostPlay:null, pacers:[], pbRec:null,
  countT:0, resultRec:null }
```
`EV[]` = fila de eventos discretos `{t:'wall|pad|tierUp|turbo|lap|sector|respawn|finish|launch', a,b}` — physics empurra, RaceController drena por frame para FX/áudio/HUD/vibração. FX contínuos (`fxTire`, `fxDust`) são chamadas diretas (D8).

**Cam**: `{ang, zoom:1, laF:60, laLat:0, shakeT:0, boostT:0}`.

---

## 3. CONTRATOS ENTRE MÓDULOS (~30 assinaturas)

```js
// M3/M4
wrapIdx(i,n)                 // ((i%n)+n)%n — ÚNICO acesso circular permitido
angWrap(a)                   // → (−π,π]
angLerp(a,b,k)               // lerp pelo caminho curto
LS.get/set/del(k[,v])        // localStorage com try/catch
later(fn,ms) / clearTimers() // timers registrados em S.timers
slug(s)/slugName(s)          // sala A-Z0-9- ≤14 / nome A-Z0-9 3-6
b64e(s)/b64d(s)              // base64 unicode-safe
chk4(room,ms,name,ghostB64)  // hash xmur3+SALT → 4 chars base36
// M6/M7
buildTrack(seedStr,opts)     // → TRACK; opts.oval=true p/ OVAL-0; re-roll interno
project(TRACK,x,y,hint)      // → {idx,dCont,lat}; hill-climb O(1), cap 48
sampleAt(TRACK,d)            // → {x,y,ang} lerp entre amostras (pacers, respawn)
curvAhead(TRACK,d,px)        // → {minR,sign} nos próximos px (câmera)
// M8
inputInit(canvas)            // listeners touch; expõe steerTarget, FSM drift
inputLaunchWindow(on)        // countdown→GO+400ms: toques só tentam launch
// M9
raceReset(seed,warmup)       // pista+kart+pacers+ghost PB+recorder; zera S de corrida
physStep(dt)                 // 1/120s: steer→curva→grip→vmax→parede→integra→
                             // project→pads→cps→drift→boosts; empurra EV
respawnAt(cpIdx)             // teleporta, v=0, projIdx=cps[i] EXPLÍCITO, EV respawn
// M10
GhostRec.tick(K,raceClock) / .b64()      // agenda 10Hz por raceClock
GhostPlay(b64) → .pos(tSec)              // decodifica 1×; segura no fim
makePacer(TRACK,pps,label) → .pos(tSec)
// M11/M12
fit()                        // DPR cap 3; cssW/H de clientWidth; #game #fx #mm
drawKartVector(ctx,skin,scale,frontSteer,withFront) // bake E vivo (HOME 6×)
bakeSprites() / bakeTrackAssets(TRACK)   // sprites 4×, bgTile, mmTrace, banner
camUpdate(frameDt,K,TRACK)   // ang(|v|>20)/zoom/lookahead/shake
camApply(ctx)                // setTransform(dpr)→translate(w/2,h*.68+shk)→
                             // scale(zoom)→rotate(−π/2−ang)→translate(−px,−py)
camShake()                   // shakeT=0.12
// M13/M14/M15
fxTire(ring,x,y) fxDust(x,y) fxSpark(x,y,stage) fxSpeedLines() fxConfetti(on)
renderRace(frameDt)          // pipeline §6 do Plano 2 (fundo em coords de MUNDO)
hudUpdate() / announce(txt,cls,ms) / mmDraw()
// M16
audioUnlock() audioResume() engineStart/Stop/Update(v,drifting,boost)
beep(f,d,type,g) fanfare() vib(pat)      // vib SEMPRE pareado com beep+flash
// M17/M18
refresh(cb)                  // single-flight, 404→[], skip se hidden
setPoll(on)                  // handle único S.pollIv; só LOBBY/RANK ligam
publishPB(rec)               // LS sempre; rede: checa mine→PUT(422=ok)→
                             // deleta todos os mine antigos fire-and-forget
dedupe(scores) currentRound() myNextRound() nightPoints()
putPresence()                // PUT com sha da listagem; 409/422→1 retry
// M19/M20
go(next)                     // ÚNICA transição: clearTimers→setPoll(false)→
                             // EXIT→troca .scr→ENTER→syncWakeLock
syncWakeLock()               // idempotente; re-acquire no visible
frame(t)                     // rAF único: dispatch por S.state
```

---

## 4. SEQUÊNCIA DE IMPLEMENTAÇÃO (escrever uma vez, sem retrabalho)

1. **Esqueleto**: head + CSS completo + HTML das telas + M1–M5. Telas navegáveis com `go()` mock (ENTER/EXIT vazios). Testa safe-area/dvh já aqui.
2. **M6+M7 TrackGen/Query**: com render de debug mínimo (polilinha da centerline num transform fixo). Validar: seam, validação re-roll, OVAL-0, zebra dos dois lados.
3. **M11+M12+M14**: fit/DPR, sprites, câmera, pipeline de pista completo (runs, zebra, dashes, largada, pads). Kart estático desenhado.
4. **M8+M9**: input FSM + física. Agora dirige. Afinar sensação AQUI (é o ponto de maior iteração — tudo depois é independente do feel).
5. **M20+M19 parcial**: loop com acumulador, raceClock, countdown, voltas/setores/respawn, pausa/visibilitychange. HUD (M15).
6. **M10 Ghost**: recorder+player+pacers (testa gravando e replayando na mesma sessão). M13 FX + M16 áudio (independentes, qualquer ordem).
7. **M17+M18 Rede**: token, refresh, publishPB, presença, leaderboards; telas LOBBY/RESULT/RANK com dados reais.
8. **M21 Boot + PWA**: sw.js, manifest, ícones, badge VER, WARMUP, prune LS.
9. **Ultrareview** contra a lista da §5.

Racional: 2–3 são independentes entre si mas ambos precedem 4; física (4) estabiliza antes de ghost (6) porque o formato grava posição, não input; rede (7) por último pois nada de gameplay depende dela (contrato "sem token funciona tudo").

---

## 5. LISTA MESTRA DE ARMADILHAS (checklist do ultrareview, ordem severidade×probabilidade)

1. **Módulo negativo no wrap de índice** — `(-1)%n === -1` em JS; projeção/tangente leem `undefined` → NaN contamina posição. → `wrapIdx()` obrigatório em TODO acesso circular; proibido `i%n` cru (grep final por `%TRACK.n` e `%n]`).
2. **Tempo de gameplay em wall-clock** — boost/drift/volta/ghost em `performance.now()` estouram juntos pós-background. → **raceClock = Σ de STEPs físicos** (D1); pausa = parar de steppar; NENHUM `performance.now()` em lógica de corrida (só frameDt e UI).
3. **dt gigante / spiral of death** — volta de background com dt 30s atravessa parede e trava o acumulador. → clamp frameDt 50ms + máx 6 substeps/frame + `visibilitychange` hidden seta `S.paused` e overlay "TOQUE PRA CONTINUAR"; retomar não mexe em relógio nenhum (consequência da #2).
4. **DPR duplicado / transform acumulado** — `ctx.scale(dpr)` persistido dobra o mundo. → TODO frame abre com `ctx.setTransform(dpr,0,0,dpr,0,0)`; dpr não aparece em nenhum outro ponto do pipeline; zero save/restore atravessando frames.
5. **Lerp angular cruzando ±π** — câmera gira 360° numa curva; ghost roda pro lado errado. → `angWrap` no delta ANTES de todo lerp/quantização (câmera, dθ do ghost, pacers); helper único `angLerp`.
6. **Codec do ghost: dθ overflow + colisão 0x80** — costura ±π dá dθq≈1005; delta dx=−128 vira marcador de escape e dessincroniza o stream inteiro. → `angWrap` antes de quantizar; range de delta [−127,127]; qualquer estouro OU teleporte → frame de escape absoluto; decodificar o próprio ghost logo após gravar (assert em dev).
7. **Turbo solto pelo dedo errado / touchcancel órfão** — dedo apoiado encerra o drift; iOS `touchcancel` deixa lado "pressionado" pra sempre. → FSM guarda o `touch.identifier` do dedo do drift (só ELE libera turbo); `touchcancel`≡`touchend`; mapa de touches limpo em `visibilitychange`.
8. **Projeção presa após teleporte** — respawn move o kart mas `projIdx` fica velho → lat gigante → loop de respawn. → todo teleporte seta `projIdx` explicitamente via `respawnAt`; fallback re-scan global (1/8 amostras) se projeção insana >500ms.
9. **Poll vazando pra corrida** — interval sobrevive à transição; 2 intervals após re-entrada. → handle único `S.pollIv`; `setPoll(false)` incondicional dentro de `go()` antes de qualquer ENTER; só LOBBY/RANK religam; `refresh()` single-flight + skip se `document.hidden`.
10. **Costura da reamostragem** — último vão ≠ step gera pico de curvatura falso na emenda → re-rolls fantasma + kink no minimapa. → `step = total/n` exato; tangente/curv circulares via wrapIdx; média móvel 3 na curv antes da validação.
11. **Hairlines entre quads da pista** — fill quad-a-quad deixa fissuras de AA. → um polígono por run visível (borda esq ida + dir volta), um fill; bordas como strokes por cima; culling geométrico por círculo (nunca por janela de distAcum), runs +2 amostras, fundidos com wrap.
12. **AudioContext suspenso (iOS)** — corrida muda após background/lock. → criar+resume no primeiro `pointerdown` da HOME (`{once:true}`); `resume()` re-tentado em todo ENTER, no visible e no toque de retomar; osciladores do motor 1×/corrida com flag anti-double-stop.
13. **Escrita concorrente na API** — sha vencido em presença (409), publicação dupla, DELETEs falhos deixando duplicatas. → score = filename novo sem sha, retry idêntico → 422 tratado como sucesso; publish checa listagem antes do PUT e deleta TODOS os `mine`; **`dedupe()` (menor ms por nome) em TODA renderização** — duplicata nunca aparece; presença: 1 retry pós-refetch, depois silêncio.
14. **`atan2(0,0)` na câmera** — chicote no spawn/respawn. → alvo angular só com `|v|>20`; `cam.ang` inicializado com a tangente da largada; em respawn, set direto sem lerp.
15. **Safe-area / 100vh / rotação** — HUD sob notch, botão sob home-indicator, canvas cortado com a barra do Safari. → `viewport-fit=cover` + `env(safe-area-inset-*)` em `.scr` e `#hud`; `100dvh`; medir `clientWidth/Height` (nunca `innerHeight`); escutar `resize`+`orientationchange`+`visualViewport.resize` debounced → `fit()`.
16. **Fundo "grudado" na câmera** — pattern em coords de tela: speckles viajam com o kart. → fillRect do AABB visível **em coordenadas de MUNDO**, com transform de câmera aplicado.
17. **btoa/atob com unicode** — "JOÃO" lança `InvalidCharacterError`; content da API vem com `\n`. → `slugName` NFD-strip; `b64e/b64d` unicode-safe sempre; strip `\n` antes de decodar; 404 na listagem de `s/` → `[]`, não erro.
18. **Fonte não carregada no bake** — roundel/START em fallback pra sempre. → bake inicial + re-bake obrigatório em `document.fonts.ready`; fillText vivo só com flag fontsReady.
19. **GC hitch a cada ~2s** — strings rgba e objetos criados por frame. → buckets rgba pré-formatados, pools typed-array com swap-with-last, zero `[]/{}/map` no loop; HUD só escreve `textContent` em mudança.
20. **Overlays roubando toque** — `#fx`/`#hud`/grain engolem input da corrida. → `pointer-events:none` em `#fx #hud #announce #hint` e `body::after`; `touch-action:none` no canvas.
21. **Geometria degenerada no gerador** — controles <10px após colinearização+chicane → tangente NaN. → separação mínima 60px pós-mutações + validação raio ≥110 re-rolla; `attempt>20` → fallback OVAL.
22. **Zebra no lado errado** + **steer flip lento** + **wake lock perdido** + **localStorage cheio** — menores mas certeiros: externo = `−sign(curv)`·normal com teste visual nos dois lados; attack de steer em unidades/s (flip ±1 em 160ms); `syncWakeLock()` idempotente em `go()` E no visible, com catch; wrapper LS try/catch + prune `racha:pb:*` >7 dias no boot.

---

## 6. DECISÕES DE DESEMPATE

- **D1 — Relógio de corrida**: conflito central. Plano 3 propunha `performance.now()−t0` com shift na pausa; Plano 1, soma de passos físicos. **Vence Plano 1**: `raceClock = Σ STEP` consumidos. Elimina a classe inteira de bugs de skew (sem shift de t0, sem pauseT), e o ghost 10Hz agendado por raceClock fica determinístico por construção. Da pausa do Plano 3 mantém-se apenas o overlay "PAUSADO — TOQUE PRA CONTINUAR / SAIR" e o flag `S.paused` (loop pula sim). Countdown pausado reinicia do 3.
- **D2 — Máquina de estados**: estados do Plano 3 (`HOME WARMUP LOBBY COUNTDOWN RACE RESULT RANK`, `go()` com ENTER/EXIT e tabela de transições) + mecânica DOM do Plano 2 (`.scr/.on`, scrollTo, toggle de #hud). Os sub-estados `race:countdown/running/finished` do Plano 2 viram estados de primeira classe do Plano 3. WARMUP = RACE com `warmup=true` (sem rede, sem gravador, 1 volta/8s).
- **D3 — Largura**: TRACK guarda **meia-largura `hw`** (Plano 2) — render usa direto (`x±n·hw`) e física compara `|lat| ≤ hw`. Números do DESIGN (85–145) são largura total: gerar e dividir por 2 no bake.
- **D4 — Um TRACK só**: as duas structs (Plano 1 físico, Plano 2 render) fundem-se num objeto; `buildTrack` produz tudo, incluindo geometria baked de zebra/dash/largada e o mmTrace. Render nunca recalcula; física nunca lê campos baked. Pacers do Plano 3 reescritos sobre typed arrays via `sampleAt` (não `track.samples[]` de objetos).
- **D5 — Eventos vs. chamadas diretas**: eventos discretos via fila `EV[]` drenada pelo RaceController (Plano 1); FX contínuos de alta frequência (`fxTire`, `fxDust`) por chamada direta (Plano 2). Áudio/vibração/HUD consomem só a fila.
- **D6 — Loop e pausa em background**: rAF único sempre rodando com branch por estado (Planos 2/3), **sem** cancelar no hidden (contra Plano 1) — o clamp de 50ms + `S.paused` cobrem; menos estado, menos bug de re-agendamento duplo.
- **D7 — IDs e versão**: canvases `#game/#fx/#mm` (Plano 2; `#cv` do Plano 3 descartado). `VER='v1.0.0'` (Plano 2), espelhada no cache do sw.js `racha-v1.0.0` — bump conjunto no mesmo commit.
- **D8 — Seed da rodada**: `SALA+'#R'+n` sem zero-pad no seed; `R`+pad 2 dígitos só no filename (Plano 3, confere com DESIGN §9).
- **D9 — Câmera pertence ao módulo de render** (M12), atualizada com frameDt (não STEP); números idênticos nos dois planos, sem conflito real — mantidos os do DESIGN §3.
- **D10 — Ângulo do chassi**: derivado por frame de `K.dir + drift·0.45·side + 0.12·steer` (Plano 1); campos `angle/speed/turboStage/hopT` que o Plano 2 esperava existem em K como cache/derivados, atualizados pelo physStep — render nunca muta K.
- **D11 — Token**: sem string no fonte (Plano 3 vence a letra do DESIGN §8 "token embutido" — secret-scanning revogaria o PAT publicado); ritual `#t=` + localStorage + botão colar + badge, modo solo completo sem token.
- **D12 — Boot de largada**: `{+130 px/s, 1.0s, decaimento linear}` (duração não especificada no DESIGN; marcado tunável em TUNE).