import { Paths, Directory, File } from 'expo-file-system';
import { IFileStorage } from '../../domain/services/IFileStorage';

export class ExpoFileStorage implements IFileStorage {
  private recordingsDir: Directory | null = null;
  private fallbackDirUri: string;

  constructor(customBaseDir?: string) {
    this.fallbackDirUri = customBaseDir ?? 'file:///app/documents/recordings/';

    if (typeof Directory === 'function') {
      try {
        if (customBaseDir) {
          this.recordingsDir = new Directory(customBaseDir);
        } else if (typeof Paths !== 'undefined' && Paths?.document) {
          this.recordingsDir = new Directory(Paths.document, 'recordings');
        } else {
          this.recordingsDir = new Directory('file:///app/documents/recordings');
        }
      } catch {
        this.recordingsDir = null;
      }
    }
  }

  private ensureDir(): void {
    if (this.recordingsDir && !this.recordingsDir.exists) {
      this.recordingsDir.create({ intermediates: true, idempotent: true });
    }
  }

  async moveToPermanent(tempUri: string, id: string): Promise<string> {
    this.ensureDir();

    if (typeof File === 'function' && this.recordingsDir) {
      const sourceFile = new File(tempUri);
      const destFile = new File(this.recordingsDir, `${id}.m4a`);

      if (sourceFile.exists) {
        sourceFile.move(destFile);
      } else {
        sourceFile.copy(destFile);
      }

      return destFile.uri;
    }

    return `${this.fallbackDirUri}${id}.m4a`;
  }

  async deleteFile(path: string): Promise<void> {
    try {
      if (typeof File === 'function') {
        const file = new File(path);
        if (file.exists) {
          file.delete();
        }
      }
    } catch {
      // Ignorujemy błędy przy próbie usunięcia nieistniejącego pliku
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      if (typeof File === 'function') {
        const file = new File(path);
        return file.exists;
      }
      return false;
    } catch {
      return false;
    }
  }
}
