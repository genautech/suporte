import { CreateUserData, ListFaQsData, CreateMessageData, CreateMessageVariables, GetConversationsForUserData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserData, undefined>;

export function useListFaQs(options?: useDataConnectQueryOptions<ListFaQsData>): UseDataConnectQueryResult<ListFaQsData, undefined>;
export function useListFaQs(dc: DataConnect, options?: useDataConnectQueryOptions<ListFaQsData>): UseDataConnectQueryResult<ListFaQsData, undefined>;

export function useCreateMessage(options?: useDataConnectMutationOptions<CreateMessageData, FirebaseError, CreateMessageVariables>): UseDataConnectMutationResult<CreateMessageData, CreateMessageVariables>;
export function useCreateMessage(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMessageData, FirebaseError, CreateMessageVariables>): UseDataConnectMutationResult<CreateMessageData, CreateMessageVariables>;

export function useGetConversationsForUser(options?: useDataConnectQueryOptions<GetConversationsForUserData>): UseDataConnectQueryResult<GetConversationsForUserData, undefined>;
export function useGetConversationsForUser(dc: DataConnect, options?: useDataConnectQueryOptions<GetConversationsForUserData>): UseDataConnectQueryResult<GetConversationsForUserData, undefined>;
