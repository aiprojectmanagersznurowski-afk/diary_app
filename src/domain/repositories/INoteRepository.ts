import { NoteDocument } from '../models/NoteDocument';

export interface INoteRepository {
  getNotes(day?: string): Promise<NoteDocument[]>;
  subscribeToNotes(userId: string, onUpdate: (note: NoteDocument) => void): () => void;
}
