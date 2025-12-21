'use client';

import { X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { KanbanChannel, KanbanPriority, Sentiment } from '../../lib/types/feedbackTypes';
import type { FilterState } from '../../lib/types/filterTypes';
import { CHANNEL_LABELS, PRIORITY_LABELS, SENTIMENT_LABELS, SLA_LABELS } from '../../lib/types/filterTypes';
import { SearchInput } from './SearchInput';
import { FilterDropdown } from './FilterDropdown';
import { FilterChip } from './FilterChip';
import type { SLAStatus } from '../../lib/types/slaTypes';

interface FilterBarProps {
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onToggleFilter: (field: 'channels' | 'priorities' | 'sentiments' | 'slaStatuses', value: string) => void;
  onClearFilters: () => void;
  onClearField: (field: keyof FilterState) => void;
  activeFilterCount: number;
  totalCount: number;
  filteredCount: number;
}

const channelOptions = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
  value: value as KanbanChannel,
  label,
}));

const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value: value as KanbanPriority,
  label,
}));

const sentimentOptions = Object.entries(SENTIMENT_LABELS).map(([value, label]) => ({
  value: value as Sentiment,
  label,
}));

const slaOptions = Object.entries(SLA_LABELS).map(([value, label]) => ({
  value: value as SLAStatus,
  label,
}));

export function FilterBar({
  filters,
  onSearchChange,
  onToggleFilter,
  onClearFilters,
  onClearField,
  activeFilterCount,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-900/40 border border-gray-700/40">
      {/* Main filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />

        <SearchInput
          value={filters.search}
          onChange={onSearchChange}
          placeholder="Search content, author, tags..."
        />

        <FilterDropdown
          label="Channel"
          options={channelOptions}
          selected={filters.channels}
          onChange={value => onToggleFilter('channels', value)}
          onClearAll={() => onClearField('channels')}
        />

        <FilterDropdown
          label="Priority"
          options={priorityOptions}
          selected={filters.priorities}
          onChange={value => onToggleFilter('priorities', value)}
          onClearAll={() => onClearField('priorities')}
        />

        <FilterDropdown
          label="Sentiment"
          options={sentimentOptions}
          selected={filters.sentiments}
          onChange={value => onToggleFilter('sentiments', value)}
          onClearAll={() => onClearField('sentiments')}
        />

        <FilterDropdown
          label="SLA"
          options={slaOptions}
          selected={filters.slaStatuses}
          onChange={value => onToggleFilter('slaStatuses', value)}
          onClearAll={() => onClearField('slaStatuses')}
        />

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-400
              hover:text-red-300 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}

        {/* Results count */}
        <div className="ml-auto text-xs text-gray-500">
          {hasActiveFilters ? (
            <span>{filteredCount} of {totalCount} items</span>
          ) : (
            <span>{totalCount} items</span>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {filters.search && (
              <FilterChip
                label={`"${filters.search}"`}
                onRemove={() => onSearchChange('')}
              />
            )}
            {filters.channels.map(ch => (
              <FilterChip
                key={ch}
                label={CHANNEL_LABELS[ch]}
                onRemove={() => onToggleFilter('channels', ch)}
                color="channel"
              />
            ))}
            {filters.priorities.map(p => (
              <FilterChip
                key={p}
                label={PRIORITY_LABELS[p]}
                onRemove={() => onToggleFilter('priorities', p)}
                color="priority"
              />
            ))}
            {filters.sentiments.map(s => (
              <FilterChip
                key={s}
                label={SENTIMENT_LABELS[s]}
                onRemove={() => onToggleFilter('sentiments', s)}
                color="sentiment"
              />
            ))}
            {filters.slaStatuses.map(sla => (
              <FilterChip
                key={sla}
                label={SLA_LABELS[sla]}
                onRemove={() => onToggleFilter('slaStatuses', sla)}
                color="sla"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FilterBar;
