// JSESSIONID cache
let jsessionid = null;

// Fetch the JSESSIONID from storage once on load
chrome.storage.sync.get("jsessionid", function (result) {
  if (result.jsessionid) {
    console.log("Retrieved JSESSIONID from storage");
    jsessionid = result.jsessionid;
  } else {
    console.log("No JSESSIONID found in storage");
  }
});

// Constants
const DEFAULT_LIMIT = 300;

// Cache for job details
const jobDetailsCache = {};

/**
 * Fetches the job details for a specific job ID
 */
async function fetchJobDetails(jobId) {
  if (!jsessionid) {
    console.log("JSESSIONID is not available");
    return null;
  }

  const url = `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "accept-language": "en-US,en;q=0.9",
        "csrf-token": jsessionid,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      credentials: "include",
    });

    const data = await response.json();

    // Extract the applies count, views, and original listing date
    return {
      applies: data.data?.applies || 0,
      views: data.data?.views || 0,
      originalListedAt: data.data?.originalListedAt || null,
    };
  } catch (error) {
    console.error("Error fetching job details:", error);
    return null;
  }
}

/**
 * Gets the user-configured limit from storage
 */
function getLimit() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("limit", (result) => {
      const limit = Number(result.limit) || DEFAULT_LIMIT;
      resolve(limit);
    });
  });
}

/**
 * Extracts a job ID from a LinkedIn URL
 */
function extractJobIdFromUrl(url) {
  try {
    const urlObj = new URL(url);

    // First try to get it from the query parameter
    let jobId = urlObj.searchParams.get("currentJobId");

    // If not found, try to extract from the URL path
    if (!jobId) {
      const pathSegments = urlObj.pathname.split("/");
      if (pathSegments.length > 3 && pathSegments[1] === "jobs" && pathSegments[2] === "view") {
        jobId = pathSegments[3];
      }
    }

    return jobId;
  } catch (e) {
    console.error("Error extracting job ID:", e);
    return null;
  }
}

/**
 * Updates the metrics element with styling based on the job details
 */
function updateMetricsElement(element, details, limit) {
  const { applies, views, originalListedAt } = details;

  // Common styles with improved visual design
  const commonStyle =
    "padding: 3px 8px; border-radius: 4px; display: inline-block; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.08);";

  // Update applicant count
  const applicantElement = element.querySelector(".applicant-count");
  applicantElement.textContent = `${applies} applicants`;

  if (applies < limit) {
    // Below limit styling - improved green with better readability
    applicantElement.style.cssText = `${commonStyle} background-color: #e3f5e9; color: #0a662f; border: 1px solid #a8e0b8;`;
  } else {
    // Above limit styling - improved red with better readability
    applicantElement.style.cssText = `${commonStyle} background-color: #fbe9eb; color: #8e2c35; border: 1px solid #f4b8be;`;
  }

  // Update view count with more visually distinct color
  const viewElement = element.querySelector(".view-count");
  viewElement.textContent = `${views} views`;
  viewElement.style.cssText = `${commonStyle} background-color: #e8f0fe; color: #1a56db; border: 1px solid #b6d1fc;`;

  // Update listing date with improved color scheme
  const dateElement = element.querySelector(".listing-date");

  if (originalListedAt) {
    const listingDate = new Date(originalListedAt);
    const now = new Date();
    const daysAgo = Math.floor((now - listingDate) / (1000 * 60 * 60 * 24));
    dateElement.textContent = `${daysAgo}d ago`;

    // Color coding based on age with improved contrast
    if (daysAgo <= 3) {
      // Fresh listing - crisp blue-green
      dateElement.style.cssText = `${commonStyle} background-color: #e0f7fa; color: #006064; border: 1px solid #b2ebf2;`;
    } else if (daysAgo <= 7) {
      // Recent listing - warm amber
      dateElement.style.cssText = `${commonStyle} background-color: #fff8e1; color: #b5651d; border: 1px solid #ffe082;`;
    } else {
      // Older listing - neutral gray
      dateElement.style.cssText = `${commonStyle} background-color: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;`;
    }
  } else {
    dateElement.textContent = "New";
    dateElement.style.cssText = `${commonStyle} background-color: #e0f7fa; color: #006064; border: 1px solid #b2ebf2;`;
  }
}

