// Curated Unsplash fallbacks used when no admin photo and no local file exists.
// Free to use, no attribution required.

const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const UNSPLASH_FALLBACKS = {
  options: {
    "bumble-bee":   U("1589182337358-2cb63099350c"),
    "panda":        U("1539537280178-3e57e2c1c4f8"),
    "gorilla":      U("1564349683136-77e08dba1ef7"),
    "mario":        U("1606503153255-59d8b8b2f9da"),
    "big-bear":     U("1525382455947-f319bc05fb35"),
    "teddy-bear":   U("1559563458-527698bf5295"),
    "minions":      U("1601814933824-fd0b574dd592"),
    "spider-man":   U("1635805737707-575885ab0820"),
    "elsa":         U("1547036967-23d11aacaee0"),
    "mickey-mouse": U("1606503153255-59d8b8b2f9da"),

    // Vehicles
    "suv-standard-toyota-highlander": U("1606664515524-ed2f786a0bd6"),
    "suv-standard-lexus-rx":          U("1606664515524-ed2f786a0bd6"),
    "suv-armoured-mercedes-g-wagon":  U("1503376780353-7e6692767b70"),
    "suv-armoured-range-rover":       U("1494976388531-d1058494cdd8"),
    "saloon-toyota-camry":            U("1552519507-da3b142c6e3d"),
    "bus-van-toyota-hiace":           U("1570125909232-eb263c188f7e"),
    "bus-van-coaster":                U("1570125909232-eb263c188f7e"),
  } as Record<string, string>,

  services: {
    "mascot-character": U("1601814933824-fd0b574dd592"),
    "custom-costume":   U("1604881988758-f76ad2f7aac1"),
    "car-rental":       U("1493238792000-8113da705763"),
    "escort":           U("1503376780353-7e6692767b70"),
    "security-detail":  U("1521791136064-7986c2920216"),
    "bouncers":         U("1521791136064-7986c2920216"),
    "ushers":           U("1530103862676-de8c9debad1d"),
    "party-starters":   U("1492684223066-81342ee5ff30"),
    "money-guns":       U("1492684223066-81342ee5ff30"),
    "billboards":       U("1492691527719-9d1e07e534b4"),
  } as Record<string, string>,

  categories: {
    "mk-events":     U("1530103862676-de8c9debad1d"),
    "events":        U("1530103862676-de8c9debad1d"),
    "mk-foods":      U("1555244162-803834f70033"),
    "foods":         U("1555244162-803834f70033"),
    "mk-guards":     U("1521791136064-7986c2920216"),
    "guards":        U("1521791136064-7986c2920216"),
    "mk-transport":  U("1493238792000-8113da705763"),
    "transport":     U("1493238792000-8113da705763"),
    "mascots":       U("1601814933824-fd0b574dd592"),
  } as Record<string, string>,

  generic: U("1492684223066-81342ee5ff30"),
};