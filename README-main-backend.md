
# Main Content Backend Setup Guide

This guide details how to set up the backend that manages all public-facing content (services, reels, testimonials, cars) and handles media uploads. This process is now much simpler and less error-prone.

## ⚠️ Mandatory Setup Steps

### 1. Create the Main Google Sheet

1.  Go to [sheets.google.com/create](https://sheets.google.com/create).
2.  Rename the sheet to **"A Big Engine - Main DB"**.
3.  Get the Sheet ID from its URL. The ID is the long string of characters between `/d/` and `/edit`.
    - Example URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit`
4.  Create five tabs at the bottom with these **exact names**:
    *   `Services`
    *   `Reels`
    *   `Testimonials`
    *   `Banners`
    *   `CarDatabase`

### 2. Get Cloudflare R2 Credentials

This backend requires credentials to upload images and videos to your Cloudflare R2 bucket.

1.  **Account ID:** Find this on the main page of your Cloudflare dashboard.
2.  **R2 Bucket:**
    *   Navigate to R2 in your Cloudflare dashboard.
    *   Create a bucket (e.g., "a-big-engine-assets").
    *   Copy the **Bucket Name**.
    *   Go to the bucket's Settings tab and copy its **Public URL** (e.g., `https://pub-your-id.r2.dev`).
3.  **R2 API Token:**
    *   From the R2 page, click "Manage R2 API Tokens".
    *   Create a new token with `Admin Read & Write` permission.
    *   Copy the **Access Key ID** and the **Secret Access Key**.

You should now have the following 6 values:
1.  `SPREADSHEET_ID` (from your Google Sheet)
2.  `ACCOUNT_ID` (from Cloudflare)
3.  `BUCKET_NAME` (from R2)
4.  `BUCKET_URL` (from R2)
5.  `ACCESS_KEY_ID` (from R2 API Token)
6.  `SECRET_ACCESS_KEY` (from R2 API Token)

### 3. Deploy the Google Apps Script

1.  Go to [script.google.com/create](https://script.google.com/create).
2.  **Delete any existing code** in the editor.
3.  Paste the **entire contents** of the `Code-main-backend.gs` file into the editor.
4.  Go to **Project Settings** (⚙️ icon on the left) > **Script Properties**.
5.  Click **Add script property** and add all 6 of the credentials you collected above. Use the exact property names listed in step 2.
6.  Click **Deploy** > **New deployment**.
7.  Select type **Web app**.
8.  For "Who has access", select **Anyone**.
9.  Click **Deploy**.
10. Authorize the permissions when prompted.
11. Copy the resulting **Web app URL**. This is your **Main Backend URL**.

### 4. Final Configuration in Admin Panel

1.  Open the website and navigate to the **Admin Panel** via the footer link.
2.  In the "Main Backend Configuration" card, paste the **Web app URL** you just copied.
3.  Click **Test**. You should see a success message.
4.  Click **Save**.
5.  In the "Car Database Management" card, click **"Sync from Sheet"** to load your vehicle data.

**The Main Content Backend is now set up.** Proceed to set up the User Data Backend.