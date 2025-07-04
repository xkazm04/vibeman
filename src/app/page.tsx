import Runner from './runner/Runner';
import PreviewLayout from './preview/PreviewLayout';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Runner />
      <PreviewLayout />
    </main>
  );
}