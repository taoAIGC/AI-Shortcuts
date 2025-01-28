// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化列数选择
    const columnSelect = document.getElementById('columnSelect');
    const iframesContainer = document.getElementById('iframes-container');

    // 从存储中获取列数设置
    const { preferredColumns = '3' } = await chrome.storage.sync.get('preferredColumns');
    columnSelect.value = preferredColumns;
    updateColumns(preferredColumns);

    // 检查 URL 参数，判断打开方式
    const urlParams = new URLSearchParams(window.location.search);
    const hasQueryParam = urlParams.has('query');
    
    // 只有在直接打开（方式1）时才执行初始化 iframes
    if (!hasQueryParam) {
        // 获取站点配置并初始化 iframes
        chrome.storage.sync.get('sites', (result) => {
            if (result.sites) {
                // 过滤出启用的且支持 iframe 的站点
                const availableSites = result.sites.filter(site => 
                    site.enabled && 
                    site.supportIframe !== false && 
                    !site.hidden
                );

                if (availableSites.length > 0) {
                    console.log('初始化可用站点:', availableSites);
                    // 使用现有的 createIframes 函数创建 iframe
                    createIframes('', availableSites); // query 参数传空字符串
                } else {
                    console.log('没有可用的站点');
                }
            }
        });
    }

    // 列数变化监听器
    columnSelect.addEventListener('change', function(e) {
        const columns = e.target.value;
        chrome.storage.sync.set({ 'preferredColumns': columns });
        updateColumns(columns);
    });

});

// 更新列数的辅助函数
function updateColumns(columns) {
    const iframesContainer = document.getElementById('iframes-container');
    iframesContainer.dataset.columns = columns;
    document.documentElement.style.setProperty('--columns', columns);
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('iframe.js 收到消息:', message);
  if (message.type === 'loadIframes') {
    console.log('开始加载 iframes, 查询词:', message.query);
    const searchInput = document.getElementById('searchInput');
    searchInput.value = message.query;
    createIframes(message.query, message.sites);

  }
});

