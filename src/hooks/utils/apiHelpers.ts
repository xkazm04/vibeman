/**
 * API Helper Utilities
 *
 * Shared utility functions for reducing duplication in API calls across hooks
 */

/**
 * Build URL search params from an object
 * Automatically filters out undefined/null values
 */
export function buildQueryParams(params: Record<string, string | number | boolean | undefined | null>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}

/**
 * Generic fetch with error handling
 * Throws standardized errors for failed requests
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * POST request helper with JSON body
 */
export async function postJSON<T>(
  url: string,
  body: unknown
): Promise<T> {
  return fetchWithErrorHandling<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/**
 * DELETE request helper with JSON body
 */
export async function deleteJSON<T>(
  url: string,
  body?: unknown
): Promise<T> {
  return fetchWithErrorHandling<T>(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
}

/**
 * GET request helper with query params
 */
export async function getJSON<T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const queryString = params ? `?${buildQueryParams(params).toString()}` : '';
  return fetchWithErrorHandling<T>(`${url}${queryString}`);
}
