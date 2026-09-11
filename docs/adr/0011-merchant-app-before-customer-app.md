# ADR-0011: Build the merchant app before the customer mobile app

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)11, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §16 (M6 and M7 swapped and renumbered)

## Context

In v1.0, M6 was the customer mobile app and M7 was the merchant app and store operations. But the customer website can already take orders from M1, while stores can't operate the service without the tablet app: ringing alerts, escalation, pick-and-scan, handover (golden scenario 11). The merchant app is on the critical path for any pilot with real stores.

## Decision

- **M6** is now *Merchant app and store operations*. It also sets up the EAS profiles and update channels that both Expo apps share.
- **M7** is now *Customer mobile app*, and uses the EAS setup from M6.
- All other milestones keep their numbers and order.

## Consequences

- A store pilot is possible after M6 (with web customers), before the customer app exists.
- The realtime `merchant` Socket.IO namespace arrives in M6. The `customer` namespace and live tracking arrive with M7 and M8. M1 uses polling.
- Plans and progress documents refer to the new numbering from spec v1.1 onwards.

## Alternatives considered

- **Keep the v1.0 order.** This delays the store-side operations that the service can't run without.
