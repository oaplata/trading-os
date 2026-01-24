import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export const updateInitialCapital = async (uid, initialCapital) => {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    initialCapital: Number(initialCapital)
  })
}

export const getUserData = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid))
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() }
  }
  return null
}
