// Wishlist functionality
// This file handles all wishlist related functionality

document.addEventListener('DOMContentLoaded', () => {
    // Initialize wishlist event listeners
    initWishlist();
    
    // Update wishlist count on page load
    updateWishlistCount();
    
    // Initialize page based on URL
    initPage();
});

// Initialize wishlist event listeners
function initWishlist() {
    // Delegate click events for wishlist buttons
    document.addEventListener('click', handleWishlistClick);
    
    // Listen for authentication state changes
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, sync local wishlist with Firebase
                syncWishlistWithFirebase(user.uid);
            } else {
                // User is signed out, load from localStorage
                updateWishlistUI();
                
                // If on wishlist page, refresh the display
                if (window.location.hash === '#wishlist') {
                    displayWishlistItems();
                }
            }
        });
    }
}

// Handle wishlist button clicks
function handleWishlistClick(event) {
    const wishlistBtn = event.target.closest('.product-card__wishlist');
    if (!wishlistBtn) return;
    
    event.preventDefault();
    event.stopPropagation(); // Prevent any parent click handlers
    
    const productId = wishlistBtn.getAttribute('data-product-id');
    if (!productId) return;
    
    // Get product details from the card
    const productCard = wishlistBtn.closest('.product-card');
    const productName = productCard.querySelector('h3')?.textContent || 'Product';
    const productPrice = productCard.querySelector('.product-card__price')?.textContent || '';
    const productImage = productCard.querySelector('.product-card__image')?.src || '';
    
    const product = {
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage,
        addedAt: new Date().toISOString()
    };
    
    // Toggle wishlist status
    toggleWishlistItem(product, wishlistBtn);
    
    // Show the wishlist page
    showWishlistPage();
}

// Show wishlist page
async function showWishlistPage() {
    // Show cart section with wishlist tab active
    const cartSection = document.getElementById('cart');
    if (cartSection) {
        // Hide all main sections except cart
        document.querySelectorAll('main').forEach(section => {
            if (section.id !== 'cart') {
                section.classList.add('hidden');
            } else {
                section.classList.remove('hidden');
            }
        });
        
        // Activate wishlist tab
        const wishlistTab = document.querySelector('[data-tab="wishlist-tab"]');
        if (wishlistTab) {
            wishlistTab.click();
        }
    }
    
    // Update active navigation
    updateActiveNav('wishlist');
    
    // Load wishlist items
    displayWishlistItems();
}

