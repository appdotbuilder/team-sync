import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, todoListsTable } from '../db/schema';
import { type CreateTodoListInput } from '../schema';
import { createTodoList } from '../handlers/create_todo_list';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free' as const,
  status: 'active' as const
};

const testTeam = {
  name: 'Test Team',
  description: 'A team for testing'
};

const testInput: CreateTodoListInput = {
  team_id: 1, // Will be replaced with actual team ID
  name: 'Weekly Sprint Tasks',
  description: 'Tasks for this week\'s sprint'
};

describe('createTodoList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a todo list', async () => {
    // Create prerequisite user and team
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create todo list
    const input = { ...testInput, team_id: teamId };
    const result = await createTodoList(input, userId);

    // Basic field validation
    expect(result.name).toEqual('Weekly Sprint Tasks');
    expect(result.description).toEqual('Tasks for this week\'s sprint');
    expect(result.team_id).toEqual(teamId);
    expect(result.created_by).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save todo list to database', async () => {
    // Create prerequisite user and team
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create todo list
    const input = { ...testInput, team_id: teamId };
    const result = await createTodoList(input, userId);

    // Query database to verify todo list was saved
    const todoLists = await db.select()
      .from(todoListsTable)
      .where(eq(todoListsTable.id, result.id))
      .execute();

    expect(todoLists).toHaveLength(1);
    expect(todoLists[0].name).toEqual('Weekly Sprint Tasks');
    expect(todoLists[0].description).toEqual('Tasks for this week\'s sprint');
    expect(todoLists[0].team_id).toEqual(teamId);
    expect(todoLists[0].created_by).toEqual(userId);
    expect(todoLists[0].created_at).toBeInstanceOf(Date);
    expect(todoLists[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle optional description', async () => {
    // Create prerequisite user and team
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create todo list without description
    const input: CreateTodoListInput = {
      team_id: teamId,
      name: 'Simple List'
    };
    const result = await createTodoList(input, userId);

    expect(result.name).toEqual('Simple List');
    expect(result.description).toBeNull();
    expect(result.team_id).toEqual(teamId);
    expect(result.created_by).toEqual(userId);
  });

  it('should throw error for invalid team_id', async () => {
    // Create prerequisite user only
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to create todo list with non-existent team
    const input = { ...testInput, team_id: 999 };

    await expect(createTodoList(input, userId)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for invalid created_by user', async () => {
    // Create prerequisite team without user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teamResult = await db.insert(teamsTable)
      .values({
        ...testTeam,
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Try to create todo list with non-existent user
    const input = { ...testInput, team_id: teamId };

    await expect(createTodoList(input, 999)).rejects.toThrow(/violates foreign key constraint/i);
  });
});