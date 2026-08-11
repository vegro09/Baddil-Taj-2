import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Determine if we should use Firebase or beautiful simulated local storage persistence
export const isMockMode = !firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('mock');

let dbInstance: any = null;
let authInstance: any = null;
let storageInstance: any = null;

if (!isMockMode) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = (firebaseConfig as any).firestoreDatabaseId
      ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
      : getFirestore(app);
    authInstance = getAuth(app);
    storageInstance = getStorage(app);
    console.log("Firebase configured successfully.");
  } catch (error) {
    console.warn("Failed to initialize physical Firebase; using responsive mock state instead.", error);
  }
} else {
  console.log("Starting in beautiful offline-first Local Storage mode for Badal.");
}

export const db = dbInstance;
export const auth = authInstance;
export const storage = storageInstance;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid || 'mock-user-id',
      email: authInstance?.currentUser?.email || 'preview-user@example.com',
      emailVerified: authInstance?.currentUser?.emailVerified || true,
      isAnonymous: authInstance?.currentUser?.isAnonymous || false,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo: authInstance?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Security/Execution Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
