import { 
  getCurrentUser, 
  saveUserSettings, 
  getUserSettings,
  updateNotificationSettings,
  onAuthStateChangedListener
} from './firebase.js';

// Initialize settings when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

// Initialize settings functionality
async function initSettings() {
    const user = getCurrentUser();
    if (!user) return;

    // Load user settings
    await loadUserSettings(user.uid);
    
    // Set up event listeners
    setupEventListeners(user.uid);
}

// Load user settings from Firebase
async function loadUserSettings(userId) {
    try {
        const { success, settings } = await getUserSettings(userId);
        
        if (success) {
            // Update UI with loaded settings
            updateSettingsUI(settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Update the UI with user settings
function updateSettingsUI(settings) {
    if (!settings) return;

    // Update account settings
    if (settings.profile) {
        const { fullName, email } = settings.profile;
        if (fullName) document.getElementById('settings-fullname').textContent = fullName;
        if (email) document.getElementById('settings-email').textContent = email;
    }

    // Update notification settings
    if (settings.notifications) {
        const { emailNotifications, pushNotifications } = settings.notifications;
        
        const emailToggle = document.querySelector('input[name="email-notifications"]');
        const pushToggle = document.querySelector('input[name="push-notifications"]');
        
        if (emailToggle) emailToggle.checked = emailNotifications !== false; // Default to true if not set
        if (pushToggle) pushToggle.checked = pushNotifications !== false; // Default to true if not set
    }
}

// Set up event listeners for settings changes
function setupEventListeners(userId) {
    // Account settings form
    const accountForm = document.getElementById('account-settings-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('edit-fullname')?.value;
            const email = document.getElementById('edit-email')?.value;
            
            const settings = {
                profile: {
                    fullName,
                    email,
                    lastUpdated: new Date().toISOString()
                }
            };
            
            const { success, error } = await saveUserSettings(userId, settings);
            
            if (success) {
                alert('Account settings saved successfully!');
                location.reload(); // Refresh to show updated settings
            } else {
                alert(`Error saving settings: ${error}`);
            }
        });
    }
    
    // Notification toggles
    const notificationToggles = document.querySelectorAll('.notification-toggle');
    notificationToggles.forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const settings = {
                emailNotifications: document.querySelector('input[name="email-notifications"]').checked,
                pushNotifications: document.querySelector('input[name="push-notifications"]').checked
            };
            
            const { success, error } = await updateNotificationSettings(userId, settings);
            
            if (!success) {
                console.error('Error updating notification settings:', error);
                // Revert the toggle if update fails
                e.target.checked = !e.target.checked;
            }
        });
    });
}

// Toggle edit mode for account settings
function toggleEditMode(field) {
    const valueElement = document.getElementById(`settings-${field}`);
    const editInput = document.getElementById(`edit-${field}`);
    const editButton = document.querySelector(`button[onclick="editField('${field}')"]`);
    
    if (!valueElement || !editInput) return;
    
    if (valueElement.style.display !== 'none') {
        // Switch to edit mode
        valueElement.style.display = 'none';
        editInput.style.display = 'inline-block';
        editInput.value = valueElement.textContent.trim();
        editInput.focus();
        if (editButton) editButton.textContent = 'Save';
    } else {
        // Save changes
        valueElement.textContent = editInput.value;
        valueElement.style.display = 'inline-block';
        editInput.style.display = 'none';
        if (editButton) editButton.textContent = 'Edit';
        
        // Trigger form submission if in a form
        const form = editInput.closest('form');
        if (form) form.dispatchEvent(new Event('submit'));
    }
}

// Make the function available globally
window.editField = toggleEditMode;

// Listen for auth state changes to update settings
onAuthStateChangedListener((user) => {
    if (user) {
        loadUserSettings(user.uid);
    } else {
        // Clear settings if user logs out
        updateSettingsUI({});
    }
});
