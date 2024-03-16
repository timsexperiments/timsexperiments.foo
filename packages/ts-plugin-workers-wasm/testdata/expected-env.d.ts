declare global {
  export interface Env {
    BINDING_1: any;
    BINDING_2: KVNamespace;
    TEST_DB: D1Database;
    TEST_DISPATCH: DispatchNamespace;
    TEST_DO: DurableObject;
    TEST_EMAIL: Email;
    TEST_KV: KVNamespace;
    TEST_MTLS: Fetcher;
    TEST_BUCKET: R2Bucket;
    TEST_SERVICE: Fetcher;
    TEST_QUEUE: Queue;
    TEST_AI: any;
    TEST_VAR: string;
    BINDING_3: D1Database;
  }
}
