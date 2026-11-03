/* Toolbar icon / shortcut -> one message. No state here: the worker can die at any time. */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id == null) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle" });
  } catch {
    /* page without the content script */
  }
});
