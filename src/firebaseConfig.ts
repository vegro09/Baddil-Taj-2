import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// Credentials from the user's provided json configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZ5eyZ4_M0tWy6_s4owzaH7dGsxzHbGoE",
  authDomain: "baddil-1.firebaseapp.com",
  projectId: "baddil-1",
  storageBucket: "baddil-1.firebasestorage.app",
  messagingSenderId: "251459639381",
  appId: "1:251459639381:android:ddff07bfd69962edf1dcdc"
};

// Initialize Firebase App safely with a named app to avoid collision with the DEFAULT app
const app = getApps().find(a => a.name === "baddil-fcm") || initializeApp(firebaseConfig, "baddil-fcm");

/**
 * Request notification permissions and fetch the FCM device token.
 * Will print 'My Device Token: <token>' to the console when successfully retrieved.
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (typeof window === "undefined") return null;

    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM is not supported or permitted in this browser/iframe context.");
      return null;
    }

    const messaging = getMessaging(app);

    // Prompt user for notification permissions
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission was denied by the user.");
        return null;
      }
    }

    // Retrieve the device's unique FCM registration token
    const token = await getToken(messaging);
    if (token) {
      console.log("My Device Token:", token);
      return token;
    } else {
      console.warn("No registration token retrieved. Please ensure service worker is properly configured.");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while retrieving FCM token:", error);
    return null;
  }
};

export { app };
