export { PlatformModule } from './platform.module.js';
export {
  PolicyError,
  PolicyService,
  type PolicyValue,
  type PublishPolicyInput,
} from './policies/policy.service.js';
export { FeatureFlagService, type SetFlagInput } from './flags/feature-flag.service.js';
export {
  defineFlag,
  type FlagContext,
  type FlagDefinition,
  type FlagScope,
} from './flags/flags.js';
export { OutboxService, type PublishInput } from './outbox/outbox.service.js';
export { OutboxHandlerRegistry } from './outbox/outbox-handler.registry.js';
export {
  defineEvent,
  type EventDefinition,
  type OutboxHandler,
  type PublishedEvent,
} from './outbox/events.js';
export { Idempotent } from './idempotency/idempotent.decorator.js';
