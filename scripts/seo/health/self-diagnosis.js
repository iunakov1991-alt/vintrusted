const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { BuildHistory } = require('../analytics/build-history');

/**
 * SEO MONSTER 6.0: Self-Diagnosis
 * Самодиагностика системы
 */
class SelfDiagnosis {
  constructor(config) {
    this.config = config;
    this.buildHistory = new BuildHistory(config);
  }

  /**
   * Полная диагностика системы
   */
  diagnose() {
    const issues = [];
    const warnings = [];
    const info = [];

    // Проверка конфигурации
    const configIssues = this.checkConfiguration();
    issues.push(...configIssues.critical);
    warnings.push(...configIssues.warnings);
    info.push(...configIssues.info);

    // Проверка файловой системы
    const fsIssues = this.checkFileSystem();
    issues.push(...fsIssues.critical);
    warnings.push(...fsIssues.warnings);

    // Проверка истории билдов
    const historyIssues = this.checkBuildHistory();
    issues.push(...historyIssues.critical);
    warnings.push(...historyIssues.warnings);

    // Проверка производительности
    const perfIssues = this.checkPerformance();
    issues.push(...perfIssues.critical);
    warnings.push(...perfIssues.warnings);

    // Проверка качества
    const qualityIssues = this.checkQuality();
    issues.push(...qualityIssues.critical);
    warnings.push(...qualityIssues.warnings);

    const diagnosis = {
      timestamp: new Date().toISOString(),
      status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy',
      issues: issues,
      warnings: warnings,
      info: info,
      score: this.calculateHealthScore(issues, warnings)
    };

    return diagnosis;
  }

  /**
   * Проверка конфигурации
   */
  checkConfiguration() {
    const issues = [];
    const warnings = [];
    const info = [];

    const configPath = path.join(process.cwd(), 'data/seo/config.json');
    if (!fs.existsSync(configPath)) {
      issues.push({
        type: 'configuration',
        severity: 'critical',
        message: 'Configuration file not found',
        path: configPath
      });
      return { critical: issues, warnings, info };
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (!config.targetPagesPerBuild || config.targetPagesPerBuild < 100) {
        warnings.push({
          type: 'configuration',
          severity: 'warning',
          message: 'targetPagesPerBuild is very low or not set',
          value: config.targetPagesPerBuild
        });
      }

      if (!config.minQualityScore || config.minQualityScore < 0.5) {
        warnings.push({
          type: 'configuration',
          severity: 'warning',
          message: 'minQualityScore is very low',
          value: config.minQualityScore
        });
      }

      if (config.enableAI && !process.env.DEEPSEEK_API_KEY) {
        warnings.push({
          type: 'configuration',
          severity: 'warning',
          message: 'AI is enabled but no API keys are configured'
        });
      }

      info.push({
        type: 'configuration',
        message: 'Configuration file is valid',
        targetPages: config.targetPagesPerBuild,
        minQuality: config.minQualityScore
      });
    } catch (e) {
      issues.push({
        type: 'configuration',
        severity: 'critical',
        message: 'Error reading configuration file',
        error: e.message
      });
    }

    return { critical: issues, warnings, info };
  }

  /**
   * Проверка файловой системы
   */
  checkFileSystem() {
    const issues = [];
    const warnings = [];

    const requiredDirs = [
      'data/seo',
      'public/vin',
      'public/seo/sitemaps'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        try {
          fs.mkdirSync(dirPath, { recursive: true });
          warnings.push({
            type: 'filesystem',
            severity: 'warning',
            message: `Directory was missing and has been created`,
            path: dir
          });
        } catch (e) {
          issues.push({
            type: 'filesystem',
            severity: 'critical',
            message: `Cannot create required directory`,
            path: dir,
            error: e.message
          });
        }
      }
    }

    return { critical: issues, warnings };
  }

  /**
   * Проверка истории билдов
   */
  checkBuildHistory() {
    const issues = [];
    const warnings = [];

    const history = this.buildHistory.getHistory(10);
    
    if (history.length === 0) {
      warnings.push({
        type: 'history',
        severity: 'warning',
        message: 'No build history found. This might be the first build.'
      });
      return { critical: issues, warnings };
    }

    const stats = this.buildHistory.getStatistics(7);
    
    // Проблемы истории не должны блокировать билд, только предупреждать
    if (stats.successRate < 0.3 && history.length > 5) {
      // Только если много билдов и очень низкий success rate
      warnings.push({
        type: 'history',
        severity: 'warning',
        message: `Low build success rate: ${(stats.successRate * 100).toFixed(1)}%`
      });
    } else if (stats.successRate < 0.8) {
      warnings.push({
        type: 'history',
        severity: 'warning',
        message: `Low build success rate: ${(stats.successRate * 100).toFixed(1)}%`
      });
    }

    if (stats.avgQuality < 0.6) {
      issues.push({
        type: 'history',
        severity: 'critical',
        message: `Very low average quality: ${stats.avgQuality.toFixed(3)}`
      });
    } else if (stats.avgQuality < 0.7) {
      warnings.push({
        type: 'history',
        severity: 'warning',
        message: `Low average quality: ${stats.avgQuality.toFixed(3)}`
      });
    }

    return { critical: issues, warnings };
  }

  /**
   * Проверка производительности
   */
  checkPerformance() {
    const issues = [];
    const warnings = [];

    const stats = this.buildHistory.getStatistics(7);
    
    if (stats.avgDuration > 600000) { // 10 минут
      issues.push({
        type: 'performance',
        severity: 'critical',
        message: `Average build duration is very high: ${(stats.avgDuration / 1000 / 60).toFixed(1)} minutes`
      });
    } else if (stats.avgDuration > 300000) { // 5 минут
      warnings.push({
        type: 'performance',
        severity: 'warning',
        message: `Average build duration is high: ${(stats.avgDuration / 1000 / 60).toFixed(1)} minutes`
      });
    }

    return { critical: issues, warnings };
  }

  /**
   * Проверка качества
   */
  checkQuality() {
    const issues = [];
    const warnings = [];

    const history = this.buildHistory.getHistory(10);
    
    if (history.length === 0) return { critical: issues, warnings };

    const recent = history.slice(0, 3);
    const acceptanceRates = recent.map(r => {
      if (r.pagesGenerated === 0) return 1;
      return r.pagesAccepted / r.pagesGenerated;
    });

    const avgAcceptanceRate = acceptanceRates.reduce((a, b) => a + b, 0) / acceptanceRates.length;

    // Проблемы качества не должны блокировать билд, только предупреждать
    if (avgAcceptanceRate < 0.3 && history.length > 3) {
      // Только если это не первый билд и rate очень низкий
      warnings.push({
        type: 'quality',
        severity: 'warning',
        message: `Low page acceptance rate: ${(avgAcceptanceRate * 100).toFixed(1)}%`
      });
    } else if (avgAcceptanceRate < 0.7) {
      warnings.push({
        type: 'quality',
        severity: 'warning',
        message: `Low page acceptance rate: ${(avgAcceptanceRate * 100).toFixed(1)}%`
      });
    }

    return { critical: issues, warnings };
  }

  /**
   * Расчет health score
   */
  calculateHealthScore(issues, warnings) {
    let score = 100;
    score -= issues.length * 20;
    score -= warnings.length * 5;
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = { SelfDiagnosis };

