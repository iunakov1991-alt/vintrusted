const { log } = require('../logger');

/**
 * SEO MONSTER 6.0: Internal Links Engine
 * Генерация внутренних ссылок с учетом кластеров и графа
 */
class InternalLinksEngine {
  constructor(config) {
    this.config = config;
    this.minLinks = config.internalLinksPerPage?.min || 1;
    this.maxLinks = config.internalLinksPerPage?.max || 3;
  }

  /**
   * Генерация внутренних ссылок для страницы
   */
  generateInternalLinks(page, allPages, clusterEngine) {
    const links = [];
    const used = new Set();
    
    // 1. Ссылка в пределах кластера
    const cluster = clusterEngine.getCluster(page.clusterId);
    if (cluster && cluster.pages.length > 1) {
      const clusterPages = cluster.pages.filter(p => p.url !== page.url);
      if (clusterPages.length > 0) {
        const neighbor = clusterPages[Math.floor(Math.random() * clusterPages.length)];
        if (!used.has(neighbor.url)) {
          links.push({
            href: neighbor.url,
            label: this.buildLinkLabel(neighbor)
          });
          used.add(neighbor.url);
        }
      }
    }

    // 2. Ссылки по intent
    const sameIntent = allPages.filter(p => 
      p.intent === page.intent && 
      p.url !== page.url && 
      !used.has(p.url)
    );
    if (sameIntent.length > 0 && links.length < this.maxLinks) {
      const intentPage = sameIntent[Math.floor(Math.random() * sameIntent.length)];
      links.push({
        href: intentPage.url,
        label: this.buildLinkLabel(intentPage)
      });
      used.add(intentPage.url);
    }

    // 3. Ссылки по state
    const sameState = allPages.filter(p =>
      p.stateSlug === page.stateSlug &&
      p.url !== page.url &&
      !used.has(p.url)
    );
    if (sameState.length > 0 && links.length < this.maxLinks) {
      const statePage = sameState[Math.floor(Math.random() * sameState.length)];
      links.push({
        href: statePage.url,
        label: this.buildLinkLabel(statePage)
      });
      used.add(statePage.url);
    }

    // Ограничение количества ссылок
    return links.slice(0, this.maxLinks);
  }

  buildLinkLabel(page) {
    const stateLabel = (page.stateSlug || '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
    const makeUpper = (page.make || '').toUpperCase();
    return `${page.year} ${makeUpper} VIN check in ${stateLabel}`;
  }

  /**
   * Присоединение внутренних ссылок ко всем страницам
   */
  attachInternalLinks(pages, clusterEngine) {
    pages.forEach(page => {
      const links = this.generateInternalLinks(page, pages, clusterEngine);
      // Добавляем тип для нового template engine
      page.internalLinks = links.map(link => ({
        ...link,
        type: this.determineLinkType(link, page)
      }));
    });

    log('LINKS', `Internal links attached: avg ${(pages.reduce((sum, p) => sum + p.internalLinks.length, 0) / pages.length).toFixed(1)} per page`);
  }

  /**
   * Определение типа ссылки (state или make)
   */
  determineLinkType(link, page) {
    const linkUrl = link.href || '';
    if (linkUrl.includes(page.stateSlug)) {
      return 'state';
    }
    if (linkUrl.includes(page.make)) {
      return 'make';
    }
    return 'general';
  }
}

module.exports = { InternalLinksEngine };

