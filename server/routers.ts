import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { platformRouter } from "./routers/platform";
import { governanceRouter } from "./routers/governance";
import { assistantRouter } from "./routers/assistant";
import { iamRouter } from "./routers/iam";
import { erpRouter } from "./routers/erp";
import { intelligenceRouter } from "./routers/intelligence";
import { adoptionRouter } from "./routers/adoption";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  platform: platformRouter,
  governance: governanceRouter,
  assistant: assistantRouter,
  iam: iamRouter,
  erp: erpRouter,
  intelligence: intelligenceRouter,
  adoption: adoptionRouter,
});

export type AppRouter = typeof appRouter;
