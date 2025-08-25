import { db } from '../db';
import { todoListsTable } from '../db/schema';
import { type CreateTodoListInput, type TodoList } from '../schema';

export const createTodoList = async (input: CreateTodoListInput, userId: number): Promise<TodoList> => {
  try {
    // Insert todo list record
    const result = await db.insert(todoListsTable)
      .values({
        team_id: input.team_id,
        name: input.name,
        description: input.description || null,
        created_by: userId
      })
      .returning()
      .execute();

    const todoList = result[0];
    return todoList;
  } catch (error) {
    console.error('Todo list creation failed:', error);
    throw error;
  }
};