# Quick Start: Testar Exportação de Membros

## Pré-requisitos

- Ambiente de desenvolvimento rodando (`pnpm dev` ou `npm run dev`)
- Acesso ao sistema com um perfil que tenha permissão `export_members` (ex: `coordenador` ou `secretario`)
- Pelo menos alguns membros cadastrados com e sem grupo de campo

## Passo a passo para testar

1. **Inicie o ambiente**:
   ```bash
   pnpm dev
   ```

2. **Faça login** com um usuário de perfil `coordenador`.

3. **Navegue até Membros** pelo menu lateral.

4. **Verifique o botão de exportação**:
   - Deve aparecer próximo ao botão "Adicionar Novo Membro" (ou na área de filtros).
   - Se não aparecer, verifique se o perfil tem a permissão `export_members`.

5. **Teste exportação PDF simples**:
   - Clique em Exportar.
   - Selecione **PDF**.
   - Não marque "Agrupar por grupos".
   - Confirme.
   - Verifique se o arquivo baixado contém todos os membros em ordem alfabética.

6. **Teste exportação PDF agrupada**:
   - Clique em Exportar.
   - Selecione **PDF**.
   - Marque **"Agrupar por grupos"**.
   - Confirme.
   - Verifique se os membros estão separados por seções com o nome do grupo.

7. **Teste exportação Excel simples**:
   - Clique em Exportar.
   - Selecione **Excel**.
   - Não marque "Agrupar por grupos".
   - Confirme.
   - Abra o arquivo `.xlsx` e verifique os dados.

8. **Teste exportação Excel agrupada**:
   - Clique em Exportar.
   - Selecione **Excel**.
   - Marque **"Agrupar por grupos"**.
   - Confirme.
   - Verifique se há uma aba (ou seções) para cada grupo de campo.

9. **Teste filtros**:
   - Aplique um filtro na tabela (ex: buscar por nome ou situação espiritual).
   - Exporte novamente.
   - Verifique se apenas os membros filtrados aparecem no documento.

10. **Teste lista vazia**:
    - Aplique um filtro que não retorne resultados.
    - Tente exportar.
    - O sistema deve exibir uma mensagem informando que não há membros para exportar.

## Verificação de permissões

- Faça login como `publicador`.
- Navegue até Membros.
- O botão de exportação **não deve aparecer**.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Botão de exportação não aparece | Verificar `usePermissions.ts` e a matriz do usuário logado |
| PDF não gera no iOS/Capacitor | O fallback de impressão deve ser acionado automaticamente |
| Excel não abre | Verificar se a biblioteca `xlsx` foi instalada (`pnpm add xlsx`) |
| Membros sem grupo não aparecem | Verificar se a lógica de "Sem grupo" está implementada |
