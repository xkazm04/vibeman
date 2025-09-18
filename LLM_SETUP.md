# LLM Provider Setup Guide

This guide explains how to configure LLM providers for Vibeman using environment variables.

## Overview

Vibeman supports multiple LLM providers for AI-powered features like project analysis, task generation, and code optimization. Providers are configured server-side using environment variables for enhanced security.

## Supported Providers

### 1. Ollama (Local)
- **Always Available**: Runs locally, no API key required
- **Models**: Llama 2, Code Llama, Mistral, and more
- **Setup**: Install Ollama and ensure it's running on `http://localhost:11434`

### 2. OpenAI
- **Models**: GPT-3.5, GPT-4, GPT-4 Turbo
- **Required**: `OPENAI_API_KEY`
- **Optional**: `OPENAI_BASE_URL` for custom endpoints

### 3. Anthropic (Claude)
- **Models**: Claude 3 Haiku, Sonnet, Opus
- **Required**: `ANTHROPIC_API_KEY`
- **Optional**: `ANTHROPIC_BASE_URL` for custom endpoints

### 4. Google Gemini
- **Models**: Gemini Pro, Gemini Pro Vision
- **Required**: `GEMINI_API_KEY`
- **Optional**: `GEMINI_BASE_URL` for custom endpoints

## Configuration

### 1. Create Environment File

Copy the example environment file:
```bash
cp .env.example .env.local
```

### 2. Add Your API Keys

Edit `.env.local` and add your API keys:

```bash
# For Anthropic/Claude (recommended)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# For OpenAI (optional)
OPENAI_API_KEY=sk-your-openai-key-here

# For Google Gemini (optional)
GEMINI_API_KEY=your-gemini-key-here

# Ollama is always available locally
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Restart Development Server

```bash
npm run dev
```

## Provider Status

The UI will show the status of each provider:

- **🟢 Ready**: Provider is configured and available
- **🟡 Not configured**: Environment variable not set
- **🔴 Unavailable**: Provider configured but not responding

## Security Benefits

- **Server-Side Storage**: API keys stored securely on server
- **No Client Exposure**: Keys never sent to browser
- **Enterprise Ready**: Centralized configuration
- **Production Safe**: No localStorage dependency

## Troubleshooting

### Provider Shows "Not configured"
- Check that the environment variable is set correctly
- Restart the development server after adding variables
- Verify the variable name matches exactly (case-sensitive)

### Provider Shows "Unavailable"
- Check your API key is valid and has sufficient credits
- Verify network connectivity to the provider's API
- Check the base URL if using a custom endpoint

### Ollama Issues
- Ensure Ollama is installed and running
- Check that it's accessible at `http://localhost:11434`
- Try pulling a model: `ollama pull llama2`

## Getting API Keys

### Anthropic (Claude)
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Generate an API key in the API Keys section

### OpenAI
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account and add billing
3. Generate an API key in the API Keys section

### Google Gemini
1. Visit [ai.google.dev](https://ai.google.dev)
2. Create a project and enable the Gemini API
3. Generate an API key in the credentials section

## Best Practices

1. **Use Anthropic for Best Results**: Claude models generally provide the highest quality outputs
2. **Keep Ollama as Fallback**: Always available for offline work
3. **Rotate Keys Regularly**: Update API keys periodically for security
4. **Monitor Usage**: Keep track of API usage and costs
5. **Use Environment-Specific Keys**: Different keys for development/staging/production