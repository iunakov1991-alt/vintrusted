#!/usr/bin/env node

/**
 * MONSTER 7.x: Интеграция системы правил с генератором статей
 * Загружает правила из rules.json и применяет их к генерации и валидации
 */

const fs = require('fs');
const path = require('path');
const { log, error } = require('../logger');

class RuleEngineIntegration {
  constructor() {
    this.rules = null;
    this.rulesPath = path.join(process.cwd(), 'rules', 'rules.json');
    this.loadRules();
  }

  /**
   * Загрузка правил из rules.json
   */
  loadRules() {
    try {
      if (fs.existsSync(this.rulesPath)) {
        this.rules = JSON.parse(fs.readFileSync(this.rulesPath, 'utf8'));
        log('RULE-ENGINE', `Loaded ${this.rules.rules?.length || 0} rules from rules.json`);
        return true;
      } else {
        log('RULE-ENGINE', `Rules file not found at ${this.rulesPath}, using defaults`);
        return false;
      }
    } catch (e) {
      error('RULE-ENGINE', `Error loading rules: ${e.message}`);
      return false;
    }
  }

  /**
   * Получить правила для конкретного типа и scope
   */
  getRules(type = null, scope = null, stage = 'deep') {
    if (!this.rules || !this.rules.rules) return [];

    return this.rules.rules.filter(rule => {
      // Фильтр по типу
      if (type && rule.type !== type) return false;
      
      // Фильтр по scope
      if (scope && rule.scope !== scope) return false;
      
      // Фильтр по stage
      const stageMin = rule.meta?.stage_min || 'deep';
      const stageMax = rule.meta?.stage_max || 'prod';
      const stageOrder = { 'deep': 0, 'medium': 1, 'light': 2, 'prod': 3 };
      const currentStage = stageOrder[stage] || 0;
      const minStage = stageOrder[stageMin] || 0;
      const maxStage = stageOrder[stageMax] || 3;
      
      if (currentStage < minStage || currentStage > maxStage) return false;
      
      return true;
    });
  }

  /**
   * Применить правила к контенту блока
   */
  applyRulesToBlock(blockType, content, stage = 'deep') {
    if (!this.rules) return content;

    let fixed = content;
    const blockRules = this.getRules(null, 'block', stage).filter(rule => {
      return !rule.applies_to || rule.applies_to.includes(blockType);
    });

    for (const rule of blockRules) {
      if (rule.action === 'auto_fix' && rule.replacement) {
        try {
          const regex = new RegExp(rule.pattern, 'gm');
          const before = fixed;
          fixed = fixed.replace(regex, rule.replacement);
          if (before !== fixed) {
            log('RULE-ENGINE', `Applied rule ${rule.id} to block ${blockType}`);
            this.trackRuleUsage(rule.id);
          }
        } catch (e) {
          error('RULE-ENGINE', `Error applying rule ${rule.id}: ${e.message}`);
        }
      }
    }

    return fixed;
  }

  /**
   * Проверить обязательные блоки согласно правилам
   */
  checkRequiredBlocks(blocks, stage = 'deep') {
    const errors = [];
    const warnings = [];

    const requiredBlockRules = this.getRules('structure', 'article', stage).filter(
      rule => rule.action === 'require_block'
    );

    for (const rule of requiredBlockRules) {
      const requiredBlocks = rule.applies_to || [];
      for (const blockType of requiredBlocks) {
        const block = blocks.find(b => b.type === blockType);
        if (!block || !block.content || block.content.trim().length < (rule.meta?.min_words || 0)) {
          errors.push(`Required block "${blockType}" is missing or too short`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Отслеживание использования правил
   */
  trackRuleUsage(ruleId) {
    if (!this.rules) return;
    
    if (!this.rules.stats) {
      this.rules.stats = { usage: {} };
    }
    
    if (!this.rules.stats.usage) {
      this.rules.stats.usage = {};
    }
    
    this.rules.stats.usage[ruleId] = (this.rules.stats.usage[ruleId] || 0) + 1;
    
    // Сохраняем обновленную статистику
    try {
      fs.writeFileSync(this.rulesPath, JSON.stringify(this.rules, null, 2), 'utf8');
    } catch (e) {
      error('RULE-ENGINE', `Error saving rule usage: ${e.message}`);
    }
  }

  /**
   * Получить статистику использования правил
   */
  getStats() {
    if (!this.rules || !this.rules.stats) {
      return { usage: {} };
    }
    return this.rules.stats;
  }
}

module.exports = { RuleEngineIntegration };


















