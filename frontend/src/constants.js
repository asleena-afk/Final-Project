export const STATUSES = [
  ["todo", "To Do"],
  ["in_progress", "In Progress"],
  ["pending_review", "Pending Review"],
  ["done", "Done"],
];
export const STATUS_LABEL = Object.fromEntries(STATUSES);
export const PRIORITIES = [["high", "High"], ["medium", "Medium"], ["low", "Low"]];
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES);

// Same mapping as backend/app/services/stages.py
export const STAGE_TO_STATUS = {
  "NEW / CLARIFICATION": "todo",
  "FOR DEVELOPMENT": "todo",
  "PENDING DEV ASSIGNMENT": "todo",
  "DEVELOPMENT IN PROGRESS": "in_progress",
  "FOR CODE MERGE & DEPLOYMENT": "in_progress",
  "TEST FAILED": "in_progress",
  "FOR TESTING": "pending_review",
  "FOR UAT DEPLOYMENT": "pending_review",
  "UAT FIXPACK": "pending_review",
  "FOR PROD DEPLOYMENT": "pending_review",
  CLOSED: "done",
};
export const STAGES = Object.keys(STAGE_TO_STATUS);

export const PROJECT_STATUSES = [["active", "Active"], ["on_hold", "On hold"], ["done", "Done"]];
export const HEALTHS = [["green", "Green"], ["amber", "Amber"], ["red", "Red"]];

export const TASK_FIELDS = [
  "project_id", "meeting_id", "title", "notes", "status", "priority", "due_date", "assignee",
  "is_blocked", "blocker_reason", "ticket_ref", "module", "estimate_hrs", "ticket_stage",
];
// The API's PUT needs the whole task, so rebuild it from a loaded task.
export function taskToBody(t, changes = {}) {
  const body = {};
  TASK_FIELDS.forEach((f) => (body[f] = t[f] ?? null));
  body.notes = t.notes ?? "";
  body.estimate_hrs = t.estimate_hrs == null ? null : Number(t.estimate_hrs);
  return { ...body, ...changes };
}
