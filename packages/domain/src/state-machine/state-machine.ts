/**
 * Every stateful aggregate has an explicit transition table, and illegal transitions throw
 * (spec §6). Aggregates define their table once with `defineMachine` and call `assertTransition`
 * before changing status.
 */
export type TransitionTable<State extends string> = Readonly<Record<State, readonly State[]>>;

export class IllegalTransitionError extends Error {
  readonly machine: string;
  readonly from: string;
  readonly to: string;

  constructor(machine: string, from: string, to: string) {
    super(`${machine} can't move from "${from}" to "${to}".`);
    this.name = 'IllegalTransitionError';
    this.machine = machine;
    this.from = from;
    this.to = to;
  }
}

export interface StateMachine<State extends string> {
  readonly name: string;
  readonly states: readonly State[];
  readonly can: (from: State, to: State) => boolean;
  /** Throws `IllegalTransitionError` unless `from → to` is in the table. */
  readonly assertTransition: (from: State, to: State) => void;
  readonly nextStates: (from: State) => readonly State[];
  /** A terminal state has no outgoing transitions. */
  readonly isTerminal: (state: State) => boolean;
}

export function defineMachine<const State extends string>(
  name: string,
  transitions: TransitionTable<State>,
): StateMachine<State> {
  const states = Object.keys(transitions) as State[];
  const allowed = new Map<string, readonly State[]>();
  for (const state of states) {
    const targets = transitions[state];
    for (const target of targets) {
      if (!(target in transitions)) {
        throw new Error(
          `${name}: "${state}" leads to "${target}", which isn't a state in the table.`,
        );
      }
    }
    allowed.set(state, Object.freeze([...targets]));
  }

  const nextStates = (from: State): readonly State[] => allowed.get(from) ?? [];
  const can = (from: State, to: State): boolean => nextStates(from).includes(to);

  return Object.freeze({
    name,
    states: Object.freeze(states),
    can,
    assertTransition: (from: State, to: State): void => {
      if (!can(from, to)) {
        throw new IllegalTransitionError(name, from, to);
      }
    },
    nextStates,
    isTerminal: (state: State): boolean => nextStates(state).length === 0,
  });
}
