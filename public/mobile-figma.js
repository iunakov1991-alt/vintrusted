// Mobile Figma Design - Form Handler
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        const vinInput = document.getElementById('figmaVinInput');
        const submitBtn = document.getElementById('figmaSubmitBtn');
        
        if (!vinInput || !submitBtn) {
            console.log('[FIGMA] Form elements not found');
            return;
        }
        
        console.log('[FIGMA] Initializing mobile form');
        
        // Auto-uppercase and validate VIN input
        vinInput.addEventListener('input', function(e) {
            // Convert to uppercase and remove invalid characters
            this.value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
            
            // Limit to 17 characters
            if (this.value.length > 17) {
                this.value = this.value.substring(0, 17);
            }
        });
        
        // Handle form submission
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const vin = vinInput.value.trim();
            
            // Validate VIN length
            if (vin.length !== 17) {
                alert('Please enter a valid 17-character VIN number');
                vinInput.focus();
                return;
            }
            
            console.log('[FIGMA] Submitting VIN:', vin);
            
            // Show loading state
            submitBtn.textContent = 'SEARCHING...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            
            // Redirect to report page
            window.location.href = '/report.html?vin=' + encodeURIComponent(vin);
        });
        
        // Allow Enter key to submit
        vinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitBtn.click();
            }
        });
    });
})();
