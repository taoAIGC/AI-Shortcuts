importScripts('./config/consoleConfig.js');  // 先加载 consoleConfig.js
importScripts('./config/baseConfig.js');     // 再加载 baseConfig.js

// 扩展启动时检查配置更新
chrome.runtime.onStartup.addListener(async () => {
  try {
    if (window.RemoteConfigManager) {
      const updateInfo = await window.RemoteConfigManager.autoCheckUpdate();
      if (updateInfo && updateInfo.hasUpdate) {
        console.log('发现新版本站点配置');
        // 自动更新配置
        await window.RemoteConfigManager.updateLocalConfig(updateInfo.config);
      }
    }
  } catch (error) {
    console.error('启动时检查更新失败:', error);
  }
});

// 扩展安装时的统一处理
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    // 检查配置更新
    if (self.RemoteConfigManager) {
      const updateInfo = await self.RemoteConfigManager.autoCheckUpdate();
      if (updateInfo && updateInfo.hasUpdate) {
        console.log('首次安装，获取最新配置');
        await self.RemoteConfigManager.updateLocalConfig(updateInfo.config);
      }
    }
    
    // 获取当前存储的数据
    const { favoriteSites, buttonConfig } = await chrome.storage.sync.get(['favoriteSites', 'buttonConfig']);
    const { siteSettings } = await chrome.storage.sync.get(['siteSettings']);
    
    // 处理 sites 数据 - 将完整配置存储到 local，用户设置存储到 sync
    console.log('开始初始化站点配置');
    const defaultSites = await self.getDefaultSites();
    console.log('获取到的默认站点:', defaultSites);
    
    if (defaultSites && defaultSites.length > 0) {
      // 将完整的站点配置存储到 local storage
      await chrome.storage.local.set({ sites: defaultSites });
      console.log('已保存站点配置到 local storage');
      
      // 处理用户设置（enabled 状态）
      if (siteSettings && Object.keys(siteSettings).length > 0) {
        // 合并用户设置
        const mergedSites = defaultSites.map(site => ({
          ...site,
          enabled: siteSettings[site.name] !== undefined ? siteSettings[site.name] : site.enabled
        }));
        await chrome.storage.local.set({ sites: mergedSites });
        console.log('已合并用户设置');
      }
    } else {
      console.error('无法获取默认站点配置');
    }
    
    // 处理 favoriteSites 数据
    if (!favoriteSites || !favoriteSites.length) {
      // 只在没有数据时才初始化 favoriteSites
      await chrome.storage.sync.set({ 
        favoriteSites: self.defaultFavoriteSites 
      });
      console.log('已初始化 favoriteSites:', self.defaultFavoriteSites);
    }

    // 处理 buttonConfig 数据
    if (buttonConfig) {
      // 如果已有配置，合并配置
      const mergedButtonConfig = {
        ...self.buttonConfig,  // 使用默认配置作为基础
        ...buttonConfig       // 覆盖已有的用户配置
      };
      await chrome.storage.sync.set({ buttonConfig: mergedButtonConfig });
      console.log('已合并更新 buttonConfig:', mergedButtonConfig);
    } else {
      // 如果没有配置，使用默认配置
      await chrome.storage.sync.set({ buttonConfig: self.buttonConfig });
      console.log('已初始化 buttonConfig:', self.buttonConfig);
    }
    
    // 创建右键菜单
    createContextMenu();
    
    console.log('Extension installed');
  } catch (error) {
    console.error('初始化失败:', error);
  }
});

// 在扩展启动时检查规则
chrome.declarativeNetRequest.getSessionRules().then(rules => {
  console.log('当前生效的规则:', rules);
});


