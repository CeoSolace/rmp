declare module "appwrite" {
  export class Client {
    setEndpoint(endpoint: string): Client;
    setProject(projectId: string): Client;
    setKey?(key: string): Client;
  }

  export class Account {
    constructor(client: Client);
    get(): Promise<any>;
    create(userId: string, email: string, password: string, name?: string): Promise<any>;
    createEmailSession(email: string, password: string): Promise<any>;
    deleteSession(sessionId: string): Promise<any>;
  }

  export class Databases {
    constructor(client: Client);
    listDocuments(databaseId: string, collectionId: string, queries?: any[]): Promise<any>;
    createDocument(
      databaseId: string,
      collectionId: string,
      documentId: string,
      data: Record<string, any>,
      permissions?: string[]
    ): Promise<any>;
    updateDocument(
      databaseId: string,
      collectionId: string,
      documentId: string,
      data?: Record<string, any>,
      permissions?: string[]
    ): Promise<any>;
    getDocument(
      databaseId: string,
      collectionId: string,
      documentId: string,
      queries?: any[]
    ): Promise<any>;
    deleteDocument(
      databaseId: string,
      collectionId: string,
      documentId: string
    ): Promise<any>;
  }

  export class ID {
    static unique(): string;
  }

  export class Query {
    static equal(attribute: string, value: any): any;
    static limit(value: number): any;
    static orderAsc(attribute: string): any;
    static orderDesc(attribute: string): any;
    static search(attribute: string, value: string): any;
    static contains(attribute: string, value: string): any;
  }

  export namespace Models {
    export interface Preferences {
      [key: string]: any;
    }

    export interface User<T extends Preferences = Preferences> {
      $id: string;
      name?: string;
      email?: string;
      prefs?: T;
      [key: string]: any;
    }

    export interface Document {
      $id: string;
      $collectionId?: string;
      $databaseId?: string;
      $createdAt?: string;
      $updatedAt?: string;
      [key: string]: any;
    }
  }
}
