const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Baseline Blocks
 * Генерик шаблон без AI - всегда безопасный
 */
class BaselineBlocks {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  initializeTemplates() {
    return {
      keyFacts: (stateLabel) => [
        `Covers title, ownership, odometer and basic accident history for this VIN.`,
        `Uses multiple data sources (DMV, auctions, insurance records where available).`,
        `Helps you avoid overpaying for vehicles with hidden issues in ${stateLabel}.`
      ],
      featureTable: () => [
        {
          type: 'Title & ownership',
          what: 'Number of owners, title transfers, possible title brands.',
          why: 'Helps detect frequently flipped or branded vehicles.'
        },
        {
          type: 'Accident & damage',
          what: 'Reported collisions, total loss events, auction announcements.',
          why: 'Shows history of serious incidents that may affect safety.'
        },
        {
          type: 'Odometer readings',
          what: 'Mileage recorded at inspections, registrations and sales.',
          why: 'Helps reveal unrealistic jumps or rollbacks.'
        },
        {
          type: 'Usage patterns',
          what: 'Private, commercial or fleet use where available.',
          why: 'Explains why some vehicles have higher wear.'
        }
      ],
      comparison: () => [
        {
          type: 'Free VIN check',
          description: 'basic format validation and limited open data; often no detailed history.'
        },
        {
          type: 'Full report',
          description: 'aggregated data from DMVs, insurance and auctions where available, with clearer risk signals.'
        },
        {
          type: 'Best practice',
          description: 'use a full report before paying a deposit or signing a bill of sale.'
        }
      ],
      faq: () => [
        {
          q: 'What is a VIN check?',
          a: 'A VIN check is a report built from multiple data sources that helps you understand the history of a specific vehicle before you buy or insure it.'
        },
        {
          q: 'Does this report show every accident?',
          a: 'Reports usually show incidents reported to insurance, DMVs or auctions, but not every minor event is guaranteed to appear.'
        },
        {
          q: 'Can I use a VIN report to negotiate price?',
          a: 'Yes. A clear report often supports the asking price, while issues like prior accidents, salvage history or odometer concerns are strong arguments for a discount.'
        }
      ],
      localInsights: (stateLabel) => 
        `Vehicle title and registration rules in ${stateLabel} can affect how salvage, rebuilt and branded titles are recorded. A detailed VIN report helps you understand how many owners the vehicle had, how often it was registered, and whether it ever appeared at auctions or insurance events in ${stateLabel}.`
    };
  }

  /**
   * Генерация baseline контента для всех новых блоков
   */
  generateBaselineContent(item) {
    const stateLabel = this.humanizeStateSlug(item.stateSlug);
    const make = item.make || 'Vehicle';
    const year = item.year || '';
    const vin = item.vin || '';
    const intent = item.intent || 'vin_check';
    
    return {
      // Hero
      heroSummary: `Complete VIN history report for ${year} ${make} in ${stateLabel}. Get detailed information about title, accidents, ownership, and more.`,
      
      // Key Facts (как карточки)
      keyFacts: [
        { label: 'VIN', value: vin },
        { label: 'State', value: stateLabel },
        { label: 'Make', value: make },
        { label: 'Year', value: year },
        { label: 'Report Type', value: intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { label: 'Data Sources', value: 'DMV, Insurance, Auctions' }
      ],
      
      // Deep Explanation
      deepExplanation: `A comprehensive VIN report provides crucial information about a vehicle's history, helping buyers make informed decisions. This report aggregates data from multiple sources including state DMV records, insurance databases, and auction listings to give you a complete picture of the vehicle's past.`,
      
      // State Insights
      stateInsights: this.templates.localInsights(stateLabel),
      
      // Common Risks
      commonRisks: [
        'Title branding issues (salvage, flood, rebuilt)',
        'Undisclosed accident history',
        'Odometer rollback or tampering',
        'Active liens or loans',
        'Theft records or recovery history',
        'Multiple owners in short timeframe'
      ],
      
      // Market Value
      marketValue: {
        retail: { min: 15000, max: 25000 },
        tradeIn: { min: 12000, max: 20000 }
      },
      
      // Feature Table (legacy)
      featureTable: this.templates.featureTable(),
      
      // Comparison (legacy)
      comparison: this.templates.comparison(),
      
      // FAQ
      faq: this.templates.faq(),
      
      // Local Insights (legacy)
      localInsights: this.templates.localInsights(stateLabel)
    };
  }

  humanizeStateSlug(slug) {
    if (!slug) return 'your state';
    const s = slug.replace(/-/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

module.exports = { BaselineBlocks };

