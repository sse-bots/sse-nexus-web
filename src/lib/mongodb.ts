import { MongoClient, MongoClientOptions, Db, Document, ObjectId } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB_NAME || "sse_bots_user";

declare global {
  // eslint-disable-next-line no-var
  var _sseMongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _sseMongoConnectPromise: Promise<MongoClient> | undefined;
}

const options: MongoClientOptions = {
  maxPoolSize: 5,
  maxIdleTimeMS: 5000,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000,
  appName: "SSE-Bots-Hub-Web",
};

function createClient(): MongoClient {
  const client = new MongoClient(uri, options);
  attachDatabasePool(client);
  return client;
}

export const mongoClient: MongoClient =
  globalThis._sseMongoClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis._sseMongoClient = mongoClient;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables.");
  }
  if (!globalThis._sseMongoConnectPromise) {
    globalThis._sseMongoConnectPromise = mongoClient.connect();
  }
  return globalThis._sseMongoConnectPromise;
}

export function getDbSync(): Db {
  return mongoClient.db(dbName);
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

/**
 * Matches Better Auth userId whether @better-auth/mongo-adapter stored it
 * as an ObjectId or a string.
 */
export function userIdFilter(userId: string): { $in: Array<string | ObjectId> } {
  const values: Array<string | ObjectId> = [userId];
  if (ObjectId.isValid(userId)) {
    values.push(new ObjectId(userId));
  }
  return { $in: values };
}

export async function getCollections() {
  const db = await getDb();
  return {
    db,
    bots: db.collection<Document>("bots"),
    keys: db.collection<Document>("activation_keys"),
    servers: db.collection<Document>("activated_servers"),
    logs: db.collection<Document>("activation_logs"),
    requests: db.collection<Document>("activation_requests"),
    guildSettings: db.collection<Document>("guild_settings"),
    announcementTemplates: db.collection<Document>("announcement_templates"),
    announcementHistory: db.collection<Document>("announcement_history"),
    botInstallations: db.collection<Document>("bot_installations"),
    webSyncEvents: db.collection<Document>("web_sync_events"),
    authUsers: db.collection<Document>("user"),
    authAccounts: db.collection<Document>("account"),
    oauthClients: db.collection<Document>("oauthClient"),
    oauthConsents: db.collection<Document>("oauthConsent"),
  };
}

export function serializeDoc<T extends Record<string, unknown>>(doc: T): T {
  return JSON.parse(
    JSON.stringify(doc, (_key, value) => {
      if (
        value &&
        typeof value === "object" &&
        typeof value.toHexString === "function"
      ) {
        return value.toHexString();
      }
      return value;
    })
  );
}
