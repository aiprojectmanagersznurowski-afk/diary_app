import firebase from '@react-native-firebase/app';
import authModule from '@react-native-firebase/auth';
import firestoreModule from '@react-native-firebase/firestore';



export const auth = authModule();
export const db = firestoreModule();

// Włączenie local-first (offline persistence) dla Firestore
db.settings({
  persistence: true,
  cacheSizeBytes: firestoreModule.CACHE_SIZE_UNLIMITED
});
