//------------------------------------------------------
// Utility wait()
//------------------------------------------------------
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//------------------------------------------------------
// Find the “Meer laden” button by checking the SPAN text
//------------------------------------------------------
function findLoadMoreButton() {
  const spans = document.querySelectorAll("button span");

  for (const span of spans) {
    if (!span.innerText) continue;

    const txt = span.innerText.trim().toLowerCase();
    if (txt.includes("meer laden")) {
      return span.closest("button");
    }
  }

  return null;
}

//------------------------------------------------------
// Click load-more buttons repeatedly
//------------------------------------------------------
async function clickLoadMoreButtons() {
  let tries = 0;

  while (tries < 10) {
    const btn = findLoadMoreButton();

    if (btn) {
      console.log("CLICK: Meer laden");
      btn.click();

      chrome.runtime.sendMessage({
        progress: "Clicked 'Meer laden'… loading more profiles…"
      });

      await wait(2000);
      tries = 0;
    } else {
      tries++;
      await wait(1500);
    }
  }

  console.log("No more 'Meer laden' buttons detected.");
}

//------------------------------------------------------
// Auto-scroll the page until nothing more loads
//------------------------------------------------------
async function autoScroll() {
  let lastHeight = 0;
  let sameCount = 0;

  while (true) {
    window.scrollTo(0, document.body.scrollHeight);
    await wait(2000);

    const newHeight = document.body.scrollHeight;

    if (newHeight === lastHeight) {
      sameCount++;
      if (sameCount >= 3) break;
    } else {
      sameCount = 0;
    }

    lastHeight = newHeight;

    chrome.runtime.sendMessage({
      progress: "Scrolling…"
    });
  }
}

//------------------------------------------------------
// SCRAPE: Extract full name + URL for each connection
//------------------------------------------------------
function scrapeConnections() {
  // All recruiter profile links
  const links = document.querySelectorAll('a[data-test-link-to-profile-link="true"]');

  const results = [];

  links.forEach(a => {
    const recruiterUrl = a.href;
    const fullName = a.innerText.trim();

    if (!fullName || !recruiterUrl) return;

    // Split first and last name
    const parts = fullName.split(" ");
    const firstName = parts.shift();
    const lastName = parts.join(" ");

    results.push({
      fullName,
      firstName,
      lastName,
      recruiterUrl
    });
  });

  chrome.runtime.sendMessage({
    progress: `Scraping LI Recruiter: Found ${results.length} profiles.`
  });

  return results;
}

function scrapePublicLinkedInUrl() {
  // 1. Preferred: <span data-test-personal-info-profile-link-text>
  let el = document.querySelector('span[data-test-personal-info-profile-link-text]');
  if (el && el.innerText.includes("linkedin.com/in/")) {
    return el.innerText.trim();
  }

  // 2. Sometimes inside an <a>
  el = [...document.querySelectorAll("a")].find(a =>
    a.href.includes("linkedin.com/in/")
  );
  if (el) return el.href.split("?")[0];

  // 3. Sometimes inside an obfuscated span
  el = [...document.querySelectorAll("span")].find(s =>
    s.innerText.includes("linkedin.com/in/")
  );
  if (el) return el.innerText.trim();

  // 4. Fallback: search entire body
  const match = document.body.innerText.match(/https:\/\/www\.linkedin\.com\/in\/[^\s]+/);
  if (match) return match[0];

  return null;
}

function scrapeLinkedInUrlDirect() {
  const el = document.querySelector('span[data-test-personal-info-profile-link-text]');

  if (!el) {
    console.log("LinkedIn URL span not found.");
    return null;
  }

  const url = el.innerText.trim();
  if (!url.includes("linkedin.com/in/")) return null;

  return url.split("?")[0]; // clean tracking params
}

function scrapePublicLinkedInUrl() {
  const el = document.querySelector('span[data-test-personal-info-profile-link-text]');
  if (!el) {
    console.log("No public LinkedIn URL found on this page.");
    return null;
  }

  const url = el.innerText.trim();
  if (!url.includes("linkedin.com/in/")) return null;

  return url.split("?")[0]; // remove extra tracking parameters
}


//------------------------------------------------------
// MAIN SCRAPER FLOW
//------------------------------------------------------
async function contentScriptMain() {
  chrome.runtime.sendMessage({ progress: "Loading all connections…" });

  await clickLoadMoreButtons();
  await autoScroll();

  chrome.runtime.sendMessage({ progress: "Collecting profile names…" });

  const data = scrapeConnections();
  return data;
}

//------------------------------------------------------
// LISTENER from popup.js
//------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "SCRAPE_CONNECTIONS") {
    contentScriptMain().then(data => sendResponse(data));
    return true;
  }
});

console.log("CONTENT SCRIPT LOADED");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "SCRAPE_LI_FROM_RECRUITER") {
    console.log("Scraping public LinkedIn URL from Recruiter page…");
    const url = scrapePublicLinkedInUrl();
    sendResponse({ linkedInUrl: url });
  }
});

