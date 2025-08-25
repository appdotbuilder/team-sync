import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, todoListsTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test data setup
let testUser: { id: number };
let testTeam: { id: number };
let testTodoList: { id: number };
let assignedUser: { id: number };

describe('createTask', () => {
  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create assigned user
    const assignedUserResult = await db.insert(usersTable)
      .values({
        email: 'assigned@example.com',
        name: 'Assigned User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    assignedUser = assignedUserResult[0];

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: testUser.id
      })
      .returning()
      .execute();
    testTeam = teamResult[0];

    // Create test todo list
    const todoListResult = await db.insert(todoListsTable)
      .values({
        team_id: testTeam.id,
        name: 'Test Todo List',
        description: 'A todo list for testing',
        created_by: testUser.id
      })
      .returning()
      .execute();
    testTodoList = todoListResult[0];
  });

  afterEach(resetDB);

  it('should create a basic task with required fields only', async () => {
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Test Task'
    };

    const result = await createTask(input, testUser.id);

    expect(result.todo_list_id).toEqual(testTodoList.id);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toBeNull();
    expect(result.priority).toBeNull();
    expect(result.status).toEqual('todo');
    expect(result.assigned_to).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.created_by).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with all optional fields', async () => {
    const dueDate = new Date('2024-12-31T23:59:59.000Z');
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Complete Task',
      description: 'A task with all fields filled',
      priority: 'P1',
      assigned_to: assignedUser.id,
      due_date: dueDate
    };

    const result = await createTask(input, testUser.id);

    expect(result.todo_list_id).toEqual(testTodoList.id);
    expect(result.title).toEqual('Complete Task');
    expect(result.description).toEqual('A task with all fields filled');
    expect(result.priority).toEqual('P1');
    expect(result.status).toEqual('todo');
    expect(result.assigned_to).toEqual(assignedUser.id);
    expect(result.due_date).toEqual(dueDate);
    expect(result.completed_at).toBeNull();
    expect(result.created_by).toEqual(testUser.id);
  });

  it('should save task to database correctly', async () => {
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Database Test Task',
      description: 'Testing database persistence',
      priority: 'P2'
    };

    const result = await createTask(input, testUser.id);

    // Query the database to verify the task was saved
    const savedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(savedTasks).toHaveLength(1);
    const savedTask = savedTasks[0];

    expect(savedTask.todo_list_id).toEqual(testTodoList.id);
    expect(savedTask.title).toEqual('Database Test Task');
    expect(savedTask.description).toEqual('Testing database persistence');
    expect(savedTask.priority).toEqual('P2');
    expect(savedTask.status).toEqual('todo');
    expect(savedTask.created_by).toEqual(testUser.id);
  });

  it('should handle different priority levels', async () => {
    const priorities = ['P0', 'P1', 'P2', 'P3'] as const;

    for (const priority of priorities) {
      const input: CreateTaskInput = {
        todo_list_id: testTodoList.id,
        title: `Task with priority ${priority}`,
        priority: priority
      };

      const result = await createTask(input, testUser.id);
      expect(result.priority).toEqual(priority);
    }
  });

  it('should handle null values correctly', async () => {
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Task with nulls',
      description: null,
      priority: null,
      assigned_to: null,
      due_date: null
    };

    const result = await createTask(input, testUser.id);

    expect(result.description).toBeNull();
    expect(result.priority).toBeNull();
    expect(result.assigned_to).toBeNull();
    expect(result.due_date).toBeNull();
  });

  it('should throw error when todo list does not exist', async () => {
    const input: CreateTaskInput = {
      todo_list_id: 99999, // Non-existent todo list ID
      title: 'Task for non-existent list'
    };

    await expect(createTask(input, testUser.id)).rejects.toThrow(/Todo list with ID 99999 not found/i);
  });

  it('should throw error when assigned user does not exist', async () => {
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Task with invalid assignee',
      assigned_to: 99999 // Non-existent user ID
    };

    await expect(createTask(input, testUser.id)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should create task with valid assigned user', async () => {
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Task with valid assignee',
      assigned_to: assignedUser.id
    };

    const result = await createTask(input, testUser.id);

    expect(result.assigned_to).toEqual(assignedUser.id);
    expect(result.created_by).toEqual(testUser.id);
  });

  it('should handle future due dates correctly', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Future task',
      due_date: futureDate
    };

    const result = await createTask(input, testUser.id);

    expect(result.due_date).toEqual(futureDate);
  });

  it('should default status to todo', async () => {
    const input: CreateTaskInput = {
      todo_list_id: testTodoList.id,
      title: 'Status test task'
    };

    const result = await createTask(input, testUser.id);

    expect(result.status).toEqual('todo');
  });
});