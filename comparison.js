document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('query');

  if (query) {
    chrome.storage.sync.get('sites', function(data) {
      const sites = data.sites || [];
      
      // 为每个站点创建新标签页
      sites.forEach(site => {
        const url = site.url.replace('{query}', encodeURIComponent(query));
        chrome.tabs.create({ url: url });
      });
      
      // 关闭当前标签页
      chrome.tabs.getCurrent(function(tab) {
        chrome.tabs.remove(tab.id);
      });
    });
  }
}); 