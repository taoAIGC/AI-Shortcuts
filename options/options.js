let currentButtonConfig = null;
console.log('系统默认站点设置:', defaultSites);


// 加载保存的配置
function loadConfig() {
  chrome.storage.sync.get('sites', function(data) {
    const  sites = data.sites || window.defaultSites;
    console.log('加载的sites:', sites);
    initializeSiteConfigs();
  });

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
    // 1. 获取存储的站点配置
    const { sites = [] } = await chrome.storage.sync.get('sites');
    console.log('获取到的站点数组:', sites);

    // 2. 过滤非隐藏的站点，并分成两组
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
          // 获取最新的存储数据
          const { sites: currentSites } = await chrome.storage.sync.get('sites');
          const siteName = this.closest('.site-config').querySelector('.site-name-display').textContent;
          
          // 直接通过站点名称在完整数组中查找
          const siteIndex = currentSites.findIndex(s => s.name === siteName);
          if (siteIndex !== -1) {
            const updatedSites = [...currentSites];
            updatedSites[siteIndex] = {
              ...updatedSites[siteIndex],
              enabled: this.checked
            };
            
            // 保存更新后的配置
            await new Promise((resolve, reject) => {
              chrome.storage.sync.set({ sites: updatedSites }, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
            
            console.log('保存的站点数组:', updatedSites[siteIndex]);
            
            // 确保保存完成后再获取
            const result = await new Promise((resolve) => {
              chrome.storage.sync.get('sites', resolve);
            });
            console.log('获取到的站点数组:', result.sites);

            if (chrome.runtime.lastError) {
              showToast(chrome.i18n.getMessage("saveFailed", [chrome.runtime.lastError.message]));
              return;
            }
            showToast(chrome.i18n.getMessage("saveSuccess"));
            

          }
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
    const { sites = [] } = await chrome.storage.sync.get('sites');
    
    // 创建新的站点数组，按照拖拽后的顺序排列
    const reorderedSites = [];
    
    // 首先添加拖拽后的站点（按新模式顺序）
    newOrder.forEach(siteName => {
      const site = sites.find(s => s.name === siteName);
      if (site) {
        reorderedSites.push(site);
      }
    });
    
    // 然后添加其他未显示的站点
    sites.forEach(site => {
      if (!newOrder.includes(site.name)) {
        reorderedSites.push(site);
      }
    });
    
    // 保存新的顺序
    await chrome.storage.sync.set({ sites: reorderedSites });
    
    console.log(`${mode}模式站点顺序已更新`);
    showToast('站点顺序已保存');
    
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