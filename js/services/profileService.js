import { db, isFirebaseConfigured } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const docRef = isFirebaseConfigured ? doc(db, "profile", "main") : null;
const settingsRef = isFirebaseConfigured ? doc(db, "settings", "main") : null;

export const profileService = {
  // Get main profile data
  async get() {
    if (!isFirebaseConfigured) return null;
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const settings = await this.getSettings();
        return { ...data, ...settings };
      }
      return null;
    } catch (err) {
      console.error("Error fetching profile from Firestore:", err);
      return null;
    }
  },

  // Mimics collection-wide query
  async getAll() {
    const profile = await this.get();
    return profile ? [profile] : [];
  },

  // Create/Initialize profile data
  async create(data) {
    if (!isFirebaseConfigured) return null;
    return await setDoc(docRef, data);
  },

  // Update profile data
  async update(data) {
    if (!isFirebaseConfigured) return null;
    return await updateDoc(docRef, data);
  },

  // Delete profile
  async delete() {
    if (!isFirebaseConfigured) return null;
    return await deleteDoc(docRef);
  },

  // Get settings document (meta, theme, stats)
  async getSettings() {
    if (!isFirebaseConfigured) return {};
    try {
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        return snap.data();
      }
      return {};
    } catch (err) {
      console.error("Error fetching settings from Firestore:", err);
      return {};
    }
  },

  // Save settings document
  async saveSettings(data) {
    if (!isFirebaseConfigured) return null;
    return await setDoc(settingsRef, data, { merge: true });
  }
};
