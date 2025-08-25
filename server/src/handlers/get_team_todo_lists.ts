import { db } from '../db';
import { todoListsTable } from '../db/schema';
import { type GetTeamTodoListsInput, type TodoList } from '../schema';
import { eq } from 'drizzle-orm';

export const getTeamTodoLists = async (input: GetTeamTodoListsInput): Promise<TodoList[]> => {
  try {
    // Fetch all todo lists for the specified team
    const results = await db.select()
      .from(todoListsTable)
      .where(eq(todoListsTable.team_id, input.team_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch team todo lists:', error);
    throw error;
  }
};