// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化列数选择
    const columnSelect = document.getElementById('columnSelect');
    const iframesContainer = document.getElementById('iframes-container');

    // 从存储中获取列数设置
    let { preferredColumns = '3' } = await chrome.storage.sync.get('preferredColumns');
    if (window.innerWidth < 500) {
       preferredColumns = '1';
    }
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
                // 过滤出启用的且支持 iframe 的站点，并按order排序
                const availableSites = result.sites.filter(site => 
                    site.enabled && 
                    site.supportIframe !== false && 
                    !site.hidden
                ).sort((a, b) => {
                    const orderA = a.order !== undefined ? a.order : 999;
                    const orderB = b.order !== undefined ? b.order : 999;
                    return orderA - orderB;
                });

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
    // 按照 order 字段排序站点
  const enabledSites = sites.sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 999;
    const orderB = b.order !== undefined ? b.order : 999;
    return orderA - orderB;
  });
    
  console.log('过滤后的站点:', enabledSites);
    
    // 获取容器元素
  const container = document.getElementById('iframes-container');
  if (!container) {
    console.error('未找到 iframes 容器');
    return;
  }
  
  // 保持原有的grid布局，但确保支持order属性
  // 不覆盖CSS中定义的display: grid
    
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
    navItem.draggable = true;
    navItem.dataset.siteName = site.name;
    navItem.dataset.originalIndex = index;
    


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

  // 添加拖拽排序功能
  addDragAndDropToNavList(navList, enabledSites);

  nav.appendChild(navList);
  document.body.insertBefore(nav, container);


  
}



// 创建单个 iframe 时添加标识
function createSingleIframe(siteName, url, container, query) {
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'iframe-container';
  
  // iframe容器不需要特殊的布局设置，CSS Grid会自动处理
  
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
  // 如果参数为空,只使用 url 的 host 部分
  if (!query) {
    try {
      const urlObj = new URL(url);
      url = 'https://' + urlObj.hostname;
    } catch (e) {
      console.error('URL解析失败:', url);
    }
  }
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
  'zhida.zhihu.com': async function(iframe, query) {
      try {
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('知乎直达 iframe 处理开始');
        // 向 iframe 发送消息
        iframe.contentWindow.postMessage({
          type: 'zhihu',
          query: query
        }, '*');
        
      } catch (error) {
        console.error('知乎直达 iframe 处理失败:', error);
      }
    },
  'grok.com': async function(iframe, query) { 
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Grok iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'grok',
        query: query
      }, '*');
      
    } catch (error) {
      console.error('Grok iframe 处理失败:', error);
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
      console.log('秘塔 iframe 处理开始');
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

  'yuanbao.tencent.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('腾讯元宝 iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'yuanbao',
        query: query
      }, '*');
    } catch (error) {
      console.error('腾讯元宝 iframe 处理失败:', error);
    }
  },
'tongyi.com': async function(iframe, query) {
    const maxRetries = 3;
    let retryCount = 0;
    
    const trySendMessage = async () => {
        try {
            // 检查 iframe 是否可访问
            if (!iframe || !iframe.contentWindow) {
                throw new Error('iframe 不可访问');
            }

            // 等待 iframe 加载完成
            await new Promise((resolve, reject) => {
                const checkReady = () => {
                    try {
                        // 尝试访问 contentWindow
                        if (iframe.contentWindow) {
                            resolve();
                        } else {
                            reject(new Error('无法访问 iframe contentWindow'));
                        }
                    } catch (error) {
                        // 如果是跨域错误，我们仍然继续
                        console.log('跨域访问受限，继续执行');
                        resolve();
                    }
                };

                if (iframe.contentWindow) {
                    checkReady();
                } else {
                    iframe.addEventListener('load', checkReady);
                }
            });
            
            // 给页面一些加载时间
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('千问 处理开始，第', retryCount + 1, '次尝试');
            
            // 创建消息确认 Promise
            const messageConfirmed = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('消息确认超时');
                    resolve(false);
                }, 2000);

                const handler = (event) => {
                    console.log('收到消息:', event.data);
                    if (event.data.type === 'message_received' && 
                        event.data.originalType === 'tongyi') {
                        console.log('收到消息确认');
                        clearTimeout(timeout);
                        window.removeEventListener('message', handler);
                        resolve(true);
                    }
                };

                window.addEventListener('message', handler);
            });
            
            // 发送消息
            console.log('发送消息到千问 iframe');
            iframe.contentWindow.postMessage({
                type: 'tongyi',
                query: query
            }, '*');
            
            // 等待确认
            const received = await messageConfirmed;
            
            if (!received && retryCount < maxRetries) {
                retryCount++;
                console.log('消息未收到确认，准备重试');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return trySendMessage();
            }
        } catch (error) {
            console.error('千问 处理失败:', error);
            if (retryCount < maxRetries) {
                retryCount++;
                console.log('发生错误，准备重试');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return trySendMessage();
            }
        }
    };
    
    await trySendMessage();
},

  'www.wenxiaobai.com': async function(iframe, query) {
    try {
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('问小白 iframe 处理开始');
      // 向 iframe 发送消息
      iframe.contentWindow.postMessage({
        type: 'wenxiaobai',
        query: query
      }, '*');
    } catch (error) {
      console.error('问小白 处理失败:', error);
    }
  } 

};

