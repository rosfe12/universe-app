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

export const MAIN_FEED_AD_RULES = {
  firstAdAfter: 4,
  repeatInterval: 5,
} as const;

export const SCHOOL_FEED_AD_RULES = {
  firstAdAfter: 4,
  repeatInterval: 7,
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

export function injectInlineAdSlots<T extends { id: string }>(
  items: T[],
  options?: {
    firstAdAfter?: number;
    repeatInterval?: number;
  },
) {
  if (!isAdPlacementEnabled("feedInline") || adConfig.feedInterval <= 0) {
    return items.map<FeedSlot<T>>((item) => ({
      kind: "item",
      id: item.id,
      item,
    }));
  }

  const firstAdAfter = Math.max(1, options?.firstAdAfter ?? adConfig.feedInterval);
  const repeatInterval = Math.max(5, options?.repeatInterval ?? adConfig.feedInterval);

  return items.flatMap<FeedSlot<T>>((item, index) => {
    const slots: FeedSlot<T>[] = [
      {
        kind: "item",
        id: item.id,
        item,
      },
    ];

    const itemCount = index + 1;
    const passedFirstSlot = itemCount >= firstAdAfter;
    const offsetFromFirstSlot = itemCount - firstAdAfter;
    const shouldInsertAd =
      passedFirstSlot &&
      offsetFromFirstSlot % repeatInterval === 0 &&
      index < items.length - 1;

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
