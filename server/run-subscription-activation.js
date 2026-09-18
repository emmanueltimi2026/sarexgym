import { db } from './db.js';
import { activateDueScheduledSubscriptions } from './subscriptions.js';

try {
  const result = await activateDueScheduledSubscriptions(db);
  console.log(`Activated ${result.activated} scheduled subscription(s); expired ${result.expired} active subscription(s).`);
} finally {
  await db.close?.();
}
