import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, shoppingListsTable, shoppingItemsTable } from '../db/schema';
import { type UpdateShoppingItemInput } from '../schema';
import { updateShoppingItem } from '../handlers/update_shopping_item';
import { eq } from 'drizzle-orm';

describe('updateShoppingItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number; email: string; name: string };
  let testTeam: { id: number; name: string; created_by: number };
  let testShoppingList: { id: number; name: string; team_id: number; created_by: number };
  let testShoppingItem: { id: number; name: string; quantity: number; shopping_list_id: number; created_by: number };

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: testUser.id
      })
      .returning()
      .execute();
    testTeam = teamResult[0];

    // Create test shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: 'Test Shopping List',
        description: 'A list for testing',
        team_id: testTeam.id,
        created_by: testUser.id
      })
      .returning()
      .execute();
    testShoppingList = shoppingListResult[0];

    // Create test shopping item
    const shoppingItemResult = await db.insert(shoppingItemsTable)
      .values({
        name: 'Test Item',
        quantity: 2,
        comment: 'Original comment',
        shopping_list_id: testShoppingList.id,
        created_by: testUser.id
      })
      .returning()
      .execute();
    testShoppingItem = shoppingItemResult[0];
  });

  it('should update shopping item name', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      name: 'Updated Item Name'
    };

    const result = await updateShoppingItem(input, testUser.id);

    expect(result.id).toEqual(testShoppingItem.id);
    expect(result.name).toEqual('Updated Item Name');
    expect(result.quantity).toEqual(2); // Unchanged
    expect(result.comment).toEqual('Original comment'); // Unchanged
    expect(result.is_purchased).toBe(false); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update shopping item quantity', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      quantity: 5
    };

    const result = await updateShoppingItem(input, testUser.id);

    expect(result.id).toEqual(testShoppingItem.id);
    expect(result.name).toEqual('Test Item'); // Unchanged
    expect(result.quantity).toEqual(5);
    expect(result.comment).toEqual('Original comment'); // Unchanged
    expect(result.is_purchased).toBe(false); // Unchanged
  });

  it('should update shopping item comment', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      comment: 'Updated comment'
    };

    const result = await updateShoppingItem(input, testUser.id);

    expect(result.id).toEqual(testShoppingItem.id);
    expect(result.name).toEqual('Test Item'); // Unchanged
    expect(result.quantity).toEqual(2); // Unchanged
    expect(result.comment).toEqual('Updated comment');
    expect(result.is_purchased).toBe(false); // Unchanged
  });

  it('should clear comment when set to null', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      comment: null
    };

    const result = await updateShoppingItem(input, testUser.id);

    expect(result.comment).toBeNull();
  });

  it('should mark item as purchased and set purchased_by and purchased_at', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      is_purchased: true
    };

    const beforeTime = new Date();
    const result = await updateShoppingItem(input, testUser.id);
    const afterTime = new Date();

    expect(result.is_purchased).toBe(true);
    expect(result.purchased_by).toEqual(testUser.id);
    expect(result.purchased_at).toBeInstanceOf(Date);
    expect(result.purchased_at!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(result.purchased_at!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('should unmark item as purchased and clear purchased_by and purchased_at', async () => {
    // First mark as purchased
    await db.update(shoppingItemsTable)
      .set({
        is_purchased: true,
        purchased_by: testUser.id,
        purchased_at: new Date()
      })
      .where(eq(shoppingItemsTable.id, testShoppingItem.id))
      .execute();

    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      is_purchased: false
    };

    const result = await updateShoppingItem(input, testUser.id);

    expect(result.is_purchased).toBe(false);
    expect(result.purchased_by).toBeNull();
    expect(result.purchased_at).toBeNull();
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      name: 'Multi-updated Item',
      quantity: 10,
      comment: 'Multi-updated comment',
      is_purchased: true
    };

    const result = await updateShoppingItem(input, testUser.id);

    expect(result.name).toEqual('Multi-updated Item');
    expect(result.quantity).toEqual(10);
    expect(result.comment).toEqual('Multi-updated comment');
    expect(result.is_purchased).toBe(true);
    expect(result.purchased_by).toEqual(testUser.id);
    expect(result.purchased_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      name: 'Database Test Item',
      quantity: 7,
      is_purchased: true
    };

    await updateShoppingItem(input, testUser.id);

    // Verify changes were saved to database
    const items = await db.select()
      .from(shoppingItemsTable)
      .where(eq(shoppingItemsTable.id, testShoppingItem.id))
      .execute();

    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.name).toEqual('Database Test Item');
    expect(item.quantity).toEqual(7);
    expect(item.is_purchased).toBe(true);
    expect(item.purchased_by).toEqual(testUser.id);
    expect(item.purchased_at).toBeInstanceOf(Date);
    expect(item.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when shopping item does not exist', async () => {
    const input: UpdateShoppingItemInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Item'
    };

    await expect(updateShoppingItem(input, testUser.id))
      .rejects
      .toThrow(/Shopping item with id 99999 not found/i);
  });

  it('should preserve existing fields when only updating one field', async () => {
    // First mark item as purchased by another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        name: 'Other User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const otherUserId = anotherUserResult[0].id;

    await db.update(shoppingItemsTable)
      .set({
        is_purchased: true,
        purchased_by: otherUserId,
        purchased_at: new Date('2024-01-01T00:00:00Z')
      })
      .where(eq(shoppingItemsTable.id, testShoppingItem.id))
      .execute();

    // Update only the name
    const input: UpdateShoppingItemInput = {
      id: testShoppingItem.id,
      name: 'Just Name Change'
    };

    const result = await updateShoppingItem(input, testUser.id);

    // Name should change, but purchase status should remain unchanged
    expect(result.name).toEqual('Just Name Change');
    expect(result.is_purchased).toBe(true);
    expect(result.purchased_by).toEqual(otherUserId); // Should remain the original purchaser
    expect(result.purchased_at).toEqual(new Date('2024-01-01T00:00:00Z'));
  });
});