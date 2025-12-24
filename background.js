chrome.runtime.onInstalled.addListener(() => {
  console.log("Background loaded");
});

// inject content.js on ANY linkedin page load
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.url.includes("linkedin.com")) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content.js"]
    }).then(() => {
      console.log("Injected content.js into:", details.url);
    }).catch(err => {
      console.error("Injection failed:", err);
    });
  }
});
