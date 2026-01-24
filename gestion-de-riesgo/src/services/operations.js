import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

const getOperationsRef = (uid) => collection(db, 'users', uid, 'operations')

export const createOperation = async (uid, operationData) => {
  const operationsRef = getOperationsRef(uid)
  const newOperation = {
    ...operationData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  const docRef = await addDoc(operationsRef, newOperation)
  return docRef.id
}

export const updateOperation = async (uid, operationId, operationData) => {
  const operationRef = doc(db, 'users', uid, 'operations', operationId)
  await updateDoc(operationRef, {
    ...operationData,
    updatedAt: serverTimestamp()
  })
}

export const deleteOperation = async (uid, operationId) => {
  const operationRef = doc(db, 'users', uid, 'operations', operationId)
  await deleteDoc(operationRef)
}

export const getOperations = async (uid, statusFilter = null) => {
  const operationsRef = getOperationsRef(uid)
  let q = query(operationsRef)

  if (statusFilter && statusFilter !== 'ALL') {
    q = query(operationsRef, where('status', '==', statusFilter))
  }

  const snapshot = await getDocs(q)
  const operations = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    operations.push({
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null
    })
  })

  // Ordenar por openedAt si existe, sino por createdAt
  return operations.sort((a, b) => {
    const dateA = a.openedAt ? new Date(a.openedAt) : (a.createdAt || new Date(0))
    const dateB = b.openedAt ? new Date(b.openedAt) : (b.createdAt || new Date(0))
    return dateB - dateA
  })
}

export const getOperation = async (uid, operationId) => {
  const operationRef = doc(db, 'users', uid, 'operations', operationId)
  const docSnap = await getDoc(operationRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null
    }
  }
  return null
}
