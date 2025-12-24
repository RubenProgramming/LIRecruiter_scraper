let capturing = false;
let profiles = new Map();

/**
 * Extract name from a candidate card
 */
function extractNameFromCard(card) {
  if (!card) return "";

  // Primary: name inside <a>
  const nameLink = card.querySelector(
    ".artdeco-entity-lockup__title a"
  );

  if (nameLink) {
    return nameLink.textContent
      .replace(/\s+/g, " ")
      .trim();
  }

  // Fallback: text directly in title div
  const nameDiv = card.querySelector(
    ".artdeco-entity-lockup__title"
  );

  if (nameDiv) {
    return nameDiv.textContent
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

/**
 * Main DOM extraction
 */
function extractProfilesFromDOM() {
  if (!capturing) return;

  const urlSpans = document.querySelectorAll(
    'span[data-test-personal-info-profile-link-text]'
  );

  urlSpans.forEach(span => {
    const rawUrl = span.textContent.trim();
    if (!rawUrl.startsWith("https://www.linkedin.com/in/")) return;

    const url = rawUrl.split("?")[0];
    if (profiles.has(url)) return;

    // Scope to the candidate card
    const card = span.closest(
      '[data-test-search-result], li, div'
    );

    const name = extractNameFromCard(card);

    profiles.set(url, {
      name,
      url,
      capturedAt: new Date().toISOString()
    });
  });

  chrome.storage.local.set({
    recruiterProfiles: Array.from(profiles.values())
  });
}

/**
 * Observe DOM changes (lazy-loaded candidates)
 */
const observer = new MutationObserver(() => {
  extractProfilesFromDOM();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

/**
 * Messages from popup
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "START") {
    capturing = true;
    extractProfilesFromDOM();
    sendResponse({ status: "started" });
  }

  if (msg.type === "STOP") {
    capturing = false;
    sendResponse({ status: "stopped" });
  }

  if (msg.type === "CLEAR") {
    profiles.clear();
    chrome.storage.local.remove("recruiterProfiles");
    sendResponse({ status: "cleared" });
  }
});