// 处理 iframe 的创建和加载
async function createIframes(query, sites) {
  // 直接从 storage 获取站点配置
  const enabledSites = sites;
  
  console.log('过滤后的站点:', enabledSites);

  // 获取容器元素
  const container = document.getElementById('iframes-container');
  if (!container) {
    console.error('未找到 iframes 容器');
    return;
  }

  try {
    if (query) {
      
      // 如果有查询词,清空容器内容
      container.innerHTML = '';
      console.log("清空iframe")

    } 
    // 调整主容器样式以适应导航栏
    container.style.marginLeft = '72px';
    // 为每个启用的站点创建 iframe，传入 query 参数
    enabledSites.forEach(site => {
      // 如果 query 为空,使用 site.url 的 hostname
      let url;
      if (!query) {
        try {
          url = new URL(site.url).hostname;
          url = 'https://' + url;
        } catch (e) {
          console.error('URL解析失败:', site.url);
          url = site.url;
        }
      } else {
        url = site.supportUrlQuery 
          ? site.url.replace('{query}', encodeURIComponent(query))
          : site.url;
      }

      console.log("即将开始调用创建单个 iframe",site.name, url)
      createSingleIframe(site.name, url, container, query);
    });
  } catch (error) {
    console.error('创建 iframes 失败:', error);
  }
  // 滚动到页面顶部
  /*
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });*/
  
  // 创建导航栏
  const nav = document.createElement('nav');
  nav.className = 'nav';

  // 创建导航列表
  const navList = document.createElement('ul');
  navList.className = 'nav-list';

  // 为每个站点创建导航项
  enabledSites.forEach((site, index) => {
    const navItem = document.createElement('li');
    navItem.className = 'nav-item';
    navItem.textContent = site.name;
    


    // 监听页面滚动事件
    window.addEventListener('scroll', () => {
      // 获取所有 iframe 容器
      const iframes = container.querySelectorAll('.iframe-container');
      // 获取所有导航项
      const navItems = navList.querySelectorAll('li');
      
      // 遍历所有 iframe 检查哪个在视口中
      iframes.forEach((iframe, idx) => {
        const rect = iframe.getBoundingClientRect();
        // 如果 iframe 在视口中(考虑到导航栏高度60px的偏移)
        if (rect.top <= window.innerHeight / 2) {
          // 移除所有激活状态
          navItems.forEach(item => {
            item.style.backgroundColor = '';
            item.classList.remove('active');
          });
          
          // 激活对应的导航项
          navItems[idx].style.backgroundColor = '#e0e0e0';
          navItems[idx].classList.add('active');
        }
      });
    });

    // 点击导航项时滚动到对应的iframe
    navItem.addEventListener('click', () => {
      // 移除所有激活状态
      navList.querySelectorAll('li').forEach(item => {
        item.style.backgroundColor = '';
        item.classList.remove('active');
      });
      
      // 激活当前点击项
      navItem.style.backgroundColor = '#e0e0e0';
      navItem.classList.add('active');
      
      // 滚动到对应的iframe
      const iframes = container.querySelectorAll('.iframe-container');
      if(iframes[index]) {
        iframes[index].scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    navList.appendChild(navItem);
  });

  nav.appendChild(navList);
  document.body.insertBefore(nav, container);


  
}



// 创建单个 iframe 时添加标识
function createSingleIframe(siteName, url, container, query) {
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'iframe-container';
  
  const iframe = document.createElement('iframe');
  iframe.className = 'ai-iframe';
  iframe.setAttribute('data-site', siteName);
  
  // 修改 sandbox 属性，添加更多必要的权限
  iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';
  
  iframe.allow = 'clipboard-write; clipboard-read; microphone; camera; geolocation; autoplay; fullscreen; picture-in-picture; storage-access; web-share';
  
  // 记录是否已经处理过点击事件
  let clickHandlerAdded = false;
  
  iframe.addEventListener('load', () => {
    if (clickHandlerAdded) return; // 如果已经添加过处理器，直接返回
    
    try {
      iframe.contentWindow.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
          e.preventDefault();
          window.open(link.href, '_blank');
           console.log("iframe 内点击事件处理成功")
        }
      });
      clickHandlerAdded = true;
    } catch (error) {
      console.log('无法直接添加点击监听器，将通过 inject.js 处理');
      
      // 只在未添加处理器时注入
      if (!clickHandlerAdded) {
        iframe.contentWindow.postMessage({
          type: 'INJECT_CLICK_HANDLER',
          source: 'iframe-parent'
        }, '*');
        clickHandlerAdded = true;
      }
    }
    // 重新设置输入框焦点
    document.getElementById('searchInput').focus();
  });
  
  // 添加消息监听（确保只处理一次）
  const messageHandler = (event) => {
    if (event.data.type === 'LINK_CLICK' && event.data.href) {
      window.open(event.data.href, '_blank');
    }
  };
  
  window.removeEventListener('message', messageHandler); // 移除可能存在的旧监听器
  window.addEventListener('message', messageHandler);
  
  // 合并和优化 iframe 加载事件处理
  iframe.addEventListener('load', () => {
    const searchInput = document.getElementById('searchInput');
    
    // 设置 iframe 为不可聚焦
    iframe.setAttribute('tabindex', '-1');
    
    // 防止 iframe 内容获取焦点
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.documentElement.setAttribute('tabindex', '-1');
      doc.body.setAttribute('tabindex', '-1');
      
      // 阻止所有可能的焦点事件
      doc.addEventListener('focus', (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchInput.focus();
      }, true);
      
      doc.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchInput.focus();
      }, true);
      
      doc.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A') {
          e.preventDefault();
          e.stopPropagation();
          searchInput.focus();
        }
      }, true);
    } catch (error) {
      console.log('无法直接访问 iframe 内容，将通过消息通信处理');
      iframe.contentWindow.postMessage({
        type: 'PREVENT_FOCUS',
        source: 'iframe-parent'
      }, '*');
    }
    
    // 确保搜索输入框保持焦点
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  });

  // 在父页面级别阻止 iframe 获取焦点
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'IFRAME') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
  }, true);

  iframe.src = url;

  // 在 iframe 加载完成后，将页面滚动回顶部
  /*
  iframe.addEventListener('load', () => {
    window.scrollTo(0, 0);
  });*/
  
  // 创建 header
  const header = document.createElement('div');
  header.className = 'iframe-header';
  header.innerHTML = `
    <span class="site-name">${siteName}</span>
    <div class="iframe-controls">
      <button class="close-btn"></button>
    </div>
  `;
  
  // 添加 Chrome 浏览器特征
  iframe.setAttribute('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  // 添加其他常见的 Chrome 浏览器头部信息
  iframe.setAttribute('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8');
  iframe.setAttribute('sec-ch-ua', '"Chromium";v="122", "Google Chrome";v="122"');
  iframe.setAttribute('sec-ch-ua-mobile', '?0');
  iframe.setAttribute('sec-ch-ua-platform', '"Macintosh"');
  

  // 组装元素
  iframeContainer.appendChild(header);
  iframeContainer.appendChild(iframe);
  container.appendChild(iframeContainer);
  
  // 添加按钮事件处理   
  const closeBtn = header.querySelector('.close-btn');
  
  closeBtn.onclick = () => {
    // 1. 获取对应的 iframe
    iframeContainer.remove();
    // 在导航栏中找到对应的 nav-item 并删除
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.textContent.trim() === siteName) {
        item.remove();
      }
    });
    
  };
  
  iframe.onload = () => {
    // 只有当有查询内容时才执行处理
    if (!query) {
      console.log("没有查询内容，跳过处理函数");
      return;
    }

    console.log("iframe onload 加载完成，查询内容:", query);

    // 从 storage 获取站点配置，检查是否支持 URL 查询
    console.log("iframe onload 加载完成，准备查询页面内容处理函数")

    chrome.storage.sync.get('sites', (result) => {
      const site = result.sites.find(s => s.url === url || url.startsWith(s.url));
      if (site && !site.supportUrlQuery) {
        // 查找对应的处理函数
        const hostname = new URL(url).hostname;
        console.log('当前域名:', hostname);
        console.log('可用处理器:', Object.keys(iframeHandlers));
        const handler = Object.entries(iframeHandlers).find(([domain]) => 
          hostname.includes(domain)
        )?.[1];

        if (handler) {
          console.log('执行 iframe 处理函数:', hostname);
          handler(iframe, query);
        } else {
          console.log('未找到对应的处理函数', hostname);
        }
      }
    });
  };
}

