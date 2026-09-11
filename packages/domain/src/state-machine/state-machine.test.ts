import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { defineMachine, IllegalTransitionError, type TransitionTable } from './state-machine.js';

type DoorState = 'closed' | 'open' | 'locked' | 'removed';

const door = defineMachine<DoorState>('Door', {
  closed: ['open', 'locked', 'removed'],
  open: ['closed'],
  locked: ['closed'],
  removed: [],
});

describe('defineMachine()', () => {
  it('allows only the transitions in the table', () => {
    expect(door.can('closed', 'open')).toBe(true);
    expect(door.can('open', 'locked')).toBe(false);
    expect(door.can('removed', 'closed')).toBe(false);
    expect(door.nextStates('closed')).toEqual(['open', 'locked', 'removed']);
  });

  it('throws a descriptive error for an illegal transition', () => {
    expect(() => {
      door.assertTransition('closed', 'locked');
    }).not.toThrow();
    let caught: unknown;
    try {
      door.assertTransition('open', 'locked');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(IllegalTransitionError);
    expect(caught).toMatchObject({ machine: 'Door', from: 'open', to: 'locked' });
    expect(String(caught)).toContain(`Door can't move from "open" to "locked"`);
  });

  it('knows which states are terminal', () => {
    expect(door.isTerminal('removed')).toBe(true);
    expect(door.isTerminal('open')).toBe(false);
    expect(door.states).toEqual(['closed', 'open', 'locked', 'removed']);
  });

  it('treats unknown states from untyped input as having no transitions', () => {
    const fromDatabase = 'ajar' as DoorState;
    expect(door.can(fromDatabase, 'open')).toBe(false);
    expect(door.nextStates(fromDatabase)).toEqual([]);
  });

  it('refuses a table that leads to an unknown state', () => {
    const broken = { a: ['b'], b: ['c'] } as unknown as TransitionTable<'a' | 'b'>;
    expect(() => defineMachine('Broken', broken)).toThrow(/"b" leads to "c"/);
  });

  it('never reaches a state outside the table, and throws exactly when a move is illegal', () => {
    const states: DoorState[] = ['closed', 'open', 'locked', 'removed'];
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...states), { maxLength: 50 }), (attempts) => {
        let current: DoorState = 'closed';
        for (const next of attempts) {
          if (door.can(current, next)) {
            door.assertTransition(current, next);
            current = next;
          } else {
            expect(() => {
              door.assertTransition(current, next);
            }).toThrow(IllegalTransitionError);
          }
          expect(states).toContain(current);
        }
      }),
    );
  });
});
