const CONFIG = {
  IS_PRODUCTION: false,  // 发布时设为 true
  REMOTE_CONFIG_URL: 'https://raw.githubusercontent.com/taoAIGC/AIShortcuts_test_siteHandlers/refs/heads/main/siteHandlers.json'  // 开发环境远程配置
};


// 保存原始的 console 方法
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// 线上环境配置
if (CONFIG.IS_PRODUCTION) {
  console.log = function() {};
  console.warn = function() {};
  console.error = function() {};
  console.info = function() {};
  console.debug = function() {};
} else {
  // 开发环境下添加前缀并显示调用位置
  function getCallerInfo() {
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      // 跳过 Error 和当前函数，找到实际调用者
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        // 过滤掉 consoleConfig.js 本身和 node_modules
        if (!line.includes('consoleConfig.js') && !line.includes('node_modules')) {
          const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
          if (match) {
            const [, funcName, file, lineNum] = match;
            const fileName = file.split('/').pop() || file.split('\\').pop();
            return `${fileName}:${lineNum}`;
          }
        }
      }
    }
    return 'unknown';
  }

  console.log = function(...args) {
    const caller = getCallerInfo();
    originalConsole.log.apply(console, [`[AIShortcuts:${caller}]`, ...args]);
  };
  console.warn = function(...args) {
    const caller = getCallerInfo();
    originalConsole.warn.apply(console, [`[AIShortcuts:${caller}]`, ...args]);
  };
  console.error = function(...args) {
    const caller = getCallerInfo();
    originalConsole.error.apply(console, [`[AIShortcuts:${caller}]`, ...args]);
  };
  console.info = function(...args) {
    const caller = getCallerInfo();
    originalConsole.info.apply(console, [`[AIShortcuts:${caller}]`, ...args]);
  };
  console.debug = function(...args) {
    const caller = getCallerInfo();
    originalConsole.debug.apply(console, [`[AIShortcuts:${caller}]`, ...args]);
  };
}

