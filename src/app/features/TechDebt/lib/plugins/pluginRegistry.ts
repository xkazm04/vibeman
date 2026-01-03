/**
 * Plugin Registry for TechDebt
 * Manages plugin registration, lifecycle, and access
 */

import type {
  TechDebtPlugin,
  PluginMetadata,
  RegisteredPlugin,
  PluginStatus,
  PluginLoadResult,
  PluginModule,
  PluginFactory,
  PluginConstructor,
  PluginEvent,
  PluginEventType,
  PluginEventListener
} from './types';

/**
 * Singleton plugin registry for managing all tech debt plugins
 */
class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private listeners: Map<PluginEventType, Set<PluginEventListener>> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load built-in plugins
    await this.loadBuiltInPlugins();

    this.initialized = true;
    console.log('[PluginRegistry] Initialized with', this.plugins.size, 'plugins');
  }

  /**
   * Load built-in plugins that ship with TechDebt
   */
  private async loadBuiltInPlugins(): Promise<void> {
    // Built-in plugins will be loaded here
    // For now, we'll leave this empty and let the example plugin be loaded separately
  }

  /**
   * Register a plugin
   */
  register(plugin: TechDebtPlugin): PluginLoadResult {
    try {
      // Validate plugin metadata
      if (!this.validatePlugin(plugin)) {
        return {
          success: false,
          error: 'Invalid plugin: missing required metadata or interfaces'
        };
      }

      const pluginId = plugin.metadata.id;

      // Check for duplicate registration
      if (this.plugins.has(pluginId)) {
        return {
          success: false,
          error: `Plugin with ID "${pluginId}" is already registered`
        };
      }

      // Register the plugin
      const registered: RegisteredPlugin = {
        metadata: plugin.metadata,
        status: 'inactive',
        loadedAt: new Date().toISOString(),
        instance: plugin
      };

      this.plugins.set(pluginId, registered);

      // Emit event
      this.emit({
        type: 'plugin:loaded',
        pluginId,
        timestamp: new Date().toISOString(),
        data: { metadata: plugin.metadata }
      });

      console.log(`[PluginRegistry] Registered plugin: ${plugin.metadata.name}`);

      return { success: true, plugin };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<boolean> {
    const registered = this.plugins.get(pluginId);
    if (!registered) return false;

    try {
      // Deactivate first if active
      if (registered.status === 'active') {
        await this.deactivate(pluginId);
      }

      // Call unload hook if available
      if (registered.instance?.hooks?.onUnload) {
        await registered.instance.hooks.onUnload();
      }

      this.plugins.delete(pluginId);

      this.emit({
        type: 'plugin:unloaded',
        pluginId,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`[PluginRegistry] Error unregistering plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Activate a plugin
   */
  async activate(pluginId: string): Promise<boolean> {
    const registered = this.plugins.get(pluginId);
    if (!registered || !registered.instance) return false;

    if (registered.status === 'active') return true;

    try {
      registered.status = 'loading';

      // Call load hook if available
      if (registered.instance.hooks?.onLoad) {
        await registered.instance.hooks.onLoad();
      }

      // Call activate hook if available
      if (registered.instance.hooks?.onActivate) {
        await registered.instance.hooks.onActivate();
      }

      registered.status = 'active';
      registered.lastError = undefined;

      this.emit({
        type: 'plugin:activated',
        pluginId,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registered.status = 'error';
      registered.lastError = errorMessage;

      // Call error hook if available
      if (registered.instance.hooks?.onError && error instanceof Error) {
        registered.instance.hooks.onError(error);
      }

      this.emit({
        type: 'plugin:error',
        pluginId,
        timestamp: new Date().toISOString(),
        data: { error: errorMessage }
      });

      return false;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(pluginId: string): Promise<boolean> {
    const registered = this.plugins.get(pluginId);
    if (!registered || !registered.instance) return false;

    if (registered.status === 'inactive') return true;

    try {
      // Call deactivate hook if available
      if (registered.instance.hooks?.onDeactivate) {
        await registered.instance.hooks.onDeactivate();
      }

      registered.status = 'inactive';

      this.emit({
        type: 'plugin:deactivated',
        pluginId,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registered.lastError = errorMessage;
      return false;
    }
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): RegisteredPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin instance by ID
   */
  getInstance(pluginId: string): TechDebtPlugin | undefined {
    return this.plugins.get(pluginId)?.instance;
  }

  /**
   * Get all registered plugins
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all active plugins
   */
  getActive(): TechDebtPlugin[] {
    return Array.from(this.plugins.values())
      .filter((p) => p.status === 'active' && p.instance)
      .map((p) => p.instance!);
  }

  /**
   * Get plugins by category
   */
  getByCategory(category: string): TechDebtPlugin[] {
    return Array.from(this.plugins.values())
      .filter((p) => p.metadata.category === category && p.status === 'active' && p.instance)
      .map((p) => p.instance!);
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get plugin count
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: TechDebtPlugin): boolean {
    // Check required metadata
    if (!plugin.metadata) return false;
    if (!plugin.metadata.id || typeof plugin.metadata.id !== 'string') return false;
    if (!plugin.metadata.name || typeof plugin.metadata.name !== 'string') return false;
    if (!plugin.metadata.version || typeof plugin.metadata.version !== 'string') return false;
    if (!plugin.metadata.category) return false;

    // Check required interfaces
    if (!plugin.scanner || typeof plugin.scanner.scan !== 'function') return false;

    return true;
  }

  /**
   * Load plugin from module
   */
  loadFromModule(module: PluginModule): PluginLoadResult {
    try {
      let plugin: TechDebtPlugin | undefined;

      // Try different module export formats
      if (module.default) {
        if (typeof module.default === 'function') {
          // Check if it's a constructor or factory
          try {
            // Try as factory first
            plugin = (module.default as PluginFactory)();
          } catch {
            // Try as constructor
            plugin = new (module.default as PluginConstructor)();
          }
        } else {
          plugin = module.default as TechDebtPlugin;
        }
      } else if (module.createPlugin) {
        plugin = module.createPlugin();
      } else if (module.Plugin) {
        plugin = new module.Plugin();
      }

      if (!plugin) {
        return {
          success: false,
          error: 'Could not resolve plugin from module'
        };
      }

      return this.register(plugin);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Subscribe to plugin events
   */
  on(eventType: PluginEventType, listener: PluginEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Emit a plugin event
   */
  private emit(event: PluginEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('[PluginRegistry] Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Clear all plugins (for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();

// Export class for testing
export { PluginRegistry };
