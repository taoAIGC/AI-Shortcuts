

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

// 版本号比较函数
function compareVersions(version1, version2) {
  // 如果版本号相同，返回 0
  if (version1 === version2) {
    return 0;
  }
  
  // 处理时间戳格式的版本号
  if (typeof version1 === 'number' && typeof version2 === 'number') {
    return version1 > version2 ? 1 : -1;
  }
  
  // 处理语义化版本号 (如 "1.2.3", "2.0.0")
  const parseVersion = (version) => {
    if (typeof version === 'string') {
      // 移除 'v' 前缀
      const cleanVersion = version.replace(/^v/, '');
      // 分割版本号
      const parts = cleanVersion.split('.').map(part => {
        // 处理预发布版本 (如 "1.0.0-beta")
        const match = part.match(/^(\d+)(.*)$/);
        return {
          number: parseInt(match ? match[1] : part, 10) || 0,
          suffix: match ? match[2] : ''
        };
      });
      return parts;
    }
    // 如果不是字符串，转换为数组格式
    return [{ number: parseInt(version, 10) || 0, suffix: '' }];
  };
  
  const v1Parts = parseVersion(version1);
  const v2Parts = parseVersion(version2);
  
  // 比较版本号部分
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || { number: 0, suffix: '' };
    const v2Part = v2Parts[i] || { number: 0, suffix: '' };
    
    // 比较数字部分
    if (v1Part.number !== v2Part.number) {
      return v1Part.number > v2Part.number ? 1 : -1;
    }
    
    // 比较后缀部分（如果有）
    if (v1Part.suffix !== v2Part.suffix) {
      // 预发布版本 < 正式版本
      if (v1Part.suffix === '' && v2Part.suffix !== '') {
        return 1;
      }
      if (v1Part.suffix !== '' && v2Part.suffix === '') {
        return -1;
      }
      // 都是预发布版本，按字符串比较
      return v1Part.suffix > v2Part.suffix ? 1 : -1;
    }
  }
  
  return 0;
}

