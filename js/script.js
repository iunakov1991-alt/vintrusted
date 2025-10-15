
// Form tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update form content based on tab
            if (targetTab === 'vin') {
                // VIN mode - hide state selector
                const stateSelector = document.querySelector('.state-selector');
                if (stateSelector) {
                    stateSelector.style.display = 'none';
                }
                const inputText = document.querySelector('.input-text');
                if (inputText) {
                    inputText.textContent = '1HGBH41JXMN109186';
                }
            } else if (targetTab === 'plate') {
                // Plate mode - show state selector
                const stateSelector = document.querySelector('.state-selector');
                if (stateSelector) {
                    stateSelector.style.display = 'flex';
                }
                const inputText = document.querySelector('.input-text');
                if (inputText) {
                    inputText.textContent = 'ABC1234';
                }
            }
        });
    });
});


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