// Update active navigation
function updateActiveNav(activeSection) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${activeSection}`);
    });
}

// Toggle item in wishlist
async function toggleWishlistItem(product, button) {
    try {
        const user = window.firebaseAuth?.currentUser;
        const isInWishlist = button?.classList.contains('active');
        
        if (isInWishlist) {
            // Remove from wishlist
            if (user) {
                const result = await window.firebaseFunctions.removeFromWishlist(user.uid, product.id);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to remove from wishlist');
                }
            } else {
                removeFromLocalWishlist(product.id);
            }
            
            button?.classList.remove('active');
            button?.setAttribute('aria-label', 'Add to wishlist');
            const tooltip = button?.querySelector('.wishlist-tooltip');
            if (tooltip) tooltip.textContent = 'Add to wishlist';
            
            showMessage('Removed from wishlist', 'success');
        } else {
            // Add to wishlist
            if (user) {
                const result = await window.firebaseFunctions.addToWishlist(user.uid, product);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to add to wishlist');
                }
            } else {
                addToLocalWishlist(product);
            }
            
            button?.classList.add('active');
            button?.setAttribute('aria-label', 'Remove from wishlist');
            const tooltip = button?.querySelector('.wishlist-tooltip');
            if (tooltip) tooltip.textContent = 'Remove from wishlist';
            
            showMessage('Added to wishlist', 'success');
        }
        
        // Update wishlist count and display
        await updateWishlistCount();
        
        // Refresh wishlist display if on wishlist page
        if (window.location.hash === '#wishlist') {
            await displayWishlistItems();
        }
        
    } catch (error) {
        console.error('Error toggling wishlist item:', error);
        showMessage(error.message || 'Failed to update wishlist. Please try again.', 'error');
    }
}

// Add item to local wishlist (for guests)
function addToLocalWishlist(product) {
    const wishlist = getLocalWishlist();
    const existingIndex = wishlist.findIndex(item => item.id === product.id);
    
    if (existingIndex === -1) {
        wishlist.push(product);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    
    return wishlist;
}

// Remove item from local wishlist (for guests)
function removeFromLocalWishlist(productId) {
    const wishlist = getLocalWishlist();
    const updatedWishlist = wishlist.filter(item => item.id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    return updatedWishlist;
}

// Get local wishlist (for guests)
function getLocalWishlist() {
    const wishlist = localStorage.getItem('wishlist');
    return wishlist ? JSON.parse(wishlist) : [];
}

// Get wishlist from Firebase or localStorage
async function getWishlist() {
    try {
        const user = window.firebaseAuth?.currentUser || null;
        
        if (user) {
            const result = await window.firebaseFunctions.getWishlist(user.uid);
            if (result?.success) {
                return result.wishlist || [];
            }
            return [];
        } else {
            // For guests, use localStorage
            return getLocalWishlist();
        }
    } catch (error) {
        console.error('Error getting wishlist:', error);
        return [];
    }
}

// Sync local wishlist with Firebase when user logs in
async function syncWishlistWithFirebase(userId) {
    const localWishlist = getLocalWishlist();
    
    if (localWishlist.length > 0) {
        try {
            // Add all local wishlist items to Firebase
            for (const item of localWishlist) {
                await window.firebaseFunctions.addToWishlist(userId, item);
            }
            
            // Clear local wishlist after successful sync
            localStorage.removeItem('wishlist');
            
            // Update UI
            updateWishlistCount();
            displayWishlistItems();
            
            console.log('Wishlist synced with Firebase');
        } catch (error) {
            console.error('Error syncing wishlist with Firebase:', error);
        }
    }
}

// Update wishlist UI elements with the current count
function updateWishlistUI(count) {
    // Update wishlist count in header
    const wishlistCountElements = document.querySelectorAll('.wishlist-count');
    wishlistCountElements.forEach(el => {
        el.textContent = count > 99 ? '99+' : count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
    
    // Update mobile menu wishlist count
    const mobileWishlistCount = document.querySelector('.wishlist-count-small');
    if (mobileWishlistCount) {
        mobileWishlistCount.textContent = count > 99 ? '99+' : count;
        mobileWishlistCount.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// Update wishlist count in the UI
async function updateWishlistCount() {
    try {
        const user = window.firebaseAuth?.currentUser;
        let count = 0;
        
        if (user) {
            // For logged-in users, get count from Firebase
            const result = await window.firebaseFunctions.getWishlist(user.uid);
            if (result?.success && Array.isArray(result.wishlist)) {
                count = result.wishlist.length;
            }
        } else {
            // For guests, get count from localStorage
            const wishlist = getLocalWishlist();
            count = wishlist.length;
        }
        
        // Update the UI with the count
        updateWishlistUI(count);
        return count;
    } catch (error) {
        console.error('Error updating wishlist count:', error);
        updateWishlistUI(0);
        return 0;
    }
}

// Create HTML element for a wishlist item
function createWishlistItemElement(product) {
    if (!product) return null;
    
    const item = document.createElement('div');
    item.className = 'wishlist-item';
    item.dataset.productId = product.id;
    
    item.innerHTML = `
        <div class="wishlist-item__image">
            <img src="${product.image || 'assets/product-placeholder.jpg'}" alt="${product.name}">
            <button class="wishlist-remove" data-product-id="${product.id}" aria-label="Remove from wishlist">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="wishlist-item__details">
            <h3 class="wishlist-item__title">${product.name}</h3>
            <div class="wishlist-item__price">
                ${product.discountedPrice ? 
                    `<span class="original-price">₹${product.price}</span>
                     <span class="discounted-price">₹${product.discountedPrice}</span>` : 
                    `<span class="regular-price">₹${product.price}</span>`
                }
            </div>
            <button class="btn btn-primary add-to-cart" data-product-id="${product.id}">
                Add to Cart
            </button>
        </div>
    `;
    
    // Add event listeners
    const removeBtn = item.querySelector('.wishlist-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = e.currentTarget.dataset.productId;
            const wishlistBtn = document.querySelector(`.product-card__wishlist[data-product-id="${productId}"]`);
            if (wishlistBtn) {
                toggleWishlistItem(product, wishlistBtn);
            }
        });
    }
    
    const addToCartBtn = item.querySelector('.add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Add to cart functionality here
            console.log('Add to cart:', product);
            // You can implement the add to cart logic here
        });
    }
    
    return item;
}

// Display wishlist items on the wishlist page
async function displayWishlistItems() {
    const wishlistGrid = document.querySelector('#wishlist-tab .wishlist-grid');
    const emptyWishlist = document.querySelector('#wishlist-tab .empty-wishlist');
    
    if (!wishlistGrid) return;
    
    try {
        // Show loading state
        wishlistGrid.innerHTML = '<div class="loading">Loading your wishlist...</div>';
        
        // Get wishlist data
        const currentWishlist = await getWishlist();
        
        // Clear container
        wishlistGrid.innerHTML = '';
        
        if (!currentWishlist || currentWishlist.length === 0) {
            // Show empty state if no items
            if (emptyWishlist) {
                emptyWishlist.style.display = 'flex';
            }
            return;
        }
        
        // Hide empty state
        if (emptyWishlist) {
            emptyWishlist.style.display = 'none';
        }
        
        // Render wishlist items
        currentWishlist.forEach(item => {
            const itemElement = createWishlistItemElement(item);
            if (itemElement) {
                wishlistGrid.appendChild(itemElement);
            }
        });
        
    } catch (error) {
        console.error('Error displaying wishlist items:', error);
        wishlistGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load wishlist. Please try again later.</p>
                <button class="btn btn-primary" onclick="displayWishlistItems()">Retry</button>
            </div>`;
        
        if (emptyWishlist) {
            emptyWishlist.style.display = 'none';
        }
    }
}

