// Cart functionality
let cartCount = 0;
const cartCountElement = document.querySelector('.cart-count');
const cartIcon = document.querySelector('.cart-icon');
const menuIcon = document.querySelector('.menu-icon');
const dropdownMenu = document.querySelector('.dropdown-menu');
const header = document.querySelector('header');
const headerText = document.querySelector('.header-text');
const shopButton = document.querySelector('.shop-button');

// Close dropdown when clicking outside
const closeDropdown = (e) => {
    if (!menuIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.visibility = 'hidden';
        dropdownMenu.style.transform = 'translateY(10px)';
    }
};

// Toggle dropdown menu
const toggleDropdown = () => {
    const isVisible = dropdownMenu.style.visibility === 'visible';
    
    if (isVisible) {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.visibility = 'hidden';
        dropdownMenu.style.transform = 'translateY(10px)';
        document.removeEventListener('click', closeDropdown);
    } else {
        dropdownMenu.style.opacity = '1';
        dropdownMenu.style.visibility = 'visible';
        dropdownMenu.style.transform = 'translateY(0)';
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 0);
    }
};

// Function to show a specific main section and hide others
function showSection(sectionId) {
    // Hide all main sections
    document.querySelectorAll('main').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the requested section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Close the dropdown menu
    if (dropdownMenu) {
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.visibility = 'hidden';
        dropdownMenu.style.transform = 'translateY(10px)';
    }
    
    // If showing home, ensure it's scrolled to top
    if (sectionId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Auth modal elements
console.log('Initializing auth elements...');
const authModal = document.getElementById('auth-modal');
const loginButton = document.getElementById('login-button');
const closeModal = document.querySelector('.close-modal');
const adminLink = document.getElementById('admin-link');
const adminPanel = document.getElementById('admin-panel');
const closeAdminPanel = document.getElementById('close-admin-panel');

console.log('Auth elements:', {
    authModal,
    loginButton,
    closeModal,
    adminLink,
    adminPanel,
    closeAdminPanel
});

// Toggle auth modal
function toggleAuthModal() {
    console.log('toggleAuthModal called. Current display:', authModal.style.display);
    
    if (authModal.classList.contains('show')) {
        closeAuthModal();
    } else {
        // Show the modal
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Force reflow/repaint before adding show class
        void authModal.offsetHeight;
        
        // Add show class to trigger animation
        authModal.classList.add('show');
        console.log('Showing auth modal');
    }
}

// Toggle admin panel
function toggleAdminPanel() {
    adminPanel.classList.toggle('active');
}

// Close modal when clicking outside content or on close button
function setupModalCloseHandlers() {
    // Close when clicking outside content
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });
    
    // Close when clicking the close button
    const closeButton = document.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeAuthModal);
    }
}

// Close auth modal
function closeAuthModal() {
    if (!authModal) return;
    
    // Remove show class to trigger fade out
    authModal.classList.remove('show');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        authModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300); // Match this with the CSS transition duration
}

// Event listeners
if (loginButton) {
    console.log('Login button found, adding click handler');
    
    // Remove any existing click handlers to prevent duplicates
    const newLoginButton = loginButton.cloneNode(true);
    loginButton.parentNode.replaceChild(newLoginButton, loginButton);
    
    // Add new click handler
    newLoginButton.addEventListener('click', function(e) {
        console.log('Login button clicked');
        console.log('Auth modal element:', document.getElementById('auth-modal'));
        console.log('Auth modal display style:', window.getComputedStyle(document.getElementById('auth-modal')).display);
        
        // Check if the click is being prevented
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Calling toggleAuthModal...');
        toggleAuthModal();
        console.log('After toggleAuthModal');
    });
    
    console.log('Login button click handler added successfully');
} else {
    console.error('Login button not found in the DOM');
    console.log('Available buttons:', Array.from(document.querySelectorAll('button')).map(b => ({
        id: b.id,
        class: b.className,
        text: b.textContent.trim()
    })));
}

if (closeModal) {
    closeModal.addEventListener('click', toggleAuthModal);
}

if (adminLink) {
    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAdminPanel();
    });
}

if (closeAdminPanel) {
    closeAdminPanel.addEventListener('click', toggleAdminPanel);
}

