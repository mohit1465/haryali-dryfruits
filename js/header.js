// Initialize header and home section
document.addEventListener('DOMContentLoaded', function() {
    // Remove hidden class from home section on load
    const homeSection = document.querySelector('main#home');
    if (homeSection) {
        homeSection.classList.remove('hidden');
    }
    
    // Header scroll effect
    const header = document.querySelector('header');
    let lastScroll = 0;
    const headerHeight = header.offsetHeight;
    
    function handleScroll() {
        const currentScroll = window.pageYOffset;
        
        // Always show header when at top of page
        if (currentScroll <= 10) {
            header.classList.remove('scrolled');
            header.style.transform = 'translateY(0)';
            return;
        }
        
        // Add scrolled class for styling
        header.classList.add('scrolled');
        
        // Hide header on scroll down, show on scroll up
        if (currentScroll > lastScroll && currentScroll > headerHeight) {
            // Scrolling down
            header.style.transform = `translateY(-${headerHeight}px)`;
        } else if (currentScroll < lastScroll) {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    }
    
    // Throttle scroll events for better performance
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // Initial check in case of page load with scroll position
    handleScroll();
});
