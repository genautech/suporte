# 🔧 Troubleshooting: GitHub API Timeout Error

## Erro
```
Error updating active pull request view: Connect Timeout Error 
(attempted address: api.github.com:443, timeout: 10000ms)
```

## ✅ Verificação de Conectividade

A conectividade com GitHub API está funcionando:
- ✅ Ping para `api.github.com`: OK (15-16ms)
- ✅ HTTPS para `api.github.com`: OK (HTTP/2 200)

## 🔍 Possíveis Causas

### 1. **Problema Temporário/Transiente**
- O erro pode ter sido um problema temporário de rede
- **Solução:** Tente novamente após alguns segundos

### 2. **Rate Limiting do GitHub**
- GitHub pode estar limitando requisições
- **Verificar:** Acesse https://api.github.com/rate_limit (requer autenticação)

### 3. **Configuração de Proxy/Firewall**
- Cursor pode estar usando configurações diferentes do terminal
- **Verificar:** Configurações de proxy no Cursor

### 4. **Autenticação GitHub no Cursor**
- Token de autenticação pode estar expirado ou inválido
- **Verificar:** Configurações de GitHub no Cursor

## 🛠️ Soluções

### Solução 1: Reiniciar Cursor
```bash
# Fechar e reabrir o Cursor IDE
```

### Solução 2: Verificar Autenticação GitHub
1. Abra as configurações do Cursor
2. Procure por "GitHub" ou "Source Control"
3. Verifique se há um token configurado
4. Se necessário, re-autentique

### Solução 3: Verificar Rate Limit
```bash
# Com token GitHub (substitua YOUR_TOKEN)
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
```

### Solução 4: Verificar Configurações de Rede
```bash
# Verificar se há proxy configurado
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $http_proxy
echo $https_proxy

# Verificar DNS
nslookup api.github.com
```

### Solução 5: Limpar Cache do Cursor
1. Feche o Cursor completamente
2. Limpe o cache (localização varia por OS):
   - **macOS:** `~/Library/Application Support/Cursor/Cache`
   - **Linux:** `~/.config/Cursor/Cache`
   - **Windows:** `%APPDATA%\Cursor\Cache`
3. Reabra o Cursor

### Solução 6: Verificar Firewall/Antivírus
- Certifique-se de que o Cursor tem permissão para acessar a internet
- Verifique se há bloqueios de firewall

## 📊 Monitoramento

### Testar Conectividade Manualmente
```bash
# Teste básico
curl -I https://api.github.com

# Teste com timeout maior
curl --connect-timeout 30 https://api.github.com

# Teste com verbose para debug
curl -v --connect-timeout 30 https://api.github.com 2>&1 | grep -i "connect\|timeout\|error"
```

### Verificar Logs do Cursor
- Abra o Developer Tools do Cursor (View > Developer Tools)
- Verifique a aba Console para erros relacionados a GitHub

## 🔄 Se o Problema Persistir

1. **Verificar Status do GitHub:**
   - https://www.githubstatus.com/

2. **Verificar se há problemas conhecidos:**
   - GitHub Status Page
   - Cursor Issues no GitHub

3. **Contatar Suporte:**
   - Se o problema persistir após tentar todas as soluções acima
   - Forneça logs do Cursor e informações de rede

## 📝 Notas

- O timeout padrão é de 10 segundos (10000ms)
- Este erro geralmente não afeta operações Git locais
- Apenas a visualização de Pull Requests pode ser afetada
- Operações Git via terminal continuam funcionando normalmente








