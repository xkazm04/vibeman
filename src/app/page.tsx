import Runner from './runner/Runner';
import PreviewLayout from './preview/PreviewLayout';
import CoderLayout from './coder/CoderLayout';
import MonitorLayout from './footer-monitor/MonitorLayout';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Runner />
      <PreviewLayout />
      <CoderLayout />
      <MonitorLayout />
    </main>
  );
}