// Metro bundles image files as assets; importing one gives an Image `source`.
declare module '*.webp' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}