// 如果规则为空，尝试动态添加规则
chrome.declarativeNetRequest.updateSessionRules({
  removeRuleIds: [999], // 先清除可能存在的规则 999
  addRules: [{
    "id": 999,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "Sec-Fetch-Dest",
          "operation": "set",
          "value": "document"
        },
        {
          "header": "Sec-Fetch-Site",
          "operation": "set",
          "value": "same-origin"
        },
        {
          "header": "Sec-Fetch-Mode",
          "operation": "set",
          "value": "navigate"
        },
        {
          "header": "Sec-Fetch-User",
          "operation": "set",
          "value": "?1"
        },
        {
          "header": "content-security-policy",
          "operation": "remove"
        },
        {
          "header": "x-frame-options",
          "operation": "remove"
        }
      ]
    },
    "condition": {
      "urlFilter": "*://*/*",
      "resourceTypes": ["main_frame", "sub_frame"]
    }
  }]
}).then(() => {
  // 再次检查规则
  return chrome.declarativeNetRequest.getSessionRules();
}).then(rules => {
  console.log('更新后的规则:', rules);
});





// 处理右键菜单点击和消息
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchWithMultiAI" && info.selectionText) {
    openSearchTabs(info.selectionText);
  }
});

// 处理来自 float-button 和 popup 和 content-scripts 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  
  if (message.action === 'createComparisonPage') {
    console.log('createComparisonPage-opensearchtab:', message.query);
    openSearchTabs(message.query).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('创建对比页面失败:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  } 
  else if (message.action === 'processQuery') {
    // 添加对 processQuery 消息的处理
    console.log('processQuery:', message.query, message.sites);
    openSearchTabs(message.query, message.sites).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('处理查询失败:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }
  else if (message.action === 'singleSiteSearch') {
    console.log('singleSiteSearch:', message.query, message.siteName);
    handleSingleSiteSearch(message.query, message.siteName).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('单站点搜索失败:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }
  else if (message.action === 'openOptionsPage') {
    // 立即打开设置页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('options/options.html')
    });
    sendResponse({ success: true });
  }
});

// 处理来自 iframe 的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'executeHandler') {
    const siteHandler = await getHandlerForUrl(message.url);
    if (siteHandler && siteHandler.searchHandler) {
      executeSiteHandler(sender.tab.id, message.query, siteHandler).catch(error => {
        console.error('站点处理失败:', error);
      });
    }
  }
});





// 站点处理函数集合
// 站点处理函数已迁移到 siteHandlers.json 中的 searchHandler 字段

// 执行站点处理函数 - 使用配置化处理器
async function executeSiteHandler(tabId, query, siteHandler) {
  try {
    console.log(`开始处理 ${siteHandler.name} 站点, tabId:`, tabId);
    console.log('待发送的查询:', query);
    
    // 先激活标签页
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    console.log('标签页状态:', {
      id: tab.id,
      url: tab.url,
      status: tab.status,
      active: tab.active
    });

    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 使用配置化处理器 - 发送消息到页面的 inject.js
      await chrome.tabs.sendMessage(tabId, {
        type: 'search',
        query: query,
        domain: new URL(tab.url).hostname
      });
      
      console.log('已发送配置化处理消息到页面');
    } catch (scriptError) {
      console.error('发送配置化处理消息失败:', scriptError);
      throw scriptError;
    }
  } catch (error) {
    console.error(`${siteHandler.name} 处理过程出错:`, error);
    throw error;
  }
}

