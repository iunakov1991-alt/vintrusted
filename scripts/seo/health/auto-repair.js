const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');
const { SelfDiagnosis } = require('./self-diagnosis');

/**
 * SEO MONSTER 6.0: Auto-Repair
 * Автоматическое исправление проблем
 */
class AutoRepair {
  constructor(config) {
    this.config = config;
    this.selfDiagnosis = new SelfDiagnosis(config);
  }

  /**
   * Автоматическое исправление проблем
   */
  async repair() {
    const diagnosis = this.selfDiagnosis.diagnose();
    const repairs = [];

    log('REPAIR', `Starting auto-repair. Issues: ${diagnosis.issues.length}, Warnings: ${diagnosis.warnings.length}`);

    // Исправление критических проблем
    for (const issue of diagnosis.issues) {
      const repair = await this.repairIssue(issue);
      if (repair) {
        repairs.push(repair);
      }
    }

    // Исправление предупреждений (опционально)
    for (const warning of diagnosis.warnings) {
      if (this.shouldRepairWarning(warning)) {
        const repair = await this.repairWarning(warning);
        if (repair) {
          repairs.push(repair);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      issuesFound: diagnosis.issues.length,
      warningsFound: diagnosis.warnings.length,
      repairsApplied: repairs.length,
      repairs: repairs,
      status: repairs.length > 0 ? 'repaired' : 'no_repairs_needed'
    };
  }

  /**
   * Исправление конкретной проблемы
   */
  async repairIssue(issue) {
    try {
      switch (issue.type) {
        case 'filesystem':
          return await this.repairFileSystem(issue);
        case 'configuration':
          return await this.repairConfiguration(issue);
        default:
          log('REPAIR', `No auto-repair available for issue type: ${issue.type}`);
          return null;
      }
    } catch (e) {
      error('REPAIR', `Error repairing issue: ${issue.type}`, e);
      return null;
    }
  }

  /**
   * Исправление проблем файловой системы
   */
  async repairFileSystem(issue) {
    if (issue.path) {
      const dirPath = path.join(process.cwd(), issue.path);
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          log('REPAIR', `Created directory: ${issue.path}`);
          return {
            type: 'filesystem',
            action: 'created_directory',
            path: issue.path,
            success: true
          };
        }
      } catch (e) {
        error('REPAIR', `Failed to create directory: ${issue.path}`, e);
        return {
          type: 'filesystem',
          action: 'created_directory',
          path: issue.path,
          success: false,
          error: e.message
        };
      }
    }
    return null;
  }

  /**
   * Исправление проблем конфигурации
   */
  async repairConfiguration(issue) {
    const configPath = path.join(process.cwd(), 'data/seo/config.json');
    
    if (!fs.existsSync(configPath)) {
      // Создаем базовую конфигурацию
      const defaultConfig = {
        version: '6.0',
        targetPagesPerBuild: 10000,
        maxPagesPerCluster: 500,
        minQualityScore: 0.75,
        enableAI: false,
        layoutCount: 9
      };

      try {
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        log('REPAIR', `Created default configuration file`);
        return {
          type: 'configuration',
          action: 'created_default_config',
          success: true
        };
      } catch (e) {
        error('REPAIR', `Failed to create configuration file`, e);
        return {
          type: 'configuration',
          action: 'created_default_config',
          success: false,
          error: e.message
        };
      }
    }

    // Исправление значений конфигурации
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      let modified = false;

      if (!config.targetPagesPerBuild || config.targetPagesPerBuild < 100) {
        config.targetPagesPerBuild = 10000;
        modified = true;
      }

      if (!config.minQualityScore || config.minQualityScore < 0.5) {
        config.minQualityScore = 0.75;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        log('REPAIR', `Updated configuration with default values`);
        return {
          type: 'configuration',
          action: 'updated_config',
          success: true
        };
      }
    } catch (e) {
      error('REPAIR', `Error reading/updating configuration`, e);
      return {
        type: 'configuration',
        action: 'updated_config',
        success: false,
        error: e.message
      };
    }

    return null;
  }

  /**
   * Исправление предупреждения
   */
  async repairWarning(warning) {
    // Для большинства предупреждений автоматическое исправление не требуется
    // Они служат только для информации
    log('REPAIR', `Warning detected: ${warning.type} - ${warning.message}`);
    return null;
  }

  /**
   * Определение, нужно ли исправлять предупреждение
   */
  shouldRepairWarning(warning) {
    // Исправляем только определенные типы предупреждений
    const repairableTypes = ['filesystem', 'configuration'];
    return repairableTypes.includes(warning.type);
  }

  /**
   * Проверка и исправление перед билдом
   */
  async preBuildCheck() {
    const diagnosis = this.selfDiagnosis.diagnose();
    
    if (diagnosis.status === 'critical') {
      log('REPAIR', 'Critical issues detected, attempting auto-repair...');
      const repairResult = await this.repair();
      
      if (repairResult.repairsApplied > 0) {
        log('REPAIR', `Applied ${repairResult.repairsApplied} repairs`);
      }
      
      // Повторная диагностика после исправления
      const newDiagnosis = this.selfDiagnosis.diagnose();
      if (newDiagnosis.status === 'critical') {
        error('REPAIR', 'Critical issues remain after auto-repair');
        return false;
      }
    }

    return true;
  }
}

module.exports = { AutoRepair };

