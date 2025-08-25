import { db } from '../db';
import { shoppingItemsTable, shoppingListsTable } from '../db/schema';
import { type CreateShoppingItemInput, type ShoppingItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function createShoppingItem(input: CreateShoppingItemInput, userId: number): Promise<ShoppingItem> {
  try {
    // Verify the shopping list exists before creating an item
    const shoppingList = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, input.shopping_list_id))
      .execute();

    if (shoppingList.length === 0) {
      throw new Error(`Shopping list with id ${input.shopping_list_id} not found`);
    }

    // Insert the shopping item record
    const result = await db.insert(shoppingItemsTable)
      .values({
        shopping_list_id: input.shopping_list_id,
        name: input.name,
        quantity: input.quantity, // Zod default of 1 is already applied
        comment: input.comment || null,
        created_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Shopping item creation failed:', error);
    throw error;
  }
}