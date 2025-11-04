import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  DefaultProviderStorage,
  SupportedProvider
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
    borderColor: 'border-gray-600/50',
    hoverBorderColor: 'hover:border-gray-400',
    iconFilter: 'filter brightness-0 invert'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '/llm_icons/openai.svg',
    description: 'ChatGPT models',
    borderColor: 'border-green-600/50',
    hoverBorderColor: 'hover:border-green-400',
    iconFilter: 'filter brightness-0 invert'
  },
  {
    id: 'anthropic',
    name: 'Claude',
    icon: '/llm_icons/claude.svg',
    description: 'Anthropic models',
    borderColor: 'border-orange-600/50',
    hoverBorderColor: 'hover:border-orange-400'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '/llm_icons/gemini.svg',
    description: 'Google AI models',
    borderColor: 'border-blue-600/50',
    hoverBorderColor: 'hover:border-blue-400'
  }
];



export default function LLMSelector({ onProviderSelect, selectedProvider }: LLMSelectorProps) {
  const [providerStatus, setProviderStatus] = useState<Record<SupportedProvider, {
    configured: boolean;
    isAvailable: boolean;
    isChecking: boolean;
  }>>({} as any);

  // Initialize provider status by checking server-side availability
  useEffect(() => {
    const initializeStatus = async () => {
      const status: Record<SupportedProvider, any> = {} as any;
      
      for (const provider of providers) {
        status[provider.id] = {
          configured: false,
          isAvailable: false,
          isChecking: true
        };
      }
      
      setProviderStatus(status);

      try {
        // Check server-side provider availability
        const response = await fetch('/api/kiro/llm-providers');
        const result = await response.json();
        
        if (result.success) {
          const updatedStatus: Record<SupportedProvider, any> = {} as any;
          
          for (const provider of providers) {
            const serverStatus = result.providers[provider.id];
            updatedStatus[provider.id] = {
              configured: serverStatus?.configured || false,
              isAvailable: serverStatus?.available || false,
              isChecking: false
            };
          }
          
          setProviderStatus(updatedStatus);
        } else {
          // Fallback: mark all as unavailable
          for (const provider of providers) {
            setProviderStatus(prev => ({
              ...prev,
              [provider.id]: {
                configured: false,
                isAvailable: false,
                isChecking: false
              }
            }));
          }
        }
      } catch (error) {
        // Fallback: mark all as unavailable except Ollama
        for (const provider of providers) {
          setProviderStatus(prev => ({
            ...prev,
            [provider.id]: {
              configured: provider.id === 'ollama',
              isAvailable: provider.id === 'ollama',
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

    // If provider is not configured or available, don't proceed
    if (!status?.configured || !status?.isAvailable) {
      return;
    }

    // Set as default provider and notify parent
    DefaultProviderStorage.setDefaultProvider(provider.id);
    onProviderSelect(provider.id);
  };



  const getProviderStatusIcon = (provider: ProviderInfo) => {
    const status = providerStatus[provider.id];

    if (status?.isChecking) {
      return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
    }

    if (!status?.configured) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }

    if (!status?.isAvailable) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }

    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  };

  const getProviderStatusText = (provider: ProviderInfo) => {
    const status = providerStatus[provider.id];

    if (status?.isChecking) {
      return 'Checking...';
    }

    if (!status?.configured) {
      return 'Not configured';
    }

    if (!status?.isAvailable) {
      return 'Unavailable';
    }

    return 'Ready';
  };



  const isProviderSelectable = (provider: ProviderInfo) => {
    const status = providerStatus[provider.id];
    return !status?.isChecking && status?.configured && status?.isAvailable;
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

                {/* Status Icon and Text */}
                <div className="flex flex-col items-center space-y-1">
                  {getProviderStatusIcon(provider)}
                  <span className="text-sm text-gray-400">
                    {getProviderStatusText(provider)}
                  </span>
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
    </>
  );
}