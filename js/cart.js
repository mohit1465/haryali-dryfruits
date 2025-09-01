// Using global firebaseAuth instance from firebase.js
// Wait for firebaseAuth to be available
const waitForFirebaseAuth = async () => {
    return new Promise((resolve) => {
        if (window.firebaseAuth) {
            resolve(window.firebaseAuth);
        } else {
            const checkAuth = setInterval(() => {
                if (window.firebaseAuth) {
                    clearInterval(checkAuth);
                    resolve(window.firebaseAuth);
                }
            }, 100);
        }
    });
};

// Cart functionality
let cartCount = 0;
const cartCountElement = document.querySelector('.cart-count');

window.removeFromCart = async (productId) => {
    try {
        const currentUser = window.firebaseAuth?.currentUser;
        console.log('Removing product with ID:', productId);
        
        // Immediately remove the item from the UI for better UX
        const cartItemElement = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
        if (cartItemElement) {
            cartItemElement.style.opacity = '0.5';
            cartItemElement.style.pointerEvents = 'none';
            cartItemElement.querySelector('.remove-item').textContent = 'Removing...';
        }
        
        if (currentUser) {
            // For logged-in users, remove from Firebase
            try {
                // First, get the current cart to find the exact item
                const cartResult = await window.firebaseFunctions.getCart(currentUser.uid);
                if (!cartResult?.success) {
                    throw new Error('Failed to fetch cart');
                }
                
                const cart = cartResult.cart || [];
                console.log('Current cart items:', cart);
                
                // Find item by ID or name (for backward compatibility)
                const itemToRemove = cart.find(item => 
                    (item.id && item.id.toString() === productId.toString()) ||
                    (item.name && item.name === productId)
                );
                
                if (!itemToRemove) {
                    // If we couldn't find the item, refresh the cart to sync
                    if (cartItemElement) {
                        cartItemElement.remove();
                    }
                    throw new Error('Item not found in cart');
                }
                
                console.log('Found item to remove:', itemToRemove);
                
                // Now proceed with removal using the exact ID from the found item
                const result = await window.firebaseFunctions.removeFromCart(
                    currentUser.uid, 
                    itemToRemove.id || productId
                );
                
                if (result && result.success) {
                    // Update local storage to match Firebase
                    localStorage.setItem('cart', JSON.stringify(result.cart || []));
                    
                    // Remove the item from the UI immediately
                    if (cartItemElement) {
                        cartItemElement.remove();
                    }
                    
                    // Check if cart is now empty
                    if (result.cart && result.cart.length === 0) {
                        // Show empty cart message immediately
                        const emptyCart = document.querySelector('.empty-cart');
                        const cartContainer = document.querySelector('.cart-items');
                        const cartSummary = document.querySelector('.cart-summary');
                        const checkoutButton = document.querySelector('.btn-checkout');
                        
                        if (emptyCart) emptyCart.style.display = 'flex';
                        if (cartSummary) cartSummary.style.display = 'none';
                        if (checkoutButton) checkoutButton.disabled = true;
                        
                        // Clear any remaining items and show empty cart message
                        if (cartContainer) {
                            const emptyCartMessage = cartContainer.querySelector('.empty-cart') || document.createElement('div');
                            if (!emptyCartMessage.classList.contains('empty-cart')) {
                                emptyCartMessage.className = 'empty-cart';
                                emptyCartMessage.innerHTML = `
                                    <i class="fas fa-shopping-cart"></i>
                                    <h3>Your cart is empty</h3>
                                    <p>Looks like you haven't added anything to your cart yet</p>
                                    <button class="btn-primary" onclick="showSection('home')">Continue Shopping</button>
                                `;
                                cartContainer.appendChild(emptyCartMessage);
                            }
                            emptyCartMessage.style.display = 'flex';
                        }
                    }
                    
                    // Update the cart count
                    await updateCartCount();
                    
                    // Show success message
                    showMessage('Product removed from cart', 'success');
                    return;
                }
                
                throw new Error(result?.error || 'Failed to remove from cart');
                
            } catch (error) {
                console.error('Error in removeFromCart:', error);
                
                // If we're here, there was an error with Firebase - try to sync
                try {
                    const syncResult = await window.firebaseFunctions.getCart(currentUser.uid);
                    if (syncResult?.success) {
                        localStorage.setItem('cart', JSON.stringify(syncResult.cart || []));
                        await updateCartCount();
                        await displayCartItems();
                    }
                } catch (syncError) {
                    console.error('Error syncing cart:', syncError);
                }
                
                throw error; // Re-throw to be caught by the outer catch
            }
        } else {
            // For guests, use localStorage
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            console.log('Guest cart items:', cart);
            
            // Find item by ID or name (for backward compatibility)
            const itemToRemove = cart.find(item => 
                (item.id && item.id.toString() === productId.toString()) ||
                (item.name && item.name === productId)
            );
            
            if (!itemToRemove) {
                // If we couldn't find the item, remove its element if it exists
                if (cartItemElement) {
                    cartItemElement.remove();
                }
                throw new Error('Item not found in cart');
            }
            
            console.log('Found guest item to remove:', itemToRemove);
            
            // Remove using the exact ID from the found item
            const updatedCart = cart.filter(item => 
                item.id !== (itemToRemove.id || productId) && 
                item.name !== (itemToRemove.name || productId)
            );
            
            localStorage.setItem('cart', JSON.stringify(updatedCart));
            
            // Remove the item from the UI immediately
            if (cartItemElement) {
                cartItemElement.remove();
            }
            
            // Check if cart is now empty
            if (updatedCart.length === 0) {
                // Show empty cart message immediately
                const emptyCart = document.querySelector('.empty-cart');
                const cartContainer = document.querySelector('.cart-items');
                const cartSummary = document.querySelector('.cart-summary');
                const checkoutButton = document.querySelector('.btn-checkout');
                
                if (emptyCart) emptyCart.style.display = 'flex';
                if (cartSummary) cartSummary.style.display = 'none';
                if (checkoutButton) checkoutButton.disabled = true;
                
                // Clear any remaining items and show empty cart message
                if (cartContainer) {
                    const emptyCartMessage = cartContainer.querySelector('.empty-cart') || document.createElement('div');
                    if (!emptyCartMessage.classList.contains('empty-cart')) {
                        emptyCartMessage.className = 'empty-cart';
                        emptyCartMessage.innerHTML = `
                            <i class="fas fa-shopping-cart"></i>
                            <h3>Your cart is empty</h3>
                            <p>Looks like you haven't added anything to your cart yet</p>
                            <button class="btn-primary" onclick="showSection('home')">Continue Shopping</button>
                        `;
                        cartContainer.appendChild(emptyCartMessage);
                    }
                    emptyCartMessage.style.display = 'flex';
                }
            }
            
            // Update the cart count
            await updateCartCount();
            
            showMessage(`${itemToRemove.name || 'Item'} removed from cart`, 'success');
        }
    } catch (error) {
        console.error('Error in removeFromCart:', error);
        showMessage(error.message || 'Failed to remove item from cart', 'error');
    }
};

