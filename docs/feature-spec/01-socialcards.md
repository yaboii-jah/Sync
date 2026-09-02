Read `AGENTS.md` before executing this file.

# Social Card Refactor — `/connect`

## Context

Before making any changes, **read `AGENTS.md` and follow all repository-specific instructions**.

Refactor the `/connect` page into a single Social Connect Card interface supporting:

* LinkedIn
* Instagram
* Facebook

Only **one card should be visible at a time**.

The user selects which social platform they want to manage through a dropdown.

---

## 1. `/connect` Layout

The page should contain:

* Social platform dropdown
* One Social Connect Card

The dropdown should appear above the card.

### Dropdown Options

* LinkedIn
* Instagram
* Facebook

### Default Selection

The default selected platform must be:

**LinkedIn**

When `/connect` is first opened:

```text
Dropdown: LinkedIn

┌─────────────────────────────────┐
│                                 │
│          Avatar (Google)        │
│          Name (Google)          │
│                                 │
│        [ QR Placeholder ]       │
│                                 │
│  Profile URL                    │
│  [ https://...              ]   │
│                                 │
│        [ Generate QR ]          │
│                                 │
│     [ Open my LinkedIn ]        │
│     [ Save QR ]                 │
│                                 │
└─────────────────────────────────┘
```

---

## 2. One Card At A Time

Do **not** display LinkedIn, Instagram, and Facebook cards simultaneously.

There should be one reusable component:

```text
SocialConnectCard
```

The selected platform determines what content is displayed inside the card.

Conceptually:

```text
selectedPlatform
       │
       ▼
SocialConnectCard
       │
       ├── LinkedIn
       ├── Instagram
       └── Facebook
```

When the user changes the dropdown:

```text
LinkedIn → Instagram
```

the same card should update to Instagram.

Likewise:

```text
Instagram → Facebook
```

the same card should update to Facebook.

Do not create three duplicated card implementations.

---

## 3. Platform Configuration

The card should be driven by platform configuration rather than duplicated components.

Conceptually:

```text
LinkedIn
  name: LinkedIn
  openButton: "Open my LinkedIn"

Instagram
  name: Instagram
  openButton: "Open my Instagram"

Facebook
  name: Facebook
  openButton: "Open my Facebook"
```

The reusable component should use the selected platform configuration to determine:

* Platform name
* Platform icon/logo
* Open button label
* Profile URL
* QR code

---

## 4. Card Design

The card design must remain **consistent across all three platforms**.

Every platform uses the same structure:

### User Information

* Avatar
* Name

Avatar and Name may come from the authenticated Google user.

### QR Section

* QR Code Placeholder
* URL Input
* Generate QR button

### Actions

* Open my [Platform]
* Save QR

Only the platform-specific identity and URL should change.

---

## 5. Google Authentication

Google authentication may still be used for:

* User Avatar
* User Name

However, Google OAuth must have **no relationship with QR generation**.

Google OAuth must NOT be used to:

* Generate the social profile URL
* Determine the social profile URL
* Generate QR data
* Create the QR code
* Connect LinkedIn
* Connect Instagram
* Connect Facebook

The user manually provides the social profile URL.

The QR code must be generated directly from the URL entered by the user.

---

## 6. URL Input

The card contains one URL input for the currently selected platform.

### LinkedIn

```text
https://www.linkedin.com/in/username
```

### Instagram

```text
https://www.instagram.com/username
```

### Facebook

```text
https://www.facebook.com/username
```

The entered URL is the **only source of data used for QR generation**.

Do not automatically derive the social URL from Google authentication.

---

## 7. Generate QR

When the user clicks **Generate QR**:

1. Read the URL from the current platform.
2. Validate the URL.
3. Generate a QR code containing that exact URL.
4. Display the QR code inside the QR placeholder.

Example:

```text
Instagram selected
       ↓
User enters:
https://instagram.com/example
       ↓
Generate QR
       ↓
QR contains:
https://instagram.com/example
```

Google OAuth must not be involved in this process.

---

## 8. Platform State

The URL and QR state should be associated with the selected platform.

Conceptually:

```text
LinkedIn
  url: ""
  qr: null

Instagram
  url: ""
  qr: null

Facebook
  url: ""
  qr: null
```

Switching between platforms should not unintentionally overwrite another platform's data.

Example:

```text
LinkedIn selected
URL = https://linkedin.com/in/example

↓ switch to Instagram

Instagram selected
URL = https://instagram.com/example

↓ switch back to LinkedIn

LinkedIn selected
URL = https://linkedin.com/in/example
```

The previously entered LinkedIn URL should still be present.

---

## 9. Open My [Platform]

The button should dynamically reflect the selected platform.

Examples:

```text
Open my LinkedIn
Open my Instagram
Open my Facebook
```

When clicked, it should open the URL entered for the currently selected platform.

Do not use Google OAuth to determine the destination.

If no valid URL has been entered, the button should be disabled or display an appropriate validation message.

---

## 10. Save QR

The **Save QR** button should allow the user to save/download the currently displayed QR code.

It must:

* Save the QR generated for the currently selected platform.
* Preserve the exact URL encoded in the QR.
* Not regenerate the QR through Google OAuth.

If a QR has not been generated yet, the Save QR button should be disabled or display an appropriate message.

---

## 11. Dropdown Behavior

The default state must be:

```text
selectedPlatform = LinkedIn
```

Therefore:

```text
/connect loads
      ↓
Dropdown = LinkedIn
      ↓
LinkedIn card displayed
```

When the user selects another platform:

```text
Dropdown = Instagram
      ↓
Card changes to Instagram
```

The card layout itself should remain unchanged.

Only its platform-specific content should update.

---

## 12. Validation

At minimum:

* Empty URL cannot generate a QR.
* Invalid URL cannot generate a QR.
* Open button cannot open an empty/invalid URL.
* Save QR cannot be used before a QR has been generated.

If the existing project already has validation utilities or patterns, reuse them.

---

## 13. Implementation Requirements

Before implementation:

1. Read `AGENTS.md`.
2. Inspect the existing `/connect` implementation.
3. Identify the current LinkedIn card.
4. Identify the existing Google OAuth dependency.
5. Identify the existing QR generation implementation/library.
6. Reuse existing project conventions where possible.
7. Create one reusable `SocialConnectCard`.
8. Add a platform dropdown.
9. Set LinkedIn as the default platform.
10. Remove Google OAuth from the QR generation flow.
11. Keep Google authentication only for user information such as Avatar and Name.
12. Avoid introducing unnecessary dependencies.
13. Do not make unrelated changes.

---

## Acceptance Criteria

* [ ] `AGENTS.md` is read before implementation.
* [ ] `/connect` displays only one social card at a time.
* [ ] A social platform dropdown is present.
* [ ] Dropdown options are LinkedIn, Instagram, and Facebook.
* [ ] LinkedIn is selected by default.
* [ ] The card updates when the dropdown selection changes.
* [ ] All three platforms use the same reusable card component.
* [ ] Card layout and logic remain consistent across platforms.
* [ ] Avatar comes from the authenticated Google user.
* [ ] Name comes from the authenticated Google user.
* [ ] Google OAuth is not involved in QR generation.
* [ ] User manually enters the profile URL.
* [ ] Generate QR uses the entered URL directly.
* [ ] Each platform maintains its own URL/QR state.
* [ ] Open button dynamically changes to the selected platform.
* [ ] Open button opens the entered URL.
* [ ] Save QR saves the currently generated QR.
* [ ] Empty/invalid URLs are handled appropriately.
* [ ] No unnecessary duplicate card components are created.
* [ ] No unrelated functionality is changed.
