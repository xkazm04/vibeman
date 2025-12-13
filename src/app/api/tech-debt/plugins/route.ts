/**
 * Plugin Management API
 * GET /api/tech-debt/plugins - List all registered plugins
 * POST /api/tech-debt/plugins - Register a new plugin
 * PATCH /api/tech-debt/plugins - Activate/deactivate a plugin
 * DELETE /api/tech-debt/plugins - Unregister a plugin
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  pluginRegistry,
  type TechDebtPlugin,
  type RegisteredPlugin
} from '@/app/features/TechDebtRadar/lib/plugins';
import { logger } from '@/lib/logger';

/**
 * GET - List all registered plugins
 */
export async function GET() {
  try {
    const plugins = pluginRegistry.getAll();

    // Map to serializable format (exclude instance)
    const serializedPlugins = plugins.map((plugin) => ({
      metadata: plugin.metadata,
      status: plugin.status,
      loadedAt: plugin.loadedAt,
      lastError: plugin.lastError
    }));

    return NextResponse.json({
      success: true,
      plugins: serializedPlugins,
      count: plugins.length,
      activeCount: plugins.filter((p) => p.status === 'active').length
    });
  } catch (error) {
    logger.error('Error fetching plugins:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch plugins', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST - Register a new plugin
 * Body: { pluginModule: object } - Plugin module/instance to register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plugin } = body;

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin data is required' },
        { status: 400 }
      );
    }

    // Validate plugin structure
    if (!plugin.metadata?.id || !plugin.metadata?.name || !plugin.scanner) {
      return NextResponse.json(
        { error: 'Invalid plugin structure: missing metadata or scanner' },
        { status: 400 }
      );
    }

    // Register the plugin
    const result = pluginRegistry.register(plugin as TechDebtPlugin);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to register plugin', details: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plugin ${plugin.metadata.name} registered successfully`,
      pluginId: plugin.metadata.id
    }, { status: 201 });
  } catch (error) {
    logger.error('Error registering plugin:', { error });
    return NextResponse.json(
      { error: 'Failed to register plugin', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Activate or deactivate a plugin
 * Body: { pluginId: string, action: 'activate' | 'deactivate' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { pluginId, action } = body;

    if (!pluginId || !action) {
      return NextResponse.json(
        { error: 'pluginId and action are required' },
        { status: 400 }
      );
    }

    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    const plugin = pluginRegistry.get(pluginId);
    if (!plugin) {
      return NextResponse.json(
        { error: `Plugin "${pluginId}" not found` },
        { status: 404 }
      );
    }

    let success: boolean;
    if (action === 'activate') {
      success = await pluginRegistry.activate(pluginId);
    } else {
      success = await pluginRegistry.deactivate(pluginId);
    }

    if (!success) {
      const updatedPlugin = pluginRegistry.get(pluginId);
      return NextResponse.json(
        {
          error: `Failed to ${action} plugin`,
          details: updatedPlugin?.lastError
        },
        { status: 500 }
      );
    }

    const updatedPlugin = pluginRegistry.get(pluginId);

    return NextResponse.json({
      success: true,
      message: `Plugin ${action}d successfully`,
      status: updatedPlugin?.status
    });
  } catch (error) {
    logger.error('Error updating plugin:', { error });
    return NextResponse.json(
      { error: 'Failed to update plugin', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unregister a plugin
 * Body: { pluginId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { pluginId } = body;

    if (!pluginId) {
      return NextResponse.json(
        { error: 'pluginId is required' },
        { status: 400 }
      );
    }

    const plugin = pluginRegistry.get(pluginId);
    if (!plugin) {
      return NextResponse.json(
        { error: `Plugin "${pluginId}" not found` },
        { status: 404 }
      );
    }

    const success = await pluginRegistry.unregister(pluginId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unregister plugin' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plugin "${pluginId}" unregistered successfully`
    });
  } catch (error) {
    logger.error('Error unregistering plugin:', { error });
    return NextResponse.json(
      { error: 'Failed to unregister plugin', details: String(error) },
      { status: 500 }
    );
  }
}
