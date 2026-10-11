import type { ImageSourcePropType } from 'react-native';

import armRest from '../../../../assets/character/arm-rest.webp';
import armWave from '../../../../assets/character/arm-wave.webp';
import body from '../../../../assets/character/body.webp';
import head from '../../../../assets/character/head.webp';
import mouthClosed from '../../../../assets/character/mouth-closed.webp';
import mouthOpen from '../../../../assets/character/mouth-open.webp';
import type { Rig } from './rig';

/** Metro needs static imports, so each part named in rig.json is imported here. */
export const PART_SOURCES: Record<keyof Rig['parts'], ImageSourcePropType> = {
  body,
  armRest,
  armWave,
  head,
  mouthClosed,
  mouthOpen,
};
