// Shared types for the kanban board, task detail panel, and related forms.
// Import these everywhere instead of re-declaring local copies — that's
// what caused the Task/Member type mismatches between BoardClient and
// TaskDetailSlideOver.

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface Member {
  user_id: string;
  profiles: Profile | null;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  workspace_id: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  position: number;
  workspace_id: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null; // raw user_id, kept separate from the joined profile below
  assignee?: Profile | null;
}

export interface TaskComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: Profile | null;
}