// 根据 URL 获取处理函数
async function getHandlerForUrl(url) {
  try {
    // 确保 URL 是有效的
    if (!url) {
      console.error('URL 为空');
      return null;
    }

    // 如果 URL 不包含协议，添加 https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    console.log('处理URL:', url);
    const hostname = new URL(url).hostname;
    console.log('当前网站:', hostname);
    
    // 从远程配置获取站点列表
    const sites = await self.RemoteConfigManager.getCurrentSites('CN');
    if (!sites || sites.length === 0) {
      console.warn('没有找到站点配置');
      return null;
    }
    
    // 查找匹配的站点
    for (const site of sites) {
      if (!site.url) continue;
      
      try {
        const siteUrl = new URL(site.url);
        const siteDomain = siteUrl.hostname;
        
        // 直接匹配域名
        if (hostname === siteDomain) {
          console.log('找到匹配站点:', site.name);
          return {
            name: site.name,
            searchHandler: site.searchHandler,
            supportUrlQuery: site.supportUrlQuery
          };
        }
        
        // 模糊匹配域名
        if (hostname.includes(siteDomain) || siteDomain.includes(hostname)) {
          console.log('找到匹配站点:', site.name);
          return {
            name: site.name,
            searchHandler: site.searchHandler,
            supportUrlQuery: site.supportUrlQuery
          };
        }
      } catch (urlError) {
        // 如果URL解析失败，跳过这个站点
        continue;
      }
    }
    
    console.log('未找到对应的处理函数');
    return null;
  } catch (error) {
    console.error('URL 解析失败:', error, 'URL:', url);
    return null;
  }
}

  // 处理单站点搜索
  async function handleSingleSiteSearch(query, siteName) {
    console.log('开始处理单站点搜索:', query, siteName);

  try {
    console.log('handleSingleSiteSearch处理单站点搜索:', query, siteName);
    const { sites } = await chrome.storage.local.get('sites');
    if (!sites || !sites.length) {
      console.error('未找到站点配置');
      return;
    }
    const siteConfig = sites.find(site => site.name === siteName);
    if (!siteConfig) {
      console.error('未找到站点配置:', siteName);
      return;
    }
    
    // 检查站点是否被隐藏
    if (siteConfig.hidden) {
      console.error('站点已被隐藏，无法使用:', siteName);
      return;
    }

      // 判断是否支持URL拼接查询
      if (siteConfig.supportUrlQuery) {
        // URL 拼接方式的站点,直接打开新标签页
      const url = siteConfig.url.replace('{query}', encodeURIComponent(query));
        console.log('使用URL拼接方式打开:', url);
      await chrome.tabs.create({ url, active: true });
      } else {
        // 需要脚本控制的站点
        console.log('使用脚本控制方式打开:', siteConfig.url);
        const tab = await chrome.tabs.create({ url: siteConfig.url, active: true });
        
        // 等待标签页加载完成
        await new Promise((resolve) => {
          const listener = (tabId, info) => {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
        });
        
        // 执行对应站点的处理函数
        await executeSiteHandler(tab.id, query, {
          name: siteConfig.name,
          searchHandler: siteConfig.searchHandler,
          supportUrlQuery: siteConfig.supportUrlQuery
        });
      }
  } catch (error) {
    console.error('单站点搜索失败:', error);
  }
}

// 修改后的 openSearchTabs 函数
async function openSearchTabs(query, checkedSites = null) {
  console.log('开始执行多AI查询 查询词:', query);
  const { sites } = await chrome.storage.local.get('sites');
  
  if (!sites || !sites.length) {
    console.error('未找到AI站点配置');
    return;
  }
  
  // 首先检查是否有符合条件的站点

  const result = checkedSites 
    ? sites.filter(site => checkedSites.includes(site.name) && !site.hidden)
    : sites.filter(site => site.enabled && !site.hidden);
    
  console.log('符合条件的站点:', result);

  // 过滤出支持 iframe 的站点
  const iframeSites = result.filter(site => 
      site.supportIframe === true
  );

  if (iframeSites.length > 0) {
      console.log('找到支持 iframe 的启用站点:', iframeSites);
      
      const newTab = await chrome.tabs.create({
          url: chrome.runtime.getURL('iframe/iframe.html?query=true'),
          active: true
      });

      // 等待新标签页加载完成
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === newTab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              
              // 向新标签页发送消息,传递查询词和需要加载的站点信息
              chrome.tabs.sendMessage(newTab.id, {
                  type: 'loadIframes',
                  query: query,
                  sites: iframeSites
              });
          }
      });

  }

  

  
  // 过滤出启用但不支持 iframe 的站点
  const tabSites = result.filter(site => 
    site.supportIframe !== true
  );
  console.log('启用的非 iframe 站点:', tabSites);
  
  const allTabs = await chrome.tabs.query({});

  for (const site of tabSites) {
    if (!site.url) {
      console.error('站点配置缺少 URL:', site);
      continue;
    }

    const url = site.supportUrlQuery 
      ? site.url.replace('{query}', encodeURIComponent(query))
      : site.url;
      
    console.log('处理站点:', {
      名称: site.name,
      URL: url,
      是否支持URL拼接查询: site.supportUrlQuery
    });

    const siteDomain = getBaseDomain(url);
    const existingTab = findExistingTab(allTabs, siteDomain);

    if (existingTab) {
      console.log('找到已存在的标签页:', existingTab.url);
      
      if (site.supportUrlQuery) {
        // URL 方式的站点
        await chrome.tabs.update(existingTab.id, { url, active: true });
      // 将标签页移动到最右侧
        const rightmostIndex = Math.max(...allTabs.map(tab => tab.index)) + 1;
        await chrome.tabs.move(existingTab.id, {index: rightmostIndex});
      } else {
        // 需要脚本处理的站点
        console.log('需要处理的站点tab:', {
          站点URL: url,
          siteDomain: siteDomain,
          标签页标题: existingTab.title,
          标签页URL: existingTab.url
        });
        const siteHandler = await getHandlerForUrl(siteDomain);
        if (siteHandler && siteHandler.searchHandler) {
          console.log('执行站点处理函数', siteHandler.name);
          console.log('标签页ID:', existingTab.id);
          await executeSiteHandler(existingTab.id, query, siteHandler);
          console.log('执行站点处理函数完成');
        } else {
          console.warn('未找到对应的处理函数');
        }
      }
    } else {
      console.log('创建新标签页:', url);
      const tab = await chrome.tabs.create({ url, active: true });
      
      if (!site.supportUrlQuery) {
        // 等待页面加载完成后执行处理函数
        chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            console.log('标签页URL:', tab.url);
            console.log('站点URL:', url);
            const siteHandler = await getHandlerForUrl(url);
            if (siteHandler && siteHandler.searchHandler) {
              executeSiteHandler(tab.id, query, siteHandler);
            }
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      }
    }
  }
}

