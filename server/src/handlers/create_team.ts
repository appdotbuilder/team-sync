import { db } from '../db';
import { teamsTable, teamMembershipsTable } from '../db/schema';
import { type CreateTeamInput, type Team } from '../schema';

export async function createTeam(input: CreateTeamInput, userId: number): Promise<Team> {
  try {
    // Start a transaction to ensure both team creation and membership are created atomically
    const result = await db.transaction(async (tx) => {
      // Create the team
      const teamResult = await tx.insert(teamsTable)
        .values({
          name: input.name,
          description: input.description ?? null,
          created_by: userId
        })
        .returning()
        .execute();

      const team = teamResult[0];

      // Automatically add the creator as an active member
      await tx.insert(teamMembershipsTable)
        .values({
          team_id: team.id,
          user_id: userId,
          status: 'active',
          joined_at: new Date()
        })
        .execute();

      return team;
    });

    return result;
  } catch (error) {
    console.error('Team creation failed:', error);
    throw error;
  }
}