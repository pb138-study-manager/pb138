const BASE = `http://localhost:${process.env.PORT ?? 3001}`;

// Generic helper: call our own REST API, forwarding the user's auth header.
async function callApi(
  method: string,
  path: string,
  authHeader: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { error: true, status: res.status, data };
  }
  return data;
}

// Map a tool name + args to the matching REST endpoint.
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  authHeader: string
): Promise<unknown> {
  switch (name) {
    // --- Tasks ---
    case 'list_tasks':
      return callApi('GET', '/tasks', authHeader);
    case 'create_task': {
      const today = new Date().toISOString().split('T')[0];
      const taskArgs = { dueDate: today, priority: 'LOW', ...args };
      return callApi('POST', '/tasks', authHeader, taskArgs);
    }
    case 'update_task': {
      const { id, ...rest } = args;
      return callApi('PATCH', `/tasks/${id}`, authHeader, rest);
    }
    case 'complete_task':
      return callApi('PATCH', `/tasks/${args.id}/toggle-done`, authHeader);
    case 'delete_task':
      return callApi('DELETE', `/tasks/${args.id}`, authHeader);

    // --- Notes ---
    case 'list_notes':
      return callApi('GET', '/notes', authHeader);
    case 'get_note':
      return callApi('GET', `/notes/${args.id}`, authHeader);
    case 'create_note':
      return callApi('POST', '/notes', authHeader, args);
    case 'update_note': {
      const { id, ...rest } = args;
      return callApi('PATCH', `/notes/${id}`, authHeader, rest);
    }

    // --- Events ---
    case 'list_events': {
      const events = await callApi('GET', '/events', authHeader);
      if (!Array.isArray(events) || !args.limit) return events;
      const sorted = [...events].sort(
        (a, b) =>
          new Date(String((a as Record<string, unknown>).startDate)).getTime() -
          new Date(String((b as Record<string, unknown>).startDate)).getTime()
      );
      return sorted.slice(0, Number(args.limit));
    }
    case 'create_event':
      return callApi('POST', '/events', authHeader, args);
    case 'delete_event':
      return callApi('DELETE', `/events/${args.id}`, authHeader);

    // --- Courses ---
    case 'list_courses':
      return callApi('GET', '/courses', authHeader);

    // --- Search ---
    case 'search':
      return callApi('GET', `/search?q=${encodeURIComponent(String(args.q))}`, authHeader);

    // --- Materials ---
    case 'list_course_materials':
      return callApi('GET', `/courses/${args.courseId}/materials`, authHeader);
    case 'read_material_content':
      return callApi('GET', `/courses/${args.courseId}/materials/${args.materialId}/content`, authHeader);

    // --- Teacher: Groups ---
    case 'list_groups':
      return callApi('GET', '/groups', authHeader);
    case 'list_group_members':
      return callApi('GET', `/groups/${args.groupId}`, authHeader);

    // --- Teacher: Students ---
    case 'list_students':
      return callApi('GET', `/users/search?q=${encodeURIComponent(String(args.q))}`, authHeader);

    // --- Teacher: Assignments ---
    case 'create_assignment': {
      const { groupId, ...rest } = args;
      return callApi('POST', `/groups/${groupId}/assignments`, authHeader, rest);
    }
    case 'assign_task_to_student':
      return callApi('POST', '/tasks/assign', authHeader, args);
    default:
      return { error: true, message: `Unknown tool: ${name}` };
  }
}