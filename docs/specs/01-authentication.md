# 🔐 Especificação de Autenticação

**Última Atualização:** 2025-01-11  
**Status:** ✅ Ativo

## 📋 Visão Geral

O sistema utiliza **Firebase Authentication** com autenticação baseada em código de 4 dígitos enviado por email.

## 🔑 Configuração Firebase

### Projeto Firebase
- **Project ID:** `suporte-7e68b`
- **Project Number:** `409489811769`
- **Auth Domain:** `suporte-7e68b.firebaseapp.com`
- **API Key:** `AIzaSyB7GpJqjqhf-igQEsgK2m6_Rd9L_HKrSTI`

### Configuração no Código
**Arquivo:** `firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyB7GpJqjqhf-igQEsgK2m6_Rd9L_HKrSTI",
  authDomain: "suporte-7e68b.firebaseapp.com",
  projectId: "suporte-7e68b",
  storageBucket: "suporte-7e68b.firebasestorage.app",
  messagingSenderId: "409489811769",
  appId: "1:409489811769:web:7c53dba622e5a4a2df60e8",
  measurementId: "G-G529W9ESSD"
};
```

### Idioma Padrão
- **Language Code:** `pt-BR` (configurado em `auth.languageCode`)

## 📧 Email Code Authentication

### Fluxo de Autenticação

1. **Solicitação de Código:**
   - Usuário informa email em `UserLogin.tsx`
   - Sistema gera código de 4 dígitos (1000-9999)
   - Código salvo no Firestore na coleção `authCodes`
   - Código enviado por email via Postmark proxy

2. **Armazenamento do Código:**
   ```typescript
   {
     email: string (normalizado para lowercase),
     code: string (4 dígitos),
     createdAt: Timestamp,
     expiresAt: Timestamp (5 minutos),
     used: boolean
   }
   ```

3. **Validação do Código:**
   - Usuário digita código de 4 dígitos
   - Sistema valida código no Firestore
   - Verifica se não expirou (5 minutos)
   - Verifica se não foi usado
   - Marca código como usado após validação

4. **Autenticação Firebase:**
   - Após código válido, sistema tenta fazer login
   - Se usuário não existe, cria automaticamente
   - Senha temporária gerada internamente (usuário não precisa saber)
   - Autenticação realizada via `signInWithEmailAndPassword` ou `createUserWithEmailAndPassword`

### Serviço de Autenticação

**Arquivo:** `services/authService.ts`

#### Funções Principais

- `generateAuthCode(email: string)`: Gera código de 4 dígitos e salva no Firestore
- `validateAuthCode(email: string, code: string)`: Valida código e retorna boolean
- `sendAuthCodeEmail(email: string, code: string)`: Envia email via Postmark proxy

### Envio de Email

- **Serviço:** Postmark (via proxy no Cloud Run)
- **Template:** HTML formatado com código destacado
- **Expiração:** 5 minutos
- **Formato:** Código de 4 dígitos (ex: `1234`)

### Tratamento de Erros

**Códigos de Erro:**
- Código inválido ou expirado
- Erro ao enviar email
- Erro ao criar/autenticar usuário no Firebase

**Mensagens Específicas:**
- "Código inválido ou expirado. Solicite um novo código."
- "Falha ao enviar o código. Verifique o endereço e tente novamente."
- "Erro ao fazer login. Tente novamente."

## 🛡️ Segurança

### Implementações de Segurança

1. **Expiração de Códigos:**
   - Códigos expiram em 5 minutos
   - Validação automática de expiração
   - Códigos marcados como usados após validação

2. **Invalidação de Códigos:**
   - Códigos anteriores são invalidados ao gerar novo código
   - Apenas um código ativo por email por vez

3. **Validação de Dados:**
   - Email validado antes de envio
   - Código sanitizado (apenas dígitos)
   - Email normalizado (lowercase)

4. **Gerenciamento de Estado:**
   - Estado de autenticação gerenciado pelo Firebase Auth
   - Sessão persistida automaticamente

## 📂 Arquivos Relacionados

- `firebase.ts` - Configuração Firebase
- `App.tsx` - Monitoramento de estado de autenticação
- `components/UserLogin.tsx` - Interface de login
- `services/authService.ts` - Lógica de autenticação por código
- `types.ts` - Tipo `AuthCode`

## 🔄 Estrutura Firestore

### Coleção: `authCodes`

```typescript
{
  email: string,
  code: string,
  createdAt: Timestamp,
  expiresAt: Timestamp,
  used: boolean
}
```

**Regras de Segurança (Recomendadas):**
- Usuários podem criar códigos para seu próprio email
- Códigos expiram automaticamente após 5 minutos
- Códigos marcados como usados não podem ser reutilizados

## ⚠️ Regras de Mudança

### ❌ NUNCA modificar sem atualizar esta spec:
- Configuração Firebase (`firebaseConfig`)
- Fluxo de autenticação por código
- Tempo de expiração dos códigos (5 minutos)
- Tratamento de erros de autenticação

### ✅ SEMPRE atualizar esta spec quando:
- Adicionar novo método de autenticação
- Modificar fluxo de autenticação
- Mudar configurações de segurança
- Alterar tempo de expiração

## 🔄 Changelog

### v2.0.0 (2025-01-11)
- Implementação de autenticação por código de 4 dígitos
- Remoção de Phone Authentication
- Remoção de Email Link Authentication
- Criação de `authService.ts`
- Integração com Postmark para envio de emails
- Armazenamento de códigos no Firestore

### v1.0.0 (2025-11-05)
- Implementação inicial de Email Link Auth
- Implementação de Phone Auth
- Criação de AuthModal profissional
- Remoção de alerts do navegador
- Tratamento completo de erros
