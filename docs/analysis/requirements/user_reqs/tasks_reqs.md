# User
# Create tasks (createTask)
UC createTask allows user to create and task and save it.

## Primary Actors
User

## Trigger
User presses the "+" button on main page.<br>
Mentor presses the "+" button in group interface.

## Pre-conditions
User is logged in.<br>
Required fields: title, due_date.<br>
Optional fields: description.<br>
Status defaults to 'TODO'.

## Main Flow of Events
1. User chooses the 'Task' form (other option is 'Event').
2. System displays task creation form.  
3. User fills out task creation form.  
4. User submits the form.  
5. System validates input: required fields filled, due_date valid.
6. System creates a new Task record in the database with `user_id` set to the task owner.  
7. If task is created by mentor as a group task, system creates a separate task record for each GroupMember of the group `user_id` = member id, `assignment_id` = assignment id).  
8. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
9. System updates the task/event list.  

## Alternative Flows
A3. - If input validation fails, system displays error messages and allows correction.

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
Task exists in Task table and is assigned to the user (or via group assignment if mentor).<br>
Task has `deleted_at IS NULL`.

## Main Flow of Events
1. User selects a task from the list.  
2. System retrieves Task record and related Eval (if exists) from database.  
3. System displays: title, description, due_date, status, feedback and score from Eval (if exists).  

## Alternative Flows
A2. - If task does not exist or user has no access rights (`user_id` mismatch), system displays "Task not found" or "Access denied".  

## Post-conditions
User can view task details.  

<br><br>

# Update Task (updateTask)
UC updateTask allows a user to edit a task they own, or mentor to edit tasks assigned to group members.

## Primary Actors
User

## Trigger
User clicks "Edit Task" button in task detail view.

## Pre-conditions
User is logged in.<br>
Task exists in Task table and user has access (`user_id` = task owner or mentor managing group assignment).<br>
Event has `deleted_at IS NULL`.

## Main Flow of Events
1. User edits task fields (title, description, due_date, status).  
2. User submits the form.  
3. System validates input and checks permissions.  
4. System updates Task record in the database.
5. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
6. System updates task list.  

## Alternative Flows
A3.1. - If input validation fails, system displays error messages, correction allowed. 
A3.2. - If task does not exist or user lacks permission, system displays error.  

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
Task exists in Task table and user has permission (`user_id` = task owner or mentor managing group assignment).<br>
Event has `deleted_at IS NULL`.

## Main Flow of Events
1. User clicks "Delete Task."  
2. System asks for confirmation ("Are you sure?").  
3. User confirms deletion.  
4. System sets `deleted_at` timestamp for the Task record.
5. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
6. System updates task list and shows confirmation message.  

## Alternative Flows
A2. - If user cancels deletion, task remains unchanged.  
A4. - If task does not exist or user lacks permission, system shows error.  

## Post-conditions
Task no longer visible in task lists.

<br><br>

# Mark as Done (markAsDone)
UC markAsDone allows a user to mark a task as completed.

## Primary Actors
User

## Trigger
User clicks "Mark as Done" action on a task.

## Pre-conditions
User is logged in.<br>
Task exists in Task table.<br>
Task belongs to the user (`user_id`).<br>
Task has `deleted_at IS NULL`.

## Main Flow of Events
1. User selects a task and triggers "Mark as Done".  
2. System retrieves the Task record.  
3. System verifies ownership and that task is not deleted.  
4. System updates Task status to 'DONE'.  
5. System saves changes to the database.  
6. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
7. System updates task list and changes the view.  

## Alternative Flows
A3. - If task does not exist or `deleted_at IS NOT NULL`, system displays error message.  
A3.1 - If user does not own the task, system displays "Access denied".  
A4. - If task is already in 'DONE' status, system marks the task as 'TODO' and continues normally.  

## Post-conditions
Task status is updated to 'DONE' or 'TODO' based on initial state.

<br><br>

# Filter Tasks (filter)
UC filter allows a user to filter and sort their tasks/events based on selected criteria.

## Primary Actors
User

## Trigger
User selects filtering and/or sorting options in the task dashboard.

## Pre-conditions
User is logged in.<br>
Tasks exist in the Task table associated with the user (`user_id`).<br>
Only tasks with `deleted_at IS NULL` are considered.

## Main Flow of Events
1. User selects filter criteria (e.g., status, due_date range, assignment presence, show events).  
2. User optionally selects sorting criteria (e.g., due_date, status).  
3. User applies the filter.  
4. System validates input (e.g., correct date range).  
5. System queries Task table with conditions:
   - `user_id = current_user`
   - `deleted_at IS NULL`
   - applied filter criteria  
6. System sorts the result set according to selected sorting criteria.  
7. System displays filtered and sorted list of tasks.  

## Alternative Flows
A1. - If no filter criteria are selected, system returns all non-deleted tasks for the user.
A2. - If no sorting criteria are selected, default order is by `due_date` ascending. 
A4. - If filter input is invalid (e.g., incorrect date range), system displays validation error and does not execute query.  
A7. - If no tasks match the criteria, system displays "No tasks found".  

## Post-conditions
Filtered and/or sorted list of tasks is displayed to the user.
