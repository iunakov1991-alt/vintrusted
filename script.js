// VIN REPORT - Main JavaScript

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCounter();
    initMobileMenu();
    initSearch();
    initPricingVinForm();
    initLogoScroll();
    initInputFocus();
    initFormModeSwitching();
});

// Tab Switching
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Counter Animation
function initCounter() {
    const counter = document.getElementById('reportsToday');
    if (!counter) return;
    
    let count = 473;
    const target = 523;
    const duration = 2000;
    const increment = (target - count) / (duration / 16);
    
    const animate = () => {
        count += increment;
        if (count >= target) {
            counter.textContent = `${target}+ отчётов сегодня`;
            // Increment periodically
            setInterval(() => {
                const currentCount = parseInt(counter.textContent);
                counter.textContent = `${currentCount + Math.floor(Math.random() * 3)}+ отчётов сегодня`;
            }, 8000);
        } else {
            counter.textContent = `${Math.floor(count)}+ отчётов сегодня`;
            requestAnimationFrame(animate);
        }
    };
    
    animate();
}

// Mobile Menu
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }
}

// Search Form
function initSearch() {
    const forms = document.querySelectorAll('.search-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const input = form.querySelector('.search-input');
            const value = input.value.trim().toUpperCase();
            
            if (value.length === 17) {
                // Valid VIN
                window.location.href = `report.html?vin=${value}`;
            } else if (value.length > 0) {
                alert('Пожалуйста, введите корректный 17-значный VIN номер');
            }
        });
    });
    
    // VIN input formatting
    const vinInputs = document.querySelectorAll('#vinInput');
    vinInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase();
            value = value.replace(/[^A-Z0-9]/g, '');
            if (value.length > 17) {
                value = value.substring(0, 17);
            }
            e.target.value = value;
        });
    });
}

// Pricing VIN Form Handler
function initPricingVinForm() {
    const pricingForm = document.getElementById('pricingVinForm');
    
    if (pricingForm) {
        pricingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const vinInput = pricingForm.querySelector('.pricing-vin-input');
            const vin = vinInput.value.trim().toUpperCase();
            
            // Валидация VIN
            if (vin.length !== 17) {
                showNotification('VIN должен содержать 17 символов', 'error');
                return;
            }
            
            // Перенаправляем на страницу оплаты
            window.location.href = `report.html?vin=${vin}`;
        });
    }
}

// Notification Helper
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 20px 30px;
        border-radius: 25px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Logo Scroll to Top
function initLogoScroll() {
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Input Focus Effects
function initInputFocus() {
    const vinInput = document.getElementById('vinInput');
    const plateInput = document.querySelector('#plate-tab .search-input');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // VIN input focus
    if (vinInput) {
        vinInput.addEventListener('focus', () => {
            // Stop shimmer on non-active tabs
            tabBtns.forEach(btn => {
                if (!btn.classList.contains('active')) {
                    btn.classList.add('no-shimmer');
                }
            });
        });
        
        vinInput.addEventListener('blur', () => {
            // Resume shimmer if no input
            if (!vinInput.value.trim()) {
                tabBtns.forEach(btn => {
                    btn.classList.remove('no-shimmer');
                });
            }
        });
    }
    
    // Plate input focus
    if (plateInput) {
        plateInput.addEventListener('focus', () => {
            // Stop shimmer on non-active tabs
            tabBtns.forEach(btn => {
                if (!btn.classList.contains('active')) {
                    btn.classList.add('no-shimmer');
                }
            });
        });
        
        plateInput.addEventListener('blur', () => {
            // Resume shimmer if no input
            if (!plateInput.value.trim()) {
                tabBtns.forEach(btn => {
                    btn.classList.remove('no-shimmer');
                });
            }
        });
    }
}

// Form Mode Switching
function initFormModeSwitching() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.getAttribute('data-mode');
            
            // Remove active class from all buttons
            modeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all mode content
            const allModeContent = document.querySelectorAll('.mode-content');
            allModeContent.forEach(content => content.classList.remove('active'));
            
            // Show selected mode content
            const selectedModeContent = document.getElementById(`${mode}-mode`);
            if (selectedModeContent) {
                selectedModeContent.classList.add('active');
                
                // Auto-focus VIN input when switching to VIN mode
                if (mode === 'vin') {
                    const vinInput = selectedModeContent.querySelector('.vin-input');
                    if (vinInput) {
                        setTimeout(() => {
                            vinInput.focus();
                        }, 100);
                    }
                }
            }
        });
    });
}
