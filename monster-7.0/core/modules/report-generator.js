/**
 * REPORT GENERATOR
 * 
 * Генерирует отчеты о работе системы.
 * Экспорт результатов в различных форматах.
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(config) {
    this.config = config;
    this.reportsPath = path.join(process.cwd(), 'data/reports');
  }

  async execute(params = {}) {
    const { results, format = 'json' } = params;

    const report = await this.generateReport(results);

    // Сохранение отчета
    const savedPath = await this.saveReport(report, format);

    return {
      report,
      path: savedPath,
      format
    };
  }

  async generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      version: '7.0',
      summary: this.generateSummary(results),
      modules: this.generateModuleReports(results),
      metrics: this.generateMetrics(results),
      recommendations: this.generateRecommendations(results)
    };

    return report;
  }

  generateSummary(results) {
    const summary = {
      totalPages: 0,
      totalTasks: 0,
      successRate: 0,
      averageQuality: 0,
      duration: 0
    };

    if (results.content && results.content.result) {
      summary.totalPages = results.content.result.pages?.length || 0;
    }

    if (results.performance && results.performance.result) {
      const perf = results.performance.result;
      summary.averageQuality = perf.stats?.averageScore || 0;
    }

    return summary;
  }

  generateModuleReports(results) {
    const modules = {};

    Object.keys(results).forEach(key => {
      if (results[key] && results[key].result) {
        modules[key] = {
          status: 'completed',
          result: results[key].result,
          timestamp: results[key].result.timestamp || new Date().toISOString()
        };
      }
    });

    return modules;
  }

  generateMetrics(results) {
    const metrics = {
      semantic: {},
      strategy: {},
      content: {},
      performance: {}
    };

    if (results.semanticMap && results.semanticMap.result) {
      const semantic = results.semanticMap.result;
      metrics.semantic = {
        themes: semantic.themes?.length || 0,
        clusters: semantic.clusters?.length || 0,
        keywords: semantic.keywords?.length || 0,
        coverage: semantic.coverage?.overall || 0
      };
    }

    if (results.strategy && results.strategy.result) {
      const strategy = results.strategy.result;
      metrics.strategy = {
        targetPages: strategy.targetPages || 0,
        priorities: strategy.priorities?.length || 0,
        clusters: strategy.clusters?.length || 0
      };
    }

    if (results.content && results.content.result) {
      const content = results.content.result;
      metrics.content = {
        generated: content.stats?.generated || 0,
        cached: content.stats?.cached || 0,
        errors: content.stats?.errors || 0
      };
    }

    if (results.performance && results.performance.result) {
      const perf = results.performance.result;
      metrics.performance = {
        best: perf.analysis?.best?.length || 0,
        average: perf.analysis?.average?.length || 0,
        worst: perf.analysis?.worst?.length || 0,
        averageScore: perf.stats?.averageScore || 0
      };
    }

    return metrics;
  }

  generateRecommendations(results) {
    const recommendations = [];

    // Рекомендации на основе метрик
    if (results.performance && results.performance.result) {
      const perf = results.performance.result;
      if (perf.stats && perf.stats.averageScore < 0.7) {
        recommendations.push({
          type: 'quality',
          priority: 'high',
          message: 'Average quality score is below 0.7. Consider improving content depth and structure.',
          action: 'Increase content depth, improve E-E-A-T signals'
        });
      }
    }

    if (results.semanticMap && results.semanticMap.result) {
      const semantic = results.semanticMap.result;
      if (semantic.gaps && semantic.gaps.length > 0) {
        recommendations.push({
          type: 'coverage',
          priority: 'high',
          message: `Found ${semantic.gaps.length} content gaps. Consider filling them.`,
          action: 'Generate content for missing themes and topics'
        });
      }
    }

    if (results.content && results.content.result) {
      const content = results.content.result;
      if (content.stats && content.stats.errors > 0) {
        recommendations.push({
          type: 'errors',
          priority: 'medium',
          message: `Found ${content.stats.errors} errors during content generation.`,
          action: 'Review error logs and fix issues'
        });
      }
    }

    return recommendations;
  }

  async saveReport(report, format) {
    if (!fs.existsSync(this.reportsPath)) {
      fs.mkdirSync(this.reportsPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filePath;
    let content;

    switch (format) {
      case 'json':
        filePath = path.join(this.reportsPath, `report_${timestamp}.json`);
        content = JSON.stringify(report, null, 2);
        break;
      case 'html':
        filePath = path.join(this.reportsPath, `report_${timestamp}.html`);
        content = this.generateHTMLReport(report);
        break;
      case 'markdown':
        filePath = path.join(this.reportsPath, `report_${timestamp}.md`);
        content = this.generateMarkdownReport(report);
        break;
      default:
        filePath = path.join(this.reportsPath, `report_${timestamp}.json`);
        content = JSON.stringify(report, null, 2);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monster 7.0 Report - ${new Date(report.timestamp).toLocaleString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #4CAF50; }
        h2 { color: #2196F3; margin-top: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f0f0f0; border-radius: 4px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .recommendation { padding: 10px; margin: 10px 0; border-left: 4px solid #FF9800; background: #fff3e0; }
        .recommendation.high { border-left-color: #F44336; background: #ffebee; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #4CAF50; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Monster 7.0 Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        
        <h2>Summary</h2>
        <div class="metric">
            <div>Total Pages</div>
            <div class="metric-value">${report.summary.totalPages}</div>
        </div>
        <div class="metric">
            <div>Average Quality</div>
            <div class="metric-value">${(report.summary.averageQuality * 100).toFixed(1)}%</div>
        </div>
        
        <h2>Metrics</h2>
        <table>
            <tr>
                <th>Category</th>
                <th>Value</th>
            </tr>
            ${Object.entries(report.metrics).map(([key, value]) => `
                <tr>
                    <td>${key}</td>
                    <td>${JSON.stringify(value)}</td>
                </tr>
            `).join('')}
        </table>
        
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <strong>${rec.type.toUpperCase()}</strong> (${rec.priority})
                <p>${rec.message}</p>
                <p><strong>Action:</strong> ${rec.action}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  generateMarkdownReport(report) {
    return `# 🚀 Monster 7.0 Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Total Pages:** ${report.summary.totalPages}
- **Average Quality:** ${(report.summary.averageQuality * 100).toFixed(1)}%
- **Success Rate:** ${(report.summary.successRate * 100).toFixed(1)}%

## Metrics

${Object.entries(report.metrics).map(([key, value]) => `
### ${key}
${JSON.stringify(value, null, 2)}
`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.type.toUpperCase()} (${rec.priority})

${rec.message}

**Action:** ${rec.action}
`).join('\n')}
`;
  }
}

module.exports = ReportGenerator;

