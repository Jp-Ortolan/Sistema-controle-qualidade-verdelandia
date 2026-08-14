# Pesquisa de Referências Visuais — SCQ

Documento de pesquisa. Nenhum código foi alterado para produzi-lo.

---

## 1. Direção visual recomendada

**"Precisão industrial silenciosa"** — uma interface predominantemente cinza/neutra, quase monocromática, onde cor é usada como um *sinal*, não como decoração. É a combinação de dois eixos:

- **Eixo estrutural** (Ant Design Pro, PatternFly, shadcn dashboard-01): densidade de dado enterprise, sidebar persistente colapsável, tokens em camadas, dark/light real.
- **Eixo de linguagem visual** (ISA-101 / ASM Consortium, referenciado via ScadaBR): fundo cinza dominante, paleta quase acromática, cor reservada para exceção.

Isso é deliberadamente o oposto do que a maioria dos dashboards React faz por padrão (cards coloridos, ícones multicoloridos, gradientes) — é exatamente esse contraste que gera a sensação de "produto industrial de verdade" em vez de "template".

Resumo em 5 palavras: **neutro, denso, hierárquico, silencioso, técnico.**

---

## 2. Peso de cada referência

| Referência | Peso | Papel |
|---|---|---|
| **ISA-101 / ASM Consortium** (via ScadaBR) | ★★★★★ | Filosofia de cor. É a peça que falta hoje — o SCQ ainda usa cor de forma "moderada", não de forma "por exceção". |
| **PatternFly** | ★★★★☆ | Arquitetura de tokens (paleta → base → semântico) e como manter 1 sistema com múltiplos temas sem duplicar decisões. |
| **shadcn/ui + shadcn dashboard-01** | ★★★★☆ | Padrão estrutural de sidebar (colapsa pra ícone, não some) + header com breadcrumb. É a peça estrutural que falta hoje. |
| **Ant Design Pro** | ★★★☆☆ | Densidade de informação e a convenção "menu principal à esquerda, sticky header" — confirma que o layout atual já está no caminho certo. |
| **ScadaBR** | ★★★☆☆ | Conceito de hierarquia de alarme (crítico > atenção > normal), não o visual literal (que é datado). |
| **Material Dashboard React** | ★☆☆☆☆ (referência negativa) | Mostra exatamente o que NÃO fazer: cards com gradiente, sidebar colorida por preferência estética, sombra em tudo. Usar como checklist do que evitar. |

---

## 3. Paleta recomendada

O SCQ já caminhou nessa direção nas últimas rodadas (tokens semânticos + verde erva-mate + grafite). A pesquisa reforça 3 ajustes:

| Token | Papel | Por quê |
|---|---|---|
| **Background** | ~95% da tela | Cinza neutro (não branco puro, não preto puro) — ASM recomenda base 60-70% cinza para reduzir fadiga visual e fazer qualquer desvio de cor "saltar". |
| **Surface / Surface elevated** | Cards, tabelas, modais | Um degrau acima do background, diferenciado só por luminosidade, não por matiz — como PatternFly faz nas camadas de token. |
| **Border** | Divisórias | Discreta, nunca decorativa. |
| **Primary (verde erva-mate)** | Identidade + 1 ação principal por tela + item ativo da navegação | Restrito. Não deve aparecer em ícones decorativos, headers de tabela ou elementos que não sejam "a ação" ou "a marca". |
| **Success / Warning / Danger / Info** | Só quando há estado real | Conforme/Não Conforme, criar/editar/excluir, alerta. Nunca para categorizar (ex.: tipo de entidade) — isso já foi corrigido na última rodada. |
| **Muted-foreground** | Texto secundário, labels, timestamps | A maior parte do texto do sistema deveria estar aqui, não em `foreground` puro — reforça a hierarquia "dado importante vs. metadado". |

O ponto central da pesquisa: **hoje o verde ainda aparece em lugares "porque fica bonito"** (ex. valor de desconto calculado, alguns ícones). A recomendação de ISA-101 é ser ainda mais rígido — se não é a ação principal, a marca, ou um estado real, é cinza.

---

## 4. Tipografia

Nenhuma das referências enterprise pesquisadas (Ant Design Pro, PatternFly, shadcn, ScadaBR) usa serifada em título — todas são 100% sans-serif, o que reforça legibilidade em densidade alta e telas de projetor.

- **Títulos de página**: sans-serif de peso alto (o sistema já usa Source Sans 3 no corpo — dá pra usar a mesma família em peso 700 para títulos, unificando em uma família só).
- **Corpo/labels/tabelas**: Source Sans 3 (já em uso, boa escolha — alta legibilidade, neutra).
- **Números/KPIs/códigos**: monoespaçada com números tabulares (já implementado com IBM Plex Mono na rodada anterior — mantém).

**Ponto em aberto para sua decisão**: o SCQ usa Cormorant Garamond (serifada) nos títulos H1/logo do login hoje. Isso é uma escolha estética deliberada de rodadas anteriores (dá um ar "editorial/marca"), mas é a **única** coisa na interface sem paralelo em nenhuma das 6 referências pesquisadas — todas são estritamente sans-serif. Duas opções:
1. Manter a serifada só no nome "Verdelândia" (marca/wordmark), sans-serif em todo o resto (inclusive títulos de página) — meio-termo.
2. Remover a serifada de vez, 100% sans-serif como as referências enterprise.

Não decidi por você — isso muda a personalidade do produto, não é só técnico.

---

## 5. Sidebar

Estrutura recomendada (baseada no padrão shadcn dashboard-01 + Ant Design Pro):

