# Create account (createAccount)
UC createAccount allows unregistered user to register on the platform.

## Primary Actors
Unregistered User (User)

## Trigger
User presses the button "Sign up" on landing page.

## Pre-conditions
No user is logged in.<br>
Required fields: name (login), email, password.<br>
Optional fields: title, fullname, organization.

## Main Flow of Events
1. User fills out the form.
2. User submits the form (via "Create an account" button).
3. System verifies the submission - whether required fields are filled in, email address is in correct format and the password fulfills the conventions.
4. System sends a verification code to the submitted email.
5. System displays input field for the verification code.
6. User submits the verification code from their email.
7. System validates the submitted code.
8. After verification, new account is created and saved to the database.
9. User is redirected to log in screen.

## Alternative Flows
A1. Any time during the flow, user can leave the sign up form. In that case, the information are not saved.

A3. - In step 3., if the submitted input is invalid (e.g., missing required fields or invalid email format), the system rejects the submission and displays appropriate validation error messages for each invalid field. The form remains open with previously entered values preserved. The system waits for the user to correct the input and resubmit the form. Upon resubmission, the flow returns to step 3.

A7.1 - In step 7., if the verification code is incorrect, user can submit it again up to 3 times. After 3 incorrect submit, the email address owner is warned about someone trying to create an account. The form is closed and the information are not saved.

A7.2 - In step 7., if the verification code is not submitted within 3 hours since the email was sent, the form is closed and the information are not saved.

## Post-conditions
New user account is created and saved in the database.

<br><br>

# Log In (logIn)
UC logIn allows registered user to log into their account and access their data.

## Primary Actors
Registered User (User)

## Pre-conditions
No user is logged in.<br>
The user is on the landing page that contains log in form.

## Main Flow of Events
1. User fills in their login (or email) and password.
2. User submits the login data (via "Log in" button).
3. System verifies the submission - whether active account with submitted login/email exists and the password is associated correctly.
4. System logs the user in.
5. User is redirected to the main page.

## Alternative Flows
A3. - In step 3., if the submitted data are incorrect (non-existent login/email in the system database or incorrect password), appropriate message is shown. The fields are cleaned and user stays on the landing page. There they can retry to log in.

## Post-conditions
User is authenticated in the system. Active session exists and is logged.
