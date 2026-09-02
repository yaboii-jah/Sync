
Read `AGENTS.md` before executing this file.


Social Profiles Persistence & QR Generation
Database

A public.social_profiles table already exists for storing the user's social profile URLs.

The table uses:

(user_id, network)

as the primary key.

Supported networks:

linkedin
instagram
facebook

Each user can therefore have one saved profile URL per network.

1. Save Profile URL When Generating QR

When the user clicks Generate QR, the application must save the current URL input to public.social_profiles.

The flow should be:

User enters URL
      ↓
User clicks "Generate QR"
      ↓
Validate URL
      ↓
Save / Upsert URL to social_profiles
      ↓
Generate QR from URL
      ↓
Display QR

The URL should only be persisted after it passes the existing validation rules.

2. Upsert Social Profile

When generating a QR, use an upsert operation based on:

user_id + network

If the user does not have a saved profile for the selected network:

INSERT

If the user already has a saved profile:

UPDATE

Example:

user_id = current authenticated user's profile ID
network = "linkedin"
url = "https://www.linkedin.com/in/example"

If the user later changes the URL to:

https://www.linkedin.com/in/new-example

and clicks Generate QR, update the existing LinkedIn record rather than creating another record.

The same behavior applies to Instagram and Facebook.

3. User-Specific Social Profiles

Social profiles must belong to the currently authenticated user.

Use the authenticated user's user_id when reading and writing records.

Do not use another user's social profile data.

The expected relationship is:

Authenticated User
       │
       ▼
profiles.id
       │
       ▼
social_profiles.user_id
4. Load Saved Profile Automatically

When /connect loads, retrieve the authenticated user's saved social profiles from:

public.social_profiles

for the supported networks:

linkedin
instagram
facebook

The saved URLs should populate the corresponding platform state.

Conceptually:

social_profiles

LinkedIn   → https://linkedin.com/in/example
Instagram  → https://instagram.com/example
Facebook   → https://facebook.com/example

The UI should then automatically populate the URL input when the user selects a platform.

5. Dropdown + Saved Profile Behavior

The page still displays one card at a time.

The dropdown contains:

LinkedIn
Instagram
Facebook

Default:

selectedPlatform = "linkedin"

When /connect loads:

Load social_profiles
        ↓
Get user's LinkedIn profile
        ↓
Populate LinkedIn URL input
        ↓
Display LinkedIn card

If the user changes the dropdown:

LinkedIn
   ↓
Instagram

the Instagram URL input should automatically contain the user's previously saved Instagram profile URL, if one exists.

Likewise:

Facebook

should load the user's saved Facebook URL.

6. Automatic QR Generation From Saved Profile

If a saved social profile exists, the user should not need to manually type the URL again.

The saved URL should be available to the QR generation flow.

Example:

Database:
LinkedIn → https://www.linkedin.com/in/example

        ↓

User opens /connect

        ↓

LinkedIn selected by default

        ↓

URL input automatically populated

        ↓

Generate QR

        ↓

QR generated from saved LinkedIn URL

The QR must encode the saved profile URL exactly.

7. Generate QR With Existing Input

The input remains editable.

If the user changes the URL:

Saved:
https://www.linkedin.com/in/old-profile

User changes input to:
https://www.linkedin.com/in/new-profile

and clicks Generate QR:

Validate new URL
       ↓
Upsert social_profiles
       ↓
Generate QR from new URL

The newly entered URL becomes the user's saved profile URL for that network.

8. Do Not Automatically Save Every Keystroke

Do not save the URL on every input/change event.

For example, avoid:

onChange → database update

Instead:

User types URL
      ↓
User clicks Generate QR
      ↓
Validate
      ↓
Upsert database
      ↓
Generate QR

This keeps database writes intentional and aligned with the existing Generate QR action.

9. QR Generation Source

The QR generation source should be:

current URL input

The input itself may have been populated from:

social_profiles

