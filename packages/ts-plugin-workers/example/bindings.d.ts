declare global {
  export interface Env {
    MY_DURABLE_OBJECT: DurableObject;
    MY_KV_NAMESPACE: KVNamespace;
    MY_BUCKET: R2Bucket;
    MY_SERVICE: Fetcher;
    MY_SERVICE_2: Fetcher;
    MY_QUEUE: Queue;
    MY_VARIABLE: string;
    ANOTHER_VARIABLE: string;
  }
}


export {};