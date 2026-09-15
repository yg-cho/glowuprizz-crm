import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface OperatorPrincipal {
  id: string;
  email: string;
}

export const CurrentOperator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OperatorPrincipal => {
    return ctx.switchToHttp().getRequest().user;
  },
);
