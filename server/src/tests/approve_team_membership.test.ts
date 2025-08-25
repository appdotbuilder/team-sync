import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembershipsTable } from '../db/schema';
import { type ApproveMembershipInput } from '../schema';
import { approveTeamMembership } from '../handlers/approve_team_membership';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async (email: string, name: string) => {
  const result = await db.insert(usersTable)
    .values({
      email,
      name,
      tier: 'free',
      status: 'active'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestTeam = async (name: string, createdBy: number) => {
  const result = await db.insert(teamsTable)
    .values({
      name,
      description: `${name} description`,
      created_by: createdBy
    })
    .returning()
    .execute();
  return result[0];
};

const createPendingMembership = async (teamId: number, userId: number) => {
  const result = await db.insert(teamMembershipsTable)
    .values({
      team_id: teamId,
      user_id: userId,
      status: 'pending'
    })
    .returning()
    .execute();
  return result[0];
};

const createActiveMembership = async (teamId: number, userId: number) => {
  const result = await db.insert(teamMembershipsTable)
    .values({
      team_id: teamId,
      user_id: userId,
      status: 'active',
      joined_at: new Date()
    })
    .returning()
    .execute();
  return result[0];
};

describe('approveTeamMembership', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should approve a pending membership request', async () => {
    // Create test users
    const teamCreator = await createTestUser('creator@test.com', 'Team Creator');
    const pendingUser = await createTestUser('pending@test.com', 'Pending User');
    const approver = await createTestUser('approver@test.com', 'Approver');

    // Create test team
    const team = await createTestTeam('Test Team', teamCreator.id);

    // Create active membership for approver
    await createActiveMembership(team.id, approver.id);

    // Create pending membership for user
    const pendingMembership = await createPendingMembership(team.id, pendingUser.id);

    const input: ApproveMembershipInput = {
      membership_id: pendingMembership.id
    };

    const result = await approveTeamMembership(input, approver.id);

    // Verify the result
    expect(result.id).toEqual(pendingMembership.id);
    expect(result.team_id).toEqual(team.id);
    expect(result.user_id).toEqual(pendingUser.id);
    expect(result.status).toEqual('active');
    expect(result.joined_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update the membership in the database', async () => {
    // Create test users
    const teamCreator = await createTestUser('creator@test.com', 'Team Creator');
    const pendingUser = await createTestUser('pending@test.com', 'Pending User');
    const approver = await createTestUser('approver@test.com', 'Approver');

    // Create test team
    const team = await createTestTeam('Test Team', teamCreator.id);

    // Create active membership for approver
    await createActiveMembership(team.id, approver.id);

    // Create pending membership for user
    const pendingMembership = await createPendingMembership(team.id, pendingUser.id);

    const input: ApproveMembershipInput = {
      membership_id: pendingMembership.id
    };

    await approveTeamMembership(input, approver.id);

    // Verify the membership was updated in the database
    const updatedMembership = await db.select()
      .from(teamMembershipsTable)
      .where(eq(teamMembershipsTable.id, pendingMembership.id))
      .execute();

    expect(updatedMembership).toHaveLength(1);
    expect(updatedMembership[0].status).toEqual('active');
    expect(updatedMembership[0].joined_at).toBeInstanceOf(Date);
    expect(updatedMembership[0].joined_at).not.toBeNull();
  });

  it('should throw error if membership request does not exist', async () => {
    // Create test user as approver
    const approver = await createTestUser('approver@test.com', 'Approver');

    const input: ApproveMembershipInput = {
      membership_id: 999 // Non-existent ID
    };

    await expect(approveTeamMembership(input, approver.id))
      .rejects.toThrow(/membership request not found/i);
  });

  it('should throw error if membership is not pending', async () => {
    // Create test users
    const teamCreator = await createTestUser('creator@test.com', 'Team Creator');
    const existingUser = await createTestUser('existing@test.com', 'Existing User');
    const approver = await createTestUser('approver@test.com', 'Approver');

    // Create test team
    const team = await createTestTeam('Test Team', teamCreator.id);

    // Create active membership for approver
    await createActiveMembership(team.id, approver.id);

    // Create active membership (not pending) for user
    const activeMembership = await createActiveMembership(team.id, existingUser.id);

    const input: ApproveMembershipInput = {
      membership_id: activeMembership.id
    };

    await expect(approveTeamMembership(input, approver.id))
      .rejects.toThrow(/membership request is not pending/i);
  });

  it('should throw error if approver is not an active team member', async () => {
    // Create test users
    const teamCreator = await createTestUser('creator@test.com', 'Team Creator');
    const pendingUser = await createTestUser('pending@test.com', 'Pending User');
    const nonMember = await createTestUser('nonmember@test.com', 'Non Member');

    // Create test team
    const team = await createTestTeam('Test Team', teamCreator.id);

    // Create pending membership for user
    const pendingMembership = await createPendingMembership(team.id, pendingUser.id);

    const input: ApproveMembershipInput = {
      membership_id: pendingMembership.id
    };

    // Try to approve with a user who is not a team member
    await expect(approveTeamMembership(input, nonMember.id))
      .rejects.toThrow(/approver must be an active member of the team/i);
  });

  it('should throw error if approver has pending membership status', async () => {
    // Create test users
    const teamCreator = await createTestUser('creator@test.com', 'Team Creator');
    const pendingUser = await createTestUser('pending@test.com', 'Pending User');
    const pendingApprover = await createTestUser('pending-approver@test.com', 'Pending Approver');

    // Create test team
    const team = await createTestTeam('Test Team', teamCreator.id);

    // Create pending membership for both users
    const pendingMembership = await createPendingMembership(team.id, pendingUser.id);
    await createPendingMembership(team.id, pendingApprover.id);

    const input: ApproveMembershipInput = {
      membership_id: pendingMembership.id
    };

    // Try to approve with a user who has pending status
    await expect(approveTeamMembership(input, pendingApprover.id))
      .rejects.toThrow(/approver must be an active member of the team/i);
  });

  it('should throw error if approver is from different team', async () => {
    // Create test users
    const teamCreator1 = await createTestUser('creator1@test.com', 'Team Creator 1');
    const teamCreator2 = await createTestUser('creator2@test.com', 'Team Creator 2');
    const pendingUser = await createTestUser('pending@test.com', 'Pending User');
    const approverFromOtherTeam = await createTestUser('other-approver@test.com', 'Other Team Approver');

    // Create test teams
    const team1 = await createTestTeam('Test Team 1', teamCreator1.id);
    const team2 = await createTestTeam('Test Team 2', teamCreator2.id);

    // Create active membership for approver in team2
    await createActiveMembership(team2.id, approverFromOtherTeam.id);

    // Create pending membership for user in team1
    const pendingMembership = await createPendingMembership(team1.id, pendingUser.id);

    const input: ApproveMembershipInput = {
      membership_id: pendingMembership.id
    };

    // Try to approve with a user from different team
    await expect(approveTeamMembership(input, approverFromOtherTeam.id))
      .rejects.toThrow(/approver must be an active member of the team/i);
  });

  it('should allow team creator to approve membership', async () => {
    // Create test users
    const teamCreator = await createTestUser('creator@test.com', 'Team Creator');
    const pendingUser = await createTestUser('pending@test.com', 'Pending User');

    // Create test team
    const team = await createTestTeam('Test Team', teamCreator.id);

    // Create active membership for team creator (implicit but we need to add it)
    await createActiveMembership(team.id, teamCreator.id);

    // Create pending membership for user
    const pendingMembership = await createPendingMembership(team.id, pendingUser.id);

    const input: ApproveMembershipInput = {
      membership_id: pendingMembership.id
    };

    const result = await approveTeamMembership(input, teamCreator.id);

    expect(result.status).toEqual('active');
    expect(result.joined_at).toBeInstanceOf(Date);
  });
});