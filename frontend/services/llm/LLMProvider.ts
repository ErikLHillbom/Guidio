import { Coordinates } from '../../types';

export interface LLMProvider {
  requestGuideInfo(
    poiId: string,
    poiName: string,
    userCoordinates: Coordinates,
  ): Promise<string>;
}
