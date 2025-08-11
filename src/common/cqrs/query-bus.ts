import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IQuery, IQueryHandler } from './interfaces';

@Injectable()
export class QueryBus {
  private readonly logger = new Logger(QueryBus.name);
  private handlers = new Map<string, IQueryHandler<any>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register<T extends IQuery>(queryType: string, handler: IQueryHandler<T>) {
    this.handlers.set(queryType, handler);
  }

  async execute<T extends IQuery, R = any>(query: T): Promise<R> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No handler registered for query: ${query.type}`);
    }

    this.logger.log(`Executing query: ${query.type}`);
    return handler.execute(query);
  }
}
