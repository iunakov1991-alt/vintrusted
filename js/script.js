

spollerButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const currentItem = button.closest("[data-spoller]");
    const content = currentItem.querySelector(".spollers-faq__text");

    const parent = currentItem.parentNode;
    const isOneSpoller = parent.hasAttribute("data-one-spoller");

    if (isOneSpoller) {
      const allItems = parent.querySelectorAll("[data-spoller]");
      allItems.forEach((item) => {
        if (item !== currentItem) {
          const otherContent = item.querySelector(".spollers-faq__text");
          item.classList.remove("active");
          otherContent.style.maxHeight = null;
        }
      });
    }

    if (currentItem.classList.contains("active")) {
      currentItem.classList.remove("active");
      content.style.maxHeight = null;
    } else {
      currentItem.classList.add("active");
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
});

// Auto-uppercase and color input functionality
function initInputFormatting() {
    console.log('Initializing input formatting...');
    
    const vinInput = document.querySelector('.vin-input');
    const plateInput = document.querySelector('.plate-input');
    
    console.log('Input elements found:', {
        vinInput: !!vinInput,
        plateInput: !!plateInput
    });
    
    if (vinInput) {
        vinInput.addEventListener('input', function(e) {
            console.log('VIN input event:', e.target.value);
            e.target.value = e.target.value.toUpperCase();
        });
        
        vinInput.addEventListener('keyup', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    if (plateInput) {
        plateInput.addEventListener('input', function(e) {
            console.log('Plate input event:', e.target.value);
            e.target.value = e.target.value.toUpperCase();
        });
        
        plateInput.addEventListener('keyup', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

// Form mode switching functionality - Simple and reliable version
function initFormSwitching() {
    console.log('Initializing form switching...');
    
    const vinBtn = document.querySelector('[data-mode="vin"]');
    const plateBtn = document.querySelector('[data-mode="plate"]');
    const vinMode = document.getElementById('vin-mode');
    const plateMode = document.getElementById('plate-mode');
    
    console.log('Elements found:', {
        vinBtn: !!vinBtn,
        plateBtn: !!plateBtn,
        vinMode: !!vinMode,
        plateMode: !!plateMode
    });
    
    if (!vinBtn || !plateBtn || !vinMode || !plateMode) {
        console.error('Required elements not found');
        return;
    }
    
    // Function to clear all form fields
    function clearAllFields() {
        const vinInput = document.querySelector('.vin-input');
        const plateInput = document.querySelector('.plate-input');
        const stateSelect = document.querySelector('.state-select');
        
        if (vinInput) {
            vinInput.value = '';
            vinInput.focus();
        }
        if (plateInput) {
            plateInput.value = '';
        }
        if (stateSelect) {
            stateSelect.value = '';
        }
        console.log('All fields cleared');
    }
    
    // VIN button click handler
    vinBtn.addEventListener('click', function() {
        console.log('VIN button clicked');
        clearAllFields(); // Clear all fields when switching to VIN mode
        vinBtn.classList.add('active');
        plateBtn.classList.remove('active');
        vinMode.classList.add('active');
        plateMode.classList.remove('active');
        console.log('Switched to VIN mode');
    });
    
    // Plate button click handler
    plateBtn.addEventListener('click', function() {
        console.log('Plate button clicked');
        clearAllFields(); // Clear all fields when switching to Plate mode
        plateBtn.classList.add('active');
        vinBtn.classList.remove('active');
        plateMode.classList.add('active');
        vinMode.classList.remove('active');
        
        // Focus on license plate input after switching
        setTimeout(function() {
            const plateInput = document.querySelector('.plate-input');
            if (plateInput) {
                plateInput.focus();
            }
        }, 100);
        
        console.log('Switched to Plate mode');
    });
    
    console.log('Form switching initialized successfully');
    
    // VIN validation
    const vinInput = document.querySelector('.vin-input');
    if (vinInput) {
        vinInput.addEventListener('input', function() {
            const value = this.value;
            const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
            
            if (value.length === 17) {
                if (vinPattern.test(value)) {
                    this.style.color = '#51cf66';
                } else {
                    this.style.color = '#ff6b6b';
                }
            } else {
                this.style.color = '#ffffff';
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initFormSwitching();
        initInputFormatting();
    });
} else {
    initFormSwitching();
    initInputFormatting();
}

// Also try after a short delay as backup
setTimeout(function() {
    console.log('Trying initialization after 1 second...');
    initFormSwitching();
    initInputFormatting();
}, 1000);

setTimeout(function() {
    console.log('Trying initialization after 2 seconds...');
    initFormSwitching();
    initInputFormatting();
}, 2000);

setTimeout(function() {
    console.log('Trying initialization after 3 seconds...');
    initFormSwitching();
    initInputFormatting();
}, 3000);

const spollerButtons = document.querySelectorAll("[data-spoller] .spollers-faq__button");
