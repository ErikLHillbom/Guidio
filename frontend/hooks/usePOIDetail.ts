import { useCallback, useState } from 'react';
import { POIDetail, PointOfInterest } from '../types';
import { DataService } from '../services/DataService';

export function usePOIDetail(service: DataService) {
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);
  const [detail, setDetail] = useState<POIDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const select = useCallback((poi: PointOfInterest) => {
    setSelectedPOI(poi);
    setDetail(null);
    setDetailLoading(false);
  }, []);

  const loadDetail = useCallback(async () => {
    if (!selectedPOI) return;
    setDetailLoading(true);
    try {
      const fetched = await service.fetchPOIDetail(selectedPOI.id);
      setDetail(fetched);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedPOI, service]);

  const close = useCallback(() => {
    setSelectedPOI(null);
    setDetail(null);
  }, []);

  return {
    selectedPOI,
    detail,
    detailLoading,
    select,
    loadDetail,
    close,
  } as const;
}
