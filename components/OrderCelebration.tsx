import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CubboOrder } from '../types';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface OrderCelebrationProps {
  orders: CubboOrder[];
}

const relativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes <= 0) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
};

const formatCurrency = (value?: number, currency: string = 'BRL') => {
  if (value === undefined || value === null) return '—';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
};

export const OrderCelebration: React.FC<OrderCelebrationProps> = ({ orders }) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  const newest = orders[0];
  const others = orders.slice(1, 3);

  return (
    <Card className="border border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 shadow-md">
      <CardContent className="py-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                Novas orders celebradas
              </p>
              <p className="text-lg font-bold text-foreground">
                {newest.order_number || newest.id || 'Novo pedido registrado'}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {relativeTime(new Date(newest.created_at).getTime())}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>Cliente: {newest.customer_name || 'Cliente'}</span>
            <span>Valor: {formatCurrency(newest.total_amount, newest.currency)}</span>
          </div>
          {others.length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {others.map((order) => (
                <span key={order.id || order.order_number}>
                  • {order.order_number || 'Pedido'} — {relativeTime(new Date(order.created_at).getTime())}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
};

