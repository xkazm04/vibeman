'use client';

import React from 'react';
import { AdvisorPersona } from './advisorPrompts';
import {
  AdvisorResponseData,
  UXResponseData,
  SecurityResponseData,
  ArchitectResponseData,
  VisionaryResponseData,
  ChumResponseData,
  GenericResponseData,
} from './types';
import {
  ErrorView,
  renderUXResponse,
  renderSecurityResponse,
  renderArchitectResponse,
  renderVisionaryResponse,
  renderChumResponse,
  renderMarkdownFallback,
  renderGenericResponse,
} from './lib/advisorRenderers';

interface AdvisorResponseViewProps {
  advisor: AdvisorPersona;
  response: {
    advisor: string;
    data: AdvisorResponseData;
    isGenerating: boolean;
    error?: string;
  };
}

export default function AdvisorResponseView({ advisor, response }: AdvisorResponseViewProps) {
  if (response.error) {
    return <ErrorView error={response.error} />;
  }

  if (!response.data) {
    return null;
  }

  const data = response.data;

  // Check if this is a raw markdown fallback
  if ('_raw' in data && '_markdown' in data) {
    return renderMarkdownFallback(data._markdown, advisor.color);
  }

  // Check if this is a generic response format (issues/recommendations)
  if ('issues' in data || 'recommendations' in data) {
    return renderGenericResponse(data as GenericResponseData, advisor);
  }

  // Render based on advisor type
  switch (advisor.id) {
    case 'ux':
      return renderUXResponse(data as UXResponseData, advisor.color);
    case 'security':
      return renderSecurityResponse(data as SecurityResponseData, advisor.color);
    case 'architect':
      return renderArchitectResponse(data as ArchitectResponseData, advisor.color);
    case 'visionary':
      return renderVisionaryResponse(data as VisionaryResponseData, advisor.color);
    case 'chum':
      return renderChumResponse(data as ChumResponseData, advisor.color);
    default:
      return null;
  }
}
