# 🔧 Como Configurar o Store ID da Cubbo

## Problema

Ao tentar buscar pedidos, você recebe o erro:
```
API da Cubbo retornou status 422: Parameter store_id is required
```

## Solução

Você precisa configurar o **Store ID** no painel administrativo da aplicação.

## Passo a Passo

### 1. Acessar o Painel Administrativo

1. Faça login como administrador na aplicação
2. Vá até a seção **"Treinamento"** no menu lateral

### 2. Configurar o Store ID

1. Na página de Treinamento, encontre a seção **"Configurações de APIs"**
2. Você verá a configuração da **Cubbo** (se não aparecer, clique em "Configurar Integração")
3. Clique no botão de **editar** (ícone de lápis) ao lado da configuração da Cubbo
4. No formulário que abrir, encontre o campo **"Store ID (ID da Loja)"**
5. Digite o Store ID da sua loja na Cubbo
6. Clique em **"Salvar"**

### 3. Onde Encontrar o Store ID

O Store ID pode ser encontrado:

- **No painel administrativo da Cubbo:**
  - Acesse https://app.cubbo.com/ (ou sua URL da Cubbo)
  - Faça login
  - O Store ID geralmente aparece na URL ou nas configurações da loja
  
- **Na documentação da API Cubbo:**
  - Consulte a documentação oficial da Cubbo
  - O Store ID geralmente é um número ou string identificando sua loja

- **Entrando em contato com o suporte da Cubbo:**
  - Se não conseguir encontrar, entre em contato com o suporte da Cubbo

## Verificação

Após configurar o Store ID:

1. Teste a conexão clicando no botão **"Testar"** na configuração da API
2. Tente buscar um pedido pelo chat de suporte
3. O erro não deve mais aparecer

## Importante

- O Store ID é **obrigatório** para todas as operações de busca de pedidos
- Sem o Store ID configurado, não é possível buscar pedidos na API Cubbo
- Certifique-se de digitar o Store ID corretamente (sem espaços extras)

