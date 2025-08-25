import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembershipsTable } from '../db/schema';
import { getUserTeams } from '../handlers/get_user_teams';

describe('getUserTeams', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no teams', async () => {
    // Create a user with no teams
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getUserTeams(users[0].id);

    expect(result).toEqual([]);
  });

  it('should return teams created by the user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'creator@example.com',
          name: 'Creator User',
          tier: 'free',
          status: 'active'
        },
        {
          email: 'other@example.com',
          name: 'Other User',
          tier: 'free',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    const creatorId = users[0].id;
    const otherId = users[1].id;

    // Create teams - one by creator, one by other user
    const teams = await db.insert(teamsTable)
      .values([
        {
          name: 'Creator Team',
          description: 'Team created by user',
          created_by: creatorId
        },
        {
          name: 'Other Team',
          description: 'Team created by other user',
          created_by: otherId
        }
      ])
      .returning()
      .execute();

    const result = await getUserTeams(creatorId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Creator Team');
    expect(result[0].description).toEqual('Team created by user');
    expect(result[0].created_by).toEqual(creatorId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return teams where user is an active member', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'member@example.com',
          name: 'Member User',
          tier: 'free',
          status: 'active'
        },
        {
          email: 'creator@example.com',
          name: 'Creator User',
          tier: 'free',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    const memberId = users[0].id;
    const creatorId = users[1].id;

    // Create team by creator
    const teams = await db.insert(teamsTable)
      .values({
        name: 'Team for Members',
        description: 'Team with active members',
        created_by: creatorId
      })
      .returning()
      .execute();

    const teamId = teams[0].id;

    // Add member to team with active status
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teamId,
        user_id: memberId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const result = await getUserTeams(memberId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Team for Members');
    expect(result[0].id).toEqual(teamId);
  });

  it('should exclude teams where user membership is pending', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'pending@example.com',
          name: 'Pending User',
          tier: 'free',
          status: 'active'
        },
        {
          email: 'creator@example.com',
          name: 'Creator User',
          tier: 'free',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    const pendingUserId = users[0].id;
    const creatorId = users[1].id;

    // Create team
    const teams = await db.insert(teamsTable)
      .values({
        name: 'Exclusive Team',
        description: 'Team with pending member',
        created_by: creatorId
      })
      .returning()
      .execute();

    // Add user with pending status
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teams[0].id,
        user_id: pendingUserId,
        status: 'pending'
      })
      .execute();

    const result = await getUserTeams(pendingUserId);

    expect(result).toEqual([]);
  });

  it('should exclude teams where user membership is rejected', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'rejected@example.com',
          name: 'Rejected User',
          tier: 'free',
          status: 'active'
        },
        {
          email: 'creator@example.com',
          name: 'Creator User',
          tier: 'free',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    const rejectedUserId = users[0].id;
    const creatorId = users[1].id;

    // Create team
    const teams = await db.insert(teamsTable)
      .values({
        name: 'Selective Team',
        description: 'Team with rejected member',
        created_by: creatorId
      })
      .returning()
      .execute();

    // Add user with rejected status
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teams[0].id,
        user_id: rejectedUserId,
        status: 'rejected'
      })
      .execute();

    const result = await getUserTeams(rejectedUserId);

    expect(result).toEqual([]);
  });

  it('should return teams where user is both creator and member without duplicates', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values({
        email: 'creator@example.com',
        name: 'Creator User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create team by user
    const teams = await db.insert(teamsTable)
      .values({
        name: 'Self Team',
        description: 'Team where creator is also member',
        created_by: userId
      })
      .returning()
      .execute();

    // Also add creator as explicit member (edge case)
    await db.insert(teamMembershipsTable)
      .values({
        team_id: teams[0].id,
        user_id: userId,
        status: 'active',
        joined_at: new Date()
      })
      .execute();

    const result = await getUserTeams(userId);

    // Should return only one instance of the team, not duplicates
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Self Team');
    expect(result[0].id).toEqual(teams[0].id);
  });

  it('should return multiple teams of different types', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user@example.com',
          name: 'Test User',
          tier: 'free',
          status: 'active'
        },
        {
          email: 'other@example.com',
          name: 'Other User',
          tier: 'free',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    const userId = users[0].id;
    const otherId = users[1].id;

    // Create multiple teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          name: 'Own Team',
          description: 'Team created by user',
          created_by: userId
        },
        {
          name: 'Member Team 1',
          description: 'Team user joined',
          created_by: otherId
        },
        {
          name: 'Member Team 2',
          description: 'Another team user joined',
          created_by: otherId
        }
      ])
      .returning()
      .execute();

    // Add user as active member to the other teams
    await db.insert(teamMembershipsTable)
      .values([
        {
          team_id: teams[1].id,
          user_id: userId,
          status: 'active',
          joined_at: new Date()
        },
        {
          team_id: teams[2].id,
          user_id: userId,
          status: 'active',
          joined_at: new Date()
        }
      ])
      .execute();

    const result = await getUserTeams(userId);

    expect(result).toHaveLength(3);
    
    // Verify all teams are present
    const teamNames = result.map(team => team.name).sort();
    expect(teamNames).toEqual(['Member Team 1', 'Member Team 2', 'Own Team']);

    // Verify each team has proper structure
    result.forEach(team => {
      expect(team.id).toBeDefined();
      expect(team.name).toBeDefined();
      expect(team.created_by).toBeDefined();
      expect(team.created_at).toBeInstanceOf(Date);
      expect(team.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle nonexistent user gracefully', async () => {
    const result = await getUserTeams(999999);

    expect(result).toEqual([]);
  });
});