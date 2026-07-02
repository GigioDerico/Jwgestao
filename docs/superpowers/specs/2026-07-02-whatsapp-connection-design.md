# Conexão WhatsApp via uazapi na página de Configurações

**Data:** 2026-07-02
**Status:** Aprovado para implementação

## Contexto

A Meta mudou o fluxo de conexão do WhatsApp e o pareamento via painel da uazapi parou de funcionar. A conexão via API continua funcionando normalmente. O app já usa a uazapi para envio de mensagens (designações e metas), com credenciais (`uazapi_instance`, `uazapi_token`) salvas na tabela `app_settings` e requisições proxiadas pela Edge Function `uazapi-proxy`.

Este projeto adiciona a conexão/desconexão da linha WhatsApp diretamente pela página de Configurações do app.

## Escopo

**Incluído:**
- Conectar a instância existente via QR code **e** via código de pareamento
- Exibir status da conexão (disconnected / connecting / connected / hibernated)
- Desconectar a instância

**Fora de escopo:**
- Criar/deletar instâncias (exige `admintoken`)
- Configuração de webhooks
- Hibernar instância

## API uazapi (referência)

Fonte: `https://docs.uazapi.com/openapi-bundled.json` (uazapiGO 2.1.1). Autenticação: header `token` com o token da instância.

- `POST /instance/connect` — sem `phone` no body → retorna QR code (base64 no campo `instance.qrcode`); com `phone` (formato `5511999999999`) → retorna código de pareamento (`instance.paircode`). Status vira `connecting`. QR expira em ~2 min; paircode em ~5 min.
- `GET /instance/status` — retorna `{ instance, status: { connected, loggedIn, jid } }`. Durante conexão, `instance.qrcode` traz o QR renovado. Campos úteis: `instance.status`, `instance.profileName`, `instance.paircode`.
- `POST /instance/disconnect` — encerra a sessão; nova conexão exige novo QR/pareamento.

## Arquitetura

### 1. Edge Function `supabase/functions/uazapi-proxy/index.ts`

Generalizar o proxy atual (hoje hardcoded para `/send/text`):

- Body da requisição: `{ instance, token, endpoint, method, payload }`
- `endpoint` validado contra allowlist: `/send/text`, `/instance/connect`, `/instance/status`, `/instance/disconnect`
- `method` validado (`GET` ou `POST` conforme endpoint)
- Encaminha para `https://whatsapparteinovacao.uazapi.com{endpoint}` com header `token`; fallback para `https://free.uazapi.com{endpoint}` em caso de falha (comportamento atual preservado)
- Retorna resposta da uazapi com status code original
- Retrocompatibilidade: chamadas existentes de `/send/text` continuam funcionando (adaptar cliente e função juntos; formato antigo pode ser removido)

### 2. Cliente `src/app/lib/whatsapp.ts`

Novas funções, seguindo o padrão das existentes (leem credenciais de `app_settings` via `api.getAppSetting`):

- `connectInstance(phone?: string)` → `POST /instance/connect`; retorna `{ qrcode?, paircode?, status }`
- `getInstanceStatus()` → `GET /instance/status`; retorna `{ status, connected, loggedIn, profileName?, qrcode?, paircode? }`
- `disconnectInstance()` → `POST /instance/disconnect`

Erros da API são propagados com mensagem legível para exibição em toast.

### 3. UI `src/app/components/SettingsPage.tsx`

Nova seção **"Conexão WhatsApp"** abaixo dos campos Instância/Token UAZAPI:

**Status:**
- Badge colorido: verde `Conectado`, amarelo `Conectando`, cinza `Desconectado` (hibernated exibido como `Sessão pausada`)
- Quando conectado, mostra `profileName`
- Status carregado ao abrir a página (se instância/token preenchidos) e botão de atualizar manual

**Conectar (botão, visível quando não conectado):**
Abre modal (Dialog Radix) com 2 abas (Tabs Radix):
- **Aba QR Code:** chama `connectInstance()` sem phone; exibe `<img src="data:image/png;base64,...">`; poll `getInstanceStatus()` a cada 3s para renovar QR e detectar conexão; ao conectar → fecha modal + toast de sucesso
- **Aba Código de pareamento:** input do número (com hint de formato 55 + DDD + número, mesma normalização de `whatsapp.ts`); chama `connectInstance(phone)`; exibe paircode em destaque; mesmo poll
- Poll para ao fechar o modal
- Se QR/paircode expira (status volta a `disconnected` sem conectar), exibe botão "Gerar novo código"

**Desconectar (botão, visível quando conectado):**
- AlertDialog de confirmação avisando que nova conexão exigirá novo QR/pareamento
- Chama `disconnectInstance()`, atualiza badge, toast

**Erros:** toast (sonner) com mensagem da API; caso instância/token não preenchidos, seção mostra aviso pedindo para preenchê-los e salvar primeiro.

## Fluxo de dados

```
SettingsPage → lib/whatsapp.ts → Edge Function uazapi-proxy → uazapi (header token)
                    ↑ credenciais de app_settings (Supabase)
```

## Testes / Verificação

- Teste manual: conectar linha real via QR e via pareamento na tela de Configurações; verificar badge; desconectar; reconectar
- Verificar que envio de designações (`/send/text`) continua funcionando após generalização do proxy
- Casos de erro: token inválido, instância inexistente, QR expirado
