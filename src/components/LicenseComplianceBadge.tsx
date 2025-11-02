'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import {
  evaluateLicense,
  getLicenseStatusDescription,
  getLicenseStatusColor,
  type LicenseStatus,
} from '@/app/features/Depndencies/lib/utils';

interface LicenseComplianceBadgeProps {
  license: string | null | undefined;
  className?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * LicenseComplianceBadge - Visual indicator for package license compliance
 *
 * Displays a colored badge indicating whether a package has an OSS-compliant license,
 * a restricted/copyleft license, a proprietary license, or unknown license status.
 *
 * Color coding:
 * - Green: OSS-compliant (MIT, Apache, BSD, etc.)
 * - Yellow: Restricted/requires review (GPL, AGPL, etc.)
 * - Red: Proprietary or non-OSS
 * - Gray: Unknown or missing license
 */
export default function LicenseComplianceBadge({
  license,
  className = '',
  showIcon = true,
  showTooltip = true,
  size = 'md',
}: LicenseComplianceBadgeProps) {
  const status: LicenseStatus = useMemo(() => evaluateLicense(license), [license]);
  const description = useMemo(() => getLicenseStatusDescription(status), [status]);
  const colors = useMemo(() => getLicenseStatusColor(status), [status]);

  // Size variants
  const sizeClasses = {
    sm: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      badge: 'px-2.5 py-1 text-sm',
      icon: 'w-3.5 h-3.5',
      text: 'text-sm',
    },
    lg: {
      badge: 'px-3 py-1.5 text-base',
      icon: 'w-4 h-4',
      text: 'text-base',
    },
  };

  const sizeClass = sizeClasses[size];

  // Icon selection based on status
  const IconComponent = useMemo(() => {
    switch (status) {
      case 'oss':
        return Shield;
      case 'restricted':
        return AlertTriangle;
      case 'proprietary':
        return XCircle;
      case 'unknown':
      default:
        return HelpCircle;
    }
  }, [status]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    if (!license) {
      return 'License information not available';
    }
    return `${license} - ${description}`;
  }, [license, description]);

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 rounded-md border ${colors.bg} ${colors.border} ${colors.text} ${sizeClass.badge} font-medium transition-all ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      title={showTooltip ? tooltipContent : undefined}
      data-testid="license-compliance-badge"
    >
      {showIcon && <IconComponent className={sizeClass.icon} />}
      <span className={sizeClass.text}>{license || 'Unknown'}</span>
    </motion.div>
  );
}

/**
 * LicenseComplianceIndicator - Minimal icon-only version for compact displays
 */
export function LicenseComplianceIndicator({
  license,
  className = '',
}: {
  license: string | null | undefined;
  className?: string;
}) {
  const status: LicenseStatus = useMemo(() => evaluateLicense(license), [license]);
  const description = useMemo(() => getLicenseStatusDescription(status), [status]);
  const colors = useMemo(() => getLicenseStatusColor(status), [status]);

  const IconComponent = useMemo(() => {
    switch (status) {
      case 'oss':
        return Shield;
      case 'restricted':
        return AlertTriangle;
      case 'proprietary':
        return XCircle;
      case 'unknown':
      default:
        return HelpCircle;
    }
  }, [status]);

  const tooltipContent = license
    ? `${license} - ${description}`
    : 'License information not available';

  return (
    <motion.div
      className={`inline-flex ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      title={tooltipContent}
      data-testid="license-compliance-indicator"
    >
      <IconComponent className={`w-4 h-4 ${colors.text}`} />
    </motion.div>
  );
}
