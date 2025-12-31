(function() {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    const infoBoxes = document.querySelectorAll('.info-box[data-group]');
    const vinChars = document.querySelectorAll('.vin-char[data-group]');
    
    if (!infoBoxes.length || !vinChars.length) return;
    
    // Define colors for each group
    const groupColors = {
      '1': '#3b82f6',  // Blue
      '2': '#8b5cf6',  // Purple
      '3': '#ec4899',  // Pink
      '4': '#f59e0b',  // Orange
      '5': '#10b981',  // Green
      '6': '#06b6d4'   // Cyan
    };
    
    let currentlyVisible = '1'; // First bubble visible by default
    
    // Initialize - highlight first group by default
    vinChars.forEach(c => {
      if (c.getAttribute('data-group') === '1') {
        c.style.color = groupColors['1'];
        c.style.transform = 'scale(1.15)';
      }
    });
    
    // Add hover effect to VIN characters
    vinChars.forEach(char => {
      const group = char.getAttribute('data-group');
      
      char.addEventListener('mouseenter', function() {
        // Highlight all characters in the same group with group-specific color
        vinChars.forEach(c => {
          const cGroup = c.getAttribute('data-group');
          if (cGroup === group) {
            c.style.color = groupColors[group];
            c.style.transform = 'scale(1.15)';
          } else {
            c.style.color = '#e5e7eb';
            c.style.transform = 'scale(1)';
          }
        });
        
        // Show info box for this group
        infoBoxes.forEach(box => {
          const boxGroup = box.getAttribute('data-group');
          if (boxGroup === group) {
            box.style.opacity = '1';
            box.style.visibility = 'visible';
            // Different transform for first and last groups
            if (boxGroup === '1' || boxGroup === '6') {
              box.style.transform = 'translateX(0) translateY(0)';
            } else {
              box.style.transform = 'translateX(-50%) translateY(0)';
            }
            box.style.borderColor = groupColors[group];
          } else {
            box.style.opacity = '0';
            box.style.visibility = 'hidden';
            // Different transform for first and last groups
            if (boxGroup === '1' || boxGroup === '6') {
              box.style.transform = 'translateX(0) translateY(10px)';
            } else {
              box.style.transform = 'translateX(-50%) translateY(10px)';
            }
          }
        });
        
        currentlyVisible = group;
      });
    });
    
    // When mouse leaves VIN code area, show first bubble again and reset colors
    const vinDisplay = document.querySelector('.vin-code-display');
    if (vinDisplay) {
      vinDisplay.addEventListener('mouseleave', function(e) {
        setTimeout(() => {
          // Reset all character colors to first group
          vinChars.forEach(c => {
            if (c.getAttribute('data-group') === '1') {
              c.style.color = groupColors['1'];
              c.style.transform = 'scale(1.15)';
            } else {
              c.style.color = '#e5e7eb';
              c.style.transform = 'scale(1)';
            }
          });
          
          // Show first bubble
          infoBoxes.forEach(box => {
            const boxGroup = box.getAttribute('data-group');
            if (boxGroup === '1') {
              box.style.opacity = '1';
              box.style.visibility = 'visible';
              box.style.transform = 'translateX(0) translateY(0)';
              box.style.borderColor = groupColors['1'];
            } else {
              box.style.opacity = '0';
              box.style.visibility = 'hidden';
              if (boxGroup === '6') {
                box.style.transform = 'translateX(0) translateY(10px)';
              } else {
                box.style.transform = 'translateX(-50%) translateY(10px)';
              }
            }
          });
          currentlyVisible = '1';
        }, 100);
      });
    }
  });
})();

