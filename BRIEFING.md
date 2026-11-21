# Lozy Creative — Site Institucional
## Briefing de continuidade para Claude Code

---

## 1. Contexto do projeto

**Lozy Creative** é um estúdio criativo de audiovisual em São Paulo, operado solo pelo fundador (Leo). **Foco atual (atualização de 21/11/2026):** marcas, atletas e influenciadores, em esporte, bem-estar e estilo de vida. Médicos e corporativo continuam sendo atendidos, mas **não são destacados** no site.

Internamente existe a divisão Studio (conteúdo de marca) e Pro (conteúdo recorrente para profissionais), mas **"Studio" e "Pro" não aparecem em lugar nenhum do site** (menu, títulos, botões, seções).

O site antigo (`lozycreative.com`, feito no Canva e limitado — não permitia criar novas abas) foi substituído por este projeto. O domínio antigo venceu e não foi renovado; o endereço oficial agora é `lozycreative.com.br`.

**Stack:** HTML/CSS/JS puro, sem framework, sem build. Deploy em GitHub Pages apontando para `lozycreative.com.br` (DNS no Registro.br).

**Fora do ar por ora:** `briefing.lozycreative.com` (página de briefing de cliente, HTML puro no GitHub Pages, repo separado). Estava no domínio antigo e ainda não foi migrado para o `.com.br`.

**E-mail de contato:** os rodapés ainda usam `hello@lozycreative.com`. Ele só recebe mensagens enquanto o domínio antigo tiver DNS/MX ativos; se parar de funcionar, trocar nas 5 páginas.

---

## 2. Referência de design

O site é uma adaptação estrutural de **https://auteurstudios.au** (produtora australiana, feita em Webflow). Leo aprovou explicitamente "copiar" a estrutura e os mecanismos de interação, adaptando com a identidade da Lozy.

**Sempre confira a referência ao vivo antes de mudar layout ou animação.** Screenshots enganam — o mecanismo real só aparece no HTML.

### Mecanismos da referência que foram replicados

| Mecanismo | Onde | Como funciona |
|---|---|---|
| **Preloader** | Home | Logo + frase, fade-out após ~900ms |
| **Text roll** | Todos os botões | Texto duplicado dentro de uma janela de altura `1.2em` com `overflow:hidden`; no hover o trilho desliza `translateY(-1.2em)` |
| **Título romano → itálico** | Showcase (home), cards (work) | Duas versões sobrepostas, opacidade cruzada no hover |
| **Carrossel infinito** | Home e Work | Mesmo carrossel em desktop e mobile: cartões 9:16 absolutos; o ativo no centro, vizinhos menores com leve blur (`--x/--s/--blur/--op` calculados em `showcase.js`). Troca por clique no vizinho, arraste/swipe, setas (só desktop), teclado ou trackpad. No mobile o cartão central ocupa ~68% da largura e os vizinhos espiam nas laterais. **Ordem:** o carrossel segue a ordem definida no painel de vídeos e **sempre abre no primeiro da lista** (a cada carregamento e a cada troca de nicho). **Vídeo horizontal:** se o poster for mais largo que alto, o cartão ativo se abre em 16:9 (largura máx. 70% do bloco no desktop e 94% no mobile) e os vizinhos abrem espaço (`--w/--h/--t/--shift`, classe `.is-wide`); inativo, continua 9:16 recortado |
| **Player inline** | Home e Work | Clique no vídeo ativo toca ali mesmo com controles nativos (sem modal) |
| **Grid selado + hover video** | Work | Gap zero, cantos retos; poster estático → vídeo `.mp4` local em autoplay silencioso no hover |
| **Reveal on scroll** | Todas | IntersectionObserver adiciona `.visible` em `.reveal` |
| **Nav adaptativo** | Todas | Transparente sobre hero escuro → sólido ao scrollar; logo troca cream ↔ black |

---

## 3. Identidade visual

### Paleta oficial (identidade nova, 21/11/2026)

