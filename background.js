chrome.runtime.onInstalled.addListener(() => {
  // When the extension is installed, check if 'limit' is set.
  // If not, open the options page so the user can specify a limit.
  chrome.storage.sync.get("limit", (result) => {
    if (!result.limit) {
      chrome.runtime.openOptionsPage();
    }
  });
});
