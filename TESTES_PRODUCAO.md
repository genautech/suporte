# Checklist de Testes em Produção

**Data:** 2025-11-06  
**URL de Produção:** https://suporte-lojinha-409489811769.southamerica-east1.run.app

## Instruções para Testes

Após o deploy, execute os seguintes testes para verificar que todas as funcionalidades estão funcionando corretamente:

## 1. Testes Básicos de Aplicação

- [ ] Acessar URL de produção
- [ ] Verificar que página carrega sem erros no console do navegador
- [ ] Verificar que não há erros 404 para assets (CSS, JS)
- [ ] Verificar que aplicação é responsiva

## 2. Testes de Autenticação

### Login de Cliente
- [ ] Clicar em "Acessar Portal do Cliente"
- [ ] Inserir email válido
- [ ] Solicitar código de autenticação
- [ ] Verificar que email é recebido
- [ ] Inserir código recebido
- [ ] Verificar que login é bem-sucedido
- [ ] Verificar redirecionamento para dashboard do cliente

### Login de Admin
- [ ] Clicar em "Acessar Portal do Admin"
- [ ] Fazer login com credenciais de admin
- [ ] Verificar que login é bem-sucedido
- [ ] Verificar redirecionamento para dashboard do admin

## 3. Testes de FAQ

### Como Cliente
- [ ] Acessar área de suporte como cliente logado
- [ ] Navegar para aba "FAQ"
- [ ] Verificar que todas as categorias aparecem (Compras, Trocas, Rastreios, etc.)
- [ ] Clicar em uma categoria e verificar que FAQs aparecem
- [ ] Clicar em uma pergunta e verificar que resposta expande
- [ ] Testar busca por texto
- [ ] Testar busca inteligente (deve usar Gemini)
- [ ] Verificar que botão "Foi útil?" aparece
- [ ] Clicar em "Foi útil?" e verificar que funciona

### Como Admin
- [ ] Acessar área admin
- [ ] Navegar para seção "FAQ"
- [ ] Verificar que lista de FAQs aparece
- [ ] Clicar em "Popular FAQ" e verificar que dados são carregados
- [ ] Criar nova entrada de FAQ
- [ ] Editar entrada existente
- [ ] Deletar entrada de FAQ
- [ ] Verificar que reordenação funciona
- [ ] Verificar que ativação/desativação funciona

## 4. Testes de Formulário Dinâmico

- [ ] Acessar área de suporte como cliente
- [ ] Clicar em "Abrir Chamado"
- [ ] Verificar que formulário dinâmico aparece
- [ ] Selecionar cada um dos 9 assuntos e verificar que campos mudam:
  - Cancelamento de Pedido
  - Reembolso
  - Troca de Produto
  - Produto com Defeito
  - Produto Não Recebido
  - Produto Errado
  - Atraso na Entrega
  - Dúvida sobre Pagamento
  - Outro Assunto
- [ ] Inserir número de pedido válido e verificar que preview aparece
- [ ] Preencher formulário completo
- [ ] Submeter formulário
- [ ] Verificar que ticket é criado com sucesso

## 5. Testes de Sistema de Conversas

- [ ] Acessar área de suporte como cliente
- [ ] Navegar para aba "Chat Suporte"
- [ ] Verificar que chat abre inline (não em modal)
- [ ] Enviar mensagem no chat
- [ ] Verificar que resposta do chatbot aparece
- [ ] Verificar que conversa é salva (verificar Firestore)
- [ ] Fazer logout e login novamente
- [ ] Verificar que histórico de conversas é carregado
- [ ] Verificar que chatbot reconhece usuário retornante
- [ ] Testar sistema de feedback (rating e comentário)

## 6. Testes de Base de Conhecimento

### Como Admin
- [ ] Acessar área admin
- [ ] Navegar para seção "Base de Conhecimento"
- [ ] Verificar que lista de entradas aparece
- [ ] Criar nova entrada
- [ ] Editar entrada existente
- [ ] Deletar entrada
- [ ] Verificar que sistema de verificação funciona (aprovar/pendente)
- [ ] Resolver um ticket e verificar que sugestão aparece

## 7. Testes de Integração

- [ ] Verificar que FAQ aparece na busca inteligente do chatbot
- [ ] Verificar que Knowledge Base é consultada na busca inteligente
- [ ] Verificar que formulário dinâmico relaciona pedido quando número fornecido
- [ ] Verificar que conversas relacionam pedidos mencionados

## Problemas Encontrados

Se encontrar algum problema durante os testes, documente aqui:

1. **Problema:** [Descrição]
   - **Onde:** [URL ou componente]
   - **Passos para reproduzir:** [Lista de passos]
   - **Erro no console:** [Mensagem de erro]

## Resultado dos Testes

**Data dos Testes:** _______________  
**Testado por:** _______________  

**Status Geral:** ⬜ Passou | ⬜ Falhou | ⬜ Parcial

**Observações:**
_____________________________________________________________
_____________________________________________________________

---

**Última Atualização:** 2025-11-06