```css
--marfim:   #EAE3D6;  /* fundo claro; texto sobre Petróleo */
--petroleo: #17313B;  /* fundo escuro; texto sobre Marfim */
--mar:      #2F5D62;  /* acento SOBRE MARFIM (linhas, botões, textos de apoio) */
--mare:     #7FA9A6;  /* acento SOBRE PETRÓLEO */
```

- **Cada acento só na sua superfície.** Maré sobre Marfim e Mar sobre Petróleo não passam no contraste (Marfim/Petróleo 10,7:1; Maré/Petróleo 5,3:1; Mar/Marfim 5,8:1).
- **Cores chapadas:** sem degradês, vidro fosco (`backdrop-filter`) nem sombras decorativas.
- Não existem mais Vinho, Terracota nem Grafite Frio. Não reintroduzir.

### Ritmo de cores da Home (na ordem do scroll)

marfim (hero, verbete, faixa de logos) → marfim (showcase) → **mar** (O que fazemos, com cartões marfim) → marfim (CTA, título em petróleo) → **petróleo** (rodapé)

### Tipografia

- **Garet Book** — títulos de destaque (hero, títulos de seção, nomes dos cartões, números em contorno, CTA), em minúsculas (só a primeira letra em maiúscula, quando for frase). Peso único (400), **sem itálico**. Servida localmente: `assets/fonts/Garet-Book.woff2` e `.woff` (`@font-face` no topo de `styles.css`, variável `--display`). **Pendente:** confirmar a licença de uso na web antes de publicar; a pasta de origem não trazia arquivo de licença.
- **Montserrat** — verbete, linhas de apoio, citações e as páginas internas (Work, Contato, Sobre, Projeto), que ainda não migraram para a Garet. Pesos 200, 300, 400, 500 + itálicos 200/300
- **Inter** — corpo, labels, botões. Pesos 300, 400, 500

Montserrat e Inter vêm do Google Fonts. **Nenhuma outra família deve entrar no site sem aprovação.** Foram testadas e descartadas por ora: Block Berthold (sem licença web confirmada) e Garet Heavy.

### Assets de marca

Na pasta `assets/`. São JPEGs com fundo sólido (branco nos logos, preto nos símbolos) — **precisam ter o fundo removido programaticamente** antes de usar. O script de extração está na seção 6.

- `logocream` (sobre Petróleo) / `logoblack` (sobre Marfim) — logotipo completo
- `symbolblack` / `symbolcream` — símbolo isolado
- **Pendente:** `symbolwine.png` (usado no CTA) precisa ser substituído por versões novas, em Mar sobre Marfim e em Maré ou Marfim sobre Petróleo. Leo envia os arquivos. Os `*wine` e `*terracotta` devem sair de `assets/` quando as novas entrarem.

Atualmente os assets estão **embutidos como base64** dentro de cada HTML. Isso deixa os arquivos pesados (index.html ~1MB). **Melhoria recomendada:** extrair para arquivos `.png` externos na pasta `assets/` e referenciar por caminho relativo.

---

## 4. Voz da marca

Do Guia de Voz oficial:

**Voz (atualização de 21/11/2026):** declarar (hero, sobre) com frases calmas e curtas; explicar (serviços, processo) de forma direta e concreta; convidar (CTA, contato) de forma falada. Evitar pares de abstratos repetidos ligados por "e" e frases que serviriam em qualquer produtora. O eixo "precisão / controle / corpo e tempo" saiu de todos os textos. **Não reintroduzir.** As frases-manifesto abaixo são do guia antigo e estão obsoletas.

**Vocabulário PROIBIDO:** sinergia, disruptivo, cutting-edge, excelência, paixão por contar histórias, soluções personalizadas, inovador, outside the box

**Frases-manifesto disponíveis** (do guia, ainda não aplicadas no site):
- "O corpo que virou manifesto."
- "Antes do resultado, a intenção."
- "Nem toda marca merece um filme. A sua, sim."
- "Performance não é o que se mostra. É o que se decide antes."
- "Todo dia é dia de prova."
- "Constância é a forma mais alta de performance."
- "Sua marca não para. Sua produção também não deveria."
- "O pico existe porque o treino não falhou."

