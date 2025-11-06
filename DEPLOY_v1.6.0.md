# 🚀 Deploy v1.6.0 - 2025-11-07

## ✅ Deploy Concluído

**Serviço:** `suporte-lojinha`  
**Revisão:** `suporte-lojinha-00013-c8b`  
**URL:** https://suporte-lojinha-409489811769.southamerica-east1.run.app  
**Status:** ✅ Deploy bem-sucedido

## 📋 Funcionalidades Implementadas

### 1. Sistema de Arquivamento de Chamados
- ✅ Novo status `arquivado` adicionado ao sistema
- ✅ Visualização dedicada de chamados arquivados no admin
- ✅ Aba "Arquivados" no AdminDashboard
- ✅ Checkbox "Mostrar arquivados" na aba de chamados
- ✅ Botões de arquivar/reativar na lista e no modal de detalhes
- ✅ Histórico preservado em arquivamento/reativação
- ✅ Clientes não veem chamados arquivados
- ✅ Funções `archiveTicket()` e `unarchiveTicket()` implementadas

### 2. Correções de UI/UX

#### Selects Corrigidos
- ✅ Componente `SelectContent` atualizado para suportar z-index customizado
- ✅ Todos os Selects dentro de Dialogs agora usam `z-[100]`
- ✅ Z-index aplicado via `style` inline para garantir funcionamento
- ✅ Selects corrigidos em:
  - `SupportTicketFormAdvanced.tsx` (assunto e campos dinâmicos)
  - `TicketForm.tsx` (assunto, prioridade, status, campos dinâmicos)

#### Otimizações de Performance
- ✅ Debounce de 500ms implementado no campo `orderNumber`
- ✅ Busca de detalhes do pedido apenas após usuário parar de digitar
- ✅ Busca apenas se número do pedido tiver 3+ caracteres
- ✅ Redução significativa de chamadas desnecessárias à API

#### Acessibilidade
- ✅ `DialogDescription` adicionado em todos os modais
- ✅ Warnings de acessibilidade removidos
- ✅ Melhor experiência para leitores de tela

## 📚 Documentação Atualizada

### Especificações Atualizadas
- ✅ `docs/specs/09-features.md` - Adicionada seção de arquivamento e melhorias UI/UX
- ✅ `docs/specs/05-services.md` - Atualizadas funções de tickets (archiveTicket, unarchiveTicket)
- ✅ `docs/specs/08-architecture.md` - Data de atualização
- ✅ `docs/specs/04-apis.md` - Data de atualização
- ✅ `docs/specs/06-deployment.md` - Data de atualização

### Changelog
- ✅ Versão v1.6.0 adicionada ao changelog com todas as funcionalidades

## 🔧 Arquivos Modificados

### Componentes
- `components/SupportTicketFormAdvanced.tsx` - Selects corrigidos, debounce implementado
- `components/TicketForm.tsx` - Selects corrigidos
- `components/AdminDashboard.tsx` - Arquivamento implementado, DialogDescription adicionado
- `components/TicketDetailModal.tsx` - Botões de arquivar/reativar
- `components/SupportArea.tsx` - DialogDescription adicionado
- `components/ui/select.tsx` - Suporte a z-index customizado
- `components/ui/dialog.tsx` - DialogDescription exportado

### Serviços
- `services/supportService.ts` - Funções de arquivamento implementadas

### Tipos
- `types.ts` - Status `arquivado` adicionado ao tipo `TicketStatus`

## 🧪 Testes Recomendados

### Arquivamento
1. ✅ Criar um chamado de teste
2. ✅ Arquivar o chamado (botão na lista ou modal)
3. ✅ Verificar que não aparece mais para o cliente
4. ✅ Verificar que aparece na aba "Arquivados" do admin
5. ✅ Reativar o chamado
6. ✅ Verificar que volta a aparecer normalmente

### Selects
1. ✅ Abrir modal de criação de chamado (cliente)
2. ✅ Verificar que todos os Selects abrem corretamente
3. ✅ Abrir modal de criação/edição de chamado (admin)
4. ✅ Verificar que Selects de assunto, prioridade e status abrem corretamente
5. ✅ Verificar campos dinâmicos com Selects funcionam corretamente

### Performance
1. ✅ Digitar número do pedido no formulário
2. ✅ Verificar que busca só acontece após parar de digitar (500ms)
3. ✅ Verificar que busca só acontece com 3+ caracteres

## 📊 Status do Deploy

- ✅ Build concluído com sucesso
- ✅ Container criado e deployado
- ✅ Revisão ativa e servindo 100% do tráfego
- ✅ URL de produção funcionando

## 🔗 Links

- **Produção:** https://suporte-lojinha-409489811769.southamerica-east1.run.app
- **Documentação:** `docs/specs/`
- **Changelog:** `docs/specs/09-features.md`

## 📝 Notas

- Todas as funcionalidades foram testadas localmente antes do deploy
- Documentação completa atualizada
- Nenhum breaking change introduzido
- Compatibilidade mantida com versões anteriores

