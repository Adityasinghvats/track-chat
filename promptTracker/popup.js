document.addEventListener('DOMContentLoaded', function() {
  loadStats();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('refresh-btn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'refresh'});
      setTimeout(loadStats, 500);
    });
  });

  document.getElementById('export-btn').addEventListener('click', exportChatHistory);
  
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all chat data?')) {
      clearAllData();
    }
  });
}

function loadStats() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    const hostname = new URL(tab.url).hostname;
    
    let siteName = 'Unknown';
    if (hostname.includes('chatgpt.com')) siteName = 'ChatGPT';
    
    document.getElementById('current-site').textContent = siteName;
    
    // Get storage stats
    chrome.storage.local.get(null, (items) => {
      const chatKeys = Object.keys(items).filter(key => key.startsWith('chat_navigator_'));
      let totalEntries = 0;
      let lastUpdate = 0;
      
      chatKeys.forEach(key => {
        if (items[key] && items[key].entries) {
          totalEntries += items[key].entries.length;
          if (items[key].lastUpdated > lastUpdate) {
            lastUpdate = items[key].lastUpdated;
          }
        }
      });
      
      document.getElementById('entry-count').textContent = totalEntries;
      document.getElementById('last-update').textContent = 
        lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never';
    });
  });
}

function exportChatHistory() {
  chrome.storage.local.get(null, (items) => {
    const chatData = {};
    
    Object.keys(items).forEach(key => {
      if (key.startsWith('chat_navigator_')) {
        chatData[key] = items[key];
      }
    });
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  });
}

function clearAllData() {
  chrome.storage.local.get(null, (items) => {
    const chatKeys = Object.keys(items).filter(key => key.startsWith('chat_navigator_'));
    chrome.storage.local.remove(chatKeys, () => {
      loadStats();
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'clear'});
      });
    });
  });
}