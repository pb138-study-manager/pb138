# Manage System (manageSystem)
UC manageSystem allows an admin to manage users, roles, system settings, the database, and review system audit logs.<br>
This is more abstract specification for multiple usecases: manageUsers, manageRoles, manageSystemSettings, manageDatabase, viewLogs.

## Primary Actors
Admin

## Trigger
Admin accesses the system administration interface.

## Pre-conditions
Admin is logged in.<br>
Admin has appropriate permissions.

## Main Flow of Events
1. Admin opens system management interface.  
2. System displays sections for:
   - Users (view, create, update, delete)  
   - Roles (view, create, update, assign to users)  
   - System settings (view, modify global configurations)  
   - Database (backup, restore, migration tasks)  
   - Audit logs (view recent actions, filter by user/date/action type)  
3. Admin selects a section and performs management actions.  
4. System validates input and applies changes.  
5. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).  
6. System displays confirmation or results of the action.  

## Alternative Flows
A4. - If validation fails (e.g., invalid data, permission errors), system displays appropriate error messages.  
A5. - If an action would compromise system integrity (e.g., deleting essential admin account), system prevents the operation and warns the admin.  
A6. - If there are no audit records matching filter criteria, system displays "No records found".  

## Post-conditions
Changes made by the admin are persisted and applied across the system.  
All actions performed by the admin are recorded in the AuditLog for future review.  

## Notes
- This UC abstracts all administrative operations.  
- Detailed CRUD operations and audit review are considered sub-flows within this UC.  
- AI agents or scripts can use this abstraction to perform automated administration tasks while maintaining audit compliance.

<br><br>

# Check Deadlines (checkDeadlines)
UC checkDeadlines allows the system to automatically check for upcoming or overdue tasks and events.

## Primary Actors
System

## Trigger
Scheduled job or automated process runs periodically (e.g., every hour/day).

## Pre-conditions
Tasks and events exist in the system.<br>
System scheduler is configured.

## Main Flow of Events
1. System queries Task and Event tables for items approaching their `due_date` or `start_date`.  
2. System identifies tasks/events where `status != DONE` and `due_date` or `start_date` is within configured threshold.  
3. System marks items as "pending notification" or logs them for processing.
4. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).
5. System triggers the `sendNotification` UC for identified items.
6. INCLUDE(sendNotification)

## Alternative Flows
A4. - If no tasks/events meet criteria, system does nothing.  
A5. - If query fails (database unavailable), system logs an error and retries at next scheduled interval.  

## Post-conditions
Tasks and events requiring attention are flagged for notifications.

<br><br>

# Send Email Notification (sendNotification)
UC sendNotification allows the system to automatically send email notifications for tasks, events, or other triggers.

## Primary Actors
System

## Trigger
Triggered by checkDeadlines UC or other system events (e.g., task assignment, system alert).

## Pre-conditions
Recipient exists (User).<br>
Email template exists for the type of notification.<br>
System mail service is configured.

## Main Flow of Events
1. System selects recipients for notification.  
2. System retrieves appropriate EmailTemplate.  
3. System populates template with dynamic content (task title, due date, etc.).  
4. System sends email to recipient.  
5. System logs email status in Email table (`sent_at`, `status`, `recipient_id`).
6. System automatically records all actions in the AuditLog table (`actor_id`, `description`, `happened_at`).
7. System updates any necessary flags (e.g., mark notification as sent).  

## Alternative Flows
A4. - If recipient email is invalid, system logs error and skips sending.  
A5. - If email fails to send (SMTP error), system retries according to retry policy and logs outcome.  

## Post-conditions
Notification emails are sent or logged, and Email records are updated.