Therefore the complete flow is:

                    ┌─────────────────────┐
                    │  social_profiles    │
                    └──────────┬──────────┘
                               │
                               │ load
                               ▼
                      ┌─────────────────┐
                      │    URL Input    │
                      └────────┬────────┘
                               │
                     user edits if needed
                               │
                               ▼
                     ┌─────────────────┐
                     │  Generate QR    │
                     └────────┬────────┘
                              │
                       validate URL
                              │
                  ┌───────────┴───────────┐
                  │                       │
                  ▼                       ▼
           Upsert profile            Generate QR
           to database               from URL
                  │                       │
                  └───────────┬───────────┘
                              ▼
                         Display QR

Google OAuth is not the source of the social URL.

Google authentication only provides user identity information such as:

Avatar
Name
10. Network Mapping

The application should map the dropdown selection directly to the database network value.

UI Platform	social_profiles.network
LinkedIn	linkedin
Instagram	instagram
Facebook	facebook

Do not use inconsistent values such as:

"LinkedIn"
"Instagram"
"Facebook"

when querying or writing the database.

Use the lowercase database values:

linkedin
instagram
facebook
11. Existing Database Constraints

The existing social_profiles table contains URL validation constraints for:

LinkedIn
Instagram
Facebook

The application should perform client-side validation before attempting the database write, but the database remains the final validation layer.

Do not bypass or weaken the existing database constraints.

If the database rejects an invalid URL, display an appropriate user-facing validation error instead of silently failing.

12. Save QR Behavior

The Save QR button should save the QR currently displayed for the selected platform.

The QR should represent the same URL stored in:

social_profiles

for the selected network.

Example:

Selected network:
linkedin

Saved profile:
https://www.linkedin.com/in/example

Displayed QR:
QR → https://www.linkedin.com/in/example
13. Platform Switching

Switching platforms should preserve each platform's saved data.

Example:

LinkedIn
URL: https://linkedin.com/in/example

↓ switch to Instagram

Instagram
URL: https://instagram.com/example

↓ switch to Facebook

Facebook
URL: https://facebook.com/example

↓ switch back to LinkedIn

LinkedIn
URL: https://linkedin.com/in/example

Do not clear the URL input simply because the user switched platforms.

14. Handling Missing Profiles

If the user has no saved profile for the selected network:

social_profiles record = none

then:

Keep the URL input empty.
Allow the user to enter a URL.
Require a valid URL before generating a QR.
Save the URL when Generate QR is clicked.

Example:

Facebook selected

No Facebook profile saved
        ↓
URL input = empty
        ↓
User enters Facebook URL
        ↓
Generate QR
        ↓
Save Facebook profile
        ↓
Generate QR
15. Recommended Component/Data Structure

Keep the UI as a single reusable component.

Conceptually:

/connect
   │
   ├── Social Platform Dropdown
   │
   └── SocialConnectCard
          │
          ├── Avatar
          ├── Name
          ├── QR Placeholder
          ├── URL Input
          ├── Generate QR
          ├── Open my [Platform]
          └── Save QR

Platform configuration:

linkedin
instagram
facebook

and saved profile data should be mapped to the selected network.

Acceptance Criteria — Database & Persistence

The authenticated user's social profiles are loaded from public.social_profiles.

LinkedIn, Instagram, and Facebook are supported.

LinkedIn is selected by default.

The saved URL automatically populates the URL input when its platform is selected.

A missing social profile results in an empty URL input.

The URL remains editable.

Clicking Generate QR validates the URL.

Clicking Generate QR upserts the URL into social_profiles.

The upsert uses the authenticated user's user_id.

The upsert uses the selected network.

Existing profiles are updated rather than duplicated.

New profiles are inserted when none exist.

The QR is generated from the current URL input.

Google OAuth is not used as the QR URL source.

The user does not need to repeatedly type a previously saved profile URL.

Switching platforms loads the correct saved URL.

Switching platforms does not overwrite another platform's profile.

Invalid URLs are rejected before attempting to save/generate.

Existing database validation constraints remain intact.

Save QR saves the QR corresponding to the currently selected network.