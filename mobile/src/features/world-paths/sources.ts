import type { ImageSourcePropType } from 'react-native';

import type { WorldId } from '@/features/world-map';

import artist from '../../../assets/worlds/artist.webp';
import founder from '../../../assets/worlds/founder.webp';
import midnight from '../../../assets/worlds/midnight.webp';
import serenity from '../../../assets/worlds/serenity.webp';

/** Tall meadow strips (1:3) framed with each world's trees and props. The middle stays open. */
export const PATH_BACKGROUNDS: Record<WorldId, ImageSourcePropType> = {
  serenity,
  midnight,
  artist,
  founder,
};
