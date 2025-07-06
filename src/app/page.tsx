import Runner from './runner/Runner';
import PreviewLayout from './preview/PreviewLayout';
import EventLayout from './events/EventLayout';
import CoderLayout from './coder/CoderLayout';
import TestTaskButton from '../components/TestTaskButton';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <div className="absolute top-4 right-4 z-50">
        <TestTaskButton />
      </div>
      <Runner />
      <PreviewLayout />
      <CoderLayout /> 
      <EventLayout />
    </main>
  );
}