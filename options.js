document.addEventListener("DOMContentLoaded", function () {
  const limitInput = document.getElementById("limitInput");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Load the current limit from storage.
  chrome.storage.sync.get(["limit"], function (result) {
    if (result.limit) {
      limitInput.value = result.limit;
    }
  });

  // Save the new limit when user clicks 'Save'.
  saveBtn.addEventListener("click", function () {
    const limit = parseInt(limitInput.value, 10);
    if (!isNaN(limit)) {
      chrome.storage.sync.set({ limit: limit }, function () {
        status.textContent = "Limit saved!";
        // Notify open LinkedIn tabs about the limit change.
        chrome.runtime.sendMessage({ action: "updateLimit" }, function (response) {
          // If there is an error (e.g. no listening content script), log it instead of breaking.
          if (chrome.runtime.lastError) {

          } else if (response) {
          }
        });
        setTimeout(function () {
          status.textContent = "";
        }, 2000);
      });
    } else {
      status.textContent = "Please enter a valid number.";
    }
  });
});
