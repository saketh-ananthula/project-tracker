import type { ProjectRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type Membership = {
  role: ProjectRole;
  projectId: string;
  userId: string;
};

export async function getMembership(
  projectId: string,
  userId: string
): Promise<Membership | null> {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { role: true, projectId: true, userId: true },
  });
  return m;
}

export function requireAdmin(role: ProjectRole): boolean {
  return role === "ADMIN";
}
