import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, shoppingListsTable } from '../db/schema';
import { type GetTeamShoppingListsInput } from '../schema';
import { getTeamShoppingLists } from '../handlers/get_team_shopping_lists';
import { eq } from 'drizzle-orm';

describe('getTeamShoppingLists', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all shopping lists for a team', async () => {
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
    const user = userResult[0];

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    // Create multiple shopping lists for the team
    const list1Result = await db.insert(shoppingListsTable)
      .values({
        team_id: team.id,
        name: 'Grocery List',
        description: 'Weekly groceries',
        created_by: user.id
      })
      .returning()
      .execute();

    const list2Result = await db.insert(shoppingListsTable)
      .values({
        team_id: team.id,
        name: 'Hardware Store',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();

    const input: GetTeamShoppingListsInput = {
      team_id: team.id
    };

    const result = await getTeamShoppingLists(input);

    expect(result).toHaveLength(2);
    
    // Verify both lists are returned
    const listNames = result.map(list => list.name).sort();
    expect(listNames).toEqual(['Grocery List', 'Hardware Store']);

    // Verify list details
    const groceryList = result.find(list => list.name === 'Grocery List');
    expect(groceryList).toBeDefined();
    expect(groceryList!.team_id).toBe(team.id);
    expect(groceryList!.description).toBe('Weekly groceries');
    expect(groceryList!.created_by).toBe(user.id);
    expect(groceryList!.id).toBe(list1Result[0].id);
    expect(groceryList!.created_at).toBeInstanceOf(Date);
    expect(groceryList!.updated_at).toBeInstanceOf(Date);

    const hardwareList = result.find(list => list.name === 'Hardware Store');
    expect(hardwareList).toBeDefined();
    expect(hardwareList!.team_id).toBe(team.id);
    expect(hardwareList!.description).toBeNull();
    expect(hardwareList!.created_by).toBe(user.id);
    expect(hardwareList!.id).toBe(list2Result[0].id);
  });

  it('should return empty array when team has no shopping lists', async () => {
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
    const user = userResult[0];

    // Create test team with no shopping lists
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Empty Team',
        description: 'A team with no lists',
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    const input: GetTeamShoppingListsInput = {
      team_id: team.id
    };

    const result = await getTeamShoppingLists(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return shopping lists for the specified team', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        tier: 'paid',
        status: 'active'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create two different teams
    const team1Result = await db.insert(teamsTable)
      .values({
        name: 'Team One',
        description: 'First team',
        created_by: user1.id
      })
      .returning()
      .execute();
    const team1 = team1Result[0];

    const team2Result = await db.insert(teamsTable)
      .values({
        name: 'Team Two',
        description: 'Second team',
        created_by: user2.id
      })
      .returning()
      .execute();
    const team2 = team2Result[0];

    // Create shopping lists for both teams
    await db.insert(shoppingListsTable)
      .values({
        team_id: team1.id,
        name: 'Team 1 List',
        description: 'List for team 1',
        created_by: user1.id
      })
      .execute();

    await db.insert(shoppingListsTable)
      .values({
        team_id: team2.id,
        name: 'Team 2 List',
        description: 'List for team 2',
        created_by: user2.id
      })
      .execute();

    // Query for team 1's shopping lists
    const input: GetTeamShoppingListsInput = {
      team_id: team1.id
    };

    const result = await getTeamShoppingLists(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Team 1 List');
    expect(result[0].team_id).toBe(team1.id);
    expect(result[0].description).toBe('List for team 1');
  });

  it('should return empty array for non-existent team', async () => {
    const input: GetTeamShoppingListsInput = {
      team_id: 999999 // Non-existent team ID
    };

    const result = await getTeamShoppingLists(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle multiple shopping lists with same name in same team', async () => {
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
    const user = userResult[0];

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    // Create multiple shopping lists with same name (different descriptions)
    await db.insert(shoppingListsTable)
      .values({
        team_id: team.id,
        name: 'Shopping List',
        description: 'First list',
        created_by: user.id
      })
      .execute();

    await db.insert(shoppingListsTable)
      .values({
        team_id: team.id,
        name: 'Shopping List',
        description: 'Second list',
        created_by: user.id
      })
      .execute();

    const input: GetTeamShoppingListsInput = {
      team_id: team.id
    };

    const result = await getTeamShoppingLists(input);

    expect(result).toHaveLength(2);
    expect(result.every(list => list.name === 'Shopping List')).toBe(true);
    expect(result.every(list => list.team_id === team.id)).toBe(true);
    
    // Verify descriptions are different
    const descriptions = result.map(list => list.description).sort();
    expect(descriptions).toEqual(['First list', 'Second list']);
  });

  it('should verify shopping lists are saved to database correctly', async () => {
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
    const user = userResult[0];

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    // Create shopping list
    const listResult = await db.insert(shoppingListsTable)
      .values({
        team_id: team.id,
        name: 'Test List',
        description: 'Test description',
        created_by: user.id
      })
      .returning()
      .execute();
    const createdList = listResult[0];

    // Use handler to fetch lists
    const input: GetTeamShoppingListsInput = {
      team_id: team.id
    };

    const handlerResult = await getTeamShoppingLists(input);

    // Verify direct database query returns same data
    const dbResult = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, createdList.id))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbResult).toHaveLength(1);
    expect(handlerResult[0].id).toBe(dbResult[0].id);
    expect(handlerResult[0].name).toBe(dbResult[0].name);
    expect(handlerResult[0].description).toBe(dbResult[0].description);
    expect(handlerResult[0].team_id).toBe(dbResult[0].team_id);
    expect(handlerResult[0].created_by).toBe(dbResult[0].created_by);
    expect(handlerResult[0].created_at).toEqual(dbResult[0].created_at);
    expect(handlerResult[0].updated_at).toEqual(dbResult[0].updated_at);
  });
});