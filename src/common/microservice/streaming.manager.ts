import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StreamingMessage } from '../types';

@Injectable()
export class StreamingManager {
  private readonly logger = new Logger(StreamingManager.name);
  private streamingSubjects: Map<string, Subject<StreamingMessage>> = new Map();
  private isEnabled = false;
  private readonly statusSubject = new BehaviorSubject<{
    enabled: boolean;
    channels: string[];
    messageCount: number;
  }>({
    enabled: false,
    channels: [],
    messageCount: 0,
  });

  private messageCount = 0;

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    this.isEnabled = this.configService.get<boolean>('ENABLE_STREAMING', true);
    
    if (!this.isEnabled) {
      this.logger.log('Streaming is disabled by configuration');
      return;
    }

    const channels = this.getConfiguredChannels();
    this.initializeChannels(channels);
    
    this.updateStatus();
    this.logger.log(`Streaming initialized with ${channels.length} channels`);
  }

  async destroy(): Promise<void> {
    this.streamingSubjects.forEach((subject, channel) => {
      subject.complete();
      this.logger.debug(`Streaming channel ${channel} closed`);
    });
    
    this.streamingSubjects.clear();
    this.statusSubject.complete();
    this.logger.log('Streaming manager destroyed');
  }

  publish<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string, 
    data: T, 
    source = 'system'
  ): void {
    if (!this.isEnabled) {
      this.logger.debug('Streaming disabled - message ignored');
      return;
    }

    const subject = this.streamingSubjects.get(channel);
    if (!subject) {
      this.logger.warn(`Channel ${channel} does not exist`);
      return;
    }

    const message: StreamingMessage<T> = {
      id: this.generateMessageId(),
      data,
      timestamp: new Date().toISOString(),
      source,
      type: channel,
    };

    subject.next(message);
    this.messageCount++;
    this.updateStatus();
    
    this.logger.debug(`Message published to channel ${channel}`, { messageId: message.id });
  }

  subscribe<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string
  ): Observable<StreamingMessage<T>> {
    if (!this.isEnabled) {
      this.logger.warn('Streaming is disabled');
      return new Observable(subscriber => subscriber.complete());
    }

    const subject = this.streamingSubjects.get(channel);
    if (!subject) {
      this.logger.error(`Channel ${channel} does not exist`);
      return new Observable(subscriber => subscriber.complete());
    }

    return subject.asObservable() as Observable<StreamingMessage<T>>;
  }

  subscribeFiltered<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string,
    filterFn: (message: StreamingMessage<T>) => boolean
  ): Observable<StreamingMessage<T>> {
    return this.subscribe<T>(channel).pipe(filter(filterFn));
  }

  subscribeToSource<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string,
    source: string
  ): Observable<StreamingMessage<T>> {
    return this.subscribeFiltered<T>(channel, (message) => message.source === source);
  }

  getChannelData<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string
  ): Observable<T> {
    return this.subscribe<T>(channel).pipe(map(message => message.data));
  }

  createChannel(channel: string): void {
    if (this.streamingSubjects.has(channel)) {
      this.logger.warn(`Channel ${channel} already exists`);
      return;
    }

    this.streamingSubjects.set(channel, new Subject<StreamingMessage>());
    this.updateStatus();
    this.logger.log(`Created streaming channel: ${channel}`);
  }

  destroyChannel(channel: string): void {
    const subject = this.streamingSubjects.get(channel);
    if (subject) {
      subject.complete();
      this.streamingSubjects.delete(channel);
      this.updateStatus();
      this.logger.log(`Destroyed streaming channel: ${channel}`);
    }
  }

  getChannels(): string[] {
    return Array.from(this.streamingSubjects.keys());
  }

  getStatus(): Observable<{
    enabled: boolean;
    channels: string[];
    messageCount: number;
  }> {
    return this.statusSubject.asObservable();
  }

  isChannelActive(channel: string): boolean {
    return this.streamingSubjects.has(channel);
  }

  getMetrics(): {
    enabled: boolean;
    totalChannels: number;
    totalMessages: number;
    channels: { name: string; active: boolean }[];
  } {
    return {
      enabled: this.isEnabled,
      totalChannels: this.streamingSubjects.size,
      totalMessages: this.messageCount,
      channels: this.getChannels().map(name => ({
        name,
        active: this.isChannelActive(name),
      })),
    };
  }

  private getConfiguredChannels(): string[] {
    const channelsConfig = this.configService.get<string>(
      'STREAMING_CHANNELS',
      'user-events,system-metrics,audit-logs,notifications,real-time-data'
    );
    
    return channelsConfig
      .split(',')
      .map(channel => channel.trim())
      .filter(channel => channel.length > 0);
  }

  private initializeChannels(channels: string[]): void {
    channels.forEach(channel => {
      this.streamingSubjects.set(channel, new Subject<StreamingMessage>());
      this.logger.debug(`Initialized streaming channel: ${channel}`);
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStatus(): void {
    this.statusSubject.next({
      enabled: this.isEnabled,
      channels: this.getChannels(),
      messageCount: this.messageCount,
    });
  }
}
