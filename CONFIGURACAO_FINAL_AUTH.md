# Guia de Configuração Final - Autenticação por Código

## ✅ Checklist de Configuração

### 1. Configurar Email/Password no Firebase Console

#### Passo 1: Acessar Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **suporte-7e68b**

#### Passo 2: Habilitar Email/Password Authentication
1. No menu lateral, clique em **Authentication**
2. Clique na aba **Sign-in method**
3. Na lista de provedores, encontre **Email/Password**
4. Clique no ícone de edição (ou em **Enable** se estiver desabilitado)
5. Na modal que abrir:
   - Marque **Enable** no campo "Email/Password"
   - Deixe **Email link (passwordless sign-in)** desabilitado (não precisamos)
   - Clique em **Save**

✅ **Status:** Email/Password habilitado

#### Passo 3: Verificar Domínios Autorizados
1. Ainda em **Authentication**, clique na aba **Settings**
2. Role até a seção **Authorized domains**
3. Verifique se estão presentes:
   - `localhost` (já vem por padrão)
   - Seu domínio de produção (se aplicável)

**Para adicionar um domínio:**
- Clique em **Add domain**
- Digite apenas o hostname (sem http/https)
- Exemplo: `suporte-lojinha-409489811769.southamerica-east1.run.app`
- Clique em **Add**

✅ **Status:** Domínios autorizados configurados

---

### 2. Configurar Variável de Ambiente VITE_POSTMARK_PROXY_URL

#### Opção A: Arquivo .env.local (Desenvolvimento Local)

1. Na raiz do projeto, crie ou edite o arquivo `.env.local`:

```bash
# Arquivo: .env.local
VITE_POSTMARK_PROXY_URL=https://sua-url-postmark-proxy.a.run.app
```

2. **Substitua** `https://sua-url-postmark-proxy.a.run.app` pela URL real do seu proxy Postmark

3. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

#### Opção B: Verificar URL do Proxy Postmark

Se você já fez deploy do proxy Postmark:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **Cloud Run**
3. Encontre o serviço `postmark-email-proxy`
4. Copie a URL do serviço (ex: `https://postmark-email-proxy-xxxxx.southamerica-east1.run.app`)
5. Use essa URL no `.env.local`

#### Opção C: Fazer Deploy do Proxy Postmark (Se ainda não fez)

1. Navegue até a pasta do proxy:
```bash
cd postmark-email-proxy
```

2. Faça o deploy:
```bash
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co"
```

**Credenciais já configuradas:**
- Server Token: `ee246569-f54b-4986-937a-9288b25377f4`
- FROM_EMAIL: `atendimento@yoobe.co` (confirmado e verificado)

4. Anote a URL gerada e use no `.env.local`

✅ **Status:** Variável de ambiente configurada

---

### 3. Testar o Fluxo Completo de Autenticação

#### Teste 1: Envio de Código

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse: `http://localhost:3000`
3. Clique em **"Acessar Portal do Cliente"**
4. Digite um email válido (ex: `teste@exemplo.com`)
5. Clique em **"Enviar Código de Acesso"**

**Verificações:**
- ✅ Botão mostra "Enviando..." durante o processo
- ✅ Aparece mensagem "Código Enviado!"
- ✅ Campo para digitar código aparece
- ✅ Email é recebido na caixa de entrada (ou spam)

#### Teste 2: Verificação de Código

1. Abra o email recebido
2. Copie o código de 4 dígitos (ex: `1234`)
3. Cole no campo de código na tela
4. Clique em **"Verificar e Acessar"**

**Verificações:**
- ✅ Botão mostra "Verificando..." durante o processo
- ✅ Usuário é autenticado e redirecionado para o dashboard
- ✅ Não há erros no console do navegador

#### Teste 3: Código Inválido

1. Tente digitar um código incorreto (ex: `9999`)
2. Clique em **"Verificar e Acessar"**

**Verificações:**
- ✅ Mensagem de erro aparece: "Código inválido ou expirado"
- ✅ Usuário pode solicitar novo código

#### Teste 4: Código Expirado

1. Solicite um código
2. Aguarde mais de 5 minutos
3. Tente usar o código

**Verificações:**
- ✅ Mensagem de erro: "Código inválido ou expirado"
- ✅ Sistema oferece opção de reenviar código

#### Teste 5: Reenvio de Código

1. Após receber um código, clique em **"Reenviar código"**
2. Digite o email novamente
3. Solicite novo código

**Verificações:**
- ✅ Novo código é gerado
- ✅ Código anterior é invalidado
- ✅ Novo email é enviado

#### Teste 6: Verificar Firestore

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Firestore Database**
3. Verifique a coleção `authCodes`

**Verificações:**
- ✅ Códigos são criados quando solicitados
- ✅ Códigos têm campo `used: false` inicialmente
- ✅ Códigos têm campo `expiresAt` configurado para 5 minutos
- ✅ Após uso, código é marcado como `used: true`

#### Teste 7: Verificar Firebase Auth

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Authentication** > **Users**
3. Verifique os usuários criados

**Verificações:**
- ✅ Usuários são criados automaticamente após validação do código
- ✅ Email está correto
- ✅ Usuário pode fazer login novamente com o mesmo email

---

## 🔍 Troubleshooting

### Problema: Código não chega por email

**Possíveis causas:**
1. URL do Postmark proxy incorreta
2. Proxy não está rodando
3. Token do Postmark inválido
4. Email bloqueado como spam

**Soluções:**
1. Verifique a variável `VITE_POSTMARK_PROXY_URL` no `.env.local`
2. Verifique os logs do Cloud Run para erros
3. Teste o proxy diretamente fazendo uma requisição POST
4. Verifique a pasta de spam do email

### Problema: Erro ao criar usuário no Firebase

**Possíveis causas:**
1. Email/Password não está habilitado
2. Domínio não está autorizado
3. Erro de conexão com Firebase

**Soluções:**
1. Verifique se Email/Password está habilitado no Firebase Console
2. Adicione o domínio em Authorized domains
3. Verifique o console do navegador para erros específicos

### Problema: Código sempre inválido

**Possíveis causas:**
1. Código expirou
2. Código já foi usado
3. Email não corresponde ao código

**Soluções:**
1. Solicite um novo código
2. Verifique se está usando o email correto
3. Verifique no Firestore se o código existe e não está usado

---

## 📝 Notas Importantes

- **Expiração:** Códigos expiram em 5 minutos
- **Uso único:** Cada código só pode ser usado uma vez
- **Invalidação:** Solicitar novo código invalida o anterior
- **Senha:** Usuário não precisa conhecer a senha (gerada internamente)
- **Criação automática:** Usuários são criados automaticamente no primeiro login

---

## ✅ Pronto para Produção

Após completar todos os testes acima, a aplicação está pronta para uso em produção!

### Checklist Final:
- [ ] Email/Password habilitado no Firebase
- [ ] Domínios autorizados configurados
- [ ] Variável `VITE_POSTMARK_PROXY_URL` configurada
- [ ] Proxy Postmark rodando e acessível
- [ ] Testes de envio de código funcionando
- [ ] Testes de validação de código funcionando
- [ ] Usuários sendo criados corretamente no Firebase Auth
- [ ] Códigos sendo armazenados no Firestore

---

## 🚀 Próximos Passos (Opcional)

1. **Configurar regras de segurança do Firestore** para a coleção `authCodes`
2. **Criar Cloud Function** para limpar códigos expirados automaticamente
3. **Adicionar rate limiting** para prevenir spam de códigos
4. **Monitorar logs** do Cloud Run e Firebase para identificar problemas

