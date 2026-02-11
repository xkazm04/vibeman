'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { CredentialTemplateField } from '@/lib/personas/credentialTemplates';

interface CredentialEditFormProps {
  fields: CredentialTemplateField[];
  healthcheckDescription?: string;
  initialValues?: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
  onHealthcheck?: () => void;
  isHealthchecking?: boolean;
  healthcheckResult?: { success: boolean; message: string } | null;
}

export function CredentialEditForm({
  fields,
  initialValues,
  onSave,
  onCancel,
  onHealthcheck,
  isHealthchecking,
  healthcheckResult,
}: CredentialEditFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const field of fields) {
      defaults[field.key] = initialValues?.[field.key] ?? '';
    }
    return defaults;
  });

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [errors]);

  const togglePassword = useCallback((key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(values);
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full h-28 px-4 py-3 bg-background/50 border rounded-xl text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30 ${
                errors[field.key] ? 'border-red-500/50' : 'border-border/50'
              }`}
              spellCheck={false}
            />
          ) : (
            <div className="relative">
              <input
                type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                value={values[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`w-full px-3 py-2 bg-background/50 border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30 ${
                  field.type === 'password' ? 'pr-10' : ''
                } ${errors[field.key] ? 'border-red-500/50' : 'border-border/50'}`}
              />
              {field.type === 'password' && (
                <button
                  type="button"
                  onClick={() => togglePassword(field.key)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                >
                  {showPasswords[field.key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}

          {errors[field.key] && (
            <p className="mt-1 text-xs text-red-400">{errors[field.key]}</p>
          )}
          {field.helpText && !errors[field.key] && (
            <p className="mt-1 text-xs text-muted-foreground/40">{field.helpText}</p>
          )}
        </div>
      ))}

      {/* Healthcheck */}
      {onHealthcheck && (
        <div className="pt-2">
          <button
            onClick={onHealthcheck}
            disabled={isHealthchecking}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isHealthchecking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            Test Connection
          </button>

          {healthcheckResult && (
            <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-xl text-sm ${
              healthcheckResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {healthcheckResult.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{healthcheckResult.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-secondary/60 hover:bg-secondary text-foreground/70 rounded-xl text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20"
        >
          Save Credential
        </button>
      </div>
    </div>
  );
}
