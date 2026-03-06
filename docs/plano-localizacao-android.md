# Plano Separado: Localização Android (sem Push)

## Objetivo
Implementar localização Android de forma independente de push, cobrindo:
- captura manual já existente;
- rastreamento contínuo com fila offline;
- consentimento explícito;
- rollout por feature flag.

## Escopo Implementado
1. Banco e backend de localização.
- Migration `20260306073000_add_background_location_tracking.sql`.
- Nova tabela `public.background_location_points`.
- RPC `public.insert_background_location_points(p_points jsonb)` com validação de payload.
- RLS para leitura/inserção do próprio usuário.
- Chaves padrão em `app_settings`:
`location_tracking_enabled`, `location_tracking_interval_sec`,
`location_tracking_distance_m`, `location_tracking_retention_days`,
`location_tracking_internal_user_ids`.

2. Android nativo.
- Permissões adicionadas no `AndroidManifest.xml`:
`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `WAKE_LOCK`.
- `LocationTrackingForegroundService` declarado no manifesto.
- Serviço nativo implementado como classe interna em `android/app/src/main/java/com/jwgestao/app/MainActivity.java`.

3. Frontend de tracking.
- Módulo `src/app/lib/location-tracking.ts` com:
`startTracking`, `stopTracking`, `initializeLocationTrackingForUser`,
`enqueuePoint`, `flushPoints`, `requestForegroundLocationPermission`,
`requestBackgroundLocationPermissionStep`, `subscribeToLocationTracking`.
- Fila offline via Dexie (`pending_location_points`) com retry exponencial.
- Sincronização em lote (até 50 pontos por chamada RPC).
- Eventos de observabilidade via logs:
`permission_granted`, `permission_denied`, `tracking_started`,
`tracking_paused`, `flush_success`, `flush_error`.

4. UI e consentimento.
- `ProfileDrawer` recebeu:
estado do rastreamento, fila local, métricas de configuração, erro atual,
ações `Iniciar`, `Pausar` e `Sincronizar agora`.
- Modal de consentimento explícito com confirmação do usuário antes do início.

5. Bootstrap do tracking.
- `Layout` inicializa rastreamento para usuário autenticado.
- Em logout, rastreamento é interrompido na sessão atual.

## Consulta Administrativa (Volume Diário)
```sql
SELECT
  user_id,
  date_trunc('day', captured_at)::date AS dia,
  count(*) AS pontos
FROM public.background_location_points
GROUP BY user_id, dia
ORDER BY dia DESC, user_id;
```

## Rollout por Feature Flag
1. Flags começam com `location_tracking_enabled = false`.
2. Ativação controlada por `location_tracking_internal_user_ids`.
3. Quando a lista estiver vazia e a flag principal for `true`, o recurso fica global.

## Checklist de Validação
1. Permissões.
- Negar localização: app continua operacional.
- Permitir localização: botão de iniciar tracking habilita fluxo de consentimento.

2. Tracking.
- Iniciar tracking: status muda para ativo.
- Pausar tracking: status muda para pausado.
- Sincronizar agora: envia fila pendente via RPC.

3. Dados.
- Pontos entram em `pending_location_points` quando offline.
- Ao voltar online, sincronização remove pendências enviadas.
- RLS impede leitura de pontos de outros usuários.

4. Release Android.
- Build de APK deve conter permissões no manifesto final.
- Push permanece fora do escopo desta entrega.
