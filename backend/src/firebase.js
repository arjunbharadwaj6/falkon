import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
let app;
try {
  // For production, use service account key file
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'falkon-b7c5f',
    });
  } else {
    // For development, use application default credentials
    app = admin.initializeApp({
      projectId: 'falkon-b7c5f',
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  throw error;
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// Collections
export const collections = {
  accounts: 'accounts',
  candidates: 'candidates',
  jobs: 'jobs',
  jobPositions: 'jobPositions',
  passwordResetTokens: 'passwordResetTokens',
  accountApprovalTokens: 'accountApprovalTokens',
};

// Helper to get current timestamp
export const timestamp = () => admin.firestore.FieldValue.serverTimestamp();

// Helper to create document with auto-generated ID
export const createDoc = async (collectionName, data) => {
  const docRef = await db.collection(collectionName).add({
    ...data,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  });
  return { id: docRef.id, ...data };
};

// Helper to update document
export const updateDoc = async (collectionName, docId, data) => {
  await db.collection(collectionName).doc(docId).update({
    ...data,
    updatedAt: timestamp(),
  });
};

// Helper to get document by ID
export const getDocById = async (collectionName, docId) => {
  const doc = await db.collection(collectionName).doc(docId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// Helper to query documents
export const queryDocs = async (collectionName, filters = []) => {
  let query = db.collection(collectionName);
  
  filters.forEach(({ field, operator, value }) => {
    query = query.where(field, operator, value);
  });
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export default { db, auth, collections, timestamp, createDoc, updateDoc, getDocById, queryDocs };
