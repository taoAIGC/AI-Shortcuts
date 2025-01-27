// 先加载站点配置，再初始化界面
document.addEventListener('DOMContentLoaded', async () => {
  // 从 sync 存储读取
  const result = await chrome.storage.sync.get('sites');
  sites = result.sites || defaultSites;
  console.log('加载的站点设置:', sites);
  
  // 2. 然后初始化双语
  const i18nElements = document.querySelectorAll('[data-i18n]');
  i18nElements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    let message;
    
    if (key === 'startCompare') {
      const enabledSites = sites.filter(site => site.enabled);
      const count = enabledSites.length;
      console.log('启用的站点:', enabledSites);
      message = chrome.i18n.getMessage(key, [count]);
    } else {
      message = chrome.i18n.getMessage(key);
    }
    
    console.log('i18n key:', key, 'message:', message);
    if (message) {
      element.textContent = message;
    }
  });
});

const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
i18nPlaceholders.forEach(element => {
  const key = element.getAttribute('data-i18n-placeholder');
  const message = chrome.i18n.getMessage(key);
  console.log('i18n placeholder key:', key, 'message:', message); // 添加调试日志
  if (message) {
    element.placeholder = message;
  }
});

// 确保语言文件已加载
console.log('当前语言:', chrome.i18n.getMessage('@@ui_locale'));
console.log('输入框占位符:', chrome.i18n.getMessage('inputPlaceholder'));
console.log('开始对比按钮:', chrome.i18n.getMessage('startCompare'));
console.log('设置链接:', chrome.i18n.getMessage('openSettings'));
console.log('页面模式:', chrome.i18n.getMessage('openPage'));

// 搜索相关功能
let singleSearchButton = document.getElementById('singleSearchButton');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const siteSelectButton = document.getElementById('siteSelectButton');
const siteDropdown = document.getElementById('siteDropdown');

// 初始化下拉菜单
async function initializeSiteDropdown() {
  if (!siteDropdown || !siteSelectButton) return;

  // 设置下拉按钮的 title
  siteSelectButton.title = chrome.i18n.getMessage('switchSite');

  // 从 storage 获取站点配置
  const { sites } = await chrome.storage.sync.get('sites');
  if (!sites || !sites.length) return;

  // 只显示非隐藏的站点
  const visibleSites = sites.filter(site => !site.hidden);
  console.log('可见的站点:', visibleSites);

  // 创建站点列表
  visibleSites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    siteItem.textContent = `${site.name}`;
    siteItem.title = chrome.i18n.getMessage('searchWith') + ' ' + site.name;
    
    siteItem.addEventListener('click', async () => {
      const newFavoriteSite = [{
        name: site.name
      }];
      
      // 更新存储
      await chrome.storage.sync.set({ favoriteSites: newFavoriteSite });
      
      // 更新当前使用的站点配置
      const siteConfig = sites.find(s => s.name === site.name);
      console.log('更新后的 favourite siteConfig:', siteConfig);

      // 更新按钮文案
      if (singleSearchButton && siteConfig) {
        const searchWithText = chrome.i18n.getMessage('searchWith');
        const searchText = chrome.i18n.getMessage('search');
        singleSearchButton.textContent = `${searchWithText} ${site.name} ${searchText}`;

        // 移除所有已有的点击事件监听器
        singleSearchButton.replaceWith(singleSearchButton.cloneNode(true));
        // 重新获取按钮引用
        singleSearchButton = document.getElementById('singleSearchButton');
        
        // 添加新的点击事件
        singleSearchButton.addEventListener('click', function() {
          const query = searchInput.value.trim();
          if (query) {
            chrome.runtime.sendMessage({
              action: 'singleSiteSearch',
              query: query,
              siteName: site.name
            });
          //  window.close();
          }
        });
      }
      
      siteDropdown.classList.remove('show');
    });
    
    siteDropdown.appendChild(siteItem);
  });

  // 切换下拉菜单显示状态
  siteSelectButton.addEventListener('click', (e) => {
    e.stopPropagation();
    siteDropdown.classList.toggle('show');
  });

  // 点击其他地方关闭下拉菜单
  document.addEventListener('click', () => {
    siteDropdown.classList.remove('show');
  });

  // 防止点击下拉菜单时关闭
  siteDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// 获取收藏站点设置并设置单站点搜索按钮文案
chrome.storage.sync.get('favoriteSites', function(settings) {
  if (singleSearchButton) {
    const favoriteSite = settings.favoriteSites[0];
    const siteConfig = defaultSites.find(site => site.name === favoriteSite.name);
    
    if (siteConfig) {
      singleSearchButton.textContent = `${favoriteSite.name} `;

      // 绑定单站点搜索事件
      singleSearchButton.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
          chrome.runtime.sendMessage({
            action: 'singleSiteSearch',
            query: query,
            siteName: favoriteSite.name
          });
          console.log('点击singleSiteSearch:', query, favoriteSite.name);
          window.close();
        }
      });
    }
  }
});

// 初始化下拉菜单
initializeSiteDropdown();

function performSearch() {
  const query = searchInput.value.trim();
  if (query) {
    chrome.runtime.sendMessage({
      action: 'createComparisonPage',
      query: query
    });
    window.close();

  }
}

// 绑定对比搜索按钮点击事件
if (searchButton) {
  searchButton.addEventListener('click', performSearch);
}


// 配置站点链接
try {
  const configLink = document.getElementById('settingsLink');
  console.log('configLink:', configLink); // 调试日志
  
  if (configLink) {
    configLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
    });
  } else {
    console.log('未找到配置站点入口元素');
  }
} catch (error) {
  console.error('处理配置站点入口时出错:', error);
}

// 新标签页链接
try {
  const openPageLink = document.getElementById('openPage');
  console.log('openPageLink:', openPageLink);
  
  if (openPageLink) {
    openPageLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({
        url: chrome.runtime.getURL('page/page.html')
      });
      window.close();
    });
  } else {
    console.log('未找到 openPage 元素');
  }
} catch (error) {
  console.error('处理新标签页链接时出错:', error);
}

// 添加回车键事件监听
searchInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {  // 按下回车且不按Shift
    event.preventDefault();  // 阻止默认的回车换行
    singleSearchButton.click();  // 触发单站点搜索按钮的点击事件
  }
}); 


// 监听存储变化,实时更新按钮文案
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.sites) {
    const startCompareButton = document.querySelector('[data-i18n="startCompare"]');
    if (startCompareButton) {
      const enabledSites = changes.sites.newValue.filter(site => site.enabled);
      const count = enabledSites.length;
      const message = chrome.i18n.getMessage('startCompare', [count]);
      startCompareButton.textContent = message;
      console.log('更新对比按钮文案:', message);
    }
  }
});
