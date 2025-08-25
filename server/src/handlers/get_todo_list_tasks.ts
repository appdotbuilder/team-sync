import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetTodoListTasksInput, type Task } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTodoListTasks = async (input: GetTodoListTasksInput): Promise<Task[]> => {
  try {
    // Query tasks by todo_list_id, ordered by created_at desc
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.todo_list_id, input.todo_list_id))
      .orderBy(desc(tasksTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch todo list tasks:', error);
    throw error;
  }
};