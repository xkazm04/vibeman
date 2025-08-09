import Runner from './runner/Runner';
import PreviewLayout from './preview/PreviewLayout';
import EventLayout from './events/EventLayout';
import CoderLayout from './coder/CoderLayout';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Runner />
      <PreviewLayout />
      <CoderLayout />
      <EventLayout />
    </main>
  );
}