// Close modal when clicking on links inside it
document.querySelectorAll('#auth-modal a').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.getAttribute('href') === '#') {
            e.preventDefault();
        }
    });
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Load cart count from localStorage
    const savedCartCount = localStorage.getItem('cartCount');
    if (savedCartCount !== null) {
        cartCount = parseInt(savedCartCount, 10);
    }
    updateCartCount();
    
    // Initialize header state
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState);
    
    // Add click event to shop button for smooth scrolling to products grid
    shopButton.addEventListener('click', (e) => {
        e.preventDefault();
        const productsGrid = document.querySelector('.products-grid');
        if (productsGrid) {
            // Get the current scroll position
            const currentPosition = window.pageYOffset;
            
            // Calculate the target position
            const headerHeight = header.offsetHeight;
            const gridPosition = productsGrid.getBoundingClientRect().top;
            const offsetPosition = gridPosition + currentPosition - (headerHeight + 20); // 20px additional offset
            
            // Smooth scroll to the calculated position
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            
            // Add a small timeout to ensure the scroll completes before any potential layout shifts
            setTimeout(() => {
                const finalPosition = productsGrid.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 20);
                if (Math.abs(window.pageYOffset - finalPosition) > 5) {
                    window.scrollTo({
                        top: finalPosition,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    });
    
    // Initialize menu icon click handler
    menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Set up navigation for dropdown items
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = item.querySelector('i');
            if (icon) {
                switch(icon.className) {
                    case 'fas fa-home':
                        showSection('home');
                        break;
                    case 'fas fa-user':
                        showSection('profile');
                        break;
                    case 'fas fa-box':
                        showSection('orders');
                        break;
                    case 'fas fa-heart':
                        showSection('cart');
                        break;
                    case 'fas fa-cog':
                        showSection('settings');
                        break;
                    case 'fas fa-info-circle':
                        showSection('about');
                        break;
                }
            }
            toggleDropdown();
        });
    });
    
    // Set up cart icon click
    if (cartIcon) {
        cartIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            showSection('cart');
            if (dropdownMenu.style.visibility === 'visible') {
                toggleDropdown();
            }
        });
    }
});

// Update header state based on scroll position
function updateHeaderState() {
    const scrollPosition = window.scrollY;
    const headerHeight = header.offsetHeight;
    const scrollThreshold = headerHeight * 0.5; // Start animation after scrolling 50% of header height
    const mainSections = document.querySelectorAll('main');
    const headerMargin = '400px'; // Fixed margin for all main sections
    
    if (scrollPosition > scrollThreshold) {
        // Scrolled down - hide elements and adjust header
        header.classList.add('scrolled');
        headerText.style.opacity = '0';
        headerText.style.transform = 'translateY(-20px)';
        shopButton.style.opacity = '0';
        shopButton.style.transform = 'translateX(-50%) scale(0.9) translateY(20px)';
        
        // Update margin for all main sections
        mainSections.forEach(section => {
            section.style.marginTop = headerMargin;
        });
    } else {
        // Back to top - show elements and restore header
        header.classList.remove('scrolled');
        headerText.style.opacity = '1';
        headerText.style.transform = 'translateY(0)';
        shopButton.style.opacity = '1';
        shopButton.style.transform = 'translateX(-50%) scale(1)';
        
        // Update margin for all main sections
        mainSections.forEach(section => {
            section.style.marginTop = headerMargin;
        });
    }
}

// Function to update cart count
function updateCartCount() {
    cartCountElement.textContent = cartCount;
    localStorage.setItem('cartCount', cartCount);
    
    // Add animation when cart count changes
    if (cartCount > 0) {
        cartCountElement.parentElement.classList.add('has-items');
        cartCountElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartCountElement.style.transform = 'scale(1)';
        }, 200);
    } else {
        cartCountElement.parentElement.classList.remove('has-items');
    }
}

// Add to cart function (can be called when products are added)
function addToCart() {
    cartCount++;
    updateCartCount();
}

