const countEl = document.getElementById("count");

function updateCount() {
  chrome.storage.local.get("recruiterProfiles", data => {
    const count = data.recruiterProfiles?.length || 0;
    countEl.innerText = `${count} profiles`;
  });
}

document.getElementById("start").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "START" });
  });
};

document.getElementById("stop").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "STOP" });
  });
};

document.getElementById("clear").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "CLEAR" });
    updateCount();
  });
};

document.getElementById("export").onclick = () => {
  chrome.storage.local.get("recruiterProfiles", data => {
    const rows = data.recruiterProfiles || [];
    let csv = "linkedin_url\n";

    rows.forEach(r => {
      csv += `"${r.url}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url,
      filename: "recruiter_profiles.csv"
    });
  });
};

updateCount();
setInterval(updateCount, 1000);
