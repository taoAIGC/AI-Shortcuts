let currentButtonConfig = null;
// 系统默认站点设置将通过 getDefaultSites() 动态获取


// 加载保存的配置
async function loadConfig() {
  // 直接从 initializeSiteConfigs 中处理站点配置加载
  initializeSiteConfigs();

  chrome.storage.sync.get('buttonConfig', function(data) {
    currentButtonConfig = data.buttonConfig || window.defaultButtonConfig;
    console.log('加载的buttonConfig:', currentButtonConfig);
    initializeButtonConfigs();
  });
}

// 获取翻译文本
function getMessage(key, substitutions = null) {
  return chrome.i18n.getMessage(key, substitutions);
}

// 显示吐司提示
function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.classList.remove('show');
  void toast.offsetWidth;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  toast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// 初始化页面文本
function initializeI18n() {
  // 更新页面标题
  document.title = chrome.i18n.getMessage("appName");

  
  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 加载完成');
  initializeSiteConfigs();
  initializeI18n();
  initializeRuleInfo();
});

// 显示消息
function showMessage(message, isError = false) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isError ? 'error' : 'success'}`;
  messageElement.textContent = message;
  
  document.body.appendChild(messageElement);
  
  setTimeout(() => {
    messageElement.remove();
  }, 3000);
}

// 初始化快捷入口配置
async function initializeButtonConfigs() {
  try {
    // 获取存储的按钮配置
    let { buttonConfig } = await chrome.storage.sync.get(['buttonConfig']);
    let currentConfig = buttonConfig || {
      floatButton: true,
      selectionSearch: true,
      contextMenu: true,
      searchEngine: true
    };

    console.log('初始配置:', currentConfig);

    // 配置项定义
    const configItems = [
      { id: 'floatButtonSwitch', configKey: 'floatButton', name: chrome.i18n.getMessage("floatButton") },
      { id: 'selectionSearchSwitch', configKey: 'selectionSearch', name: chrome.i18n.getMessage("selectionSearch") },
      { id: 'contextMenuSwitch', configKey: 'contextMenu', name: chrome.i18n.getMessage("contextMenu") },
      { id: 'searchEngineSwitch', configKey: 'searchEngine', name: chrome.i18n.getMessage("searchEngine") }
    ];

    const buttonContainer = document.getElementById('buttonSiteConfigs');
    if (!buttonContainer) return;
    
    buttonContainer.innerHTML = '';

    configItems.forEach(item => {
      const configDiv = document.createElement('div');
      configDiv.className = 'site-config';
      configDiv.innerHTML = `
        <div class="site-header">
          <label class="switch">
            <input type="checkbox" id="${item.id}"
              ${currentConfig[item.configKey] ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
          <span class="site-name-display">${item.name}</span>
        </div>
      `;
      buttonContainer.appendChild(configDiv);

      const switchElement = configDiv.querySelector(`#${item.id}`);
      switchElement.addEventListener('change', async (e) => {
        // 每次更改前先获取最新的配置
        const { buttonConfig: latestConfig } = await chrome.storage.sync.get(['buttonConfig']);
        const updatedConfig = {
          ...(latestConfig || currentConfig),  // 使用最新的配置作为基础
          [item.configKey]: e.target.checked
        };
        
        await chrome.storage.sync.set({ buttonConfig: updatedConfig });
        // 更新当前配置
        currentConfig = updatedConfig;
        console.log(`已更新${item.name}配置:`, updatedConfig);
        if (chrome.runtime.lastError) {
          showToast(chrome.i18n.getMessage("saveFailed", [chrome.runtime.lastError.message]));
          return;
        }
        showToast(chrome.i18n.getMessage("saveSuccess"));
        
      });
    });

  } catch (error) {
    console.error('初始化按钮配置失败:', error);
  }
}

