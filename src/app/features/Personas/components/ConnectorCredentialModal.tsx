'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plug, ExternalLink, Check, Loader2, KeyRound } from 'lucide-react';
import { CredentialEditForm } from './CredentialEditForm';
import type { SuggestedConnector } from '@/app/features/Personas/lib/designTypes';
import type { ConnectorDefinition, CredentialMetadata } from '@/app/features/Personas/lib/types';
import type { CredentialTemplateField } from '@/lib/personas/credentialTemplates';
import { getCredentialTemplate } from '@/lib/personas/credentialTemplates';

interface ConnectorCredentialModalProps {
  connector: SuggestedConnector;
  connectorDefinition?: ConnectorDefinition;
  existingCredential?: CredentialMetadata;
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
}

type OAuthPhase = 'idle' | 'authorizing' | 'success' | 'error';

export function ConnectorCredentialModal({
  connector,
  connectorDefinition,
  existingCredential,
  onSave,
  onClose,
}: ConnectorCredentialModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // OAuth state
  const [oauthPhase, setOauthPhase] = useState<OAuthPhase>('idle');
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthTokens, setOauthTokens] = useState<Record<string, string> | null>(null);

  // Detect if this is a Google OAuth connector:
  // Primary: from CLI design output (connector.oauth_type === 'google')
  // Fallback: from credential template registry (credentialTemplates.ts is client-safe)
  const credTemplate = getCredentialTemplate(connector.name);
  const supportsOAuth = connector.oauth_type === 'google' || credTemplate?.oauthType === 'google';

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Merge field definitions: DB connector fields take priority over CLI-generated ones
  const fields: CredentialTemplateField[] = connectorDefinition?.fields?.length
    ? connectorDefinition.fields
    : credTemplate?.fields?.length
      ? credTemplate.fields
      : (connector.credential_fields ?? []).map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type as CredentialTemplateField['type'],
          placeholder: f.placeholder,
          helpText: f.helpText,
          required: f.required,
        }));

  // For OAuth connectors, only show client_id and client_secret as manual input
  // The refresh_token will be auto-filled by the OAuth flow
  const oauthManualFields = supportsOAuth
    ? (fields.filter((f) => f.key === 'client_id' || f.key === 'client_secret').length > 0
        ? fields.filter((f) => f.key === 'client_id' || f.key === 'client_secret')
        : [
            { key: 'client_id', label: 'Client ID', type: 'text' as const, placeholder: 'OAuth client ID from Google Cloud Console', required: true },
            { key: 'client_secret', label: 'Client Secret', type: 'password' as const, placeholder: 'OAuth client secret', required: true },
          ])
    : fields;

  const label = connectorDefinition?.label || credTemplate?.label || connector.name;
  const category = connectorDefinition?.category;

  // Start Google OAuth flow
  const handleAuthorize = useCallback(async (formValues: Record<string, string>) => {
    const clientId = formValues.client_id?.trim();
    const clientSecret = formValues.client_secret?.trim();

    if (!clientId || !clientSecret) {
      setOauthError('Please enter Client ID and Client Secret first');
      return;
    }

    setOauthPhase('authorizing');
    setOauthError(null);

    try {
      const res = await fetch('/api/personas/google-oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          connector_name: connector.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start OAuth flow');
      }

      const { authUrl, sessionId } = await res.json();

      // Open Google consent screen in new tab
      window.open(authUrl, '_blank', 'noopener,noreferrer');

      // Poll for completion with overlap guard
      let isOauthPolling = false;
      pollRef.current = setInterval(async () => {
        if (isOauthPolling) return;
        isOauthPolling = true;
        try {
          const statusRes = await fetch(`/api/personas/google-oauth/status/${sessionId}`);
          if (!statusRes.ok) return;

          const status = await statusRes.json();

          if (status.status === 'success' && status.tokens) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            setOauthTokens({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: status.tokens.refresh_token,
              access_token: status.tokens.access_token,
            });
            setOauthPhase('success');
          } else if (status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            setOauthError(status.error || 'Authorization failed');
            setOauthPhase('error');
          }
        } catch {
          // Network errors during polling — keep trying
        } finally {
          isOauthPolling = false;
        }
      }, 1500);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setOauthPhase((prev) => {
            if (prev === 'authorizing') {
              setOauthError('Authorization timed out. Please try again.');
              return 'error';
            }
            return prev;
          });
        }
      }, 5 * 60 * 1000);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Failed to start authorization');
      setOauthPhase('error');
    }
  }, [connector.name]);

  // Save OAuth tokens as credential
  const handleOAuthSave = useCallback(() => {
    if (oauthTokens) {
      onSave(oauthTokens);
    }
  }, [oauthTokens, onSave]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-secondary/95 backdrop-blur-xl border border-primary/15 rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {connectorDefinition?.icon_url ? (
              <img src={connectorDefinition.icon_url} alt={label} className="w-7 h-7" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plug className="w-4 h-4 text-primary/60" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              {category && (
                <span className="text-[10px] text-muted-foreground/40 px-1.5 py-0.5 bg-muted/30 rounded mt-0.5 inline-block">
                  {category}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground/50 hover:text-foreground/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing credential badge */}
        {existingCredential && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            Credential already configured — update below to replace
          </div>
        )}

        {/* Setup URL */}
        {connector.setup_url && (
          <a
            href={connector.setup_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3.5 py-2.5 mb-4 bg-primary/5 border border-primary/15 rounded-xl text-sm text-primary/80 hover:bg-primary/10 hover:text-primary transition-colors group"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-105 transition-transform" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">How to get credentials</span>
              <span className="text-xs text-muted-foreground/40 block truncate mt-0.5">
                {connector.setup_url}
              </span>
            </div>
          </a>
        )}

        {/* Setup instructions */}
        {connector.setup_instructions && (
          <div className="mb-4 px-3.5 py-2.5 bg-secondary/60 border border-primary/10 rounded-xl">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider mb-1.5">
              Setup Instructions
            </p>
            <p className="text-xs text-foreground/60 whitespace-pre-line leading-relaxed">
              {connector.setup_instructions}
            </p>
          </div>
        )}

        {/* OAuth Flow for Google connectors */}
        {supportsOAuth ? (
          <GoogleOAuthForm
            fields={oauthManualFields}
            oauthPhase={oauthPhase}
            oauthError={oauthError}
            oauthTokens={oauthTokens}
            onAuthorize={handleAuthorize}
            onSave={handleOAuthSave}
            onRetry={() => { setOauthPhase('idle'); setOauthError(null); }}
            onCancel={onClose}
          />
        ) : fields.length > 0 ? (
          <CredentialEditForm
            fields={fields}
            onSave={onSave}
            onCancel={onClose}
          />
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground/50">
              No credential fields defined for this connector.
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-secondary/60 hover:bg-secondary text-foreground/70 rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google OAuth Form Sub-Component
// ---------------------------------------------------------------------------

function GoogleOAuthForm({
  fields,
  oauthPhase,
  oauthError,
  oauthTokens,
  onAuthorize,
  onSave,
  onRetry,
  onCancel,
}: {
  fields: CredentialTemplateField[];
  oauthPhase: OAuthPhase;
  oauthError: string | null;
  oauthTokens: Record<string, string> | null;
  onAuthorize: (values: Record<string, string>) => void;
  onSave: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const f of fields) defaults[f.key] = '';
    return defaults;
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {/* Manual fields (client_id, client_secret) */}
      {(oauthPhase === 'idle' || oauthPhase === 'error') && (
        <>
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                  value={values[field.key] || ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={`w-full px-3 py-2 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder-muted-foreground/30 ${
                    field.type === 'password' ? 'pr-10' : ''
                  }`}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                  >
                    {showSecrets[field.key] ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
              {field.helpText && (
                <p className="mt-1 text-xs text-muted-foreground/40">{field.helpText}</p>
              )}
            </div>
          ))}

          {oauthError && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {oauthError}
            </div>
          )}

          {/* Authorize button */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-secondary/60 hover:bg-secondary text-foreground/70 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onAuthorize(values)}
              disabled={!values.client_id?.trim() || !values.client_secret?.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                !values.client_id?.trim() || !values.client_secret?.trim()
                  ? 'bg-secondary/40 text-muted-foreground/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500/90 hover:to-blue-600/90'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Authorize with Google
            </button>
          </div>
        </>
      )}

      {/* Authorizing phase */}
      {oauthPhase === 'authorizing' && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-sm text-foreground/70 font-medium">Waiting for Google authorization...</p>
          <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
            Complete the sign-in in the browser tab that just opened.
            This dialog will update automatically.
          </p>
        </div>
      )}

      {/* Success phase */}
      {oauthPhase === 'success' && oauthTokens && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-4 gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-400 font-medium">Google authorized successfully!</p>
            <p className="text-xs text-muted-foreground/50">
              Refresh token obtained. Click Save to store this credential.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-secondary/60 hover:bg-secondary text-foreground/70 rounded-xl text-sm transition-colors"
            >
              Re-authorize
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20"
            >
              <Check className="w-3.5 h-3.5" />
              Save Credential
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
