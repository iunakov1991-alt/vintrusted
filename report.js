// Report Page JavaScript
class VINReport {
    constructor() {
        this.reportData = null;
        this.init();
    }

    init() {
        this.loadReportData();
        this.bindEvents();
        this.setReportDate();
    }

    // Загрузка данных отчета
    loadReportData() {
        // Получаем данные из URL параметров или localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const vin = urlParams.get('vin') || '1HGBH41JXMN109186';
        
        // Загружаем данные отчета (в реальном приложении это будет API запрос)
        this.reportData = this.getMockReportData(vin);
        this.populateReport();
    }

    // Получение мок данных отчета
    getMockReportData(vin) {
        const mockData = {
            '1HGBH41JXMN109186': {
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
                recalls: 1,
                marketValue: 25000,
                ownershipType: 'Personal',
                regularService: true,
                warrantyWork: false,
                insuranceClaims: 0,
                serviceHistory: [
                    {
                        date: '2023-06-15',
                        type: 'Regular Maintenance',
                        description: 'Замена масла, проверка систем'
                    },
                    {
                        date: '2022-12-10',
                        type: 'Regular Maintenance',
                        description: 'Замена масла, фильтров'
                    }
                ],
                recalls: [
                    {
                        title: 'Отзыв по тормозной системе',
                        date: '2023-03-15',
                        description: 'Возможная неисправность тормозных колодок. Требуется проверка в дилерском центре.',
                        status: 'pending'
                    }
                ]
            },
            '1FTFW1ET5DFC12345': {
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
                marketValue: 35000,
                ownershipType: 'Commercial',
                regularService: false,
                warrantyWork: true,
                insuranceClaims: 1,
                serviceHistory: [
                    {
                        date: '2023-01-20',
                        type: 'Repair',
                        description: 'Замена тормозных колодок'
                    }
                ],
                recalls: [
                    {
                        title: 'Отзыв по системе безопасности',
                        date: '2022-08-10',
                        description: 'Проблема с подушками безопасности',
                        status: 'fixed'
                    }
                ]
            }
        };

        return mockData[vin] || mockData['1HGBH41JXMN109186'];
    }

    // Заполнение отчета данными
    populateReport() {
        if (!this.reportData) return;

        const data = this.reportData;

        // Основная информация
        document.getElementById('vinNumber').textContent = data.vin;
        document.getElementById('vehicleTitle').textContent = `${data.year} ${data.make} ${data.model}`;
        document.getElementById('vehicleYear').textContent = data.year;
        document.getElementById('vehicleEngine').textContent = data.engine;
        document.getElementById('vehicleTransmission').textContent = data.transmission;
        document.getElementById('vehicleMileage').textContent = `${data.mileage.toLocaleString()} миль`;
        document.getElementById('marketValue').textContent = `$${data.marketValue.toLocaleString()}`;

        // История аварий
        document.getElementById('accidentCount').textContent = data.accidents;
        document.getElementById('seriousDamage').textContent = data.accidents > 0 ? 'Да' : 'Нет';
        
        const accidentStatus = document.getElementById('accidentStatus');
        if (data.accidents === 0) {
            accidentStatus.textContent = 'Чистая история';
            accidentStatus.className = 'status-badge clean';
        } else if (data.accidents <= 2) {
            accidentStatus.textContent = 'Незначительные аварии';
            accidentStatus.className = 'status-badge warning';
        } else {
            accidentStatus.textContent = 'Множественные аварии';
            accidentStatus.className = 'status-badge bad';
        }

        // История владения
        document.getElementById('ownerCount').textContent = data.owners;
        document.getElementById('ownershipType').textContent = data.ownershipType === 'Personal' ? 'Личное' : 'Коммерческое';
        
        const ownershipStatus = document.getElementById('ownershipStatus');
        if (data.owners <= 1) {
            ownershipStatus.textContent = 'Отличная';
            ownershipStatus.className = 'status-badge clean';
        } else if (data.owners <= 3) {
            ownershipStatus.textContent = 'Хорошая';
            ownershipStatus.className = 'status-badge good';
        } else {
            ownershipStatus.textContent = 'Множественные владельцы';
            ownershipStatus.className = 'status-badge warning';
        }

        // Финансовая информация
        document.getElementById('liensStatus').textContent = data.liens ? 'Есть' : 'Нет';
        document.getElementById('leaseStatus').textContent = 'Нет';
        document.getElementById('insuranceClaims').textContent = data.insuranceClaims > 0 ? `${data.insuranceClaims} выплат` : 'Нет';
        
        const financialStatus = document.getElementById('financialStatus');
        if (!data.liens && data.insuranceClaims === 0) {
            financialStatus.textContent = 'Чистая';
            financialStatus.className = 'status-badge clean';
        } else {
            financialStatus.textContent = 'Требует внимания';
            financialStatus.className = 'status-badge warning';
        }

        // История обслуживания
        document.getElementById('regularService').textContent = data.regularService ? 'Да' : 'Нет';
        document.getElementById('warrantyWork').textContent = data.warrantyWork ? 'Да' : 'Нет';
        
        const serviceStatus = document.getElementById('serviceStatus');
        if (data.regularService && !data.warrantyWork) {
            serviceStatus.textContent = 'Отличная';
            serviceStatus.className = 'status-badge clean';
        } else if (data.regularService) {
            serviceStatus.textContent = 'Хорошая';
            serviceStatus.className = 'status-badge good';
        } else {
            serviceStatus.textContent = 'Требует внимания';
            serviceStatus.className = 'status-badge warning';
        }

        // Отзывы
        document.getElementById('activeRecalls').textContent = data.recalls;
        document.getElementById('fixedRecalls').textContent = '0';
        
        const recallStatus = document.getElementById('recallStatus');
        if (data.recalls === 0) {
            recallStatus.textContent = 'Нет отзывов';
            recallStatus.className = 'status-badge clean';
        } else {
            recallStatus.textContent = `${data.recalls} отзыв`;
            recallStatus.className = 'status-badge warning';
        }

        // Заполнение детальной информации
        this.populateAccidentDetails();
        this.populateOwnershipTimeline();
        this.populateServiceTimeline();
        this.populateRecallDetails();
    }

