# iOS Back Tap Setup for MyKharcha

MyKharcha opens Quick Add via a URL so you can use iPhone's native **Back Tap** accessibility feature with an Apple Shortcut.

> **Important:** A web/PWA app cannot detect physical Back Tap gestures directly. Back Tap is controlled by iOS. You must configure a Shortcut and assign it in iOS Settings.

## Quick Add URL
- Production: `https://YOUR_DOMAIN/quick-add`
- Local/dev (same network): `http://YOUR_COMPUTER_IP:5173/quick-add` (requires app running and reachable)

When opened, this route shows the Quick Add screen. If you are not logged in, MyKharcha will prompt **"Please log in first"** and return you to Quick Add after sign-in.

## 1. Create the Apple Shortcut
1. Open the **Shortcuts** app on your iPhone.
2. Tap **+** to create a new shortcut.
3. Name it: **Add Expense - MyKharcha**.
4. Add action: **Open URLs** (or **Open URL**).
5. Set URL to: `https://YOUR_DOMAIN/quick-add` (replace with your deployed domain).
6. Save the shortcut.

## 2. Assign to Back Tap (Double Tap)
1. Open **Settings** > **Accessibility** > **Touch** > **Back Tap**.
2. Tap **Double Tap**.
3. Scroll to the **Shortcuts** section and select **Add Expense - MyKharcha** (if listed).
4. If your iOS version shows shortcuts differently, select the appropriate option that runs this shortcut.

> **Note:** Availability of shortcuts as Back Tap actions can vary by iOS version/configuration. Test on your device. If the shortcut is not directly assignable, use an available workaround (e.g. assign an Accessibility/Shortcut action supported by your iOS version) and document the behavior.

## 3. Expected workflow
1. Double-tap the **physical back** of the iPhone.
2. iOS Back Tap triggers the Shortcut.
3. Shortcut opens MyKharcha Quick Add (`/quick-add`).
4. Enter amount/details and tap **Save**.

## 4. Requirements and limitations
- Works with deployed HTTPS URL for reliable installed-PWA/Shortcut behavior.
- You must be logged in for the smoothest experience (app keeps a persistent session); if not, log in first when prompted.
- Normal **Add** button in the app always remains available.
- Offline: if opened offline, Quick Add can queue a new transaction locally and sync when reconnected (creation only).

## 5. Real-device testing checklist
- [ ] Open `https://YOUR_DOMAIN/quick-add` directly in Safari.
- [ ] Install PWA to Home Screen and launch standalone.
- [ ] Create and run "Add Expense - MyKharcha" shortcut manually.
- [ ] Assign to Back Tap > Double Tap (if supported).
- [ ] Double-tap physical back and confirm Quick Add opens.
- [ ] Save an expense and confirm it appears in MongoDB/dashboard/reports.

Do not mark physical Back Tap testing as passed based on desktop or browser simulation.