// 添加搜索按钮
document.getElementById('searchButton').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    shanshuo();
    iframeFresh(query);
  }
});

// 处理回车键
document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            shanshuo();
            iframeFresh(query);

        }
        
    }
});   

// 添加输入监听器，当searchInput有内容时显示建议
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    showQuerySuggestions(query);
    updateFavoriteButtonVisibility(query);
});

// 添加焦点事件监听器
document.getElementById('searchInput').addEventListener('focus', (e) => {
    const query = e.target.value.trim();
    if (query) {
        showQuerySuggestions(query);
    }
});

// 添加失焦事件监听器，延迟隐藏建议
document.getElementById('searchInput').addEventListener('blur', (e) => {
    // 延迟隐藏，以便用户能够点击建议项
    setTimeout(() => {
        const querySuggestions = document.getElementById('querySuggestions');
        querySuggestions.style.display = 'none';
    }, 200);
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
            } else if (element.tagName.toLowerCase() === 'button') {
                // 对于按钮，设置 title 属性
                element.title = message;
            } else {
                // 对于其他元素，设置文本内容
                element.textContent = message;
            }
        }
    });
}


async function generateRecommendedQuery(query) {
  //return;

  console.log('生成推荐查询语句', query);
    // 定义推荐查询语句列表
    const recommendedQueries = [

      {
        name: '风险分析',
        query: '导致失败的原因:「' + query + '」'
      },
      {
        name: '解决方案', 
        query: '如何解决问题:「' + query + '」'
      },
      {
        name: '相关知识',
        query: '相关知识点:「' + query + '」'
      },
      {
        name: '最佳实践',
        query: '写一份这件事做成功的回顾报告:「' + query + '」'
      }
    ];
   
  
  const queryList = document.getElementById('queryList');
  queryList.innerHTML = ''; // 清空之前的内容

  recommendedQueries.forEach(recommendedQuery => {
      const queryItem = document.createElement('div');
      queryItem.textContent = recommendedQuery.name; // 使用 name 作为文案
      queryItem.classList.add('query-item'); // 添加样式类
      queryItem.addEventListener('click', () => {
          document.getElementById('searchInput').value = recommendedQuery.query;
          queryList.style.display = 'none'; // 隐藏查询列表
      });
      queryList.appendChild(queryItem);
  });
  
}

// 显示查询建议
function showQuerySuggestions(query) {
  const querySuggestions = document.getElementById('querySuggestions');
  
  if (!query || query.trim() === '') {
    querySuggestions.style.display = 'none';
    return;
  }

  // 定义推荐查询语句列表
  const recommendedQueries = [
    {
      name: '风险分析',
      query: '导致失败的原因:「' + query + '」'
    },
    {
      name: '解决方案', 
      query: '如何解决问题:「' + query + '」'
    },
    {
      name: '相关知识',
      query: '相关知识点:「' + query + '」'
    },
    {
      name: '最佳实践',
      query: '写一份这件事做成功的回顾报告:「' + query + '」'
    }
  ];

  // 清空之前的内容
  querySuggestions.innerHTML = '';

  // 创建建议项
  recommendedQueries.forEach(recommendedQuery => {
    const suggestionItem = document.createElement('div');
    suggestionItem.textContent = recommendedQuery.name;
    suggestionItem.classList.add('query-suggestion-item');
    suggestionItem.addEventListener('click', () => {
      document.getElementById('searchInput').value = recommendedQuery.query;
      querySuggestions.style.display = 'none';
    });
    querySuggestions.appendChild(suggestionItem);
  });

  // 显示建议
  querySuggestions.style.display = 'flex';
}


