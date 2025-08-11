import { Module, OnModuleInit } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { CommandBus } from './command-bus';
import { QueryBus } from './query-bus';
import { EventBus } from './event-bus';
import {
  COMMAND_HANDLER_METADATA,
  QUERY_HANDLER_METADATA,
  EVENT_HANDLER_METADATA,
} from './decorators';

@Module({
  imports: [DiscoveryModule],
  providers: [CommandBus, QueryBus, EventBus],
  exports: [CommandBus, QueryBus, EventBus],
})
export class CqrsModule implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus
  ) {}

  onModuleInit() {
    this.registerCommandHandlers();
    this.registerQueryHandlers();
    this.registerEventHandlers();
  }

  private registerCommandHandlers() {
    const commandHandlers = this.discoveryService
      .getProviders()
      .filter(
        (wrapper) =>
          wrapper.metatype && Reflect.getMetadata(COMMAND_HANDLER_METADATA, wrapper.metatype)
      );

    commandHandlers.forEach((wrapper) => {
      const commandType = Reflect.getMetadata(COMMAND_HANDLER_METADATA, wrapper.metatype);
      const handler = wrapper.instance;
      this.commandBus.register(commandType.name, handler);
    });
  }

  private registerQueryHandlers() {
    const queryHandlers = this.discoveryService
      .getProviders()
      .filter(
        (wrapper) =>
          wrapper.metatype && Reflect.getMetadata(QUERY_HANDLER_METADATA, wrapper.metatype)
      );

    queryHandlers.forEach((wrapper) => {
      const queryType = Reflect.getMetadata(QUERY_HANDLER_METADATA, wrapper.metatype);
      const handler = wrapper.instance;
      this.queryBus.register(queryType.name, handler);
    });
  }

  private registerEventHandlers() {
    const eventHandlers = this.discoveryService
      .getProviders()
      .filter(
        (wrapper) =>
          wrapper.metatype && Reflect.getMetadata(EVENT_HANDLER_METADATA, wrapper.metatype)
      );

    eventHandlers.forEach((wrapper) => {
      const eventType = Reflect.getMetadata(EVENT_HANDLER_METADATA, wrapper.metatype);
      const handler = wrapper.instance;
      this.eventBus.register(eventType.name, handler);
    });
  }
}
