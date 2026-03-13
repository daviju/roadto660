import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import firebaseConfig, { isFirebaseConfigured } from './config';

let app: FirebaseApp | null = null;
let database: Database | null = null;

export function getFirebaseDb(): Database | null {
  if (!isFirebaseConfigured()) return null;

  if (!database) {
    try {
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
    } catch (error) {
      console.warn('Firebase init failed:', error);
      return null;
    }
  }

  return database;
}
