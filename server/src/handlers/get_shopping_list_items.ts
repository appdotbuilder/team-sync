import { db } from '../db';
import { shoppingItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetShoppingListItemsInput, type ShoppingItem } from '../schema';

export const getShoppingListItems = async (input: GetShoppingListItemsInput): Promise<ShoppingItem[]> => {
  try {
    const results = await db.select()
      .from(shoppingItemsTable)
      .where(eq(shoppingItemsTable.shopping_list_id, input.shopping_list_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch shopping list items:', error);
    throw error;
  }
};