// Function to switch between cart tabs
function setupCartTabs() {
    const tabHeaders = document.querySelectorAll('.section-header h2');
    const tabContents = document.querySelectorAll('.cart-content');
    
    // Set initial active tab based on URL hash
    const initialTab = window.location.hash === '#wishlist' ? 'wishlist-content' : 'shopping-cart';
    showTab(initialTab);
    
    // Handle browser back/forward button
    window.addEventListener('popstate', () => {
        const tabId = window.location.hash === '#wishlist' ? 'wishlist-content' : 'shopping-cart';
        showTab(tabId);
    });
    
    // Add click event listeners to tab headers
    tabHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const tabId = header.getAttribute('data-tab');
            showTab(tabId);
            
            // Update URL hash
            const newHash = tabId === 'wishlist-content' ? '#wishlist' : '#cart';
            if (window.location.hash !== newHash) {
                window.history.pushState(null, null, newHash);
            }
        });
    });
    
    // Show the specified tab
    function showTab(tabId) {
        if (!tabId) return;
        
        // Update tab headers
        tabHeaders.forEach(header => {
            if (header.getAttribute('data-tab') === tabId) {
                header.classList.add('active');
            } else {
                header.classList.remove('active');
            }
        });
        
        // Show corresponding tab content
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
                
                // If showing wishlist, refresh the items
                if (tabId === 'wishlist-content' && typeof displayWishlistItems === 'function') {
                    displayWishlistItems();
                }
                
                // If showing shopping cart, refresh the items
                if (tabId === 'shopping-cart') {
                    displayCartItems();
                }
            } else {
                content.classList.remove('active');
            }
        });
        
        // Update the cart summary visibility
        updateCartSummaryVisibility(tabId);
    }
    
    // Update cart summary visibility based on active tab
    function updateCartSummaryVisibility(activeTabId) {
        const cartSummary = document.querySelector('.cart-summary');
        if (!cartSummary) return;
        
        if (activeTabId === 'wishlist-content') {
            cartSummary.style.display = 'none';
        } else {
            cartSummary.style.display = 'block';
        }
    }
    
    // Expose showTab function globally
    window.showTab = showTab;
}

// Function to show cart with specific tab
function showCart(tab = 'shopping-cart') {
    // Show the cart main element
    document.querySelectorAll('main').forEach(main => main.classList.add('hidden'));
    document.getElementById('cart').classList.remove('hidden');
    
    // Show the selected tab
    showTab(tab);
}

// Initialize cart
document.addEventListener('DOMContentLoaded', async () => {
    await updateCartCount();
    setupAddToCartButtons();
    
    // Add click handler for cart icon
    document.querySelector('.cart-icon').addEventListener('click', (e) => {
        e.preventDefault();
        showCart('shopping-cart');
    });
    
    // Add click handler for wishlist link in dropdown
    document.querySelector('.dropdown-item[href="#cart"]').addEventListener('click', (e) => {
        e.preventDefault();
        showCart('wishlist-content');
    });
    setupCartTabs();
    
    // Set up event delegation for cart interactions
    document.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.remove-item');
        
        // Prevent form submission when clicking remove button
        if (e.target.closest('form') && removeBtn) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        try {
            // Handle remove item
            if (removeBtn) {
                e.preventDefault();
                const productId = removeBtn.dataset.productId;
                console.log('Remove button clicked for product ID:', productId);
                
                if (productId) {
                    try {
                        await removeFromCart(productId);
                    } catch (error) {
                        console.error('Error in remove button handler:', error);
                        showMessage('Failed to remove item. Please try again.', 'error');
                    }
                } else {
                    console.error('No product ID found for remove button');
                    showMessage('Error: Could not identify product to remove', 'error');
                }
            }
        } catch (error) {
            console.error('Error in cart interaction:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
    
    // Set up mutation observer to detect when cart section becomes visible
    const cartSection = document.getElementById('cart');
    if (cartSection) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (!cartSection.classList.contains('hidden')) {
                        displayCartItems();
                    }
                }
            });
        });
        
        observer.observe(cartSection, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    // Also update cart when hash changes (for navigation)
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#cart') {
            displayCartItems();
        }
    });
});

