# Lozy Creative — Site Institucional
## Briefing de continuidade para Claude Code

---

## 1. Contexto do projeto

**Lozy Creative** é uma agência de audiovisual em São Paulo, operada solo pelo fundador (Leo). Duas frentes:

- **Lozy Studio** — conteúdo cinematográfico/de marca para marcas, influenciadores e criadores
- **Lozy Pro** — conteúdo recorrente de alto volume para profissionais (médicos, advogados), formato "Um Mês em Um Dia": uma sessão de captação gera um mês de conteúdo

O site atual (`lozycreative.com`) foi feito no Canva e é limitado — não permite criar novas abas. Este projeto o substitui.

**Stack:** HTML/CSS/JS puro, sem framework, sem build. Deploy em GitHub Pages apontando para `lozycreative.com`.

**Já existe e permanece:** `briefing.lozycreative.com` (página de briefing de cliente, HTML puro no GitHub Pages).

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
| **Acordeão horizontal** | Home, seção showcase | 5 painéis em flex; `flex:1` colapsado, `flex:7` ativo; `transition: flex .65s` disparado no `mouseenter` |
| **Grid selado + hover video** | Work | Gap zero, cantos retos; poster estático → iframe Vimeo em autoplay silencioso após 180ms de hover |
| **Reveal on scroll** | Todas | IntersectionObserver adiciona `.visible` em `.reveal` |
| **Nav adaptativo** | Todas | Transparente sobre hero escuro → sólido ao scrollar; logo troca cream ↔ black |

---

## 3. Identidade visual

### Paleta oficial (do Guia de Voz da Lozy)

```css
--sand:      #EAE3D6;  /* fundo principal, texto sobre escuro */
--sand-dark: #E2DAC9;  /* fundo alternado */
--ink:       #1A1B1D;  /* quase-preto: hero, showcase, textos */
--wine:      #4E1A1D;  /* acento: trusted, rodapé, CTA title, história */
--terra:     #8C4530;  /* acento: labels, numeração, depoimentos */
--mid:       #877F72;  /* texto secundário morno */
```

### Ritmo de cores da Home (na ordem do scroll)

areia → **vinho** (trusted) → areia → ink (showcase) → **vinho** (ponte) → areia (atos) → **terracota** (depoimentos) → areia (CTA, título em vinho) → **vinho** (rodapé)

### Tipografia

- **Montserrat** — display/títulos. Pesos 200, 300, 400, 500 + itálicos 200/300
- **Inter** — corpo, labels, botões. Pesos 300, 400, 500

Carregadas via Google Fonts. **Nenhuma outra família deve entrar no site.**

### Assets de marca

Na pasta `assets/`. São JPEGs com fundo sólido (branco nos logos, preto nos símbolos) — **precisam ter o fundo removido programaticamente** antes de usar. O script de extração está na seção 6.

- `logoblack` / `logocream` / `logowine` / `logoterracotta` — logotipo completo
- `symbolblack` / `symbolcream` / `symbolwine` / `symbolterracotta` — símbolo isolado

Atualmente os assets estão **embutidos como base64** dentro de cada HTML. Isso deixa os arquivos pesados (index.html ~1MB). **Melhoria recomendada:** extrair para arquivos `.png` externos na pasta `assets/` e referenciar por caminho relativo.

---

## 4. Voz da marca

Do Guia de Voz oficial:

**Vocabulário da Lozy:** corpo, tempo, forma, ritmo, controle, performance, precisão, constância, presença, cadência, pulso, sustentar, intenção, marco, peso, visão

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

1. **Preloader** — logo + frase (placeholder)
2. **Hero** — card escuro com `border-radius: 20px` dentro de moldura areia de 14px. **Slot reservado para o vídeo reel principal** (Leo vai editar um vídeo de melhores takes). Texto: `[FRASE PRINCIPAL]` em caps + `[Subfrase em itálico]`. Botão único "Entrar em contato"
3. **Verbete "lo·zy"** — formato de dicionário. Definição em placeholder
4. **Trusted** — fundo vinho, 8 slots de logo (atualmente placeholders com nome em texto)
5. **Showcase** — acordeão horizontal, 5 projetos, clique abre modal do Vimeo
6. **Ponte** — faixa de 420px, fundo vinho, frase placeholder + botão "Sobre nós"
7. **Três atos** — coluna esquerda com 01/02/03 empilhados, coluna direita com slot de vídeo sticky
8. **Depoimentos** — fundo terracota, carrossel de 3 slides com dots
9. **CTA** — fundo areia, "Tem um *projeto* em mente?" em vinho
10. **Rodapé** — fundo vinho

### work.html

Grid selado de 3 colunas, gap zero, 9 projetos. Cada card:
- Poster estático buscado via **oEmbed público do Vimeo** (`https://vimeo.com/api/oembed.json?url=...`) — roda no client-side ao carregar
- iframe do Vimeo em `background=1&autoplay=1&loop=1&muted=1` que aparece após 180ms de hover
- Nome do cliente sempre sobreposto, centralizado
- Clique → `projeto.html?id={vimeoId}`

Seção "Descubra mais" no fim com 3 slots para trabalhos autorais.

### projeto.html

Template único. Lê `?id=` da URL e popula a partir do objeto `PROJECTS` no topo do `<script>`. Estrutura: breadcrumb → cliente → título → player grande → descrição (esquerda) + metadados (direita) → CTA de volta.

**Para editar qualquer projeto, mexer só no objeto `PROJECTS`.**

---

## 6. Vídeos no Vimeo

| ID | Cliente | Categoria |
|---|---|---|
| 1213545823 | Pedro Nogueira × Fila | Esporte |
| 1213545654 | João Druzian × Fiat Abarth | Automotivo |
| 1213545242 | Bella Guttmann × Nike | Publicidade |
| 1213544692 | Ritua Offline (2ª ed.) | Evento |
| 1213544072 | You Club × CHSA | Evento |
| 1213544425 | Ritua Offline (1ª ed.) | Evento |
| 1213546527 | Dr. Augusto — Cirurgia Capilar | Lozy Pro |
| 1213546134 | Dr. Augusto — Ads Transplante | Lozy Pro |
| 1213546350 | Dr. João Malta — Ads Nutrição | Lozy Pro |

**Os 5 em destaque na Home:** 1213545823, 1213545654, 1213545242, 1213544692, 1213546527

**Ainda em upload** (retornavam 404): 1214226985, 1214226975, 1214226914, 1214226733

### ⚠️ Problema conhecido: vídeos não reproduzem

Leo reportou que os embeds não tocam. O código está correto (IDs certos, URL do player bem formada). Causa provável: **restrição de domínio de embed no Vimeo**. Verificar em cada vídeo: *Settings → Privacy → Where can this be embedded?* — deve estar em "Anywhere" ou com `lozycreative.com` e `*.github.io` liberados. **Confirmar isso antes de debugar código.**

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
- [ ] **Verificar privacidade dos vídeos no Vimeo** (ver seção 6)

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
