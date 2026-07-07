import { IDiaryRepository } from '../../domain/repositories/IDiaryRepository';
import { DiaryEntry, CreateDiaryEntryDTO } from '../../domain/models/DiaryEntry';
import { db, auth } from '../firebase/firebaseConfig';
import firestore from '@react-native-firebase/firestore';

export class FirestoreDiaryRepository implements IDiaryRepository {
  private getCollection() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Użytkownik nie jest zalogowany');
    }
    return db.collection('users').doc(user.uid).collection('diary_entries');
  }

  async save(entry: CreateDiaryEntryDTO): Promise<DiaryEntry> {
    const collection = this.getCollection();
    const docRef = collection.doc(); // Auto-generate ID
    
    const now = new Date();
    
    const dataToSave = {
      id: docRef.id,
      date: firestore.Timestamp.fromDate(entry.date),
      fullText: entry.fullText,
      parsedData: entry.parsedData,
      createdAt: firestore.Timestamp.fromDate(now),
    };

    await docRef.set(dataToSave);

    return {
      id: docRef.id,
      date: entry.date,
      fullText: entry.fullText,
      parsedData: entry.parsedData,
      createdAt: now,
    };
  }

  async update(id: string, entry: CreateDiaryEntryDTO): Promise<DiaryEntry> {
    const docRef = this.getCollection().doc(id);
    
    const dataToUpdate = {
      fullText: entry.fullText,
      parsedData: entry.parsedData,
      // Nie aktualizujemy `date` ani `createdAt` bez potrzeby (lub date, jeśli jest w specyfikacji)
    };

    await docRef.update(dataToUpdate);

    // Fetch updated to return correctly
    const snap = await docRef.get();
    const data = snap.data();
    
    if (!data) throw new Error("Entry not found after update");

    return {
      id: data.id,
      date: data.date.toDate(),
      fullText: data.fullText,
      parsedData: data.parsedData,
      createdAt: data.createdAt.toDate(),
    };
  }

  async findByDate(targetDate: Date): Promise<DiaryEntry | null> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await this.getCollection()
      .where('date', '>=', firestore.Timestamp.fromDate(startOfDay))
      .where('date', '<=', firestore.Timestamp.fromDate(endOfDay))
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: data.id,
      date: data.date.toDate(),
      fullText: data.fullText,
      parsedData: data.parsedData,
      createdAt: data.createdAt.toDate(),
    };
  }

  async getAll(): Promise<DiaryEntry[]> {
    const snapshot = await this.getCollection().orderBy('createdAt', 'desc').get();
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: data.id,
        date: data.date.toDate(),
        fullText: data.fullText,
        parsedData: data.parsedData,
        createdAt: data.createdAt.toDate(),
      };
    });
  }
}