    // Заполнение деталей аварий
    populateAccidentDetails() {
        const container = document.getElementById('accidentDetails');
        
        if (this.reportData.accidents === 0) {
            container.innerHTML = '<p class="no-accidents">✅ Никаких аварий не зарегистрировано</p>';
        } else {
            container.innerHTML = `
                <div class="accident-item">
                    <div class="accident-date">2022-05-15</div>
                    <div class="accident-description">
                        <strong>Незначительное ДТП</strong>
                        <p>Повреждение переднего бампера, ремонт выполнен</p>
                    </div>
                </div>
            `;
        }
    }

    // Заполнение временной шкалы владения
    populateOwnershipTimeline() {
        const container = document.getElementById('ownershipTimeline');
        const data = this.reportData;
        
        let timelineHTML = '';
        
        if (data.owners === 1) {
            timelineHTML = `
                <div class="timeline-item">
                    <div class="timeline-date">${data.year} - настоящее время</div>
                    <div class="timeline-info">
                        <strong>Первый владелец</strong>
                        <p>Личное использование, штат Калифорния</p>
                    </div>
                </div>
            `;
        } else {
            timelineHTML = `
                <div class="timeline-item">
                    <div class="timeline-date">${data.year} - 2022</div>
                    <div class="timeline-info">
                        <strong>Первый владелец</strong>
                        <p>Личное использование</p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-date">2022 - настоящее время</div>
                    <div class="timeline-info">
                        <strong>Второй владелец</strong>
                        <p>Коммерческое использование</p>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = timelineHTML;
    }

    // Заполнение временной шкалы обслуживания
    populateServiceTimeline() {
        const container = document.getElementById('serviceTimeline');
        const serviceHistory = this.reportData.serviceHistory || [];
        
        if (serviceHistory.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280;">История обслуживания недоступна</p>';
            return;
        }
        
        let timelineHTML = '';
        serviceHistory.forEach(service => {
            timelineHTML += `
                <div class="timeline-item">
                    <div class="timeline-date">${service.date}</div>
                    <div class="timeline-info">
                        <strong>${service.type}</strong>
                        <p>${service.description}</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = timelineHTML;
    }

    // Заполнение деталей отзывов
    populateRecallDetails() {
        const container = document.getElementById('recallDetails');
        const recalls = this.reportData.recalls || [];
        
        if (recalls.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #059669;">✅ Активных отзывов нет</p>';
            return;
        }
        
        let recallsHTML = '';
        recalls.forEach(recall => {
            recallsHTML += `
                <div class="recall-item">
                    <div class="recall-title">${recall.title}</div>
                    <div class="recall-date">${recall.date}</div>
                    <div class="recall-description">${recall.description}</div>
                    <div class="recall-status ${recall.status}">
                        ${recall.status === 'pending' ? 'Требует внимания' : 'Исправлено'}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = recallsHTML;
    }

    // Установка даты отчета
    setReportDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('reportDate').textContent = dateString;
    }

    // Привязка событий
    bindEvents() {
        // Копирование VIN
        const copyBtn = document.querySelector('.copy-vin-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyVIN());
        }
    }

    // Копирование VIN в буфер обмена
    copyVIN() {
        const vin = document.getElementById('vinNumber').textContent;
        navigator.clipboard.writeText(vin).then(() => {
            this.showNotification('VIN скопирован в буфер обмена', 'success');
        }).catch(() => {
            this.showNotification('Не удалось скопировать VIN', 'error');
        });
    }

    // Показ уведомления
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d1fae5' : type === 'error' ? '#fee2e2' : '#dbeafe'};
            border: 1px solid ${type === 'success' ? '#a7f3d0' : type === 'error' ? '#fecaca' : '#93c5fd'};
            border-radius: 8px;
            padding: 15px;
            z-index: 3000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Глобальные функции для кнопок
function copyVIN() {
    const vin = document.getElementById('vinNumber').textContent;
    navigator.clipboard.writeText(vin).then(() => {
        showNotification('VIN скопирован в буфер обмена', 'success');
    });
}

function printReport() {
    window.print();
}

function downloadPDF() {
    showNotification('Функция экспорта в PDF будет доступна в следующей версии', 'info');
}

function checkAnotherVIN() {
    window.location.href = 'index.html';
}

function subscribe() {
    showNotification('Функция подписки будет доступна в следующей версии', 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d1fae5' : type === 'error' ? '#fee2e2' : '#dbeafe'};
        border: 1px solid ${type === 'success' ? '#a7f3d0' : type === 'error' ? '#fecaca' : '#93c5fd'};
        border-radius: 8px;
        padding: 15px;
        z-index: 3000;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new VINReport();
});
