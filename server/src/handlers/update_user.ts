import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Check if user exists first
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.tier !== undefined) {
      updateData.tier = input.tier;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};