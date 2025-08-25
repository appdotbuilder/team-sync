import { db } from '../db';
import { shoppingItemsTable } from '../db/schema';
import { type UpdateShoppingItemInput, type ShoppingItem } from '../schema';
import { eq } from 'drizzle-orm';

export const updateShoppingItem = async (input: UpdateShoppingItemInput, userId: number): Promise<ShoppingItem> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.quantity !== undefined) {
      updateData.quantity = input.quantity;
    }

    if (input.comment !== undefined) {
      updateData.comment = input.comment;
    }

    if (input.is_purchased !== undefined) {
      updateData.is_purchased = input.is_purchased;
      
      // When marking as purchased, set purchased_by and purchased_at
      if (input.is_purchased) {
        updateData.purchased_by = userId;
        updateData.purchased_at = new Date();
      } else {
        // When unmarking as purchased, clear purchased_by and purchased_at
        updateData.purchased_by = null;
        updateData.purchased_at = null;
      }
    }

    // Update the shopping item
    const result = await db.update(shoppingItemsTable)
      .set(updateData)
      .where(eq(shoppingItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Shopping item with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Shopping item update failed:', error);
    throw error;
  }
};