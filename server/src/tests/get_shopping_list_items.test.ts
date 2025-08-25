import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, shoppingListsTable, shoppingItemsTable } from '../db/schema';
import { type GetShoppingListItemsInput } from '../schema';
import { getShoppingListItems } from '../handlers/get_shopping_list_items';

describe('getShoppingListItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all items for a shopping list', async () => {
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
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create test shopping list
    const listResult = await db.insert(shoppingListsTable)
      .values({
        team_id: teamId,
        name: 'Test Shopping List',
        description: 'Test shopping list',
        created_by: userId
      })
      .returning()
      .execute();
    const shoppingListId = listResult[0].id;

    // Create test shopping items
    const item1Result = await db.insert(shoppingItemsTable)
      .values({
        shopping_list_id: shoppingListId,
        name: 'Milk',
        quantity: 2,
        comment: 'Organic if available',
        is_purchased: false,
        created_by: userId
      })
      .returning()
      .execute();

    const item2Result = await db.insert(shoppingItemsTable)
      .values({
        shopping_list_id: shoppingListId,
        name: 'Bread',
        quantity: 1,
        comment: null,
        is_purchased: true,
        purchased_by: userId,
        purchased_at: new Date(),
        created_by: userId
      })
      .returning()
      .execute();

    const input: GetShoppingListItemsInput = {
      shopping_list_id: shoppingListId
    };

    const result = await getShoppingListItems(input);

    expect(result).toHaveLength(2);

    // Check first item (Milk)
    const milkItem = result.find(item => item.name === 'Milk');
    expect(milkItem).toBeDefined();
    expect(milkItem!.shopping_list_id).toBe(shoppingListId);
    expect(milkItem!.quantity).toBe(2);
    expect(milkItem!.comment).toBe('Organic if available');
    expect(milkItem!.is_purchased).toBe(false);
    expect(milkItem!.purchased_by).toBeNull();
    expect(milkItem!.purchased_at).toBeNull();
    expect(milkItem!.created_by).toBe(userId);
    expect(milkItem!.id).toBe(item1Result[0].id);

    // Check second item (Bread)
    const breadItem = result.find(item => item.name === 'Bread');
    expect(breadItem).toBeDefined();
    expect(breadItem!.shopping_list_id).toBe(shoppingListId);
    expect(breadItem!.quantity).toBe(1);
    expect(breadItem!.comment).toBeNull();
    expect(breadItem!.is_purchased).toBe(true);
    expect(breadItem!.purchased_by).toBe(userId);
    expect(breadItem!.purchased_at).toBeInstanceOf(Date);
    expect(breadItem!.created_by).toBe(userId);
    expect(breadItem!.id).toBe(item2Result[0].id);

    // Check timestamps
    result.forEach(item => {
      expect(item.created_at).toBeInstanceOf(Date);
      expect(item.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when shopping list has no items', async () => {
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
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create test shopping list without items
    const listResult = await db.insert(shoppingListsTable)
      .values({
        team_id: teamId,
        name: 'Empty Shopping List',
        description: 'Empty shopping list',
        created_by: userId
      })
      .returning()
      .execute();
    const shoppingListId = listResult[0].id;

    const input: GetShoppingListItemsInput = {
      shopping_list_id: shoppingListId
    };

    const result = await getShoppingListItems(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent shopping list', async () => {
    const input: GetShoppingListItemsInput = {
      shopping_list_id: 99999 // Non-existent ID
    };

    const result = await getShoppingListItems(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should not return items from other shopping lists', async () => {
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
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create two shopping lists
    const list1Result = await db.insert(shoppingListsTable)
      .values({
        team_id: teamId,
        name: 'List 1',
        description: 'First list',
        created_by: userId
      })
      .returning()
      .execute();
    const list1Id = list1Result[0].id;

    const list2Result = await db.insert(shoppingListsTable)
      .values({
        team_id: teamId,
        name: 'List 2',
        description: 'Second list',
        created_by: userId
      })
      .returning()
      .execute();
    const list2Id = list2Result[0].id;

    // Add items to both lists
    await db.insert(shoppingItemsTable)
      .values({
        shopping_list_id: list1Id,
        name: 'Item from List 1',
        quantity: 1,
        created_by: userId
      })
      .execute();

    await db.insert(shoppingItemsTable)
      .values({
        shopping_list_id: list2Id,
        name: 'Item from List 2',
        quantity: 1,
        created_by: userId
      })
      .execute();

    // Query items from list 1
    const input: GetShoppingListItemsInput = {
      shopping_list_id: list1Id
    };

    const result = await getShoppingListItems(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Item from List 1');
    expect(result[0].shopping_list_id).toBe(list1Id);
  });

  it('should handle items with various purchase states', async () => {
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
    const userId = userResult[0].id;

    // Create another user for purchased_by field
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User 2',
        tier: 'paid',
        status: 'active'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create test shopping list
    const listResult = await db.insert(shoppingListsTable)
      .values({
        team_id: teamId,
        name: 'Mixed State List',
        description: 'List with various purchase states',
        created_by: userId
      })
      .returning()
      .execute();
    const shoppingListId = listResult[0].id;

    const purchaseTime = new Date();

    // Create items with different purchase states
    await db.insert(shoppingItemsTable)
      .values([
        {
          shopping_list_id: shoppingListId,
          name: 'Unpurchased Item',
          quantity: 3,
          comment: 'Still needed',
          is_purchased: false,
          created_by: userId
        },
        {
          shopping_list_id: shoppingListId,
          name: 'Purchased by Creator',
          quantity: 1,
          is_purchased: true,
          purchased_by: userId,
          purchased_at: purchaseTime,
          created_by: userId
        },
        {
          shopping_list_id: shoppingListId,
          name: 'Purchased by Other User',
          quantity: 2,
          comment: 'Got the good brand',
          is_purchased: true,
          purchased_by: user2Id,
          purchased_at: purchaseTime,
          created_by: userId
        }
      ])
      .execute();

    const input: GetShoppingListItemsInput = {
      shopping_list_id: shoppingListId
    };

    const result = await getShoppingListItems(input);

    expect(result).toHaveLength(3);

    // Check unpurchased item
    const unpurchased = result.find(item => item.name === 'Unpurchased Item');
    expect(unpurchased).toBeDefined();
    expect(unpurchased!.is_purchased).toBe(false);
    expect(unpurchased!.purchased_by).toBeNull();
    expect(unpurchased!.purchased_at).toBeNull();
    expect(unpurchased!.comment).toBe('Still needed');

    // Check item purchased by creator
    const purchasedByCreator = result.find(item => item.name === 'Purchased by Creator');
    expect(purchasedByCreator).toBeDefined();
    expect(purchasedByCreator!.is_purchased).toBe(true);
    expect(purchasedByCreator!.purchased_by).toBe(userId);
    expect(purchasedByCreator!.purchased_at).toBeInstanceOf(Date);

    // Check item purchased by other user
    const purchasedByOther = result.find(item => item.name === 'Purchased by Other User');
    expect(purchasedByOther).toBeDefined();
    expect(purchasedByOther!.is_purchased).toBe(true);
    expect(purchasedByOther!.purchased_by).toBe(user2Id);
    expect(purchasedByOther!.purchased_at).toBeInstanceOf(Date);
    expect(purchasedByOther!.comment).toBe('Got the good brand');
  });
});