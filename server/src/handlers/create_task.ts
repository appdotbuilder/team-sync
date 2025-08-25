import { db } from '../db';
import { tasksTable, todoListsTable, usersTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTask(input: CreateTaskInput, userId: number): Promise<Task> {
  try {
    // Verify the todo list exists
    const todoList = await db.select()
      .from(todoListsTable)
      .where(eq(todoListsTable.id, input.todo_list_id))
      .execute();

    if (todoList.length === 0) {
      throw new Error(`Todo list with ID ${input.todo_list_id} not found`);
    }

    // If assigned_to is provided, verify the user exists
    if (input.assigned_to) {
      const assignedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.assigned_to))
        .execute();

      if (assignedUser.length === 0) {
        throw new Error(`User with ID ${input.assigned_to} not found`);
      }
    }

    // Insert the task
    const result = await db.insert(tasksTable)
      .values({
        todo_list_id: input.todo_list_id,
        title: input.title,
        description: input.description || null,
        priority: input.priority || null,
        status: 'todo', // Default status
        assigned_to: input.assigned_to || null,
        due_date: input.due_date || null,
        completed_at: null,
        created_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}