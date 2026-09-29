import { DailyDocument } from '../models/DailyDocument';
import { NoteDocument } from '../models/NoteDocument';

export type AnyDocument = DailyDocument | NoteDocument;

export interface IDocumentRepository {
  /** Pobiera dowolny dokument (wpis dnia albo notatkę) po jego id; rozróżnienie po polu `kind`. */
  getDocumentById(id: string): Promise<AnyDocument | null>;
}
