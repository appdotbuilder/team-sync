import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
  try {
    // Build the update object dynamically
    const updateData: any = {
      updated_at: new Date()
    };

    // Only include fields that are provided in the input
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
      // Set completed_at timestamp when status changes to completed
      if (input.status === 'completed') {
        updateData.completed_at = new Date();
      } else {
        // Clear completed_at if status is changed away from completed
        updateData.completed_at = null;
      }
    }
    if (input.assigned_to !== undefined) {
      updateData.assigned_to = input.assigned_to;
    }
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};