# Plano: Habilitar Push (Designações + Lembretes) e Coleta de Localização em Background no APK Android

## Resumo
Estado atual verificado no projeto:
- Push no app já pede permissão e chama `PushNotifications.register()` em `src/app/components/ProfileDrawer.tsx`, mas não há listeners de token/eventos nem persistência de token no backend.
- `google-services.json` está ausente em `android/app` (bloqueador para FCM real).
- Geolocalização já existe em `src/app/lib/geolocation.ts` e é usada em telas de ministério; no manifesto final do release não entrou `ACCESS_FINE_LOCATION/ACCESS_COARSE_LOCATION`.
- Para o escopo escolhido (`Designações + lembretes` e `Background contínuo`), faltam peças de app, banco, Edge Function e compliance Android/Play.

## Mudanças importantes em APIs/interfaces/tipos
1. Nova tabela `public.device_push_tokens`.
- Campos: `id`, `user_id`, `fcm_token`, `platform`, `device_id`, `app_version`, `enabled`, `last_seen_at`, `created_at`, `updated_at`.
- Índices: `unique(fcm_token)`, `index(user_id, enabled)`.
- RLS: usuário só gerencia os próprios tokens; função backend pode ler todos.

2. Nova tabela `public.push_delivery_logs`.
- Campos: `id`, `user_id`, `token_id`, `event_type`, `payload`, `status`, `provider_message_id`, `error`, `created_at`.
- Uso: observabilidade e retry.

3. Nova tabela `public.background_location_points`.
- Campos: `id`, `user_id`, `captured_at`, `lat`, `lng`, `accuracy_m`, `speed_mps`, `heading_deg`, `source`, `battery_level`, `is_mock`, `created_at`.
- Índices: `(user_id, captured_at desc)` e política de retenção (ex.: 30/60 dias).

4. Novas RPCs/funções SQL.
- `upsert_device_push_token(p_token, p_device_id, p_platform, p_app_version)`.
- `disable_device_push_token(p_token)`.
- `insert_background_location_points(p_points jsonb)` para inserção em lote.
- `enqueue_reminder_events()` para lembretes de revisita/território.

5. Novo módulo frontend `push-service`.
- `initPush()`, `registerPushListeners()`, `syncPushToken()`, `handlePushAction()`.

## Implementação detalhada (sem decisões pendentes)
1. Android e Firebase (pré-requisito obrigatório).
- Criar projeto Firebase vinculado ao package `com.jwgestao.app`.
- Baixar e adicionar `android/app/google-services.json`.
- Manter o plugin `com.google.gms.google-services` aplicado via `android/app/build.gradle`.
- Definir ícone e canal default de notificação no `AndroidManifest.xml`.
- Criar canal `assignments_reminders` com prioridade alta no startup nativo/JS (Capacitor Push API).

2. Permissões Android para localização.
- Incluir no manifesto:
`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`.
- Implementar fluxo de permissão em 2 etapas:
primeiro “while-in-use”; depois prompt explícito para “allow all the time”.
- Exibir rationale antes do segundo prompt para aumentar aceitação.

3. Push no app (cliente).
- No bootstrap do app, registrar listeners:
`registration`, `registrationError`, `pushNotificationReceived`, `pushNotificationActionPerformed`.
- Ao receber `registration`, enviar token para Supabase via `upsert_device_push_token`.
- Em logout, chamar `disable_device_push_token` para evitar envio indevido.
- Em `actionPerformed`, navegar para tela alvo (`/dashboard`, `/meetings`, `/ministry/...`) via payload.

4. Backend de envio push (Supabase Edge Function).
- Criar função `send-push-notifications` com FCM HTTP v1.
- Guardar credenciais Firebase como `secrets` no Supabase.
- Entradas da função:
`event_type`, `target_user_ids`, `title`, `body`, `data`, `channel_id`.
- Buscar tokens ativos por usuário.
- Enviar em lote, registrar resultado em `push_delivery_logs`.
- Invalidar token em respostas `UNREGISTERED`/`INVALID_ARGUMENT`.

5. Geração dos eventos de push.
- Designações:
trigger em `member_assignment_notifications` para inserir evento quando criar/alterar pendência.
- Lembretes:
job agendado (cron) que roda `enqueue_reminder_events()` e dispara Edge Function.
- Regras iniciais:
revisitas com `return_date` próximo e território sem atividade recente (janela configurável em `app_settings`).

6. Coleta contínua de localização (background).
- Adotar plugin/serviço de background com foreground service Android (não usar só `getCurrentPosition`).
- Iniciar tracking após consentimento explícito.
- Amostragem default:
cada 5 minutos, ou mudança >100m, com batching local (Dexie) e sync por lote.
- Persistir pontos via `insert_background_location_points`.
- Incluir botão “Pausar rastreamento” e estado visível no perfil/configurações.
- Implementar fallback: se permissão background negada, operar apenas em foreground/manual.

7. UX, privacidade e compliance.
- Tela de consentimento específica:
finalidade, frequência, retenção, como desligar.
- Política de privacidade atualizada com:
push, coleta contínua, retenção, revogação.
- Modo de revogação no app:
desabilitar push e tracking sem precisar desinstalar.

8. Rollout seguro.
- Fase 1: push designações para 5 usuários internos.
- Fase 2: incluir lembretes.
- Fase 3: liberar localização contínua por feature flag.
- Monitorar taxa de entrega, rejeição de permissão e consumo de bateria.

## Testes e cenários
1. Push token lifecycle.
- Instalar APK, conceder push, validar token salvo.
- Logout/login, validar disable/upsert corretos.
- Token inválido removido após erro FCM.

2. Entrega de push.
- App foreground: evento recebido e tratado.
- App background: notificação aparece no sistema.
- Tap na notificação abre tela correta (deep link/action).

3. Permissões de localização.
- Negar todas permissões e validar fallback sem crash.
- Permitir foreground sem background e validar comportamento degradado.
- Permitir “all the time” e validar coleta contínua.

4. Pipeline de dados de localização.
- Pontos gravados localmente e sincronizados em lote.
- RLS impede leitura entre usuários.
- Retenção remove dados antigos conforme política.

5. Regressão funcional.
- Fluxos atuais de ministério e notificações internas seguem funcionando.
- Build `apk:release` finaliza sem erro e com manifesto contendo permissões esperadas.

## Assumptions e defaults escolhidos
- Escopo de push: `Designações + lembretes`.
- Backend de push: `Supabase Edge Function`.
- Coleta de localização: `Background contínuo` com foreground service.
- Plataforma alvo imediata: APK Android (sem iOS nesta etapa).
- Sem mudança de `applicationId` (`com.jwgestao.app`).