**Direção de copy:** Leo rejeita linguagem genérica de agência. Já vetou frases como "Criatividade e estratégia para quem não aceita medíocre" e "Estética e resultado" (soa a coach). Prefere frases curtas, específicas, com cadência quase atlética. O padrão da referência é: **uma linha em caps + uma linha menor em itálico**.

---

## 5. Estado atual dos arquivos

```
index.html     Home        ~1.0 MB
work.html      Portfólio   ~400 KB
projeto.html   Case study (template dinâmico via ?id=)  ~245 KB
sobre.html     Sobre       ~298 KB
contato.html   Contato     ~247 KB
assets/        8 PNGs de marca (fundo sólido, precisa extração)
```

### index.html — seções na ordem

1. **Preloader** — logo + "Conceito. Imagem. Entrega.", uma palavra por vez, com respiro entre elas. As palavras completam em 0,5 s, 0,95 s e 1,4 s. O preloader **sai quando a imagem do hero estiver pronta, mas nunca antes de 1,7 s nem depois de 3,5 s**, contados desde o início do carregamento (`MIN`/`MAX` no script de `index.html`). Não espera mais o evento `load`, que esperava todas as imagens da página e atrasava a saída
2. **Hero** — card escuro com `border-radius: 20px` dentro de moldura marfim de 14px. "Feito de perto." em caps + subfrase em itálico. Botão único "Entrar em contato"
3. **Verbete "lo·zy"** — formato de dicionário
4. **Trusted** ("Marcas que confiam na gente") — faixa só com o traçado em Mar (sem preenchimento) sobre fundo marfim, com os logos passando em loop (desktop 40 s; mobile 10 s com logos menores, para caber mais na tela; o mouse pausa). Os logos são PNGs claros sobre transparente e são pintados de Petróleo por `mask` no CSS (`--logo` inline em cada `.logo-slot`). Para incluir um logo novo, duplique o `<span class="logo-slot">` nos dois conjuntos (o segundo é `aria-hidden`)
5. **Showcase** — carrossel infinito, projetos em destaque, clique toca o vídeo inline com controles (`.mp4` local)
6. **O que fazemos** (`#atos` no HTML) — painel Mar com título, linha de apoio ("Um time montado para cada projeto.") e 5 cartões Marfim (Publicidade, Eventos, Real-time, Direção criativa, Fotografia), cada um com "(01)" em itálico, título em caixa alta, descrição e o número grande em contorno. No hover o cartão inverte para Petróleo. **No celular (≤768 px)** a seção fixa na tela (`.m-pin` > `.m-sticky`) e o cartão troca conforme a rolagem, com os anteriores recuando atrás e cinco traços de progresso; a classe `.m-scroll` é ligada por um script inline em `index.html`. O cartão exibido anda **no máximo um passo por vez** (`STEP`, 480 ms), mesmo que a rolagem (inércia do dedo) passe por vários de uma vez, e há uma folga (`BAND`) perto da divisa entre dois cartões para não ficar indo e voltando. O bloco ocupa 100svh + 4 × 90svh de rolagem (`.m-pin` em `styles.css`)
7. **Depoimentos** — desativados (comentados no HTML)
8. **CTA** — fundo marfim, "Tem um *projeto* em mente?" em petróleo, botão em Mar
9. **Rodapé** — fundo petróleo; ano gerado por JS (`.ano`)

### work.html

**Um único carrossel infinito** (o mesmo de `showcase.js`) com todos os projetos, e um **seletor de nichos** acima dele: Todos · Marcas & Publicidades · Eventos & Ativações · Médicos. Em vez de rolar para baixo por um carrossel por categoria, o visitante troca o nicho no seletor. Cada painel (`.showcase-panel`) tem `data-cat="marcas|eventos|medicos"`; o seletor chama `window.LozyShowcase.setFilter(wrap, cat, true)`, que esconde os painéis de fora (`.is-filtered`) e remonta o carrossel com os que sobraram, com um fade/deslize curto. O link `work.html#eventos` (ou `#marcas`, `#medicos`) abre já filtrado, e o botão "voltar" do navegador acompanha. Para um projeto novo, copie um `.showcase-panel` e escolha o `data-cat`; para um nicho novo, acrescente um botão `.wf-btn` com `data-filter` igual ao novo `data-cat`.

