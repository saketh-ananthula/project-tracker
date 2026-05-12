export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type ProjectRole = "ADMIN" | "MEMBER";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
  taskCount: number;
  memberCount: number;
  updatedAt: string;
};

export type ProjectMember = {
  id: string;
  email: string;
  name: string;
  role: ProjectRole;
};

export type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  yourRole: ProjectRole;
  memberCount: number;
  taskCount: number;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; email: string; name: string } | null;
  createdBy: { id: string; email: string; name: string };
};

export type DashboardData = {
  summary: {
    totalTasks: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    myAssignedOpen: number;
  };
  overdueTasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: string | null;
    project: { id: string; name: string };
    assignee: { id: string; name: string } | null;
  }>;
  myUpcoming: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: string | null;
    project: { id: string; name: string };
  }>;
};
