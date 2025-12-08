# 🚀 Guia: Executar Local Como Produção

**Data:** 2025-01-27  
**Status:** ✅ Configurado

## 🎯 Objetivo

Este guia explica como executar o ambiente local exatamente como a produção, usando os arquivos buildados ao invés do servidor de desenvolvimento do Vite.

## 📊 Diferenças: Dev vs Produção

### Modo Desenvolvimento (`npm run dev`)
- ✅ Hot reload automático
- ✅ Source maps completos
- ✅ Erros detalhados no console
- ⚠️ Não é exatamente como produção
- ⚠️ Usa Vite dev server

### Modo Produção Local (`npm run preview:prod`)
- ✅ Arquivos buildados (como produção)
- ✅ Otimizações aplicadas
- ✅ Mesma estrutura de arquivos
- ✅ Comportamento idêntico à produção
- ⚠️ Sem hot reload (precisa rebuild)

## 🚀 Como Executar Como Produção

### Método 1: Comando NPM (Recomendado)

```bash
# Build + Preview em um comando
npm run preview:prod
```

Este comando:
1. Faz o build da aplicação (`npm run build`)
2. Serve os arquivos buildados (`npm run preview`)
3. Acesse: `http://localhost:4173` (porta padrão do preview)

### Método 2: Script Bash

```bash
# Usa script personalizado
npm run servir:prod
# ou
./scripts/executar-como-producao.sh
```

### Método 3: Passo a Passo Manual

```bash
# 1. Fazer build
npm run build

# 2. Servir arquivos buildados
npm run preview
```

## 🔧 Configuração do Preview

O Vite preview usa a porta **4173** por padrão. Para usar a porta 8080 (como produção):

### Opção 1: Modificar vite.config.ts

Adicione ao `vite.config.ts`:

```typescript
preview: {
  port: 8080,
  host: '0.0.0.0'
}
```

### Opção 2: Usar flag na linha de comando

```bash
npm run preview -- --port 8080 --host 0.0.0.0
```

## 📋 Comparação: Local Dev vs Local Prod

| Característica | `npm run dev` | `npm run preview:prod` |
|----------------|---------------|------------------------|
| **Arquivos** | Source files | Build files (dist/) |
| **Hot Reload** | ✅ Sim | ❌ Não |
| **Otimizações** | ❌ Não | ✅ Sim |
| **Tamanho** | Maior | Menor (minificado) |
| **Comportamento** | Desenvolvimento | Produção |
| **Porta** | 8080 | 4173 (ou 8080 se configurado) |
| **Build necessário** | ❌ Não | ✅ Sim |

## ⚙️ Variáveis de Ambiente

### Importante: Variáveis no Build

As variáveis de ambiente são **embutidas no build** no momento do `npm run build`.

**Para garantir que as variáveis estão corretas:**

1. **Verificar .env.local:**
   ```bash
   cat .env.local
   ```

2. **Fazer build:**
   ```bash
   npm run build
   ```

3. **Verificar no código buildado:**
   ```bash
   # Verificar se a chave está no build
   grep -r "VITE_GEMINI_API_KEY" dist/ | head -1
   ```

### Variáveis Necessárias

Certifique-se de que `.env.local` contém:

```env
VITE_GEMINI_API_KEY=sua_chave_aqui
VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app
VITE_AUTH_RESET_PROXY_URL=https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app
```

## 🔍 Verificações

### 1. Verificar Build

```bash
# Verificar se dist/ foi criado
ls -la dist/

# Verificar arquivos principais
ls -la dist/assets/
```

### 2. Verificar Variáveis no Build

No console do navegador (F12), execute:

```javascript
console.log('MODE:', import.meta.env.MODE);
console.log('PROD:', import.meta.env.PROD);
console.log('DEV:', import.meta.env.DEV);
console.log('GEMINI_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? 'Configurada' : 'Faltando');
```

**Esperado em produção:**
- `MODE: "production"`
- `PROD: true`
- `DEV: false`

### 3. Comparar com Produção

Acesse a produção e compare:
- **Produção:** https://suporte-lojinha-409489811769.southamerica-east1.run.app/
- **Local Prod:** http://localhost:8080 (ou 4173)

## 🐛 Troubleshooting

### Problema: Variáveis não aparecem no build

**Solução:**
1. Verificar `.env.local` existe e tem as variáveis
2. Fazer rebuild: `npm run build`
3. Verificar se variáveis começam com `VITE_`

### Problema: Preview não inicia

**Solução:**
```bash
# Verificar se dist/ existe
ls -la dist/

# Se não existir, fazer build primeiro
npm run build

# Tentar preview novamente
npm run preview
```

### Problema: Porta já em uso

**Solução:**
```bash
# Verificar processo na porta
lsof -i :4173
# ou
lsof -i :8080

# Matar processo se necessário
kill -9 <PID>
```

### Problema: Comportamento diferente da produção

**Verificar:**
1. Variáveis de ambiente estão corretas?
2. Build foi feito com as mesmas variáveis?
3. Cache do navegador limpo?
4. Modo está como `production`?

## 📝 Workflow Recomendado

### Para Desenvolvimento Normal

```bash
# Usar dev server (hot reload)
npm run dev
```

### Para Testar Como Produção

```bash
# Build + Preview
npm run preview:prod

# Ou apenas preview (se já fez build)
npm run preview
```

### Para Deploy

```bash
# Build para produção
npm run build

# Verificar dist/
ls -la dist/

# Deploy (usar scripts de deploy)
./deploy.sh
```

## ✅ Checklist

Antes de testar como produção:

- [ ] `.env.local` configurado com todas as variáveis
- [ ] `npm run build` executado com sucesso
- [ ] `dist/` criado e contém arquivos
- [ ] `npm run preview` inicia sem erros
- [ ] Aplicação carrega no navegador
- [ ] Variáveis de ambiente estão no build
- [ ] `import.meta.env.MODE === "production"`

## 🔗 Referências

- [Documentação Vite Preview](https://vitejs.dev/guide/cli.html#vite-preview)
- [Guia de Deploy](./DEPLOY.md)
- [Configuração de Ambiente](./CORRECAO_AMBIENTE_LOCAL.md)

---

**Última Atualização:** 2025-01-27








