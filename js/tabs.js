// Handle tab switching in the cart/wishlist section
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab functionality
    initTabs();
    
    // Update wishlist count on page load
    if (typeof updateWishlistCount === 'function') {
        updateWishlistCount();
    }
});

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.cart-content');
    
    // Handle tab click
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
            
            // If switching to wishlist tab, update the display
            if (tabId === 'wishlist-tab' && typeof displayWishlistItems === 'function') {
                displayWishlistItems();
            }
            
            // Update URL hash
            window.location.hash = tabId === 'wishlist-tab' ? 'wishlist' : 'cart';
        });
    });
    
    // Check URL hash on page load
    if (window.location.hash === '#wishlist') {
        const wishlistTab = document.querySelector('[data-tab="wishlist-tab"]');
        if (wishlistTab) wishlistTab.click();
    }
}

// Handle wishlist button in header/menu
function showWishlist() {
    const wishlistTab = document.querySelector('[data-tab="wishlist-tab"]');
    if (wishlistTab) {
        document.getElementById('cart').classList.remove('hidden');
        wishlistTab.click();
    }
}

// Make function available globally
window.showWishlist = showWishlist;
