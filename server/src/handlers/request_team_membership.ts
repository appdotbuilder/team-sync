import { db } from '../db';
import { teamMembershipsTable, teamsTable, usersTable } from '../db/schema';
import { type RequestTeamMembershipInput, type TeamMembership } from '../schema';
import { eq, and } from 'drizzle-orm';

export const requestTeamMembership = async (input: RequestTeamMembershipInput, userId: number): Promise<TeamMembership> => {
  try {
    // Verify that the team exists
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, input.team_id))
      .execute();

    if (team.length === 0) {
      throw new Error('Team not found');
    }

    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Check if user already has a membership (pending, active, or rejected)
    const existingMembership = await db.select()
      .from(teamMembershipsTable)
      .where(
        and(
          eq(teamMembershipsTable.team_id, input.team_id),
          eq(teamMembershipsTable.user_id, userId)
        )
      )
      .execute();

    if (existingMembership.length > 0) {
      throw new Error('User already has a membership request or is already a member');
    }

    // Create the membership request with pending status
    const result = await db.insert(teamMembershipsTable)
      .values({
        team_id: input.team_id,
        user_id: userId,
        status: 'pending',
        joined_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Team membership request failed:', error);
    throw error;
  }
};