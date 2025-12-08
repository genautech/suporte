import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Agent_Key {
  id: UUIDString;
  __typename?: 'Agent_Key';
}

export interface Conversation_Key {
  id: UUIDString;
  __typename?: 'Conversation_Key';
}

export interface CreateMessageData {
  message_insert: Message_Key;
}

export interface CreateMessageVariables {
  conversationId: UUIDString;
  text: string;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface FAQ_Key {
  id: UUIDString;
  __typename?: 'FAQ_Key';
}

export interface GetConversationsForUserData {
  conversations: ({
    id: UUIDString;
    createdAt: TimestampString;
    status: string;
  } & Conversation_Key)[];
}

export interface ListFaQsData {
  fAQS: ({
    id: UUIDString;
    question: string;
    answer: string;
    category?: string | null;
    createdAt: TimestampString;
  } & FAQ_Key)[];
}

export interface Message_Key {
  id: UUIDString;
  __typename?: 'Message_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateUserData, undefined>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(): MutationPromise<CreateUserData, undefined>;
export function createUser(dc: DataConnect): MutationPromise<CreateUserData, undefined>;

interface ListFaQsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFaQsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListFaQsData, undefined>;
  operationName: string;
}
export const listFaQsRef: ListFaQsRef;

export function listFaQs(): QueryPromise<ListFaQsData, undefined>;
export function listFaQs(dc: DataConnect): QueryPromise<ListFaQsData, undefined>;

interface CreateMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMessageVariables): MutationRef<CreateMessageData, CreateMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMessageVariables): MutationRef<CreateMessageData, CreateMessageVariables>;
  operationName: string;
}
export const createMessageRef: CreateMessageRef;

export function createMessage(vars: CreateMessageVariables): MutationPromise<CreateMessageData, CreateMessageVariables>;
export function createMessage(dc: DataConnect, vars: CreateMessageVariables): MutationPromise<CreateMessageData, CreateMessageVariables>;

interface GetConversationsForUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetConversationsForUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetConversationsForUserData, undefined>;
  operationName: string;
}
export const getConversationsForUserRef: GetConversationsForUserRef;

export function getConversationsForUser(): QueryPromise<GetConversationsForUserData, undefined>;
export function getConversationsForUser(dc: DataConnect): QueryPromise<GetConversationsForUserData, undefined>;

