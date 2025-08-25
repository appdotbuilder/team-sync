import { db } from '../db';
import { shoppingListsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetTeamShoppingListsInput, type ShoppingList } from '../schema';

export const getTeamShoppingLists = async (input: GetTeamShoppingListsInput): Promise<ShoppingList[]> => {
  try {
    // Fetch all shopping lists for the specified team
    const results = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.team_id, input.team_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Get team shopping lists failed:', error);
    throw error;
  }
};