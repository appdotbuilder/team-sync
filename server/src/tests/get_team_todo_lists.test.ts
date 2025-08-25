import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, todoListsTable } from '../db/schema';
import { type GetTeamTodoListsInput } from '../schema';
import { getTeamTodoLists } from '../handlers/get_team_todo_lists';
import { eq } from 'drizzle-orm';

describe('getTeamTodoLists', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when team has no todo lists', async () => {
    // Create a user first
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

    // Create a team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();

    const team = teamResult[0];

    const input: GetTeamTodoListsInput = {
      team_id: team.id
    };

    const result = await getTeamTodoLists(input);

    expect(result).toEqual([]);
  });

  it('should return todo lists for a specific team', async () => {
    // Create a user
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

    // Create a team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();

    const team = teamResult[0];

    // Create todo lists for this team
    const todoList1Result = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'First Todo List',
        description: 'First list description',
        created_by: user.id
      })
      .returning()
      .execute();

    const todoList2Result = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Second Todo List',
        description: 'Second list description',
        created_by: user.id
      })
      .returning()
      .execute();

    const input: GetTeamTodoListsInput = {
      team_id: team.id
    };

    const result = await getTeamTodoLists(input);

    expect(result).toHaveLength(2);
    expect(result.map(list => list.name).sort()).toEqual(['First Todo List', 'Second Todo List']);
    expect(result[0].team_id).toEqual(team.id);
    expect(result[1].team_id).toEqual(team.id);
    expect(result[0].created_by).toEqual(user.id);
    expect(result[1].created_by).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only return todo lists for the specified team', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        tier: 'paid',
        status: 'active'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create two teams
    const team1Result = await db.insert(teamsTable)
      .values({
        name: 'Team One',
        description: 'First team',
        created_by: user1.id
      })
      .returning()
      .execute();

    const team2Result = await db.insert(teamsTable)
      .values({
        name: 'Team Two',
        description: 'Second team',
        created_by: user2.id
      })
      .returning()
      .execute();

    const team1 = team1Result[0];
    const team2 = team2Result[0];

    // Create todo lists for both teams
    await db.insert(todoListsTable)
      .values({
        team_id: team1.id,
        name: 'Team 1 List',
        description: 'List for team 1',
        created_by: user1.id
      })
      .execute();

    await db.insert(todoListsTable)
      .values({
        team_id: team2.id,
        name: 'Team 2 List',
        description: 'List for team 2',
        created_by: user2.id
      })
      .execute();

    const input: GetTeamTodoListsInput = {
      team_id: team1.id
    };

    const result = await getTeamTodoLists(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Team 1 List');
    expect(result[0].team_id).toEqual(team1.id);
    expect(result[0].created_by).toEqual(user1.id);
  });

  it('should handle null descriptions correctly', async () => {
    // Create a user
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

    // Create a team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();

    const team = teamResult[0];

    // Create todo list with null description
    await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'List Without Description',
        description: null,
        created_by: user.id
      })
      .execute();

    const input: GetTeamTodoListsInput = {
      team_id: team.id
    };

    const result = await getTeamTodoLists(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('List Without Description');
    expect(result[0].description).toBeNull();
  });

  it('should verify todo lists are saved to database', async () => {
    // Create a user
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

    // Create a team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user.id
      })
      .returning()
      .execute();

    const team = teamResult[0];

    // Create a todo list
    const todoListResult = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Verification List',
        description: 'List for verification',
        created_by: user.id
      })
      .returning()
      .execute();

    const createdList = todoListResult[0];

    // Fetch through handler
    const input: GetTeamTodoListsInput = {
      team_id: team.id
    };

    const handlerResult = await getTeamTodoLists(input);

    // Verify by direct database query
    const dbResult = await db.select()
      .from(todoListsTable)
      .where(eq(todoListsTable.id, createdList.id))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbResult).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(dbResult[0].id);
    expect(handlerResult[0].name).toEqual(dbResult[0].name);
    expect(handlerResult[0].team_id).toEqual(dbResult[0].team_id);
  });
});