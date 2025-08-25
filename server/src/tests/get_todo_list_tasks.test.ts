import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, todoListsTable, tasksTable } from '../db/schema';
import { type GetTodoListTasksInput, type CreateUserInput, type CreateTeamInput, type CreateTodoListInput, type CreateTaskInput } from '../schema';
import { getTodoListTasks } from '../handlers/get_todo_list_tasks';

describe('getTodoListTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for todo list with no tasks', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    const todoListResult = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Empty Todo List',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const todoList = todoListResult[0];

    const input: GetTodoListTasksInput = {
      todo_list_id: todoList.id
    };

    const result = await getTodoListTasks(input);

    expect(result).toEqual([]);
  });

  it('should return all tasks for a todo list', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    const todoListResult = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Test Todo List',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const todoList = todoListResult[0];

    // Create tasks with different properties
    const task1Result = await db.insert(tasksTable)
      .values({
        todo_list_id: todoList.id,
        title: 'First Task',
        description: 'First task description',
        priority: 'P1',
        status: 'todo',
        assigned_to: user.id,
        due_date: new Date('2024-12-31'),
        created_by: user.id
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        todo_list_id: todoList.id,
        title: 'Second Task',
        description: null,
        priority: null,
        status: 'in_progress',
        assigned_to: null,
        due_date: null,
        created_by: user.id
      })
      .returning()
      .execute();

    const task3Result = await db.insert(tasksTable)
      .values({
        todo_list_id: todoList.id,
        title: 'Third Task',
        description: 'Completed task',
        priority: 'P0',
        status: 'completed',
        assigned_to: user.id,
        due_date: new Date('2024-11-30'),
        completed_at: new Date(),
        created_by: user.id
      })
      .returning()
      .execute();

    const input: GetTodoListTasksInput = {
      todo_list_id: todoList.id
    };

    const result = await getTodoListTasks(input);

    expect(result).toHaveLength(3);

    // Results should be ordered by created_at desc (newest first)
    // So task3 should be first, then task2, then task1
    const sortedResults = result.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    expect(sortedResults[0].title).toEqual('Third Task');
    expect(sortedResults[0].description).toEqual('Completed task');
    expect(sortedResults[0].priority).toEqual('P0');
    expect(sortedResults[0].status).toEqual('completed');
    expect(sortedResults[0].assigned_to).toEqual(user.id);
    expect(sortedResults[0].completed_at).toBeInstanceOf(Date);

    expect(sortedResults[1].title).toEqual('Second Task');
    expect(sortedResults[1].description).toBeNull();
    expect(sortedResults[1].priority).toBeNull();
    expect(sortedResults[1].status).toEqual('in_progress');
    expect(sortedResults[1].assigned_to).toBeNull();
    expect(sortedResults[1].due_date).toBeNull();

    expect(sortedResults[2].title).toEqual('First Task');
    expect(sortedResults[2].description).toEqual('First task description');
    expect(sortedResults[2].priority).toEqual('P1');
    expect(sortedResults[2].status).toEqual('todo');
    expect(sortedResults[2].assigned_to).toEqual(user.id);
    expect(sortedResults[2].due_date).toBeInstanceOf(Date);
  });

  it('should only return tasks for the specified todo list', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    // Create two todo lists
    const todoList1Result = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Todo List 1',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const todoList1 = todoList1Result[0];

    const todoList2Result = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Todo List 2',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const todoList2 = todoList2Result[0];

    // Create tasks in both lists
    await db.insert(tasksTable)
      .values({
        todo_list_id: todoList1.id,
        title: 'Task in List 1',
        description: null,
        created_by: user.id
      })
      .execute();

    await db.insert(tasksTable)
      .values({
        todo_list_id: todoList2.id,
        title: 'Task in List 2',
        description: null,
        created_by: user.id
      })
      .execute();

    const input: GetTodoListTasksInput = {
      todo_list_id: todoList1.id
    };

    const result = await getTodoListTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Task in List 1');
    expect(result[0].todo_list_id).toEqual(todoList1.id);
  });

  it('should return empty array for non-existent todo list', async () => {
    const input: GetTodoListTasksInput = {
      todo_list_id: 99999 // Non-existent ID
    };

    const result = await getTodoListTasks(input);

    expect(result).toEqual([]);
  });

  it('should include all task fields with correct types', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const team = teamResult[0];

    const todoListResult = await db.insert(todoListsTable)
      .values({
        team_id: team.id,
        name: 'Test Todo List',
        description: null,
        created_by: user.id
      })
      .returning()
      .execute();
    const todoList = todoListResult[0];

    // Create a task with all fields populated
    await db.insert(tasksTable)
      .values({
        todo_list_id: todoList.id,
        title: 'Complete Task',
        description: 'Task with all fields',
        priority: 'P2',
        status: 'completed',
        assigned_to: user.id,
        due_date: new Date('2024-12-31'),
        completed_at: new Date(),
        created_by: user.id
      })
      .execute();

    const input: GetTodoListTasksInput = {
      todo_list_id: todoList.id
    };

    const result = await getTodoListTasks(input);

    expect(result).toHaveLength(1);
    const task = result[0];

    // Verify all fields are present with correct types
    expect(typeof task.id).toBe('number');
    expect(typeof task.todo_list_id).toBe('number');
    expect(typeof task.title).toBe('string');
    expect(task.description).toEqual('Task with all fields');
    expect(task.priority).toEqual('P2');
    expect(task.status).toEqual('completed');
    expect(typeof task.assigned_to).toBe('number');
    expect(task.due_date).toBeInstanceOf(Date);
    expect(task.completed_at).toBeInstanceOf(Date);
    expect(typeof task.created_by).toBe('number');
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });
});