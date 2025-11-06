# Teste Rápido do Fluxo de Autenticação

## Pré-requisitos

Antes de testar, certifique-se de que:

1. ✅ Email/Password está habilitado no Firebase Console
2. ✅ Variável `VITE_POSTMARK_PROXY_URL` está configurada no `.env.local`
3. ✅ Proxy Postmark está rodando e acessível

## Teste Rápido (5 minutos)

### 1. Iniciar Servidor
```bash
npm run dev
```

### 2. Acessar Aplicação
Abra: `http://localhost:3000`

### 3. Testar Login
1. Clique em **"Acessar Portal do Cliente"**
2. Digite seu email: `seu_email@exemplo.com`
3. Clique em **"Enviar Código de Acesso"**
4. Aguarde o email (verifique spam também)
5. Digite o código de 4 dígitos recebido
6. Clique em **"Verificar e Acessar"**

### 4. Verificar Sucesso
- ✅ Você deve ser redirecionado para o dashboard
- ✅ Não deve haver erros no console do navegador (F12)

## Verificação no Console do Navegador

Abra o DevTools (F12) e verifique:

**Console (aba Console):**
- Não deve haver erros em vermelho
- Deve aparecer: "Código gerado: XXXX" (após solicitar código)
- Deve aparecer mensagens de sucesso

**Network (aba Network):**
- Deve haver requisição POST para o Postmark proxy
- Status deve ser 200 OK
- Deve haver requisições para Firestore (authCodes)

## Verificação no Firebase Console

1. **Firestore Database:**
   - Coleção `authCodes` deve ter documentos
   - Campo `used` deve estar como `false` inicialmente
   - Campo `expiresAt` deve estar configurado

2. **Authentication > Users:**
   - Após validar código, deve aparecer novo usuário
   - Email deve corresponder ao usado no teste

## Problemas Comuns

### ❌ "Código não chega por email"
- Verifique se `VITE_POSTMARK_PROXY_URL` está correto
- Verifique logs do Cloud Run
- Verifique pasta de spam

### ❌ "Código inválido ou expirado"
- Solicite novo código
- Verifique se passou mais de 5 minutos
- Verifique se código já foi usado

### ❌ "Erro ao fazer login"
- Verifique se Email/Password está habilitado no Firebase
- Verifique console do navegador para erro específico
- Verifique se domínio está autorizado

## ✅ Tudo Funcionando?

Se o teste acima funcionou, parabéns! A autenticação está configurada corretamente.

