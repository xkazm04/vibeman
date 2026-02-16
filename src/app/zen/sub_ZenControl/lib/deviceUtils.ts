export function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-green-400';
    case 'busy':
      return 'bg-amber-400 animate-pulse';
    case 'idle':
      return 'bg-cyan-400';
    default:
      return 'bg-gray-500';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'busy':
      return 'Busy';
    case 'idle':
      return 'Idle';
    default:
      return 'Offline';
  }
}