async function initializeSiteConfigs() {
  try {
    // 使用 getDefaultSites 函数获取合并后的站点配置
    const sites = await getDefaultSites();
    console.log('获取到的合并站点数组:', sites);

    // 过滤非隐藏的站点，并分成两组（已经按order排序了）
    const visibleSites = sites.filter(site => site.hidden === false);
    const standaloneSites = visibleSites.filter(site => !site.supportIframe);
    const collectionSites = visibleSites.filter(site => site.supportIframe);
    

    // 3. 获取两个容器
    const standaloneContainer = document.getElementById('standaloneSiteConfigs');
    const collectionContainer = document.getElementById('collectionSiteConfigs');
    
    // 4. 清空容器
    standaloneContainer.innerHTML = '';
    collectionContainer.innerHTML = '';

    // 5. 渲染独立模式站点
    standaloneSites.forEach((site, index) => {
      const siteDiv = document.createElement('div');
      siteDiv.className = 'site-config';
      siteDiv.setAttribute('data-site-name', site.name);
      siteDiv.innerHTML = `
        <div class="site-header">
          <div class="drag-handle" title="拖拽调整顺序">⋮⋮</div>
          <label class="switch">
            <input type="checkbox" class="enable-toggle"
              ${site.enabled ? 'checked' : ''} 
              data-index="${index}"
              data-mode="standalone">
            <span class="slider round"></span>
          </label>
          <span class="site-name-display">${site.name}</span>
        </div>
      `;
      standaloneContainer.appendChild(siteDiv);
      
      // 添加拖拽功能
      addDragFunctionality(siteDiv, site.name, 'standalone');
    });

    // 6. 渲染合集模式站点
    collectionSites.forEach((site, index) => {
      const siteDiv = document.createElement('div');
      siteDiv.className = 'site-config';
      siteDiv.setAttribute('data-site-name', site.name);
      siteDiv.innerHTML = `
        <div class="site-header">
          <div class="drag-handle" title="拖拽调整顺序">⋮⋮</div>
          <label class="switch">
            <input type="checkbox" class="enable-toggle"
              ${site.enabled ? 'checked' : ''} 
              data-index="${index}"
              data-mode="collection">
            <span class="slider round"></span>
          </label>
          <span class="site-name-display">${site.name}</span>
        </div>
      `;
      collectionContainer.appendChild(siteDiv);
      
      // 添加拖拽功能
      addDragFunctionality(siteDiv, site.name, 'collection');
    });

    // 7. 添加切换事件监听器
    document.querySelectorAll('.enable-toggle').forEach(toggle => {
      toggle.addEventListener('change', async function() {
        try {
          const siteName = this.closest('.site-config').querySelector('.site-name-display').textContent;
          
          // 获取当前的用户设置
          const { siteSettings = {}, sites: userSiteSettings = {} } = await chrome.storage.sync.get(['siteSettings', 'sites']);
          
          // 更新用户设置
          siteSettings[siteName] = this.checked;
          
          // 更新用户站点设置
          if (!userSiteSettings[siteName]) {
            userSiteSettings[siteName] = {};
          }
          userSiteSettings[siteName].enabled = this.checked;
          
          // 保存用户设置到 sync storage
          await chrome.storage.sync.set({ 
            siteSettings,
            sites: userSiteSettings
          });
          
          console.log('保存的站点设置:', siteName, this.checked);

          if (chrome.runtime.lastError) {
            showToast(chrome.i18n.getMessage("saveFailed", [chrome.runtime.lastError.message]));
            return;
          }
          showToast(chrome.i18n.getMessage("saveSuccess"));
        } catch (error) {
          console.error('保存设置失败:', error);
          showToast('保存失败');
          // 恢复复选框状态
          this.checked = !this.checked;
        }
      });
    });

  } catch (error) {
    console.error('初始化站点配置失败:', error);
    showToast('加载配置失败');
  }
} 

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeI18n();
  loadConfig();
  initializeNavigation();
});

