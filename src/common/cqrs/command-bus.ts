import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ICommand, ICommandHandler } from './interfaces';

@Injectable()
export class CommandBus {
  private readonly logger = new Logger(CommandBus.name);
  private handlers = new Map<string, ICommandHandler<any>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register<T extends ICommand>(commandType: string, handler: ICommandHandler<T>) {
    this.handlers.set(commandType, handler);
  }

  async execute<T extends ICommand, R = any>(command: T): Promise<R> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    this.logger.log(`Executing command: ${command.type}`);
    return handler.execute(command);
  }
}