// Initialize profile tabs functionality
function initProfileTabs() {
    const tabButtons = document.querySelectorAll('.profile-tab-button');
    const tabContents = document.querySelectorAll('.profile-tab-content');

    // Only initialize if we have tabs
    if (tabButtons.length === 0) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            if (!tabId) return;
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });
    
    // Click the first tab by default
    if (tabButtons[0]) {
        tabButtons[0].click();
    }

    // Initialize password strength indicator
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function() {
            const strengthBar = this.closest('.form-group')?.querySelector('.strength-bar');
            if (!strengthBar) return;
            
            const strengthText = this.closest('.form-group')?.querySelector('.strength-text');
            const password = this.value;
            let strength = 0;
            
            // Check password strength
            if (password.length >= 8) strength++;
            if (password.match(/[a-z]+/)) strength++;
            if (password.match(/[A-Z]+/)) strength++;
            if (password.match(/[0-9]+/)) strength++;
            if (password.match(/[!@#$%^&*(),.?":{}|<>]+/)) strength++;
            
            // Update strength bar
            const segments = strengthBar.querySelectorAll('.strength-segment');
            segments.forEach((segment, index) => {
                segment.style.backgroundColor = index < strength ? getStrengthColor(strength) : '#e0e0e0';
            });
            
            // Update strength text
            if (strengthText) {
                const strengthLabels = ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'];
                const strengthColors = ['#d32f2f', '#f57c00', '#ffa000', '#689f38', '#2e7d32'];
                strengthText.innerHTML = 'Password Strength: ';
                const span = document.createElement('span');
                span.textContent = strength > 0 ? strengthLabels[strength - 1] : 'Very Weak';
                span.style.color = strength > 0 ? strengthColors[strength - 1] : '#d32f2f';
                strengthText.appendChild(span);
            }
        });
    });

    // Address management
    const addAddressBtn = document.querySelector('.btn-add-address');
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // In a real app, this would open a modal or form to add a new address
            showToast('Add new address functionality will be implemented here');
        });
    }

    // Set Default Address
    const setDefaultBtns = document.querySelectorAll('.btn-set-default');
    setDefaultBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            // In a real app, this would make an API call to update the default address
            const addressCard = this.closest('.address-card');
            document.querySelectorAll('.address-card').forEach(card => {
                card.classList.remove('default');
            });
            addressCard.classList.add('default');
            
            // Show success message
            showToast('Default address updated successfully');
        });
    });

    // Delete account confirmation
    const deleteAccountBtn = document.querySelector('.delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    }
}

// Helper function to get password strength color
function getStrengthColor(strength) {
    const colors = ['#d32f2f', '#f57c00', '#ffa000', '#689f38', '#2e7d32'];
    return colors[strength - 1] || '#e0e0e0';
}

