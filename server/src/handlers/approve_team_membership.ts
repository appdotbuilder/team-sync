import { db } from '../db';
import { teamMembershipsTable } from '../db/schema';
import { type ApproveMembershipInput, type TeamMembership } from '../schema';
import { eq, and } from 'drizzle-orm';

export const approveTeamMembership = async (input: ApproveMembershipInput, approverId: number): Promise<TeamMembership> => {
  try {
    // First, get the pending membership to check its details
    const existingMembership = await db.select()
      .from(teamMembershipsTable)
      .where(eq(teamMembershipsTable.id, input.membership_id))
      .execute();

    if (existingMembership.length === 0) {
      throw new Error('Membership request not found');
    }

    const membership = existingMembership[0];

    if (membership.status !== 'pending') {
      throw new Error('Membership request is not pending');
    }

    // Verify that the approver is an active member of the same team
    const approverMembership = await db.select()
      .from(teamMembershipsTable)
      .where(
        and(
          eq(teamMembershipsTable.team_id, membership.team_id),
          eq(teamMembershipsTable.user_id, approverId),
          eq(teamMembershipsTable.status, 'active')
        )
      )
      .execute();

    if (approverMembership.length === 0) {
      throw new Error('Approver must be an active member of the team');
    }

    // Update the membership status to active and set joined_at timestamp
    const result = await db.update(teamMembershipsTable)
      .set({
        status: 'active',
        joined_at: new Date()
      })
      .where(eq(teamMembershipsTable.id, input.membership_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Team membership approval failed:', error);
    throw error;
  }
};