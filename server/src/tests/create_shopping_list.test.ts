import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembershipsTable, shoppingListsTable } from '../db/schema';
import { type CreateShoppingListInput } from '../schema';
import { createShoppingList } from '../handlers/create_shopping_list';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'user@example.com',
  name: 'Test User',
  tier: 'free' as const,
  status: 'active' as const
};

const testTeam = {
  name: 'Test Team',
  description: 'A test team'
};

const testInput: CreateShoppingListInput = {
  team_id: 1, // Will be updated with actual team_id
  name: 'Grocery List',
  description: 'Weekly grocery shopping'
};

describe('createShoppingList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a shopping list successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create active membership
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: userId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const input = { ...testInput, team_id: teamId };
    const result = await createShoppingList(input, userId);

    // Validate basic fields
    expect(result.id).toBeDefined();
    expect(result.team_id).toEqual(teamId);
    expect(result.name).toEqual('Grocery List');
    expect(result.description).toEqual('Weekly grocery shopping');
    expect(result.created_by).toEqual(userId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create shopping list with null description', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create active membership
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: userId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const input: CreateShoppingListInput = {
      team_id: teamId,
      name: 'Simple List'
    };

    const result = await createShoppingList(input, userId);

    expect(result.name).toEqual('Simple List');
    expect(result.description).toBeNull();
  });

  it('should save shopping list to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create active membership
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: userId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const input = { ...testInput, team_id: teamId };
    const result = await createShoppingList(input, userId);

    // Query database to verify the shopping list was saved
    const shoppingLists = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, result.id))
      .execute();

    expect(shoppingLists).toHaveLength(1);
    expect(shoppingLists[0].name).toEqual('Grocery List');
    expect(shoppingLists[0].description).toEqual('Weekly grocery shopping');
    expect(shoppingLists[0].team_id).toEqual(teamId);
    expect(shoppingLists[0].created_by).toEqual(userId);
    expect(shoppingLists[0].created_at).toBeInstanceOf(Date);
    expect(shoppingLists[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when team does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input = { ...testInput, team_id: 9999 }; // Non-existent team

    await expect(createShoppingList(input, userId)).rejects.toThrow(/Team with id 9999 does not exist/i);
  });

  it('should throw error when user is not a team member', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com',
        name: 'User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create test team (user1 creates the team)
    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: user1Id
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Only user1 is a member, user2 tries to create shopping list
    const input = { ...testInput, team_id: teamId };

    await expect(createShoppingList(input, user2Id)).rejects.toThrow(/User \d+ is not an active member of team \d+/i);
  });

  it('should throw error when user has pending membership', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create another user as team owner
    const ownerResult = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'owner@example.com',
        name: 'Team Owner'
      })
      .returning()
      .execute();
    const ownerId = ownerResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: ownerId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create pending membership (not active)
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: userId,
        status: 'pending' // Not active
      })
      .execute();

    const input = { ...testInput, team_id: teamId };

    await expect(createShoppingList(input, userId)).rejects.toThrow(/User \d+ is not an active member of team \d+/i);
  });

  it('should allow team creator to create shopping lists', async () => {
    // Create test user (team creator)
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Team creator should have active membership
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: userId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const input = { ...testInput, team_id: teamId };
    const result = await createShoppingList(input, userId);

    expect(result.team_id).toEqual(teamId);
    expect(result.created_by).toEqual(userId);
    expect(result.name).toEqual('Grocery List');
  });
});