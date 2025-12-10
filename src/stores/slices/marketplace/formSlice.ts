/**
 * Form Slice - Manages pattern creation/editing form
 */

import type { StateCreator } from 'zustand';
import type { FormSlice, MarketplaceState, PatternFormData } from './types';
import { defaultFormData } from './types';

export const createFormSlice: StateCreator<
  MarketplaceState,
  [],
  [],
  FormSlice
> = (set, get) => ({
  formData: defaultFormData,
  formErrors: {},
  isPublishing: false,

  setFormData: (data: Partial<PatternFormData>) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
  },

  clearFormData: () => {
    set({ formData: defaultFormData, formErrors: {} });
  },

  validateForm: () => {
    const { formData } = get();
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.title?.trim()) errors.title = 'Title is required';
    if (!formData.description?.trim()) errors.description = 'Description is required';
    if (!formData.problem_statement?.trim()) errors.problem_statement = 'Problem statement is required';
    if (!formData.solution_approach?.trim()) errors.solution_approach = 'Solution approach is required';

    set({ formErrors: errors });
    return Object.keys(errors).length === 0;
  },
});
