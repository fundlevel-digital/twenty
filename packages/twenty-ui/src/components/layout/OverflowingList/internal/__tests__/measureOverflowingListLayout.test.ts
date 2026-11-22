import { measureOverflowingListLayout } from '../measureOverflowingListLayout';

const measure = ({
  width,
  itemWidths,
  triggerWidth = 24,
}: {
  width: number;
  itemWidths: number[];
  triggerWidth?: number;
}) => {
  const container = document.createElement('div');
  const items = document.createElement('div');
  const trigger = document.createElement('button');
  items.style.columnGap = '4px';
  Object.defineProperty(container, 'clientWidth', { value: width });
  Object.defineProperty(trigger, 'offsetWidth', { value: triggerWidth });
  const itemElements = itemWidths.map((itemWidth) => {
    const item = document.createElement('div');
    Object.defineProperty(item, 'clientWidth', { value: itemWidth });
    items.appendChild(item);
    return item;
  });

  return measureOverflowingListLayout({
    container,
    items,
    trigger,
    itemElements,
    itemCount: itemWidths.length,
    reserveCountSpace: true,
  });
};

describe('measureOverflowingListLayout', () => {
  it('counts a partially fitting last chip as hidden instead of showing +0', () => {
    expect(
      measure({ width: 75, itemWidths: [40, 40], triggerWidth: 10 }),
    ).toEqual({
      visibleItemCount: 1,
      hasOverflow: true,
    });
  });

  it('reserves room for the count without partially displaying another chip', () => {
    expect(measure({ width: 100, itemWidths: [40, 40, 40] })).toEqual({
      visibleItemCount: 1,
      hasOverflow: true,
    });
  });

  it('does not show overflow when all chips fit', () => {
    expect(measure({ width: 100, itemWidths: [40, 40] })).toEqual({
      visibleItemCount: 2,
      hasOverflow: false,
    });
  });

  it('keeps a single long chip visible for text truncation without a +0 control', () => {
    expect(measure({ width: 75, itemWidths: [150] })).toEqual({
      visibleItemCount: 1,
      hasOverflow: false,
    });
  });
});
