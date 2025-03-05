// 监听来自扩展的消息
window.addEventListener('message', async function(event) {
    console.log('收到query:',event.data.query, '收到type:',event.data.type);
    console.log('收到消息event 原始:',event);

  // 处理 ChatGPT 消息
  if (event.data.type === 'chatgpt') {
    const searchQuery = event.data.query;
    console.log('处理 ChatGPT 消息:', searchQuery);

    try {
      // 查找输入框
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

    } catch (error) {
      console.error('ChatGPT 消息处理失败:', error);
    } 
  }

  if (event.data.type === 'KIMI') {
    let searchQuery = event.data.query;
    searchQuery = '<span data-lexical-text="true">'+searchQuery+'</span>';
    await new Promise(resolve => setTimeout(resolve, 100));

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
  }

  if (event.data.type === 'zhihu') {
    const searchQuery = event.data.query;
    console.log('收到 zhihu 消息:', searchQuery);
     // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 500));
          

        
          
          
          const textarea = document.querySelector('textarea');
          if (!textarea) {
            console.error('未找到输入框');
            return;
          }

          if (textarea) {
            textarea.focus();
            textarea.value = searchQuery;
            // 触发必要的事件
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }

          
          // 3. 触发必要的事件
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventName => {
            textarea.dispatchEvent(new Event(eventName, { bubbles: true }));
          });

          // 4. 查找并点击发送按钮
          setTimeout(() => {
              const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                location: 0,
                repeat: false,
                isComposing: false
              });
              textarea.dispatchEvent(enterEvent);
              /*
              // 使用更精确的选择器匹配按钮
              const sendButton = document.querySelector('div.css-175oi2r.r-1loqt21.r-1otgn73');
              
              // 备用选择器：通过组合类名和SVG来定位
              const altSendButton = document.querySelector('div.css-175oi2r.r-1loqt21.r-1otgn73 svg')?.closest('.css-175oi2r');
              
              const buttonToClick = sendButton || altSendButton;
              
              if (buttonToClick) {
                buttonToClick.click();
                console.log("知乎直达发送按钮点击成功");

              } else {
                console.log('未找到知乎直达发送按钮，当前按钮结构:', document.querySelector('div.css-175oi2r')?.outerHTML);
              }*/
          
          }, 100);
    
  }

// 处理 GEMINI 消息
if (event.data.type === 'gemini') {
  const searchQuery = event.data.query;
  console.log('收到 GEMINI 消息:', searchQuery);

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 1000));
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
  
}
if (event.data.type === 'grok') {
  const searchQuery = event.data.query;
  console.log('收到 Grok 消息:', searchQuery);

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 100));

  
  const textarea = document.querySelector('textarea');
  if (!textarea) {
    console.error('未找到输入框');
    return;
  }

  if (textarea) {
    textarea.focus();
    textarea.value = searchQuery;
    // 触发必要的事件
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  
  // 3. 触发必要的事件
  const events = ['input', 'change', 'blur', 'focus'];
  events.forEach(eventName => {
    textarea.dispatchEvent(new Event(eventName, { bubbles: true }));
  });

  // 4. 发送回车
  setTimeout(() => {
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      location: 0,
      repeat: false,
      isComposing: false
    });
    textarea.dispatchEvent(enterEvent);
  }, 100);

}
// 处理元宝 消息
if (event.data.type === 'yuanbao') {
  const searchQuery = event.data.query;
  console.log('收到 Yuanbao 消息:', searchQuery);

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 100));


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
            console.log('找到 p 元素:', pElement);  
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

  // 4. 发送回车
  setTimeout(() => {
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      location: 0,
      repeat: false,
      isComposing: false
    });
    editableDiv.dispatchEvent(enterEvent);
  }, 100);


}

// 处理 POE 消息
if (event.data.type === 'poe') {
  const searchQuery = event.data.query;
  console.log('收到 POE 消息:', searchQuery);

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 100));

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
}
// 处理 Claude 消息
if (event.data.type === 'claude') {
  const searchQuery = event.data.query;
  console.log('收到 Claude 消息:', searchQuery);

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 300));

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
}
// 处理 deepseek 消息
if (event.data.type === 'deepseek') {
  const searchQuery = event.data.query;
  console.log('收到 deepseek 消息:', searchQuery);

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 300));
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
  
}