// Listen for hash changes to update cart when navigating to cart
window.addEventListener('hashchange', async () => {
    if (window.location.hash === '#cart') {
        await displayCartItems();
    }
});

// Setup event listeners for all Add to Cart buttons
function setupAddToCartButtons() {
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.product-card__add-to-cart')) {
            e.preventDefault();
            const button = e.target.closest('.product-card__add-to-cart');
            await addProductToCart(button);
        }
    });
}

// Add product to cart
async function addProductToCart(button) {
    console.log('addProductToCart called');
    try {
        const productCard = button.closest('.product-card');
        const currentUser = window.firebaseAuth?.currentUser;
        
        const product = {
            id: productCard.dataset.productId || Date.now().toString(),
            name: productCard.querySelector('h3').textContent.trim(),
            addedAt: new Date().toISOString()
        };

        if (currentUser) {
            // For logged-in users, add to Firebase
            try {
                const result = await window.firebaseFunctions.addToCart(currentUser.uid, product);
                if (result && result.success) {
                    showMessage('Product added to cart!', 'success');
                    await updateCartCount();
                    await displayCartItems();
                } else {
                    throw new Error('Failed to add to cart');
                }
            } catch (error) {
                console.error('Error adding to Firebase cart:', error);
                showMessage('Failed to add to cart. Please try again.', 'error');
            }
        } else {
            // For guests, use localStorage
            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            
            // Check if product already exists in cart
            const existingItemIndex = cart.findIndex(item => item.id === product.id);
            
            if (existingItemIndex !== -1) {
                // If item exists, remove it (we don't want duplicates)
                cart.splice(existingItemIndex, 1);
            }
            
            // Add the product to cart
            cart.push({
                ...product,
                totalPrice: product.price // Set total price same as price since quantity is always 1
            });
            
            localStorage.setItem('cart', JSON.stringify(cart));
            await updateCartCount();
            await displayCartItems();
            return cart;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage('Failed to add product to cart. Please try again.', 'error');
    }
}

// Helper function to get product details by name
function getProductDetails(productName) {
    const productCards = document.querySelectorAll('.product-card');
    for (const card of productCards) {
        const name = card.querySelector('h3')?.textContent.trim();
        if (name === productName) {
            const priceText = card.querySelector('.product-card__price')?.textContent || '';
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            const image = card.querySelector('img')?.src || '';
            const category = card.querySelector('.product-card__category')?.textContent || 'Uncategorized';
            const id = card.dataset.productId || Date.now().toString();
            
            return {
                id,
                name,
                price,
                image,
                category
            };
        }
    }
    return null;
}

// Display cart items in the UI
async function displayCartItems() {
    const cartContainer = document.querySelector('.cart-items');
    const emptyCart = document.querySelector('.empty-cart');
    const subtotalElement = document.querySelector('.subtotal-amount');
    const totalElement = document.querySelector('.total-amount');
    const totalItemsElement = document.querySelector('.total-items');
    const shippingElement = document.querySelector('.shipping');
    
    if (!cartContainer) return;

    let cart = [];
    const currentUser = window.firebaseAuth?.currentUser;
    
    try {
        if (currentUser) {
            // For logged-in users, get cart from Firebase
            const result = await window.firebaseFunctions.getCart(currentUser.uid);
            if (result && result.success) {
                cart = result.cart || [];
                // Keep localStorage in sync for offline access
                localStorage.setItem('cart', JSON.stringify(cart));
            }
        } else {
            // For guests, use localStorage
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
        }
    } catch (error) {
        console.error('Error fetching cart:', error);
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    }
    
    let subtotal = 0;
    
    // Update UI based on cart content
    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'flex';
        if (subtotalElement) subtotalElement.textContent = '₹0.00';
        if (totalElement) totalElement.textContent = '₹0.00';
        if (totalItemsElement) totalItemsElement.textContent = '0';
        return;
    }
    
    // Hide empty cart message
    if (emptyCart) emptyCart.style.display = 'none';

    // Generate cart items HTML
    const itemsHtml = await Promise.all(cart.map(async (item) => {
        // First try to get details from the product catalog
        let productDetails = getProductDetails(item.name);
        
        // If not found in catalog, use the item data directly
        if (!productDetails) {
            productDetails = {
                id: item.id || Date.now().toString(),
                name: item.name,
                price: item.price || 0,
                image: item.image || '',
                category: item.category || 'Unavailable'
            };
        }
        
        // Ensure we're using the ID from the cart item if it exists
        const productId = item.id || productDetails.id;
        const price = productDetails.price;
        const quantity = item.quantity || 1;
        const itemTotal = (price * quantity).toFixed(2);
        
        subtotal += price * quantity;
        
        return `
            <div class="cart-item" data-product-id="${productId}">
                ${productDetails.image ? `
                <div class="cart-item-image">
                    <img src="${productDetails.image}" alt="${productDetails.name}">
                </div>` : ''}
                <div class="cart-item-details">
                    <h4>${productDetails.name}</h4>
                    ${price > 0 ? `<p class="price">₹${price.toFixed(2)}</p>` : ''}
                    
                    <p class="item-price">₹${price.toFixed(2)}</p>
                    <button class="remove-item" data-product-id="${productId}">Remove</button>
                </div>
            </div>
        `;
    }));

    // Total items is just the number of items in cart
    const totalItems = cart.length;
    
    // Calculate shipping (example: free shipping over ₹1000)
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal + shipping;

    // Update the cart container
    cartContainer.innerHTML = itemsHtml.join('');
    
    // Generate subtotal text
    let subtotalText = cart.map(item => {
        const productDetails = getProductDetails(item.name) || item;
        const price = productDetails.price || 0;
        return `₹${price.toFixed(2)}`;
    }).join(' + ');
    
    // Update order summary with detailed calculation
    if (totalItemsElement) totalItemsElement.textContent = totalItems;
    if (subtotalElement) {
        subtotalElement.innerHTML = `${subtotalText}<br><span class="subtotal-amount">Subtotal: ₹${subtotal.toFixed(2)}</span>`;
    }
    if (shippingElement) {
        shippingElement.textContent = shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`;
        const shippingNote = shippingElement.nextElementSibling;
        if (shippingNote) {
            shippingNote.textContent = shipping === 0 ? '' : '(Free shipping on orders over ₹1000)';
        }
    }
    if (totalElement) totalElement.textContent = `₹${total.toFixed(2)}`;
}

// Update cart count in the UI and handle empty cart state
async function updateCartCount() {
    try {
        const currentUser = window.firebaseAuth?.currentUser;
        let cart = [];
        
        if (currentUser) {
            // For logged-in users, get cart from Firebase
            const result = await window.firebaseFunctions.getCart(currentUser.uid);
            if (result?.success) {
                cart = result.cart || [];
                // Keep localStorage in sync for offline access
                localStorage.setItem('cart', JSON.stringify(cart));
            }
        } else {
            // For guests, use localStorage
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
        }
        
        // Update cart count - each item counts as 1
        cartCount = cart.length;
        
        // Update cart count in the UI
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? 'flex' : 'none';
        }
        
        // Update cart count in the mobile menu if it exists
        const mobileCartCount = document.querySelector('.mobile-menu .cart-count');
        if (mobileCartCount) {
            mobileCartCount.textContent = cartCount;
            mobileCartCount.style.display = cartCount > 0 ? 'flex' : 'none';
        }
        
        // Handle empty cart state
        const emptyCart = document.querySelector('.empty-cart');
        const cartContainer = document.querySelector('.cart-items');
        const cartSummary = document.querySelector('.cart-summary');
        const checkoutButton = document.querySelector('.btn-checkout');
        
        if (cartCount === 0) {
            // Show empty cart message
            if (emptyCart) emptyCart.style.display = 'flex';
            
            // Clear cart items container but keep the empty cart message
            if (cartContainer) {
                const emptyCartMessage = cartContainer.querySelector('.empty-cart');
                cartContainer.innerHTML = '';
                if (emptyCartMessage) {
                    cartContainer.appendChild(emptyCartMessage);
                }
            }
            
            // Hide cart summary and disable checkout
            if (cartSummary) cartSummary.style.display = 'none';
            if (checkoutButton) checkoutButton.disabled = true;
            
            // Update totals to zero
            const subtotalElement = document.querySelector('.subtotal-amount');
            const totalElement = document.querySelector('.total-amount');
            const totalItemsElement = document.querySelector('.total-items');
            
            if (subtotalElement) subtotalElement.textContent = '₹0.00';
            if (totalElement) totalElement.textContent = '₹0.00';
            if (totalItemsElement) totalItemsElement.textContent = '0';
        } else {
            // Hide empty cart message and show cart summary
            if (emptyCart) emptyCart.style.display = 'none';
            if (cartSummary) cartSummary.style.display = 'block';
            if (checkoutButton) checkoutButton.disabled = false;
        }
        
        return { success: true, count: cartCount, isEmpty: cartCount === 0 };
    } catch (error) {
        console.error('Error updating cart count:', error);
        return { success: false, error: error.message };
    }
}

// Handle checkout
window.checkout = async () => {
    const currentUser = window.firebaseAuth?.currentUser;
    
    if (!currentUser) {
        // Redirect to login if not logged in
        window.location.href = 'login.html?redirect=checkout.html';
        return;
    }
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        showMessage('Your cart is empty', 'warning');
        return;
    }
    
    try {
        // Sync local cart with Firebase
        const result = await window.firebaseFunctions.syncCart(currentUser.uid, cart);
        
        if (result && result.success) {
            // Clear local cart after successful sync
            localStorage.removeItem('cart');
            await updateCartCount();
            
            // Here you would typically process the order
            // For now, just show success message
            showMessage('Order placed successfully!', 'success');
            
            // Redirect to order confirmation or home page
            setTimeout(() => {
                window.location.href = 'index.html#order-confirmation';
            }, 1500);
        } else {
            throw new Error('Failed to sync cart with server');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showMessage('Failed to process your order. Please try again.', 'error');
    }
};

// Show message to user
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('show');
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }, 100);
}

// Export functions for use in other files
window.cartFunctions = {
    updateCartCount,
    getCart: async () => {
        try {
            const auth = window.firebase?.auth?.() || { currentUser: null };
            const user = auth.currentUser;
            if (!user) {
                return { success: true, cart: JSON.parse(localStorage.getItem('cart') || '[]') };
            }
            const result = await window.firebaseFunctions.getCart(user.uid);
            return result;
        } catch (error) {
            console.error('Error getting cart:', error);
            return { success: false, error: 'Failed to load cart' };
        }
    },
    updateCartItem: async (productId, updates) => {
        try {
            const auth = window.firebase?.auth?.() || { currentUser: null };
            const user = auth.currentUser;
            
            if (!user) {
                let cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const itemIndex = cart.findIndex(item => item.id === productId);
                
                if (itemIndex !== -1) {
                    // Update the item with new quantity
                    const updatedItem = { ...cart[itemIndex], ...updates };
                    
                    // If quantity is 0 or less, remove the item
                    if (updatedItem.quantity <= 0) {
                        cart = cart.filter((_, index) => index !== itemIndex);
                    } else {
                        cart[itemIndex] = updatedItem;
                    }
                    
                    // Save back to localStorage
                    localStorage.setItem('cart', JSON.stringify(cart));
                    return { success: true };
                }
                return { success: false, error: 'Product not found in cart' };
            }
            return await window.firebaseFunctions.updateCartItem(user.uid, productId, updates);
        } catch (error) {
            console.error('Error updating cart item:', error);
            return { success: false, error: error.message };
        }
    }
};


document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - Starting wishlist initialization');
    try {
        console.log('Calling initWishlist()');
        initWishlist();
        
        console.log('Calling updateWishlistCount()');
        const count = await updateWishlistCount();
        console.log('updateWishlistCount result:', count);
        
        console.log('Calling initPage()');
        await initPage();
        
        const isWishlistPage = window.location.hash === '#wishlist' || 
                             window.location.hash === '#cart' ||
                             document.querySelector('#wishlist-content');
        
        console.log('isWishlistPage:', isWishlistPage);
        
        if (isWishlistPage) {
            console.log('Displaying wishlist items...');
            await displayWishlistItems();
            console.log('Wishlist items displayed');
        }
        
        console.log('Getting wishlist for button updates...');
        const wishlist = await getWishlist();
        console.log('Wishlist items for button updates:', wishlist);
        updateWishlistButtons(wishlist);
        
        console.log('Wishlist initialization complete');
    } catch (error) {
        console.error('Error initializing wishlist:', error);
    }
});

// Initialize wishlist event listeners
function initWishlist() {
    console.log('Initializing wishlist...');
    
    // Delegate click events for wishlist buttons
    document.addEventListener('click', handleWishlistClick);
    
    // Listen for authentication state changes
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('User signed in, syncing wishlist with Firebase');
                // User is signed in, sync local wishlist with Firebase
                await syncWishlistWithFirebase(user.uid);
                
                // After syncing, update the wishlist display
                await updateWishlistCount();
                
                // If on wishlist or cart page, refresh the display
                if (window.location.hash === '#wishlist' || window.location.hash === '#cart') {
                    await displayWishlistItems();
                }
            } else {
                console.log('User signed out, loading from localStorage');
                // User is signed out, load from localStorage
                await updateWishlistCount();
                
                // If on wishlist or cart page, refresh the display
                if (window.location.hash === '#wishlist' || window.location.hash === '#cart') {
                    await displayWishlistItems();
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
}

// Show wishlist page
async function showWishlistPage() {
    // Update URL hash
    window.location.hash = 'wishlist';
    
    // Show wishlist section and hide others
    document.querySelectorAll('main').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById('wishlist')?.classList.remove('hidden');
    
    // Update active state in navigation
    updateActiveNav('wishlist');
    
    try {
        // Load and display wishlist items
        await displayWishlistItems();
    } catch (error) {
        console.error('Error loading wishlist:', error);
        showMessage('Failed to load wishlist. Please try again.', 'error');
    }
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
        console.log('Toggling wishlist item:', product.id);
        const user = window.firebaseAuth?.currentUser;
        const isInWishlist = button?.classList.contains('active');
        const icon = button?.querySelector('.bi');
        
        if (isInWishlist) {
            // Remove from wishlist
            console.log('Removing item from wishlist');
            if (user) {
                console.log('Removing from Firebase wishlist');
                const result = await window.firebaseFunctions.removeFromWishlist(user.uid, product.id);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to remove from wishlist');
                }
            } else {
                console.log('Removing from localStorage wishlist');
                removeFromLocalWishlist(product.id);
            }
            
            // Update UI
            button?.classList.remove('active');
            button?.setAttribute('aria-label', 'Add to wishlist');
            if (icon) {
                icon.classList.remove('bi-heart-fill');
                icon.classList.add('bi-heart');
            }
            
            if (window.showToast) {
                window.showToast('Removed from wishlist');
            } else {
                console.log('Removed from wishlist');
            }
        } else {
            // Add to wishlist
            console.log('Adding item to wishlist');
            if (user) {
                console.log('Adding to Firebase wishlist');
                const result = await window.firebaseFunctions.addToWishlist(user.uid, product);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to add to wishlist');
                }
            } else {
                console.log('Adding to localStorage wishlist');
                addToLocalWishlist(product);
            }
            
            // Update UI
            button?.classList.add('active');
            button?.setAttribute('aria-label', 'Remove from wishlist');
            if (icon) {
                icon.classList.remove('bi-heart');
                icon.classList.add('bi-heart-fill');
            }
            
            if (window.showToast) {
                window.showToast('Added to wishlist');
            } else {
                console.log('Added to wishlist');
            }
        }
        
        // Update wishlist count and display
        console.log('Updating wishlist count and UI');
        await updateWishlistCount();
        
        // Refresh wishlist display if on wishlist page
        if (window.location.hash === '#wishlist' || window.location.hash === '#cart') {
            console.log('Refreshing wishlist display');
            await displayWishlistItems();
        }
        
        console.log('Wishlist update complete');
        
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
        console.log('Getting wishlist...');
        
        // First try to get from Firebase if user is logged in
        if (window.firebaseAuth) {
            const user = window.firebaseAuth.currentUser;
            if (user) {
                console.log('User is logged in, checking Firebase for wishlist');
                try {
                    const result = await window.firebaseFunctions.getWishlist(user.uid);
                    if (result?.success) {
                        console.log('Retrieved wishlist from Firebase:', result.wishlist);
                        return Array.isArray(result.wishlist) ? result.wishlist : [];
                    }
                } catch (firebaseError) {
                    console.error('Error getting wishlist from Firebase, falling back to localStorage:', firebaseError);
                }
            }
        }
        
        // Fall back to localStorage
        console.log('Getting wishlist from localStorage');
        const localWishlist = getLocalWishlist();
        console.log('Local wishlist:', localWishlist);
        return Array.isArray(localWishlist) ? localWishlist : [];
        
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
        console.log('Updating wishlist count...');
        const user = window.firebaseAuth?.currentUser;
        let wishlist = [];
        let count = 0;
        
        if (user) {
            // For logged-in users, get wishlist from Firebase
            console.log('Getting wishlist from Firebase for count');
            const result = await window.firebaseFunctions.getWishlist(user.uid);
            if (result?.success) {
                wishlist = Array.isArray(result.wishlist) ? result.wishlist : [];
                count = wishlist.length;
                console.log('Got wishlist from Firebase:', wishlist);
            }
        } else {
            // For guests, get wishlist from localStorage
            wishlist = getLocalWishlist();
            count = wishlist.length;
        }
        
        // Update the UI with the count and wishlist items
        updateWishlistUI(count);
        
        // Update wishlist buttons on the page
        updateWishlistButtons(wishlist);
        
        // If we're on the wishlist page, update the display
        if (window.location.hash === '#wishlist' || window.location.hash === '#cart') {
            await displayWishlistItems();
        }
        
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
    item.className = 'cart-item';
    item.style.display = 'flex';
    item.style.width = '100%';
    item.style.padding = '15px';
    item.style.marginBottom = '15px';
    item.style.border = '1px solid #eee';
    item.style.borderRadius = '8px';
    item.style.backgroundColor = '#fff';
    item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    item.style.alignItems = 'center';
    item.style.transition = 'all 0.3s ease';
    item.style.position = 'relative';
    item.style.overflow = 'hidden';
    
    // Add hover effect
    item.onmouseenter = () => {
        item.style.transform = 'translateY(-2px)';
        item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    };
    item.onmouseleave = () => {
        item.style.transform = 'translateY(0)';
        item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    };
    item.dataset.productId = product.id;
    
    // Format price
    const price = parseFloat(product.price) || 0;
    const discountedPrice = parseFloat(product.discountedPrice) || 0;
    const displayPrice = discountedPrice > 0 ? discountedPrice : price;
    
    item.innerHTML = `
        <div class="cart-item-image" style="position: relative; margin-right: 15px;">
            <img src="${product.image || 'assets/product-placeholder.jpg'}" 
                 alt="${product.name}" 
                 style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
            <button class="wishlist-remove" 
                    data-product-id="${product.id}" 
                    aria-label="Remove from wishlist" 
                    style="position: absolute; top: -8px; right: -8px; background: white; 
                           border: 1px solid #ddd; border-radius: 50%; width: 24px; 
                           height: 24px; display: flex; align-items: center; 
                           justify-content: center; cursor: pointer; color: #ff6b6b; 
                           box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                           transition: all 0.2s ease;">
                <i class="bi bi-x" style="font-size: 14px;"></i>
            </button>
            <style>
                .wishlist-remove:hover {
                    background: #ff6b6b !important;
                    color: white !important;
                    transform: scale(1.1);
                }
            </style>
        </div>
        <div class="cart-item-details" style="flex: 1;">
            <div style="margin-bottom: 8px;">
                <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 500; color: #333;">
                    ${product.name}
                </h4>
                <div style="margin-top: 5px;">
                    ${discountedPrice > 0 ? `
                        <span style="text-decoration: line-through; color: #999; margin-right: 8px; font-size: 13px;">
                            ₹${price.toFixed(2)}
                        </span>
                        <span style="color: #d32f2f; font-weight: 600; font-size: 15px;">
                            ₹${discountedPrice.toFixed(2)}
                        </span>` : 
                        `<span style="color: #333; font-weight: 600; font-size: 15px;">
                            ₹${price.toFixed(2)}
                        </span>`
                    }
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="add-to-cart" 
                        data-product-id="${product.id}"
                        style="flex: 1; background: #4CAF50; color: white; border: none; 
                               padding: 6px 10px; border-radius: 4px; cursor: pointer; 
                               font-size: 13px; transition: background 0.2s; display: flex; 
                               align-items: center; justify-content: center;">
                    <i class="fas fa-shopping-cart" style="margin-right: 5px; font-size: 12px;"></i> 
                    Add to Cart
                </button>
                <button class="move-to-cart" 
                        data-product-id="${product.id}"
                        style="background: white; color: #555; border: 1px solid #ddd; 
                               padding: 6px 10px; border-radius: 4px; cursor: pointer; 
                               font-size: 13px; transition: all 0.2s; display: flex;
                               align-items: center; justify-content: center;">
                    <i class="fas fa-arrow-right" style="margin-right: 5px; font-size: 12px;"></i>
                    Move
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const removeBtn = item.querySelector('.wishlist-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const button = e.currentTarget;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            try {
                const productId = button.dataset.productId;
                const wishlistBtn = document.querySelector(`.product-card__wishlist[data-product-id="${productId}"]`);
                if (wishlistBtn) {
                    await toggleWishlistItem(product, wishlistBtn);
                }
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
                setTimeout(() => {
                    item.remove();
                    updateWishlistCount();
                }, 300);
            } catch (error) {
                console.error('Error removing from wishlist:', error);
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-times"></i>';
            }
        });
    }
    
    // Add to Cart button
    const addToCartBtn = item.querySelector('.add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const button = e.currentTarget;
            const originalText = button.innerHTML;
            
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Show success feedback
                button.innerHTML = '<i class="fas fa-check"></i> Added!';
                button.style.background = '#4CAF50';
                
                // Reset button after delay
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                    button.style.background = '';
                }, 1500);
                
                console.log('Added to cart:', product);
                // TODO: Implement actual add to cart functionality
                
            } catch (error) {
                console.error('Error adding to cart:', error);
                button.innerHTML = 'Error!';
                button.style.background = '#f44336';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                    button.style.background = '';
                }, 2000);
            }
        });
    }
    
    // Move to Cart button
    const moveToCartBtn = item.querySelector('.move-to-cart');
    if (moveToCartBtn) {
        moveToCartBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const button = e.currentTarget;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            try {
                // Simulate API calls
                await Promise.all([
                    // Add to cart
                    new Promise(resolve => setTimeout(resolve, 800)),
                    // Remove from wishlist
                    toggleWishlistItem(product, removeBtn)
                ]);
                
                // Visual feedback
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
                
                // Remove from UI after animation
                setTimeout(() => {
                    item.remove();
                    updateWishlistCount();
                }, 300);
                
                console.log('Moved to cart:', product);
                // TODO: Implement actual move to cart functionality
                
            } catch (error) {
                console.error('Error moving to cart:', error);
                button.disabled = false;
                button.innerHTML = 'Error!';
                
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-arrow-right"></i> Move';
                }, 2000);
            }
        });
    }
    
    return item;
}

