import shared from '../../../../assets/tokens.json';
import { brand, scene } from '../tokens';

describe('design tokens', () => {
  it('match assets/tokens.json, which the web app shares', () => {
    expect(shared.brand).toMatchObject(brand);
    expect(shared.scene).toEqual(scene);
  });
});
