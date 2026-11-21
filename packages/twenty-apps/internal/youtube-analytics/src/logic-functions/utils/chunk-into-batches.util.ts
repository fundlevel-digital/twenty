export const chunkIntoBatches = <TItem>(
  items: TItem[],
  batchSize: number,
): TItem[][] => {
  const batches: TItem[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
};
