chrome.runtime.onInstalled.addListener(() => {
  // When the extension is installed, check if 'limit' is set.
  // If not, open the options page so the user can specify a limit.
  chrome.storage.sync.get("limit", (result) => {
    if (!result.limit) {
      chrome.runtime.openOptionsPage();
    }
  });

  // Retrieve the JSESSIONID cookie from linkedin.com on startup.
  chrome.cookies.get(
    {
      url: "https://www.linkedin.com", // URL of the domain where the cookie is set.
      name: "JSESSIONID", // Cookie name.
    },
    function (cookie) {
      if (cookie) {
        // Remove all double quotes and the "ajax:" prefix.
        let processedValue = cookie.value.replace(/"/g, "");
        console.log("JSESSIONID Cookie Value:", processedValue);
        // Store the processed value in chrome.storage with key 'jsessionid'
        chrome.storage.sync.set({ jsessionid: processedValue });
      } else {
        console.log("Cookie not found");
      }
    },
  );
});

// Listen for any changes to cookies.
chrome.cookies.onChanged.addListener(function (changeInfo) {
  // Check if the changed cookie is the JSESSIONID for linkedin.com.
  if (
    changeInfo.cookie &&
    changeInfo.cookie.name === "JSESSIONID" &&
    changeInfo.cookie.domain.includes("linkedin.com")
  ) {
    if (!changeInfo.removed) {
      // Remove all double quotes and the "ajax:" prefix.
      let processedValue = changeInfo.cookie.value.replace(/"/g, "");
      console.log("JSESSIONID Cookie Changed: New Value:", processedValue);
      chrome.storage.sync.set({ jsessionid: processedValue });
    } else {
      console.log("JSESSIONID cookie was removed.");
      chrome.storage.sync.remove("jsessionid");
    }
  }
});
