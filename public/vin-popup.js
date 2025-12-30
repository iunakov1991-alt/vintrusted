(function() {
  const overlay = document.getElementById('vinPopupOverlay');
  const openBtn = document.getElementById('openVinPopup');
  const closeBtn = document.getElementById('closeVinPopup');
  const vinInput = document.getElementById('vinInput');
  const vinCounter = document.querySelector('.vin-input-counter');
  const vinForm = document.getElementById('vinCheckForm');

  if (!overlay || !openBtn) return;

  // Open popup
  openBtn.addEventListener('click', () => {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Focus on input after animation
    setTimeout(() => {
      if (vinInput) vinInput.focus();
    }, 300);
  });

  // Close popup
  function closePopup() {
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
    
    // Clear input
    if (vinInput) {
      vinInput.value = '';
      updateCounter();
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closePopup);
  }

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePopup();
    }
  });

  // Update character counter
  function updateCounter() {
    if (vinInput && vinCounter) {
      const length = vinInput.value.length;
      vinCounter.textContent = `${length}/17`;
      
      // Change color based on length
      if (length === 17) {
        vinCounter.style.color = '#10b981'; // Green when complete
      } else if (length > 0) {
        vinCounter.style.color = '#3b82f6'; // Blue when typing
      } else {
        vinCounter.style.color = ''; // Default color
      }
    }
  }

  if (vinInput) {
    vinInput.addEventListener('input', updateCounter);
    
    // Auto-uppercase and filter invalid characters
    vinInput.addEventListener('input', (e) => {
      let value = e.target.value.toUpperCase();
      // Remove invalid characters (I, O, Q not allowed in VIN)
      value = value.replace(/[^A-HJ-NPR-Z0-9]/g, '');
      e.target.value = value;
      updateCounter();
    });
  }

  // Handle form submission
  if (vinForm) {
    vinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const vin = vinInput ? vinInput.value.trim() : '';
      
      if (vin.length === 17) {
        // Here you can add your VIN check logic
        console.log('Checking VIN:', vin);
        
        // Example: redirect to results page
        // window.location.href = `/check?vin=${vin}`;
        
        // For now, just show an alert
        alert(`Checking VIN: ${vin}\n\nThis will redirect to the check results page.`);
        
        closePopup();
      } else {
        alert('Please enter a valid 17-character VIN');
      }
    });
  }

  // Initialize counter
  updateCounter();
})();



