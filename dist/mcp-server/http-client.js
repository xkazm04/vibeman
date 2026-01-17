"use strict";
/**
 * HTTP Client for Vibeman Next.js API
 * Provides typed methods for calling internal APIs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibemanHttpClient = void 0;
class VibemanHttpClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    /**
     * Make a POST request to the API
     */
    async post(path, body) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || data.message || `HTTP ${response.status}`,
                };
            }
            return { success: true, data: data };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Make a GET request to the API
     */
    async get(path, params) {
        try {
            const url = new URL(`${this.baseUrl}${path}`);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        url.searchParams.set(key, value);
                    }
                });
            }
            const response = await fetch(url.toString());
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || data.message || `HTTP ${response.status}`,
                };
            }
            return { success: true, data: data };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Make a PUT request to the API
     */
    async put(path, body) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || data.message || `HTTP ${response.status}`,
                };
            }
            return { success: true, data: data };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.VibemanHttpClient = VibemanHttpClient;
//# sourceMappingURL=http-client.js.map