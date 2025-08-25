import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembershipsTable } from '../db/schema';
import { getPendingMemberships } from '../handlers/get_pending_memberships';

describe('getPendingMemberships', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return pending memberships for a team', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'owner@test.com', name: 'Owner', tier: 'free', status: 'active' },
        { email: 'pending1@test.com', name: 'Pending User 1', tier: 'free', status: 'active' },
        { email: 'pending2@test.com', name: 'Pending User 2', tier: 'paid', status: 'active' },
        { email: 'active@test.com', name: 'Active Member', tier: 'free', status: 'active' }
      ])
      .returning()
      .execute();

    // Create a test team
    const team = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: users[0].id
      })
      .returning()
      .execute();

    // Create memberships with different statuses
    await db.insert(teamMembershipsTable)
      .values([
        {
          team_id: team[0].id,
          user_id: users[1].id,
          status: 'pending'
        },
        {
          team_id: team[0].id,
          user_id: users[2].id,
          status: 'pending'
        },
        {
          team_id: team[0].id,
          user_id: users[3].id,
          status: 'active',
          joined_at: new Date()
        }
      ])
      .execute();

    const result = await getPendingMemberships(team[0].id);

    // Should only return the 2 pending memberships
    expect(result).toHaveLength(2);
    
    // Verify all returned memberships are pending
    result.forEach(membership => {
      expect(membership.status).toBe('pending');
      expect(membership.team_id).toBe(team[0].id);
      expect(membership.joined_at).toBeNull();
    });

    // Verify the correct users are in the pending list
    const pendingUserIds = result.map(m => m.user_id).sort();
    const expectedUserIds = [users[1].id, users[2].id].sort();
    expect(pendingUserIds).toEqual(expectedUserIds);
  });

  it('should return empty array when no pending memberships exist', async () => {
    // Create test user and team
    const user = await db.insert(usersTable)
      .values({ email: 'owner@test.com', name: 'Owner', tier: 'free', status: 'active' })
      .returning()
      .execute();

    const team = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const result = await getPendingMemberships(team[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent team', async () => {
    const nonExistentTeamId = 99999;
    
    const result = await getPendingMemberships(nonExistentTeamId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should not return rejected memberships', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'owner@test.com', name: 'Owner', tier: 'free', status: 'active' },
        { email: 'rejected@test.com', name: 'Rejected User', tier: 'free', status: 'active' },
        { email: 'pending@test.com', name: 'Pending User', tier: 'free', status: 'active' }
      ])
      .returning()
      .execute();

    // Create a test team
    const team = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: users[0].id
      })
      .returning()
      .execute();

    // Create memberships with rejected and pending status
    await db.insert(teamMembershipsTable)
      .values([
        {
          team_id: team[0].id,
          user_id: users[1].id,
          status: 'rejected'
        },
        {
          team_id: team[0].id,
          user_id: users[2].id,
          status: 'pending'
        }
      ])
      .execute();

    const result = await getPendingMemberships(team[0].id);

    // Should only return the 1 pending membership
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
    expect(result[0].user_id).toBe(users[2].id);
  });

  it('should filter by specific team when multiple teams exist', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'owner1@test.com', name: 'Owner 1', tier: 'free', status: 'active' },
        { email: 'owner2@test.com', name: 'Owner 2', tier: 'free', status: 'active' },
        { email: 'pending1@test.com', name: 'Pending User 1', tier: 'free', status: 'active' },
        { email: 'pending2@test.com', name: 'Pending User 2', tier: 'free', status: 'active' }
      ])
      .returning()
      .execute();

    // Create two test teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          name: 'Team 1',
          description: 'First team',
          created_by: users[0].id
        },
        {
          name: 'Team 2', 
          description: 'Second team',
          created_by: users[1].id
        }
      ])
      .returning()
      .execute();

    // Create pending memberships for both teams
    await db.insert(teamMembershipsTable)
      .values([
        {
          team_id: teams[0].id,
          user_id: users[2].id,
          status: 'pending'
        },
        {
          team_id: teams[1].id,
          user_id: users[3].id,
          status: 'pending'
        }
      ])
      .execute();

    // Get pending memberships for team 1 only
    const result = await getPendingMemberships(teams[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe(teams[0].id);
    expect(result[0].user_id).toBe(users[2].id);
    expect(result[0].status).toBe('pending');
  });

  it('should include all required membership fields', async () => {
    // Create test user and team
    const user = await db.insert(usersTable)
      .values({ email: 'owner@test.com', name: 'Owner', tier: 'free', status: 'active' })
      .returning()
      .execute();

    const pendingUser = await db.insert(usersTable)
      .values({ email: 'pending@test.com', name: 'Pending User', tier: 'paid', status: 'active' })
      .returning()
      .execute();

    const team = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create pending membership
    await db.insert(teamMembershipsTable)
      .values({
        team_id: team[0].id,
        user_id: pendingUser[0].id,
        status: 'pending'
      })
      .execute();

    const result = await getPendingMemberships(team[0].id);

    expect(result).toHaveLength(1);
    const membership = result[0];

    // Verify all required fields are present
    expect(membership.id).toBeDefined();
    expect(typeof membership.id).toBe('number');
    expect(membership.team_id).toBe(team[0].id);
    expect(membership.user_id).toBe(pendingUser[0].id);
    expect(membership.status).toBe('pending');
    expect(membership.joined_at).toBeNull();
    expect(membership.created_at).toBeInstanceOf(Date);
  });
});