/**
 * VIN PDF Stack - New 3D Effect with Section Navigation
 * Modern PDF viewer with advanced 3D transforms and chip-based navigation
 */

(async function initVinPdfStack(){
  const root = document.querySelector(".vin-pdfstack");
  if(!root) {
    console.log('[VIN PDF STACK] Container not found, skipping initialization');
    return;
  }

  const pdfUrl = root.getAttribute("data-pdf");
  const stackEl = document.getElementById("vinPdfStack");
  const prevBtn = document.getElementById("vinPrevBtn");
  const nextBtn = document.getElementById("vinNextBtn");
  const curEl = document.getElementById("vinCurrentPage");
  const totalEl = document.getElementById("vinTotalPages");
  const chipsContainer = document.getElementById("vinChips");

  // Check if PDF.js is loaded
  if (typeof pdfjsLib === 'undefined') {
    console.error('[VIN PDF STACK] PDF.js library not loaded');
    if (stackEl) {
    stackEl.innerHTML = '<div style="padding:40px;text-align:center;color:#6b7280;">PDF.js not loaded</div>';
    }
    return;
  }

  // Set worker path (local)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/public/pdf.worker.min.js";

  console.log('[VIN PDF STACK] Loading PDF from:', pdfUrl);

  try {
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      httpHeaders: {},
      withCredentials: false
    });
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    totalEl.textContent = String(total);

    console.log('[VIN PDF STACK] PDF loaded successfully, pages:', total);

    // Function to convert long titles to short chip labels (1-2 words, capitalized)
    function getShortTitle(fullTitle, pageNum) {
      const title = fullTitle.toLowerCase();
      
      // Mapping common terms to short labels
      if(title.includes('vehicle history report') || title.includes('vin#')) return 'Overview';
      if(title.includes('model') && !title.includes('remanufactured')) return 'Model Info';
      if(title.includes('historical title')) return 'Title History';
      if(title.includes('damage') && title.includes('not all')) return 'Damage Notes';
      if(title.includes('salvage')) return 'Salvage';
      if(title.includes('remanufactured')) return 'Remanufactured';
      if(title.includes('vin replaced')) return 'VIN Change';
      if(title.includes('trade-in')) return 'Trade Value';
      if(title.includes('put up for sale')) return 'Auction Date';
      if(title.includes('auction')) return 'Auction Info';
      if(title.includes('recall') || title.includes('toyota distributors')) return 'Recalls';
      if(title.includes('vehicles ever registered')) return 'Registration';
      if(title.includes('owners may contact') || title.includes('highway tra')) return 'Contact Info';
      if(title.includes('condition or prior use')) return 'Disclaimer';
      
      // Special case for page 6
      if(pageNum === 6) return 'Lien/Theft/Brand';
      
      // Generic fallback - use "Photo" instead of "Page"
      return 'Photo';
    }

    // Extract section titles from PDF pages
    const sections = [];
    const pages = [];
    
    for(let i=1;i<=total;i++){
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      // Extract text content to find section titles
      const textContent = await page.getTextContent();
      let pageTitle = '';
      
      // Look for the largest text in the top portion of the page (likely a heading)
      const items = textContent.items;
      let maxHeight = 0;
      let maxHeightText = '';
      
      // Check more items and find the text with maximum height in top 30% of page
      for(let j = 0; j < Math.min(50, items.length); j++) {
        const item = items[j];
        const text = item.str.trim();
        
        // Skip very short text and non-meaningful content
        if(text.length < 3) continue;
        
        // Check if item is in top portion of page (y coordinate)
        const isInTopPortion = !item.transform || item.transform[5] > viewport.height * 0.5;
        
        if(isInTopPortion && item.height > maxHeight && text.length > 3) {
          maxHeight = item.height;
          maxHeightText = text;
        }
      }
      
      // Use the text with maximum height, or fallback to generic name
      if(maxHeightText && maxHeight > 10) {
        pageTitle = maxHeightText;
      } else {
        // Fallback: try to find any reasonably large text in first 30 items
        for(let j = 0; j < Math.min(30, items.length); j++) {
          const item = items[j];
          const text = item.str.trim();
          if(item.height > 12 && text.length > 5) {
            pageTitle = text;
            break;
          }
        }
        
        // Final fallback
        if(!pageTitle) {
          pageTitle = `Section ${i}`;
        }
      }
      
      sections.push({
        title: getShortTitle(pageTitle, i),
        page: i - 1 // 0-indexed for navigation
      });

      const pageEl = document.createElement("div");
      pageEl.className = "vin-pdfstack__page";
      const canvas = document.createElement("canvas");
      canvas.className = "vin-pdfstack__canvas";
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      pageEl.appendChild(canvas);
      stackEl.appendChild(pageEl);

      // Fill with white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      
      // Hide CLEARVIN logo on first page by drawing white rectangle over it
      if (i === 1) {
        console.log('[VIN PDF STACK] Canvas dimensions:', canvas.width, 'x', canvas.height);
        ctx.fillStyle = '#ffffff';
        
        // Cover only the top-right corner where logo is typically placed
        // This avoids covering main text content
        const logoWidth = 250;  // Width to cover logo completely
        const logoHeight = 60;  // Height to cover logo completely
        const logoX = canvas.width - logoWidth - 10; // Reduced offset - closer to right edge
        const logoY = 10; // 10px from top edge
        
        ctx.fillRect(logoX, logoY, logoWidth, logoHeight);
        
        console.log('[VIN PDF STACK] Covered top-right logo area:', logoX, logoY, logoWidth, logoHeight);
      }
      
      pages.push(pageEl);

      console.log('[VIN PDF STACK] Rendered page', i, 'Title:', pageTitle);
    }

    let idx = 0;
    let visibleChipIndices = [0, 1, 2]; // Start with first 3 chips

    // Create and update chips (show only 3 at a time)
    function updateChips() {
      chipsContainer.innerHTML = '';
      
      // Display only 3 chips
      visibleChipIndices.forEach((chipIdx) => {
        if(chipIdx >= sections.length) return;
        
        const section = sections[chipIdx];
        const chip = document.createElement('div');
        chip.className = 'vin-pdfstack__chip';
        chip.textContent = section.title;
        chip.dataset.page = section.page;
        chip.dataset.chipIndex = chipIdx;
        
        // White dot on currently active page (dot jumps to active chip)
        if(section.page === idx) {
          chip.classList.add('active');
        }
        
        chip.addEventListener('click', () => {
          const clickedChipIndex = parseInt(chip.dataset.chipIndex);
          const clickedPage = section.page;
          
          // If clicking on already active chip, do nothing
          if(clickedPage === idx) {
            return;
          }
          
          // Move to clicked page
          idx = clickedPage;
          
          // Find next available chip to show (not currently visible)
          let nextChipIndex = (clickedChipIndex + 1) % sections.length;
          let attempts = 0;
          
          while(visibleChipIndices.includes(nextChipIndex) && attempts < sections.length) {
            nextChipIndex = (nextChipIndex + 1) % sections.length;
            attempts++;
          }
          
          // Replace the first chip that is NOT the clicked one
          for(let i = 0; i < visibleChipIndices.length; i++) {
            if(visibleChipIndices[i] !== clickedChipIndex) {
              visibleChipIndices[i] = nextChipIndex;
              break;
            }
          }
          
          renderState();
        });
        
        chipsContainer.appendChild(chip);
      });
    }

    function renderState(){
      pages.forEach((el, i)=> el.classList.toggle("is-active", i===idx));
      curEl.textContent = String(idx+1);
      prevBtn.disabled = idx===0;
      nextBtn.disabled = idx===pages.length-1;
      
      // Ensure current page chip is always visible
      const currentPageChipIndex = sections.findIndex(s => s.page === idx);
      if(currentPageChipIndex !== -1 && !visibleChipIndices.includes(currentPageChipIndex)) {
        // Rotate chips: remove the first (oldest) chip and add current page chip
        // This ensures all chips rotate, not just the first one
        visibleChipIndices.shift(); // Remove first chip
        visibleChipIndices.push(currentPageChipIndex); // Add current page chip at the end
      }
      
      updateChips();
    }

    prevBtn.addEventListener("click", ()=>{ 
      if(idx>0){ 
        idx--; 
        renderState(); 
      }
    });
    
    nextBtn.addEventListener("click", ()=>{ 
      if(idx<pages.length-1){ 
        idx++; 
        renderState(); 
      }
    });

    document.addEventListener("keydown", (e)=>{
      if(e.key==="ArrowLeft") prevBtn.click();
      if(e.key==="ArrowRight") nextBtn.click();
    });

    renderState();
    console.log('[VIN PDF STACK] Initialization complete with', sections.length, 'sections');
  } catch (error) {
    console.error('[VIN PDF STACK] Error loading PDF:', error);
    console.error('[VIN PDF STACK] Error details:', {
      message: error.message,
      name: error.name,
      url: pdfUrl
    });
    if (stackEl) {
    stackEl.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #6b7280;">
        <p style="font-size: 16px; margin-bottom: 8px;">PDF not available</p>
          <p style="font-size: 14px;">Error: ${error.message || 'Unknown error'}</p>
          <p style="font-size: 12px; margin-top: 8px; color: #999;">URL: ${pdfUrl}</p>
      </div>
    `;
    }
  }
})();
