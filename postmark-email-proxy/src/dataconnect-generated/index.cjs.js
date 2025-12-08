const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'suporte',
  location: 'southamerica-east1'
};
exports.connectorConfig = connectorConfig;

const createUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUser');
}
createUserRef.operationName = 'CreateUser';
exports.createUserRef = createUserRef;

exports.createUser = function createUser(dc) {
  return executeMutation(createUserRef(dc));
};

const listFaQsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListFAQs');
}
listFaQsRef.operationName = 'ListFAQs';
exports.listFaQsRef = listFaQsRef;

exports.listFaQs = function listFaQs(dc) {
  return executeQuery(listFaQsRef(dc));
};

const createMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMessage', inputVars);
}
createMessageRef.operationName = 'CreateMessage';
exports.createMessageRef = createMessageRef;

exports.createMessage = function createMessage(dcOrVars, vars) {
  return executeMutation(createMessageRef(dcOrVars, vars));
};

const getConversationsForUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetConversationsForUser');
}
getConversationsForUserRef.operationName = 'GetConversationsForUser';
exports.getConversationsForUserRef = getConversationsForUserRef;

exports.getConversationsForUser = function getConversationsForUser(dc) {
  return executeQuery(getConversationsForUserRef(dc));
};