// 导出函数供其他文件使用
export { createIframes }; 


// 根据 URL 获取处理函数
function getHandlerForUrl(url) {
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
      
      // 遍历所有处理函数，找到匹配的
      for (const [domain, handler] of Object.entries(siteHandlers)) {
        if (hostname.includes(domain)) {
          console.log('找到处理函数:', domain);
          console.log('处理函数:', handler);
          return handler;
        }
      }
      
      console.log('未找到对应的处理函数');
      return null;
    } catch (error) {
      console.error('URL 解析失败:', error, 'URL:', url);
      return null;
    }
  }

// iframe 内的处理函数集合
const iframeHandlers = {
  // Kimi 处理函数
  'kimi.moonshot.cn': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'KIMI',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('Kimi iframe 处理失败:', error);
    }
  },
  // 文心一言处理函数
  'yiyan.baidu.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'YIYAN',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('文心一言 iframe 处理失败:', error);
    }
  },
  // 文心一言处理函数
  'doubao.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('豆包 iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'doubao',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('豆包 iframe 处理失败:', error);
    }
  },
  'chatgpt.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('ChatGPT iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'chatgpt',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('ChatGPT iframe 处理失败:', error);
    }
  },
  'claude.ai': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Claude iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'claude',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('Claude iframe 处理失败:', error);
    }
  },
  'poe.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Poe iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'poe',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('Poe iframe 处理失败:', error);
    }
  },
  'copilot.microsoft.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Copilot iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'copilot', 
        query: query
      }, '*');
      
    } catch (error) {
      console.error('Copilot iframe 处理失败:', error);
    }
  },
  'gemini.google.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Gemini iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'gemini',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('Gemini iframe 处理失败:', error);
    }
  },
  'chat.deepseek.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('DeepSeek iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'deepseek',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('DeepSeek iframe 处理失败:', error);
    }
  },
  'metaso.cn': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('秘塔 iframe 处理开始', {
        时间: new Date().toISOString(),
        调用栈: new Error().stack
      });
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'metaso',
        query: query
      }, '*');
      // 监听消息发送状态
      
    } catch (error) {
      console.error('秘塔 iframe 处理失败:', error);
    }
  },

};

