export interface ICommand {
  readonly type: string;
}

export interface IQuery {
  readonly type: string;
}

export interface ICommandHandler<T extends ICommand, R = any> {
  execute(command: T): Promise<R>;
}

export interface IQueryHandler<T extends IQuery, R = any> {
  execute(query: T): Promise<R>;
}

export interface IEvent {
  readonly type: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
}

export interface IEventHandler<T extends IEvent> {
  handle(event: T): Promise<void>;
}
