# Análise de Viabilidade Técnica: Preparação Focada em Mobile Nativo (iOS / Android)

## 1. Contexto do Projeto Atual
Atualmente, o **JW Gestão** é construído usando **React 18** (via Vite), operando exclusivamente como uma **SPA Web** (Single Page Application) rodando diretamente nos navegadores (Chrome, Safari, etc). Isso significa que, no momento, o projeto confia inteiramente no DOM da web (Elementos HTML como `<div>`, `<button>`, `<table>`) através da biblioteca de estilização `Tailwind CSS`.

---

## 2. O Aplicativo Atual é "Mobile Nativo"?
**Não.** O aplicativo hoje é *Mobile-Responsive* ou uma *Web App Responsiva*.
Ele se adapta lindamente (com menus sanduíche, blocos espremidos e fontes adaptáveis) à tela de um celular graças ao Tailwind CSS, mas **não** pode ser compilado diretamente num arquivo `.apk` (Android) ou `.ipa` (iOS) para as lojas Google Play e App Store utilizando o código em sua conformação atual.

## 3. Caminhos Possíveis para Aplicativo nas Lojas (App Stores)

Para tornar a aplicação baixável por lojas, existem 3 abordagens tradicionais e como a base atual lida com elas.

### Abordagem A: PWA (Progressive Web App) - *Caminho Mais Fácil*
**Prontidão do Código Atual: 🔴 40% (Faltam Configurações Básicas Web)**
- Transforma seu site em algo instalável no celular sem passar pelas lojas.
- **O que falta:** Para virar PWA, o projeto precisaria de um arquivo `manifest.json`, adição de `Service Workers` de cache offline básico (já que o vite precisa ter o plugin `vite-plugin-pwa` configurado) e ícones padrões nativos.
- **Veredito:** O projeto não tem os arquivos para agir como PWA oficial ainda.

### Abordagem B: WebViews Empacotadas (CapacitorJS / Cordova) - *Caminho Intermediário*
**Prontidão do Código Atual: 🟡 70%**
- Envolve pegar 100% da compilação do React Web atual (HTML/Tailwind/React-Router) e "envelopar" dentro de um aplicativo nativo usando um navegador invisível no celular.
- **O que falta:** O código web atende perfeitamente. Daria muito pouco trabalho técnico de reescrita. O único problema seriam transições complexas, ausência de acesso *hardcore* a biometria sofisticada ou push notifications nativos via código atual. Necessitaria somente integrar o Capacitor (`npm install @capacitor/core @capacitor/cli`) por cima do Vite.
- **Veredito:** Sendo um app de formulários de Igreja de baixa exigência gráfica (sem games 3D complexos ou renderizações severas), a stack Web suportaria bem com o Capacitor rodando-o nas Lojas.

### Abordagem C: React Native / Expo - *O Caminho Nativo Original*
**Prontidão do Código Atual: 🔴 10% (Incompatível diretamente)**
- Apps nativos puros para React exigem que o projeto não possua HTML (Eles usam `<View>` ao invés de `<div>` e `<Text>` em vez de `<p>`).
- **O que falta:** Como a tipagem e hooks dos dados (`publishers`, lógica, context) estão bem isoladas em pastas de dados (`src/app/data`), a lógica de negócios se salva. Porém, 100% do código UI (`className="bg-card p-6"`, imports de `lucide-react`, `Radix UI`) teriam que ser totalmente descartados e recriados do zero.
- **Veredito:** Não é possível simplesmente "exportar" para React Native. Exigiria criar outro repositório `jw-gestao-mobile` e reaproveitar apenas arquivos vitais de API/State.

---

## 4. Auditoria de Elementos Web Proibidos em Nativo Real (React Native)

Se a decisão for reescrever e criar um verdadeiro nativo (Caminho C), estes elementos atuais causariam gargalos absolutos:
- **Radix UI:** Biblioteca puramente focado em Árvores DOM. Incompatível com mobile puro (onde usam PickerNatve/Modais Nativas de UIKit).
- **Tailwind CSS V4:** React Native não suporta folhas CSS normais, necessitando do *NativeWind* ou usar estilos parecidos com StyleSheet.
- **React-Router v7:** Em RN usa-se o React Navigation ou Expo Router. Todo o `routes.ts` que criamos perderia validade.
- **Tabelas do HTML (`<table>`):** Usada largamente na aba `Membros.tsx`. No Mobile real, tabelas complexas não fluem bem, precisando compor *FlatLists* (Listas verticais simples com cards).

---

## 5. Recomendação Profissional do Arquiteto (Agente)

Se seu objetivo principal for aprovação rápida nas lojas gastando pouco tempo codando ou o desejo de mandar aos usuários apenas com um "Adicionar à Tela Inicial":

**1. Siga a via do PWA Integrado (Transformar Site em App "Falso"):** Instalar o plugin no Vite para forçar o layout de instalação de APP direto nos telefones Chrome/Safari sem App Store.
**2. Envelopar via CapacitorJS (Transformar Site em APP "Verdadeiro"):** O projeto atual, com todos os recursos base de Tailwind e componentes de qualidade do Radix UI já prontos para telas flexíveis, ficará brilhante envelopado no visualizador do **CapacitorJS**. Com isso, ele pode gerar saídas iOS (`.ipa`) e Android (`.aab`) compiláveis sem jogar fora NENHUMA linha do Front-End React.
