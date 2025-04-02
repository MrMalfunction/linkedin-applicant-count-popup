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
const QUERY_ID = "voyagerJobsDashJobPostingDetailSections.c07b0d44515bceba51a9b73c01b0cecb";

// Cache for applicant counts
const applicantCountCache = {};

/**
 * Fetches the applicant count for a specific job ID
 */
async function fetchApplicantCount(jobId) {
  if (!jsessionid) {
    console.log("JSESSIONID is not available");
    return null;
  }

  const jobPostingUrn = encodeURIComponent(`urn:li:fsd_jobPosting:${jobId}`);
  const variables = `(cardSectionTypes:List(JOB_APPLICANT_INSIGHTS),jobPostingUrn:${jobPostingUrn},includeSecondaryActionsV2:true)`;
  const url = `https://www.linkedin.com/voyager/api/graphql?variables=${variables}&queryId=${QUERY_ID}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "csrf-token": jsessionid },
      credentials: "include"
    });
    
    const data = await response.json();
    return data.data?.jobsDashJobPostingDetailSectionsByCardSectionTypes?.elements?.[0]
      ?.jobPostingDetailSection?.[0]?.jobApplicantInsightsUrn?.applicantCount || 0;
  } catch (error) {
    console.error("Error fetching applicant count:", error);
    return null;
  }
}

/**
 * Gets the user-configured limit from storage
 */
function getLimit() {
  return new Promise(resolve => {
    chrome.storage.sync.get("limit", result => {
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
 * Creates and styles the applicant count element
 */
function createCountElement() {
  const element = document.createElement("div");
  element.className = "applicant-count-element";
  element.style.fontSize = "12px";
  element.style.fontWeight = "bold";
  element.style.padding = "3px 8px";
  element.style.borderRadius = "4px";
  element.style.display = "inline-block";
  element.style.margin = "4px 0";
  element.textContent = "Fetching Applicants...";
  return element;
}

/**
 * Updates the count element with styling based on the applicant count
 */
function updateCountElement(element, count, limit) {
  element.textContent = `Applicants: ${count}`;

  if (count < limit) {
    // Below limit styling (green)
    element.style.backgroundColor = "#e6f7e6";
    element.style.color = "#006400";
    element.style.border = "1px solid #c3e6c3";
  } else {
    // Above limit styling (red)
    element.style.backgroundColor = "#ffebeb";
    element.style.color = "#cc0000";
    element.style.border = "1px solid #ffcccc";
  }
}

/**
 * Adds applicant counts to job listings
 */
async function addApplicantCountsToListings(limit) {
  const listItems = document.querySelectorAll(".scaffold-layout__list li.scaffold-layout__list-item");

  for (const item of listItems) {
    // Skip items that already have a count element
    if (item.querySelector(".applicant-count-element")) {
      continue;
    }

    const link = item.querySelector("a");
    if (!link) continue;

    const jobId = extractJobIdFromUrl(link.href);
    if (!jobId) continue;

    // Create and add the count element
    const countElement = createCountElement();
    item.insertAdjacentElement("afterbegin", countElement);

    // Check if we have a cached count
    if (applicantCountCache[jobId] !== undefined) {
      updateCountElement(countElement, applicantCountCache[jobId], limit);
      continue;
    }
    
    // Fetch the applicant count with a small random delay to avoid rate limiting
    setTimeout(async () => {
      try {
        const count = await fetchApplicantCount(jobId);
        if (count !== null) {
          applicantCountCache[jobId] = count;
          updateCountElement(countElement, count, limit);
        } else {
          countElement.textContent = "Count unavailable";
          countElement.style.backgroundColor = "#999";
          countElement.style.color = "white";
        }
      } catch (e) {
        console.error(`Error fetching count for job ${jobId}:`, e);
        countElement.textContent = "Error fetching count";
        countElement.style.backgroundColor = "#999";
        countElement.style.color = "white";
      }
    }, 2000); // Random delay between 0-2 seconds
  }
}

/**
 * Sets up the MutationObserver to process job listings when the page content changes
 */
async function setupJobObserver() {
  // Get the user-configured limit
  const limit = await getLimit();
  
  // Create a mutation observer
  const observer = new MutationObserver(mutations => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      // Check if the changes affect the job list
      if (mutation.type === "childList" || 
         (mutation.type === "attributes" && 
          mutation.target.closest(".scaffold-layout__list"))) {
        shouldProcess = true;
        break;
      }
    }
    
    if (shouldProcess) {
      addApplicantCountsToListings(limit);
    }
  });
  
  // Process immediately if DOM is loaded, otherwise wait for DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      addApplicantCountsToListings(limit);
      startObserver();
    });
  } else {
    addApplicantCountsToListings(limit);
    startObserver();
  }
  
  function startObserver() {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }
}

// Listen for messages from the options page to update the limit on the fly
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateLimit") {
    getLimit().then(newLimit => {
      // Reset all applicant count indicators
      document.querySelectorAll(".applicant-count-element").forEach(element => {
        element.remove();
      });
      
      // Process the listings with the new limit
      addApplicantCountsToListings(newLimit);
      sendResponse({ status: "limit updated", newLimit });
    });
    return true; // Indicates asynchronous response
  }
});

// Initialize
setupJobObserver();