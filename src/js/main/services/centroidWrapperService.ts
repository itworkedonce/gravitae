// -----------------------------
// Centroid Wrapper Service
// -----------------------------
// Wrapper service for updating layer centroid (anchor point) calculations in After Effects.
// Ensures physics bodies rotate around their visual center rather than default anchor points.

import { evalTS } from "../../lib/utils/bolt";
import log from "../../utils/logger";
import { ProjectCompositions } from "../types/types";

interface SetCentroidServiceProps {
    compData: ProjectCompositions;
    forceLayerIds?: number[];
}

// -----------------------------
// Set Layers Centroid
// -----------------------------
// Triggers the host script to recalculate and set centroids for specified layers or composition.
// Essential for accurate physics rotation behavior.
export const setLayersCentroidService = async ({
    compData,
    forceLayerIds,
}: SetCentroidServiceProps) => {
    await evalTS("setLayersCentroid", compData, forceLayerIds);
    log.info("Layer centroids updated");
};
