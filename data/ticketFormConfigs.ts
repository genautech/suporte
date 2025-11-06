import { TicketFormConfig, TicketSubject, FormField } from '../types';

export const ticketFormConfigs: Record<TicketSubject, TicketFormConfig> = {
  cancelamento: {
    subject: 'cancelamento',
    questions: [
      'Qual o motivo do cancelamento?',
      'O pedido já foi enviado?',
      'Você já recebeu o produto?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'reason',
        label: 'Motivo do Cancelamento',
        type: 'select',
        required: true,
        options: [
          { value: 'arrependimento', label: 'Arrependimento' },
          { value: 'produto_errado', label: 'Produto errado' },
          { value: 'duplicidade', label: 'Pedido duplicado' },
          { value: 'preco_melhor', label: 'Encontrei preço melhor' },
          { value: 'outro', label: 'Outro motivo' },
        ],
      },
      {
        name: 'reasonDetails',
        label: 'Detalhes do Motivo',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva o motivo do cancelamento em detalhes...',
      },
      {
        name: 'preferRefund',
        label: 'Prefere reembolso ou crédito na loja?',
        type: 'select',
        required: true,
        options: [
          { value: 'reembolso', label: 'Reembolso' },
          { value: 'credito', label: 'Crédito na loja' },
        ],
      },
    ],
  },

  reembolso: {
    subject: 'reembolso',
    questions: [
      'Qual o motivo do reembolso?',
      'Você já devolveu o produto?',
      'O produto estava em boas condições?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'reason',
        label: 'Motivo do Reembolso',
        type: 'select',
        required: true,
        options: [
          { value: 'defeito', label: 'Produto com defeito' },
          { value: 'produto_errado', label: 'Produto diferente do pedido' },
          { value: 'nao_recebido', label: 'Produto não recebido' },
          { value: 'cancelamento', label: 'Cancelamento de pedido' },
          { value: 'outro', label: 'Outro motivo' },
        ],
      },
      {
        name: 'reasonDetails',
        label: 'Detalhes do Problema',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva o problema em detalhes...',
      },
      {
        name: 'receivedDate',
        label: 'Data de Recebimento',
        type: 'date',
        required: true,
      },
      {
        name: 'returnTracking',
        label: 'Código de Rastreamento da Devolução (se aplicável)',
        type: 'text',
        required: false,
        placeholder: 'Código do rastreamento da devolução',
      },
    ],
  },

  troca: {
    subject: 'troca',
    questions: [
      'Qual produto você deseja trocar?',
      'Qual o motivo da troca?',
      'O produto está em boas condições?',
      'Qual produto você deseja receber?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'productSku',
        label: 'SKU do Produto a Trocar',
        type: 'text',
        required: true,
        placeholder: 'Código do produto que deseja trocar',
      },
      {
        name: 'reason',
        label: 'Motivo da Troca',
        type: 'select',
        required: true,
        options: [
          { value: 'tamanho', label: 'Tamanho errado' },
          { value: 'cor', label: 'Cor diferente' },
          { value: 'defeito', label: 'Produto com defeito' },
          { value: 'produto_errado', label: 'Produto diferente do pedido' },
          { value: 'arrependimento', label: 'Arrependimento' },
          { value: 'outro', label: 'Outro motivo' },
        ],
      },
      {
        name: 'reasonDetails',
        label: 'Detalhes da Troca',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva o motivo da troca e o produto desejado...',
      },
      {
        name: 'newProductSku',
        label: 'SKU do Novo Produto Desejado (se aplicável)',
        type: 'text',
        required: false,
        placeholder: 'Código do produto que deseja receber',
      },
      {
        name: 'receivedDate',
        label: 'Data de Recebimento',
        type: 'date',
        required: true,
      },
      {
        name: 'productCondition',
        label: 'Condição do Produto',
        type: 'select',
        required: true,
        options: [
          { value: 'novo', label: 'Novo (sem uso)' },
          { value: 'usado', label: 'Usado (em boas condições)' },
          { value: 'defeito', label: 'Com defeito' },
        ],
      },
    ],
  },

  produto_defeituoso: {
    subject: 'produto_defeituoso',
    questions: [
      'Qual produto apresenta defeito?',
      'Qual o tipo de defeito?',
      'O defeito ocorreu no uso normal?',
      'Você tem fotos do defeito?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'productSku',
        label: 'SKU do Produto',
        type: 'text',
        required: true,
        placeholder: 'Código do produto com defeito',
      },
      {
        name: 'defectType',
        label: 'Tipo de Defeito',
        type: 'select',
        required: true,
        options: [
          { value: 'fabricacao', label: 'Defeito de fabricação' },
          { value: 'transporte', label: 'Danificado no transporte' },
          { value: 'funcional', label: 'Não funciona' },
          { value: 'visual', label: 'Defeito visual' },
          { value: 'outro', label: 'Outro tipo' },
        ],
      },
      {
        name: 'defectDescription',
        label: 'Descrição Detalhada do Defeito',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva o defeito em detalhes, quando ocorreu, etc...',
      },
      {
        name: 'receivedDate',
        label: 'Data de Recebimento',
        type: 'date',
        required: true,
      },
      {
        name: 'photos',
        label: 'Fotos do Defeito',
        type: 'file',
        required: false,
        placeholder: 'Envie fotos do defeito (máx. 5 fotos)',
      },
      {
        name: 'preferredSolution',
        label: 'Solução Preferida',
        type: 'select',
        required: true,
        options: [
          { value: 'troca', label: 'Troca do produto' },
          { value: 'reembolso', label: 'Reembolso' },
          { value: 'reparo', label: 'Reparo (se aplicável)' },
        ],
      },
    ],
  },

  produto_nao_recebido: {
    subject: 'produto_nao_recebido',
    questions: [
      'Quando você deveria ter recebido o produto?',
      'O código de rastreamento mostra que foi entregue?',
      'Você verificou com vizinhos/portaria?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'expectedDeliveryDate',
        label: 'Data Prevista de Entrega',
        type: 'date',
        required: true,
      },
      {
        name: 'trackingNumber',
        label: 'Código de Rastreamento',
        type: 'text',
        required: true,
        placeholder: 'Código de rastreamento do pedido',
      },
      {
        name: 'trackingStatus',
        label: 'Status no Rastreamento',
        type: 'select',
        required: true,
        options: [
          { value: 'entregue', label: 'Mostra como entregue (mas não recebi)' },
          { value: 'em_transito', label: 'Ainda em trânsito' },
          { value: 'atrasado', label: 'Atrasado além do prazo' },
          { value: 'sem_atualizacao', label: 'Sem atualização há muito tempo' },
        ],
      },
      {
        name: 'checkDetails',
        label: 'Onde você verificou?',
        type: 'textarea',
        required: true,
        placeholder: 'Verificou com vizinhos, portaria, recepção? Descreva...',
      },
      {
        name: 'addressConfirmed',
        label: 'O endereço de entrega está correto?',
        type: 'select',
        required: true,
        options: [
          { value: 'sim', label: 'Sim, está correto' },
          { value: 'nao', label: 'Não, preciso atualizar' },
        ],
      },
    ],
  },

  produto_errado: {
    subject: 'produto_errado',
    questions: [
      'Qual produto você recebeu?',
      'Qual produto você pediu?',
      'O produto está correto mas diferente do esperado?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'receivedProductSku',
        label: 'SKU do Produto Recebido',
        type: 'text',
        required: true,
        placeholder: 'Código do produto que você recebeu',
      },
      {
        name: 'orderedProductSku',
        label: 'SKU do Produto Pedido',
        type: 'text',
        required: true,
        placeholder: 'Código do produto que você pediu',
      },
      {
        name: 'receivedDate',
        label: 'Data de Recebimento',
        type: 'date',
        required: true,
      },
      {
        name: 'problemDescription',
        label: 'Descrição do Problema',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva a diferença entre o que pediu e o que recebeu...',
      },
      {
        name: 'preferredSolution',
        label: 'Solução Preferida',
        type: 'select',
        required: true,
        options: [
          { value: 'troca', label: 'Trocar pelo produto correto' },
          { value: 'reembolso', label: 'Reembolso' },
          { value: 'manter', label: 'Manter o produto recebido (se aplicável)' },
        ],
      },
    ],
  },

  atraso_entrega: {
    subject: 'atraso_entrega',
    questions: [
      'Qual era o prazo de entrega previsto?',
      'Quantos dias está atrasado?',
      'O código de rastreamento mostra alguma atualização?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: true,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'expectedDeliveryDate',
        label: 'Data Prevista de Entrega',
        type: 'date',
        required: true,
      },
      {
        name: 'daysLate',
        label: 'Quantos dias está atrasado?',
        type: 'number',
        required: true,
        validation: {
          min: 1,
          message: 'Informe quantos dias está atrasado',
        },
      },
      {
        name: 'trackingNumber',
        label: 'Código de Rastreamento',
        type: 'text',
        required: true,
        placeholder: 'Código de rastreamento do pedido',
      },
      {
        name: 'lastTrackingUpdate',
        label: 'Última Atualização do Rastreamento',
        type: 'date',
        required: false,
      },
      {
        name: 'urgency',
        label: 'Nível de Urgência',
        type: 'select',
        required: true,
        options: [
          { value: 'baixa', label: 'Baixa - Apenas quero acompanhar' },
          { value: 'media', label: 'Média - Preciso para uma data específica' },
          { value: 'alta', label: 'Alta - É urgente' },
        ],
      },
      {
        name: 'specialDate',
        label: 'Data Especial (se aplicável)',
        type: 'date',
        required: false,
        placeholder: 'Data para a qual você precisa do produto',
      },
    ],
  },

  duvida_pagamento: {
    subject: 'duvida_pagamento',
    questions: [
      'Qual sua dúvida sobre o pagamento?',
      'O pagamento foi processado?',
      'Há algum problema com o pagamento?',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido',
        type: 'text',
        required: false,
        placeholder: 'Ex: R595531189-dup (se aplicável)',
      },
      {
        name: 'paymentQuestion',
        label: 'Tipo de Dúvida',
        type: 'select',
        required: true,
        options: [
          { value: 'metodo', label: 'Dúvida sobre método de pagamento' },
          { value: 'processamento', label: 'Pagamento não foi processado' },
          { value: 'duplicado', label: 'Cobrança duplicada' },
          { value: 'reembolso', label: 'Dúvida sobre reembolso' },
          { value: 'parcela', label: 'Dúvida sobre parcelamento' },
          { value: 'outro', label: 'Outra dúvida' },
        ],
      },
      {
        name: 'questionDetails',
        label: 'Detalhes da Dúvida',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva sua dúvida ou problema com o pagamento...',
      },
      {
        name: 'paymentMethod',
        label: 'Método de Pagamento Utilizado',
        type: 'select',
        required: true,
        options: [
          { value: 'credito', label: 'Cartão de Crédito' },
          { value: 'debito', label: 'Cartão de Débito' },
          { value: 'pix', label: 'PIX' },
          { value: 'boleto', label: 'Boleto' },
        ],
      },
      {
        name: 'transactionId',
        label: 'ID da Transação (se disponível)',
        type: 'text',
        required: false,
        placeholder: 'Código da transação de pagamento',
      },
    ],
  },

  outro: {
    subject: 'outro',
    questions: [
      'Como podemos auxiliá-lo?',
      'Descreva seu problema ou dúvida',
    ],
    fields: [
      {
        name: 'orderNumber',
        label: 'Número do Pedido (se aplicável)',
        type: 'text',
        required: false,
        placeholder: 'Ex: R595531189-dup',
      },
      {
        name: 'subject',
        label: 'Assunto',
        type: 'text',
        required: true,
        placeholder: 'Resumo do problema ou dúvida',
      },
      {
        name: 'description',
        label: 'Descrição Detalhada',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva seu problema ou dúvida em detalhes...',
      },
      {
        name: 'category',
        label: 'Categoria',
        type: 'select',
        required: false,
        options: [
          { value: 'produto', label: 'Dúvida sobre produto' },
          { value: 'pedido', label: 'Dúvida sobre pedido' },
          { value: 'conta', label: 'Dúvida sobre conta' },
          { value: 'politica', label: 'Dúvida sobre política' },
          { value: 'outro', label: 'Outro' },
        ],
      },
    ],
  },
};

export const getTicketFormConfig = (subject: TicketSubject): TicketFormConfig => {
  return ticketFormConfigs[subject] || ticketFormConfigs.outro;
};

