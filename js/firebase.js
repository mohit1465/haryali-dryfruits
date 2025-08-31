// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-analytics.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Firebase configuration - Update these values in your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA7-fn82VhwL87iIRVKncqUeRR4EGIGjMw",
  authDomain: "haryali-ef198.firebaseapp.com",
  projectId: "haryali-ef198",
  storageBucket: "haryali-ef198.appspot.com",
  messagingSenderId: "213483649111",
  appId: "1:213483649111:web:2f979cfe001b1c50114b12",
  measurementId: "G-35H7CN8G55"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const analytics = getAnalytics(app);

// Make auth and db available globally
window.firebaseAuth = auth;
window.firebaseDb = db;

// Enable persistence for better offline support
setPersistence(auth, browserLocalPersistence);

// Google Sign-In
const signInWithGoogle = async () => {
  try {
    // Set persistence before signing in
    await setPersistence(auth, browserLocalPersistence);
    
    // Initialize Google provider with additional scopes if needed
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    // Sign in with popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user already exists in Firestore
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Add new user to Firestore
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isAdmin: false
      });
    } else {
      // Update last login time
      await setDoc(userRef, {
        lastLogin: new Date().toISOString()
      }, { merge: true });
    }
    
    return { 
      success: true, 
      user: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      } 
    };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    let errorMessage = 'Failed to sign in with Google. Please try again.';
    
    // More specific error messages
    if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'An account already exists with the same email but different sign-in credentials.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign in was canceled. Please try again.';
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage = 'This domain is not authorized for OAuth operations. Please contact support.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code 
    };
  }
};

// Authentication functions
const signUpUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Add user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      ...userData,
      email: user.email,
      createdAt: new Date().toISOString(),
      isAdmin: false // Default to regular user
    });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if user is admin
const isAdmin = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().isAdmin || false;
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Get current user data
const getCurrentUser = () => {
  return auth.currentUser;
};

// Auth state observer
const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      callback({
        uid: user.uid,
        email: user.email,
        ...(userDoc.exists() ? userDoc.data() : {})
      });
    } else {
      callback(null);
    }
  });
};

// User Data Management
const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userProfile = {
      'user-profile': {
        username: userData.displayName || 'User',
        email: userData.email,
        photoURL: userData.photoURL || '',
        phoneNumber: userData.phoneNumber || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        emailVerified: userData.emailVerified || false
      },
      'user-settings': {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        theme: 'light',
        language: 'en',
        currency: 'INR'
      },
      'user-wishlist': {
        products: []
      },
      'user-orders': {
        orders: []
      },
      'user-cart': {
        items: [],
        lastUpdated: new Date().toISOString()
      },
      'user-addresses': []
    };

    await setDoc(userRef, userProfile, { merge: true });
    return { success: true, data: userProfile };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, updates, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

// Cart Management
const addToCart = async (userId, product) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    let cart = [];
    if (userDoc.exists() && userDoc.data().cart) {
      cart = [...userDoc.data().cart];
    }
    
    // Check if product already exists in cart
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingProductIndex !== -1) {
      cart[existingProductIndex].addedAt = new Date().toISOString();
    } else {
      cart.push({
        ...product,
        addedAt: new Date().toISOString()
      });
    }
    
    await setDoc(userRef, { cart }, { merge: true });
    return { success: true, cart };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, error: error.message };
  }
};

const getCart = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { 
        success: true, 
        cart: userDoc.data().cart || [] 
      };
    }
    return { success: false, error: 'User not found', cart: [] };
  } catch (error) {
    console.error('Error getting cart:', error);
    return { success: false, error: error.message, cart: [] };
  }
};

// Update cart item function
const updateCartItem = async (userId, productId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const cart = [...(userDoc.data().cart || [])];
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex === -1) {
      return { success: false, error: 'Product not found in cart' };
    }
    
    // Update the item with new values
    cart[itemIndex] = { ...cart[itemIndex], ...updates };
    
    // Filter out items with quantity <= 0
    const updatedCart = cart.filter(item => (item.quantity || 1) > 0);
    
    await setDoc(userRef, { cart: updatedCart }, { merge: true });
    return { success: true, cart: updatedCart };
  } catch (error) {
    console.error('Error updating cart item:', error);
    return { success: false, error: error.message };
  }
};

// Remove item from cart
const removeFromCart = async (userId, productId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            return { success: false, error: 'User not found' };
        }
        
        const cart = userDoc.data().cart || [];
        const updatedCart = cart.filter(item => item.id !== productId);
        
        if (updatedCart.length === cart.length) {
            return { success: false, error: 'Item not found in cart' };
        }
        
        await setDoc(userRef, { cart: updatedCart }, { merge: true });
        
        // Update localStorage to keep it in sync
        if (window.firebaseAuth?.currentUser?.uid === userId) {
            localStorage.setItem('cart', JSON.stringify(updatedCart));
        }
        
        return { 
            success: true, 
            cart: updatedCart,
            message: 'Item removed from cart successfully'
        };
    } catch (error) {
        console.error('Error removing from cart:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to remove item from cart'
        };
    }
};

// Expose functions to window object
window.firebaseFunctions = window.firebaseFunctions || {};
window.firebaseFunctions.addToCart = addToCart;
window.firebaseFunctions.getCart = getCart;
window.firebaseFunctions.removeFromCart = removeFromCart;
window.firebaseFunctions.updateCartItem = updateCartItem;

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.uid);
    } else {
        // User is signed out
        console.log('User is signed out');
    }
});


// User Settings Management
const saveUserSettings = async (userId, settings) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      settings: {
        ...settings,
        lastUpdated: new Date().toISOString()
      }
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving user settings:', error);
    return { success: false, error: error.message };
  }
};

const getUserSettings = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { 
        success: true, 
        settings: userDoc.data().settings || {}
      };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user settings:', error);
    return { success: false, error: error.message };
  }
};

const updateNotificationSettings = async (userId, notificationSettings) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      settings: {
        notifications: {
          ...notificationSettings,
          lastUpdated: new Date().toISOString()
        }
      }
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return { success: false, error: error.message };
  }
};

export {
  auth,
  db,
  signUpUser,
  signInUser,
  signOutUser,
  signInWithGoogle,
  onAuthStateChangedListener,
  createUserProfile,
  updateUserProfile,
  getUserProfile,
  getCurrentUser,
  isAdmin,
  saveUserSettings,
  getUserSettings,
  updateNotificationSettings
};
