/**
 * 统一的站点检测和匹配系统
 * 提供高性能、准确的站点识别功能
 */

class SiteDetector {
  constructor() {
    this.sitesCache = null;
    this.cacheTimestamp = 0;
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    this.domainMappingsCache = null; // 动态从配置文件加载
    
    // 性能监控
    this.performanceStats = {
      cacheHits: 0,
      cacheMisses: 0,
      storageReads: 0,
      fallbackReads: 0,
      totalRequests: 0,
      averageResponseTime: 0
    };
    
    // 智能缓存策略
    this.adaptiveCacheTimeout = this.cacheTimeout;
    this.lastUpdateTime = 0;
  }

  /**
   * 获取站点配置（带缓存和性能监控）
   */
  async getSites() {
    const startTime = performance.now();
    this.performanceStats.totalRequests++;
    
    const now = Date.now();
    
    // 检查缓存是否有效
    if (this.sitesCache && (now - this.cacheTimestamp) < this.adaptiveCacheTimeout) {
      this.performanceStats.cacheHits++;
      const responseTime = performance.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      console.log(`✅ 缓存命中，响应时间: ${responseTime.toFixed(2)}ms`);
      return this.sitesCache;
    }
    
    this.performanceStats.cacheMisses++;

    try {
      let sites = [];
      
      // 1. 优先从 chrome.storage.local 读取站点配置
      try {
        this.performanceStats.storageReads++;
        const result = await chrome.storage.local.get('remoteSiteHandlers');
        sites = result.remoteSiteHandlers?.sites || [];
        if (sites.length > 0) {
          console.log('✅ 从 chrome.storage.local 加载站点配置成功，数量:', sites.length);
          console.log('📊 本地存储配置详情:', {
            totalSites: sites.length,
            hasContentExtractor: sites.filter(s => s.contentExtractor).length,
            hasSearchHandler: sites.filter(s => s.searchHandler).length,
            hasFileUploadHandler: sites.filter(s => s.fileUploadHandler).length
          });
        } else {
          console.log('⚠️ chrome.storage.local 中的站点配置为空');
        }
      } catch (storageError) {
        console.warn('❌ 从 chrome.storage.local 读取配置失败:', storageError);
        console.warn('💡 可能的原因: 存储权限问题、数据损坏或首次使用');
      }
      
      // 2. 如果本地存储为空，尝试从 getDefaultSites 获取（降级）
      if (!sites || sites.length === 0) {
        this.performanceStats.fallbackReads++;
        if (typeof window !== 'undefined' && window.getDefaultSites) {
          sites = await window.getDefaultSites();
          console.log('✅ 从 getDefaultSites 加载站点配置成功，数量:', sites.length);
        } else if (typeof self !== 'undefined' && self.getDefaultSites) {
          sites = await self.getDefaultSites();
          console.log('✅ 从 Service Worker getDefaultSites 加载站点配置成功，数量:', sites.length);
        }
      }

      // 更新缓存
      this.sitesCache = sites;
      this.cacheTimestamp = now;
      this.lastUpdateTime = now;
      
      // 计算响应时间并更新统计
      const responseTime = performance.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      
      console.log('✅ 站点配置加载完成，总数量:', sites.length, `响应时间: ${responseTime.toFixed(2)}ms`);
      return sites;
    } catch (error) {
      console.error('❌ 获取站点配置失败:', error);
      const responseTime = performance.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      return this.sitesCache || []; // 返回缓存或空数组
    }
  }

