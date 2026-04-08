# User
# Create Event (createEvent)
UC createEvent allows a user to create a new event.

## Primary Actors
User

## Trigger
User presses the "+" button on main page.

## Pre-conditions
User is logged in.<br>
Required fields: title, start_date, end_date.<br>
Optional fields: description, place.

## Main Flow of Events
1. User chooses the 'Event' form (other option is 'Task').
2. System displays event creation form.  
3. User fills out the form.  
4. User submits the form.  
5. System validates input:
   - required fields are filled
   - `start_date <= end_date`  
6. System creates a new Event record in the database with `user_id = current_user`.  
7. System saves the record.
8. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
9. System updates task/event list.

## Alternative Flows
A4. - If input validation fails, system displays error messages and allows correction.  
A5. - If date range is invalid (`start_date > end_date`), system rejects submission, but allow correction.  

## Post-conditions
Event is created and visible in the task/event list.  

<br><br>

# View Event (viewEvent)
UC viewEvent allows a user to view details of an event.

## Primary Actors
User

## Trigger
User selects an event from the task/event list.

## Pre-conditions
User is logged in.<br>
Event exists in Event table and belongs to the user (`user_id`).<br>
Event has `deleted_at IS NULL`.

## Main Flow of Events
1. User selects an event from the list.  
2. System retrieves Event record from database.  
3. System displays: title, description, place, start_time, end_time.

## Alternative Flows
A2 - If user does not own the event, system displays "Access denied".  

## Post-conditions
User can view event details.  

<br><br>

# Update Event (updateEvent)
UC updateEvent allows a user to edit an existing event.

## Primary Actors
User

## Trigger
User clicks "Edit Event" button in event detail view.

## Pre-conditions
User is logged in.<br>
Event exists and belongs to the user (`user_id`).<br>
Event has `deleted_at IS NULL`.

## Main Flow of Events
1. User modifies event fields.
2. User submits the form.  
3. System validates input:
   - required fields are filled
   - `start_date <= end_date`  
4. System updates Event record in the database.
5. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
6. System updates task/event list.

## Alternative Flows
A3.1. - If validation fails, system displays error messages, correction allowed.  
A3.2. - If event does not exist or user lacks permission, system displays error.  

## Post-conditions
Event is updated with new values.

<br><br>

# Delete Event (deleteEvent)
UC deleteEvent allows a user to delete an event.

## Primary Actors
User

## Trigger
User clicks "Delete Event" button.

## Pre-conditions
User is logged in.<br>
Event exists and belongs to the user (`user_id`).<br>
Event has `deleted_at IS NULL`.

## Main Flow of Events
1. User clicks "Delete Event".  
2. System asks for confirmation.  
3. User confirms deletion.  
4. System sets `deleted_at` timestamp for the Event record.
5. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
6. System updates task/event list and displays confirmation message.  

## Alternative Flows
A2. - If user cancels deletion, event remains unchanged.  
A4. - If event does not exist or user lacks permission, system displays error.  

## Post-conditions
Event is soft-deleted and no longer visible in task/event list.
