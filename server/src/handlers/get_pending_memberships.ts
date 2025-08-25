import { db } from '../db';
import { teamMembershipsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type TeamMembership } from '../schema';

export const getPendingMemberships = async (teamId: number): Promise<TeamMembership[]> => {
  try {
    const results = await db.select()
      .from(teamMembershipsTable)
      .where(and(
        eq(teamMembershipsTable.team_id, teamId),
        eq(teamMembershipsTable.status, 'pending')
      ))
      .execute();

    return results;
  } catch (error) {
    console.error('Get pending memberships failed:', error);
    throw error;
  }
};