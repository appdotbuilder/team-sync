import { db } from '../db';
import { teamsTable, teamMembershipsTable } from '../db/schema';
import { type Team } from '../schema';
import { or, eq, and } from 'drizzle-orm';

export async function getUserTeams(userId: number): Promise<Team[]> {
  try {
    // Get teams where user is either the creator OR an active member
    const results = await db.select({
      id: teamsTable.id,
      name: teamsTable.name,
      description: teamsTable.description,
      created_by: teamsTable.created_by,
      created_at: teamsTable.created_at,
      updated_at: teamsTable.updated_at
    })
      .from(teamsTable)
      .leftJoin(
        teamMembershipsTable,
        eq(teamsTable.id, teamMembershipsTable.team_id)
      )
      .where(
        or(
          // Teams created by the user
          eq(teamsTable.created_by, userId),
          // Teams where user is an active member
          and(
            eq(teamMembershipsTable.user_id, userId),
            eq(teamMembershipsTable.status, 'active')
          )
        )
      )
      .execute();

    // Remove duplicates (in case user is both creator and member)
    const uniqueTeams = new Map<number, Team>();
    
    for (const result of results) {
      if (!uniqueTeams.has(result.id)) {
        uniqueTeams.set(result.id, {
          id: result.id,
          name: result.name,
          description: result.description,
          created_by: result.created_by,
          created_at: result.created_at,
          updated_at: result.updated_at
        });
      }
    }

    return Array.from(uniqueTeams.values());
  } catch (error) {
    console.error('Failed to get user teams:', error);
    throw error;
  }
}