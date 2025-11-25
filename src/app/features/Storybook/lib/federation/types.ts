export interface RemoteDefinition {
    /** Unique identifier for the remote */
    name: string;

    /** Display name for UI */
    displayName: string;

    /** Production URL to remoteEntry.js */
    prodEntry: string;

    /** Local development URL to remoteEntry.js */
    localEntry: string;

    /** Default port for local development */
    localPort: number;

    /** List of exposed component paths */
    components: ComponentDefinition[];

    /** Optional: Tailwind prefix used by this remote */
    tailwindPrefix?: string;

    /** Optional: Description of the remote/project */
    description?: string;
}

export interface ComponentDefinition {
    /** Export name (e.g., "./Button") */
    exposedName: string;

    /** Display name for UI */
    displayName: string;

    /** Component description */
    description?: string;

    /** Default props for preview */
    defaultProps?: Record<string, unknown>;

    /** Prop type definitions for the props editor */
    propTypes?: PropTypeDefinition[];
}

export interface PropTypeDefinition {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'object' | 'array';
    defaultValue?: unknown;
    options?: string[]; // For select type
    description?: string;
}

export interface RemoteStatus {
    name: string;
    entry: string;
    isLocal: boolean;
    isAvailable: boolean;
    lastChecked: Date;
    error?: string;
}

export interface FederationState {
    initialized: boolean;
    remotes: Map<string, RemoteStatus>;
    error?: string;
}