// Initialize cart and wishlist tabs
function initCartTabs() {
    const tabHeaders = document.querySelectorAll('#cart-header h2');
    const tabContents = document.querySelectorAll('.cart-content');
    
    tabHeaders.forEach(header => {
        header.addEventListener('click', () => {
            // Remove active class from all headers and contents
            tabHeaders.forEach(h => h.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked header and corresponding content
            header.classList.add('active');
            const tabId = header.getAttribute('data-tab');
            if (tabId) {
                const activeContent = document.getElementById(tabId);
                if (activeContent) {
                    activeContent.classList.add('active');
                }
            }
        });
    });
}

// Initialize orders functionality
function initOrders() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const orderCards = document.querySelectorAll('.order-card');
    const emptyOrders = document.querySelector('.empty-orders');
    const trackOrderBtns = document.querySelectorAll('.btn-track');
    const cancelOrderBtns = document.querySelectorAll('.btn-cancel');
    const buyAgainBtns = document.querySelectorAll('.btn-buy-again');
    const rateOrderBtns = document.querySelectorAll('.btn-rate');
    const viewDetailsBtns = document.querySelectorAll('.btn-view-details');
    
    // Filter orders
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const status = button.getAttribute('data-status');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show/hide orders based on filter
            let hasVisibleOrders = false;
            
            orderCards.forEach(card => {
                if (status === 'all' || card.querySelector('.order-status').classList.contains(status)) {
                    card.style.display = 'block';
                    hasVisibleOrders = true;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Show/hide empty state
            if (emptyOrders) {
                emptyOrders.style.display = hasVisibleOrders ? 'none' : 'flex';
            }
        });
    });
    
    // Track order button click
    trackOrderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const orderId = e.currentTarget.closest('.order-card').querySelector('.order-id').textContent;
            showToast(`Tracking order ${orderId}. This feature will be implemented soon.`);
        });
    });
    
    // Cancel order button
    cancelOrderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const orderCard = e.currentTarget.closest('.order-card');
            const orderId = orderCard.querySelector('.order-id').textContent;
            
            if (confirm(`Are you sure you want to cancel order ${orderId}?`)) {
                // In a real app, this would make an API call to cancel the order
                const statusElement = orderCard.querySelector('.order-status');
                statusElement.className = 'order-status cancelled';
                statusElement.textContent = 'Cancelled';
                
                // Disable cancel button after cancellation
                e.currentTarget.disabled = true;
                e.currentTarget.classList.add('disabled');
                
                showToast(`Order ${orderId} has been cancelled successfully.`);
            }
        });
    });
    
    // Buy again button
    buyAgainBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // In a real app, this would add all items from the order to the cart
            showToast('Items have been added to your cart');
            
            // Update cart count
            const itemsToAdd = 1; // In a real app, this would be the number of items in the order
            cartCount += itemsToAdd;
            updateCartCount();
        });
    });
    
    // Rate order button
    rateOrderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const orderId = e.currentTarget.closest('.order-card').querySelector('.order-id').textContent;
            // In a real app, this would open a rating modal
            showToast(`Rating for order ${orderId} will be implemented soon`);
        });
    });
    
    // View details button
    viewDetailsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const orderCard = e.currentTarget.closest('.order-card');
            const orderItems = orderCard.querySelector('.order-items');
            
            // Toggle order items visibility
            orderItems.style.display = orderItems.style.display === 'none' ? 'block' : 'none';
            
            // Update button text
            e.currentTarget.textContent = orderItems.style.display === 'none' ? 'View Details' : 'Hide Details';
        });
    });
    
    // Initialize order items to be hidden by default on mobile
    if (window.innerWidth < 768) {
        document.querySelectorAll('.order-items').forEach(items => {
            items.style.display = 'none';
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            document.querySelectorAll('.order-items').forEach(items => {
                items.style.display = 'block';
            });
            
            // Reset view details buttons text
            document.querySelectorAll('.btn-view-details').forEach(btn => {
                btn.textContent = 'View Details';
            });
        } else {
            document.querySelectorAll('.order-items').forEach(items => {
                items.style.display = 'none';
            });
        }
    });
    
    // Initialize order status tooltips
    initOrderStatusTooltips();
}

// Initialize tooltips for order status
function initOrderStatusTooltips() {
    const statusElements = document.querySelectorAll('.order-status');
    
    statusElements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const status = Array.from(e.target.classList).find(cls => 
                ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(cls)
            );
            
            if (!status) return;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'status-tooltip';
            tooltip.textContent = getStatusDescription(status);
            
            // Position the tooltip
            const rect = e.target.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            
            document.body.appendChild(tooltip);
            
            // Remove tooltip on mouse leave
            const removeTooltip = () => {
                if (document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                }
                e.target.removeEventListener('mouseleave', removeTooltip);
                document.removeEventListener('scroll', removeTooltip, true);
            };
            
            e.target.addEventListener('mouseleave', removeTooltip);
            document.addEventListener('scroll', removeTooltip, true);
        });
    });
}

// Get status description for tooltip
function getStatusDescription(status) {
    const descriptions = {
        'pending': 'Your order is being processed',
        'processing': 'Your order is being prepared for shipment',
        'shipped': 'Your order is on the way',
        'delivered': 'Your order has been delivered',
        'cancelled': 'This order has been cancelled'
    };
    
    return descriptions[status] || 'Status information not available';
}

