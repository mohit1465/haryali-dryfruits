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

// Global functions for cart operations
window.updateCartItemQuantity = async (productId, change) => {
    try {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const itemIndex = cart.findIndex(item => item.id === productId);
        
        if (itemIndex === -1) return false;
        
        // Update quantity locally
        const newQuantity = (cart[itemIndex].quantity || 1) + change;
        
        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or less
            cart = cart.filter(item => item.id !== productId);
        } else {
            // Update quantity
            cart[itemIndex].quantity = newQuantity;
        }
        
        // Update localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update UI
        await updateCartCount();
        await displayCartItems();
        
        return true;
    } catch (error) {
        console.error('Error updating cart item quantity:', error);
        showMessage('Failed to update cart item quantity', 'error');
    }
};

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
    const tabHeaders = document.querySelectorAll('#cart-header h2');
    const tabContents = document.querySelectorAll('.cart-content');
    
    tabHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const tabId = header.getAttribute('data-tab');
            
            // Update active tab header
            tabHeaders.forEach(h => h.classList.remove('active'));
            header.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });}

// Initialize cart
document.addEventListener('DOMContentLoaded', async () => {
    await updateCartCount();
    setupAddToCartButtons();
    setupCartTabs();
    
    // Set up event delegation for cart interactions
    document.addEventListener('click', async (e) => {
        const quantityBtn = e.target.closest('.quantity-btn');
        const removeBtn = e.target.closest('.remove-item');
        
        try {
            // Handle quantity buttons
            if (quantityBtn) {
                e.preventDefault();
                const action = quantityBtn.dataset.action;
                const productId = quantityBtn.dataset.productId;
                const quantityElement = quantityBtn.parentElement.querySelector('.quantity');
                let currentQuantity = parseInt(quantityElement.textContent) || 0;
                
                if (action === 'increase') {
                    currentQuantity += 1;
                    await window.cartFunctions.updateCartItem(productId, { quantity: currentQuantity });
                } else if (action === 'decrease' && currentQuantity > 1) {
                    currentQuantity -= 1;
                    await window.cartFunctions.updateCartItem(productId, { quantity: currentQuantity });
                }
                
                // Update the UI immediately for better responsiveness
                quantityElement.textContent = currentQuantity;
                
                // Update the cart count and total
                await updateCartCount();
                return;
            }
            // Handle remove item
            else if (removeBtn) {
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
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const existingItem = cart.find(item => item.name === product.name);
            
            if (!existingItem) {
                cart.push(product);
                localStorage.setItem('cart', JSON.stringify(cart));
                await updateCartCount();
                await displayCartItems();
                showMessage('Product added to cart!', 'success');
            } else {
                showMessage('Product is already in your cart', 'info');
            }
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
                    
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-action="decrease" data-product-id="${productId}">-</button>
                        <span class="quantity">${quantity}</span>
                        <button class="quantity-btn" data-action="increase" data-product-id="${productId}">+</button>
                    </div>
                    
                    <p class="item-total">Total: ₹${itemTotal}</p>
                    <button class="remove-item" data-product-id="${productId}">Remove</button>
                </div>
            </div>
        `;
    }));

    // Calculate total items (sum of quantities)
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Calculate shipping (example: free shipping over ₹1000)
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal + shipping;

    // Update the cart container
    cartContainer.innerHTML = itemsHtml.join('');
    
    // Update order summary with existing variables
    if (totalItemsElement) totalItemsElement.textContent = totalItems;
    if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
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
        
        // Update cart count
        cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
        
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
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const itemIndex = cart.findIndex(item => item.id === productId);
                
                if (itemIndex !== -1) {
                    cart[itemIndex] = { ...cart[itemIndex], ...updates };
                    localStorage.setItem('cart', JSON.stringify(cart.filter(item => item.quantity > 0)));
                    await updateCartCount();
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
