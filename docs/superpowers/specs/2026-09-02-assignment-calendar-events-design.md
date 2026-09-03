# Design: eventos de calendário para designações confirmadas

**Data:** 2026-09-02  
**Status:** aprovado para planejamento  
**Escopo:** painel principal, grupo **Minhas Designações**

## Objetivo

Permitir que uma pessoa adicione uma designação confirmada ao calendário padrão do aparelho. O evento deve representar o período real da designação e incluir um lembrete três dias antes.

## Experiência do usuário

1. Enquanto a designação estiver pendente, a interface exibe somente as ações atuais de confirmação e ocultação.
2. Depois da confirmação, a mesma linha exibe lado a lado:
   - o selo `Confirmado ✓`;
   - o botão `Adicionar ao calendário` com ícone de calendário;
   - a ação existente de ocultar.
3. Para reuniões, áudio e vídeo e carrinho, o botão prepara diretamente o evento correspondente.
4. Para uma designação mensal recorrente de dirigente de campo, o botão abre uma escolha:
   - `Somente a próxima`; ou
   - `Todas deste mês`.
5. Na opção mensal, datas passadas são ignoradas e a interface informa quantos eventos serão adicionados antes de concluir a operação.
6. O usuário recebe uma confirmação visual quando o calendário é aberto ou os eventos são criados. Falhas apresentam uma mensagem acionável.

## Regras de data, horário e duração

### Reuniões do meio e fim de semana

- Usar a data da reunião e o horário inicial configurado no sistema.
- O evento cobre o período completo da reunião.
- Sempre que o programa permitir calcular o término, usar o último horário e sua duração.
- Quando o término não puder ser calculado, usar a duração padrão de 1 hora e 45 minutos.

### Áudio e vídeo

- Usar o mesmo início e término da reunião associada à data da designação.
- O título identifica a função específica, por exemplo `Designação — Som`.

### Carrinho

- Usar a data completa já cadastrada na escala.
- Interpretar o intervalo textual, inclusive variações de maiúsculas e acentuação, como `09:00 às 11:00` e `18:30 ÀS 19:30`.
- O início e o término vêm do próprio intervalo; portanto, designações de uma ou duas horas mantêm sua duração real.

### Dirigente de campo

- Usar o horário cadastrado como início e duração padrão de 2 horas.
- Para linhas com uma data explícita, gerar um único evento.
- Para linhas mensais baseadas em dia da semana, resolver as ocorrências restantes dentro do mês e ano da escala.
- `Somente a próxima` adiciona a primeira ocorrência futura ou de hoje.
- `Todas deste mês` adiciona todas as ocorrências futuras ou de hoje no mês, cada uma como evento separado.
- Horários com duas alternativas, como `08:30 / 08:45`, são inválidos para criação automática até que exista um único horário definido; a interface deve orientar a correção.

## Conteúdo do evento

Cada evento contém:

- título com o tipo e a função da designação;
- início e término no fuso local do aparelho;
- local, quando cadastrado;
- descrição com os detalhes visíveis da designação;
- lembrete exatamente três dias antes (`72 horas`);
- identificador estável derivado da notificação, da fonte e da ocorrência.

O identificador estável melhora o comportamento de importação, mas o aplicativo não afirma que consegue impedir duplicações em todos os provedores de calendário.

## Arquitetura

### Domínio de calendário

Criar um módulo TypeScript puro responsável por:

- representar `AssignmentCalendarEvent`;
- interpretar intervalos de horário;
- calcular datas recorrentes do mês;
- resolver eventos por categoria da notificação;
- gerar conteúdo iCalendar com um ou vários blocos `VEVENT`;
- aplicar escape de texto, fuso local e alarme de três dias.

Esse módulo não acessa React, Capacitor ou Supabase diretamente e pode ser testado isoladamente.

### Resolução dos dados da designação

Ao acionar o botão, carregar a fonte indicada por `sourceType` e `sourceId` para obter os dados que não existem na notificação atual, como horário, local, mês e ano. Reutilizar as consultas da API existente ou criar uma consulta focada por fonte.

Não é necessária uma nova coluna em `member_assignment_notifications`. A confirmação da designação continua sendo a única mutação do fluxo existente.

### Adaptadores de plataforma

- **Android/iOS:** usar uma integração nativa de calendário compatível com Capacitor, solicitar permissão apenas no primeiro uso e criar o evento no calendário padrão.
- **Web/PWA:** gerar e abrir um arquivo `.ics` universal.
- **Fallback:** se a integração nativa estiver indisponível, falhar ou tiver permissão negada, oferecer o mesmo `.ics` sem perder os dados montados.

A seleção `Todas deste mês` pode gerar múltiplos eventos numa única operação. O adaptador informa o resultado total e qualquer falha parcial.

## Componentes e estados

- O painel mantém o layout aprovado de ações lado a lado.
- Um diálogo pequeno trata exclusivamente da recorrência de saída de campo.
- Durante a resolução e criação, o botão fica desabilitado e exibe estado de carregamento.
- Clicar repetidamente não inicia operações concorrentes para a mesma notificação.
- O botão permanece disponível após uma operação bem-sucedida, porque o sistema não possui acesso portável ao histórico de importações de todos os calendários.

## Tratamento de erros

- Designação sem data, horário único ou fonte acessível: não criar evento e indicar qual dado deve ser corrigido.
- Intervalo de carrinho ilegível ou com término anterior ao início: rejeitar com mensagem clara.
- Permissão nativa negada: disponibilizar fallback `.ics`.
- Criação mensal parcialmente concluída: informar quantos eventos foram criados e quais datas falharam.
- Evento já passado: não criar; nas recorrências, ignorar somente as ocorrências passadas.

## Testes e critérios de aceite

Implementar com testes antes do código de produção.

- O botão não aparece para uma notificação pendente.
- O botão aparece imediatamente após uma confirmação bem-sucedida.
- O layout aprovado mantém `Confirmado ✓` e `Adicionar ao calendário` lado a lado e continua utilizável em telas pequenas.
- Intervalos de carrinho de uma e duas horas produzem início e término corretos.
- Saída de campo produz eventos de duas horas.
- A recorrência mensal inclui hoje e datas futuras, exclui datas passadas e não ultrapassa o mês da escala.
- Reuniões e áudio/vídeo usam o período completo da reunião e o fallback documentado quando necessário.
- O iCalendar gerado inclui `DTSTART`, `DTEND`, `UID`, local, descrição e `VALARM` de 72 horas.
- A web usa `.ics`; Android/iOS usam o adaptador nativo e recorrem ao `.ics` em falha ou recusa de permissão.
- Operações mensais reportam sucesso total ou parcial corretamente.

## Fora de escopo

- Sincronizar alterações posteriores da designação com eventos já importados.
- Remover automaticamente eventos quando uma designação for revogada.
- Detectar com garantia eventos duplicados em calendários externos.
- Permitir configurar o lembrete; nesta entrega ele é fixo em três dias.
