// 默认站点配置
const defaultSites_CN = [
  {
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    enabled: false,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: false
  },
  {
    name: '豆包',
    url: 'https://doubao.com/chat',
    enabled: false,
    supportUrlQuery: false,
    description: 'By Bytedance',
    hidden: false,
    supportIframe: true
  },

  {
    name: '秘塔AI',
    url: 'https://metaso.cn/',
    enabled: true,
    supportUrlQuery: false,
    description: '擅长学术搜索',
    hidden: false,
    supportIframe: true
  },

  {
    name: '文心一言',
    url: 'https://yiyan.baidu.com/chat',
    enabled: false,
    supportUrlQuery: false,
    description: 'By Baidu',
    hidden: false,
    supportIframe: false
  },

  {
    name: 'Google',
    url: 'https://www.google.com/search?q={query}',
    enabled: false,
    supportUrlQuery: true,
    description: '',
    hidden: false,
    supportIframe: true
  },
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    enabled: true,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: true
  },
  {
    name: '纳米AI',
    url: 'https://nanoai.live/',
    enabled: false,
    supportUrlQuery: false,
    description: 'By 360',
    hidden: true,
    supportIframe: false
  },
  
  {
    name: '智谱 AI',
    url: 'https://chatglm.cn/chat',
    enabled: false,
    supportUrlQuery: false,
    description: '',
    hidden: true,
    supportIframe: false
  },
  {
    name: '通义千问',
    url: 'https://tongyi.aliyun.com/qianwen',
    enabled: false,
    supportUrlQuery: false,
    description: 'By Alibaba',
    hidden: true,
    supportIframe: false
  },
  {
    name: '知乎直达',
    url: 'https://zhida.zhihu.com/',
    enabled: false,
    supportUrlQuery: false,
    description: '知乎直达搜索',
    hidden: false,
    supportIframe: true
  },
  
  {
    name: '小红书',
    url: 'https://www.xiaohongshu.com/search_result?keyword={query}',
    enabled: true,
    supportUrlQuery:true,
    description: '',
    hidden: false,
    supportIframe: false
  },
  {
    name: '百度',
    url: 'https://www.baidu.com/s?wd={query}',
    enabled: false,
    supportUrlQuery: true,
    description: '',
    hidden: false,
    supportIframe: true  
  },
  
  
  {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    enabled: true,
    supportUrlQuery: false,
    description: 'By DeepSeek',
    hidden: false,
    supportIframe: true
  },



  {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    enabled: false,
    supportUrlQuery: false,
    description: 'By Google',
    hidden: false,
    supportIframe: true
  },
  {
    name: 'Copilot',
    url: 'https://copilot.microsoft.com/',
    enabled: false,
    supportUrlQuery: false,
    description: 'By Microsoft',
    hidden: false,
    supportIframe: true
  },
  { 
    name: 'Perplexity', 
    url: 'https://www.perplexity.ai/search?q={query}',
    enabled: false,
    supportUrlQuery: true,
    description: '',
    hidden: false,
    supportIframe: true
  },
  
 
  {
    name: 'Claude',
    url: 'https://claude.ai/chat',
    enabled: false,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: true
  },
  
  {
    name: 'POE',
    url: 'https://poe.com/',
    enabled: false,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: true
  },
  {
    name: 'Bing',
    url: 'https://www.bing.com/search?q={query}',
    enabled: false,
    supportUrlQuery: true,
    description: 'Bing 搜索',
    hidden: false,
    supportIframe: true
  }
  
];

const defaultSites_EN = [
  {
    name: 'Google',
    url: 'https://www.google.com/search?q={query}',
    enabled: true,
    supportUrlQuery: true,
    description: '',
    hidden: false,
    supportIframe: false
  },

  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    enabled: true,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: true
  },

  {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    enabled: true,
    supportUrlQuery: false,
    description: 'By Google',
    hidden: false,
    supportIframe: true
  },

  {
    name: 'Copilot',
    url: 'https://copilot.microsoft.com/',
    enabled: true,
    supportUrlQuery: false,
    description: 'By Microsoft',
    hidden: false,
    supportIframe: true
  },

  { 
    name: 'Perplexity', 
    url: 'https://www.perplexity.ai/search?q={query}',
    enabled: true,
    supportUrlQuery: true,
    description: '',
    hidden: false,
    supportIframe: false
  },
  
  {
    name: 'Claude',
    url: 'https://claude.ai/chat',
    enabled: false,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: true
  },
  
  {
    name: 'POE',
    url: 'https://poe.com/',
    enabled: false,
    supportUrlQuery: false,
    description: '',
    hidden: false,
    supportIframe: true
  },
  {
    name: 'Bing',
    url: 'https://www.bing.com/search?q={query}',
    enabled: false,
    supportUrlQuery: true,
    description: 'Bing 搜索',
    hidden: false,
    supportIframe: false
  }
  

];

// 默认收藏站点数组
const defaultFavoriteSites = [{
  name: "ChatGPT"
}];

// 默认模式设置
const defaultModes = {
  // 支持iframe 的页面在一个单窗口模式
  iframe: false

};



// 默认入口配置
const buttonConfig = {
  floatButton: true,
  selectionSearch: true,
  contextMenu: true,
  searchEngine: true
};


// Service Worker环境
if (typeof window === 'undefined') {
  const language = navigator.language.toLowerCase();
  console.log('当前语言:', language);
  if (language.startsWith('zh')) {
    self.defaultSites = defaultSites_CN;
  } else {
    self.defaultSites = defaultSites_EN;
  }


  self.defaultFavoriteSites = defaultFavoriteSites;
  self.buttonConfig = buttonConfig;
}
// 浏览器环境
else {
  const language = navigator.language.toLowerCase();
  console.log('当前语言:', language);
  if (language.startsWith('zh')) {
    window.defaultSites = defaultSites_CN;
  } else {
    window.defaultSites = defaultSites_EN;
  }
  window.defaultFavoriteSites = defaultFavoriteSites;
  window.buttonConfig = buttonConfig;
  

} 

