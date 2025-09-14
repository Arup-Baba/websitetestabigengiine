# User Data Backend Setup Guide

This guide details how to set up the **separate, dedicated backend** that securely manages all sensitive user information (profiles and order history). This process is now much simpler and less error-prone.

## ⚠️ Mandatory Setup Steps

### 1. Create and Structure the User Data Google Sheet

This sheet will be used **exclusively for user data** and must be separate from your main content sheet.

1.  Go to [sheets.google.com/create](https://sheets.google.com/create).
2.  Rename the sheet to **"A Big Engine - User DB"**.
3.  Get the Sheet ID from its URL. The ID is the long string of characters between `/d/` and `/edit`.
4.  Create three tabs at the bottom and set up their headers exactly as described below. **The first row of each sheet must contain these headers.**

---

#### **Tab 1: `Users`**

This sheet stores individual user profiles.

*   **Sheet Name:** `Users`
*   **Headers (copy and paste into the first row):**
    ```
    mobile,firstName,lastName,carBrandModel,carNumber,street,city,pincode,selectedVariantJson
    ```

---

#### **Tab 2: `Orders`**

This sheet logs every order placed by users.

*   **Sheet Name:** `Orders`
*   **Headers (copy and paste into the first row):**
    ```
    orderId,userId,userName,orderDate,itemsJson,totalAmount,paymentMethod,status,shippingAddress,serviceTypes
    ```

---

#### **Tab 3: `Reviews`**

This sheet stores all user-submitted reviews.

*   **Sheet Name:** `Reviews`
*   **Headers (copy and paste into the first row):**
    ```
    reviewId,serviceId,userId,userName,rating,comment,timestamp
    ```

---

### 2. Get Your MSG91 Auth Key

The backend requires your MSG91 **Auth Key** to securely verify OTP tokens from the login widget.

1.  Log in to your [MSG91 Dashboard](https://msg91.com/dashboard).
2.  In the left-hand navigation menu, go to the **API** section.
3.  On the API page, you will see your **Auth Key**. Copy this key.

You should now have the following 2 values:
1.  `SPREADSHEET_ID` (from your Google Sheet)
2.  `MSG91_AUTH_KEY` (from your MSG91 dashboard)

### 3. Deploy the Google Apps Script

1.  Go to [script.google.com/create](https://script.google.com/create).
2.  Give your project a name, like "A Big Engine - User Backend".
3.  **Delete any existing code** in the editor.
4.  Paste the **entire contents** of the user backend code into the editor. (You can generate this from the Admin Panel's "Generate User Backend Code" button).
5.  Go to **Project Settings** (⚙️ icon on the left) > **Script Properties**.
6.  Click **Add script property** and add the 2 credentials you collected above:
    *   Property Name: `SPREADSHEET_ID`, Value: (Your User DB Sheet ID)
    *   Property Name: `MSG91_AUTH_KEY`, Value: (Your MSG91 Auth Key)
7.  Click **Deploy** > **New deployment**.
8.  Select type **Web app**.
9.  For "Who has access", select **Anyone**.
10. Click **Deploy**.
11. Authorize the permissions when prompted.
12. Copy the resulting **Web app URL**. This is your **User Data Backend URL**.

### 4. Final Configuration in Admin Panel

1.  Open the website and navigate to the **Admin Panel** via the footer link.
2.  In the "User Data Backend Configuration" card, paste the **Web app URL** you just copied.
3.  Click **Test**. You should see a success message.
4.  Click **Save**.
5.  In the "MSG91 Login Widget Configuration" card, enter your **Widget ID** and **Token Auth** from your MSG91 dashboard.
6.  Click **Save**.

The MSG91 authentication system is now fully configured and should work as expected.