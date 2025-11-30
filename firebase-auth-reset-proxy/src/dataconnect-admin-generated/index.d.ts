import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

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

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'ListFaQs' Query. Allow users to execute without passing in DataConnect. */
export function listFaQs(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListFaQsData>>;
/** Generated Node Admin SDK operation action function for the 'ListFaQs' Query. Allow users to pass in custom DataConnect instances. */
export function listFaQs(options?: OperationOptions): Promise<ExecuteOperationResponse<ListFaQsData>>;

/** Generated Node Admin SDK operation action function for the 'CreateMessage' Mutation. Allow users to execute without passing in DataConnect. */
export function createMessage(dc: DataConnect, vars: CreateMessageVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateMessageData>>;
/** Generated Node Admin SDK operation action function for the 'CreateMessage' Mutation. Allow users to pass in custom DataConnect instances. */
export function createMessage(vars: CreateMessageVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateMessageData>>;

/** Generated Node Admin SDK operation action function for the 'GetConversationsForUser' Query. Allow users to execute without passing in DataConnect. */
export function getConversationsForUser(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetConversationsForUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetConversationsForUser' Query. Allow users to pass in custom DataConnect instances. */
export function getConversationsForUser(options?: OperationOptions): Promise<ExecuteOperationResponse<GetConversationsForUserData>>;

