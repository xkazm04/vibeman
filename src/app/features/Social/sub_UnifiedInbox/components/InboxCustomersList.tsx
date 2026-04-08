import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, Mail, MessageCircle } from 'lucide-react';
import type { UnifiedCustomer } from '@/lib/social';
import { formatRelativeTime } from '@/lib/formatDate';
import {
  getCustomerValueTier,
  VALUE_TIER_COLORS,
  VALUE_TIER_LABELS,
} from '../lib/types';
import { CHANNEL_ICONS } from '../../lib/channelConstants';
import { AvatarBadge } from '../../components/atoms/AvatarBadge';
import { EmptyState } from '../../components/atoms/EmptyState';

interface InboxCustomersListProps {
  customers: UnifiedCustomer[];
  onSelect: (customer: UnifiedCustomer) => void;
}

export function InboxCustomersList({ customers, onSelect }: InboxCustomersListProps) {
  // Sort by value score descending
  const sortedCustomers = [...customers].sort((a, b) => b.valueScore - a.valueScore);

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No customers found"
        description="Customer profiles will be created automatically as feedback is received."
        className="h-full p-8"
      />
    );
  }

  return (
    <div className="divide-y divide-gray-800/50">
      {sortedCustomers.map((customer) => {
        const valueTier = getCustomerValueTier(customer.valueScore);

        return (
          <motion.button
            key={customer.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onSelect(customer)}
            className="w-full p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <AvatarBadge name={customer.displayName} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {customer.displayName}
                    </span>
                    {customer.isVerified && (
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-2xs font-medium border ${VALUE_TIER_COLORS[valueTier]}`}>
                      {VALUE_TIER_LABELS[valueTier]}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-300">
                    {customer.valueScore}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  {customer.primaryEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {customer.primaryEmail}
                    </span>
                  )}
                  {customer.primaryHandle && (
                    <span className="flex items-center gap-1">
                      @{customer.primaryHandle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{customer.totalInteractions} interactions</span>
                  <span>•</span>
                  <span>{customer.channels.length} channels</span>
                  <span>•</span>
                  <span>Last active {formatRelativeTime(customer.lastInteractionAt)}</span>
                </div>

                {/* Channel icons */}
                <div className="flex items-center gap-1 mt-2">
                  {customer.channels.map((identity, idx) => {
                    const Icon = CHANNEL_ICONS[identity.channel] || MessageCircle;
                    return <Icon key={idx} className="w-3.5 h-3.5 text-gray-500" />;
                  })}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
