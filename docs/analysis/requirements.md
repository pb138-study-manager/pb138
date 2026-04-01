# Guest
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

A3. - If the submitted input is invalid (e.g., missing required fields or invalid email format), the system rejects the submission and displays appropriate validation error messages for each invalid field. The form remains open with previously entered values preserved. The system waits for the user to correct the input and resubmit the form. Upon resubmission, the flow returns to step 3.

A7.1 - If the verification code is incorrect, user can submit it again up to 3 times. After 3 incorrect submit, the email address owner is warned about someone trying to create an account. The form is closed and the information are not saved.

A7.2 - If the verification code is not submitted within 3 hours since the email was sent, the form is closed and the information are not saved.

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
A3. - If the submitted data are incorrect (non-existent login/email in the system database or incorrect password), appropriate message is shown. The fields are cleaned and user stays on the landing page. There they can retry to log in.

## Post-conditions
User is authenticated in the system. Active session exists and is logged.


# User
# Create tasks (createTask)
UC createTask allows user to create and task and save it.

## Primary Actors
User

## Trigger
User presses the "+" button on main page.

## Pre-conditions
User is logged in.<br>
Required fields: title, due_date.<br>
Optional fields: description.<br>
Status defaults to 'TODO'.

## Main Flow of Events
1. User fills out task creation form.  
2. User submits the form.  
3. System validates input: required fields filled, due_date valid.
4. System creates a new Task record in the database with `user_id` set to the task owner.  
5. If task is created by mentor as a group task, system creates a separate task record for each GroupMember of the group (`user_id` = member id, `assignment_id` = assignment id).  
6. System updates the task list.  

## Alternative Flows
A3. - If input validation fails, system displays error messages.

## Post-conditions
Task(s) are created in the task table and visible in the task list for relevant users.  

<br><br>

# View Task (viewTask)
UC viewTask allows a user to view details of a task.

## Primary Actors
User

## Trigger
User clicks on a task in their task list.

## Pre-conditions
User is logged in.<br>
Task exists in Task table and is assigned to the user (or via group assignment if mentor).

## Main Flow of Events
1. User selects a task from the list.  
2. System retrieves Task record and related Eval (if exists) from database.  
3. System displays: title, description, due_date, status, feedback and score from Eval (if exists).  

## Alternative Flows
A3. - If task does not exist or user has no access rights (`user_id` mismatch), system displays "Task not found" or "Access denied".  

## Post-conditions
User can view task details.  

<br><br>

# Update Task (updateTask)
UC updateTask allows a user to edit a task they own, or mentor to edit tasks assigned to group members.

## Primary Actors
User

## Trigger
User clicks "Edit Task" button in task view.

## Pre-conditions
User is logged in.<br>
Task exists in Task table and user has access (`user_id` = task owner or mentor managing group assignment).  

## Main Flow of Events
1. User edits task fields (title, description, due_date, status).  
2. User submits the form.  
3. System validates input and checks permissions.  
4. System updates Task record in the database.  
5. System updates task list.  

## Alternative Flows
A3. - If input validation fails, system displays error messages.  
A4. - If task does not exist or user lacks permission, system displays error.  

## Post-conditions
Task record updated in database.

<br><br>

# Delete Task (deleteTask)
UC deleteTask allows a user to delete a task they own, or mentor to delete tasks assigned to group members.

## Primary Actors
User

## Trigger
User clicks "Delete Task" button.

## Pre-conditions
User is logged in.<br>
Task exists in Task table and user has permission (`user_id` = task owner or mentor managing group assignment).  

## Main Flow of Events
1. User clicks "Delete Task."  
2. System asks for confirmation ("Are you sure?").  
3. User confirms deletion.  
4. System sets `deleted_at` timestamp for the Task record instead of removing it.
5. System updates task list and shows confirmation message.  

## Alternative Flows
A2. - If user cancels deletion, task remains unchanged.  
A4. - If task does not exist or user lacks permission, system shows error.  

## Post-conditions
Task no longer visible in task lists.

<br><br>
