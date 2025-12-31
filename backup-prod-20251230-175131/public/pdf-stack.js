/**
 * PDF Stack Viewer with PDF.js
 * Renders real PDF pages in 3D stack with auto-play
 */

// Set up PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let pdfDoc = null;
let currentPageIndex = 0;
let autoPlayInterval = null;
const AUTO_PLAY_DELAY = 4000; // 4 seconds between pages

// PDF file path - relative to website root
const PDF_FILE_PATH = '/VIN-Report-5TDYK3DC8DS290235.pdf';

/**
 * Initialize PDF stack when DOM is ready
 */
function initPDFStack() {
  // Check if PDF.js is loaded
  if (typeof pdfjsLib === 'undefined') {
    console.error('[PDF STACK] PDF.js library not loaded');
    return;
  }

  // Check if stack container exists
  const stackContainer = document.getElementById('pdfStack');
  if (!stackContainer) {
    console.log('[PDF STACK] Stack container not found, skipping PDF initialization');
    return;
  }

  console.log('[PDF STACK] Initializing PDF viewer...');
  loadPDF();
}

/**
 * Load PDF file
 */
async function loadPDF() {
  try {
    console.log('[PDF STACK] Loading PDF from:', PDF_FILE_PATH);
    pdfDoc = await pdfjsLib.getDocument(PDF_FILE_PATH).promise;
    console.log('[PDF STACK] PDF loaded successfully, pages:', pdfDoc.numPages);
    initializeStack();
  } catch (error) {
    console.error('[PDF STACK] Error loading PDF:', error);
    // Show fallback message
    const stackContainer = document.getElementById('pdfStack');
    if (stackContainer) {
      stackContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6b7280;">
          <p style="font-size: 16px; margin-bottom: 8px;">PDF not available</p>
          <p style="font-size: 14px;">Place VIN-Report-5YJ3E1EA7LF800340.pdf in website root</p>
        </div>
      `;
    }
  }
}

/**
 * Initialize stack with PDF pages
 */
async function initializeStack() {
  const stack = document.getElementById('pdfStack');
  const totalPages = pdfDoc.numPages;
  
  document.getElementById('totalPages').textContent = totalPages;
  
  // Create a page for each PDF page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = document.createElement('div');
    page.className = 'stack-page';
    page.style.setProperty('--index', pageNum - 1);
    
    if (pageNum === 1) {
      page.classList.add('active');
    }
    
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    
    page.appendChild(canvas);
    stack.appendChild(page);
    
    // Render the page asynchronously
    renderPage(pageNum, canvas);
  }
  
  updatePageCounter();
  startAutoPlay();
  
  console.log('[PDF STACK] Stack initialized with', totalPages, 'pages');
}

/**
 * Render a specific PDF page to canvas
 */
async function renderPage(pageNum, canvas) {
  try {
    const page = await pdfDoc.getPage(pageNum);
    
    // Get container dimensions
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth - 40; // Account for padding
    const containerHeight = container.clientHeight - 40;
    
    // Calculate scale to fit container while maintaining aspect ratio
    const viewport = page.getViewport({ scale: 1 });
    const scaleX = (containerWidth / viewport.width) * 2; // *2 for higher quality
    const scaleY = (containerHeight / viewport.height) * 2;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledViewport = page.getViewport({ scale: scale });
    
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Set display size (CSS pixels)
    canvas.style.width = (scaledViewport.width / 2) + 'px';
    canvas.style.height = (scaledViewport.height / 2) + 'px';
    
    const context = canvas.getContext('2d');
    
    // Fill with white background first
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;
    
    console.log('[PDF STACK] Rendered page', pageNum);
  } catch (error) {
    console.error('[PDF STACK] Error rendering page:', error);
  }
}

/**
 * Navigate to next page
 */
function nextPage() {
  if (!pdfDoc) return;
  
  if (currentPageIndex < pdfDoc.numPages - 1) {
    goToPage(currentPageIndex + 1);
  } else {
    // Loop back to first page
    goToPage(0);
  }
  resetAutoPlay();
}

/**
 * Navigate to previous page
 */
function prevPage() {
  if (!pdfDoc) return;
  
  if (currentPageIndex > 0) {
    goToPage(currentPageIndex - 1);
  } else {
    // Loop to last page
    goToPage(pdfDoc.numPages - 1);
  }
  resetAutoPlay();
}

/**
 * Start auto play
 */
function startAutoPlay() {
  if (autoPlayInterval) clearInterval(autoPlayInterval);
  autoPlayInterval = setInterval(() => {
    if (!pdfDoc) return;
    
    if (currentPageIndex < pdfDoc.numPages - 1) {
      goToPage(currentPageIndex + 1);
    } else {
      goToPage(0);
    }
  }, AUTO_PLAY_DELAY);
}

/**
 * Stop and reset auto play
 */
function resetAutoPlay() {
  if (autoPlayInterval) clearInterval(autoPlayInterval);
  startAutoPlay();
}

/**
 * Go to specific page
 */
function goToPage(pageIndex) {
  const allPages = document.querySelectorAll('.stack-page');
  
  // Remove active and prev classes from all pages
  allPages.forEach(page => {
    page.classList.remove('active', 'prev');
  });
  
  // Add appropriate classes to reorder pages based on current index
  allPages.forEach((page, index) => {
    if (index === pageIndex) {
      page.classList.add('active');
    } else if (index < pageIndex) {
      page.classList.add('prev');
    }
  });
  
  currentPageIndex = pageIndex;
  updatePageCounter();
}

/**
 * Update page counter display
 */
function updatePageCounter() {
  document.getElementById('currentPage').textContent = currentPageIndex + 1;
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn) prevBtn.addEventListener('click', prevPage);
  if (nextBtn) nextBtn.addEventListener('click', nextPage);
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPDFStack();
    initEventListeners();
  });
} else {
  initPDFStack();
  initEventListeners();
}

