chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refresh') {
    // Forward refresh command to content script
    chrome.tabs.sendMessage(sender.tab.id, {action: 'refresh'});
  }
  
  if (request.action === 'clear') {
    // Forward clear command to content script
    chrome.tabs.sendMessage(sender.tab.id, {action: 'clear'});
  }
});

// Listen for tab updates to reinitialize tracking
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const aiSites = [
      'chatgpt.com'
    ];
    
    if (aiSites.some(site => tab.url.includes(site))) {
      chrome.tabs.sendMessage(tabId, {action: 'init'});
    }
  }
});