# 🔒 Arquivos Protegidos - Specs Lock

**⚠️ ATENÇÃO: Esta pasta contém configurações críticas protegidas**

## 📋 Propósito

Esta pasta contém backups e referências de configurações críticas que **NUNCA** devem ser modificadas sem atualizar as especificações técnicas correspondentes.

## 📂 Estrutura

```
.specs-lock/
├── configs/          # Configurações críticas (backup/versionamento)
│   ├── firebase.config.json    # Config Firebase (referência)
│   └── api-endpoints.json      # Endpoints de APIs (referência)
└── secrets/          # Templates de secrets (SEM valores reais)
    └── secrets-template.md     # Template de estrutura de secrets
```

## ⚠️ Regras

### ❌ NUNCA:
- Modificar arquivos aqui sem atualizar `docs/specs/`
- Commitar valores reais de secrets
- Deletar arquivos sem criar backup

### ✅ SEMPRE:
- Consultar antes de modificar configurações críticas
- Atualizar specs após mudanças
- Manter sincronizado com código fonte

## 🔄 Processo

Ao modificar configuração crítica:

1. Verificar arquivo correspondente aqui
2. Fazer mudança no código fonte
3. Atualizar arquivo aqui (se necessário)
4. Atualizar spec em `docs/specs/`
5. Documentar mudança

## 📝 Nota

Estes arquivos servem como **referência** e **backup**. O código fonte é a verdade, mas estes arquivos ajudam a manter rastreabilidade e histórico.
