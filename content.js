let profiles = new Map();
let capturing = true; // automatisch aan

/**
 * Extract recruiter profile links from DOM
 */
function extractRecruiterProfileLinks() {
  if (!capturing) return;

  const links = document.querySelectorAll(
    'a[data-test-link-to-profile-link="true"]'
  );

  links.forEach(a => {
    const url = a.href;
    if (!url || !url.includes("/talent/profile/")) return;

    // strip tracking if desired
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

/**
 * Observe DOM for lazy-loaded candidates
 */
const observer = new MutationObserver(() => {
  extractRecruiterProfileLinks();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

/**
 * Messages from popup
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "STOP") {
    capturing = false;
    sendResponse({ status: "stopped" });
  }

  if (msg.type === "START") {
    capturing = true;
    extractRecruiterProfileLinks();
    sendResponse({ status: "started" });
  }

  if (msg.type === "CLEAR") {
    profiles.clear();
    chrome.storage.local.remove("recruiterProfiles");
    sendResponse({ status: "cleared" });
  }
});

// initial scan (voor wat al zichtbaar is)
extractRecruiterProfileLinks();
