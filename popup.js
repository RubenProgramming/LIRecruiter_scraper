const countEl = document.getElementById("count");
const statusEl = document.getElementById("status");
const WEBHOOK_URL = "https://rubenflow.app.n8n.cloud/webhook-test/LinkedIn";

/* ------------------------
   COUNTER
------------------------- */
function updateCount() {
  chrome.storage.local.get("recruiterProfiles", data => {
    const count = data.recruiterProfiles?.length || 0;
    countEl.innerText = `${count} profielen verzameld`;
  });
}

/* ------------------------
   STATUS
------------------------- */
function updateStatus() {
  chrome.storage.local.get("captureStatus", data => {
    const status = data.captureStatus || "GESTOPT";

    statusEl.classList.remove("status--actief", "status--gestopt");

    if (status === "ACTIEF") {
      statusEl.classList.add("status--actief");
    } else {
      statusEl.classList.add("status--gestopt");
    }

    statusEl.innerHTML = `Status: <strong>${status}</strong>`;
  });
}


/* ------------------------
   BUTTONS
------------------------- */
document.getElementById("start").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "START" }, () => {
      updateStatus();
    });
  });
};

document.getElementById("stop").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "STOP" }, () => {
      updateStatus();
    });
  });
};

document.getElementById("clear").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "CLEAR" }, () => {
      updateCount();
      updateStatus();
    });
  });
};

document.getElementById("export").onclick = () => {
  chrome.storage.local.get("recruiterProfiles", data => {
    const rows = data.recruiterProfiles || [];

    let csv = "recruiter_profile_url\n";
    rows.forEach(r => {
      csv += `"${r.url}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url,
      filename: "linkedin_recruiter_profiles.csv",
      saveAs: true
    });
  });
};

document.getElementById("sendWebhook").onclick = () => {
  chrome.storage.local.get("recruiterProfiles", data => {
    const profiles = data.recruiterProfiles || [];

    if (profiles.length === 0) {
      alert("Geen profielen om te versturen.");
      return;
    }

    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "FLOW Recruiter Capture",
        capturedAt: new Date().toISOString(),
        count: profiles.length,
        profiles: profiles
      })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error("Webhook response not OK");
      }
      return res.text();
    })
    .then(() => {
      alert("Profielen succesvol verstuurd.");
    })
    .catch(err => {
      console.error(err);
      alert("Fout bij versturen naar webhook.");
    });
  });
};


/* ------------------------
   INIT
------------------------- */
updateCount();
updateStatus();

// Keep UI in sync (FLOW-stable)
setInterval(() => {
  updateCount();
  updateStatus();
}, 1000);
