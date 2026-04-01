# User
# Change Personal Information (changePersonalInfo)
UC changePersonalInfo allows a user to update their personal profile information.

## Primary Actors
User

## Trigger
User navigates to profile page and selects "Edit personal information".

## Pre-conditions
User is logged in.<br>
UserProfile record exists for the user.

## Main Flow of Events
1. User opens profile edit form.  
2. System displays current profile data (name, title, avatar, organization, bio).  
3. User modifies selected fields.  
4. User submits the form.  
5. System validates input (e.g., field length, format if applicable).  
6. System updates corresponding fields in UserProfile table.  
7. System saves changes.  
8. System displays confirmation message.  

## Alternative Flows
A5. - If validation fails, system displays error messages and changes are not applied.  
A6. - If UserProfile record does not exist, system creates it and saves provided data - this happens on first occassion of this UC.  

## Post-conditions
UserProfile is updated with new personal information.

<br><br>

# Change Password (changePassword)
UC changePassword allows a user to change their account password.

## Primary Actors
User

## Trigger
User selects "Change password" option in profile settings.

## Pre-conditions
User is logged in.<br>
User account exists.

## Main Flow of Events
1. User enters current password.  
2. User enters new password and confirms it.  
3. User submits the form.  
4. System verifies that current password is correct.  
5. System validates new password (e.g., length, complexity rules).  
6. System updates `pwd_hash` in User table.  
7. System saves changes. 
8. System displays confirmation message.
9. System sends email notification about password change.

## Alternative Flows
A2. - If new password and confirmation do not match, system rejects submission, correction is allowed.  
A4. - If current password is incorrect, system displays error message and inputs reset.  
A5. - If new password does not meet requirements, system displays validation errors, correction is allowed.  

## Post-conditions
User password is updated.

<br><br>

# Change Settings (settings)
UC settings allows a user to modify their application settings.

## Primary Actors
User

## Trigger
User opens settings page.

## Pre-conditions
User is logged in.<br>
UserSettings record default values upon profile creation are: {notifications_enabled = true, light_theme = true}.

## Main Flow of Events
1. User navigates to settings page.  
2. System retrieves current settings from UserSettings table.  
3. System displays settings (e.g., notifications_enabled, light_theme).  
4. User toggles selected settings.  
5. User submits changes.
7. System updates UserSettings record.  
8. System saves and applies changes.

## Post-conditions
UserSettings are updated.

<br><br>

# Set Mode (setMode)
UC setMode allows a user to switch between light and dark theme.

## Primary Actors
User

## Trigger
User toggles theme mode (e.g., light/dark switch) in settings or UI.

## Pre-conditions
User is logged in.<br>

## Main Flow of Events
1. User selects or toggles theme mode within the settings context.  
2. System captures selected mode (light or dark).  
3. System updates `light_theme` field in UserSettings table accordingly.  
4. System saves changes.  
5. System immediately applies selected theme in UI.

## Post-conditions
User interface theme is updated and preference is stored.  
