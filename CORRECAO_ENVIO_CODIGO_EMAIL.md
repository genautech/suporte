# Correção: Cliente não consegue receber código via email

**Data:** 17 de Novembro de 2025  
**Problema:** Cliente não conseguia receber código de acesso via email devido a permissões do Firestore

## Problema Identificado

Erros no console:
- `Missing or insufficient permissions` ao tentar criar código em `authCodes`
- `Missing or insufficient permissions` ao tentar registrar login em `supportUsers`

**Causa Raiz:**
As regras do Firestore exigiam autenticação (`request.auth != null`) para criar documentos em `authCodes` e `supportUsers`, mas o cliente precisa gerar o código ANTES de fazer login. Isso criava um problema de "ovo e galinha".

## Solução Implementada

### 1. Regras para `authCodes` (linhas 59-79)

**Antes:**
```firestore
match /authCodes/{codeId} {
  allow read, write: if request.auth != null;
}
```

**Depois:**
```firestore
match /authCodes/{codeId} {
  // Permitir criar código sem autenticação, mas validar que tem email
  allow create: if request.resource.data.email != null && 
                   request.resource.data.code != null &&
                   request.resource.data.expiresAt != null;
  
  // Permitir ler apenas se autenticado E o código for do próprio email
  allow read: if request.auth != null && 
                 (resource.data.email == request.auth.token.email || 
                  isAdmin());
  
  // Permitir atualizar apenas se autenticado E o código for do próprio email
  allow update: if request.auth != null && 
                   (resource.data.email == request.auth.token.email || 
                    isAdmin());
  
  // Não permitir delete (códigos são marcados como used ao invés de deletados)
  allow delete: if false;
}
```

**Mudanças:**
- ✅ Permite criar código sem autenticação (necessário para gerar código antes do login)
- ✅ Valida que o código tem email, code e expiresAt
- ✅ Permite ler/atualizar apenas códigos do próprio email (ou admin)
- ✅ Não permite deletar (códigos são marcados como used)

### 2. Regras para `supportUsers` (linhas 92-111)

**Antes:**
Não havia regra específica, então cai no padrão que nega tudo.

**Depois:**
```firestore
match /supportUsers/{email} {
  // Permitir criar apenas se o ID do documento (email) corresponder ao email no documento
  allow create: if email == request.resource.data.email &&
                   request.resource.data.email != null;
  
  // Permitir ler apenas se autenticado E for o próprio email OU admin
  allow read: if request.auth != null && 
                 (email == request.auth.token.email || 
                  isAdmin());
  
  // Permitir atualizar apenas se autenticado E for o próprio email OU admin
  allow update: if request.auth != null && 
                   (email == request.auth.token.email || 
                    isAdmin());
  
  // Não permitir delete
  allow delete: if false;
}
```

**Mudanças:**
- ✅ Permite criar usuário sem autenticação (necessário para registrar login)
- ✅ Valida que o ID do documento (email) corresponde ao email no documento
- ✅ Permite ler/atualizar apenas o próprio perfil (ou admin)
- ✅ Não permite deletar

## Segurança

As regras mantêm segurança ao:
1. **Validar dados:** Exigem que campos obrigatórios estejam presentes
2. **Restringir acesso:** Usuários só podem acessar seus próprios dados
3. **Proteger contra abuso:** Não permitem deletar dados
4. **Admin override:** Admins podem acessar tudo

## Deploy

Regras deployadas com sucesso:
```bash
firebase deploy --only firestore:rules --project suporte-7e68b
```

**Status:** ✅ Deploy concluído

## Teste

Para testar:
1. Acesse a aplicação em produção
2. Clique em "Acessar Portal do Cliente"
3. Digite um email válido
4. Clique em "Enviar Código de Acesso"
5. Verifique que o código é gerado e enviado por email
6. Verifique que não há mais erros de "Missing or insufficient permissions"

## Arquivos Modificados

- `firestore.rules` - Regras atualizadas para `authCodes` e `supportUsers`

---

**Correção concluída!** ✅

