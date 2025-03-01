(function () {
  // Default limit if not set by the user.
  const DEFAULT_LIMIT = 300;

  // Function to get or create the popup element.
  function getOrCreatePopup() {
    let popup = document.getElementById("applicantCountPopup");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "applicantCountPopup";
      // Styling for the popup positioned at the top right.
      popup.style.position = "fixed";
      popup.style.top = "10px";
      popup.style.right = "10px";
      popup.style.padding = "10px 20px";
      popup.style.color = "#fff";
      popup.style.fontSize = "18px";
      popup.style.fontWeight = "bold";
      popup.style.zIndex = "9999";
      popup.style.borderRadius = "5px";
      document.body.appendChild(popup);
    }
    return popup;
  }

  // Function to update the popup with the applicant count and proper background color.
  function updatePopup(count, limit) {
    const popup = getOrCreatePopup();
    popup.textContent = `Applicant Count: ${count}`;
    // Green if below limit; red when the number is greater than or equal to the limit.
    popup.style.backgroundColor = count < limit ? "green" : "red";
  }

  // Reads the limit value from chrome.storage.sync.
  function fetchLimit(callback) {
    chrome.storage.sync.get(["limit"], function (result) {
      let limit = result.limit;
      if (!limit || isNaN(limit)) {
        limit = DEFAULT_LIMIT;
      } else {
        limit = Number(limit);
      }
      callback(limit);
    });
  }

  // Checks for the target element and updates the popup if found.
  function checkAndUpdate(limit) {
    const target = document.querySelector(".jobs-premium-applicant-insights__list-num");
    if (target) {
      // Remove any non-digit characters.
      const text = target.textContent.replace(/[^\d]/g, "");
      const count = parseInt(text, 10);
      if (!isNaN(count)) {
        updatePopup(count, limit);
      }
    }
  }

  // Sets up a MutationObserver to continuously watch for changes.
  function setupObserver(limit) {
    const observer = new MutationObserver(function () {
      checkAndUpdate(limit);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Initialize the content script: fetch the limit, check the count, and start observing changes.
  fetchLimit(function (limit) {
    checkAndUpdate(limit);
    setupObserver(limit);
  });

  // Listen for messages from the options page to update the limit on the fly.
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "updateLimit") {
      fetchLimit(function (newLimit) {
        checkAndUpdate(newLimit);
        sendResponse({ status: "limit updated", newLimit: newLimit });
      });
      return true; // Indicates asynchronous response.
    }
  });
})();
