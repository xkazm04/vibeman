/**
 * Accessibility utilities for improved screen reader and keyboard support
 */

export {
  useAnnouncer,
  useAriaId,
  useAriaExpanded,
  useAriaSelected,
  useFocusManager,
  useFocusTrap,
  LiveRegion,
  SkipLink,
  combineAriaLabelledBy,
  combineAriaDescribedBy,
  ariaProps,
  generateAriaId,
  type LiveRegionProps,
  type SkipLinkProps,
} from './aria';

export {
  VisuallyHidden,
  type VisuallyHiddenProps,
} from './VisuallyHidden';