async function displayWishlistItems() {
    console.log('displayWishlistItems called');
    
    // Try to find wishlist container in the wishlist tab first
    let wishlistGrid = document.querySelector('#wishlist-content .wishlist-grid');
    let emptyWishlist = document.querySelector('#wishlist-content .empty-wishlist');
    let isWishlistPage = window.location.hash === '#wishlist' || 
                        window.location.hash === '#' ||
                        document.querySelector('#wishlist-content:not(.hidden)');
    
    console.log('Initial elements:', { 
        wishlistGrid, 
        emptyWishlist, 
        isWishlistPage,
        hash: window.location.hash,
        wishlistContentVisible: document.querySelector('#wishlist-content:not(.hidden)') ? true : false
    });
    
    // If we couldn't find the wishlist grid, try to find it in the cart section
    if (!wishlistGrid) {
        console.log('Wishlist grid not found in default location, checking cart section');
        const cartSection = document.querySelector('#cart');
        if (cartSection && !cartSection.classList.contains('hidden')) {
            wishlistGrid = document.querySelector('#wishlist-content .wishlist-grid');
            emptyWishlist = document.querySelector('#wishlist-content .empty-wishlist');
            isWishlistPage = true;
            console.log('Found wishlist grid in cart section');
        }
    }
    
    // If we still don't have a grid, create a temporary one
    if (!wishlistGrid) {
        console.log('Creating temporary wishlist grid');
        const tempContainer = document.createElement('div');
        wishlistGrid = document.createElement('div');
        wishlistGrid.className = 'wishlist-grid';
        emptyWishlist = document.createElement('div');
        emptyWishlist.className = 'empty-wishlist';
        tempContainer.appendChild(wishlistGrid);
        tempContainer.appendChild(emptyWishlist);
    }
    
    if (!wishlistGrid) {
        console.error('Wishlist grid element not found');
        return;
    }
    
    try {
        // Show loading state
        wishlistGrid.innerHTML = '<div class="loading">Loading your wishlist...</div>';
        
        // Get wishlist data
        const currentWishlist = await getWishlist();
        console.log('Current wishlist:', currentWishlist);
        
        wishlistGrid.innerHTML = '';
        
        if (!currentWishlist || currentWishlist.length === 0) {
            // Create empty state if it doesn't exist
            if (!emptyWishlist) {
                emptyWishlist = document.createElement('div');
                emptyWishlist.className = 'empty-wishlist';
                if (wishlistGrid.parentNode) {
                    wishlistGrid.parentNode.insertBefore(emptyWishlist, wishlistGrid.nextSibling);
                }
            }
            
            emptyWishlist.style.display = 'flex';
            emptyWishlist.style.flexDirection = 'column';
            emptyWishlist.style.alignItems = 'center';
            emptyWishlist.style.justifyContent = 'center';
            emptyWishlist.style.padding = '40px 20px';
            emptyWishlist.style.textAlign = 'center';
            emptyWishlist.innerHTML = `
                <i class="far fa-heart" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="margin: 0 0 10px 0; color: #555; font-weight: 500;">Your wishlist is empty</h3>
                <p style="margin: 0 0 20px 0; color: #888;">Save items you love to buy them later</p>
                <button class="btn btn-primary" onclick="window.location.href='#shop'" style="padding: 10px 24px;">
                    Continue Shopping
                </button>`;
                
            // If we're not on the wishlist page, return empty state
            if (!isWishlistPage) {
                return { count: 0, items: [] };
            }
            return;
        }
        
        if (emptyWishlist) emptyWishlist.style.display = 'none';
        
        // Clear existing content
        wishlistGrid.innerHTML = '';
        
        // Add each wishlist item
        const fragment = document.createDocumentFragment();
        for (const item of currentWishlist) {
            const itemElement = createWishlistItemElement(item);
            if (itemElement) {
                fragment.appendChild(itemElement);
            }
        }
        
        // Add all items at once
        wishlistGrid.appendChild(fragment);
        
        // If we're not on the wishlist page, update the UI accordingly
        if (!isWishlistPage) {
            // You can customize this part to show a mini wishlist preview
            console.log('Wishlist items loaded on home page');
            return {
                count: currentWishlist.length,
                items: Array.from(wishlistGrid.children)
            };
        }
        
    } catch (error) {
        console.error('Error displaying wishlist items:', error);
        wishlistGrid.innerHTML = `
            <div style="width: 100%; padding: 40px 20px; text-align: center; color: #d32f2f;">
                <i class="fas fa-exclamation-circle" style="font-size: 36px; margin-bottom: 15px; display: block;"></i>
                <h3 style="margin: 0 0 15px 0; color: #d32f2f; font-weight: 500;">Something went wrong</h3>
                <p style="margin: 0 0 20px 0; color: #666;">We couldn't load your wishlist. Please try again.</p>
                <button class="btn btn-primary" onclick="displayWishlistItems()" style="padding: 10px 20px;">
                    <i class="fas fa-sync-alt" style="margin-right: 8px;"></i>
                    Try Again
                </button>
            </div>`;
        
        if (emptyWishlist) emptyWishlist.style.display = 'none';
    }
}

