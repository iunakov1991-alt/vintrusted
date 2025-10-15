

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

// Form mode switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeContents = document.querySelectorAll('.mode-content');
    const vinInput = document.querySelector('.vin-input');
    
    console.log('Mode buttons found:', modeButtons.length);
    console.log('Mode contents found:', modeContents.length);
    
    // Mode switching
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetMode = this.getAttribute('data-mode');
            console.log('Clicked mode:', targetMode);
            
            // Remove active class from all buttons and contents
            modeButtons.forEach(btn => btn.classList.remove('active'));
            modeContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const targetElement = document.getElementById(targetMode + '-mode');
            console.log('Target element:', targetElement);
            if (targetElement) {
                targetElement.classList.add('active');
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
