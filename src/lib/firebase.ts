import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  const path = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.error("Firestore connection failed", error);
  }
}

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signIn() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Auth error", error);
  }
}

export async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install it to connect your wallet.');
  }

  try {
    const accounts = await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('Walang napiling account. Pakisubukang muli.');
    }
    return accounts[0] as string;
  } catch (error: any) {
    console.error("MetaMask connection error:", error);
    
    if (error.code === 4001) {
      throw new Error('Tinanggihan ang request sa koneksyon. Pakisubukang muli.');
    }
    
    // Check if we are in an iframe
    const inIframe = window.self !== window.top;
    const suffix = inIframe ? " Pakisubukang buksan ang app sa bagong tab (gamit ang icon sa taas-kanan)." : "";
    
    throw new Error(`Hindi maka-konekta sa MetaMask: ${error.message || 'Error occurred'}.${suffix}`);
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error", error);
  }
}
