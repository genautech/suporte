# 🔐 Template de Secrets

**⚠️ ATENÇÃO: Este arquivo contém apenas TEMPLATES e REFERÊNCIAS**

**NUNCA commitar valores reais de secrets neste arquivo ou no Git!**

## 📋 Estrutura de Secrets

### Cloud Run - Cubbo Auth Proxy

```bash
CUBBO_CLIENT_ID=681ac954-7b46-4644-8a52-6c88749eadbd
CUBBO_CLIENT_SECRET=Z5w2LhLjfQ71Bf2Q6QdoB5-v5_iZVnSJsvv90_gkyyra1aaYgHkfqmqL4RGS_qvoBpxVvF-77kFocsJm3FGmYQ
```

**Status:** ✅ Configurado no Cloud Run  
**Como Atualizar:** Ver `docs/specs/06-deployment.md`

### Build Variables - Aplicação Principal

```bash
VITE_GEMINI_API_KEY=AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw
```

**Status:** ✅ Configurado no Cloud Run Build  
**Como Atualizar:** Ver `docs/specs/06-deployment.md`

### Local Development

Criar `.env.local` (não commitado):

```env
VITE_GEMINI_API_KEY=sua_chave_aqui
```

## ⚠️ Regras de Segurança

1. **NUNCA** commitar valores reais
2. **SEMPRE** usar variáveis de ambiente
3. **SEMPRE** rotacionar secrets periodicamente
4. **SEMPRE** documentar onde obter novos secrets

## 📞 Onde Obter Secrets

- **Gemini API:** https://aistudio.google.com/apikey
- **Cubbo API:** https://developers.cubbo.com/
- **Postmark:** https://account.postmarkapp.com/










