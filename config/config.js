const CONFIG = {
  IS_PRODUCTION: false  // 发布时设为 true
};


// 保存原始的 console 方法
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// 重写 console 方法
if (CONFIG.IS_PRODUCTION) {
  console.log = function() {};
  console.warn = function() {};
  console.error = function() {};
  console.info = function() {};
  console.debug = function() {};
} else {
  // 开发环境下添加前缀
  console.log = function(...args) {
    originalConsole.log.apply(console, ['[MultiAI]', ...args]);
  };
  console.warn = function(...args) {
    originalConsole.warn.apply(console, ['[MultiAI]', ...args]);
  };
  console.error = function(...args) {
    originalConsole.error.apply(console, ['[MultiAI]', ...args]);
  };
  console.info = function(...args) {
    originalConsole.info.apply(console, ['[MultiAI]', ...args]);
  };
  console.debug = function(...args) {
    originalConsole.debug.apply(console, ['[MultiAI]', ...args]);
  };
}

