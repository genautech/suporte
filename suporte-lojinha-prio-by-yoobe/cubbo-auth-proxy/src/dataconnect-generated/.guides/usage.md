# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUser, listFaQs, createMessage, getConversationsForUser } from '@dataconnect/generated';


// Operation CreateUser: 
const { data } = await CreateUser(dataConnect);

// Operation ListFAQs: 
const { data } = await ListFaQs(dataConnect);

// Operation CreateMessage:  For variables, look at type CreateMessageVars in ../index.d.ts
const { data } = await CreateMessage(dataConnect, createMessageVars);

// Operation GetConversationsForUser: 
const { data } = await GetConversationsForUser(dataConnect);


```