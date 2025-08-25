import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userTierEnum = pgEnum('user_tier', ['free', 'paid']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'pending', 'rejected']);
export const taskPriorityEnum = pgEnum('task_priority', ['P0', 'P1', 'P2', 'P3']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'completed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  tier: userTierEnum('tier').notNull().default('free'),
  status: userStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Teams table
export const teamsTable = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Team memberships table
export const teamMembershipsTable = pgTable('team_memberships', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: membershipStatusEnum('status').notNull().default('pending'),
  joined_at: timestamp('joined_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Todo lists table
export const todoListsTable = pgTable('todo_lists', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  todo_list_id: integer('todo_list_id').notNull().references(() => todoListsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  priority: taskPriorityEnum('priority'),
  status: taskStatusEnum('status').notNull().default('todo'),
  assigned_to: integer('assigned_to').references(() => usersTable.id),
  due_date: timestamp('due_date'),
  completed_at: timestamp('completed_at'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Shopping lists table
export const shoppingListsTable = pgTable('shopping_lists', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Shopping items table
export const shoppingItemsTable = pgTable('shopping_items', {
  id: serial('id').primaryKey(),
  shopping_list_id: integer('shopping_list_id').notNull().references(() => shoppingListsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  comment: text('comment'),
  is_purchased: boolean('is_purchased').notNull().default(false),
  purchased_by: integer('purchased_by').references(() => usersTable.id),
  purchased_at: timestamp('purchased_at'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Calendar events table
export const calendarEventsTable = pgTable('calendar_events', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').notNull().references(() => teamsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  is_all_day: boolean('is_all_day').notNull().default(false),
  location: text('location'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Features table for admin configuration
export const featuresTable = pgTable('features', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  is_enabled_free: boolean('is_enabled_free').notNull().default(true),
  is_enabled_paid: boolean('is_enabled_paid').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdTeams: many(teamsTable),
  teamMemberships: many(teamMembershipsTable),
  createdTodoLists: many(todoListsTable),
  assignedTasks: many(tasksTable, { relationName: 'assignedTasks' }),
  createdTasks: many(tasksTable, { relationName: 'createdTasks' }),
  createdShoppingLists: many(shoppingListsTable),
  createdShoppingItems: many(shoppingItemsTable, { relationName: 'createdShoppingItems' }),
  purchasedItems: many(shoppingItemsTable, { relationName: 'purchasedItems' }),
  createdEvents: many(calendarEventsTable),
}));

export const teamsRelations = relations(teamsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [teamsTable.created_by],
    references: [usersTable.id],
  }),
  memberships: many(teamMembershipsTable),
  todoLists: many(todoListsTable),
  shoppingLists: many(shoppingListsTable),
  calendarEvents: many(calendarEventsTable),
}));

export const teamMembershipsRelations = relations(teamMembershipsTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [teamMembershipsTable.team_id],
    references: [teamsTable.id],
  }),
  user: one(usersTable, {
    fields: [teamMembershipsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const todoListsRelations = relations(todoListsTable, ({ one, many }) => ({
  team: one(teamsTable, {
    fields: [todoListsTable.team_id],
    references: [teamsTable.id],
  }),
  creator: one(usersTable, {
    fields: [todoListsTable.created_by],
    references: [usersTable.id],
  }),
  tasks: many(tasksTable),
}));

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  todoList: one(todoListsTable, {
    fields: [tasksTable.todo_list_id],
    references: [todoListsTable.id],
  }),
  assignedUser: one(usersTable, {
    fields: [tasksTable.assigned_to],
    references: [usersTable.id],
    relationName: 'assignedTasks',
  }),
  creator: one(usersTable, {
    fields: [tasksTable.created_by],
    references: [usersTable.id],
    relationName: 'createdTasks',
  }),
}));

export const shoppingListsRelations = relations(shoppingListsTable, ({ one, many }) => ({
  team: one(teamsTable, {
    fields: [shoppingListsTable.team_id],
    references: [teamsTable.id],
  }),
  creator: one(usersTable, {
    fields: [shoppingListsTable.created_by],
    references: [usersTable.id],
  }),
  items: many(shoppingItemsTable),
}));

export const shoppingItemsRelations = relations(shoppingItemsTable, ({ one }) => ({
  shoppingList: one(shoppingListsTable, {
    fields: [shoppingItemsTable.shopping_list_id],
    references: [shoppingListsTable.id],
  }),
  creator: one(usersTable, {
    fields: [shoppingItemsTable.created_by],
    references: [usersTable.id],
    relationName: 'createdShoppingItems',
  }),
  purchasedBy: one(usersTable, {
    fields: [shoppingItemsTable.purchased_by],
    references: [usersTable.id],
    relationName: 'purchasedItems',
  }),
}));

export const calendarEventsRelations = relations(calendarEventsTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [calendarEventsTable.team_id],
    references: [teamsTable.id],
  }),
  creator: one(usersTable, {
    fields: [calendarEventsTable.created_by],
    references: [usersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  teams: teamsTable,
  teamMemberships: teamMembershipsTable,
  todoLists: todoListsTable,
  tasks: tasksTable,
  shoppingLists: shoppingListsTable,
  shoppingItems: shoppingItemsTable,
  calendarEvents: calendarEventsTable,
  features: featuresTable,
};

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Team = typeof teamsTable.$inferSelect;
export type NewTeam = typeof teamsTable.$inferInsert;
export type TeamMembership = typeof teamMembershipsTable.$inferSelect;
export type NewTeamMembership = typeof teamMembershipsTable.$inferInsert;
export type TodoList = typeof todoListsTable.$inferSelect;
export type NewTodoList = typeof todoListsTable.$inferInsert;
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type ShoppingList = typeof shoppingListsTable.$inferSelect;
export type NewShoppingList = typeof shoppingListsTable.$inferInsert;
export type ShoppingItem = typeof shoppingItemsTable.$inferSelect;
export type NewShoppingItem = typeof shoppingItemsTable.$inferInsert;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
export type NewCalendarEvent = typeof calendarEventsTable.$inferInsert;
export type Feature = typeof featuresTable.$inferSelect;
export type NewFeature = typeof featuresTable.$inferInsert;