// Update wishlist buttons on the page based on current wishlist
function updateWishlistButtons(wishlist) {
    const wishlistButtons = document.querySelectorAll('.product-card__wishlist');
    
    wishlistButtons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        const isInWishlist = wishlist.some(item => item.id === productId);
        
        if (isInWishlist) {
            button.classList.add('active');
            button.setAttribute('aria-label', 'Remove from wishlist');
            const tooltip = button.querySelector('.wishlist-tooltip');
            if (tooltip) {
                tooltip.textContent = 'Remove from wishlist';
            }
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-label', 'Add to wishlist');
            const tooltip = button.querySelector('.wishlist-tooltip');
            if (tooltip) {
                tooltip.textContent = 'Add to wishlist';
            }
        }
    });
}

// Show message to user
function showMessage(message, type = 'info') {
    // You can implement a toast notification system here
    console.log(`${type}: ${message}`);
    alert(message); // Simple alert for now
}

// Initialize page based on URL hash
function initPage() {
    // Show home section by default if no hash
    if (!window.location.hash) {
        document.getElementById('home')?.classList.remove('hidden');
        updateActiveNav('home');
        return;
    }
    
    // Check if we're on the wishlist page
    const isWishlistPage = window.location.hash === '#wishlist';
    
    // Update section visibility
    document.querySelectorAll('main').forEach(section => {
        if ((isWishlistPage && section.id === 'wishlist') || 
            (!isWishlistPage && section.id === window.location.hash.substring(1))) {
            section.classList.remove('hidden');
            updateActiveNav(window.location.hash.substring(1));
        } else {
            section.classList.add('hidden');
        }
    });
    
    // Load wishlist if on wishlist page
    if (isWishlistPage) {
        displayWishlistItems();
    }
}

// Listen for hash changes to update the view
window.addEventListener('hashchange', initPage);
