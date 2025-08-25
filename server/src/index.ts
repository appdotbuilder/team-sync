import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createTeamInputSchema,
  requestTeamMembershipInputSchema,
  approveMembershipInputSchema,
  createTodoListInputSchema,
  getTeamTodoListsInputSchema,
  createTaskInputSchema,
  getTodoListTasksInputSchema,
  updateTaskInputSchema,
  createShoppingListInputSchema,
  getTeamShoppingListsInputSchema,
  createShoppingItemInputSchema,
  getShoppingListItemsInputSchema,
  updateShoppingItemInputSchema,
  createCalendarEventInputSchema,
  getTeamCalendarEventsInputSchema,
  updateCalendarEventInputSchema,
  updateFeatureInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createTeam } from './handlers/create_team';
import { getUserTeams } from './handlers/get_user_teams';
import { requestTeamMembership } from './handlers/request_team_membership';
import { approveTeamMembership } from './handlers/approve_team_membership';
import { getPendingMemberships } from './handlers/get_pending_memberships';
import { createTodoList } from './handlers/create_todo_list';
import { getTeamTodoLists } from './handlers/get_team_todo_lists';
import { createTask } from './handlers/create_task';
import { getTodoListTasks } from './handlers/get_todo_list_tasks';
import { updateTask } from './handlers/update_task';
import { createShoppingList } from './handlers/create_shopping_list';
import { getTeamShoppingLists } from './handlers/get_team_shopping_lists';
import { createShoppingItem } from './handlers/create_shopping_item';
import { getShoppingListItems } from './handlers/get_shopping_list_items';
import { updateShoppingItem } from './handlers/update_shopping_item';
import { createCalendarEvent } from './handlers/create_calendar_event';
import { getTeamCalendarEvents } from './handlers/get_team_calendar_events';
import { updateCalendarEvent } from './handlers/update_calendar_event';
import { getFeatures } from './handlers/get_features';
import { updateFeature } from './handlers/update_feature';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management (Admin)
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Team management
  createTeam: publicProcedure
    .input(createTeamInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return createTeam(input, userId);
    }),

  getUserTeams: publicProcedure
    .query(() => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return getUserTeams(userId);
    }),

  requestTeamMembership: publicProcedure
    .input(requestTeamMembershipInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return requestTeamMembership(input, userId);
    }),

  approveTeamMembership: publicProcedure
    .input(approveMembershipInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const approverId = 1; // Placeholder
      return approveTeamMembership(input, approverId);
    }),

  getPendingMemberships: publicProcedure
    .input(z.object({ teamId: z.number() }))
    .query(({ input }) => getPendingMemberships(input.teamId)),

  // Todo list management
  createTodoList: publicProcedure
    .input(createTodoListInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return createTodoList(input, userId);
    }),

  getTeamTodoLists: publicProcedure
    .input(getTeamTodoListsInputSchema)
    .query(({ input }) => getTeamTodoLists(input)),

  // Task management
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return createTask(input, userId);
    }),

  getTodoListTasks: publicProcedure
    .input(getTodoListTasksInputSchema)
    .query(({ input }) => getTodoListTasks(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  // Shopping list management
  createShoppingList: publicProcedure
    .input(createShoppingListInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return createShoppingList(input, userId);
    }),

  getTeamShoppingLists: publicProcedure
    .input(getTeamShoppingListsInputSchema)
    .query(({ input }) => getTeamShoppingLists(input)),

  // Shopping item management
  createShoppingItem: publicProcedure
    .input(createShoppingItemInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return createShoppingItem(input, userId);
    }),

  getShoppingListItems: publicProcedure
    .input(getShoppingListItemsInputSchema)
    .query(({ input }) => getShoppingListItems(input)),

  updateShoppingItem: publicProcedure
    .input(updateShoppingItemInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return updateShoppingItem(input, userId);
    }),

  // Calendar management
  createCalendarEvent: publicProcedure
    .input(createCalendarEventInputSchema)
    .mutation(({ input }) => {
      // TODO: Get actual user ID from context/auth
      const userId = 1; // Placeholder
      return createCalendarEvent(input, userId);
    }),

  getTeamCalendarEvents: publicProcedure
    .input(getTeamCalendarEventsInputSchema)
    .query(({ input }) => getTeamCalendarEvents(input)),

  updateCalendarEvent: publicProcedure
    .input(updateCalendarEventInputSchema)
    .mutation(({ input }) => updateCalendarEvent(input)),

  // Feature management (Admin)
  getFeatures: publicProcedure
    .query(() => getFeatures()),

  updateFeature: publicProcedure
    .input(updateFeatureInputSchema)
    .mutation(({ input }) => updateFeature(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();