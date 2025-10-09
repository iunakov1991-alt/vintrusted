// VIN Check USA - Main JavaScript
class VINChecker {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.paymentElement = null;
        this.currentVIN = null;
        this.init();
    }

    init() {
        this.initStripe();
        this.bindEvents();
        this.initFAQ();
        this.initMobileMenu();
    }

    // Инициализация Stripe
    initStripe() {
        // Замените на ваш публичный ключ Stripe
        this.stripe = Stripe('pk_test_your_stripe_public_key_here');
    }

    // Привязка событий
    bindEvents() {
        // VIN форма
        const vinForm = document.getElementById('vinForm');
        const ctaForm = document.querySelector('.cta-form');
        
        if (vinForm) {
            vinForm.addEventListener('submit', (e) => this.handleVINSubmit(e));
        }
        
        if (ctaForm) {
            ctaForm.addEventListener('submit', (e) => this.handleVINSubmit(e));
        }

        // VIN input валидация
        const vinInputs = document.querySelectorAll('#vinInput, .cta-form input');
        vinInputs.forEach(input => {
            input.addEventListener('input', (e) => this.validateVINInput(e));
            input.addEventListener('keypress', (e) => this.handleVINKeypress(e));
        });

        // Модальные окна
        this.bindModalEvents();
    }

    // Валидация VIN ввода
    validateVINInput(event) {
        const input = event.target;
        let value = input.value.toUpperCase();
        
        // Удаляем недопустимые символы (только буквы и цифры)
        value = value.replace(/[^A-Z0-9]/g, '');
        
        // Ограничиваем до 17 символов
        if (value.length > 17) {
            value = value.substring(0, 17);
        }
        
        input.value = value;
        
        // Обновляем состояние кнопки
        this.updateButtonState(input);
    }

    // Обработка нажатий клавиш в VIN поле
    handleVINKeypress(event) {
        const char = event.key.toUpperCase();
        const validChars = /[A-Z0-9]/;
        
        if (!validChars.test(char) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
        }
    }

    // Обновление состояния кнопки
    updateButtonState(input) {
        const button = input.closest('form').querySelector('.btn-primary');
        const isValid = this.isValidVIN(input.value);
        
        if (isValid) {
            button.disabled = false;
            button.style.opacity = '1';
        } else {
            button.disabled = true;
            button.style.opacity = '0.6';
        }
    }

    // Проверка валидности VIN
    isValidVIN(vin) {
        if (!vin || vin.length !== 17) return false;
        
        // Проверка на недопустимые символы
        const invalidChars = /[IOQ]/;
        if (invalidChars.test(vin)) return false;
        
        // Проверка контрольной суммы (упрощенная)
        return this.validateVINChecksum(vin);
    }

    // Валидация контрольной суммы VIN
    validateVINChecksum(vin) {
        const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
        const transliteration = {
            'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
            'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
            'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
        };
        
        let sum = 0;
        
        for (let i = 0; i < 17; i++) {
            let value;
            const char = vin[i];
            
            if (char >= '0' && char <= '9') {
                value = parseInt(char);
            } else if (transliteration[char]) {
                value = transliteration[char];
            } else {
                return false;
            }
            
            sum += value * weights[i];
        }
        
        const checkDigit = sum % 11;
        const expectedCheckDigit = vin[8];
        
        if (checkDigit === 10) {
            return expectedCheckDigit === 'X';
        } else {
            return expectedCheckDigit === checkDigit.toString();
        }
    }

    // Обработка отправки VIN формы
    async handleVINSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const vinInput = form.querySelector('input[type="text"]');
        const vin = vinInput.value.trim().toUpperCase();
        
        if (!this.isValidVIN(vin)) {
            this.showError('Пожалуйста, введите корректный VIN-номер');
            return;
        }
        
        this.currentVIN = vin;
        await this.processVINCheck(vin);
    }

    // Обработка проверки VIN
    async processVINCheck(vin) {
        try {
            // Показываем модальное окно загрузки
            this.showLoadingModal();
            
            // Симуляция API запроса (замените на реальный API)
            const report = await this.fetchVINReport(vin);
            
            // Скрываем загрузку
            this.hideLoadingModal();
            
            if (report.success) {
                // Показываем модальное окно оплаты
                await this.showPaymentModal(report.data);
            } else {
                this.showError(report.error || 'Ошибка при получении данных об автомобиле');
            }
            
        } catch (error) {
            this.hideLoadingModal();
            this.showError('Произошла ошибка. Попробуйте еще раз.');
            console.error('VIN Check Error:', error);
        }
    }

    // Получение отчета VIN (реальный API)
    async fetchVINReport(vin) {
        try {
            const response = await fetch('/api/vin-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ vin: vin })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при получении данных');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            // Fallback к мок данным при ошибке API
            return this.getMockReportData(vin);
        }
    }

    // Получение мок данных (fallback)
    getMockReportData(vin) {
        const mockReports = {
            '1HGBH41JXMN109186': {
                success: true,
                data: {
                    vin: vin,
                    make: 'Honda',
                    model: 'Civic',
                    year: 2021,
                    engine: '1.5L 4-Cylinder',
                    transmission: 'CVT',
                    accidents: 0,
                    owners: 1,
                    mileage: 45000,
                    liens: false,
                    recalls: 0,
                    marketValue: 25000
                }
            },
            '1FTFW1ET5DFC12345': {
                success: true,
                data: {
                    vin: vin,
                    make: 'Ford',
                    model: 'F-150',
                    year: 2019,
                    engine: '3.5L V6',
                    transmission: 'Automatic',
                    accidents: 1,
                    owners: 2,
                    mileage: 78000,
                    liens: true,
                    recalls: 2,
                    marketValue: 35000
                }
            }
        };
        
        return mockReports[vin] || {
            success: true,
            data: {
                vin: vin,
                make: 'Toyota',
                model: 'Camry',
                year: 2020,
                engine: '2.5L 4-Cylinder',
                transmission: 'Automatic',
                accidents: 0,
                owners: 1,
                mileage: 32000,
                liens: false,
                recalls: 1,
                marketValue: 28000
            }
        };
    }

    // Показ модального окна загрузки
    showLoadingModal() {
        const modal = document.getElementById('loadingModal');
        modal.classList.add('active');
    }

    // Скрытие модального окна загрузки
    hideLoadingModal() {
        const modal = document.getElementById('loadingModal');
        modal.classList.remove('active');
    }

    // Показ модального окна оплаты
    async showPaymentModal(reportData) {
        const modal = document.getElementById('paymentModal');
        modal.classList.add('active');
        
        // Инициализируем Stripe Elements
        await this.initPaymentElement();
        
        // Обновляем информацию об автомобиле в модальном окне
        this.updatePaymentModalInfo(reportData);
    }

    // Инициализация Stripe Elements
    async initPaymentElement() {
        try {
            // Создаем Payment Intent на сервере (замените на реальный API)
            const { clientSecret } = await this.createPaymentIntent();
            
            this.elements = this.stripe.elements({
                clientSecret: clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#2563eb',
                        colorBackground: '#ffffff',
                        colorText: '#1f2937',
                        borderRadius: '8px',
                    }
                }
            });
            
            this.paymentElement = this.elements.create('payment');
            this.paymentElement.mount('#payment-form');
            
        } catch (error) {
            console.error('Payment initialization error:', error);
            this.showError('Ошибка инициализации платежной системы');
        }
    }

    // Создание Payment Intent (реальный API)
    async createPaymentIntent() {
        try {
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    vin: this.currentVIN,
                    amount: 100 // $1.00 в центах
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ошибка создания платежа');
            }

            return result;
        } catch (error) {
            console.error('Payment Intent Error:', error);
            throw error;
        }
    }

    // Обновление информации в модальном окне оплаты
    updatePaymentModalInfo(reportData) {
        // Здесь можно добавить отображение информации об автомобиле
        console.log('Report data:', reportData);
        
        // Добавляем обработчик успешного платежа
        this.setupPaymentSuccessHandler(reportData);
    }

    // Настройка обработчика успешного платежа
    setupPaymentSuccessHandler(reportData) {
        const form = document.getElementById('payment-form');
        
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const { error } = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: `${window.location.origin}/report.html?vin=${this.currentVIN}`,
                },
            });

            if (error) {
                this.showError(error.message);
            } else {
                // Платеж успешен, перенаправляем на страницу отчета
                window.location.href = `/report.html?vin=${this.currentVIN}`;
            }
        });
    }

    // Привязка событий модальных окон
    bindModalEvents() {
        // Закрытие модальных окон
        const closeButtons = document.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Закрытие по клику вне модального окна
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Закрытие всех модальных окон
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Инициализация FAQ
    initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Закрываем все FAQ
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });
                
                // Открываем текущий, если он был закрыт
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    // Инициализация мобильного меню
    initMobileMenu() {
        const toggle = document.querySelector('.nav-toggle');
        const menu = document.querySelector('.nav-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                menu.classList.toggle('active');
                toggle.classList.toggle('active');
            });
        }
    }

    // Показ ошибки
    showError(message) {
        // Создаем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">⚠️</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 15px;
            z-index: 3000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Закрытие по клику
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    // Показ успешного уведомления
    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d1fae5;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            padding: 15px;
            z-index: 3000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new VINChecker();
    
    // Анимация счётчика отчётов
    animateCounter();
});

// Анимация счётчика отчётов
function animateCounter() {
    const counter = document.getElementById('reportsCounter');
    if (!counter) return;
    
    const targetNumber = 523;
    const duration = 2000; // 2 секунды
    const startNumber = targetNumber - 50;
    const increment = (targetNumber - startNumber) / (duration / 16);
    let currentNumber = startNumber;
    
    const updateCounter = () => {
        currentNumber += increment;
        if (currentNumber >= targetNumber) {
            counter.textContent = targetNumber;
            // Периодическое увеличение счётчика
            setInterval(() => {
                const newValue = parseInt(counter.textContent) + Math.floor(Math.random() * 3);
                counter.textContent = newValue;
            }, 5000 + Math.random() * 5000); // каждые 5-10 секунд
        } else {
            counter.textContent = Math.floor(currentNumber);
            requestAnimationFrame(updateCounter);
        }
    };
    
    updateCounter();
}

// Плавная прокрутка для якорных ссылок
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

// Анимация появления элементов при прокрутке
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Наблюдение за элементами
document.querySelectorAll('.feature-card, .pricing-card, .faq-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});
