export type AdPlacement = "feedInline" | "hotGalleryFooter" | "lectureDetailFooter";

export const adConfig = {
  enabled: true,
  feedInterval: 6,
  placements: {
    feedInline: true,
    hotGalleryFooter: true,
    lectureDetailFooter: true,
  },
} as const;

export function isAdPlacementEnabled(placement: AdPlacement) {
  return adConfig.enabled && adConfig.placements[placement];
}

export type FeedSlot<T extends { id: string }> =
  | {
      kind: "item";
      id: string;
      item: T;
    }
  | {
      kind: "ad";
      id: string;
      placement: AdPlacement;
    };

export function injectInlineAdSlots<T extends { id: string }>(items: T[]) {
  if (!isAdPlacementEnabled("feedInline") || adConfig.feedInterval <= 0) {
    return items.map<FeedSlot<T>>((item) => ({
      kind: "item",
      id: item.id,
      item,
    }));
  }

  return items.flatMap<FeedSlot<T>>((item, index) => {
    const slots: FeedSlot<T>[] = [
      {
        kind: "item",
        id: item.id,
        item,
      },
    ];

    const shouldInsertAd =
      (index + 1) % adConfig.feedInterval === 0 && index < items.length - 1;

    if (shouldInsertAd) {
      slots.push({
        kind: "ad",
        id: `feed-inline-ad-${index + 1}`,
        placement: "feedInline",
      });
    }

    return slots;
  });
}