// 远程配置更新功能（仅更新配置数据，不更新代码）
const RemoteConfigManager = {
  // 远程配置服务器 - 根据环境选择不同的URL
  get configUrl() {
    // 如果 CONFIG 对象存在，使用环境配置
    if (typeof CONFIG !== 'undefined' && CONFIG.REMOTE_CONFIG_URL) {
      return CONFIG.IS_PRODUCTION 
        ? 'https://raw.githubusercontent.com/taoAIGC/AI-Shortcuts/main/config/siteHandlers.json'
        : CONFIG.REMOTE_CONFIG_URL;
    }
    // 否则使用默认的生产环境URL
    return 'https://raw.githubusercontent.com/taoAIGC/AI-Shortcuts/main/config/siteHandlers.json';
  },
  
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
      
      
      // 使用版本号比较函数
      const versionComparison = compareVersions(remoteVersion, localVersion);
      
      if (versionComparison > 0) {
        console.log(`发现新版本的站点配置 (${localVersion} -> ${remoteVersion})，准备更新...`);
        
        // 更新本地存储的配置
        await this.updateLocalConfig(remoteConfig);
        
        return {
          hasUpdate: true,
          config: remoteConfig,
          version: remoteVersion,
          oldVersion: localVersion,
          versionComparison: versionComparison
        };
      } else if (versionComparison < 0) {
        console.log(`远程版本 (${remoteVersion}) 比本地版本 (${localVersion}) 旧，跳过更新`);
        return { 
          hasUpdate: false, 
          reason: 'remote_older',
          remoteVersion: remoteVersion,
          localVersion: localVersion
        };
      } else {
        console.log(`版本号相同 (${remoteVersion})，无需更新`);
        return { 
          hasUpdate: false, 
          reason: 'same_version',
          version: remoteVersion
        };
      }
    } catch (error) {
      console.error('检查配置更新失败:', error);
      return { hasUpdate: false, error: error.message };
    }
  },
  
  // 获取本地版本
  async getLocalVersion() {
    try {
      // 1. 优先从存储中获取版本
      const result = await chrome.storage.local.get('siteConfigVersion');
      if (result.siteConfigVersion) {
        return result.siteConfigVersion;
      }
      
      // 2. 如果存储中没有版本，尝试从本地文件获取
      console.log('存储中无版本信息，尝试从本地文件获取版本...');
      try {
        const response = await fetch(chrome.runtime.getURL('config/siteHandlers.json'));
        if (response.ok) {
          const localConfig = await response.json();
          if (localConfig.version) {
            console.log('从本地文件获取版本:', localConfig.version);
            return localConfig.version;
          }
        }
      } catch (error) {
        console.error('从本地文件获取版本失败:', error);
      }
      
      return 0;
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
      console.log('本地配置已更新，最新版本号:', remoteConfig.version || Date.now());
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
  async getCurrentSites() {
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
      // 1. 优先从 chrome.storage.local 读取基础配置
      console.log('尝试从 chrome.storage.local 读取站点配置...');
      let baseSites = [];
      try {
        const result = await chrome.storage.local.get('sites');
        if (result.sites && result.sites.length > 0) {
          baseSites = result.sites;
          console.log('从 chrome.storage.local 加载站点配置成功');
        }
      } catch (error) {
        console.error('从 chrome.storage.local 读取配置失败:', error);
      }
      
      // 2. 从 chrome.storage.sync 读取用户设置（顺序、启用状态等）
      let userSettings = {};
      try {
        const { sites: userSiteSettings = {} } = await chrome.storage.sync.get('sites');
        userSettings = userSiteSettings;
        console.log('从 chrome.storage.sync 加载用户设置成功');
      } catch (error) {
        console.error('从 chrome.storage.sync 读取用户设置失败:', error);
      }
      
      // 3. 合并配置：基础配置 + 用户设置
      if (baseSites && baseSites.length > 0) {
        const mergedSites = baseSites.map(site => {
          const userSiteData = userSettings[site.name] || {};
          return {
            ...site,
            order: userSiteData.order !== undefined ? userSiteData.order : site.order,
            enabled: userSiteData.enabled !== undefined ? userSiteData.enabled : site.enabled
          };
        });
        
        // 按用户设置的顺序排序
        mergedSites.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 999;
          const orderB = b.order !== undefined ? b.order : 999;
          return orderA - orderB;
        });
        
        console.log('合并配置成功，站点数量:', mergedSites.length);
        return mergedSites;
      }
      
      // 2. 如果存储中没有数据，尝试从远程配置获取
      console.log('chrome.storage.local 中无数据，尝试从远程配置获取...');
      if (self.RemoteConfigManager) {
        const sites = await self.RemoteConfigManager.getCurrentSites();
        if (sites && sites.length > 0) {
          console.log('从远程配置加载站点配置成功');
          return sites;
        }
      }
      
      // 3. 如果远程配置不可用，尝试从本地文件加载
      console.log('远程配置不可用，尝试从本地文件加载...');
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
    try {
      // 1. 优先从 chrome.storage.local 读取基础配置
      let baseSites = [];
      try {
        const result = await chrome.storage.local.get('sites');
        if (result.sites && result.sites.length > 0) {
          baseSites = result.sites;
          console.log('从 chrome.storage.local 加载站点配置成功');
        }
      } catch (error) {
        console.error('从 chrome.storage.local 读取配置失败:', error);
      }
      
      // 2. 从 chrome.storage.sync 读取用户设置（顺序、启用状态等）
      let userSettings = {};
      try {
        const { sites: userSiteSettings = {} } = await chrome.storage.sync.get('sites');
        userSettings = userSiteSettings;
        console.log('从 chrome.storage.sync 加载用户设置成功');
      } catch (error) {
        console.error('从 chrome.storage.sync 读取用户设置失败:', error);
      }
      
      // 3. 合并配置：基础配置 + 用户设置
      if (baseSites && baseSites.length > 0) {
        const mergedSites = baseSites.map(site => {
          const userSiteData = userSettings[site.name] || {};
          return {
            ...site,
            order: userSiteData.order !== undefined ? userSiteData.order : site.order,
            enabled: userSiteData.enabled !== undefined ? userSiteData.enabled : site.enabled
          };
        });
        
        // 按用户设置的顺序排序
        mergedSites.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 999;
          const orderB = b.order !== undefined ? b.order : 999;
          return orderA - orderB;
        });
        
        console.log('合并配置成功，站点数量:', mergedSites.length);
        return mergedSites;
      }
      
      // 如果存储中没有数据，尝试从远程配置获取
      if (window.RemoteConfigManager) {
        const lang = language.startsWith('zh') ? 'CN' : 'EN';
        const sites = await window.RemoteConfigManager.getCurrentSites();
        if (sites && sites.length > 0) {
          console.log('从远程配置加载站点配置成功');
          return sites;
        }
      }
      
      return [];
    } catch (error) {
      console.error('获取默认站点配置失败:', error);
      return [];
    }
  };
  
  window.defaultFavoriteSites = defaultFavoriteSites;
  window.buttonConfig = buttonConfig;
  window.externalLinks = externalLinks;
  window.RemoteConfigManager = RemoteConfigManager;
}

