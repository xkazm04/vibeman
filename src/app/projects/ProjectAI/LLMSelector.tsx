import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  APIKeyStorage,
  DefaultProviderStorage,
  SupportedProvider,
  llmManager
} from '../../../lib/llm';

interface LLMSelectorProps {
  onProviderSelect: (provider: SupportedProvider) => void;
  selectedProvider?: SupportedProvider;
}

interface ProviderInfo {
  id: SupportedProvider;
  name: string;
  icon: string;
  description: string;
  requiresApiKey: boolean;
  borderColor: string;
  hoverBorderColor: string;
  iconFilter?: string;
}

const providers: ProviderInfo[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    icon: '/llm_icons/ollama.svg',
    description: 'Local AI models',
    requiresApiKey: false,
    borderColor: 'border-gray-600/50',
    hoverBorderColor: 'hover:border-gray-400',
    iconFilter: 'filter brightness-0 invert'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '/llm_icons/openai.svg',
    description: 'ChatGPT models',
    requiresApiKey: true,
    borderColor: 'border-green-600/50',
    hoverBorderColor: 'hover:border-green-400',
    iconFilter: 'filter brightness-0 invert'
  },
  {
    id: 'anthropic',
    name: 'Claude',
    icon: '/llm_icons/claude.svg',
    description: 'Anthropic models',
    requiresApiKey: true,
    borderColor: 'border-orange-600/50',
    hoverBorderColor: 'hover:border-orange-400'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '/llm_icons/gemini.svg',
    description: 'Google AI models',
    requiresApiKey: true,
    borderColor: 'border-blue-600/50',
    hoverBorderColor: 'hover:border-blue-400'
  }
];

interface APIKeyModalProps {
  provider: ProviderInfo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

function APIKeyModal({ provider, isOpen, onClose, onSave }: APIKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) return;

    setIsLoading(true);
    try {
      // Save the API key
      APIKeyStorage.setAPIKey(provider.id, apiKey.trim());
      onSave(apiKey.trim());
      setApiKey('');
      onClose();
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 relative">
                  <img
                    src={provider.icon}
                    alt={provider.name}
                    className="w-full h-full object-contain filter brightness-0 invert"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{provider.name} API Key</h3>
                  <p className="text-sm text-gray-400">Required to use {provider.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSave()}
                  placeholder={`Enter your ${provider.name} API key`}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKey.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LLMSelector({ onProviderSelect, selectedProvider }: LLMSelectorProps) {
  const [apiKeyModal, setApiKeyModal] = useState<{ provider: ProviderInfo; isOpen: boolean }>({
    provider: providers[0],
    isOpen: false
  });
  const [providerStatus, setProviderStatus] = useState<Record<SupportedProvider, {
    hasApiKey: boolean;
    isAvailable: boolean;
    isChecking: boolean;
  }>>({} as any);

  // Initialize provider status
  useEffect(() => {
    const initializeStatus = async () => {
      const status: Record<SupportedProvider, any> = {} as any;

      for (const provider of providers) {
        status[provider.id] = {
          hasApiKey: provider.requiresApiKey ? APIKeyStorage.hasAPIKey(provider.id) : true,
          isAvailable: false,
          isChecking: true
        };
      }

      setProviderStatus(status);

      // Check availability for each provider
      for (const provider of providers) {
        try {
          const isAvailable = await llmManager.checkProviderAvailability(provider.id);
          setProviderStatus(prev => ({
            ...prev,
            [provider.id]: {
              ...prev[provider.id],
              isAvailable,
              isChecking: false
            }
          }));
        } catch (error) {
          setProviderStatus(prev => ({
            ...prev,
            [provider.id]: {
              ...prev[provider.id],
              isAvailable: false,
              isChecking: false
            }
          }));
        }
      }
    };

    initializeStatus();
  }, []);

  const handleProviderClick = async (provider: ProviderInfo) => {
    const status = providerStatus[provider.id];

    // If provider requires API key and doesn't have one, show modal
    if (provider.requiresApiKey && !status?.hasApiKey) {
      setApiKeyModal({ provider, isOpen: true });
      return;
    }

    // If provider is not available, don't proceed
    if (!status?.isAvailable) {
      return;
    }

    // Set as default provider and notify parent
    DefaultProviderStorage.setDefaultProvider(provider.id);
    onProviderSelect(provider.id);
  };

  const handleApiKeySave = async (apiKey: string) => {
    const provider = apiKeyModal.provider;

    // Update status to show we have the API key
    setProviderStatus(prev => ({
      ...prev,
      [provider.id]: {
        ...prev[provider.id],
        hasApiKey: true,
        isChecking: true
      }
    }));

    // Refresh the LLM manager to pick up the new API key
    llmManager.refreshProviders();

    // Check availability with the new API key
    try {
      const isAvailable = await llmManager.checkProviderAvailability(provider.id);
      setProviderStatus(prev => ({
        ...prev,
        [provider.id]: {
          ...prev[provider.id],
          isAvailable,
          isChecking: false
        }
      }));

      // If available, select this provider
      if (isAvailable) {
        DefaultProviderStorage.setDefaultProvider(provider.id);
        onProviderSelect(provider.id);
      }
    } catch (error) {
      setProviderStatus(prev => ({
        ...prev,
        [provider.id]: {
          ...prev[provider.id],
          isAvailable: false,
          isChecking: false
        }
      }));
    }
  };

  const getProviderStatusIcon = (provider: ProviderInfo) => {
    const status = providerStatus[provider.id];

    if (status?.isChecking) {
      return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
    }

    if (provider.requiresApiKey && !status?.hasApiKey) {
      return <Key className="w-4 h-4 text-yellow-400" />;
    }

    if (!status?.isAvailable) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }

    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  };



  const isProviderSelectable = (provider: ProviderInfo) => {
    const status = providerStatus[provider.id];
    return !status?.isChecking && (status?.isAvailable || (provider.requiresApiKey && !status?.hasApiKey));
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {providers.map((provider) => {
          const isSelected = selectedProvider === provider.id;
          const isSelectable = isProviderSelectable(provider);

          return (
            <motion.button
              key={provider.id}
              onClick={() => handleProviderClick(provider)}
              disabled={!isSelectable}
              whileHover={isSelectable ? { scale: 1.05 } : {}}
              whileTap={isSelectable ? { scale: 0.95 } : {}}
              className={`
                relative p-6 rounded-lg border-2 transition-all duration-300 text-left bg-transparent
                ${isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : `${provider.borderColor} ${isSelectable ? provider.hoverBorderColor : ''}`
                }
                ${!isSelectable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Content */}
              <div className="flex flex-col items-center space-y-3">
                {/* Animated Icon */}
                <motion.div
                  className="w-12 h-12 relative"
                  animate={isSelected ? {
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isSelected ? Infinity : 0,
                    repeatType: "reverse"
                  }}
                >
                  <img
                    src={provider.icon}
                    alt={provider.name}
                    className={`w-full h-full object-contain ${provider.iconFilter || ''}`}
                  />
                </motion.div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-white text-center">
                  {provider.name}
                </h3>

                {/* Status Icon */}
                <div className="flex items-center justify-center">
                  {getProviderStatusIcon(provider)}
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-900"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* API Key Modal */}
      <APIKeyModal
        provider={apiKeyModal.provider}
        isOpen={apiKeyModal.isOpen}
        onClose={() => setApiKeyModal(prev => ({ ...prev, isOpen: false }))}
        onSave={handleApiKeySave}
      />
    </>
  );
}