// 处理 YIYAN 消息
  if (event.data.type === 'YIYAN') {
    const searchQuery = event.data.query;
    console.log('收到 YIYAN 消息:', searchQuery);
    
    // 等待一下确保页面加载
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 找到输入框
    const editableDiv = document.querySelector('.yc-editor');
    if (!editableDiv) {
      console.error('未找到输入框');
      return;
    }

    // 先聚焦输入框
    editableDiv.focus();

    // 找到或创建 yc-editor-paragraph 类的 p 元素
    let p = document.querySelector('p.yc-editor-paragraph');
    if (!p) {
      p = document.createElement('p');
      p.className = 'yc-editor-paragraph';
      editableDiv.appendChild(p);
    }

    // 使用 replaceChildren 方法直接替换内容
    const span = document.createElement('span');
    span.setAttribute('data-lexical-text', 'true');
    span.textContent = searchQuery;
    requestAnimationFrame(() => {
        p.replaceChildren(span);
        console.log('替换后的 p:', p.innerHTML,p);
        // 触发变更事件
    editableDiv.dispatchEvent(new Event('change', { bubbles: true }));
        // 6. 触发必要的事件
        ['input', 'change', 'blur', 'focus'].forEach(eventName => {
          editableDiv.dispatchEvent(new Event(eventName, { bubbles: true }));
        });
        const maxAttempts = 5;
    let attempts = 0;

    const tryClick = () => {
      const sendButton = document.querySelector('#sendBtn');
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        return true;
      }
      if (++attempts < maxAttempts) {
        setTimeout(tryClick, 200);
      }
    };

    setTimeout(tryClick, 100);
      });
    
  }
  if (event.data.type === 'doubao') {
    const searchQuery = event.data.query;
    console.log('收到 doubao 消息:', searchQuery);
    await new Promise(resolve => setTimeout(resolve, 100));
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

          //setTimeout(tryClick, 100);

  }
  if (event.data.type === 'copilot') {
    const searchQuery = event.data.query;
    console.log('收到 copilot 消息:', searchQuery);

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 300));
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
  }
  if (event.data.type === 'metaso') {
    const searchQuery = event.data.query;
    console.log('收到 metaso 消息:', searchQuery);
    // 从 window.frameElement 获取 iframe 的 src
    const getIframeUrl = () => {
        try {
            if (window.frameElement) {
                return window.frameElement.src;
            }
            return document.baseURI || window.location.href;
        } catch (e) {
            console.error('获取 iframe URL 失败:', e);
            return '';
        }
    };

    const iframeUrl = getIframeUrl();
    console.log('iframe URL:', iframeUrl);

    if (iframeUrl.includes('/search/')) {
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
            }, 500);
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

    // 处理完成后发送响应
    window.parent.postMessage({
        type: 'metaso_response',
        success: true,
        // 其他需要返回的数据...
    }, '*');
  } 

}); 

// 标记是否已经添加了点击处理器
let clickHandlerAdded = false;

// 统一的点击处理函数
function handleLinkClick(e) {
  console.log("handleLinkClick 触发")
  const link = e.target.closest('a');
  if (link && link.href) {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡
    window.parent.postMessage({
      type: 'LINK_CLICK',
      href: link.href
    }, '*');
  }
}

// 监听来自父窗口的消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'INJECT_CLICK_HANDLER' && !clickHandlerAdded) {
    document.addEventListener('click', handleLinkClick);
    console.log("收到Iframe消息 添加消息处理 ")
    clickHandlerAdded = true;
  }
});

// 如果还没有添加点击处理器，则添加
if (!clickHandlerAdded) {
  document.addEventListener('click', handleLinkClick);
  console.log("document.addEventListener('click', handleLinkClick); 触发")
  clickHandlerAdded = true;
} 
