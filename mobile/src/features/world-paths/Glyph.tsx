import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { GoalIcon } from './types';

export type GlyphName = GoalIcon | 'check' | 'mic' | 'back';

type Props = { name: GlyphName; size?: number; color: string };

/** Rounded line icons on a 24-unit grid. Edit the paths here to change the art. */
export function Glyph({ name, size = 24, color }: Props) {
  const line = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shape(name, line, color)}
    </Svg>
  );
}

type Line = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

function shape(name: GlyphName, line: Line, color: string) {
  switch (name) {
    case 'check':
      return <Path {...line} strokeWidth={2.6} d="M5 12.5l4.5 4.5L19 7" />;
    case 'back':
      return <Path {...line} strokeWidth={2.4} d="M14.5 5.5L8 12l6.5 6.5" />;
    case 'mic':
      return (
        <>
          <Rect {...line} x={9} y={3} width={6} height={11} rx={3} />
          <Path {...line} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
        </>
      );
    case 'sprout':
      return (
        <>
          <Path {...line} d="M12 21v-8" />
          <Path {...line} d="M12 13C12 9.5 9.5 7 5 7c0 4 2.8 6 7 6z" />
          <Path {...line} d="M12 11c0-3.5 2.6-6 7-6 0 4-2.8 6-7 6z" />
        </>
      );
    case 'lotus':
      return (
        <>
          <Path {...line} d="M12 5c2 2 3 4.5 3 7s-1.3 4-3 5c-1.7-1-3-2.5-3-5s1-5 3-7z" />
          <Path {...line} d="M9.2 9.6C6.6 9.1 4.1 10.1 3 12c1 3 4.5 5 9 5" />
          <Path {...line} d="M14.8 9.6c2.6-.5 5.1.5 6.2 2.4-1 3-4.5 5-9 5" />
          <Path {...line} d="M5 20.5h14" />
        </>
      );
    case 'people':
      return (
        <>
          <Circle {...line} cx={9} cy={8} r={3} />
          <Path {...line} d="M3.5 19.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
          <Circle {...line} cx={17} cy={9} r={2.4} />
          <Path {...line} d="M15.6 14.4c2.8.2 4.9 2.1 4.9 4.9" />
        </>
      );
    case 'id':
      return (
        <>
          <Rect {...line} x={3} y={5} width={18} height={14} rx={2.5} />
          <Circle {...line} cx={9} cy={11} r={2.2} />
          <Path {...line} d="M5.8 16.2c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 14h3" />
        </>
      );
    case 'signpost':
      return (
        <>
          <Path {...line} d="M12 3v18" />
          <Path {...line} d="M12 5h6.5l2 2.2-2 2.3H12" />
          <Path {...line} d="M12 12H5.5l-2 2.2 2 2.3H12" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle {...line} cx={10.8} cy={10.8} r={6.3} />
          <Path {...line} strokeWidth={2.4} d="M15.6 15.6l4.6 4.6" />
        </>
      );
    case 'briefcase':
      return (
        <>
          <Rect {...line} x={3} y={7.5} width={18} height={12} rx={2.5} />
          <Path {...line} d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18" />
        </>
      );
    case 'sketch':
      return (
        <>
          <Path {...line} d="M4 20l1.2-4.2L15.5 5.5a2.1 2.1 0 0 1 3 3L8.2 18.8 4 20z" />
          <Path {...line} d="M13.5 7.5l3 3" />
        </>
      );
    case 'palette':
      return (
        <>
          <Path
            {...line}
            d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-1.2-1-1.6-1-2.6 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"
          />
          <Circle cx={7.5} cy={11} r={1.3} fill={color} />
          <Circle cx={10} cy={7} r={1.3} fill={color} />
          <Circle cx={14.5} cy={7} r={1.3} fill={color} />
          <Circle cx={17} cy={10.5} r={1.3} fill={color} />
        </>
      );
    case 'image':
      return (
        <>
          <Rect {...line} x={3} y={4.5} width={18} height={15} rx={2.5} />
          <Circle {...line} cx={9} cy={10} r={1.8} />
          <Path {...line} d="M4 18l5.5-5.5 4 4 2.5-2.5 5 4.5" />
        </>
      );
    case 'brush':
      return (
        <>
          <Path {...line} d="M19.5 4.5c-2.5 0-7 4-9 7l2 2c3-2 7-6.5 7-9z" />
          <Path {...line} d="M10.5 11.5c-2.5-.4-5 1-5 4 0 1.2-.7 2.5-2 3 3 1.5 7 .5 8.5-3" />
        </>
      );
    case 'bulb':
      return (
        <>
          <Path
            {...line}
            d="M8.6 15.5C7 14.2 6 12.4 6 10a6 6 0 0 1 12 0c0 2.4-1 4.2-2.6 5.5-.6.5-.9 1.2-.9 2H9.5c0-.8-.3-1.5-.9-2z"
          />
          <Path {...line} d="M10 21h4" />
        </>
      );
    case 'flask':
      return (
        <>
          <Path
            {...line}
            d="M9.5 3h5M10.5 3v5.5L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5.5-9.5V3"
          />
          <Path {...line} d="M7.6 14.5h8.8" />
        </>
      );
    case 'rocket':
      return (
        <>
          <Path {...line} d="M12 3c3 2 4.5 5 4.5 9l-2 4h-5l-2-4C7.5 8 9 5 12 3z" />
          <Circle {...line} cx={12} cy={9.5} r={1.6} />
          <Path {...line} d="M7.5 12.5L5 15l2.5 1.5M16.5 12.5L19 15l-2.5 1.5M10.5 19l1.5 2 1.5-2" />
        </>
      );
  }
}
