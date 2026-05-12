// routes/notes/$noteId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/notes/$noteId')({
  component: NoteDetail,
});

function NoteDetail() {
  const { noteId } = Route.useParams();

  return <div>Note: {noteId}</div>;
}