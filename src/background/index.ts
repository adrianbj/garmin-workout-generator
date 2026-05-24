chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "open-options") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
