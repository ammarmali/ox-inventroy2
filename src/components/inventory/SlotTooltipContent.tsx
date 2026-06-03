import React, { Fragment, useMemo } from 'react';
import { Inventory, SlotWithItem } from '../../typings';
import { Items } from '../../store/items';
import { Locale } from '../../store/locale';
import { useAppSelector } from '../../store';
import { getItemUrl } from '../../helpers';

// Fallback image if getItemUrl returns an empty or broken URL
const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23fff" font-size="12" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';

const SlotTooltipContent: React.FC<{
  item: SlotWithItem;
  inventoryType: Inventory['type'];
}> = ({ item, inventoryType }) => {
  const additionalMetadata = useAppSelector((state) => state.inventory.additionalMetadata);
  const itemData = useMemo(() => Items[item.name], [item]);
  const description = item.metadata?.description || itemData?.description || 'No description available.';
  const ammoName = itemData?.ammoName && Items[itemData?.ammoName]?.label;

  // Get image URL, fallback to placeholder if empty
  const imageUrl = getItemUrl(item) || FALLBACK_IMAGE;

  return (
    <div className="inventory-tooltip">
      {/* If no item data, still show basic info */}
      {!itemData ? (
        <div style={{ width: '100%', textAlign: 'center', padding: '20px 0' }}>
          <div className="tooltip-title">{item.name}</div>
          <p style={{ fontSize: '13px', color: '#a0b0d0' }}>No additional data.</p>
        </div>
      ) : (
        <>
          <div className="tooltip-left">
            <div className="tooltip-icon-box">
              <img src={imageUrl} alt={item.name} onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
            </div>
            <div className="stat-row">
              <span>WT</span>
              <span>{item.weight >= 1000 ? `${(item.weight / 1000).toFixed(2)}kg` : `${item.weight || 0}g`}</span>
            </div>
          </div>
          <div className="tooltip-right">
            <div className="tooltip-title">
              {item.metadata?.label || itemData.label || item.name || 'Unknown Item'}
            </div>
            <div className="tooltip-subtitle">
              {item.metadata?.type || itemData?.type || 'Misc'}
            </div>
            {description && (
              <p style={{ fontSize: '13px', color: '#a0b0d0', margin: '10px 0' }}>{description}</p>
            )}
            {inventoryType !== 'crafting' ? (
              <>
                {item.durability !== undefined && item.durability !== null && (
                  <>
                    <div className="durability-label">{Locale.ui_durability || 'Durability'}</div>
                    <div className="durability-bar">
                      <div className="durability-fill" style={{ width: `${item.durability}%` }} />
                    </div>
                  </>
                )}
                {item.metadata?.ammo !== undefined && <p>{Locale.ui_ammo || 'Ammo'}: {item.metadata.ammo}</p>}
                {ammoName && <p>{Locale.ammo_type || 'Ammo Type'}: {ammoName}</p>}
                {item.metadata?.serial && <p>{Locale.ui_serial || 'Serial'}: {item.metadata.serial}</p>}
                {item.metadata?.components && item.metadata.components.length > 0 && (
                  <p>
                    {Locale.ui_components || 'Components'}:{' '}
                    {item.metadata.components.map((comp: string | number, idx: number, arr: string | any[]) =>
                      idx + 1 === arr.length ? (Items[comp]?.label || comp) : (Items[comp]?.label || comp) + ', '
                    )}
                  </p>
                )}
                {item.metadata?.weapontint && <p>{Locale.ui_tint || 'Tint'}: {item.metadata.weapontint}</p>}
                {additionalMetadata.map((data, idx) => (
                  <Fragment key={`meta-${idx}`}>
                    {item.metadata && item.metadata[data.metadata] !== undefined && (
                      <p>{data.value}: {item.metadata[data.metadata]}</p>
                    )}
                  </Fragment>
                ))}
              </>
            ) : (
              <div className="tooltip-ingredients">
                {item.ingredients &&
                  Object.entries(item.ingredients).map(([ing, count]) => (
                    <div className="tooltip-ingredient" key={ing}>
                      <img src={getItemUrl(ing) || FALLBACK_IMAGE} alt={ing} onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                      <p>
                        {count >= 1
                          ? `${count}x ${Items[ing]?.label || ing}`
                          : count === 0
                          ? Items[ing]?.label || ing
                          : `${(count * 100).toFixed(0)}% ${Items[ing]?.label || ing}`}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SlotTooltipContent;