import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free',
  status: 'active'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.tier).toEqual('free');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with default values applied by Zod', async () => {
    const minimalInput: CreateUserInput = {
      email: 'minimal@example.com',
      name: 'Minimal User',
      tier: 'free', // Zod default applied
      status: 'active' // Zod default applied
    };

    const result = await createUser(minimalInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.name).toEqual('Minimal User');
    expect(result.tier).toEqual('free');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
  });

  it('should create a paid user', async () => {
    const paidUserInput: CreateUserInput = {
      email: 'paid@example.com',
      name: 'Paid User',
      tier: 'paid',
      status: 'active'
    };

    const result = await createUser(paidUserInput);

    expect(result.email).toEqual('paid@example.com');
    expect(result.name).toEqual('Paid User');
    expect(result.tier).toEqual('paid');
    expect(result.status).toEqual('active');
  });

  it('should create an inactive user', async () => {
    const inactiveUserInput: CreateUserInput = {
      email: 'inactive@example.com',
      name: 'Inactive User',
      tier: 'free',
      status: 'inactive'
    };

    const result = await createUser(inactiveUserInput);

    expect(result.email).toEqual('inactive@example.com');
    expect(result.status).toEqual('inactive');
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].tier).toEqual('free');
    expect(users[0].status).toEqual('active');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create duplicate user
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      name: 'Another User',
      tier: 'free',
      status: 'active'
    };

    await expect(createUser(duplicateInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      name: 'User One',
      tier: 'free',
      status: 'active'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      name: 'User Two',
      tier: 'paid',
      status: 'inactive'
    };

    const result1 = await createUser(user1Input);
    const result2 = await createUser(user2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.email).toEqual('user1@example.com');
    expect(result2.email).toEqual('user2@example.com');
    expect(result1.tier).toEqual('free');
    expect(result2.tier).toEqual('paid');
    expect(result1.status).toEqual('active');
    expect(result2.status).toEqual('inactive');
  });

  it('should handle all user status types', async () => {
    const statusTests = [
      { status: 'active' as const, email: 'active@example.com' },
      { status: 'inactive' as const, email: 'inactive@example.com' },
      { status: 'suspended' as const, email: 'suspended@example.com' }
    ];

    for (const statusTest of statusTests) {
      const input: CreateUserInput = {
        email: statusTest.email,
        name: 'Status Test User',
        tier: 'free',
        status: statusTest.status
      };

      const result = await createUser(input);
      expect(result.status).toEqual(statusTest.status);
    }
  });

  it('should handle all user tier types', async () => {
    const tierTests = [
      { tier: 'free' as const, email: 'free@example.com' },
      { tier: 'paid' as const, email: 'paid@example.com' }
    ];

    for (const tierTest of tierTests) {
      const input: CreateUserInput = {
        email: tierTest.email,
        name: 'Tier Test User',
        tier: tierTest.tier,
        status: 'active'
      };

      const result = await createUser(input);
      expect(result.tier).toEqual(tierTest.tier);
    }
  });
});