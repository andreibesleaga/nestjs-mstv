import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  traceId?: string;
  requestId?: string;
  userId?: string | number;
  method?: string;
  url?: string;
  ip?: string;
};

const als = new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
  getStore(): RequestContextStore | undefined {
    return als.getStore();
  },
  runWith<T>(store: RequestContextStore, fn: () => T): T {
    return als.run(store, fn);
  },
  setStore(store: RequestContextStore): void {
    // Fallback for cases where runWith isn't available in the call site
    // Note: enterWith keeps the store for the current async chain
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    als.enterWith(store);
  },
};

export const getTraceId = () => RequestContext.getStore()?.traceId;
export const getRequestId = () => RequestContext.getStore()?.requestId;
export const getUserId = () => RequestContext.getStore()?.userId;
export const getMethod = () => RequestContext.getStore()?.method;
export const getUrl = () => RequestContext.getStore()?.url;
export const getIp = () => RequestContext.getStore()?.ip;
