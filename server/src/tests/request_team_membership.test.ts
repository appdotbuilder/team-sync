import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teamsTable, usersTable, teamMembershipsTable } from '../db/schema';
import { type RequestTeamMembershipInput } from '../schema';
import { requestTeamMembership } from '../handlers/request_team_membership';
import { eq, and } from 'drizzle-orm';

describe('requestTeamMembership', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a membership request', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create another user to request membership
    const requestingUserResult = await db.insert(usersTable)
      .values({
        email: 'requesting@example.com',
        name: 'Requesting User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const requestingUserId = requestingUserResult[0].id;

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    const result = await requestTeamMembership(input, requestingUserId);

    // Verify basic properties
    expect(result.team_id).toEqual(teamId);
    expect(result.user_id).toEqual(requestingUserId);
    expect(result.status).toEqual('pending');
    expect(result.joined_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save membership request to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create another user to request membership
    const requestingUserResult = await db.insert(usersTable)
      .values({
        email: 'requesting@example.com',
        name: 'Requesting User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const requestingUserId = requestingUserResult[0].id;

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    const result = await requestTeamMembership(input, requestingUserId);

    // Verify the membership was saved to database
    const memberships = await db.select()
      .from(teamMembershipsTable)
      .where(eq(teamMembershipsTable.id, result.id))
      .execute();

    expect(memberships).toHaveLength(1);
    expect(memberships[0].team_id).toEqual(teamId);
    expect(memberships[0].user_id).toEqual(requestingUserId);
    expect(memberships[0].status).toEqual('pending');
    expect(memberships[0].joined_at).toBeNull();
    expect(memberships[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when team does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: RequestTeamMembershipInput = {
      team_id: 999999 // Non-existent team ID
    };

    await expect(requestTeamMembership(input, userId)).rejects.toThrow(/team not found/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create test user for team creation
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    const nonExistentUserId = 999999;

    await expect(requestTeamMembership(input, nonExistentUserId)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user already has a membership request', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create another user to request membership
    const requestingUserResult = await db.insert(usersTable)
      .values({
        email: 'requesting@example.com',
        name: 'Requesting User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const requestingUserId = requestingUserResult[0].id;

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    // Make first request
    await requestTeamMembership(input, requestingUserId);

    // Try to make another request
    await expect(requestTeamMembership(input, requestingUserId)).rejects.toThrow(/already has a membership/i);
  });

  it('should throw error when user already has active membership', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create another user
    const requestingUserResult = await db.insert(usersTable)
      .values({
        email: 'requesting@example.com',
        name: 'Requesting User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const requestingUserId = requestingUserResult[0].id;

    // Create an active membership directly
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: requestingUserId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    // Try to request membership again
    await expect(requestTeamMembership(input, requestingUserId)).rejects.toThrow(/already has a membership/i);
  });

  it('should throw error when user has rejected membership', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create another user
    const requestingUserResult = await db.insert(usersTable)
      .values({
        email: 'requesting@example.com',
        name: 'Requesting User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const requestingUserId = requestingUserResult[0].id;

    // Create a rejected membership directly
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: requestingUserId,
        status: 'rejected',
        joined_at: null
      })
      .execute();

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    // Try to request membership again
    await expect(requestTeamMembership(input, requestingUserId)).rejects.toThrow(/already has a membership/i);
  });

  it('should allow different users to request membership to same team', async () => {
    // Create test user (team creator)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: userId
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create first requesting user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second requesting user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    const input: RequestTeamMembershipInput = {
      team_id: teamId
    };

    // Both users should be able to request membership
    const result1 = await requestTeamMembership(input, user1Id);
    const result2 = await requestTeamMembership(input, user2Id);

    expect(result1.user_id).toEqual(user1Id);
    expect(result2.user_id).toEqual(user2Id);
    expect(result1.team_id).toEqual(teamId);
    expect(result2.team_id).toEqual(teamId);
    expect(result1.status).toEqual('pending');
    expect(result2.status).toEqual('pending');

    // Verify both are in database
    const memberships = await db.select()
      .from(teamMembershipsTable)
      .where(eq(teamMembershipsTable.team_id, teamId))
      .execute();

    expect(memberships).toHaveLength(2);
  });
});