# Gestão de confirmações por reunião

Objetivo: permitir que coordenador/designador acompanhe respostas, encontre recusas com motivo e abra o local correto para substituir o designado.

- Acrescentar áudio/vídeo à leitura administrativa de respostas; preservar controle de acesso e retornar apenas designações vigentes.
- Criar RPC mensal com reuniões agrupadas e contagens de recusas, pendências e confirmações. Buscar tudo em uma chamada; não expor motivos a publicadores/secretários.
- Criar componente independente para aba Confirmações: mês, navegação anterior/próximo, atualizar, busca por nome/função, filtros por resposta/tipo, resumo e reuniões expansíveis. Recusas antes de pendências e confirmações; motivo inteiro visível, data da resposta, distinção áudio/vídeo. Estados de carregamento/erro/vazio explícitos.
- Ação Tratar designação abre reunião selecionada na aba Designação ou escala de áudio/vídeo na data correspondente; respeitar permissão de editar. Atualizar respostas ao retornar e em eventos de notificações sem misturar usuários/períodos.
- Substituir a lista simples da aba atual e, se solicitado, reutilizar no menu principal Reuniões.
- Validar testes UI/API, SQL de permissões/áudio/vídeo com rollback, build e revisão. Aplicar migração e enviar commit à main conforme autorização da sessão.

## Validação realizada

- Tela integrada em Designações → Reuniões → Confirmações.
- 25 testes focados passaram, incluindo atualização após substituição.
- Build de produção passou.
- Regressão SQL transacional passou após aplicação da migração no projeto vinculado.
- Suíte completa: 303 passaram e 13 falhas preexistentes de calendário; teste adicional de atualização passou na execução focada posterior.
- Revisão sem P1/P2; atualização após salvar explícita, independente de Realtime.
