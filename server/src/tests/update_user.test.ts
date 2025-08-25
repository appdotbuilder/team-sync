import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should update user email', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'newemail@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('newemail@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.tier).toEqual('free');
    expect(result.status).toEqual('active');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user name', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual('test@example.com');
    expect(result.tier).toEqual('free');
    expect(result.status).toEqual('active');
  });

  it('should update user tier', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      tier: 'paid'
    };

    const result = await updateUser(updateInput);

    expect(result.tier).toEqual('paid');
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.status).toEqual('active');
  });

  it('should update user status', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      status: 'suspended'
    };

    const result = await updateUser(updateInput);

    expect(result.status).toEqual('suspended');
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.tier).toEqual('free');
  });

  it('should update multiple fields at once', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'multi@example.com',
      name: 'Multi Update',
      tier: 'paid',
      status: 'inactive'
    };

    const result = await updateUser(updateInput);

    expect(result.email).toEqual('multi@example.com');
    expect(result.name).toEqual('Multi Update');
    expect(result.tier).toEqual('paid');
    expect(result.status).toEqual('inactive');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated user to database', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'saved@example.com',
      name: 'Saved User'
    };

    const result = await updateUser(updateInput);

    // Query database to verify changes were persisted
    const savedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(savedUsers).toHaveLength(1);
    expect(savedUsers[0].email).toEqual('saved@example.com');
    expect(savedUsers[0].name).toEqual('Saved User');
    expect(savedUsers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should preserve unchanged fields', async () => {
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      name: 'Only Name Changed'
    };

    const result = await updateUser(updateInput);

    expect(result.name).toEqual('Only Name Changed');
    expect(result.email).toEqual(testUser.email);
    expect(result.tier).toEqual(testUser.tier);
    expect(result.status).toEqual(testUser.status);
    expect(result.created_at).toEqual(testUser.created_at);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      name: 'Non-existent User'
    };

    expect(async () => await updateUser(updateInput))
      .toThrow(/User with id 99999 not found/i);
  });

  it('should handle all valid tier values', async () => {
    const testUser = await createTestUser();

    // Test 'free' tier
    let updateInput: UpdateUserInput = {
      id: testUser.id,
      tier: 'free'
    };

    let result = await updateUser(updateInput);
    expect(result.tier).toEqual('free');

    // Test 'paid' tier
    updateInput = {
      id: testUser.id,
      tier: 'paid'
    };

    result = await updateUser(updateInput);
    expect(result.tier).toEqual('paid');
  });

  it('should handle all valid status values', async () => {
    const testUser = await createTestUser();

    // Test each status
    const statuses = ['active', 'inactive', 'suspended'] as const;

    for (const status of statuses) {
      const updateInput: UpdateUserInput = {
        id: testUser.id,
        status: status
      };

      const result = await updateUser(updateInput);
      expect(result.status).toEqual(status);
    }
  });
});