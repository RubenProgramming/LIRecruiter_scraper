let profiles = new Map();
let capturing = false;
let observer = null;

/* ------------------------
   STATUS
------------------------- */
function setStatus(status) {
  chrome.storage.local.set({ captureStatus: status });
}

/* ------------------------
   EXTRACTION
------------------------- */
function extractRecruiterProfileLinks() {
  if (!capturing) return;

  const links = document.querySelectorAll(
    'a[data-test-link-to-profile-link="true"]'
  );

  links.forEach(a => {
    const url = a.href;
    if (!url || !url.includes("/talent/profile/")) return;

    const cleanUrl = url.split("&trk=")[0];
    if (profiles.has(cleanUrl)) return;

    profiles.set(cleanUrl, {
      url: cleanUrl,
      capturedAt: new Date().toISOString()
    });
  });

  chrome.storage.local.set({
    recruiterProfiles: Array.from(profiles.values())
  });
}

/* ------------------------
   OBSERVER CONTROL
------------------------- */
function startObserver() {
  if (observer) return;

  observer = new MutationObserver(() => {
    extractRecruiterProfileLinks();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function stopObserver() {
  if (!observer) return;
  observer.disconnect();
  observer = null;
}

/* ------------------------
   MESSAGE HANDLER
------------------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "START") {
    capturing = true;
    setStatus("ACTIEF");
    startObserver();
    extractRecruiterProfileLinks();
    sendResponse({ status: "started" });
  }

  if (msg.type === "STOP") {
    capturing = false;
    setStatus("GESTOPT");
    stopObserver();
    sendResponse({ status: "stopped" });
  }

  if (msg.type === "CLEAR") {
    capturing = false;
    stopObserver();
    profiles.clear();

    chrome.storage.local.set({
      recruiterProfiles: [],
      captureStatus: "GESTOPT"
    }, () => {
      sendResponse({ status: "cleared" });
    });

    return true;
  }
});

/* ------------------------
   INIT
------------------------- */
setStatus("GESTOPT");