// 拖拽功能实现
function addDragFunctionality(siteDiv, siteName, mode) {
  const dragHandle = siteDiv.querySelector('.drag-handle');
  let isDragging = false;
  let dragStartY = 0;
  let initialIndex = 0;
  let placeholder = null;

  // 设置拖拽手柄样式
  dragHandle.style.cursor = 'grab';
  dragHandle.style.userSelect = 'none';

  // 鼠标按下事件
  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    
    // 获取元素当前位置
    const rect = siteDiv.getBoundingClientRect();
    dragStartY = e.clientY;
    
    // 计算鼠标相对于元素的位置偏移
    const offsetY = e.clientY - rect.top;
    
    // 获取当前容器在父容器中的索引
    const container = mode === 'standalone' 
      ? document.getElementById('standaloneSiteConfigs')
      : document.getElementById('collectionSiteConfigs');
    const containers = Array.from(container.children);
    initialIndex = containers.indexOf(siteDiv);
    
    // 添加拖拽样式
    siteDiv.classList.add('dragging');
    dragHandle.style.cursor = 'grabbing';
    
    // 创建占位符
    placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = siteDiv.offsetHeight + 'px';
    container.insertBefore(placeholder, siteDiv.nextSibling);
    
    // 设置拖拽元素的样式
    siteDiv.style.position = 'fixed';
    siteDiv.style.zIndex = '1000';
    siteDiv.style.opacity = '0.8';
    siteDiv.style.transform = 'rotate(2deg)';
    siteDiv.style.pointerEvents = 'none';
    siteDiv.style.width = siteDiv.offsetWidth + 'px';
    siteDiv.style.left = rect.left + 'px';
    siteDiv.style.top = (e.clientY - offsetY) + 'px';
    
    // 存储偏移量供后续使用
    siteDiv.dataset.offsetY = offsetY;
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  });

  // 拖拽过程中的处理
  function handleDrag(e) {
    if (!isDragging) return;
    
    // 获取存储的偏移量
    const offsetY = parseFloat(siteDiv.dataset.offsetY) || 0;
    
    // 更新拖拽元素位置，让元素跟随鼠标
    siteDiv.style.top = (e.clientY - offsetY) + 'px';
    
    // 检测是否应该移动占位符
    const container = mode === 'standalone' 
      ? document.getElementById('standaloneSiteConfigs')
      : document.getElementById('collectionSiteConfigs');
    const containers = Array.from(container.children).filter(child => 
      child !== placeholder && child.classList.contains('site-config')
    );
    
    let newIndex = initialIndex;
    for (let i = 0; i < containers.length; i++) {
      const rect = containers[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        newIndex = i;
        break;
      }
      newIndex = i + 1;
    }
    
    // 移动占位符到新位置
    if (newIndex !== initialIndex) {
      if (newIndex >= containers.length) {
        container.appendChild(placeholder);
      } else {
        container.insertBefore(placeholder, containers[newIndex]);
      }
      initialIndex = newIndex;
    }
  }

  // 拖拽结束处理
  function handleDragEnd(e) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 移除拖拽样式
    siteDiv.classList.remove('dragging');
    dragHandle.style.cursor = 'grab';
    
    // 将元素移动到占位符位置
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(siteDiv, placeholder);
    }
    
    // 恢复拖拽元素样式
    siteDiv.style.position = '';
    siteDiv.style.zIndex = '';
    siteDiv.style.opacity = '';
    siteDiv.style.transform = '';
    siteDiv.style.pointerEvents = '';
    siteDiv.style.left = '';
    siteDiv.style.top = '';
    siteDiv.style.width = '';
    
    // 清理存储的偏移量
    delete siteDiv.dataset.offsetY;
    
    // 移除占位符
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }
    
    // 更新站点顺序
    updateSiteOrder(mode);
    
    // 移除事件监听器
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  }
}

// 更新站点顺序
async function updateSiteOrder(mode) {
  const container = mode === 'standalone' 
    ? document.getElementById('standaloneSiteConfigs')
    : document.getElementById('collectionSiteConfigs');
  const containers = Array.from(container.children).filter(child => 
    child.classList.contains('site-config')
  );
  
  // 获取新的顺序
  const newOrder = containers.map(container => {
    return container.getAttribute('data-site-name');
  }).filter(name => name !== null);
  
  console.log(`${mode}模式新的站点顺序:`, newOrder);
  
  // 更新存储中的站点顺序
  try {
    // 从 chrome.storage.sync 读取现有的用户设置
    const { sites: existingUserSettings = {} } = await chrome.storage.sync.get('sites');
    
    // 更新拖拽后站点的order字段
    const updatedUserSettings = { ...existingUserSettings };
    newOrder.forEach((siteName, index) => {
      if (!updatedUserSettings[siteName]) {
        updatedUserSettings[siteName] = {};
      }
      updatedUserSettings[siteName].order = index;
    });
    
    // 保存用户设置到 chrome.storage.sync
    await chrome.storage.sync.set({ sites: updatedUserSettings });
    
    console.log(`${mode}模式站点顺序已更新`);
    
    showToast(chrome.i18n.getMessage("saveSuccess"));

    
  } catch (error) {
    console.error('更新站点顺序失败:', error);
    showToast('保存顺序失败');
  }
}