// Update wishlist buttons on the page based on current wishlist
function updateWishlistButtons(wishlist) {
    const wishlistButtons = document.querySelectorAll('.product-card__wishlist');
    
    wishlistButtons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        const isInWishlist = wishlist.some(item => item.id === productId);
        const icon = button.querySelector('.bi');
        
        if (isInWishlist) {
            button.classList.add('active');
            button.setAttribute('aria-label', 'Remove from wishlist');
            if (icon) {
                icon.classList.remove('bi-heart');
                icon.classList.add('bi-heart-fill');
            }
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-label', 'Add to wishlist');
            if (icon) {
                icon.classList.remove('bi-heart-fill');
                icon.classList.add('bi-heart');
            }
        }
    });
}

// Initialize page based on URL hash
async function initPage() {
    try {
        // Get current hash
        const hash = window.location.hash || '#';
        
        // If it's the cart page, initialize cart and wishlist
        if (hash === '#cart' || hash === '#wishlist') {
            // Initialize cart if cart.js is loaded
            if (typeof initCart === 'function') {
                initCart();
            }
            
            // Show the appropriate tab based on hash
            const cartContent = document.querySelector('#shopping-cart');
            const wishlistContent = document.querySelector('#wishlist-content');
            const cartHeader = document.querySelector('#cart-header h2[data-tab="shopping-cart"]');
            const wishlistHeader = document.querySelector('#cart-header h2[data-tab="wishlist-content"]');
            
            if (hash === '#wishlist') {
                console.log('Showing wishlist tab');
                if (cartContent) cartContent.classList.remove('active');
                if (wishlistContent) wishlistContent.classList.add('active');
                if (cartHeader) cartHeader.classList.remove('active');
                if (wishlistHeader) wishlistHeader.classList.add('active');
                
                // Load wishlist items
                await displayWishlistItems();
            } else {
                console.log('Showing cart tab');
                if (cartContent) cartContent.classList.add('active');
                if (wishlistContent) wishlistContent.classList.remove('active');
                if (cartHeader) cartHeader.classList.add('active');
                if (wishlistHeader) wishlistHeader.classList.remove('active');
                
                // Load cart items
                if (typeof displayCartItems === 'function') {
                    await displayCartItems();
                }
            }
        } else if(hash) {
            // Handle other sections
            const section = document.getElementById(hash.substring(1));
            if (section) {
                document.querySelectorAll('main').forEach(s => s.classList.add('hidden'));
                section.classList.remove('hidden');
                updateActiveNav(hash.substring(1));
                
                // Load wishlist items on home page
                if (hash === '#home') {
                    try {
                        await displayWishlistItems();
                    } catch (error) {
                        console.error('Error displaying wishlist items on home page:', error);
                    }
                }
            }
        } else if (hash === '') {
            // Handle empty hash (root URL)
            const homeSection = document.getElementById('home');
            if (homeSection) {
                document.querySelectorAll('main').forEach(s => s.classList.add('hidden'));
                homeSection.classList.remove('hidden');
                updateActiveNav('home');
                try {
                    await displayWishlistItems();
                } catch (error) {
                    console.error('Error displaying wishlist items on home page:', error);
                }
            }
        }
        
        // Update wishlist count in the header
        await updateWishlistCount();
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

// Show the selected tab
async function showTab(tabId) {
    console.log('showTab called with:', tabId);
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content, .cart-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons and headers
    document.querySelectorAll('.tab-button, .section-header h2').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show the selected tab content
    let selectedTab = document.getElementById(tabId);
    if (!selectedTab && tabId === 'wishlist-content') {
        // If wishlist tab doesn't exist, try to find it in the cart section
        selectedTab = document.querySelector('#wishlist-content');
    }
    
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        // If showing wishlist, refresh the items
        if (tabId === 'wishlist-content' || selectedTab.id === 'wishlist-content') {
            try {
                console.log('Displaying wishlist items from showTab');
                await displayWishlistItems();
            } catch (error) {
                console.error('Error displaying wishlist items:', error);
            }
        }
    }
    
    // Update the active tab button/header
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Also check for section headers in the cart section
    const sectionHeader = document.querySelector(`#cart-header h2[data-tab="${tabId}"]`);
    if (sectionHeader) {
        sectionHeader.classList.add('active');
    }
}

// Listen for hash changes to update the view
window.addEventListener('hashchange', initPage);

