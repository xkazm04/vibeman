/**
 * Sanitization utility for preventing XSS attacks in markdown and HTML content
 * Uses DOMPurify to sanitize user-generated content before rendering
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify sanitization
 * - Removes script tags, inline event handlers, and dangerous URLs
 * - Allows safe HTML and markdown formatting tags
 */
const SANITIZE_CONFIG: DOMPurify.Config = {
  // Allow only safe HTML tags
  ALLOWED_TAGS: [
    'a', 'b', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'i', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'ul', 'blockquote', 'hr',
  ],
  // Allow only safe attributes
  ALLOWED_ATTR: [
    'class', 'href', 'id', 'target', 'rel', 'title', 'alt', 'style',
  ],
  // Disallow script protocols in URLs
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Remove all tags in disallowed list
  KEEP_CONTENT: true,
  // Return a string instead of a DOM node
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  // Forbid <script> and other dangerous tags explicitly
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta', 'style'],
  // Forbid event handlers
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
};

/**
 * Sanitizes markdown or HTML content to prevent XSS attacks
 *
 * @param content - The raw content string that may contain markdown or HTML
 * @param options - Optional DOMPurify configuration overrides
 * @returns Sanitized content safe for rendering
 *
 * @example
 * ```tsx
 * const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
 * const safe = sanitizeContent(userInput);
 * // Returns: '<p>Safe content</p>'
 * ```
 */
export function sanitizeContent(
  content: string,
  options?: Partial<DOMPurify.Config>
): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  try {
    // Merge custom options with default config
    const config = options ? { ...SANITIZE_CONFIG, ...options } : SANITIZE_CONFIG;

    // Sanitize the content
    const sanitized = DOMPurify.sanitize(content, config as any);

    return sanitized as string;
  } catch (error) {
    // In case of error, return empty string for safety
    return '';
  }
}

/**
 * Sanitizes plain text by escaping HTML special characters
 * Use this for content that should never contain HTML tags
 *
 * @param text - Plain text to escape
 * @returns Escaped text safe for HTML rendering
 *
 * @example
 * ```tsx
 * const userText = '<script>alert("XSS")</script>';
 * const escaped = escapeHtml(userText);
 * // Returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Validates if a URL is safe (no javascript:, data:, or other dangerous protocols)
 *
 * @param url - URL string to validate
 * @returns true if URL is safe, false otherwise
 *
 * @example
 * ```tsx
 * isSafeUrl('https://example.com'); // true
 * isSafeUrl('javascript:alert(1)'); // false
 * ```
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Remove whitespace and convert to lowercase for checking
  const normalizedUrl = url.trim().toLowerCase();

  // List of dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];

  // Check if URL starts with any dangerous protocol
  const isDangerous = dangerousProtocols.some(protocol =>
    normalizedUrl.startsWith(protocol)
  );

  return !isDangerous;
}

/**
 * Sanitizes markdown content specifically
 * Allows common markdown syntax while removing dangerous HTML
 *
 * @param markdown - Markdown content to sanitize
 * @returns Sanitized markdown content
 */
export function sanitizeMarkdown(markdown: string): string {
  // First, sanitize the HTML/markdown content
  const sanitized = sanitizeContent(markdown, {
    // Allow additional markdown-friendly tags
    ALLOWED_TAGS: [
      'a', 'b', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'i', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'ul', 'blockquote', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
    ],
    ALLOWED_ATTR: [
      'class', 'href', 'id', 'target', 'rel', 'title', 'alt', 'src', 'width', 'height',
    ],
  });

  return sanitized;
}
