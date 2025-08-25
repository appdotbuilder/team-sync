import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, todoListsTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup data
  let testUserId: number;
  let testTeamId: number;
  let testTodoListId: number;
  let testTaskId: number;
  let assignedUserId: number;

  beforeEach(async () => {
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
    testUserId = userResult[0].id;

    // Create another user for assignment tests
    const assignedUserResult = await db.insert(usersTable)
      .values({
        email: 'assigned@example.com',
        name: 'Assigned User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    assignedUserId = assignedUserResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: testUserId
      })
      .returning()
      .execute();
    testTeamId = teamResult[0].id;

    // Create test todo list
    const todoListResult = await db.insert(todoListsTable)
      .values({
        team_id: testTeamId,
        name: 'Test Todo List',
        description: 'A test todo list',
        created_by: testUserId
      })
      .returning()
      .execute();
    testTodoListId = todoListResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        todo_list_id: testTodoListId,
        title: 'Original Task Title',
        description: 'Original description',
        priority: 'P1',
        status: 'todo',
        assigned_to: null,
        due_date: new Date('2024-12-31'),
        created_by: testUserId
      })
      .returning()
      .execute();
    testTaskId = taskResult[0].id;
  });

  it('should update task title', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Task Title'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.priority).toEqual('P1'); // Unchanged
    expect(result.status).toEqual('todo'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task description', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      description: 'Updated description'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Original Task Title'); // Unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task priority', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      priority: 'P0'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.priority).toEqual('P0');
    expect(result.title).toEqual('Original Task Title'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task status to in_progress', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      status: 'in_progress'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.status).toEqual('in_progress');
    expect(result.completed_at).toBeNull(); // Should remain null for in_progress
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task status to completed and set completed_at', async () => {
    const beforeUpdate = new Date();
    
    const input: UpdateTaskInput = {
      id: testTaskId,
      status: 'completed'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should clear completed_at when status changes from completed to todo', async () => {
    // First set task to completed
    await updateTask({
      id: testTaskId,
      status: 'completed'
    });

    // Then change back to todo
    const input: UpdateTaskInput = {
      id: testTaskId,
      status: 'todo'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.status).toEqual('todo');
    expect(result.completed_at).toBeNull(); // Should be cleared
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task assignment', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      assigned_to: assignedUserId
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.assigned_to).toEqual(assignedUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task assignment to null (unassign)', async () => {
    // First assign the task
    await updateTask({
      id: testTaskId,
      assigned_to: assignedUserId
    });

    // Then unassign
    const input: UpdateTaskInput = {
      id: testTaskId,
      assigned_to: null
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.assigned_to).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task due date', async () => {
    const newDueDate = new Date('2025-01-15');
    const input: UpdateTaskInput = {
      id: testTaskId,
      due_date: newDueDate
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.due_date).toEqual(newDueDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task due date to null (clear due date)', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      due_date: null
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.due_date).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const beforeUpdate = new Date();
    const newDueDate = new Date('2025-02-01');
    
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Multi-Update Title',
      description: 'Multi-update description',
      priority: 'P0',
      status: 'completed',
      assigned_to: assignedUserId,
      due_date: newDueDate
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Multi-Update Title');
    expect(result.description).toEqual('Multi-update description');
    expect(result.priority).toEqual('P0');
    expect(result.status).toEqual('completed');
    expect(result.assigned_to).toEqual(assignedUserId);
    expect(result.due_date).toEqual(newDueDate);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'DB Test Title',
      status: 'completed'
    };

    await updateTask(input);

    // Verify changes were saved to database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('DB Test Title');
    expect(tasks[0].status).toEqual('completed');
    expect(tasks[0].completed_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent task', async () => {
    const input: UpdateTaskInput = {
      id: 99999,
      title: 'Non-existent task'
    };

    expect(updateTask(input)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should handle nullable fields correctly', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      description: null,
      priority: null
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.description).toBeNull();
    expect(result.priority).toBeNull();
    expect(result.title).toEqual('Original Task Title'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve original fields when not updated', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Only Title Changed'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Only Title Changed');
    expect(result.description).toEqual('Original description');
    expect(result.priority).toEqual('P1');
    expect(result.status).toEqual('todo');
    expect(result.assigned_to).toBeNull();
    expect(result.due_date).toEqual(new Date('2024-12-31'));
    expect(result.completed_at).toBeNull();
    expect(result.todo_list_id).toEqual(testTodoListId);
    expect(result.created_by).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});