/**
 * Creates and styles the job metrics element with improved design
 */
function createMetricsElement() {
  const element = document.createElement("div");
  element.className = "job-metrics-element";
  element.style.fontSize = "13px"; // Slightly larger font
  element.style.fontWeight = "500"; // Medium font weight
  element.style.padding = "4px 0";
  element.style.display = "flex";
  element.style.gap = "8px";
  element.style.flexWrap = "wrap";
  element.style.margin = "5px 0";
  element.style.lineHeight = "1.2";
  element.innerHTML = `
    <div class="applicant-count">Fetching...</div>
    <div class="view-count">Fetching...</div>
    <div class="listing-date">Checking...</div>
  `;
  return element;
}

/**
 * Adds job metrics to job listings
 */
async function addMetricsToListings(limit) {
  const listItems = document.querySelectorAll(
    ".scaffold-layout__list li.scaffold-layout__list-item",
  );

  for (const item of listItems) {
    // Skip items that already have a metrics element
    if (item.querySelector(".job-metrics-element")) {
      continue;
    }

    const link = item.querySelector("a");
    if (!link) continue;

    const jobId = extractJobIdFromUrl(link.href);
    if (!jobId) continue;

    // Create and add the metrics element
    const metricsElement = createMetricsElement();
    item.insertAdjacentElement("afterbegin", metricsElement);

    // Check if we have cached details
    if (jobDetailsCache[jobId] !== undefined) {
      updateMetricsElement(metricsElement, jobDetailsCache[jobId], limit);
      continue;
    }

    // Fetch the job details with a small random delay to avoid rate limiting
    setTimeout(async () => {
      try {
        const details = await fetchJobDetails(jobId);
        if (details !== null) {
          jobDetailsCache[jobId] = details;
          updateMetricsElement(metricsElement, details, limit);
        } else {
          metricsElement.innerHTML = `<div>Details unavailable</div>`;
          metricsElement.style.backgroundColor = "#999";
          metricsElement.style.color = "white";
          metricsElement.style.padding = "2px 6px";
          metricsElement.style.borderRadius = "3px";
        }
      } catch (e) {
        console.error(`Error fetching details for job ${jobId}:`, e);
        metricsElement.innerHTML = `<div>Error fetching details</div>`;
        metricsElement.style.backgroundColor = "#999";
        metricsElement.style.color = "white";
        metricsElement.style.padding = "2px 6px";
        metricsElement.style.borderRadius = "3px";
      }
    }, Math.random() * 2000); // Random delay between 0-2 seconds
  }
}

/**
 * Sets up the MutationObserver to process job listings when the page content changes
 */
async function setupJobObserver() {
  // Get the user-configured limit
  const limit = await getLimit();

  // Create a mutation observer
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;

    for (const mutation of mutations) {
      // Check if the changes affect the job list
      if (
        mutation.type === "childList" ||
        (mutation.type === "attributes" && mutation.target.closest(".scaffold-layout__list"))
      ) {
        shouldProcess = true;
        break;
      }
    }

    if (shouldProcess) {
      addMetricsToListings(limit);
    }
  });

  // Process immediately if DOM is loaded, otherwise wait for DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      addMetricsToListings(limit);
      startObserver();
    });
  } else {
    addMetricsToListings(limit);
    startObserver();
  }

  function startObserver() {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }
}

// Listen for messages from the options page to update the limit on the fly
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateLimit") {
    getLimit().then((newLimit) => {
      // Reset all job metrics indicators
      document.querySelectorAll(".job-metrics-element").forEach((element) => {
        element.remove();
      });

      // Process the listings with the new limit
      addMetricsToListings(newLimit);
      sendResponse({ status: "limit updated", newLimit });
    });
    return true; // Indicates asynchronous response
  }
});

// Initialize
setupJobObserver();