// 初始化导航功能
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetSection = link.getAttribute('data-section');
      const targetElement = document.getElementById(targetSection);
      
      if (targetElement) {
        // 移除所有激活状态
        navLinks.forEach(navLink => {
          navLink.classList.remove('active');
        });
        
        // 添加当前激活状态
        link.classList.add('active');
        
        // 平滑滚动到目标区域
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // 监听页面滚动，自动更新导航激活状态
  window.addEventListener('scroll', updateActiveNavigation);
}

// 更新导航激活状态
function updateActiveNavigation() {
  const sections = document.querySelectorAll('.settings-section');
  const navLinks = document.querySelectorAll('.nav-link');
  
  let currentSection = '';
  
  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    // 当section顶部距离视口顶部小于100px时，认为该section是当前激活的
    if (rect.top <= 100 && rect.bottom > 100) {
      currentSection = section.id;
    }
  });
  
  // 更新导航链接的激活状态
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-section') === currentSection) {
      link.classList.add('active');
    }
  });
}

// 初始化规则信息
async function initializeRuleInfo() {
  try {
    let timeDisplay = '规则远程自动更新时间：';
    
    // 获取存储中的版本时间
    let storageTime = null;
    const { siteConfigVersion } = await chrome.storage.local.get('siteConfigVersion');
    if (siteConfigVersion) {
      try {
        const timestamp = parseInt(siteConfigVersion);
        if (!isNaN(timestamp)) {
          storageTime = new Date(timestamp);
          console.log('存储中的时间:', storageTime);
        }
      } catch (error) {
        console.error('解析存储时间失败:', error);
      }
    }
    
    // 获取本地配置文件的时间
    let localTime = null;
    try {
      const response = await fetch(chrome.runtime.getURL('config/siteHandlers.json'));
      const localConfig = await response.json();
      if (localConfig.lastUpdated) {
        localTime = new Date(localConfig.lastUpdated);
        console.log('本地配置文件时间:', localTime);
      }
    } catch (error) {
      console.error('读取本地配置文件失败:', error);
    }
    
    // 比较两个时间，取较大值
    let latestTime = null;
    if (storageTime && localTime) {
      latestTime = storageTime > localTime ? storageTime : localTime;
      console.log('取较大时间:', latestTime);
    } else if (storageTime) {
      latestTime = storageTime;
      console.log('使用存储时间:', latestTime);
    } else if (localTime) {
      latestTime = localTime;
      console.log('使用本地时间:', latestTime);
    }
    
    // 格式化显示
    if (latestTime) {
      const year = latestTime.getFullYear();
      const month = String(latestTime.getMonth() + 1).padStart(2, '0');
      const day = String(latestTime.getDate()).padStart(2, '0');
      timeDisplay = `规则远程自动更新时间：${year}年${month}月${day}日`;
    } else {
      timeDisplay = '规则远程自动更新时间：未获取到';
    }
    
    // 更新显示
    const timeElement = document.getElementById('ruleUpdateTime');
    if (timeElement) {
      timeElement.textContent = timeDisplay;
    }
    
    // 添加参与规则开发按钮的点击事件
    const devButton = document.getElementById('participateRuleDev');
    if (devButton) {
      devButton.addEventListener('click', () => {
        chrome.tabs.create({
          url: 'https://github.com/taoAIGC/AI-Shortcuts/blob/main/config/siteHandlers.json'
        });
      });
    }
    
  } catch (error) {
    console.error('初始化规则信息失败:', error);
    
    // 显示错误信息
    const timeElement = document.getElementById('ruleUpdateTime');
    if (timeElement) {
      timeElement.textContent = '规则远程自动更新时间：获取失败';
    }
  }
}