// 获取网站的基本域名
function getBaseDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  //  const parts = hostname.split('.');
  //  return parts.slice(-2).join('.');
  } catch (e) {
    console.error('URL解析失败:', url);
    return url;
  }
}

// 查找已存在的标签页
function findExistingTab(tabs, targetDomain) {
  return tabs.find(tab => {
    try {
      return getBaseDomain(tab.url) === targetDomain;
    } catch (e) {
      return false;
    }
  });
} 

// 处理扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开新标签页显示 iframe.html
  chrome.tabs.create({
    url: chrome.runtime.getURL('iframe/iframe.html')
  });
});


// 添加错误处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        // 你的消息处理逻辑
        return true; // 如果使用异步响应
    } catch (error) {
        console.error('Service Worker error:', error);
        return false;
    }
});

// 添加基本的生命周期处理
self.addEventListener('install', (event) => {
    console.log('Service Worker 安装');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker 激活');
});

// 添加错误处理
self.addEventListener('error', (error) => {
    console.error('Service Worker 错误:', error);
});


// 防抖变量，避免短时间内多次调用
let contextMenuTimeout = null;

// 创建右键菜单
async function createContextMenu() {
  // 清除之前的定时器
  if (contextMenuTimeout) {
    clearTimeout(contextMenuTimeout);
  }
  
  // 设置防抖延迟
  contextMenuTimeout = setTimeout(async () => {
    try {
      // 获取配置
      const { buttonConfig } = await chrome.storage.sync.get('buttonConfig');
      
      // 检查是否启用右键菜单
      if (buttonConfig && buttonConfig.contextMenu) {
        // 先移除所有现有菜单，然后创建新菜单
        // 这样可以避免重复创建的问题
        await chrome.contextMenus.removeAll();
        
        // 创建新菜单
        chrome.contextMenus.create({
          id: "searchWithMultiAI",
          title: chrome.i18n.getMessage("searchWithMultiAI"),
          contexts: ["selection"]  // 只在选中文本时显示
        });
        console.log('右键菜单已创建');
      } else {
        // 如果未启用，确保移除菜单
        await chrome.contextMenus.removeAll();
        console.log('右键菜单已移除');
      }
    } catch (error) {
      console.error('创建右键菜单失败:', error);
    }
  }, 100); // 100ms 防抖延迟
}

// 监听存储变化，当配置更改时更新右键菜单
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.buttonConfig) {
    createContextMenu();
  }
});



// 监听扩展卸载事件
chrome.runtime.setUninstallURL(self.externalLinks?.uninstallSurvey || '', () => {
  if (chrome.runtime.lastError) {
    console.error('设置卸载 URL 失败:', chrome.runtime.lastError);
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_SIDE_PANEL') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});

