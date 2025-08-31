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
        const item = cart.find(item => item.id === productId);
        
        if (!item) return;
        
        // Update quantity locally
        item.quantity = (item.quantity || 1) + change;
        
        if (item.quantity <= 0) {
            // Remove item if quantity is 0 or less
            cart = cart.filter(i => i.id !== productId);
        }
        
        // Always update localStorage for both logged-in and guest users
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update UI
        await updateCartCount();
        await displayCartItems();
    } catch (error) {
        console.error('Error updating cart item quantity:', error);
        showMessage('Failed to update cart item quantity', 'error');
    }
};

window.removeFromCart = async (productId) => {
    try {
        const currentUser = window.firebaseAuth?.currentUser;
        
        if (currentUser) {
            // For logged-in users, remove from Firebase
            try {
                // First, get the current cart to find the exact item
                const cartResult = await window.firebaseFunctions.getCart(currentUser.uid);
                if (!cartResult?.success) {
                    throw new Error('Failed to fetch cart');
                }
                
                const cart = cartResult.cart || [];
                const itemToRemove = cart.find(item => item.id === productId);
                
                if (!itemToRemove) {
                    throw new Error('Item not found in cart');
                }
                
                // Now proceed with removal
                const result = await window.firebaseFunctions.removeFromCart(currentUser.uid, productId);
                
                if (result && result.success) {
                    // Update local storage to match Firebase
                    localStorage.setItem('cart', JSON.stringify(result.cart || []));
                    
                    // Update UI
                    await updateCartCount();
                    await displayCartItems();
                    
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
            const itemToRemove = cart.find(item => item.id === productId);
            
            if (!itemToRemove) {
                throw new Error('Item not found in cart');
            }
            
            const updatedCart = cart.filter(item => item.id !== productId);
            localStorage.setItem('cart', JSON.stringify(updatedCart));
            
            await updateCartCount();
            await displayCartItems();
            showMessage(`${itemToRemove.name} removed from cart`, 'success');
        }
    } catch (error) {
        console.error('Error in removeFromCart:', error);
        showMessage(error.message || 'Failed to remove item from cart', 'error');
    }
};

// Initialize cart
document.addEventListener('DOMContentLoaded', async () => {
    await updateCartCount();
    setupAddToCartButtons();
    
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
                
                if (productId && (action === 'increase' || action === 'decrease')) {
                    const change = action === 'increase' ? 1 : -1;
                    await updateCartItemQuantity(productId, change);
                }
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
        const productDetails = getProductDetails(item.name) || {
            id: item.id,
            name: item.name,
            price: 0,
            image: '',
            category: 'Unavailable'
        };
        
        subtotal += productDetails.price;
        
        const quantity = item.quantity || 1;
        const itemTotal = (productDetails.price * quantity).toFixed(2);
        
        return `
            <div class="cart-item" data-product-id="${productDetails.id}">
                ${productDetails.image ? `
                <div class="cart-item-image">
                    <img src="${productDetails.image}" alt="${productDetails.name}">
                </div>` : ''}
                <div class="cart-item-details">
                    <h4>${productDetails.name}</h4>
                    ${productDetails.price > 0 ? `<p class="price">₹${productDetails.price.toFixed(2)}</p>` : ''}
                    
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-action="decrease" data-product-id="${productDetails.id}">-</button>
                        <span class="quantity">${quantity}</span>
                        <button class="quantity-btn" data-action="increase" data-product-id="${productDetails.id}">+</button>
                    </div>
                    
                    <p class="item-total">Total: ₹${itemTotal}</p>
                    <button class="remove-item" data-product-id="${productDetails.id}">Remove</button>
                </div>
            </div>
        `;
    }));

    // Calculate shipping (example: free shipping over ₹1000)
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal + shipping;

    // Update the cart container
    cartContainer.innerHTML = itemsHtml.join('');
    
    // Update summary
    if (totalItemsElement) totalItemsElement.textContent = cart.length;
    if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
    if (shippingElement) {
        shippingElement.textContent = shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`;
    }
    if (totalElement) totalElement.textContent = `₹${total.toFixed(2)}`;
}

// Update cart count in the UI
async function updateCartCount() {
    try {
        const currentUser = window.firebaseAuth?.currentUser;
        let cart = [];
        
        if (currentUser) {
            // For logged-in users, get cart from Firebase
            try {
                const result = await window.firebaseFunctions.getCart(currentUser.uid);
                if (result && result.success) {
                    cart = result.cart || [];
                    // Keep localStorage in sync for offline access
                    localStorage.setItem('cart', JSON.stringify(cart));
                }
            } catch (error) {
                console.error('Error fetching cart from Firebase:', error);
                // Fallback to localStorage if Firebase fails
                cart = JSON.parse(localStorage.getItem('cart') || '[]');
            }
        } else {
            // For guests, use localStorage
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
        }
        
        cartCount = cart.length; // Each item is unique, so count is just the array length
        
        // Update the cart count in the UI
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? 'flex' : 'none';
        }
        
        // Update cart count in the header
        const headerCartCount = document.querySelector('.header-cart-count');
        if (headerCartCount) {
            headerCartCount.textContent = cartCount;
            headerCartCount.style.display = cartCount > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        if (cartCountElement) {
            cartCountElement.textContent = '0';
            cartCountElement.style.display = 'none';
        }
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
        const user = auth.currentUser;
        if (!user) {
            return { success: true, cart: JSON.parse(localStorage.getItem('cart') || '[]') };
        }
        return await getCart(user.uid);
    },
    updateCartItem: async (productId, updates) => {
        const user = auth.currentUser;
        if (!user) {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const itemIndex = cart.findIndex(item => item.id === productId);
            
            if (itemIndex !== -1) {
                cart[itemIndex] = { ...cart[itemIndex], ...updates };
                localStorage.setItem('cart', JSON.stringify(cart.filter(item => item.quantity > 0)));
                updateCartCount();
                return { success: true };
            }
            return { success: false, error: 'Product not found in cart' };
        }
        return await updateCartItem(user.uid, productId, updates);
    }
};
