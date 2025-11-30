'use client';

import { Code2 } from 'lucide-react';
import RuleEditor from './RuleEditor';
import DSLRulesList from './DSLRulesList';
import { TransformationRule, ValidationError } from '../../lib/dslTypes';

interface RulesTabContentProps {
  rules: TransformationRule[];
  selectedRuleId: string | null;
  validationErrors: ValidationError[];
  onSelectRule: (id: string) => void;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
  onUpdateRule: (ruleId: string, updates: Partial<TransformationRule>) => void;
}

/**
 * RulesTabContent - Content for the Rules tab in DSL Builder
 */
export default function RulesTabContent({
  rules,
  selectedRuleId,
  validationErrors,
  onSelectRule,
  onAddRule,
  onDeleteRule,
  onUpdateRule,
}: RulesTabContentProps) {
  const selectedRule = rules.find(r => r.id === selectedRuleId);

  return (
    <div className="flex gap-4 h-full">
      <DSLRulesList
        rules={rules}
        selectedRuleId={selectedRuleId}
        onSelectRule={onSelectRule}
        onAddRule={onAddRule}
        onDeleteRule={onDeleteRule}
      />
      <div className="flex-1">
        {selectedRule ? (
          <RuleEditor
            rule={selectedRule}
            onChange={(updates) => onUpdateRule(selectedRule.id, updates)}
            errors={validationErrors.filter(e =>
              e.path.startsWith(`transformations[${rules.findIndex(r => r.id === selectedRule.id)}]`)
            )}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a rule to edit</p>
              <p className="text-sm text-gray-600">or add a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
