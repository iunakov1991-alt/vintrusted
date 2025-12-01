const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Real-time Dashboard API
 * Server-Sent Events для real-time обновления дашборда
 */
class RealtimeDashboardAPI {
  constructor(config) {
    this.config = config;
    this.clients = new Set();
    this.buildStatus = null;
    this.metrics = null;
  }

  /**
   * Добавление клиента (SSE connection)
   */
  addClient(res) {
    this.clients.add(res);
    log('REALTIME-DASHBOARD', `Client connected, total: ${this.clients.size}`);

    // Отправляем текущее состояние
    if (this.buildStatus) {
      this.sendToClient(res, 'build-status', this.buildStatus);
    }
    if (this.metrics) {
      this.sendToClient(res, 'metrics', this.metrics);
    }

    // Удаляем при отключении
    res.on('close', () => {
      this.clients.delete(res);
      log('REALTIME-DASHBOARD', `Client disconnected, total: ${this.clients.size}`);
    });
  }

  /**
   * Отправка данных клиенту
   */
  sendToClient(res, event, data) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Клиент отключился
      this.clients.delete(res);
    }
  }

  /**
   * Broadcast всем клиентам
   */
  broadcast(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (e) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Обновление статуса билда
   */
  updateBuildStatus(status) {
    this.buildStatus = status;
    this.broadcast('build-status', status);
  }

  /**
   * Обновление метрик
   */
  updateMetrics(metrics) {
    this.metrics = metrics;
    this.broadcast('metrics', metrics);
  }

  /**
   * Обновление прогресса
   */
  updateProgress(progress) {
    this.broadcast('progress', progress);
  }

  /**
   * Обработчик SSE запроса
   */
  handleSSERequest(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    this.addClient(res);

    // Keep-alive ping каждые 30 секунд
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(pingInterval);
        this.clients.delete(res);
      }
    }, 30000);

    // Очистка при отключении
    res.on('close', () => {
      clearInterval(pingInterval);
      this.clients.delete(res);
    });
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      hasBuildStatus: !!this.buildStatus,
      hasMetrics: !!this.metrics
    };
  }
}

module.exports = { RealtimeDashboardAPI };


