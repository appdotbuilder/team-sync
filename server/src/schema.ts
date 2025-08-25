import { z } from 'zod';

// User schemas
export const userTierEnum = z.enum(['free', 'paid']);
export const userStatusEnum = z.enum(['active', 'inactive', 'suspended']);

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  tier: userTierEnum,
  status: userStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  tier: userTierEnum.default('free'),
  status: userStatusEnum.default('active')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  tier: userTierEnum.optional(),
  status: userStatusEnum.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Team schemas
export const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Team = z.infer<typeof teamSchema>;

export const createTeamInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;

export const updateTeamInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateTeamInput = z.infer<typeof updateTeamInputSchema>;

// Team membership schemas
export const membershipStatusEnum = z.enum(['active', 'pending', 'rejected']);

export const teamMembershipSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  user_id: z.number(),
  status: membershipStatusEnum,
  joined_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type TeamMembership = z.infer<typeof teamMembershipSchema>;

export const requestTeamMembershipInputSchema = z.object({
  team_id: z.number()
});

export type RequestTeamMembershipInput = z.infer<typeof requestTeamMembershipInputSchema>;

export const approveMembershipInputSchema = z.object({
  membership_id: z.number()
});

export type ApproveMembershipInput = z.infer<typeof approveMembershipInputSchema>;

// To-do list schemas
export const todoListSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TodoList = z.infer<typeof todoListSchema>;

export const createTodoListInputSchema = z.object({
  team_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateTodoListInput = z.infer<typeof createTodoListInputSchema>;

// Task schemas
export const taskPriorityEnum = z.enum(['P0', 'P1', 'P2', 'P3']);
export const taskStatusEnum = z.enum(['todo', 'in_progress', 'completed']);

export const taskSchema = z.object({
  id: z.number(),
  todo_list_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  priority: taskPriorityEnum.nullable(),
  status: taskStatusEnum,
  assigned_to: z.number().nullable(),
  due_date: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  todo_list_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: taskPriorityEnum.nullable().optional(),
  assigned_to: z.number().nullable().optional(),
  due_date: z.coerce.date().nullable().optional()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: taskPriorityEnum.nullable().optional(),
  status: taskStatusEnum.optional(),
  assigned_to: z.number().nullable().optional(),
  due_date: z.coerce.date().nullable().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Shopping list schemas
export const shoppingListSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ShoppingList = z.infer<typeof shoppingListSchema>;

export const createShoppingListInputSchema = z.object({
  team_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateShoppingListInput = z.infer<typeof createShoppingListInputSchema>;

// Shopping item schemas
export const shoppingItemSchema = z.object({
  id: z.number(),
  shopping_list_id: z.number(),
  name: z.string(),
  quantity: z.number().int(),
  comment: z.string().nullable(),
  is_purchased: z.boolean(),
  purchased_by: z.number().nullable(),
  purchased_at: z.coerce.date().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ShoppingItem = z.infer<typeof shoppingItemSchema>;

export const createShoppingItemInputSchema = z.object({
  shopping_list_id: z.number(),
  name: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  comment: z.string().nullable().optional()
});

export type CreateShoppingItemInput = z.infer<typeof createShoppingItemInputSchema>;

export const updateShoppingItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  comment: z.string().nullable().optional(),
  is_purchased: z.boolean().optional()
});

export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemInputSchema>;

// Calendar event schemas
export const calendarEventSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  is_all_day: z.boolean(),
  location: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const createCalendarEventInputSchema = z.object({
  team_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  is_all_day: z.boolean().default(false),
  location: z.string().nullable().optional()
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventInputSchema>;

export const updateCalendarEventInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  is_all_day: z.boolean().optional(),
  location: z.string().nullable().optional()
});

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventInputSchema>;

// Feature configuration schemas
export const featureSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_enabled_free: z.boolean(),
  is_enabled_paid: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Feature = z.infer<typeof featureSchema>;

export const updateFeatureInputSchema = z.object({
  id: z.number(),
  is_enabled_free: z.boolean().optional(),
  is_enabled_paid: z.boolean().optional()
});

export type UpdateFeatureInput = z.infer<typeof updateFeatureInputSchema>;

// Query input schemas
export const getTeamMembersInputSchema = z.object({
  team_id: z.number()
});

export type GetTeamMembersInput = z.infer<typeof getTeamMembersInputSchema>;

export const getTeamTodoListsInputSchema = z.object({
  team_id: z.number()
});

export type GetTeamTodoListsInput = z.infer<typeof getTeamTodoListsInputSchema>;

export const getTodoListTasksInputSchema = z.object({
  todo_list_id: z.number()
});

export type GetTodoListTasksInput = z.infer<typeof getTodoListTasksInputSchema>;

export const getTeamShoppingListsInputSchema = z.object({
  team_id: z.number()
});

export type GetTeamShoppingListsInput = z.infer<typeof getTeamShoppingListsInputSchema>;

export const getShoppingListItemsInputSchema = z.object({
  shopping_list_id: z.number()
});

export type GetShoppingListItemsInput = z.infer<typeof getShoppingListItemsInputSchema>;

export const getTeamCalendarEventsInputSchema = z.object({
  team_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetTeamCalendarEventsInput = z.infer<typeof getTeamCalendarEventsInputSchema>;