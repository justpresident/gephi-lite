import { useSigma } from "@react-sigma/core";
import { FC, useEffect } from "react";
import Sigma from "sigma";
import drawEdgeLabel from "sigma/rendering/canvas/edge-label";
import drawHover from "sigma/rendering/canvas/hover";
import drawLabel from "sigma/rendering/canvas/label";
import { DEFAULT_SETTINGS } from "sigma/settings";

import { getDrawEdgeLabel, getNodeDrawFunction } from "../../../core/appearance/utils";
import { useAppearance, useGraphDataset } from "../../../core/context/dataContexts";
import { SigmaGraph } from "../../../core/graph/types";
import { resetCamera, sigmaAtom } from "../../../core/sigma";
import { inputToStateThreshold } from "../../../utils/labels";

export const SettingsController: FC<{ setIsReady: () => void }> = ({ setIsReady }) => {
  const sigma = useSigma();
  const graphDataset = useGraphDataset();
  const graphAppearance = useAppearance();

  useEffect(() => {
    sigmaAtom.set(sigma as Sigma<SigmaGraph>);
    resetCamera({ forceRefresh: true });
  }, [sigma]);

  useEffect(() => {
    sigma.setSetting("renderEdgeLabels", graphAppearance.edgesLabel.type !== "none");
    sigma.setSetting("labelRenderer", getNodeDrawFunction(graphAppearance, drawLabel));
    sigma.setSetting("hoverRenderer", getNodeDrawFunction(graphAppearance, drawHover));
    sigma.setSetting("edgeLabelRenderer", getDrawEdgeLabel(graphAppearance, drawEdgeLabel));

    const labelThreshold = inputToStateThreshold(graphAppearance.nodesLabelSize.density);
    const labelDensity = labelThreshold === 0 ? Infinity : DEFAULT_SETTINGS.labelDensity;
    sigma.setSetting("labelRenderedSizeThreshold", labelThreshold);
    sigma.setSetting("labelDensity", labelDensity);

    setIsReady();
  }, [graphAppearance, graphDataset, setIsReady, sigma]);

  return null;
};
