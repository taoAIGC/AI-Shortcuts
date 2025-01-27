importScripts('./config/defaultSites.js');
importScripts('config/config.js');  // 在 background.js 开头导入 config.js

// 在扩展启动时检查规则
chrome.declarativeNetRequest.getSessionRules().then(rules => {
  console.log('当前生效的规则:', rules);
});


// 如果规则为空，尝试动态添加规则
chrome.declarativeNetRequest.updateSessionRules({
  removeRuleIds: [], // 如果需要，可以先清除现有规则
  addRules: [{
    "id": 999,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
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

/*
// 监听规则匹配情况
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
  (info) => {
    console.log('规则匹配:', info);
  }
);*/

// 后续的 background 代码


// 监听插件安装事件
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    // 获取当前存储的数据
    const { sites, favoriteSites } = await chrome.storage.sync.get(['sites', 'favoriteSites']);
    
    // 处理 sites 数据
    console.log('开始与原始sites合并:', sites);
    console.log('原始sites:', self.defaultSites);
    if (sites && sites.length) {
      // 如果已有数据，合并配置
      const mergedSites = self.defaultSites.map(defaultSite => {
        const existingSite = sites.find(site => site.name === defaultSite.name);
        if (existingSite) {
          // 保留原有的 enabled 状态，其他使用默认配置
          return {
            ...defaultSite,
            enabled: existingSite.enabled
          };
        }
        return defaultSite;
      });
      
      await chrome.storage.sync.set({ sites: mergedSites });
      console.log('已合并更新 sites:', mergedSites);
    } else {
      // 如果没有数据，直接使用默认配置
      await chrome.storage.sync.set({ sites: self.defaultSites });
      console.log('已初始化 sites:', self.defaultSites);
    }
    
    // 处理 favoriteSites 数据
    if (!favoriteSites || !favoriteSites.length) {
      // 只在没有数据时才初始化 favoriteSites
      await chrome.storage.sync.set({ 
        favoriteSites: defaultFavoriteSites 
      });
      console.log('已初始化 favoriteSites:', defaultFavoriteSites);
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
});



// 处理右键菜单点击和消息
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchWithMultiAI" && info.selectionText) {
    openSearchTabs(info.selectionText);
  }
});

// 处理来自 float-button 和 popup 和 content-scripts 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'createComparisonPage') {
    console.log('createComparisonPage-opensearchtab:', message.query);
    openSearchTabs(message.query);
  } 
  else if (message.action === 'processQuery') {
    // 添加对 processQuery 消息的处理
    console.log('processQuery:', message.query, message.sites);
    openSearchTabs(message.query, message.sites);
  }
  else if (message.action === 'singleSiteSearch') {
    handleSingleSiteSearch(message.query, message.siteName);
    console.log('singleSiteSearch:', message.query, message.siteName);
  }
  else if (message.action === 'openOptionsPage') {
    // 立即打开设置页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('options/options.html')
    });
    
  }
});

// 处理来自 iframe 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'executeHandler') {
    const handler = getHandlerForUrl(message.url);
    if (handler) {
      handler(sender.tab.id, message.query).catch(error => {
        console.error('站点处理失败:', error);
      });
    }
  }
});





