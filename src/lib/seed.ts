import { db } from "@/db";
import { maps, points } from "@/db/schema";
import { count } from "drizzle-orm";

/** Legt beim ersten Start eine Demo-Karte mit den Punkten aus den Beispielfotos an. */
export async function seedDemoIfEmpty(): Promise<void> {
  const [{ value }] = await db.select({ value: count() }).from(maps);
  if (value > 0) return;

  const [map] = await db
    .insert(maps)
    .values({
      name: "WOMO-Tour: Schweizer Jura & Basel",
      description:
        "Stellplätze und Wanderparkplätze aus dem Reiseführer – per Foto erfasst.",
      color: "#E9A13B",
    })
    .returning();

  await db.insert(points).values([
    {
      mapId: map.id,
      refNumber: "003",
      name: "Lörrach – Laguna Badeland",
      category: "Offizieller WOMO-Stellplatz",
      lat: 47.5861111,
      lng: 7.6178889,
      altitude: 260,
      maxWomos: "6",
      equipment: "Keine.",
      description:
        "Ebener, mit Bäumen unterteilter Schotterplatz am Rand des Parkplatzes, der von einer Grünanlage umgeben ist. Die Autobahn ist nahe und hörbar. Zufahrt auf den Parkplatz durch eine Schranke.",
      prices: "€ 9, zahlbar an der Kasse des Bades.",
      directions:
        "Direkt vor der Grenze zwischen Lörrach und Basel gelegen. Von Lörrach auf der B 317 in Richtung Schweiz und kurz vor der Grenze links den Hinweisschildern zum Bad folgen.",
      rawGps: "N 47°35'10.0\" · E 7°37'04.4\"",
      source: "demo",
    },
    {
      mapId: map.id,
      refNumber: "004",
      name: "Lörrach – Camping Dreiländer Camp",
      category: "Offizieller WOMO-Stellplatz",
      lat: 47.6247778,
      lng: 7.66175,
      altitude: 290,
      maxWomos: "25",
      equipment: "V/E, Strom, WLAN.",
      description:
        "Ebener Schotterparkplatz mit wenigen Bäumen, Grüttweg.",
      rawGps: "N 47°37'29.2\" · E 7°39'42.3\"",
      source: "demo",
    },
    {
      mapId: map.id,
      refNumber: "005",
      name: "Dornach – Ruine Dorneck",
      category: "WOMO-Wanderparkplatz",
      lat: 47.4830556,
      lng: 7.6275,
      altitude: 438,
      maxWomos: "1",
      equipment: "Keine.",
      description:
        "Der Platz besteht aus zwei Parkbuchten unter Bäumen am Waldrand. Der untere Platz ist extrem schräg. Auf dem oberen geschotterten Platz neben der wenig befahrenen Straße (Sackgasse) findet man mit kompakten Womos ein geschütztes Plätzchen für eine Übernachtung. Schöne Grillplätze an der Burgruine.",
      directions:
        "Im Ort den Wegweisern durch die schmalen Straßen eines Wohngebietes hinauf zur Ruine und zum Gasthof Schlosshof folgen.",
      rawGps: "N 47°28'59.0\" · E 7°37'39.0\"",
      source: "demo",
    },
    {
      mapId: map.id,
      refNumber: "041",
      name: "Les Brenets – Camping Lac des Brenets",
      category: "WOMO-Campingplatz",
      lat: 47.0658333,
      lng: 6.6994444,
      altitude: 801,
      equipment: "V/E, Restaurant, Spielplatz, Grillplatz, WLAN.",
      description:
        "Komfortabler 4-Sterne-Camping am Ortsrand. Durch die Lage am Hang hat man auf vielen Terrassen schönen Doubsblick. Bademöglichkeit am Fluss. Geöffnet: April bis Oktober.",
      prices: "CHF 26–30, Strom CHF 4, plus Kurtaxe, www.camping-brenets.ch.",
      directions:
        "Im Ort in Richtung Pré du Lac bzw. Frankreich fahren. Links der Straße kurz vor der Brücke über den gestauten Doubs.",
      phone: "0041 (0) 32 9321618",
      rawGps: "N 47°03'57.0\" · E 6°41'58.0\"",
      source: "demo",
    },
    {
      mapId: map.id,
      refNumber: "052",
      name: "L'Auberson",
      category: "Offizieller WOMO-Stellplatz",
      lat: 46.8202778,
      lng: 6.4727778,
      altitude: 1092,
      maxWomos: "2-3",
      equipment: "Euro Relais.",
      description:
        "Ebener asphaltierter Parkplatz am Ortsrand, Gasthof im Ort, max. 24 Stunden.",
      directions: "An der Ortseinfahrt links.",
      rawGps: "N 46°49'13.0\" · E 6°28'22.0\"",
      source: "demo",
    },
    {
      mapId: map.id,
      refNumber: "053",
      name: "Saint-Croix / La Gittaz",
      category: "WOMO-Picknickplatz",
      lat: 46.8043333,
      lng: 6.4796667,
      altitude: 1241,
      maxWomos: "2",
      equipment: "Picknicktische, Grillhütte.",
      description:
        "Parkplatz auf Naturboden am Waldrand und an zwei Holzhäusern. Kein Campingverhalten. Ein Schild verbietet das Zelten. Kleiner Gasthof in zehn Minuten zu Fuß erreichbar. Ein beliebtes Wanderziel in der Nähe sind die Aiguilles de Baulmes.",
      directions:
        "Von Sainte-Croix rechts in Richtung La Gittaz Dessous und hinter den Häusern des Mini-Ortes links hinunter zum Picknickplatz.",
      rawGps: "N 46°48'15.6\" · E 6°28'46.8\"",
      source: "demo",
      favorite: true,
    },
  ]);
}
