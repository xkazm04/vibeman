import { RemoteDefinition, RemoteStatus } from './types';

// Helper to inject script
const injectScript = (args: { global: string; url: string }) => {
    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = args.url;
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script ${args.url}`));
        document.head.appendChild(script);
    });
};

/**
 * Check if a remote server is available
 * @param url - The remoteEntry.js URL to check
 * @param timeout - Timeout in milliseconds (default: 2000)
 * @returns Promise<boolean>
 */
export async function checkRemoteAvailability(url: string, timeout: number = 2000): Promise<boolean> {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            mode: 'no-cors' // We just want to know if it's there, not read it
        });

        clearTimeout(id);
        return true; // If we get a response (even 404 or opaque), the server is likely running
    } catch (error) {
        return false;
    }
}

/**
 * Initialize all remotes with smart local/production detection
 * @param remotes - Array of remote definitions
 * @returns Promise<RemoteStatus[]>
 */
export async function initializeSmartFederation(remotes: RemoteDefinition[]): Promise<RemoteStatus[]> {
    const statuses: RemoteStatus[] = [];

    for (const remote of remotes) {
        // Check local first
        const isLocalAvailable = await checkRemoteAvailability(remote.localEntry);

        let entry = remote.prodEntry;
        let isLocal = false;
        let isAvailable = false;

        if (isLocalAvailable) {
            entry = remote.localEntry;
            isLocal = true;
            isAvailable = true;
        } else {
            // Check production
            isAvailable = await checkRemoteAvailability(remote.prodEntry);
        }

        statuses.push({
            name: remote.name,
            entry,
            isLocal,
            isAvailable,
            lastChecked: new Date(),
        });

        // Inject the script if available
        if (isAvailable) {
            try {
                // Check if already loaded
                // @ts-expect-error - window scope
                if (!window[remote.name]) {
                    await injectScript({
                        global: remote.name,
                        url: entry,
                    });
                }
            } catch (e) {
                console.error(`Failed to inject script for ${remote.name}`, e);
                statuses[statuses.length - 1].error = 'Failed to load script';
                statuses[statuses.length - 1].isAvailable = false;
            }
        }
    }

    return statuses;
}

/**
 * Load a component from a remote
 * @param remoteName - The remote identifier
 * @param componentName - The exposed component name
 * @returns Promise<React.ComponentType>
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadRemoteComponent<T = any>(
    remoteName: string,
    componentName: string
): Promise<T> {
    // @ts-expect-error - window scope
    const container = window[remoteName];
    if (!container) {
        throw new Error(`Remote container ${remoteName} not found`);
    }

    // @ts-expect-error - container init
    await container.init(__webpack_share_scopes__.default);
    // @ts-expect-error - container get
    const factory = await container.get(componentName);
    const Module = factory();
    return Module;
}
