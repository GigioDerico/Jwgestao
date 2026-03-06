# Plano de teste do app no iPhone (iOS)

## Resumo
O projeto iOS ja existe no repositorio em:

- `/Users/giorgioderico/Library/Mobile Documents/com~apple~CloudDocs/Trabalho/Projetos AI/Jwgestao/ios/App/App.xcodeproj`

O fluxo para testar em celular iOS e:

1. gerar build web atualizada
2. sincronizar Capacitor para iOS
3. configurar assinatura no Xcode
4. instalar e rodar no iPhone fisico

## Mudancas em APIs/interfaces/tipos publicos
Nenhuma. Este plano cobre apenas execucao de teste em device iOS.

## Passo a passo
1. Preparar pre-requisitos no Mac e no iPhone.
- Xcode instalado e aberto ao menos uma vez (aceitar licencas).
- iPhone conectado por cabo (primeiro teste e mais estavel).
- iPhone com Modo de Desenvolvedor ativo:
  `Ajustes > Privacidade e Seguranca > Modo de Desenvolvedor`.
- Apple ID logado no Xcode:
  `Xcode > Settings > Accounts`.

2. Atualizar a build que sera testada.
- No diretorio do projeto, rodar:

```bash
npm run build
npx cap sync ios
```

- Isso garante que o iOS use o conteudo web mais recente (`dist`).

3. Abrir projeto no Xcode e configurar assinatura.
- Abrir `ios/App/App.xcodeproj`.
- Selecionar target `App` > `Signing & Capabilities`.
- Habilitar `Automatically manage signing`.
- Selecionar seu `Team`.
- Se houver conflito de bundle id, usar um id unico
  (exemplo: `com.seunome.jwgestao`).

4. Instalar no iPhone.
- Selecionar o iPhone como destino de execucao no Xcode.
- Clicar em `Run` (Play).
- Se o iPhone bloquear o app:
  `Ajustes > Geral > VPN e Gerenciamento de Dispositivo`
  e confiar no certificado do desenvolvedor.

5. Rodar smoke test minimo no aparelho.
- Abrir app e validar inicializacao, login e navegacao principal.
- Validar permissao de localizacao quando o fluxo de GPS for usado.
- Validar notificacoes push somente se APNs/Firebase iOS ja estiverem
  configurados.

## Casos de teste (aceite)
1. App instala e abre sem crash em iPhone fisico.
2. Login funciona com backend real.
3. Navegacao entre telas principais sem travamentos.
4. Permissao de localizacao aparece e funciona apos aceitar.
5. App reabre normalmente apos fechar e abrir novamente.

## Assumptions/defaults
- Teste em `Debug` via Xcode (sem TestFlight/IPA neste momento).
- Ambiente de desenvolvimento em Mac.
- Bundle id atual pode permanecer `com.jwgestao.app` se nao houver conflito.
- Conta Apple gratuita e suficiente para teste local, mas o app assinado pode
  expirar em cerca de 7 dias.
