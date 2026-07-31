// Manifest of locally-hosted catalog images.
// -------------------------------------------------------------------------
// IMPORTANT for the user: this is the source of truth that the app reads.
// To add a real photo:
//   1. Drop the file into `public/catalog/<bucket>/<...>.jpg`
//   2. Add (or extend) the matching key below.
//   3. The same paths are mirrored in `public/catalog/manifest.json` for
//      reference; only this TS file is read at runtime.
// -------------------------------------------------------------------------

export interface Manifest {
  categories: Record<string, string[]>;
  services:   Record<string, string[]>;
  options:    Record<string, Record<string, string[]>>;
}

export const MANIFEST: Manifest = {
  categories: {
    "mk-events":    ["categories/mk-events.jpg"],
    "mk-foods":     ["categories/mk-foods.jpg"],
    "mk-guards":    ["categories/mk-guards.jpg"],
    "mk-transport": ["categories/mk-transport.jpg"],
    "events":       ["categories/mk-events.jpg"],
    "foods":        ["categories/mk-foods.jpg"],
    "guards":       ["categories/mk-guards.jpg"],
    "transport":    ["categories/mk-transport.jpg"],
  },
  services: {
    "mascot-character": ["services/mascot-character.jpg"],
    "custom-costume":   ["services/custom-costume.jpg"],
    "car-rental":       ["services/car-rental.jpg"],
    "escort":           ["services/escort.jpg"],
    "security-detail":  ["services/security-detail.jpg"],
    "bouncers":         ["services/bouncers.jpg"],
    "ushers":           ["services/ushers.jpg"],
    "party-starters":   ["services/party-starters.jpg"],
    "money-guns":       ["services/money-guns.jpg"],
    "billboards":       ["services/billboards.jpg"],
  },
  options: {
    "car-rental": {
      "suv-standard-toyota-highlander": ["options/car-rental/suv-standard-toyota-highlander.jpg"],
      "suv-standard-lexus-rx":          ["options/car-rental/suv-standard-lexus-rx.jpg"],
      "suv-armoured-mercedes-g-wagon":  ["options/car-rental/suv-armoured-mercedes-g-wagon.jpg"],
      "suv-armoured-range-rover":       ["options/car-rental/suv-armoured-range-rover.jpg"],
      "saloon-toyota-camry":            ["options/car-rental/saloon-toyota-camry.jpg"],
      "bus-van-toyota-hiace":           ["options/car-rental/bus-van-toyota-hiace.jpg"],
      "bus-van-coaster":                ["options/car-rental/bus-van-coaster.jpg"],
    },
    "mascot-character": {
      "bumble-bee":   ["options/mascot-character/bumble-bee.jpg"],
      "panda":        ["options/mascot-character/panda.jpg"],
      "gorilla":      ["options/mascot-character/gorilla.jpg"],
      "mario":        ["options/mascot-character/mario.jpg"],
      "big-bear":     ["options/mascot-character/big-bear.jpg"],
      "teddy-bear":   ["options/mascot-character/teddy-bear.jpg"],
      "minions":      ["options/mascot-character/minions.jpg"],
      "spider-man":   ["options/mascot-character/spider-man.jpg"],
      "elsa":         ["options/mascot-character/elsa.jpg"],
      "mickey-mouse": ["options/mascot-character/mickey-mouse.jpg"],
    },
  },
};