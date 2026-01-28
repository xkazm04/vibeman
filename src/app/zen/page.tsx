'use client';

import { ZenCommandCenter } from './components/ZenCommandCenter';

/**
 * Zen Page
 *
 * Command center for monitoring and controlling remote batch execution.
 * Features 2x2 CLI session grid, event sidebar, and status bar.
 *
 * Modes:
 * - Offline: Local monitoring only
 * - Online: Configure Supabase connection
 * - Emulator: Multi-device mesh control (tablet UI)
 */
export default function ZenPage() {
  return <ZenCommandCenter />;
}