// 切换图标晃动动画函数
function shakeToggleIcon() {
  const toggleIcon = document.getElementById('toggleIcon');
  if (toggleIcon) {
    // 添加晃动动画类
    toggleIcon.classList.add('toggle-icon-shake');
    
    // 动画结束后移除类名
    setTimeout(() => {
      toggleIcon.classList.remove('toggle-icon-shake');
    }, 500); // 与CSS动画持续时间一致
  }
}

// 添加收藏按钮点击事件
document.getElementById('favoriteButton').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleFavorite();
  // 触发切换图标晃动动画
  shakeToggleIcon();
});

// 添加图标点击事件
document.getElementById('toggleIcon').addEventListener('click', () => {
  const queryList = document.getElementById('queryList');
  if (queryList.style.display === 'none') {
      // 切换图标
       const toggleIcon = document.getElementById('toggleIcon');
       toggleIcon.src = '../icons/up.png'; // 切换为 up.png
      queryList.style.display = 'block'; // 显示收藏的query列表
      
      // 显示收藏夹
      showFavorites();
  } else {
      queryList.style.display = 'none'; // 隐藏查询列表
      document.getElementById('toggleIcon').src = '../icons/down.png'; // 切换回 down.png
  }
});

// 点击收藏夹以外区域隐藏收藏夹
document.addEventListener('click', (e) => {
  const queryList = document.getElementById('queryList');
  const toggleIcon = document.getElementById('toggleIcon');
  
  // 如果收藏夹是显示的
  if (queryList && queryList.style.display === 'block') {
    // 检查点击的元素是否在收藏夹或切换图标内
    const isClickInsideFavorites = queryList.contains(e.target);
    const isClickOnToggleIcon = toggleIcon && toggleIcon.contains(e.target);
    
    // 如果点击在收藏夹和切换图标以外
    if (!isClickInsideFavorites && !isClickOnToggleIcon) {
      // 隐藏收藏夹
      queryList.style.display = 'none';
      // 切换图标回 down.png
      if (toggleIcon) {
        toggleIcon.src = '../icons/down.png';
      }
    }
  }
});


// 创建闪烁效果函数
function shanshuo() {
  // 获取搜索按钮元素
  const searchButton = document.getElementById('searchButton');
      searchButton.classList.add('active');
      
      // 200ms后移除active效果
      setTimeout(() => {
          searchButton.classList.remove('active');
      }, 200);
}



async function iframeFresh(query) {    
        
      // 获取所有 iframe
      const iframes = document.querySelectorAll('iframe');
          // 从 storage 获取站点配置
     
      const { sites = [] } = await chrome.storage.sync.get('sites');

        // 遍历每个 iframe
      iframes.forEach(iframe => {
        try {
            // 从 src 中提取域名
            const url = new URL(iframe.src);
            const domain = url.hostname;
            console.log('当前iframe网站hostname:', domain);
            // 通过 data-site 属性获取站点名
            const siteName = iframe.getAttribute('data-site');

            const siteConfig = sites.find(site => site.name === siteName);
            // 如果站点配置存在并且支持 URL 查询
            if (siteConfig && siteConfig.supportUrlQuery) {
                // 获取 URL
                const url = siteConfig.url;
                // 根据 URL 和 query 拼接新的 URL
                const newUrl = url.replace('{query}', encodeURIComponent(query));
                console.log(`为 ${siteName} iframe 生成新的 URL: ${newUrl}`);
                // 让 iframe 访问新的 URL
                iframe.src = newUrl;
            }
            else{
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
              else 
              {
                console.log('没有找到处理函数');
              }
          }
        } catch (error) {
            console.error('处理 iframe 失败:', error);
        }
    });
    

      
      
  


}



// 在页面加载时调用
document.addEventListener('DOMContentLoaded', async () => {
  initializeI18n();
  await initializeFavorites();
});

// 收藏功能实现
let favoritePrompts = [];

