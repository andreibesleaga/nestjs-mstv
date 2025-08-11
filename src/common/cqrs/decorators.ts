import { SetMetadata } from '@nestjs/common';

export const COMMAND_HANDLER_METADATA = 'COMMAND_HANDLER_METADATA';
export const QUERY_HANDLER_METADATA = 'QUERY_HANDLER_METADATA';
export const EVENT_HANDLER_METADATA = 'EVENT_HANDLER_METADATA';

export const CommandHandler = (command: any) => SetMetadata(COMMAND_HANDLER_METADATA, command);
export const QueryHandler = (query: any) => SetMetadata(QUERY_HANDLER_METADATA, query);
export const EventHandler = (event: any) => SetMetadata(EVENT_HANDLER_METADATA, event);
