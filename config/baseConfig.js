// 基础配置管理器
// 包含远程配置管理器和必要的默认配置
// 所有站点配置已迁移到 siteHandlers.json

// 默认收藏站点数组
const defaultFavoriteSites = [{
  name: "ChatGPT"
}];

// 默认模式设置
const defaultModes = {
  // 支持iframe 的页面在一个单窗口模式
  iframe: false

};



// 默认入口配置
const buttonConfig = {
  floatButton: true,
  selectionSearch: true,
  contextMenu: true,
  searchEngine: true
};

// 外部链接配置
const externalLinks = {
  uninstallSurvey: 'https://wenjuan.feishu.cn/m?t=sxcO29Fz913i-1ad4',
  feedbackSurvey: 'https://wenjuan.feishu.cn/m/cfm?t=sTFPGe4oetOi-9m3a'
};

// 远程配置更新功能（仅更新配置数据，不更新代码）
const RemoteConfigManager = {
  // 远程配置服务器
  configUrl: 'https://raw.githubusercontent.com/taoAIGC/AI-Shortcuts/main/config/siteHandlers.json',
  
  // 检查并更新配置
  async checkAndUpdateConfig() {
    try {
      const response = await fetch(this.configUrl);
      if (!response.ok) {
        throw new Error(`配置服务器错误: ${response.status}`);
      }
      
      const remoteConfig = await response.json();
      const remoteVersion = remoteConfig.version || Date.now();
      
      // 获取本地版本
      const localVersion = await this.getLocalVersion();
      
      if (remoteVersion !== localVersion) {
        console.log('发现新版本的站点配置，准备更新...');
        
        // 更新本地存储的配置
        await this.updateLocalConfig(remoteConfig);
        
        return {
          hasUpdate: true,
          config: remoteConfig,
          version: remoteVersion
        };
      }
      
      return { hasUpdate: false };
    } catch (error) {
      console.error('检查配置更新失败:', error);
      return { hasUpdate: false, error: error.message };
    }
  },
  
  // 获取本地版本
  async getLocalVersion() {
    try {
      const result = await chrome.storage.local.get('siteConfigVersion');
      return result.siteConfigVersion || 0;
    } catch (error) {
      console.error('获取本地版本失败:', error);
      return 0;
    }
  },
  
  // 更新本地配置
  async updateLocalConfig(remoteConfig) {
    try {
      await chrome.storage.local.set({
        siteConfigVersion: remoteConfig.version || Date.now(),
        remoteSiteHandlers: remoteConfig
      });
      console.log('本地配置已更新');
    } catch (error) {
      console.error('更新本地配置失败:', error);
    }
  },
  
  // 获取当前站点处理器
  async getCurrentSiteHandlers() {
    try {
      const result = await chrome.storage.local.get('remoteSiteHandlers');
      if (result.remoteSiteHandlers && result.remoteSiteHandlers.siteHandlers) {
        return result.remoteSiteHandlers.siteHandlers;
      }
      console.warn('未找到远程站点处理器配置');
      return {};
    } catch (error) {
      console.error('获取当前站点处理器失败:', error);
      return {};
    }
  },
  
  // 获取当前站点列表
  async getCurrentSites(language = 'CN') {
    try {
      const result = await chrome.storage.local.get('remoteSiteHandlers');
      if (result.remoteSiteHandlers && result.remoteSiteHandlers.sites) {
        return result.remoteSiteHandlers.sites;
      }
      console.warn('未找到远程站点配置');
      return [];
    } catch (error) {
      console.error('获取当前站点列表失败:', error);
      return [];
    }
  },
  
  // 自动检查更新
  async autoCheckUpdate() {
    return await this.checkAndUpdateConfig();
  }
};

// Service Worker环境
if (typeof window === 'undefined') {
  const language = navigator.language.toLowerCase();
  console.log('当前语言:', language);
  // 站点配置现在通过 getDefaultSites() 动态获取
   
  // 动态获取站点配置
  self.getDefaultSites = async function() {
    try {
      if (self.RemoteConfigManager) {
        const sites = await self.RemoteConfigManager.getCurrentSites();
        if (sites && sites.length > 0) {
          return sites;
        }
      }
      
      // 如果远程配置不可用，尝试从本地文件加载
      console.log('远程配置不可用，尝试从本地文件加载');
      try {
        const response = await fetch(chrome.runtime.getURL('config/siteHandlers.json'));
        if (response.ok) {
          const localConfig = await response.json();
          if (localConfig.sites && localConfig.sites.length > 0) {
            console.log('从本地文件加载站点配置成功');
            return localConfig.sites;
          }
        }
      } catch (error) {
        console.error('从本地文件加载配置失败:', error);
      }
      
      console.warn('无法获取站点配置，返回空数组');
      return [];
    } catch (error) {
      console.error('获取默认站点配置失败:', error);
      return [];
    }
  };

  self.defaultFavoriteSites = defaultFavoriteSites;
  self.buttonConfig = buttonConfig;
  self.externalLinks = externalLinks;
  self.RemoteConfigManager = RemoteConfigManager;
}
// 浏览器环境
else {
  const language = navigator.language.toLowerCase();
  console.log('当前语言:', language);
  
  // 动态获取站点配置
  window.getDefaultSites = async function() {
    if (window.RemoteConfigManager) {
      const lang = language.startsWith('zh') ? 'CN' : 'EN';
      return await window.RemoteConfigManager.getCurrentSites(lang);
    }
    return [];
  };
  
  window.defaultFavoriteSites = defaultFavoriteSites;
  window.buttonConfig = buttonConfig;
  window.externalLinks = externalLinks;
  window.RemoteConfigManager = RemoteConfigManager;
}

