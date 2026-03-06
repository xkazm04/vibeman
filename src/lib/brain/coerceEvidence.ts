/**
 * Evidence coercion utility
 *
 * LLM-generated evidence arrays may contain plain string IDs instead of
 * typed { type, id } objects. This utility normalises them by classifying
 * IDs using their prefix convention (sig_, ref_/br_, or direction fallback).
 */

import type { EvidenceRef } from '@/app/db/models/brain.types';

export function coerceEvidence(raw: unknown): EvidenceRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item): EvidenceRef => {
    if (typeof item === 'object' && item !== null && 'type' in item && 'id' in item) {
      return item as EvidenceRef;
    }
    const id = String(item);
    if (id.startsWith('sig_')) return { type: 'signal', id };
    if (id.startsWith('ref_') || id.startsWith('br_')) return { type: 'reflection', id };
    return { type: 'direction', id };
  });
}
