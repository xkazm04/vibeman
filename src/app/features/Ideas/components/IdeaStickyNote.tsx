import { DbIdea } from '@/app/db';
import { RenderComponent, defaultTheme, stickyNoteDescriptor } from '../lib/uiDsl';

interface IdeaStickyNoteProps {
  idea: DbIdea;
  index: number;
  onClick: () => void;
}

export default function IdeaStickyNote({ idea, index, onClick }: IdeaStickyNoteProps) {
  return (
    <RenderComponent
      descriptor={stickyNoteDescriptor}
      context={{
        data: idea,
        theme: defaultTheme,
        handlers: {
          onClick,
        },
      }}
      index={index}
    />
  );
}
