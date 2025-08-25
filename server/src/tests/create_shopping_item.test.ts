import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, shoppingListsTable, shoppingItemsTable } from '../db/schema';
import { type CreateShoppingItemInput } from '../schema';
import { createShoppingItem } from '../handlers/create_shopping_item';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateShoppingItemInput = {
  shopping_list_id: 1,
  name: 'Test Item',
  quantity: 2,
  comment: 'Test comment'
};

describe('createShoppingItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let teamId: number;
  let shoppingListId: number;

  beforeEach(async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create prerequisite team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'Team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    teamId = teamResult[0].id;

    // Create prerequisite shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        team_id: teamId,
        name: 'Test Shopping List',
        description: 'List for testing',
        created_by: userId
      })
      .returning()
      .execute();
    shoppingListId = shoppingListResult[0].id;

    // Update test input with actual shopping list ID
    testInput.shopping_list_id = shoppingListId;
  });

  it('should create a shopping item with all fields', async () => {
    const result = await createShoppingItem(testInput, userId);

    // Basic field validation
    expect(result.name).toEqual('Test Item');
    expect(result.quantity).toEqual(2);
    expect(result.comment).toEqual('Test comment');
    expect(result.shopping_list_id).toEqual(shoppingListId);
    expect(result.created_by).toEqual(userId);
    expect(result.is_purchased).toEqual(false);
    expect(result.purchased_by).toBeNull();
    expect(result.purchased_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a shopping item with default quantity', async () => {
    const inputWithoutQuantity: CreateShoppingItemInput = {
      shopping_list_id: shoppingListId,
      name: 'Default Quantity Item',
      quantity: 1, // Explicitly provide the default value
      comment: null
    };

    const result = await createShoppingItem(inputWithoutQuantity, userId);

    expect(result.name).toEqual('Default Quantity Item');
    expect(result.quantity).toEqual(1); // Zod default
    expect(result.comment).toBeNull();
    expect(result.shopping_list_id).toEqual(shoppingListId);
    expect(result.created_by).toEqual(userId);
  });

  it('should create a shopping item without comment', async () => {
    const inputWithoutComment = {
      shopping_list_id: shoppingListId,
      name: 'No Comment Item',
      quantity: 3
    };

    const result = await createShoppingItem(inputWithoutComment, userId);

    expect(result.name).toEqual('No Comment Item');
    expect(result.quantity).toEqual(3);
    expect(result.comment).toBeNull();
    expect(result.shopping_list_id).toEqual(shoppingListId);
    expect(result.created_by).toEqual(userId);
  });

  it('should save shopping item to database', async () => {
    const result = await createShoppingItem(testInput, userId);

    // Query the database to verify the item was saved
    const items = await db.select()
      .from(shoppingItemsTable)
      .where(eq(shoppingItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Test Item');
    expect(items[0].quantity).toEqual(2);
    expect(items[0].comment).toEqual('Test comment');
    expect(items[0].shopping_list_id).toEqual(shoppingListId);
    expect(items[0].created_by).toEqual(userId);
    expect(items[0].is_purchased).toEqual(false);
    expect(items[0].purchased_by).toBeNull();
    expect(items[0].purchased_at).toBeNull();
    expect(items[0].created_at).toBeInstanceOf(Date);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when shopping list does not exist', async () => {
    const invalidInput = {
      shopping_list_id: 99999, // Non-existent shopping list ID
      name: 'Invalid Item',
      quantity: 1,
      comment: null
    };

    await expect(createShoppingItem(invalidInput, userId))
      .rejects
      .toThrow(/Shopping list with id 99999 not found/i);
  });

  it('should handle multiple items in the same shopping list', async () => {
    const firstItem = await createShoppingItem({
      shopping_list_id: shoppingListId,
      name: 'First Item',
      quantity: 1,
      comment: 'First comment'
    }, userId);

    const secondItem = await createShoppingItem({
      shopping_list_id: shoppingListId,
      name: 'Second Item',
      quantity: 5,
      comment: null
    }, userId);

    // Both items should be created successfully
    expect(firstItem.id).toBeDefined();
    expect(secondItem.id).toBeDefined();
    expect(firstItem.id).not.toEqual(secondItem.id);

    // Verify both items exist in database
    const allItems = await db.select()
      .from(shoppingItemsTable)
      .where(eq(shoppingItemsTable.shopping_list_id, shoppingListId))
      .execute();

    expect(allItems).toHaveLength(2);
    
    const itemNames = allItems.map(item => item.name).sort();
    expect(itemNames).toEqual(['First Item', 'Second Item']);
  });

  it('should create item with minimum required fields only', async () => {
    const minimalInput: CreateShoppingItemInput = {
      shopping_list_id: shoppingListId,
      name: 'Minimal Item',
      quantity: 1 // Explicitly provide the default value
    };

    const result = await createShoppingItem(minimalInput, userId);

    expect(result.name).toEqual('Minimal Item');
    expect(result.quantity).toEqual(1); // Zod default
    expect(result.comment).toBeNull();
    expect(result.shopping_list_id).toEqual(shoppingListId);
    expect(result.created_by).toEqual(userId);
    expect(result.is_purchased).toEqual(false);
    expect(result.purchased_by).toBeNull();
    expect(result.purchased_at).toBeNull();
  });
});