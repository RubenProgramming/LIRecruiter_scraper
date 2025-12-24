// -----------------------------
// 1. SEND TO WEBHOOK FUNCTION
// -----------------------------
async function sendToWebhook(data) {
  const webhookUrl = "https://rubenflow.app.n8n.cloud/webhook-test/LinkedIn";

  try {
    console.log("Sending to webhook:", webhookUrl, data);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connections: data })
    });

    const text = await response.text();

    console.log("Webhook status:", response.status);
    console.log("Webhook body:", text);

    if (!response.ok) {
      throw new Error("Webhook returned non-200 status");
    }

    return true;

  } catch (err) {
    console.error("Webhook ERROR:", err);
    document.getElementById("status").textContent =
      "Webhook failed. Open console for details.";
    return false;
  }
}


// -----------------------------
// 2. LISTEN FOR PROGRESS MESSAGES FROM content.js
// -----------------------------
chrome.runtime.onMessage.addListener(msg => {
  if (msg.progress) {
    document.getElementById("status").textContent = msg.progress;
  }
});


// -----------------------------
// 3. SCRAPE CONNECTIONS BUTTON
// -----------------------------
let scrapedData = [];

document.getElementById("start").onclick = async () => {
  document.getElementById("status").textContent = "Starting scraper…";
  document.getElementById("download").style.display = "none";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "SCRAPE_CONNECTIONS" },
      async response => {
        if (!response) {
          document.getElementById("status").textContent =
            "Content script did not respond. Are you on a valid LinkedIn page?";
          return;
        }

        scrapedData = response;

        document.getElementById("status").textContent =
          `Done! Found ${scrapedData.length} profiles. Sending to webhook…`;

        document.getElementById("download").style.display = "block";

        const ok = await sendToWebhook(scrapedData);

        if (ok) {
          document.getElementById("status").textContent =
            `Export complete! ${scrapedData.length} profiles sent.`;
        }
      }
    );
  });
};


// -----------------------------
// 4. SCRAPE LINKEDIN URL FROM RECRUITER PROFILE
// -----------------------------
document.getElementById("scrapeLinkedIn").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "SCRAPE_LI_FROM_RECRUITER" },
      response => {
        console.log("LinkedIn URL result:", response);

        if (response?.linkedInUrl) {
          document.getElementById("status").textContent =
            "Public LinkedIn URL found: " + response.linkedInUrl;
        } else {
          document.getElementById("status").textContent =
            "No LinkedIn URL found on this page.";
        }
      }
    );
  });
};



// -----------------------------
// 5. CSV DOWNLOAD BUTTON
// -----------------------------
document.getElementById("download").onclick = () => {
  if (!scrapedData.length) return;

  const header = "firstName,lastName,url\n";
  const rows = scrapedData
    .map(p => `${p.firstName || ""},${p.lastName || ""},${p.url || ""}`)
    .join("\n");

  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "linkedin_connections.csv";
  a.click();

  URL.revokeObjectURL(url);
};

