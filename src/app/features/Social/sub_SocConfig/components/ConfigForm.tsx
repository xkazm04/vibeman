'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  TestTube2,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';
import type {
  SocialChannelType,
  SocialChannelConfigResponse,
  CredentialField,
  ConfigField,
} from '../lib/types';
import { CHANNEL_INFO, getDefaultConfig } from '../lib/types';

interface ConfigFormProps {
  channelType: SocialChannelType;
  existingConfig?: SocialChannelConfigResponse | null;
  onSave: (data: {
    name: string;
    credentials: Record<string, string>;
    config: Record<string, any>;
  }) => Promise<void>;
  onTest: (credentials: Record<string, string>) => Promise<{ success: boolean; message: string }>;
  onCancel: () => void;
}

export function ConfigForm({
  channelType,
  existingConfig,
  onSave,
  onTest,
  onCancel,
}: ConfigFormProps) {
  const channelInfo = CHANNEL_INFO[channelType];

  // Form state
  const [name, setName] = useState(existingConfig?.name || `My ${channelInfo.name}`);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, any>>(
    existingConfig?.config || getDefaultConfig(channelType)
  );

  // UI state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    setTestResult(null); // Clear test result when credentials change
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayAdd = (key: string, value: string) => {
    if (!value.trim()) return;
    const current = config[key] || [];
    if (!current.includes(value.trim())) {
      handleConfigChange(key, [...current, value.trim()]);
    }
  };

  const handleArrayRemove = (key: string, index: number) => {
    const current = config[key] || [];
    handleConfigChange(key, current.filter((_: any, i: number) => i !== index));
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(credentials);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ name, credentials, config });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCredentialField = (field: CredentialField) => {
    const isPassword = field.type === 'password';
    const showPassword = showPasswords[field.key];

    return (
      <div key={field.key} className="mb-4">
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            type={isPassword && !showPassword ? 'password' : 'text'}
            value={credentials[field.key] || ''}
            onChange={(e) => handleCredentialChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`
              w-full px-3 py-2 bg-gray-800/60 border border-gray-700/60 rounded-lg
              text-sm text-gray-200 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40
              ${isPassword ? 'pr-10' : ''}
            `}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => togglePasswordVisibility(field.key)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {field.helpText && (
          <p className="mt-1 text-[10px] text-gray-500">{field.helpText}</p>
        )}
      </div>
    );
  };

  const renderConfigField = (field: ConfigField) => {
    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.key} className="flex items-center justify-between mb-3">
            <div>
              <label className="text-xs font-medium text-gray-300">{field.label}</label>
              {field.helpText && (
                <p className="text-[10px] text-gray-500">{field.helpText}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleConfigChange(field.key, !config[field.key])}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${config[field.key] ? 'bg-cyan-500' : 'bg-gray-700'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                  ${config[field.key] ? 'left-5' : 'left-0.5'}
                `}
              />
            </button>
          </div>
        );

      case 'text':
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              {field.label}
            </label>
            <input
              type="text"
              value={config[field.key] || ''}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/60 rounded-lg
                text-sm text-gray-200 placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            {field.helpText && (
              <p className="mt-1 text-[10px] text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'array':
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              {field.label}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={`Add ${field.label.toLowerCase()}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd(field.key, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 px-3 py-2 bg-gray-800/60 border border-gray-700/60 rounded-lg
                  text-sm text-gray-200 placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  handleArrayAdd(field.key, input.value);
                  input.value = '';
                }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(config[field.key] || []).map((item: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/60 rounded text-xs text-gray-300"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleArrayRemove(field.key, index)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            {field.helpText && (
              <p className="mt-1 text-[10px] text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const hasRequiredCredentials = channelInfo.credentialFields
    .filter((f) => f.required)
    .every((f) => credentials[f.key]?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 bg-gray-900/40 rounded-xl border border-gray-700/40 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700/40 bg-gray-800/40">
        <h3 className="text-sm font-semibold text-gray-200">
          {existingConfig ? 'Edit Configuration' : 'New Configuration'}
        </h3>
        <p className="text-[10px] text-gray-500 mt-1">
          {channelInfo.description}
        </p>
      </div>

      {/* Form */}
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar">
        {/* Name */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Configuration Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production Account"
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/60 rounded-lg
              text-sm text-gray-200 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>

        {/* Credentials Section */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Credentials
          </h4>
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            {channelInfo.credentialFields.map(renderCredentialField)}

            {/* Test Connection Button */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700/40">
              <button
                type="button"
                onClick={handleTest}
                disabled={!hasRequiredCredentials || isTesting}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-colors
                  ${hasRequiredCredentials && !isTesting
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube2 className="w-4 h-4" />
                )}
                Test Connection
              </button>

              {testResult && (
                <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span className="text-xs">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Settings
          </h4>
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            {channelInfo.configFields.map(renderConfigField)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700/40 bg-gray-800/40 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !hasRequiredCredentials || isSaving}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-colors
            ${name.trim() && hasRequiredCredentials && !isSaving
              ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {existingConfig ? 'Update' : 'Save'}
        </button>
      </div>
    </motion.div>
  );
}

export default ConfigForm;
