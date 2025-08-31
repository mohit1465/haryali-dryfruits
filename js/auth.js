import { 
  signInWithGoogle, 
  signOutUser,
  auth,
  getUserProfile,
  createUserProfile
} from './firebase.js';

import { 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js';

import { 
  isAdmin,
  getCurrentUser
} from './firebase.js';

// DOM Elements
const authModal = document.getElementById('auth-modal');
const googleSignInBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.querySelector('.user-profile');
const loginButton = document.getElementById('login-button');
const closeModalBtn = document.querySelector('.close-modal');

// Show message function (moved to the top to avoid duplicates)

// Toggle auth modal
function toggleAuthModal(show, formType = 'login') {
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (!authModal) return;
    
    if (show) {
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Show the requested form
        if (formType === 'signup' && signupForm) {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            // Update active tab
            document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector('.auth-tabs .tab:last-child').classList.add('active');
        } else if (loginForm) {
            loginForm.style.display = 'block';
            if (signupForm) signupForm.style.display = 'none';
            // Update active tab
            document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector('.auth-tabs .tab:first-child').classList.add('active');
        }
        
        // Focus the first interactive element for better accessibility
        googleSignInBtn?.focus();
    } else {
        authModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Close auth modal
function closeAuthModal() {
    if (!authModal) return;
    
    // Remove show class to trigger fade out
    authModal.classList.remove('show');
    
    // Wait for animation to complete before hiding
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        toggleAuthModal(false);
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal.style.display === 'flex') {
        toggleAuthModal(false);
    }
});

// Handle profile login button
function handleProfileLogin() {
    toggleAuthModal(true);
}

// Initialize authentication and UI
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth state
    initAuth();
    
    // Header login button
    loginButton?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthModal(true);
    });
    
    // Profile section login button
    const profileLoginBtn = document.getElementById('profile-login-btn');
    profileLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthModal(true);
    });
    
    // Settings section login button
    const settingsLoginBtn = document.getElementById('settings-login-btn');
    settingsLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthModal(true);
    });
    
    // Sign up link in settings login prompt
    const showSignupLink = document.getElementById('show-signup');
    showSignupLink?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthModal(true, 'signup');
    });
    
    // Close modal button
    closeModalBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthModal(false);
    });
    
    // Profile logout button
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    profileLogoutBtn?.addEventListener('click', handleLogout);
    
    // Settings logout button
    const settingsLogoutBtn = document.getElementById('settings-logout-btn');
    settingsLogoutBtn?.addEventListener('click', handleLogout);
    
    // Check current page and update UI accordingly
    const currentPage = window.location.hash.substring(1) || 'home';
    const user = getCurrentUser();
    
    if (currentPage === 'profile' || currentPage === 'settings') {
        updateAuthUI(user);
    }
});

// Handle Google Sign In
googleSignInBtn?.addEventListener('click', async () => {
    if (!googleSignInBtn) {
        console.error('Google Sign-In button not found');
        return;
    }
    
    try {
        // Show loading state
        const originalText = googleSignInBtn.innerHTML;
        googleSignInBtn.disabled = true;
        googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        
        const { success, user, error } = await signInWithGoogle();
        
        if (success) {
            showMessage('Successfully signed in!', 'success');
            updateAuthUI(user);
            // Close the auth modal after successful login
            toggleAuthModal(false);
            
            // If on profile page, show the logged-in content
            if (window.location.hash === '#profile') {
                const loggedInSection = document.getElementById('profile-logged-in');
                const loggedOutSection = document.getElementById('profile-logged-out');
                if (loggedInSection) loggedInSection.style.display = 'block';
                if (loggedOutSection) loggedOutSection.style.display = 'none';
            }
        } else {
            showMessage(error || 'Failed to sign in with Google', 'error');
        }
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        showMessage('An error occurred during sign in', 'error');
    } finally {
        // Reset button state
        if (googleSignInBtn) {
            googleSignInBtn.disabled = false;
            googleSignInBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="google-logo"><span>Continue with Google</span>';
        }
    }
});

// Handle Logout
logoutBtn?.addEventListener('click', async () => {
    try {
        const { success, error } = await signOutUser();
        if (success) {
            showMessage('Successfully signed out', 'success');
            updateAuthUI(null);
        } else {
            showMessage(error || 'Failed to sign out', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('An error occurred during sign out', 'error');
    }
});

// Toggle auth modal when login button is clicked
loginButton?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthModal(true);
});

/**
 * Updates the UI based on the user's authentication state
 * @param {Object|null} user - The user object if authenticated, null otherwise
 */
