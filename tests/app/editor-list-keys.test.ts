import { describe, it, expect } from "vitest";
import {
  identityIndexMap,
  moveIndexMap,
  remapIndexedKey,
  remapIndexedKeys,
  remapIndexedRecord,
  removalIndexMap,
} from "@/app/_editor/listKeys";

const P = "testimonials:testimonials.items";

describe("remapIndexedKey", () => {
  it("leaves keys addressing another field alone", () => {
    expect(remapIndexedKey("testimonials:testimonials.h2", P, [0, 1])).toBe("testimonials:testimonials.h2");
    expect(remapIndexedKey("hero:hero.videoLabel", P, [0, 1])).toBe("hero:hero.videoLabel");
  });

  it("leaves a non-numeric segment alone", () => {
    expect(remapIndexedKey(`${P}.count`, P, [0, 1])).toBe(`${P}.count`);
  });

  it("moves a key to its item's new index", () => {
    expect(remapIndexedKey(`${P}.2.name`, P, [2, 0, 1])).toBe(`${P}.1.name`);
  });

  it("drops a key whose item was removed", () => {
    expect(remapIndexedKey(`${P}.1.name`, P, [0, -1, 1])).toBeNull();
  });

  it("drops a key pointing past the end of the list", () => {
    // The corruption this whole module exists to fix: "…items.7.name" left
    // behind on a 6-item list, which blanked out the next card added.
    expect(remapIndexedKey(`${P}.7.name`, P, identityIndexMap(6))).toBeNull();
  });
});

describe("index maps", () => {
  it("appending clears whatever the new slot inherited", () => {
    const keys = [`${P}.0.name`, `${P}.6.name`, `${P}.7.role`];
    // A 6-item list gaining a 7th: index 6 is the brand-new card.
    expect(remapIndexedKeys(keys, P, identityIndexMap(6))).toEqual([`${P}.0.name`]);
  });

  it("removal shifts every later key down by one", () => {
    const keys = [`${P}.0.name`, `${P}.1.role`, `${P}.3.quote`];
    expect(remapIndexedKeys(keys, P, removalIndexMap(4, 1))).toEqual([`${P}.0.name`, `${P}.2.quote`]);
  });

  it("removal keeps the deleted item's own keys from re-applying to its successor", () => {
    // Delete card 1 of 3; card 2's hidden name must land on 1, and card 1's
    // own hidden name must NOT stay behind on the item that slid into slot 1.
    expect(remapIndexedKeys([`${P}.1.name`, `${P}.2.name`], P, removalIndexMap(3, 1)))
      .toEqual([`${P}.1.name`]);
  });

  it("reordering carries keys with the item that moved", () => {
    // Drag the last of 3 cards to the front: 2→0, 0→1, 1→2.
    expect(moveIndexMap(3, 2, 0)).toEqual([1, 2, 0]);
    expect(remapIndexedKeys([`${P}.2.role`], P, moveIndexMap(3, 2, 0))).toEqual([`${P}.0.role`]);
  });

  it("reordering forwards shifts the passed-over items back", () => {
    // Drag the first of 3 cards to the end: 0→2, 1→0, 2→1.
    expect(moveIndexMap(3, 0, 2)).toEqual([2, 0, 1]);
  });

  it("a no-op move leaves every key where it was", () => {
    expect(moveIndexMap(4, 2, 2)).toEqual([0, 1, 2, 3]);
  });
});

describe("remapIndexedRecord", () => {
  it("remaps imageSizes the same way as hiddenFields", () => {
    const sizes = { [`${P}.2.avatar`]: "bigger" as const, "hero:hero.image": "full" as const };
    expect(remapIndexedRecord(sizes, P, removalIndexMap(3, 0))).toEqual({
      [`${P}.1.avatar`]: "bigger",
      "hero:hero.image": "full",
    });
  });
});