Cada painel:
- Poster estático local (`assets/videos/projects/{slug}-poster.jpg`)
- `<video>` local (`assets/videos/projects/{slug}.mp4`, `muted loop playsinline`) carregado sob demanda via `data-src`; o painel ativo toca ali mesmo, com controles nativos
- Nome do cliente sempre sobreposto, centralizado
- Botão "Ver projeto completo" → `projeto.html?id={slug}`

A seção "Descubra mais" está comentada no HTML (voltaremos nela com o portfólio novo).

### projeto.html

Template único. Lê `?id=` da URL e popula a partir do objeto `PROJECTS` no `<script>` (esse objeto é **gerado** a partir de `data/projects.json`; não edite à mão, use o painel de vídeos).

Estrutura: "Todos os trabalhos" → bloco com **título (cliente) + subtítulo**, **vídeo** e **detalhes** (categoria, ano, entrega, descrição) → CTA.
- O vídeo **mantém a própria proporção, sem faixas pretas**. A proporção (`--ar`) é lida do poster (chega primeiro) e confirmada pelo vídeo (`loadedmetadata`).
- **Vídeo vertical (9:16), desktop:** vídeo à esquerda (largura limitada para caber na altura da tela, entre 240 e 520 px) e título + detalhes à direita (`.is-vertical`).
- **Vídeo horizontal e celular:** título, vídeo e detalhes empilhados (`.is-horizontal`).
- **Só aparece o que está preenchido.** Campo vazio ou com texto de exemplo entre colchetes (`[Formato]`, `[Descrição…]`) é escondido. O subtítulo só aparece se for diferente do nome do cliente.

---

## 6. Vídeos

Os vídeos **não usam mais o Vimeo**: são arquivos `.mp4` (H.264 ~5 Mbps) + poster `.jpg` versionados no próprio repo, em `assets/videos/` (hero em `assets/videos/hero.mp4`, projetos em `assets/videos/projects/{slug}.mp4`).

- Cada projeto é identificado por um **slug** (ex.: `alan-baic-v1`), usado no nome dos arquivos e em `projeto.html?id={slug}`.
- **A lista de projetos é `data/projects.json`** (cliente, título, categoria, nicho do Work, ano, entrega, descrição, ordem do Work e ordem da home). Quem mantém essa lista é o **painel de vídeos** (`npm run admin`; guia em `admin/README.md`).
- Projetos com `"hidden": true` em `data/projects.json` (botão **Ocultar** do painel) ficam guardados mas **não são gerados** na home, no Work nem em `projeto.html` (o link mostra "Projeto não encontrado"); ao mostrar de novo voltam à mesma posição. Oculto **não é privado**: o arquivo continua acessível pelo endereço.
- Para adicionar/trocar/reordenar/ocultar/remover vídeos **use o painel**. Ele comprime o vídeo, extrai a capa, atualiza `data/projects.json`, regera as partes das páginas e, depois de uma revisão, publica.
- `admin/build-site.js` (`npm run build`) gera os painéis do carrossel em `index.html` e `work.html`, os botões de nicho e o objeto `PROJECTS` de `projeto.html`, **apenas entre os marcadores** `projects:...:start/end`. Não edite à mão o que está entre eles.
- Limites: o GitHub recusa arquivos acima de **100 MB**, e o Pages recomenda sites de até **~1 GB** (os vídeos já somam ~680 MB). Quando chegar perto, mover os vídeos para armazenamento externo.
- `assets/videos/README.md` guarda o histórico da primeira carga (pode estar desatualizado).

---

## 7. Script de extração dos assets

Os PNGs em `assets/` são JPEGs com fundo sólido. Para gerar versões com transparência:

