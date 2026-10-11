import type { ImageSourcePropType } from 'react-native';

import background from '../../../../assets/map/00_background.webp';
import serenity from '../../../../assets/map/10_serenity_world.webp';
import midnight from '../../../../assets/map/20_midnight_world.webp';
import artist from '../../../../assets/map/30_artist_world.webp';
import founder from '../../../../assets/map/40_founder_world.webp';
import meadow from '../../../../assets/map/50_meadow_details.webp';
import character from '../../../../assets/map/60_character.webp';
import agentPortrait from '../../../../assets/personalities/agent.webp';
import founderPortrait from '../../../../assets/personalities/founder.webp';
import monkPortrait from '../../../../assets/personalities/monk.webp';
import painterPortrait from '../../../../assets/personalities/painter.webp';
import type { WorldId } from './types';

/**
 * Metro needs static imports, so the files named in scene-layout.json are mapped here by layer
 * id. Adding a layer to the layout means adding its import here too (a test checks this).
 */
export const LAYER_SOURCES: Record<string, ImageSourcePropType> = {
  background,
  serenity,
  midnight,
  artist,
  founder,
  meadow,
  character,
};

export const PORTRAIT_SOURCES: Record<WorldId, ImageSourcePropType> = {
  serenity: monkPortrait,
  midnight: agentPortrait,
  artist: painterPortrait,
  founder: founderPortrait,
};