// 站点处理函数集合
const siteHandlers = {
  // ChatGPT 处理函数
  'chatgpt.com': async function(tabId, query) {
    console.log('开始处理 ChatGPT 站点, tabId:', tabId);
    console.log('待发送的查询:', query);
    
    try {
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
        
        // 然后执行脚本
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (searchQuery) => {
            console.log('在激活的标签页执行脚本');
            // 找到可编辑的 div
            const editableDiv = document.querySelector('#prompt-textarea');
            if (!editableDiv) {
              console.error('未找到输入框');
              return;
            }

            // 1. 先聚焦输入框
            editableDiv.focus();
            
            // 2. 修改文本内容
            const pElement = editableDiv.querySelector('p');
            if (pElement) {
              pElement.innerText = searchQuery;
            } else {
              editableDiv.innerHTML = '<p></p>';
              editableDiv.querySelector('p').innerText = searchQuery;
            }
            
            // 3. 触发更多事件
            const events = ['input', 'change', 'blur', 'focus'];
            events.forEach(eventName => {
              editableDiv.dispatchEvent(new Event(eventName, { bubbles: true }));
            });

            // 4. 给一个小延迟再点击发送按钮
            setTimeout(() => {
              const sendButton = document.querySelector('button[data-testid="send-button"]');
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
              }
            }, 100);
          },
          args: [query]
        });
        console.log('ChatGPT 脚本执行完成');
      } catch (error) {
        console.error('执行失败:', error);
      }
    } catch (error) {
      console.error('ChatGPT 处理过程出错:', error);
      throw error;
    }
  },

  // Copilot 处理函数
  'copilot.microsoft.com': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 使用 ID 选择器找到输入框
          const textArea = document.querySelector('textarea#userInput');
          if (!textArea) {
            console.error('未找到输入框');
            return;
          }

          // 1. 聚焦输入框
          textArea.focus();
          
          // 2. 设置文本内容
          textArea.value = searchQuery;
          
          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventName => {
            textArea.dispatchEvent(new Event(eventName, { bubbles: true }));
          });

          // 4. 点击发送按钮
          setTimeout(() => {
            const sendButton = document.querySelector('button[title="Submit message"]');
            if (sendButton && !sendButton.disabled) {
              sendButton.click();
            } else {
              console.error('未找到发送按钮或按钮被禁用');
            }
          }, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('Copilot 处理过程出错:', error);
      throw error; 
    }
  },

  // Claude 处理函数
  'claude.ai': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 300));
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到可编辑的 div
          const editableDiv = document.querySelector('[contenteditable="true"]');
          if (!editableDiv) {
            console.error('未找到输入框');
            return;
          }

          // 1. 先聚焦输入框
          editableDiv.focus();
          
          // 2. 修改 p 标签的文本内容
          const pElement = editableDiv.querySelector('p');
          if (pElement) {
            pElement.innerText = searchQuery;
          } else {
            editableDiv.innerHTML = '<p></p>';
            editableDiv.querySelector('p').innerText = searchQuery;
          }
          
          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventName => {
            editableDiv.dispatchEvent(new Event(eventName, { bubbles: true }));
          });

          // 4. 使用更精确的选择器找到发送按钮并点击
          setTimeout(() => {
            const sendButton = document.querySelector('button[type="button"][aria-label="Send Message"]');
            if (sendButton && !sendButton.disabled) {
              sendButton.click();
            } else {
              console.error('未找到发送按钮或按钮被禁用');
            }
          }, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('Claude 处理过程出错:', error);
      throw error;
    }
  },

  // Kimi 处理函数
  'kimi.moonshot.cn': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 500));
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到输入框
          const editableDiv = document.querySelector('.chat-input-editor');
          if (!editableDiv) {
            console.error('未找到输入框');
            return;
          }
          console.log('找到输入框editableDiv:', editableDiv);
          const p = document.createElement('p');
          const span = document.createElement('span');
          span.setAttribute('data-lexical-text', 'true');
          span.textContent = searchQuery;
          p.appendChild(span);
          
          // 清空并插入新内容
          editableDiv.innerHTML = '';
          editableDiv.appendChild(p);
          console.log('插入新内容:', editableDiv);

          // 触发输入事件
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: searchQuery
          });
          editableDiv.dispatchEvent(inputEvent);
          
          // 触发变更事件
          editableDiv.dispatchEvent(new Event('change', { bubbles: true }));

          // 4. 延长等待时间，并多次尝试点击
          const maxAttempts = 5;
          let attempts = 0;

          const tryClick = () => {
            const sendButton = document.querySelector('.send-button');
            console.log('尝试点击次数:', attempts + 1);
            
            if (sendButton) {
              console.log('按钮状态:', {
                disabled: sendButton.disabled,
                'aria-disabled': sendButton.getAttribute('aria-disabled'),
                className: sendButton.className
              });
              
              if (!sendButton.disabled) {
                sendButton.click();
                console.log('按钮点击成功');
                return true;
              }
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(tryClick, 200); // 每200ms尝试一次
            } else {
              console.error('达到最大尝试次数，按钮仍然被禁用');
            }
          };

          // 开始尝试点击
          setTimeout(tryClick, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('Kimi 处理过程出错:', error);
      throw error;
    }
  },

  // POE 处理函数
  'poe.com': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 100));
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到输入框容器
          const growingTextArea = document.querySelector('.GrowingTextArea_growWrap__im5W3');
          if (!growingTextArea) {
            console.error('未找到输入框容器');
            return;
          }

          // 1. 更新 data-replicated-value 属性
          growingTextArea.setAttribute('data-replicated-value', searchQuery);

          // 2. 找到实际的 textarea 并更新值
          const textarea = growingTextArea.querySelector('textarea');
          if (textarea) {
            textarea.value = searchQuery;
            // 触发必要的事件
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 3. 查找并点击发送按钮
          setTimeout(() => {
            const sendButton = document.querySelector('button[data-button-send="true"]');
            if (sendButton && !sendButton.disabled) {
              sendButton.click();
            } else {
              console.error('未找到发送按钮或按钮被禁用');
            }
          }, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('POE 处理过程出错:', error);
      throw error;
    }
  },

  // Gemini 处理函数
  'gemini.google.com': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 100));
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到输入框 (Gemini 使用 contenteditable div)
          const editableDiv = document.querySelector('[contenteditable="true"]');
          if (!editableDiv) {
            console.error('未找到输入框');
            return;
          }

          // 1. 先聚焦输入框
          editableDiv.focus();
          
          // 2. 修改 p 标签的文本内容
          const pElement = editableDiv.querySelector('p');
          if (pElement) {
            pElement.innerText = searchQuery;
          } else {
            editableDiv.innerHTML = '<p></p>';
            editableDiv.querySelector('p').innerText = searchQuery;
          }
          
          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventName => {
            editableDiv.dispatchEvent(new Event(eventName, { bubbles: true }));
          });

          // 4. 查找并点击发送按钮
          setTimeout(() => {
            // Gemini 的发送按钮通常有特定的 aria-label
            const sendButton = document.querySelector('button[aria-label="发送消息"]');
            if (sendButton && !sendButton.disabled) {
              sendButton.click();
            } else {
              console.error('未找到发送按钮或按钮被禁用');
            }
          }, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('Gemini 处理过程出错:', error);
      throw error;
    }
  },
  // deepseek 处理函数
  'chat.deepseek.com': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 100));
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到输入框 (deepseek 使用 textarea)
          const textarea = document.querySelector('textarea');
          if (!textarea) {
            console.error('未找到输入框');
            return;
          }

          // 1. 先聚焦输入框
          textarea.focus();
          
          // 2. 设置文本内容
          textarea.value = searchQuery;
          
          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventName => {
            textarea.dispatchEvent(new Event(eventName, { bubbles: true }));
          });

          // 4. 查找并点击发送按钮
          setTimeout(() => {
            const sendButton = document.querySelector('.f286936b');
            if (sendButton && !sendButton.disabled) {
              sendButton.click();
              console.log("deepseek 发送按钮点击成功");
            } else {
              console.error('deepseek未找到发送按钮或按钮被禁用');
            }
          }, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('Deepseek 处理过程出错:', error);
      throw error;
    }
  },
  // 豆包处理函数
  'doubao.com': async function(tabId, query) {
    try {
      // 给页面一点加载时间
      await new Promise(resolve => setTimeout(resolve, 100));
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到 textarea 输入框
          const textarea = document.querySelector('textarea[data-testid="chat_input_input"]');
          if (!textarea) {
            console.error('未找到输入框');
            return;
          }

          // 1. 先聚焦输入框
          textarea.focus();
          
          // 2. 设置文本内容
          textarea.value = searchQuery;
          
          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus', 'keydown', 'keyup', 'keypress'];
          events.forEach(eventName => {
            textarea.dispatchEvent(new Event(eventName, { bubbles: true }));
            // 对于键盘事件，模拟回车键
            if (eventName.startsWith('key')) {
              textarea.dispatchEvent(new KeyboardEvent(eventName, {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
              }));
            }
          });

          // 4. 多次尝试点击发送按钮
          const maxAttempts = 5;
          let attempts = 0;

          const tryClick = () => {
            const sendButton = document.querySelector('button[aria-label="发送"]');
            console.log('尝试点击次数:', attempts + 1);
            
            if (sendButton) {
              console.log('按钮状态:', {
                disabled: sendButton.disabled,
                'aria-disabled': sendButton.getAttribute('aria-disabled'),
                className: sendButton.className
              });
              
              if (!sendButton.disabled) {
                sendButton.click();
                console.log('按钮点击成功');
                return true;
              }
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(tryClick, 200);
            } else {
              console.error('达到最大尝试次数，按钮仍然被禁用');
            }
          };

          setTimeout(tryClick, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('豆包处理过程出错:', error);
      throw error;
    }
  },
  // 秘塔处理函数
  'metaso.cn': async function(tabId, query) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 使用正确的选择器找到输入框
          // 点击"过年买啥"区域
          if (window.location.href.includes('/search/')) {
            const recommendBox = document.querySelector('div.MuiBox-root.css-qtri4c');
            if (recommendBox) {
              recommendBox.click();
              console.log('在搜索页面点击了推荐区域');
              
              return new Promise(resolve => {
                setTimeout(() => {
                  console.log('1秒等待结束');
                  const textarea = document.querySelector('.search-consult-textarea');
                  if (!textarea) {
                    console.error('未找到秘塔输入框');
                    resolve();  // 即使失败也要 resolve
                    return;
                  }
                  
                  // 设置文本内容
                  textarea.value = searchQuery;
                  console.log('秘塔设置输入内容:', searchQuery);

                  // 触发输入事件
                  textarea.dispatchEvent(new Event('input', { bubbles: true }));
                  
                  // 触发回车事件
                  const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                  });
                  textarea.dispatchEvent(enterEvent);
                  
                  resolve();  // 完成所有操作后 resolve
                }, 1000);
              });
            } else {
              console.log('未找到推荐区域');
            }
          } else {
            console.log('不在搜索页面，跳过点击操作');
          
          
            const textarea = document.querySelector('.search-consult-textarea');
            if (!textarea) {
              console.error('未找到秘塔输入框');
              return;
            }
            

            // 设置文本内容
            textarea.value = searchQuery;
            console.log('秘塔设置输入内容:', searchQuery);

            // 触发输入事件
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // 触发回车事件
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true
            });
            textarea.dispatchEvent(enterEvent);
            // 监听回车事件是否成功触发
            let enterTriggered = false;
            textarea.addEventListener('keydown', (e) => {
              if(e.key === 'Enter') {
                console.log('回车事件成功触发');
                enterTriggered = true;
              }
            });
            
            // 触发回车事件后检查
            setTimeout(() => {
              if(!enterTriggered) {
                console.log('回车事件未成功触发');
              }
            }, 100);
          }
        },
        args: [query]
      });
    } catch (error) {
      console.error('秘塔处理出错:', error);
    }
  },

  
  // 文心一言处理函数
  'yiyan.baidu.com': async function(tabId, query) {
    try {
    

      // 2. 等待一下确保页面加载
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 执行主要逻辑
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (searchQuery) => {
          // 找到输入框
          const editableDiv = document.querySelector('.yc-editor');
          if (!editableDiv) {
            console.error('未找到输入框');
            return;
          }

          // 1. 先聚焦输入框
          editableDiv.focus();

          // 2. 找到 yc-editor-paragraph 类的 p 元素
          const p = document.querySelector('p.yc-editor-paragraph');
          if (p) {
            p.innerHTML = '';
          }
          
          const span = document.createElement('span');
          span.setAttribute('data-lexical-text', 'true');
          span.textContent = searchQuery;
          
          p.appendChild(span);

          // 触发输入事件
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: searchQuery
          });
          editableDiv.dispatchEvent(inputEvent);
          
          // 触发变更事件
          editableDiv.dispatchEvent(new Event('change', { bubbles: true }));

          console.log('文心一言插入新内容:', editableDiv);

          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventName => {
            editableDiv.dispatchEvent(new Event(eventName, { bubbles: true }));
          });
          
          // 4. 延迟点击发送按钮
          const maxAttempts = 5;
          let attempts = 0;

          const tryClick = () => {
            const sendButton = document.querySelector('#sendBtn');
            console.log('尝试点击次数:', attempts + 1);
            
            if (sendButton) {
              console.log('按钮状态:', {
                disabled: sendButton.disabled,
                'aria-disabled': sendButton.getAttribute('aria-disabled'),
                className: sendButton.className
              });
              
              if (!sendButton.disabled) {
                sendButton.click();
                console.log('按钮点击成功');
                return true;
              }
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(tryClick, 200);
            } else {
              console.error('达到最大尝试次数，按钮仍然被禁用');
            }
          };

          setTimeout(tryClick, 100);
        },
        args: [query]
      });
    } catch (error) {
      console.error('文心一言处理过程出错:', error);
      throw error;
    }
  },
};

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

  // 处理单站点搜索
  async function handleSingleSiteSearch(query, siteName) {
    console.log('开始处理单站点搜索:', query, siteName);

  try {
    console.log('handleSingleSiteSearch处理单站点搜索:', query, siteName);
    const siteConfig = defaultSites.find(site => site.name === siteName);
    if (siteConfig) {
      const url = siteConfig.url.replace('{query}', encodeURIComponent(query));
      const tab = await chrome.tabs.create({ url, active: true });
      // 判断是否支持URL拼接查询
      if (siteConfig.supportUrlQuery) {
        // URL 拼接方式的站点,直接打开新标签页
        console.log('使用URL拼接方式打开:', url);
      } else {
        // 需要脚本控制的站点
        console.log('使用脚本控制方式打开:', url);
        const handler = getHandlerForUrl(url);
        if (handler) {
          // 等待标签页加载完成
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              // 执行对应站点的处理函数
              handler(tab.id, query).catch(error => {
                console.error('站点处理失败:', error);
              });
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('单站点搜索失败:', error);
  }
}

// 修改后的 openSearchTabs 函数
async function openSearchTabs(query, checkedSites = null) {
  console.log('开始执行多AI查询 查询词:', query);
  const { sites } = await chrome.storage.sync.get('sites');
  
  if (!sites || !sites.length) {
    console.error('未找到AI站点配置');
    return;
  }
  
  // 首先检查是否有符合条件的站点

  const result = checkedSites 
    ? sites.filter(site => checkedSites.includes(site.name))
    : sites.filter(site => site.enabled);
    
  console.log('符合条件的站点:', result);

  // 过滤出支持 iframe 的站点
  const iframeSites = result.filter(site => 
      site.supportIframe === true
  );

  if (iframeSites.length > 0) {
      console.log('找到支持 iframe 的启用站点:', iframeSites);
      
      const newTab = await chrome.tabs.create({
          url: chrome.runtime.getURL('iframe/iframe.html'),
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
        const allTabs = await chrome.tabs.query({});
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
        const handler = getHandlerForUrl(siteDomain);
        if (handler) {
          console.log('执行站点处理函数',handler);
          console.log('标签页ID:', existingTab.id);
          await handler(existingTab.id, query);
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
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            console.log('标签页URL:', tab.url);
            console.log('站点URL:', url);
            const handler = getHandlerForUrl(url);
            if (handler) {
              handler(tab.id, query);
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

// 确保代码在 Service Worker 环境中运行
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onInstalled.addListener(() => {
        console.log('Extension installed');
    });
}

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

// 确保异步操作正确处理
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        // 你的初始化代码
    } catch (error) {
        console.error('初始化失败:', error);
    }
});