// Initialize settings functionality
function initSettings() {
    // Password change modal
    const passwordModal = document.getElementById('passwordModal');
    const passwordBtns = document.querySelectorAll('.btn-edit[onclick="showPasswordModal()"]');
    const closeModal = document.querySelector('.close-modal');
    const cancelModal = document.querySelector('.btn-cancel');
    const passwordForm = document.getElementById('passwordForm');

    // Show password modal
    function showPasswordModal() {
        if (passwordModal) {
            passwordModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // Close modal functions
    function closePasswordModal() {
        if (passwordModal) {
            passwordModal.classList.remove('show');
            document.body.style.overflow = '';
            passwordForm.reset();
        }
    }

    // Event listeners for password modal
    if (passwordBtns.length) {
        passwordBtns.forEach(btn => {
            btn.addEventListener('click', showPasswordModal);
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', closePasswordModal);
    }

    if (cancelModal) {
        cancelModal.addEventListener('click', closePasswordModal);
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            closePasswordModal();
        }
    });

    // Handle password form submission
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Here you would typically validate and process the password change
            alert('Password changed successfully!');
            closePasswordModal();
        });
    }

    // Toggle switches
    const toggleSwitches = document.querySelectorAll('.switch input[type="checkbox"]');
    toggleSwitches.forEach(switchInput => {
        switchInput.addEventListener('change', function() {
            const settingName = this.closest('.settings-group')?.querySelector('label')?.textContent;
            const isChecked = this.checked;
            console.log(`${settingName} is now ${isChecked ? 'enabled' : 'disabled'}`);
            // Here you would typically save the setting to your backend
        });
    });

    // Edit buttons
    const editButtons = document.querySelectorAll('.settings-group .btn-edit:not([onclick])');
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const group = this.closest('.settings-group');
            const valueElement = group.querySelector('.settings-value');
            const label = group.querySelector('label').textContent;
            
            // Simple inline editing - in a real app, you might want a more sophisticated approach
            if (valueElement && !valueElement.querySelector('input')) {
                const currentValue = valueElement.textContent.trim();
                valueElement.innerHTML = `
                    <input type="text" value="${currentValue}" 
                           style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                `;
                
                const input = valueElement.querySelector('input');
                input.focus();
                
                const saveEdit = () => {
                    const newValue = input.value.trim();
                    if (newValue && newValue !== currentValue) {
                        valueElement.textContent = newValue;
                        // Here you would typically save the new value to your backend
                        console.log(`${label} updated to: ${newValue}`);
                    } else {
                        valueElement.textContent = currentValue;
                    }
                };
                
                input.addEventListener('blur', saveEdit);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        saveEdit();
                    }
                });
            }
        });
    });

    // Delete account confirmation
    const deleteAccountBtn = document.querySelector('.danger-zone .btn-danger');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                // Here you would typically call your API to delete the account
                alert('Your account has been scheduled for deletion.');
                // Redirect to home or login page
                // window.location.href = '/logout';
            }
        });
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        
        // Skip if targetId is just '#' or empty
        if (!targetId || targetId === '#') return;
        
        try {
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for fixed header
                    behavior: 'smooth'
                });
                
                // Update URL without adding to history
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                } else {
                    window.location.hash = targetId;
                }
            }
        } catch (error) {
            console.error('Error during smooth scroll:', error);
            // Fallback to default behavior
            window.location.href = targetId;
        }
    });
});

// Contact form submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const formObject = {};
        formData.forEach((value, key) => {
            formObject[key] = value;
        });
        
        // Here you would typically send the form data to a server
        console.log('Form submitted:', formObject);
        
        // Show success message
        alert('Thank you for your message! We will get back to you soon.');
        this.reset();
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    }
}

// Close mobile menu when clicking outside
const mobileMenu = document.querySelector('.mobile-menu');
if (mobileMenu) {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mobile-menu') && !e.target.closest('.menu-icon')) {
            mobileMenu.classList.remove('active');
        }
    });
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing components...');
    
    // Initialize all components
    initCartTabs();
    initProfileTabs();
    initOrders();
    initOrderStatusTooltips();
    initSettings();
    
    // Initialize mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Initialize cart count from localStorage
    const savedCartCount = localStorage.getItem('cartCount');
    if (savedCartCount) {
        cartCount = parseInt(savedCartCount);
        updateCartCount();
    }
    
    // Initialize auth modal and close handlers
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'none'; // Ensure it starts hidden
        authModal.classList.remove('show'); // Remove show class if present
        setupModalCloseHandlers(); // Set up close handlers
        console.log('Auth modal initialized with close handlers');
    }
    
    // Set current year for footer
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