  /**
   * 更新平均响应时间
   */
  updateAverageResponseTime(responseTime) {
    const totalRequests = this.performanceStats.totalRequests;
    if (totalRequests === 1) {
      this.performanceStats.averageResponseTime = responseTime;
    } else {
      this.performanceStats.averageResponseTime = 
        (this.performanceStats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats() {
    const cacheHitRate = this.performanceStats.totalRequests > 0 
      ? (this.performanceStats.cacheHits / this.performanceStats.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.performanceStats,
      cacheHitRate: `${cacheHitRate}%`,
      adaptiveCacheTimeout: this.adaptiveCacheTimeout,
      cacheAge: this.sitesCache ? Date.now() - this.cacheTimestamp : 0
    };
  }

  /**
   * 智能调整缓存超时时间
   */
  adjustCacheTimeout() {
    const hitRate = this.performanceStats.cacheHits / this.performanceStats.totalRequests;
    
    if (hitRate > 0.8) {
      // 缓存命中率高，增加缓存时间
      this.adaptiveCacheTimeout = Math.min(this.cacheTimeout * 2, 30 * 60 * 1000); // 最多30分钟
      console.log(`📈 缓存命中率高(${(hitRate * 100).toFixed(1)}%)，增加缓存时间到 ${this.adaptiveCacheTimeout / 1000 / 60} 分钟`);
    } else if (hitRate < 0.3) {
      // 缓存命中率低，减少缓存时间
      this.adaptiveCacheTimeout = Math.max(this.cacheTimeout / 2, 1 * 60 * 1000); // 最少1分钟
      console.log(`📉 缓存命中率低(${(hitRate * 100).toFixed(1)}%)，减少缓存时间到 ${this.adaptiveCacheTimeout / 1000 / 60} 分钟`);
    }
  }

  /**
   * 从站点配置动态构建域名映射
   */
  async buildDomainMappings() {
    if (this.domainMappingsCache) {
      return this.domainMappingsCache;
    }

    try {
      const sites = await this.getSites();
      const mappings = {};
      
      for (const site of sites) {
        if (site.url && site.name) {
          try {
            const siteUrl = new URL(site.url);
            const domain = this.normalizeDomain(siteUrl.hostname);
            mappings[domain] = site.name;
          } catch (urlError) {
            console.warn('URL 解析失败:', site.url, urlError);
          }
        }
      }
      
      this.domainMappingsCache = mappings;
      console.log('✅ 动态构建域名映射完成，数量:', Object.keys(mappings).length);
      return mappings;
    } catch (error) {
      console.error('❌ 构建域名映射失败:', error);
      return {};
    }
  }

  /**
   * 标准化域名
   */
  normalizeDomain(domain) {
    if (!domain) return '';
    
    // 移除 www. 前缀
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    // 转换为小写
    return domain.toLowerCase();
  }

  /**
   * 检查域名匹配
   */
  isDomainMatch(currentDomain, targetDomain) {
    const normalizedCurrent = this.normalizeDomain(currentDomain);
    const normalizedTarget = this.normalizeDomain(targetDomain);
    
    // 精确匹配
    if (normalizedCurrent === normalizedTarget) {
      return { match: true, type: 'exact' };
    }
    
    // 包含匹配（更严格的逻辑）
    if (normalizedCurrent.includes(normalizedTarget) && 
        normalizedTarget.length > 3) { // 避免过短的域名匹配
      return { match: true, type: 'contains' };
    }
    
    return { match: false, type: 'none' };
  }

  /**
   * 根据域名查找站点配置
   */
  async findSiteByDomain(domain) {
    try {
      const sites = await this.getSites();
      const normalizedDomain = this.normalizeDomain(domain);
      
      // 按优先级排序：精确匹配 > 包含匹配 > 其他
      const matches = [];
      
      for (const site of sites) {
        if (!site.url || site.hidden) continue;
        
        try {
          const siteUrl = new URL(site.url);
          const siteDomain = siteUrl.hostname;
          const matchResult = this.isDomainMatch(normalizedDomain, siteDomain);
          
          if (matchResult.match) {
            matches.push({
              site,
              matchType: matchResult.type,
              priority: matchResult.type === 'exact' ? 1 : 2
            });
          }
        } catch (urlError) {
          console.warn('URL 解析失败:', site.url, urlError);
          continue;
        }
      }
      
      // 按优先级排序，返回最佳匹配
      if (matches.length > 0) {
        matches.sort((a, b) => a.priority - b.priority);
        const bestMatch = matches[0];
        
        console.log(`✅ 找到站点匹配: ${bestMatch.site.name} (${bestMatch.matchType})`);
        return {
          ...bestMatch.site,
          matchType: bestMatch.matchType
        };
      }
      
      console.warn('⚠️ 未找到匹配的站点配置:', domain);
      return null;
    } catch (error) {
      console.error('❌ 站点查找失败:', error);
      return null;
    }
  }

  /**
   * 根据域名推断站点名称
   */
  async getSiteNameFromDomain(domain) {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const domainMappings = await this.buildDomainMappings();
      
      // 直接匹配
      if (domainMappings[normalizedDomain]) {
        return domainMappings[normalizedDomain];
      }
      
      // 部分匹配
      for (const [key, value] of Object.entries(domainMappings)) {
        if (normalizedDomain.includes(key)) {
          return value;
        }
      }
      
      // 如果都不匹配，返回格式化的域名
      return normalizedDomain.charAt(0).toUpperCase() + normalizedDomain.slice(1);
    } catch (error) {
      console.error('❌ 获取站点名称失败:', error);
      // 降级处理：返回格式化的域名
      const normalizedDomain = this.normalizeDomain(domain);
      return normalizedDomain.charAt(0).toUpperCase() + normalizedDomain.slice(1);
    }
  }

  /**
   * 检查是否为 AI 站点
   */
  async isAISite(domain = null) {
    try {
      const targetDomain = domain || window.location.hostname;
      const site = await this.findSiteByDomain(targetDomain);
      return !!site;
    } catch (error) {
      console.error('❌ AI 站点检查失败:', error);
      return false;
    }
  }

  /**
   * 获取站点处理器（兼容现有接口）
   */
  async getSiteHandler(domain) {
    try {
      const site = await this.findSiteByDomain(domain);
      
      if (!site) {
        return null;
      }
      
      console.log(`✅ 获取站点处理器: ${site.name}`);
      return {
        name: site.name,
        searchHandler: site.searchHandler,
        fileUploadHandler: site.fileUploadHandler,
        contentExtractor: site.contentExtractor,
        supportUrlQuery: site.supportUrlQuery,
        matchType: site.matchType
      };
    } catch (error) {
      console.error('❌ 获取站点处理器失败:', error);
      return null;
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.sitesCache = null;
    this.domainMappingsCache = null;
    this.cacheTimestamp = 0;
    this.lastUpdateTime = 0;
    this.adaptiveCacheTimeout = this.cacheTimeout; // 重置为默认值
    console.log('🗑️ 站点配置和域名映射缓存已清除');
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats() {
    this.performanceStats = {
      cacheHits: 0,
      cacheMisses: 0,
      storageReads: 0,
      fallbackReads: 0,
      totalRequests: 0,
      averageResponseTime: 0
    };
    console.log('📊 性能统计已重置');
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    const now = Date.now();
    const isExpired = (now - this.cacheTimestamp) >= this.cacheTimeout;
    
    return {
      hasCache: !!this.sitesCache,
      timestamp: this.cacheTimestamp,
      isExpired,
      age: now - this.cacheTimestamp
    };
  }
}

// 创建全局实例
const siteDetector = new SiteDetector();

// 导出函数（兼容现有代码）
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.siteDetector = siteDetector;
  window.getSiteHandler = (domain) => siteDetector.getSiteHandler(domain);
  window.isAISite = (domain) => siteDetector.isAISite(domain);
  window.getSiteNameFromDomain = (domain) => siteDetector.getSiteNameFromDomain(domain);
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.siteDetector = siteDetector;
  self.getSiteHandler = (domain) => siteDetector.getSiteHandler(domain);
  self.isAISite = (domain) => siteDetector.isAISite(domain);
  self.getSiteNameFromDomain = (domain) => siteDetector.getSiteNameFromDomain(domain);
}

// 模块导出（如果支持）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SiteDetector, siteDetector };
}
