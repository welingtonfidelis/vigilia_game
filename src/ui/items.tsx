// Peças de equipamento na tela: o cartão da peça (nome na cor da raridade, afixos e
// história) e o ícone do encaixe.

import { AFFIXES, itemName, RARITY_NAMES } from '../sim/index.ts';
import type { ClassId, Item, ItemSlot, World } from '../sim/index.ts';
import { ArmorIcon, WeaponIcon } from './PixelSprite.tsx';

export function SlotIcon(props: { slot: ItemSlot; classId: ClassId | null; size?: number }) {
  const size = props.size ?? 44;
  if (props.slot === 'weapon' && props.classId) return <WeaponIcon classId={props.classId} scale={size / 24} />;
  if (props.slot === 'armor') return <ArmorIcon size={size} />;
  return (
    <span class="amulet-icon" style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
      ◈
    </span>
  );
}

/** "Rara · tier 8", "Lendária · amuleto". */
export function rarityLine(item: Item): string {
  const rarity = RARITY_NAMES[item.rarity].f;
  const label = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  return item.slot === 'amulet' ? `${label} · amuleto` : `${label} · tier ${item.tier}`;
}

/** Quem já usou a peça, para a história ("usada por Aldric e Mira"). */
function ownersText(world: World, item: Item): string {
  const names = item.owners.map((id) => world.heroes.find((h) => h.id === id)?.name).filter((n): n is string => !!n);
  if (names.length === 0) return '';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  return ` Usada por ${list}.`;
}

export function ItemCard(props: { world: World; item: Item; classId: ClassId | null; children?: preact.ComponentChildren }) {
  const { world, item, classId } = props;
  const name = itemName(item, classId);
  return (
    <div class={`item-card rarity-${item.rarity}`}>
      <span class="item-icon">
        <SlotIcon slot={item.slot} classId={classId} />
      </span>
      <span class="item-text">
        <strong>{name}</strong>
        <small class="item-rarity">{rarityLine(item)}</small>
        {item.affixes.length > 0 && (
          <ul class="item-affixes">
            {item.affixes.map((a, i) => (
              <li key={`${a}${i}`}>{AFFIXES[a].effect}</li>
            ))}
          </ul>
        )}
        <small class="item-origin">
          {item.origin.charAt(0).toUpperCase() + item.origin.slice(1)}.{ownersText(world, item)}
          {item.history && item.history.length > 0 && ` Depois, ${item.history.join('; ')}.`}
        </small>
        {props.children}
      </span>
    </div>
  );
}
