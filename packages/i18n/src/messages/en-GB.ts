/**
 * The en-GB catalogue (spec §3, §9; ADR-0017). Every string a person reads comes from here: plain
 * English, sentence case, no jargon. Messages use ICU syntax, and namespaces follow features, not
 * apps, so a phrase is translated once however many apps show it.
 */
export const messages = {
  common: {
    appName: 'VoltDrop',
  },
  health: {
    checking: 'Checking the API…',
    up: 'The API is up',
    unreachable: "Can't reach the API",
  },
} as const;

export type Messages = typeof messages;
