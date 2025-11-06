# Troubleshooting: SMS não está sendo recebido

## Verificações Iniciais

### 1. Verificar se o SMS foi realmente enviado

**Abra o Console do Navegador (F12)** e verifique:

- Se você vê `"SMS enviado com sucesso! ConfirmationResult:"` → O Firebase enviou o SMS
- Se você vê algum erro → Veja a seção de erros abaixo

### 2. Verificar o formato do número

O número `41987607512` deve ser formatado como:
- **Entrada:** `41987607512` (11 dígitos)
- **Formato final:** `+5541987607512` (13 caracteres incluindo +55)

## Possíveis Causas

### 1. **Plano Gratuito do Firebase (Spark Plan)**

O plano gratuito tem **limites muito restritivos**:
- Apenas números de teste podem receber SMS
- SMS para números reais podem não funcionar em produção

**Solução:**
- Faça upgrade para o plano **Blaze (Pay-as-you-go)**
- Ou adicione números de teste no Firebase Console

### 2. **Números de Teste no Firebase**

No plano gratuito, você precisa registrar números de teste:

1. Vá em **Firebase Console** > **Authentication** > **Sign-in method**
2. Clique em **Phone**
3. Role até **Phone numbers for testing**
4. Adicione o número `+5541987607512`
5. Adicione um código de teste (ex: `123456`)

### 3. **Bloqueio de SMS pela Operadora**

Algumas operadoras bloqueiam SMS de números internacionais ou serviços de API.

**Verificações:**
- Tente com outro número de outra operadora
- Verifique se há bloqueio de spam ativo
- Tente desativar filtros de spam temporariamente

### 4. **Delay no Envio**

SMS pode levar alguns minutos para chegar, especialmente em horários de pico.

**Aguarde:**
- 1-2 minutos antes de tentar novamente
- Verifique se há sinal de rede no celular

### 5. **Problemas com reCAPTCHA**

Se o reCAPTCHA não for resolvido corretamente, o SMS não será enviado.

**Sintomas:**
- Erro `auth/captcha-check-failed` no console
- Mensagem de erro sobre reCAPTCHA

**Solução:**
- Recarregue a página
- Verifique se não há bloqueadores de anúncio interferindo
- Tente em modo anônimo/privado

### 6. **Quota Excedida**

Se você excedeu o limite de SMS do Firebase.

**Verificar:**
- Firebase Console > Usage and Billing
- Verifique se há limites atingidos

### 7. **Número Inválido ou Não Suportado**

Alguns números podem não ser suportados pelo Firebase.

**Verificações:**
- Certifique-se de que o número está ativo
- Verifique se é um número móvel (não fixo)
- Tente com um número de outro DDD

## Como Diagnosticar

### Passo 1: Verificar Logs no Console

Abra o console do navegador e procure por:
```
Número digitado: 41987607512
Número limpo: 41987607512
Número formatado: +5541987607512
Enviando SMS para: +5541987607512
SMS enviado com sucesso! ConfirmationResult: [objeto]
```

Se você vê `"SMS enviado com sucesso!"`, o Firebase processou a requisição.

### Passo 2: Verificar Firebase Console

1. Vá em **Firebase Console** > **Authentication** > **Users**
2. Verifique se aparece uma tentativa de login
3. Veja se há alguma mensagem de erro

### Passo 3: Verificar Quotas

1. Vá em **Firebase Console** > **Usage and Billing**
2. Verifique se há limites atingidos
3. Veja o histórico de uso de SMS

### Passo 4: Testar com Número de Teste

1. Adicione o número `+5541987607512` como número de teste
2. Configure um código de teste (ex: `123456`)
3. Tente fazer login novamente
4. Use o código de teste configurado

## Soluções Rápidas

### Solução 1: Usar Números de Teste (Desenvolvimento)

1. Firebase Console > Authentication > Sign-in method > Phone
2. Role até "Phone numbers for testing"
3. Adicione: `+5541987607512` com código `123456`
4. Use o código `123456` para fazer login

### Solução 2: Upgrade para Plano Blaze

1. Firebase Console > Project Settings > Usage and Billing
2. Faça upgrade para Blaze (Pay-as-you-go)
3. Configure método de pagamento
4. SMS para números reais funcionará

### Solução 3: Verificar Configurações Regionais

Certifique-se de que:
- O projeto está na região correta
- Phone Authentication está habilitado
- Não há restrições regionais no projeto

## Contato com Suporte Firebase

Se nenhuma solução funcionar:

1. Verifique os logs detalhados no console
2. Tire prints dos erros
3. Entre em contato com suporte do Firebase
4. Forneça:
   - Número que tentou usar
   - Timestamp da tentativa
   - Códigos de erro (se houver)
   - Screenshots do console

## Notas Importantes

- **Plano Gratuito:** Pode não enviar SMS para números reais em produção
- **Números de Teste:** Funcionam apenas no plano gratuito
- **Delay:** SMS pode levar até 5 minutos para chegar
- **Operadoras:** Algumas bloqueiam SMS de APIs
- **ReCAPTCHA:** Deve ser resolvido para enviar SMS



