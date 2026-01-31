import dotenv from 'dotenv';
import { auth, db, collections } from '../src/firebase.js';

dotenv.config();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const companyName = process.env.ADMIN_COMPANY || 'Falkon';
const username = (email || '').split('@')[0] || 'superadmin';

if (!email || !password) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
  process.exit(1);
}

const upsertAccountDoc = async (uid) => {
  const accountData = {
    companyName,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    role: 'admin',
    isApproved: true,
    parentAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.accounts).doc(uid).set(accountData, { merge: true });
  return accountData;
};

const main = async () => {
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email.toLowerCase());
    } catch (err) {
      userRecord = null;
    }

    if (!userRecord) {
      userRecord = await auth.createUser({
        email: email.toLowerCase(),
        password,
        displayName: username,
      });
      console.log(`Created Firebase user: ${userRecord.uid}`);
    } else {
      console.log(`Firebase user exists: ${userRecord.uid}`);
    }

    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isApproved: true,
      parentAccountId: null,
    });

    const accountData = await upsertAccountDoc(userRecord.uid);

    console.log('✅ Super admin account ready');
    console.log({
      uid: userRecord.uid,
      email: accountData.email,
      username: accountData.username,
      companyName: accountData.companyName,
      role: accountData.role,
      isApproved: accountData.isApproved,
    });
  } catch (error) {
    console.error('Failed to create super admin:', error);
    process.exit(1);
  }
};

main();