async function updateAuthUI(user) {
    console.log('Updating UI for user:', user);
    
    // Update login/logout buttons
    if (loginButton) {
        loginButton.style.display = user ? 'none' : 'block';
    }
    
    if (logoutBtn) {
        logoutBtn.style.display = user ? 'block' : 'none';
    }
    
    let userProfileData = null;
    if (user) {
        // Get complete user profile
        const { success, data } = await getUserProfile(user.uid);
        if (success) {
            userProfileData = data;
            // Store user data in session for quick access
            sessionStorage.setItem('userProfile', JSON.stringify(userProfileData));
        }
    } else {
        // Clear user data from session
        sessionStorage.removeItem('userProfile');
    }
    
    // Profile section elements
    const loggedInSection = document.getElementById('profile-logged-in');
    const loggedOutSection = document.getElementById('profile-logged-out');
    const profileLoginBtn = document.getElementById('profile-login-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    
    // Settings section elements
    const settingsLoggedIn = document.getElementById('settings-logged-in');
    const settingsLoggedOut = document.getElementById('settings-logged-out');
    const settingsLoginBtn = document.getElementById('settings-login-btn');

    if (user) {
        // User is logged in
        if (loginButton) loginButton.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            const profileImg = userProfile.querySelector('img');
            const userName = userProfile.querySelector('span');
            
            const displayName = userProfileData?.['user-profile']?.displayName || user.displayName || 'User';
            const photoURL = userProfileData?.['user-profile']?.photoURL || user.photoURL;
            
            if (profileImg) {
                profileImg.src = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2e7d32&color=fff&size=150`;
                profileImg.alt = displayName;
            }
            
            if (userName) {
                userName.textContent = displayName;
            }
            
            // Update profile page if it exists
            updateProfilePage(userProfileData);
            updateSettingsPage(userProfileData);
        }
        
        // Update settings section for logged-in user
        if (settingsLoggedIn) {
            settingsLoggedIn.style.display = 'block';
            document.getElementById('settings-fullname').textContent = user.displayName || 'User';
            document.getElementById('settings-email').textContent = user.email || 'No email provided';
            
            if (user.metadata && user.metadata.creationTime) {
                const createdAt = new Date(user.metadata.creationTime);
                document.getElementById('settings-created').textContent = createdAt.toLocaleDateString();
            }
        }
        if (settingsLoggedOut) settingsLoggedOut.style.display = 'none';

        // Update profile section
        if (loggedInSection) {
            loggedInSection.style.display = 'block';
            
            // Set user data
            document.getElementById('profile-avatar').src = user.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=2e7d32&color=fff&size=150`;
            document.getElementById('profile-name').textContent = user.displayName || 'User';
            document.getElementById('profile-email').textContent = user.email || 'No email provided';
            
            // Set account creation and last login times
            const metadata = user.metadata;
            if (metadata) {
                const createdAt = metadata.creationTime ? new Date(metadata.creationTime) : new Date();
                const lastLogin = metadata.lastSignInTime ? new Date(metadata.lastSignInTime) : new Date();
                
                document.getElementById('profile-created').textContent = createdAt.toLocaleDateString();
                document.getElementById('profile-last-login').textContent = lastLogin.toLocaleString();
            }
        }
        // Ensure logged out section is hidden when user is logged in
        if (loggedOutSection) loggedOutSection.style.display = 'none';
    } else {
        // User is logged out
        if (loginButton) loginButton.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
        if (loggedInSection) loggedInSection.style.display = 'none';
        if (loggedOutSection) loggedOutSection.style.display = 'flex';
        
        // Update settings section for logged-out user
        if (settingsLoggedIn) settingsLoggedIn.style.display = 'none';
        if (settingsLoggedOut) settingsLoggedOut.style.display = 'flex';
    }
}

/**
 * Checks if the current user is an admin and updates the UI accordingly
 * @param {string} userId - The ID of the current user
 */
async function checkAdminStatus(userId) {
    const adminLink = document.getElementById('admin-link');
    const adminPanel = document.getElementById('admin-panel');
    
    if (!adminLink || !adminPanel) return;
    
    try {
        const isUserAdmin = await isAdmin(userId);
        adminLink.style.display = isUserAdmin ? 'block' : 'none';
        
        // If admin panel is open and user is no longer admin, close it
        if (!isUserAdmin && !adminPanel.classList.contains('hidden')) {
            adminPanel.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// Logout function
async function handleLogout() {
    try {
        // Immediately update UI optimistically
        const loginButton = document.getElementById('login-button');
        const userProfile = document.querySelector('.user-profile');
        
        if (loginButton) loginButton.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
        
        // Show logging out state
        const logoutBtn = document.getElementById('profile-logout-btn');
        if (logoutBtn) {
            const originalText = logoutBtn.innerHTML;
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing out...';
            
            try {
                const { success, error } = await signOutUser();
                if (success) {
                    showMessage('Successfully signed out', 'success');
                    updateAuthUI(null);
                    
                    // If on profile page, show login prompt
                    if (window.location.hash === '#profile') {
                        const loggedInSection = document.getElementById('profile-logged-in');
                        const loggedOutSection = document.getElementById('profile-logged-out');
                        if (loggedInSection) loggedInSection.style.display = 'none';
                        if (loggedOutSection) loggedOutSection.style.display = 'flex';
                    }
                } else {
                    showMessage(error || 'Failed to sign out', 'error');
                    // Revert UI if logout failed
                    if (loginButton) loginButton.style.display = 'none';
                    if (userProfile) userProfile.style.display = 'flex';
                }
            } finally {
                // Reset button state
                if (logoutBtn) {
                    logoutBtn.disabled = false;
                    logoutBtn.innerHTML = originalText;
                }
            }
        }
    } catch (error) {
        console.error('Logout Error:', error);
        showMessage('An error occurred during sign out', 'error');
    }
}

// Add click event for logout button
logoutBtn?.addEventListener('click', handleLogout);

// Show message to user
function showMessage(message, type = 'info') {
  // Remove any existing messages first
  const existingMessages = document.querySelectorAll('.auth-message');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new message element
  const messageEl = document.createElement('div');
  messageEl.className = `auth-message ${type}`;
  messageEl.textContent = message;
  
  // Add to modal content if available, otherwise to body
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.insertBefore(messageEl, modalContent.firstChild);
  } else {
    document.body.appendChild(messageEl);
  }
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.style.opacity = '0';
    setTimeout(() => {
      messageEl.remove();
    }, 300);
  }, 5000);
  
  return messageEl;
}

// Add styles for the message
const style = document.createElement('style');
style.textContent = `
  .auth-message {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 2000;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .auth-message.success {
    background-color: #4CAF50;
    opacity: 1;
  }
  
  .auth-message.error {
    background-color: #F44336;
    opacity: 1;
  }
  
  .auth-message.info {
    background-color: #2196F3;
    opacity: 1;
  }
`;
document.head.appendChild(style);

// Update profile page with user data
function updateProfilePage(userData) {
  if (!userData) return;
  
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileCreated = document.getElementById('profile-created');
  const profileLastLogin = document.getElementById('profile-last-login');
  
  if (profileName) profileName.textContent = userData['user-profile']?.username || 'User';
  if (profileEmail) profileEmail.textContent = userData['user-profile']?.email || '';
  if (profileAvatar) {
    profileAvatar.src = userData['user-profile']?.photoURL || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(userData['user-profile']?.username || 'User')}&background=2e7d32&color=fff&size=150`;
  }
  if (profileCreated && userData['user-profile']?.createdAt) {
    profileCreated.textContent = new Date(userData['user-profile'].createdAt).toLocaleDateString();
  }
  if (profileLastLogin && userData['user-profile']?.lastLogin) {
    profileLastLogin.textContent = new Date(userData['user-profile'].lastLogin).toLocaleString();
  }
}

// Update settings page with user data
function updateSettingsPage(userData) {
  if (!userData) return;
  
  const settingsFullname = document.getElementById('settings-fullname');
  const settingsEmail = document.getElementById('settings-email');
  const settingsCreated = document.getElementById('settings-created');
  
  if (settingsFullname) settingsFullname.textContent = userData['user-profile']?.username || 'User';
  if (settingsEmail) settingsEmail.textContent = userData['user-profile']?.email || '';
  if (settingsCreated && userData['user-profile']?.createdAt) {
    settingsCreated.textContent = new Date(userData['user-profile'].createdAt).toLocaleDateString();
  }
}

// Initialize auth state listener
function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        try {
            if (user) {
                // Get user profile data
                const { success, data: userData } = await getUserProfile(user.uid);
                
                if (success) {
                    // Update UI with complete user data
                    updateAuthUI({
                        uid: user.uid,
                        displayName: user.displayName || userData?.['user-profile']?.username || 'User',
                        email: user.email,
                        photoURL: user.photoURL || userData?.['user-profile']?.photoURL,
                        emailVerified: user.emailVerified,
                        metadata: {
                            creationTime: user.metadata.creationTime,
                            lastSignInTime: user.metadata.lastSignInTime
                        },
                        userData: userData // Include full user data
                    });
                    
                    // Update settings section if on settings page
                    if (window.location.hash === '#settings') {
                        updateSettingsPage(userData);
                    }
                } else {
                    // If no profile exists, create one
                    await createUserProfile(user.uid, {
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        emailVerified: user.emailVerified
                    });
                    
                    // Refresh the page to show updated data
                    const currentPage = window.location.hash.substring(1) || 'home';
                    if (currentPage === 'settings' || currentPage === 'profile') {
                        window.location.reload();
                    }
                }
                
                // Close any open auth modal after successful login
                toggleAuthModal(false);
                
            } else {
                // User is signed out
                console.log('No user is signed in');
                updateAuthUI(null);
                
                // If on a protected page, redirect to home
                const currentPage = window.location.hash.substring(1);
                const protectedPages = ['profile', 'settings', 'orders'];
                if (protectedPages.includes(currentPage)) {
                    window.location.hash = 'home';
                }
            }
        } catch (error) {
            console.error('Error in auth state change:', error);
            showMessage('Error loading user data', 'error');
        }
    }, (error) => {
        console.error('Auth state change error:', error);
        showMessage('Error checking authentication status', 'error');
    });
}

// Add click handler for the admin panel close button
document.getElementById('close-admin-panel')?.addEventListener('click', () => {
  document.getElementById('admin-panel').style.display = 'none';
});

// Add click handler for the admin link
document.getElementById('admin-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('admin-panel').style.display = 'block';
});

// Initialize auth when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing auth...');
    initAuth();
  });
} else {
  // DOM already loaded, initialize immediately
  console.log('DOM already loaded, initializing auth immediately...');
  initAuth();
}
