import { Coordinates } from '../../types';
import { LLMProvider } from './LLMProvider';

export class DefaultLLMProvider implements LLMProvider {
  constructor(private serverUrl: string) {}

  async requestGuideInfo(
    poiId: string,
    poiName: string,
    userCoordinates: Coordinates,
  ): Promise<string> {
    const response = await fetch(`${this.serverUrl}/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poiId, poiName, userCoordinates }),
    });

    if (!response.ok) {
      throw new Error(`Guide request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  }
}
