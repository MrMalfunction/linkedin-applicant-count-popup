# LinkedIn Job Insights Extension

This Chrome Extension shows the Applicant Count, Job View, and Days since the job was posted on LinkedIn. This information is displayed in the job list sidebar when search for jobs on LinkedIn.

You can set a custom limit for the applicant count. If the applicant count exceeds the limit, it will be highlighted in red. By default, the limit is set to 300.

To view the applicant count, you will need to have a LinkedIn Premium account.

## Features
- Displays the applicant count, job view, and days since the job was posted. [Uses LinkedIn Premium features which counts apply when someone clicks on the apply button.]
- Shows the view count of the job. [Uses LinkedIn API to get the view count of the job.]
- Displays the number of days since the job was posted.[Uses LinkedIn API to get the job posted date.]


## Screenshots
<div style="display: flex; justify-content: space-between;">
  <img src="Screenshot 1.png" alt="Applicant Count less than limit" title="Applicant count less than limit" width="48%">
  <img src="Screenshot 2.png" alt="Applicant Count greater than limit" title="Applicant count greater than limit" width="48%">
</div>

## Chrome Webstore Installation
[https://chromewebstore.google.com/detail/cbkmimndifbfolmgfpcdkiejenmndoeb](https://chromewebstore.google.com/detail/cbkmimndifbfolmgfpcdkiejenmndoeb)

## Dev Installation

1. Clone the repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable Developer mode
4. Click on `Load unpacked` and select the cloned repository

## Usage
1. To update the limit click on the extension icon and select options and enter the new limit.


## Privacy
Refer Privacy Policy here [PrivacyPolicy.md](PrivacyPolicy.md)
