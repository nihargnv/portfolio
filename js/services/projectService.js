import { db, isFirebaseConfigured } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const colRef = isFirebaseConfigured ? collection(db, "projects") : null;

export const projectService = {
  async get(id) {
    if (!isFirebaseConfigured) return null;
    try {
      const snap = await getDoc(doc(db, "projects", id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (err) {
      console.error("Error fetching project from Firestore:", err);
      return null;
    }
  },

  async getAll() {
    if (!isFirebaseConfigured) return [];
    try {
      const querySnap = await getDocs(colRef);
      const list = [];
      querySnap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.error("Error fetching projects from Firestore:", err);
      return [];
    }
  },

  async create(data) {
    if (!isFirebaseConfigured) return null;
    const docId = data.id || `p_${Date.now()}`;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "projects", docId), payload);
  },

  async update(id, data) {
    if (!isFirebaseConfigured) return null;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "projects", id), payload);
  },

  async delete(id) {
    if (!isFirebaseConfigured) return null;
    return await deleteDoc(doc(db, "projects", id));
  }
};
