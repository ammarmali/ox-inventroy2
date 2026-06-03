import React, { useCallback, useRef } from 'react';
import { DragSource, Inventory, InventoryType, Slot, SlotWithItem } from '../../typings';
import { useDrag, useDragDropManager, useDrop } from 'react-dnd';
import { useAppDispatch } from '../../store';
import { onDrop } from '../../dnd/onDrop';
import { onBuy } from '../../dnd/onBuy';
import { Items } from '../../store/items';
import { canCraftItem, canPurchaseItem, getItemUrl, isSlotWithItem } from '../../helpers';
import { onUse } from '../../dnd/onUse';
import { Locale } from '../../store/locale';
import { onCraft } from '../../dnd/onCraft';
import useNuiEvent from '../../hooks/useNuiEvent';
import { ItemsPayload } from '../../reducers/refreshSlots';
import { closeTooltip, openTooltip } from '../../store/tooltip';  // keep for context menu etc.
import { openContextMenu } from '../../store/contextMenu';
import { useMergeRefs } from '@floating-ui/react';
import SlotTooltipContent from './SlotTooltipContent';   // ★ import the tooltip content

interface SlotProps {
  inventoryId: Inventory['id'];
  inventoryType: Inventory['type'];
  inventoryGroups: Inventory['groups'];
  item: Slot;
}

const InventorySlot: React.ForwardRefRenderFunction<HTMLDivElement, SlotProps> = (
  { item, inventoryId, inventoryType, inventoryGroups },
  ref
) => {
  const manager = useDragDropManager();
  const dispatch = useAppDispatch();
  const timerRef = useRef<number | null>(null);

  const canDrag = useCallback(() => {
    return canPurchaseItem(item, { type: inventoryType, groups: inventoryGroups }) && canCraftItem(item, inventoryType);
  }, [item, inventoryType, inventoryGroups]);

  const [{ isDragging }, drag] = useDrag<DragSource, void, { isDragging: boolean }>(
    () => ({
      type: 'SLOT',
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      item: () =>
        isSlotWithItem(item, inventoryType !== InventoryType.SHOP)
          ? {
              inventory: inventoryType,
              item: {
                name: item.name,
                slot: item.slot,
              },
              image: item?.name && `url(${getItemUrl(item) || 'none'}`,
            }
          : null,
      canDrag,
    }),
    [inventoryType, item]
  );

  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
      drop: (source) => {
        dispatch(closeTooltip());
        switch (source.inventory) {
          case InventoryType.SHOP:
            onBuy(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
          case InventoryType.CRAFTING:
            onCraft(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
          default:
            onDrop(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
        }
      },
      canDrop: (source) =>
        (source.item.slot !== item.slot || source.inventory !== inventoryType) &&
        inventoryType !== InventoryType.SHOP &&
        inventoryType !== InventoryType.CRAFTING,
    }),
    [inventoryType, item]
  );

  useNuiEvent('refreshSlots', (data: { items?: ItemsPayload | ItemsPayload[] }) => {
    if (!isDragging && !data.items) return;
    if (!Array.isArray(data.items)) return;

    const itemSlot = data.items.find(
      (dataItem) => dataItem.item.slot === item.slot && dataItem.inventory === inventoryId
    );
    if (!itemSlot) return;
    manager.dispatch({ type: 'dnd-core/END_DRAG' });
  });

  const connectRef = (element: HTMLDivElement | null) => {
    if (!element) return;
    drag(drop(element));
  };

  const handleContext = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (inventoryType !== 'player' || !isSlotWithItem(item)) return;
    dispatch(openContextMenu({ item, coords: { x: event.clientX, y: event.clientY } }));
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    dispatch(closeTooltip());
    if (timerRef.current) clearTimeout(timerRef.current);
    if (event.ctrlKey && isSlotWithItem(item) && inventoryType !== 'shop' && inventoryType !== 'crafting') {
      onDrop({ item: item, inventory: inventoryType });
    } else if (event.altKey && isSlotWithItem(item) && inventoryType === 'player') {
      onUse(item);
    }
  };

  const refs = useMergeRefs([connectRef, ref]);

  return (
    <div
      ref={refs}
      onContextMenu={handleContext}
      onClick={handleClick}
      className="slot"
      style={{
        opacity: isDragging ? 0.4 : 1.0,
        border: isOver ? '1px dashed rgba(255,255,255,0.4)' : '',
      }}
    >
      {isSlotWithItem(item) && (
        <div className="item">
          <img src={getItemUrl(item as SlotWithItem)} alt={item.name} className="item-icon" />
          <div className="item-name">
            {item.metadata?.label || Items[item.name]?.label || item.name}
          </div>
        </div>
      )}

      {/* ★ THIS IS THE TOOLTIP – MUST BE A DIRECT CHILD OF .slot ★ */}
      {isSlotWithItem(item) && (
        <SlotTooltipContent item={item as SlotWithItem} inventoryType={inventoryType} />
      )}

      {/* Hotbar number */}
      {inventoryType === 'player' && item.slot <= 5 && (
        <div className="slot-number">{item.slot}</div>
      )}

      {/* Durability bar (not for shops) */}
      {inventoryType !== 'shop' && item?.durability !== undefined && (
        <div className="durability-bar" style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px' }}>
          <div className="durability-fill" style={{ width: `${item.durability}%` }} />
        </div>
      )}

      {/* Price for shop items */}
      {inventoryType === 'shop' && item?.price !== undefined && (
        <>
          {item?.currency !== 'money' && item.currency !== 'black_money' && item.price > 0 && item.currency ? (
            <div className="item-slot-currency-wrapper" style={{ position: 'absolute', bottom: '2px' }}>
              <img src={getItemUrl(item.currency)} alt="currency" style={{ width: '1.2em', height: '1.2em' }} />
              <span>{Number(item.price).toLocaleString('en-us')}</span>
            </div>
          ) : (
            item.price > 0 && (
              <div className="item-slot-price-wrapper" style={{
                position: 'absolute',
                bottom: '2px',
                color: item.currency === 'money' || !item.currency ? '#2ECC71' : '#E74C3C',
              }}>
                {Locale.$ || '$'}{Number(item.price).toLocaleString('en-us')}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(React.forwardRef(InventorySlot));