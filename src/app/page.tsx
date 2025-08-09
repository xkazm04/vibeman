import Runner from './runner/Runner';
import PreviewLayout from './preview/PreviewLayout';
import CoderLayout from './coder/CoderLayout';
import CombinedBottomLayout from './combined-layout/CombinedBottomLayoutMain';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Runner />
      <PreviewLayout />
      <CoderLayout />
      <CombinedBottomLayout />
    </main>
  );
}