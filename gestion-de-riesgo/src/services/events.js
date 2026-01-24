import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

const getEventsRef = (uid, operationId) =>
  collection(db, 'users', uid, 'operations', operationId, 'events')

export const createEvent = async (uid, operationId, eventData) => {
  const eventsRef = getEventsRef(uid, operationId)
  const newEvent = {
    ...eventData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  const docRef = await addDoc(eventsRef, newEvent)
  return docRef.id
}

export const updateEvent = async (uid, operationId, eventId, eventData) => {
  const eventRef = doc(db, 'users', uid, 'operations', operationId, 'events', eventId)
  await updateDoc(eventRef, {
    ...eventData,
    updatedAt: serverTimestamp()
  })
}

export const deleteEvent = async (uid, operationId, eventId) => {
  const eventRef = doc(db, 'users', uid, 'operations', operationId, 'events', eventId)
  await deleteDoc(eventRef)
}

export const getEvents = async (uid, operationId) => {
  const eventsRef = getEventsRef(uid, operationId)
  const q = query(eventsRef, orderBy('date', 'asc'))
  const snapshot = await getDocs(q)
  const events = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    events.push({
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null
    })
  })

  return events
}

export const getEvent = async (uid, operationId, eventId) => {
  const eventRef = doc(db, 'users', uid, 'operations', operationId, 'events', eventId)
  const docSnap = await getDoc(eventRef)
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