// 添加搜索按钮
document.getElementById('searchButton').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        // 获取所有 iframe
        const iframes = document.querySelectorAll('iframe');
        
        // 遍历每个 iframe
        iframes.forEach(iframe => {
            try {
                // 从 src 中提取域名
                const url = new URL(iframe.src);
                const domain = url.hostname;
                console.log('当前iframe网站hostname:', domain);
                
                // 查找对应的处理函数
                const handler = iframeHandlers[domain];
                if (handler) {
                    console.log(`重新处理 ${domain} iframe`, {
                        时间: new Date().toISOString(),
                        query: query
                    });
                    // 调用处理函数
                    handler(iframe, query);
                }
            } catch (error) {
                console.error('处理 iframe 失败:', error);
            }
        });
    }
});

// 处理回车键
document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query) {
            // 触发搜索按钮的active效果
            const searchButton = document.getElementById('searchButton');
            searchButton.classList.add('active');
            
            // 200ms后移除active效果
            setTimeout(() => {
                searchButton.classList.remove('active');
            }, 200);

            
            const iframes = document.querySelectorAll('iframe');
        
        // 遍历每个 iframe
        iframes.forEach(iframe => {
            try {
                // 从 src 中提取域名
                const url = new URL(iframe.src);
                const domain = url.hostname;
                
                // 查找对应的处理函数
                const handler = iframeHandlers[domain];
                if (handler) {
                    console.log(`重新处理 ${domain} iframe`, {
                        时间: new Date().toISOString(),
                        query: query
                    });
                    // 调用处理函数
                    handler(iframe, query);
                }
            } catch (error) {
                console.error('处理 iframe 失败:', error);
            }
        });
        }
    }
});

// 在 DOMContentLoaded 时设置按钮文案
document.addEventListener('DOMContentLoaded', () => {
    // 获取按钮元素
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        // 获取当前语言的文案
        const buttonText = chrome.i18n.getMessage('startCompare');
        searchButton.textContent = buttonText;
        
        // 调试日志
        console.log('按钮文案设置:', {
            当前语言: chrome.i18n.getUILanguage(),
            文案: buttonText
        });
    }
});