// 初始化收藏功能
async function initializeFavorites() {
  try {
    const { favoritePrompts: savedFavorites = [] } = await chrome.storage.sync.get('favoritePrompts');
    favoritePrompts = savedFavorites;
    console.log('加载的收藏提示词:', favoritePrompts);
  } catch (error) {
    console.error('加载收藏提示词失败:', error);
  }
}

// 更新收藏按钮的显示状态
function updateFavoriteButtonVisibility(query) {
  const favoriteButton = document.getElementById('favoriteButton');
  const favoriteIcon = document.getElementById('favoriteIcon');
  
  if (query) {
    favoriteButton.style.display = 'block';
    // 检查当前文本是否已收藏
    const isFavorited = favoritePrompts.includes(query);
    favoriteIcon.src = isFavorited ? '../icons/star_saved.png' : '../icons/star_unsaved.png';
  } else {
    favoriteButton.style.display = 'none';
  }
}

// 切换收藏状态
async function toggleFavorite() {
  const searchInput = document.getElementById('searchInput');
  const query = searchInput.value.trim();
  const favoriteIcon = document.getElementById('favoriteIcon');
  
  if (!query) return;
  
  try {
    const index = favoritePrompts.indexOf(query);
    
    if (index > -1) {
      // 取消收藏
      favoritePrompts.splice(index, 1);
      favoriteIcon.src = '../icons/star_unsaved.png';
      console.log('取消收藏:', query);
    } else {
      // 添加收藏
      favoritePrompts.push(query);
      favoriteIcon.src = '../icons/star_saved.png';
      console.log('添加收藏:', query);
    }
    
    // 保存到存储
    await chrome.storage.sync.set({ favoritePrompts: favoritePrompts });
    console.log('收藏列表已更新:', favoritePrompts);
    
  } catch (error) {
    console.error('保存收藏失败:', error);
  }
}

