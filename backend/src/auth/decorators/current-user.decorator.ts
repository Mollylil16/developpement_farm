import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  // #region agent log
  try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'current-user.decorator.ts:6',message:'CurrentUser decorator',data:{hasUser:!!user,userId:user?.id,userIdType:typeof user?.id,userIdLength:user?.id?.length,userIdJSON:JSON.stringify(user?.id),userKeys:user?Object.keys(user):[],dataProperty:data,requestPath:request.path,requestMethod:request.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})+'\n'); } catch(e) {}
  // #endregion
  if (data && typeof data === 'string' && user) {
    const value = user[data];
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'current-user.decorator.ts:12',message:'CurrentUser property access',data:{property:data,value,valueType:typeof value,valueLength:value?.length,valueJSON:JSON.stringify(value),userId:user.id,userIdType:typeof user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})+'\n'); } catch(e) {}
    // #endregion
    return value;
  }
  return user;
});
