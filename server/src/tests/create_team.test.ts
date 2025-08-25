import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teamsTable, teamMembershipsTable, usersTable } from '../db/schema';
import { type CreateTeamInput } from '../schema';
import { createTeam } from '../handlers/create_team';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free' as const,
  status: 'active' as const
};

// Test input data
const testInput: CreateTeamInput = {
  name: 'Test Team',
  description: 'A team for testing purposes'
};

const testInputWithoutDescription: CreateTeamInput = {
  name: 'Simple Team'
};

describe('createTeam', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a team with description', async () => {
    const result = await createTeam(testInput, testUserId);

    // Verify team properties
    expect(result.name).toEqual('Test Team');
    expect(result.description).toEqual('A team for testing purposes');
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a team without description', async () => {
    const result = await createTeam(testInputWithoutDescription, testUserId);

    // Verify team properties
    expect(result.name).toEqual('Simple Team');
    expect(result.description).toBeNull();
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save team to database', async () => {
    const result = await createTeam(testInput, testUserId);

    // Query the database to verify the team was saved
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, result.id))
      .execute();

    expect(teams).toHaveLength(1);
    expect(teams[0].name).toEqual('Test Team');
    expect(teams[0].description).toEqual('A team for testing purposes');
    expect(teams[0].created_by).toEqual(testUserId);
    expect(teams[0].created_at).toBeInstanceOf(Date);
    expect(teams[0].updated_at).toBeInstanceOf(Date);
  });

  it('should automatically create active membership for team creator', async () => {
    const result = await createTeam(testInput, testUserId);

    // Query team memberships to verify the creator was added as an active member
    const memberships = await db.select()
      .from(teamMembershipsTable)
      .where(eq(teamMembershipsTable.team_id, result.id))
      .execute();

    expect(memberships).toHaveLength(1);
    expect(memberships[0].team_id).toEqual(result.id);
    expect(memberships[0].user_id).toEqual(testUserId);
    expect(memberships[0].status).toEqual('active');
    expect(memberships[0].joined_at).toBeInstanceOf(Date);
    expect(memberships[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const inputWithExplicitNull: CreateTeamInput = {
      name: 'Null Description Team',
      description: null
    };

    const result = await createTeam(inputWithExplicitNull, testUserId);

    expect(result.name).toEqual('Null Description Team');
    expect(result.description).toBeNull();
    expect(result.created_by).toEqual(testUserId);
  });

  it('should fail when user does not exist', async () => {
    const nonExistentUserId = 99999;
    
    await expect(createTeam(testInput, nonExistentUserId))
      .rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should create multiple teams for the same user', async () => {
    const firstTeam = await createTeam(testInput, testUserId);
    const secondInput: CreateTeamInput = {
      name: 'Second Team',
      description: 'Another test team'
    };
    const secondTeam = await createTeam(secondInput, testUserId);

    // Both teams should be created successfully
    expect(firstTeam.id).not.toEqual(secondTeam.id);
    expect(firstTeam.name).toEqual('Test Team');
    expect(secondTeam.name).toEqual('Second Team');
    expect(firstTeam.created_by).toEqual(testUserId);
    expect(secondTeam.created_by).toEqual(testUserId);

    // Both should have memberships
    const memberships = await db.select()
      .from(teamMembershipsTable)
      .execute();

    expect(memberships).toHaveLength(2);
    expect(memberships.every(m => m.user_id === testUserId)).toBe(true);
    expect(memberships.every(m => m.status === 'active')).toBe(true);
  });
});