- **Persistente em desktop**, não um drawer que precisa ser aberto. Hoje o SCQ sempre esconde a sidebar atrás de um botão de menu, mesmo em tela grande — isso é um padrão mobile aplicado ao desktop.
- **Colapsável para modo "rail"** (só ícones, ~56px) em vez de sumir — o usuário nunca perde a navegação de vista.
- **Em mobile**, vira um drawer/sheet sobre o conteúdo (aí sim, o padrão atual do SCQ já está correto).
- Grupos por seção (Operação / Qualidade / Administração) — já implementado na rodada anterior, mantém.
- Item ativo: fundo sutil + texto na cor primária + borda esquerda de 2px (indicador lateral, não borda ao redor) — mais discreto que o `border` completo usado hoje.

---

## 6. Header

- Fino, sticky, uma linha só.
- Trigger da sidebar + separador vertical + breadcrumb/título da página à esquerda.
- Tema + usuário + sair à direita.
- Sem sombra decorativa — só a borda inferior de 1px que já existe.

Isso já é essencialmente o que o SCQ tem hoje — o header está estruturalmente alinhado com a referência; o que falta é a sidebar acompanhar (item 5).

---

## 7. Dashboard

- KPIs em cinza por padrão (já ajustado na rodada anterior); número grande, label pequena, sem ícone colorido decorativo.
- Um "hero chart" prioritário em vez de 3 gráficos do mesmo tamanho competindo por atenção (Baymard/PatternFly reforçam isso) — hoje os 3 gráficos do SCQ têm peso visual idêntico.
- Tabela de "últimas análises" como resumo operacional, não decorativo — já está assim.

---

## 8. Tabelas

- Cabeçalho discreto (hoje é `bg-primary` sólido — chama mais atenção que os dados; recomendação ISA-101 seria cabeçalho neutro com peso tipográfico, não cor, criando hierarquia).
- Zebra striping sutil (já implementado).
- Badge de status só quando há status real (já corrigido).
- Ações agrupadas à direita, ícone-só com tooltip (já é o padrão atual).

---

## 9. Formulários

- Já padronizado via `Field`/`Input`/`Select`/`Textarea` nas rodadas anteriores — compatível com o padrão PatternFly/shadcn de label + control + mensagem de erro em posição fixa.
- Nenhuma mudança estrutural necessária, só a aplicação da paleta mais neutra (item 3).

---

## 10. Dark Mode

- Não é "inverter as cores" — é uma paleta própria, mais escura na base (grafite quase preto, não preto puro) com o mesmo princípio de "cinza domina, cor é exceção".
- Já implementado tecnicamente (tokens com par claro/escuro) — a pesquisa não muda a arquitetura, só reforça que ambos os temas devem seguir a MESMA regra de "cor só com significado", o que ainda não está 100% consistente (ver item 3).

---

## 11. Light Mode

- Fundo levemente acinzentado (não branco puro — PatternFly e Ant Design evitam `#ffffff` puro como fundo de página por cansar a vista em uso prolongado), superfícies (cards/tabelas) em branco/quase-branco para criar contraste de elevação.

---

## 12. Cores semânticas — quando usar cada uma

| Cor | Quando usar | Quando NÃO usar |
|---|---|---|
| **Cinza (neutro)** | Estado padrão de tudo — texto, ícones, bordas, fundo | — |
| **Verde** | Ação principal da tela, item de navegação ativo, "Conforme", "sucesso" | Decoração, ícones informativos, categorização |
| **Amarelo/âmbar** | Atenção real (desconto aplicado, dado fora do padrão) | "Só para destacar" um card |
| **Vermelho** | Erro, "Não Conforme", exclusão, crítico | Categorizar um tipo de registro |
| **Azul** | Informação neutra (ex. ação "editar", dica) | Estado de sucesso ou identidade de marca |

---

## 13. Princípios de UI/UX para guiar o Design System do SCQ

1. **Reporte por exceção** — a tela em estado normal deve ser quase monocromática; cor aparece quando algo pede atenção.
2. **Uma ação primária por tela** — só um botão verde sólido por vez; o resto é `outline`/`ghost`/`secondary`.
3. **Hierarquia por peso e posição, não por cor** — título grande > label pequena > dado; não "pinta" para criar hierarquia.
4. **Densidade consciente** — o SCQ substitui planilha; tabelas podem (e devem) ser mais densas que um dashboard de consumo.
5. **Consistência de token, não de página** — nenhuma tela reinventa espaçamento/cor; tudo vem do mesmo sistema (já em vigor desde a Fase 2).
6. **Sidebar sempre visível em desktop** — navegação não é um "extra" que se esconde.
7. **Dark e light são o mesmo produto** — mesma regra de cor, luminosidade invertida, nunca paletas diferentes.
8. **Fonte mono para todo dado numérico/código** — reforça "instrumento de precisão" (já em vigor).
9. **Sem sombra decorativa** — elevação vem de contraste de superfície e borda, não de `box-shadow` pesado.
10. **Nada de gradiente, blur ou animação decorativa** — só microinteração funcional (hover, focus, loading).

---

## Conclusão

O SCQ já tem a base técnica certa (tokens, componentes, dark/light funcional) — o que falta para o salto de "sistema genérico" para "sistema industrial" é filosófico, não estrutural: **comprometer-se de verdade com o princípio "cinza é o padrão, cor é a exceção"** (ISA-101/ASM) e **fechar a lacuna estrutural da sidebar** (persistente/colapsável em desktop, como shadcn dashboard-01 e Ant Design Pro fazem). Essas duas mudanças, junto com um cabeçalho de tabela menos saturado, são o que mais deve gerar a sensação de "produto profissional" que ainda falta.

Aguardando sua autorização para aplicar qualquer uma dessas mudanças no código.
