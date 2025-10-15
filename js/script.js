

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

// Simple test function
function testModeSwitching() {
    console.log('Testing mode switching...');
    const vinMode = document.getElementById('vin-mode');
    const plateMode = document.getElementById('plate-mode');
    const vinBtn = document.querySelector('[data-mode="vin"]');
    const plateBtn = document.querySelector('[data-mode="plate"]');
    
    console.log('VIN mode element:', vinMode);
    console.log('Plate mode element:', plateMode);
    console.log('VIN button:', vinBtn);
    console.log('Plate button:', plateBtn);
    
    if (vinMode && plateMode && vinBtn && plateBtn) {
        console.log('All elements found, switching should work');
    } else {
        console.error('Some elements not found');
    }
}

// Form mode switching functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing form mode switching...');
    
    // Run test
    setTimeout(testModeSwitching, 100);
    
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeContents = document.querySelectorAll('.mode-content');
    const vinInput = document.querySelector('.vin-input');
    
    console.log('Mode buttons found:', modeButtons.length);
    console.log('Mode contents found:', modeContents.length);
    console.log('VIN input found:', vinInput);
    
    // Mode switching
    modeButtons.forEach((button, index) => {
        console.log(`Button ${index}:`, button, 'data-mode:', button.getAttribute('data-mode'));
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetMode = this.getAttribute('data-mode');
            console.log('Clicked mode:', targetMode);
            
            // Remove active class from all buttons and contents
            modeButtons.forEach(btn => {
                btn.classList.remove('active');
                console.log('Removed active from button:', btn);
            });
            modeContents.forEach(content => {
                content.classList.remove('active');
                console.log('Removed active from content:', content);
            });
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            console.log('Added active to button:', this);
            
            const targetElement = document.getElementById(targetMode + '-mode');
            console.log('Target element for', targetMode + '-mode:', targetElement);
            if (targetElement) {
                targetElement.classList.add('active');
                console.log('Added active to content:', targetElement);
            } else {
                console.error('Target element not found:', targetMode + '-mode');
            }
        });
    });
    
    // VIN validation
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
});

const spollerButtons = document.querySelectorAll("[data-spoller] .spollers-faq__button");
