import { db } from '../db';
import { shoppingListsTable, teamsTable, teamMembershipsTable } from '../db/schema';
import { type CreateShoppingListInput, type ShoppingList } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createShoppingList = async (input: CreateShoppingListInput, userId: number): Promise<ShoppingList> => {
  try {
    // First, verify the team exists
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, input.team_id))
      .execute();

    if (team.length === 0) {
      throw new Error(`Team with id ${input.team_id} does not exist`);
    }

    // Verify user has access to the team (is an active member)
    const membership = await db.select()
      .from(teamMembershipsTable)
      .where(
        and(
          eq(teamMembershipsTable.team_id, input.team_id),
          eq(teamMembershipsTable.user_id, userId),
          eq(teamMembershipsTable.status, 'active')
        )
      )
      .execute();

    if (membership.length === 0) {
      throw new Error(`User ${userId} is not an active member of team ${input.team_id}`);
    }

    // Insert the shopping list record
    const result = await db.insert(shoppingListsTable)
      .values({
        team_id: input.team_id,
        name: input.name,
        description: input.description || null,
        created_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Shopping list creation failed:', error);
    throw error;
  }
};