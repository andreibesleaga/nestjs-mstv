import { Injectable, Logger } from '@nestjs/common';
import { IEvent, IEventHandler } from './interfaces';

@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private handlers = new Map<string, IEventHandler<any>[]>();

  register<T extends IEvent>(eventType: string, handler: IEventHandler<T>) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish<T extends IEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    this.logger.log(`Publishing event: ${event.type} with ${handlers.length} handlers`);

    await Promise.all(
      handlers.map((handler) =>
        handler
          .handle(event)
          .catch((error) => this.logger.error(`Event handler failed for ${event.type}:`, error))
      )
    );
  }
}