```python
from PIL import Image
import numpy as np

def extract(path, target_w=None, target_size=None):
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    r, g, b = arr[:,:,0].astype(int), arr[:,:,1].astype(int), arr[:,:,2].astype(int)
    corner = arr[5,5][:3].astype(int)          # cor do fundo = pixel do canto
    dist = abs(r-corner[0]) + abs(g-corner[1]) + abs(b-corner[2])
    arr[dist < 60, 3] = 0                       # tolerância 60
    result = Image.fromarray(arr)
    bbox = result.getbbox()
    if bbox: result = result.crop(bbox)         # crop no conteúdo
    if target_w:
        h = int(result.size[1] * target_w / result.size[0])
        result = result.resize((target_w, h), Image.LANCZOS)
    elif target_size:
        result = result.resize(target_size, Image.LANCZOS)
    return result

# Logos: target_w=500 | Símbolos: target_size=(480,480)
```

Para reduzir peso, quantizar RGB em 32 cores preservando o canal alpha (as cores de marca são chapadas e toleram bem).

---

## 8. Pendências

### Bloqueadores para publicar
- [ ] **Vídeo reel do hero** — Leo vai editar; slot já reservado em `index.html`
- [ ] **Número de WhatsApp real** — placeholder `5511999999999` em index, sobre, contato e rodapé

### Conteúdo em placeholder
- [ ] Frase principal + subfrase do hero
- [ ] Frase do preloader
- [ ] Verbete "lozy" (origem/significado do nome)
- [ ] Frase da faixa-ponte
- [ ] Títulos editoriais dos 9 projetos
- [ ] Descrições dos case studies (`PROJECTS` em `projeto.html`)
- [ ] 3 depoimentos reais + vídeos pareados
- [ ] Bio e foto do fundador (`sobre.html`)
- [ ] Parágrafos da seção "Nossa história"
- [ ] Descrições expandidas dos 3 atos
- [ ] 3 projetos autorais da seção "Descubra mais"

### Assets faltantes
- [ ] Logos dos clientes (Nike, Fila, Fiat Abarth, Hellmann's, BYD, Seara, Ritua, You Club) para a seção Trusted — hoje são placeholders de texto
- [ ] Imagem de fundo da faixa-ponte
- [ ] Vídeo do processo (coluna direita dos 3 atos)

### Melhorias técnicas recomendadas
- [ ] **Extrair base64 para arquivos externos** — reduz drasticamente o peso das páginas
- [ ] **Formulário de contato** — hoje usa `mailto:` (frágil). Recomendado: Formspree (gratuito, funciona em GitHub Pages)
- [ ] Considerar smooth scroll com inércia (Lenis) — presente na referência, não implementado
- [ ] Meta tags de SEO e Open Graph
- [ ] Favicon a partir do símbolo da Lozy

---

## 9. Conteúdo já aprovado (não mexer sem falar com Leo)

### Os 3 atos

**01 — Escutamos.** *Toda história começa antes da câmera.*
Briefing e imersão · Direção criativa · Roteiro e pauta

**02 — Criamos.** *Cada frame com intenção.*
Direção e captação · Luz, som e movimento · Edição e pós-produção

**03 — Entregamos.** *Feito para conectar.*
Formatos para cada plataforma · Estratégia de distribuição · Suporte pós-entrega

### Frase da faixa-ponte (direção aprovada)
"Pensado com criatividade. Guiado pela estratégia." — pode ser refinada

### CTA final
"Tem um *projeto* em mente?" — aprovada

---

## 10. Como Leo trabalha

- **Explicar antes de executar.** Para mudanças estruturais, propor a arquitetura e confirmar antes de tocar no código
- Feedback vem curto e direto ("pode seguir", "não gostei", "está muito diferente da referência")
- Espera que erros sejam apontados proativamente, não só que o pedido seja cumprido
- Português do Brasil em toda a UI, copy e conversa
- Ele commita manualmente após cada sessão
- Prefere soluções sustentáveis por uma pessoa só — nada que exija manutenção constante
