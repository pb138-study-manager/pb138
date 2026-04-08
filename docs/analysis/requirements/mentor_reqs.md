# Create Group (createGroup)
UC createGroup allows a mentor to create a new group and optionally add members during creation.

## Primary Actors
Mentor

## Trigger
Mentor selects "Create group" option in group management interface.

## Pre-conditions
Mentor is logged in.<br>
Mentor has permission to create groups.

## Main Flow of Events
1. Mentor opens group creation form.  
2. System displays form including group name and member selection interface.  
3. Mentor enters group name.  
4. INCLUDE(addUserToGroup)
5. Mentor submits the form.  
6. System validates input (e.g., non-empty name).  
7. System creates a new Group record with `mentor_id = current_user`.  
8. System creates GroupMember records for all selected users.  
9. System saves all records.  
10. System displays confirmation and updates group list.  

## Alternative Flows
A5. - If no users are selected, group is created without members.  
A7. - If validation fails, system displays error message and allows correction.  

## Post-conditions
New group is created and selected users are added as members.

<br><br>

# Add User to Group (addUserTo Group)
UC addUserToGroup allows a mentor to add one or more users to a group.

## Primary Actors
Mentor

## Trigger
Mentor selects "Add members" in group detail view or in group creation form.

## Pre-conditions
Mentor is logged in.<br>

## Main Flow of Events
1. Mentor initiates adding members.  
2. INCLUDE(searchUsers)
3. Mentor marks users they intend to add.
4. Mentor submits user list.
5. System checks that selected users are not already members.  
6. System creates GroupMember records for all valid selected users.  
7. System saves changes and updates member list.  

## Alternative Flows 
A5. - If some users are already members, system skips them and informs the mentor.

## Post-conditions
Selected users are added to the group.

<br><br>

# Search User (searchUser)
UC searchUser allows a mentor to search for users to add to a group.

## Primary Actors
Mentor

## Trigger
Mentor enters query into user search field.

## Pre-conditions
Mentor is logged in.

## Main Flow of Events
1. Mentor enters search query (login, ID, email, name,...).  
2. Mentor submits the query.  
3. System validates input.  
4. System searches User table based on query.  
5. System returns matching users.  
6. System displays search results.

## Alternative Flows
A3. - If query is empty, system may return no results or prompt user to enter input.  
A5. - If no users match, system displays "No users found".  

## Post-conditions
List of users matching search criteria is displayed.

<br><br>

# Remove User from Group (removeUserFromGroup)
UC removeUserFromGroup allows a mentor to remove a user from a group.

## Primary Actors
Mentor

## Trigger
Mentor selects "Remove member" action in group-member detail view.

## Pre-conditions
Mentor is logged in.<br>
Group exists and `mentor_id = current_user`.<br>
User is a member of the group.

## Main Flow of Events
1. Mentor selects a group member.  
2. Mentor clicks "Remove member".  
3. System asks for confirmation.  
4. Mentor confirms action.  
5. System deletes corresponding GroupMember record.  
6. System updates member list and displays confirmation.  

## Alternative Flows
A3. - If mentor cancels action, no changes are made.  
A5. - If user is not a member, system displays error.

## Post-conditions
User is removed from the group.

<br><br>

# Delete Group (deleteGroup)
UC deleteGroup allows a mentor to delete a group.

## Primary Actors
Mentor

## Trigger
Mentor selects "Delete group" option.

## Pre-conditions
Mentor is logged in.<br>
Group exists and `mentor_id = current_user`.

## Main Flow of Events
1. Mentor clicks "Delete group".  
2. System asks for confirmation.  
3. Mentor confirms deletion.  
4. System deletes Group record.  
5. System deletes all related GroupMember records.  
6. System updates group list and displays confirmation.  

## Alternative Flows
A2. - If mentor cancels deletion, group remains unchanged.  
A4. - If mentor does not own the group, system displays "Access denied".  

## Post-conditions
Group and its memberships are removed from the system.

<br><br>

# Assign Task to Group (assignTask)
UC assignTask allows a mentor to assign a task to all members of a group.

## Primary Actors
Mentor

## Trigger
Mentor selects "+" button in group detail view.

## Pre-conditions
Mentor is logged in.<br>
Group exists and `mentor_id = current_user`.<br>
Mentor has permission to assign tasks.

## Main Flow of Events
1. INCLUDE(createTask)
2. System updates task list and displays confirmation to mentor.  

## Post-conditions
An Assignment is created and each group member has a corresponding Task.

<br><br>

# Evaluate Task (evaluateTask)
UC evaluateTask allows a mentor to evaluate a completed task of a group member.

## Primary Actors
Mentor

## Trigger
Mentor selects a task from the task list of an assignment.

## Pre-conditions
Mentor is logged in.<br>
Task exists and belongs to a member of a group owned by the mentor.<br>
Task status = 'DONE' or it is after due date.<br>
Mentor has permission to evaluate tasks.

## Main Flow of Events
1. Mentor opens task detail view.  
2. System displays task information (title, description, due_date, status).  
3. Mentor enters evaluation details:
   - score (integer)  
   - feedback (optional text)  
4. Mentor submits the evaluation.  
5. System validates input (score within allowed range, feedback optional).  
6. System creates an Eval record linked to the Task (`task_id`).  
7. System saves the evaluation.  
8. System displays confirmation to mentor and updates task list with evaluation info.
9. System notifies user that his task has been evaluated.

## Alternative Flows
A4. - If task status ≠ 'DONE' or due date is yet to come, system displays "Task is not yet completed" and prevents evaluation.  
A5. - If mentor does not own the group, system displays "Access denied".  
A6. - If score is invalid (e.g., out of range), system displays validation error and allows correction.

## Post-conditions
Task is evaluated, and an Eval record exists with score and feedback.
