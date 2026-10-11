import type { ImageSourcePropType } from 'react-native';

import layout from '../../../../assets/map/scene-layout.json';
import type { WorldId } from '../core/worlds';

/**
 * The home map's art layers. Placement comes from assets/map/scene-layout.json, which
 * scripts/build_map_assets.py writes; Metro needs the static requires below.
 */
export type LayerId = 'background' | WorldId | 'details' | 'character';

const SOURCES: Record<LayerId, ImageSourcePropType> = {
  background: require('../../../../assets/map/00_background.webp'),
  serenity: require('../../../../assets/map/10_serenity.webp'),
  midnight: require('../../../../assets/map/20_midnight.webp'),
  artist: require('../../../../assets/map/30_artist.webp'),
  founder: require('../../../../assets/map/40_founder.webp'),
  details: require('../../../../assets/map/50_details.webp'),
  character: require('../../../../assets/map/60_character.webp'),
};

export interface SceneLayer {
  id: LayerId;
  order: number;
  source: ImageSourcePropType;
  /** Fractions of the canvas (0-1), so the scene scales uniformly to any width. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export const CANVAS_ASPECT = layout.canvas.height / layout.canvas.width;

export const SCENE_LAYERS: SceneLayer[] = layout.layers
  .map((layer) => ({
    id: layer.id as LayerId,
    order: layer.order,
    source: SOURCES[layer.id as LayerId],
    left: layer.left / layout.canvas.width,
    top: layer.top / layout.canvas.height,
    width: layer.width / layout.canvas.width,
    height: layer.height / layout.canvas.height,
  }))
  .sort((a, b) => a.order - b.order);
