import { INoteRepository } from '../../../domain/repositories/INoteRepository';
import { NoteDocument } from '../../../domain/models/NoteDocument';

export class GetNotesUseCase {
  constructor(private noteRepository: INoteRepository) {}

  async execute(day?: string): Promise<NoteDocument[]> {
    return await this.noteRepository.getNotes(day);
  }
}
