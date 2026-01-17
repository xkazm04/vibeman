/**
 * HTTP Client for Vibeman Next.js API
 * Provides typed methods for calling internal APIs
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export declare class VibemanHttpClient {
    private baseUrl;
    constructor(baseUrl: string);
    /**
     * Make a POST request to the API
     */
    post<T = unknown>(path: string, body: object): Promise<ApiResponse<T>>;
    /**
     * Make a GET request to the API
     */
    get<T = unknown>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>>;
    /**
     * Make a PUT request to the API
     */
    put<T = unknown>(path: string, body: object): Promise<ApiResponse<T>>;
}
//# sourceMappingURL=http-client.d.ts.map