# Cores das reuniões e áudio/vídeo pessoal

Objetivo: colorir os cards de reunião conforme as respostas pessoais e incluir funções de áudio/vídeo na reunião da mesma data.

1. Acrescentar contagens de confirmadas e recusadas ao resumo da reunião e testes de mapeamento. Cards neutros sem designação; verde quando todas confirmadas; prioridade entre pendentes/recusadas conforme resposta do usuário.
2. Integrar áudio/vídeo ao contrato normalizado de designações, incluindo som, imagem, palco, microfones e entradas/auditório. Vincular à reunião da mesma data; manter validação de identidade, versão, data e revogação.
3. Sincronizar notificações no banco para alterações de áudio/vídeo, preservar confirmações existentes no backfill e trocar sincronização legada do frontend por RPC. Incluir histórico e links pessoais.
4. Criar migração pela CLI, validar SQL com testes transacionais e verificar segurança. Aplicar a migração ao projeto já autorizado, conferir funções e registro.
5. Executar testes do fluxo, suíte completa, build e revisão do diff. Relatar falhas preexistentes de calendário.

Decisão: vermelho prevalece quando houver recusa; amarelo quando houver resposta não confirmada; verde somente quando todas confirmadas. Reuniões históricas usam unconfirmed_count separada das respostas que ainda podem ser enviadas. Escalas sem reunião preservam o fluxo legado no banco; atribuições substituídas exigem nova confirmação.

Validação: teste SQL transacional de áudio/vídeo passou com rollback; revisão final sem P1/P2; build aprovado; suíte JS com 296 aprovados e as mesmas 13 falhas preexistentes de calendário.
