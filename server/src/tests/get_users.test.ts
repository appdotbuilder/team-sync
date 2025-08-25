import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user inputs
const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  name: 'John Doe',
  tier: 'free',
  status: 'active'
};

const testUser2: CreateUserInput = {
  email: 'user2@example.com',
  name: 'Jane Smith',
  tier: 'paid',
  status: 'inactive'
};

const testUser3: CreateUserInput = {
  email: 'user3@example.com',
  name: 'Bob Wilson',
  tier: 'paid',
  status: 'suspended'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it('should return all users when users exist', async () => {
    // Create test users
    await db.insert(usersTable).values([
      testUser1,
      testUser2,
      testUser3
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const emails = result.map(user => user.email);
    expect(emails).toContain('user1@example.com');
    expect(emails).toContain('user2@example.com');
    expect(emails).toContain('user3@example.com');

    // Verify user properties are correctly returned
    const user1 = result.find(u => u.email === 'user1@example.com');
    expect(user1).toBeDefined();
    expect(user1?.name).toEqual('John Doe');
    expect(user1?.tier).toEqual('free');
    expect(user1?.status).toEqual('active');
    expect(user1?.id).toBeDefined();
    expect(user1?.created_at).toBeInstanceOf(Date);
    expect(user1?.updated_at).toBeInstanceOf(Date);

    const user2 = result.find(u => u.email === 'user2@example.com');
    expect(user2).toBeDefined();
    expect(user2?.name).toEqual('Jane Smith');
    expect(user2?.tier).toEqual('paid');
    expect(user2?.status).toEqual('inactive');

    const user3 = result.find(u => u.email === 'user3@example.com');
    expect(user3).toBeDefined();
    expect(user3?.name).toEqual('Bob Wilson');
    expect(user3?.tier).toEqual('paid');
    expect(user3?.status).toEqual('suspended');
  });

  it('should return users with all expected fields', async () => {
    // Create a single test user
    await db.insert(usersTable).values(testUser1).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Check all required fields exist
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.email).toBe('user1@example.com');
    expect(user.name).toBe('John Doe');
    expect(user.tier).toBe('free');
    expect(user.status).toBe('active');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should handle users with different tier and status combinations', async () => {
    // Create users with all tier/status combinations
    const testUsers = [
      { email: 'free-active@example.com', name: 'Free Active', tier: 'free' as const, status: 'active' as const },
      { email: 'free-inactive@example.com', name: 'Free Inactive', tier: 'free' as const, status: 'inactive' as const },
      { email: 'free-suspended@example.com', name: 'Free Suspended', tier: 'free' as const, status: 'suspended' as const },
      { email: 'paid-active@example.com', name: 'Paid Active', tier: 'paid' as const, status: 'active' as const },
      { email: 'paid-inactive@example.com', name: 'Paid Inactive', tier: 'paid' as const, status: 'inactive' as const },
      { email: 'paid-suspended@example.com', name: 'Paid Suspended', tier: 'paid' as const, status: 'suspended' as const }
    ];

    await db.insert(usersTable).values(testUsers).execute();

    const result = await getUsers();

    expect(result).toHaveLength(6);

    // Verify each tier/status combination exists
    const tiers = result.map(u => u.tier);
    const statuses = result.map(u => u.status);

    expect(tiers.filter(t => t === 'free')).toHaveLength(3);
    expect(tiers.filter(t => t === 'paid')).toHaveLength(3);
    expect(statuses.filter(s => s === 'active')).toHaveLength(2);
    expect(statuses.filter(s => s === 'inactive')).toHaveLength(2);
    expect(statuses.filter(s => s === 'suspended')).toHaveLength(2);
  });

  it('should return users in consistent order', async () => {
    // Create users in a specific order
    const users = [testUser3, testUser1, testUser2]; // Intentionally mixed order
    await db.insert(usersTable).values(users).execute();

    const result1 = await getUsers();
    const result2 = await getUsers();

    // Results should be consistent between calls
    expect(result1).toHaveLength(3);
    expect(result2).toHaveLength(3);
    
    // Should maintain the same order (by id, which is auto-incremented)
    expect(result1.map(u => u.id)).toEqual(result2.map(u => u.id));
    
    // Verify IDs are in ascending order (natural database order)
    const ids = result1.map(u => u.id);
    const sortedIds = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sortedIds);
  });
});