// 显示收藏夹
function showFavorites() {
  const queryList = document.getElementById('queryList');
  
  if (favoritePrompts.length === 0) {
    const favoritesTitle = chrome.i18n.getMessage('favoritesTitle');
    const noFavoritesMessage = chrome.i18n.getMessage('noFavorites');
    queryList.innerHTML = `<div class="favorites-section"><div class="favorites-title">${favoritesTitle}</div><div style="padding: 10px; color: #666; text-align: center;">${noFavoritesMessage}</div></div>`;
  } else {
    const favoritesTitle = chrome.i18n.getMessage('favoritesTitle');
    let html = `<div class="favorites-section"><div class="favorites-title">${favoritesTitle}</div>`;
    
    favoritePrompts.forEach((prompt, index) => {
      html += `
        <div class="favorite-item" data-prompt="${prompt.replace(/"/g, '&quot;')}" data-index="${index}">
          <div class="favorite-item-content">${prompt}</div>
          <div class="favorite-item-actions">
          
           <!--
            <button class="favorite-item-edit" title="编辑">
              <img src="../icons/edit.png" alt="编辑">
            </button>
            -->

            <button class="favorite-item-delete" title="删除">
              <img src="../icons/close.png" alt="删除">
            </button>
           
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    queryList.innerHTML = html;
    
    // 添加点击事件
    queryList.querySelectorAll('.favorite-item').forEach(item => {
      const content = item.querySelector('.favorite-item-content');
      const editBtn = item.querySelector('.favorite-item-edit');
      const deleteBtn = item.querySelector('.favorite-item-delete');
      
      // 点击内容区域选择提示词
      content.addEventListener('click', (e) => {
        e.stopPropagation();
        const prompt = item.getAttribute('data-prompt');
        document.getElementById('searchInput').value = prompt;
        queryList.style.display = 'none';
        document.getElementById('toggleIcon').src = '../icons/down.png';
        
        // 更新收藏按钮状态
        updateFavoriteButtonVisibility(prompt);
      });
      
      // 编辑按钮点击事件（如果存在）
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editFavoriteItem(item);
        });
      }
      
      // 删除按钮点击事件
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('删除按钮被点击');
          deleteFavoriteItem(item);
        });
      }
    });
  }
  
  queryList.style.display = 'block';
}

// 编辑收藏项
function editFavoriteItem(item) {
  console.log('进入编辑收藏项');
  showToast('coming soon');
}

// 删除收藏项
async function deleteFavoriteItem(item) {
  console.log('deleteFavoriteItem 函数被调用');
  const index = parseInt(item.getAttribute('data-index'));
  const prompt = item.getAttribute('data-prompt');
  console.log('删除索引:', index, '提示词:', prompt);
  
  const deleteConfirmMessage = chrome.i18n.getMessage('deleteConfirm');
  if (confirm(deleteConfirmMessage)) {
    try {
      // 从数组中删除
      favoritePrompts.splice(index, 1);
      
      // 保存到存储
      await chrome.storage.sync.set({ favoritePrompts: favoritePrompts });
      
      // 重新显示收藏夹
      showFavorites();
      
      console.log('删除收藏提示词:', prompt);
    } catch (error) {
      console.error('删除收藏失败:', error);
    }
  }
}

// 添加拖拽排序功能到导航列表
function addDragAndDropToNavList(navList, enabledSites) {
  let draggedElement = null;
  let draggedIndex = null;

  // 拖拽开始
  navList.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('nav-item')) {
      draggedElement = e.target;
      draggedIndex = Array.from(navList.children).indexOf(e.target);
      e.target.classList.add('dragging');
      navList.classList.add('drag-active');
      
      // 设置拖拽数据
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.target.outerHTML);
    }
  });

  // 拖拽结束
  navList.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('nav-item')) {
      e.target.classList.remove('dragging');
      navList.classList.remove('drag-active');
      
      // 移除所有拖拽悬停效果
      navList.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('drag-over');
      });
      
      draggedElement = null;
      draggedIndex = null;
    }
  });

  // 拖拽悬停
  navList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(navList, e.clientY);
    const dragging = navList.querySelector('.dragging');
    
    if (afterElement == null) {
      navList.appendChild(dragging);
    } else {
      navList.insertBefore(dragging, afterElement);
    }
  });

  // 拖拽进入
  navList.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('nav-item') && e.target !== draggedElement) {
      e.target.classList.add('drag-over');
    }
  });

  // 拖拽离开
  navList.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('nav-item')) {
      e.target.classList.remove('drag-over');
    }
  });

  // 拖拽放置
  navList.addEventListener('drop', async (e) => {
    e.preventDefault();
    
    if (draggedElement) {
      const newIndex = Array.from(navList.children).indexOf(draggedElement);
      
      if (newIndex !== draggedIndex) {
        // 更新站点顺序
        await updateSitesOrder(enabledSites, draggedIndex, newIndex);
        
        // 重新排列iframe
        await reorderIframes(draggedIndex, newIndex);
        
        console.log('导航项顺序已更新');
      }
    }
  });
}

// 获取拖拽后的元素位置
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.nav-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 更新站点顺序
async function updateSitesOrder(enabledSites, fromIndex, toIndex) {
  // 移动数组中的元素
  const movedSite = enabledSites.splice(fromIndex, 1)[0];
  enabledSites.splice(toIndex, 0, movedSite);
  
  // 获取所有站点配置
  const { sites = [] } = await chrome.storage.sync.get('sites');
  
  // 更新站点配置中的顺序
  const updatedSites = sites.map(site => {
    const enabledSite = enabledSites.find(es => es.name === site.name);
    if (enabledSite) {
      return { ...site, order: enabledSites.indexOf(enabledSite) };
    }
    return site;
  });
  
  // 保存更新后的配置
  await chrome.storage.sync.set({ sites: updatedSites });
  
  console.log('站点顺序已保存到存储');
}

// 重新排列iframe
async function reorderIframes(fromIndex, toIndex) {
  const container = document.getElementById('iframes-container');
  const iframeContainers = Array.from(container.querySelectorAll('.iframe-container'));
  
  if (iframeContainers.length > 0) {
    // 获取导航项的新顺序
    const navList = document.querySelector('.nav-list');
    const navItems = Array.from(navList.children);
    
    // 为每个iframe容器设置CSS order属性，避免移动DOM元素
    navItems.forEach((navItem, index) => {
      const siteName = navItem.textContent;
      const iframeContainer = iframeContainers.find(container => {
        const iframe = container.querySelector('iframe');
        return iframe && iframe.getAttribute('data-site') === siteName;
      });
      
      if (iframeContainer) {
        // 使用CSS order属性来控制显示顺序，不移动DOM元素
        iframeContainer.style.order = index;
      }
    });
    
    // CSS Grid布局已经支持order属性，无需额外设置
    
    console.log('iframe顺序已更新，使用CSS order属性');
  }
}



