const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Build History
 * Отслеживание истории билдов и метрик
 */
class BuildHistory {
  constructor(config) {
    this.config = config;
    this.historyPath = path.join(process.cwd(), 'data/seo/build-history.jsonl');
    this.ensureHistoryFile();
  }

  ensureHistoryFile() {
    const dir = path.dirname(this.historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Запись записи о билде
   */
  recordBuild(buildData) {
    const record = {
      timestamp: new Date().toISOString(),
      buildId: buildData.buildId || 'unknown',
      pagesGenerated: buildData.pagesGenerated || 0,
      pagesAccepted: buildData.pagesAccepted || 0,
      avgQuality: buildData.avgQuality || 0,
      duration: buildData.duration || 0,
      clusters: buildData.clusters || 0,
      uniquePages: buildData.uniquePages || 0,
      aiEnabled: buildData.aiEnabled || false,
      config: {
        targetPages: buildData.config?.targetPagesPerBuild || 0,
        maxPagesPerCluster: buildData.config?.maxPagesPerCluster || 0,
        minQualityScore: buildData.config?.minQualityScore || 0
      }
    };

    try {
      fs.appendFileSync(this.historyPath, JSON.stringify(record) + '\n', 'utf8');
      log('HISTORY', `Build recorded: ${record.buildId}`);
    } catch (e) {
      log('HISTORY', `Error recording build: ${e.message}`);
    }

    return record;
  }

  /**
   * Получение истории билдов
   */
  getHistory(limit = 50) {
    if (!fs.existsSync(this.historyPath)) return [];

    try {
      const lines = fs.readFileSync(this.historyPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-limit);

      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      log('HISTORY', `Error reading history: ${e.message}`);
      return [];
    }
  }

  /**
   * Получение статистики по билдам
   */
  getStatistics(days = 30) {
    const history = this.getHistory(1000);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const recent = history.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= cutoff;
    });

    if (recent.length === 0) {
      return {
        totalBuilds: 0,
        avgPagesGenerated: 0,
        avgPagesAccepted: 0,
        avgQuality: 0,
        avgDuration: 0,
        successRate: 0
      };
    }

    const stats = {
      totalBuilds: recent.length,
      avgPagesGenerated: recent.reduce((sum, r) => sum + (r.pagesGenerated || 0), 0) / recent.length,
      avgPagesAccepted: recent.reduce((sum, r) => sum + (r.pagesAccepted || 0), 0) / recent.length,
      avgQuality: recent.reduce((sum, r) => sum + (r.avgQuality || 0), 0) / recent.length,
      avgDuration: recent.reduce((sum, r) => sum + (r.duration || 0), 0) / recent.length,
      successRate: recent.filter(r => (r.pagesAccepted || 0) > 0).length / recent.length
    };

    return stats;
  }

  /**
   * Получение последнего билда
   */
  getLastBuild() {
    const history = this.getHistory(1);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Сравнение с предыдущим билдом
   */
  compareWithPrevious(currentBuild) {
    const lastBuild = this.getLastBuild();
    if (!lastBuild) return null;

    return {
      pagesGenerated: {
        current: currentBuild.pagesGenerated || 0,
        previous: lastBuild.pagesGenerated || 0,
        change: (currentBuild.pagesGenerated || 0) - (lastBuild.pagesGenerated || 0)
      },
      pagesAccepted: {
        current: currentBuild.pagesAccepted || 0,
        previous: lastBuild.pagesAccepted || 0,
        change: (currentBuild.pagesAccepted || 0) - (lastBuild.pagesAccepted || 0)
      },
      avgQuality: {
        current: currentBuild.avgQuality || 0,
        previous: lastBuild.avgQuality || 0,
        change: (currentBuild.avgQuality || 0) - (lastBuild.avgQuality || 0)
      },
      duration: {
        current: currentBuild.duration || 0,
        previous: lastBuild.duration || 0,
        change: (currentBuild.duration || 0) - (lastBuild.duration || 0)
      }
    };
  }
}

module.exports = { BuildHistory };