// 初始化站点设置的函数
async function initializeSiteSettings() {    
    const siteList = document.querySelector('.site-list');
    const saveButton = document.querySelector('.save-settings-btn');
    
    // 设置按钮的 title 属性
    saveButton.title = chrome.i18n.getMessage('saveSettingsTitle');
    
    siteList.innerHTML = '';
    // 获取当前已打开的 iframe 站点 ID 数组
    const openedSites = Array.from(document.querySelectorAll('.ai-iframe'))
        .map(iframe => iframe.getAttribute('data-site'));
    
    try {
        // 从 storage 获取数据
        const { sites = [] } = await chrome.storage.sync.get('sites');
        
        // 过滤支持 iframe 的站点
        const supportedSites = sites.filter(site => 
            site.supportIframe === true && !site.hidden
        );

        const fragment = document.createDocumentFragment();

        supportedSites.forEach(site => {
            const div = document.createElement('div');
            div.className = 'site-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'site-checkbox';
            checkbox.id = `site-${site.name}`; // 为 label 的 for 属性添加 ID
            checkbox.checked = openedSites.includes(site.name);
            
    
            const nameLabel = document.createElement('label');
            nameLabel.textContent = site.name;
            nameLabel.htmlFor = `site-${site.name}`; // 关联到对应的 checkbox
            
            checkbox.addEventListener('change', (e) => {
               console.log("用户点击新建iframe", site.name, site.url);

                if (e.target.checked) {
                    const container = document.getElementById('iframes-container');
                    if (!container) {
                      console.error('未找到 iframes 容器');
                      return;
                    }
                    createSingleIframe(site.name, site.url, container);
                    // 为新建的 iframe 创建导航项
                    const nav = document.querySelector('.nav-list');
                    if (nav) {
                        const navItem = document.createElement('li');
                        navItem.className = 'nav-item';
                        navItem.textContent = site.name;

                        // 点击导航项时滚动到对应的iframe
                        navItem.addEventListener('click', () => {
                            // 移除所有激活状态
                            nav.querySelectorAll('li').forEach(item => {
                                item.style.backgroundColor = '';
                                item.classList.remove('active');
                            });
                            
                            // 激活当前点击项
                            navItem.style.backgroundColor = '#e0e0e0';
                            navItem.classList.add('active');
                            
                            // 滚动到对应的iframe
                            const iframeContainer = document.querySelector(`[data-site="${site.name}"]`).closest('.iframe-container');
                            if(iframeContainer) {
                                iframeContainer.scrollIntoView({ behavior: 'smooth' });
                            }
                        });

                        nav.appendChild(navItem);
                    }

                } else {
                    const iframeToRemove = document.querySelector(`[data-site="${site.name}"]`);
                    if (iframeToRemove) {
                        iframeToRemove.closest('.iframe-container').remove();
                        // 移除导航项
                        const navItems = document.querySelectorAll('.nav-item');
                        navItems.forEach(item => {
                          if (item.textContent.trim() === site.name) {
                            item.remove();
                          }
                        });

                    }
                }
            });
            
            div.appendChild(checkbox);
            div.appendChild(nameLabel);
            fragment.appendChild(div);
        });
        
        siteList.appendChild(fragment);
        
        // 添加保存按钮点击事件
        saveButton.addEventListener('click', async () => {
            try {
                // 获取所有复选框
                const checkboxes = document.querySelectorAll('.site-checkbox');
                
                // 获取当前所有站点配置
                const { sites: currentSites = [] } = await chrome.storage.sync.get('sites');
                
                // 更新站点启用状态
                const updatedSites = currentSites.map(site => {
                    // 找到对应的复选框
                    const checkbox = document.querySelector(`#site-${site.name}`);
                    if (checkbox) {
                        // 如果找到复选框，根据复选框状态设置 enabled
                        return {
                            ...site,
                            enabled: checkbox.checked
                        };
                    }
                    // 如果没找到复选框（不支持 iframe 的站点），保持原状态
                    return site;
                });
                
                // 保存更新后的配置
                await chrome.storage.sync.set({ sites: updatedSites });
                
                // 显示成功提示
                showToast('设置已保存');
                
                console.log('站点设置已更新:', updatedSites);
                
            } catch (error) {
                console.error('保存站点设置失败:', error);
                showToast('保存设置失败');
            }
        });
        
    } catch (error) {
        console.error('获取站点配置失败:', error);
        if (siteList) {
            siteList.innerHTML = '<div class="error-message">加载站点配置失败，请刷新页面重试</div>';
        }
    }
}

// Toast 提示函数
function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 添加显示类名触发动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 定时移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// 设置图标和对话框的事件处理
const settingsIcon = document.querySelector('.settings-icon');
const settingsDialog = document.querySelector('.settings-dialog');

if (settingsIcon && settingsDialog) {
    // 点击设置图标时初始化并显示对话框
    settingsIcon.addEventListener('click', async () => {
        try {
            await initializeSiteSettings();
            settingsDialog.style.display = 'block';
        } catch (error) {
            console.error('初始化站点设置失败:', error);
        }
    });

    // 点击其他地方关闭对话框
    document.addEventListener('click', (event) => {
        if (!settingsDialog.contains(event.target) && 
            !settingsIcon.contains(event.target)) {
            settingsDialog.style.display = 'none';
        }
    });
}

// 初始化国际化
function initializeI18n() {
    // 处理所有带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            if (element.tagName.toLowerCase() === 'input' && 
                element.type === 'text') {
                // 对于输入框，设置 placeholder
                element.placeholder = message;
            } else {
                // 对于其他元素，设置文本内容
                element.textContent = message;
            }
        }
    });
}

// 在页面加载时调用
document.addEventListener('DOMContentLoaded', initializeI18n);



