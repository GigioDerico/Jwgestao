# JW Gestão - Documentação e Visão Geral

> Uma aplicação projetada para facilitar a organização, escalas e gestão geral de uma congregação local, auxiliando Anciãos e Servos Ministeriais no controle de publicadores e designações de reuniões.

## 1. Sobre o Projeto
O **JW Gestão** é uma plataforma focada especificamente nas necessidades de fluxo de informações de designações, calendário de reuniões e controle de membros de uma congregação.
Ele permite a visão ampla de quem fará partes específicas na reunião cristã (Reunião Vida e Ministério e Reunião Pública), status e privilégios espirituais de cada membro agregado, bem como confirmações de recebimento das designações.

---

## 2. Tecnologias e Stack (Arquitetura)
O JW Gestão foi idealizado e construído com uma stack moderna voltada para estabilidade, performance limpa e escalabilidade:

### 🌐 Frontend & UI
- **Framework Core:** React 18, empacotado através do **Vite** para ganho massivo de performance no build e recarregamento local (HMR).
- **Linguagem:** TypeScript, mantendo a tipagem estrita e blindagem contra erros de compilação durante as rotinas de interface.
- **Roteamento:** React Router (v7), organizando de forma coesa a navegação entre a tela de Login isolada e as telas autenticadas no `Layout` protegido.
- **Estilização:** Tailwind CSS (v4), favorecendo componentes consistentes, uso flexível de design tokens e UI responsiva nativa.
- **Componentização Avançada:** Radix UI (como Primitives sem estilo pré-definido) servindo de motor base para componentes semânticos e perfeitamente acessíveis (Select, Menus, Accordions, Dialogs, etc).
- **Ícones:** Lucide React, ícones limpos e profissionais.

---

## 3. Módulos e Páginas do Sistema

A aplicação é segmentada para garantir foco produtivo na navegação:

### A. Painel de Controle (Dashboard)
A central de observabilidade de quem tem acesso privilegiado.
- *Analytics Rápido:* Demonstra o total populacional da congregação listado em número de Publicadores, Contagem de Reuniões programadas, Designações pendentes de confirmação pelo orador e as já confirmadas.
- *Lista de Próximas Reuniões:* Agrupamento cronológico (Ex: de Fevereiro, com os presidentes previstos, temática semanal como "Isaías 33-35", divididos entre *Vida e Ministério* ou *Reunião Pública*).
- *Quadro de Anúncios:* Notificações importantes de gestão, como visita de superintendente de circuito ou arranjos especiais.

### B. Gestão de Membros (Membros da Congregação)
A base principal de dados gerenciais da congregação. Permite:
- **Filtragem e Buscas:** Por nome ou filtragem condicional de privilégio local (Todos, Ancião, Servo Ministerial, Publicador).
- **Visualização Detalhada:** Informando a situação da tabela de atividades do membro (Ativo / Inativo).
- **Controle de Privilégios (Tags textuais):** Gestão visual sobre quem cuida de áudio/vídeo, microfones, contas, etc.

### C. Sistema de Reuniões (Meetings)
Controle focado na pauta semanal. Módulos que permitem ver o que acontecerá, quem preside, se está agendada parte padrão da *Sentinela* nos finais de semana ou o bloco da *Vida e Ministério Cristã* do meio de semana.

### D. Designações (Assignments)
Este é um módulo interativo e altamente essencial.
- Mapeamento cruzado (Relacionamento visual) que atrela o "Membro" (orador/ajudante/estudante/indicador) a um "Dia de Reunião" e uma "Classe" (Parte do corpo/estudo).
- Lógica de aceitação de privilégio visual: `Pendente` (necessário que o membro visualize e dê "Confirmar") versus `OK / Confirmado` (status finalizado sinalizado na cor verde com check).

### E. Configurações (Settings)
Gestão local da estrutura base e das contas e layout (Light / Dark mode, perfis administrativos).

---

## 4. O Fluxo de Trabalho e Funcionalidades Core
- O sistema se guia pela premissa da **simplicidade**. Apenas listagens vitais com botões de ação bem denotados (como adição direta de membros no botão "+ Adicionar Novo Membro").
- Totalmente Mobile-Friendly, o que significa que anciãos ou publicadores responsáveis ​​pelo controle de indicadores/áudio podem consultar em tempo real a escala utilizando celulares sem nenhuma quebra na experiência de uso da interface do Tailwind.
