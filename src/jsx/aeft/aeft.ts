import { dispatchTS, forEach } from "../utils/utils";
import { getPresetFile } from "./aeft-utils";
import {
  ProjectCompositions,
  BaseLayer,
  ShapeInfo,
  VertexData,
  CompositionData,
  ShapeGroup,
  textShape,
  TransformData,
  Matrix2D,
  ProcessedShapes,
  AnimatedPropertyValues
} from "../../js/main/types/types";


// Global constant
const initialValues: { [layerId: number]: { position: number[] } } = {};

// Helper: avoid Object.keys to check if animatedProps has any own keys
const hasOwnKeys = (obj: any): boolean => {
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return true;
  }
  return false;
};

// Layer related
export const getShapeLayerInfo = (layerId: number): ShapeGroup | null => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) return null;
  const index = getLayerById(layerId);
  const layer = index != null ? activeComp.layer(index) : null;
  if (!layer || !(layer instanceof ShapeLayer)) return null;
  const processShapeGroup = (group: PropertyGroup): ProcessedShapes => {
    const shapes: ProcessedShapes = {};
    let shapeCounter = 1;
    for (let i = 1; i <= group.numProperties; i++) {
      let prop = group.property(i) as PropertyGroup;
      if (!prop) continue;
      const matchName = prop.matchName;
      if (matchName === "ADBE Vector Group") {
        const shapeContent = prop.property(
          "ADBE Vectors Group"
        ) as PropertyGroup;
        const processedShapes = processShapeGroup(shapeContent);
        let hasShapes = false;
        for (let key in processedShapes) {
          if (processedShapes.hasOwnProperty(key)) {
            hasShapes = true;
            break;
          }
        }
        if (hasShapes) {
          shapes[prop.name] = processedShapes;
        }
      } else {
        const validShapeTypes = [
          "ADBE Vector Shape - Rect",
          "ADBE Vector Shape - Ellipse",
          "ADBE Vector Shape - Star",
          "ADBE Vector Shape - Group",
          "ADBE Vector Shape - Polygon",
          "ADBE Vector Shape",
        ];
        let isValidShape = false;
        for (let j = 0; j < validShapeTypes.length; j++) {
          if (validShapeTypes[j] === matchName) {
            isValidShape = true;
            break;
          }
        }
        if (isValidShape) {
          let processedShape: ShapeInfo | null = null;
          switch (matchName) {
            case "ADBE Vector Shape - Rect":
              processedShape = processRectangleShape(prop, layer);
              break;
            case "ADBE Vector Shape - Ellipse":
              processedShape = processEllipseShape(prop, layer);
              break;
            case "ADBE Vector Shape - Star":
              const starTypeProp = prop.property(
                "ADBE Vector Star Type"
              ) as Property;
              const type: number = starTypeProp ? starTypeProp.value : 1;
              if (type === 1) {
                processedShape = processStarShape(prop, layer);
              } else {
                processedShape = processPolygonShape(prop, layer);
              }
              break;
            case "ADBE Vector Shape - Group":
              processedShape = processPathShape(prop, layer);
              break;
          }
          if (processedShape) {
            // Use a unique key for each shape
            const shapeKey = `${prop.name}_${shapeCounter}`;
            shapes[shapeKey] = processedShape;
            shapeCounter++;
          }
        }
      }
    }
    return shapes;
  };

  const rootVectors = layer.property(
    "ADBE Root Vectors Group"
  ) as PropertyGroup;
  const shapeInfo = processShapeGroup(rootVectors);
  return shapeInfo;
};

export const fetchLayerData = (
  compData: ProjectCompositions,
  isStatic?: boolean,
  skipSelected?: boolean
) => {
  const activeComp = app.project.activeItem;

  // Check if the active item is a composition
  if (!(activeComp instanceof CompItem)) return [];
  const activeCompId = activeComp.id;

  const newCompData: Record<string, Record<string, BaseLayer>> = {};
  const compositionData: Record<string, CompositionData> = {};

  let layersToProcess: Layer[] = [];
  // Get selected layers first
  let selectedLayers: Layer[] = (activeComp as CompItem).selectedLayers;

  if (skipSelected) {
    selectedLayers = [];
  }

  // Check which layers from currentLayersIds still exist in the composition
  const existingLayers: any[] = [];

  // Get current layers from the composition data
  const currentLayersIds: number[] = [];

  if (!compData[activeCompId.toString()]) {
    // No existing composition data - only process selected layers
    if (selectedLayers.length === 0) {
      return [];
    } else {
      layersToProcess = selectedLayers;
    }
  } else {
    // Existing composition data exists - process existing layers
    const existing = compData[activeCompId.toString()].layers;
    for (const key in existing) {
      if (Object.prototype.hasOwnProperty.call(existing, key)) {
        currentLayersIds.push(Number(key));
      }
    }

    // Find existing layers in the composition
    for (let i = 1; i <= activeComp.numLayers; i++) {
      const layer = activeComp.layer(i);
      for (let j = 0; j < currentLayersIds.length; j++) {
        if (currentLayersIds[j] === layer.id) {
          existingLayers.push(layer);
          break;
        }
      }
    }
    layersToProcess.push(...existingLayers);

    // Add selected layers if any (avoid duplicates)
    if (selectedLayers.length > 0) {
      forEach(selectedLayers, (layer) => {
        let isDuplicate = false;
        for (let k = 0; k < existingLayers.length; k++) {
          if (existingLayers[k].id === layer.id) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          layersToProcess.push(layer);
        }
      });
    }
  }

  let initialGravityAngle = 0;
  let initialGravityScale = 9.8;
  let initialDrag = 0;
  var animatedGravityProperties: any = null;
  try {
    const worldController = activeComp.layer("Gravitae World").property("ADBE Effect Parade").property("Pseudo/GravitaeWorld");


    if (worldController) {
      const gravityAngleProp = worldController.property("Pseudo/GravitaeWorld-0002") as Property;
      const gravityScaleProp = worldController.property("Pseudo/GravitaeWorld-0003") as Property;
      const dragProp = worldController.property("Pseudo/GravitaeWorld-0006") as Property;

      initialGravityAngle = gravityAngleProp.value;
      initialGravityScale = gravityScaleProp.value;
      initialDrag = dragProp.value;

      // Sample gravity animated properties across workarea if they have keyframes
      animatedGravityProperties = {};

      const workAreaStart = (activeComp as CompItem).workAreaStart;
      const workAreaDuration = (activeComp as CompItem).workAreaDuration;
      const frameRate = (activeComp as CompItem).frameRate;
      const frameDuration = 1 / frameRate;
      const totalFrames = Math.round(workAreaDuration * frameRate);

      const buildSeries = (prop: Property, pre: number) => {
        var series = {
          preValue: pre,
          values: [],
          lastKeyFrame: null
        } as any;
        // Pre-work-area sample
        series.preValue = prop.valueAtTime(workAreaStart - frameDuration, false);
        // Sample every frame across the work area (0..totalFrames-1)
        for (var frame = 0; frame < totalFrames; frame++) {
          var t = workAreaStart + frame * frameDuration;
          series.values[frame] = prop.valueAtTime(t, false);
        }
        // Last keyframe info (clamped to workarea)
        if (prop.numKeys && prop.numKeys > 0) {
          var lastTime = prop.keyTime(prop.numKeys);
          var lastIdx = Math.floor((lastTime - workAreaStart) * frameRate);
          var isHold =
            prop.keyOutInterpolationType(prop.numKeys) === KeyframeInterpolationType.HOLD ||
            prop.keyInInterpolationType(prop.numKeys) === KeyframeInterpolationType.HOLD;
          if (lastIdx < 0) lastIdx = 0;
          if (lastIdx > totalFrames - 1) lastIdx = totalFrames - 1;
          series.lastKeyFrame = { frame: lastIdx, isHold: isHold };
        }
        return series;
      };

      if (gravityAngleProp && gravityAngleProp.numKeys && gravityAngleProp.numKeys > 0) {
        animatedGravityProperties.gravityAngle = buildSeries(gravityAngleProp, initialGravityAngle);
      }
      if (gravityScaleProp && gravityScaleProp.numKeys && gravityScaleProp.numKeys > 0) {
        animatedGravityProperties.gravityScale = buildSeries(gravityScaleProp, initialGravityScale);
      }
      if (dragProp && dragProp.numKeys && dragProp.numKeys > 0) {
        animatedGravityProperties.drag = buildSeries(dragProp, initialDrag);
      }

      if (hasOwnKeys(animatedGravityProperties)) {
        // will be attached below when composing compositionData entry
      } else {
        animatedGravityProperties = null;
      }
    }


  } catch (error) {
    // Silently handle error - Gravitae World layer might not exist yet
  }

  var compEntry: any = {
    layers: {},
    gravityAngle: initialGravityAngle,
    gravityScale: initialGravityScale,
    drag: initialDrag
  };
  if (animatedGravityProperties) {
    compEntry.animatedGravityProperties = animatedGravityProperties;
  }
  compositionData[activeCompId.toString()] = compEntry;



  forEach(layersToProcess, (layer) => {
    // Skip layers with empty ADBE Root Vectors Group property
    const rootVectorsGroup = layer.property(
      "ADBE Root Vectors Group"
    ) as PropertyGroup;
    if (!rootVectorsGroup || rootVectorsGroup.numProperties === 0) {
      return; // Skip this layer entirely
    }

    const shapeInfo = getShapeLayerInfo(layer.id);
    //Create composition data if it doesn't exist
    if (!newCompData[activeCompId.toString()]) {
      newCompData[activeCompId.toString()] = {};
    }


    //Check if layer already has gravity body controller effect
    var effectInstance = layer
      ?.property("ADBE Effect Parade")
      .property("Pseudo/GravitaeBody");

    if (!effectInstance) {
      const presetFile = getPresetFile("gravitaeBody.ffx");
      if (presetFile.exists) {
        layer?.applyPreset(presetFile);
      } else {
        alert("Preset file not found!");
      }
    }

    const bodyController = layer
      .property("ADBE Effect Parade")
      .property("Pseudo/GravitaeBody");

    var isLayerSelected = false;
    for (var i = 0; i < selectedLayers.length; i++) {
      if (selectedLayers[i].id === layer.id) {
        isLayerSelected = true;
        break;
      }
    }
    // Only set bodyType for selected layers, preserve existing for others
    let bodyType = 1; // Default to dynamic
    let isStaticFromBodyType = false;

    if (isLayerSelected) {
      if (isStatic !== undefined) {
        const bodyTypePropSelected = bodyController.property("Pseudo/GravitaeBody-0001") as Property;
        const activeCompSelected = app.project.activeItem as CompItem;
        const t0 = activeCompSelected.workAreaStart;
        const currentVal = bodyTypePropSelected.valueAtTime(t0, false) as number;
        const targetVal = isStatic ? 2 : 1;
        const hasKeys = !!bodyTypePropSelected.numKeys && bodyTypePropSelected.numKeys > 0;

        // Only act if switching type; skip if already the requested type
        if (currentVal !== targetVal) {
          // If bodyType has keyframes, delete them all before setting the new type
          if (hasKeys) {
            for (let k = bodyTypePropSelected.numKeys; k >= 1; k--) {
              bodyTypePropSelected.removeKey(k);
            }
          }
          // Set the new type (no keyframes remain; constant value suffices)
          bodyTypePropSelected.setValue(targetVal);
          bodyType = targetVal;
        } else {
          // No change needed; keep current value
          bodyType = currentVal;
        }
      } else {
        // If isStatic is undefined, read the value at work-area start
        const bodyTypePropRead = bodyController.property("Pseudo/GravitaeBody-0001") as Property;
        const activeComp = app.project.activeItem as CompItem;
        bodyType = bodyTypePropRead.valueAtTime(activeComp.workAreaStart, false);
      }
      isStaticFromBodyType = bodyType === 2;
    } else {
      // For non-selected layers, read the bodyType at work-area start; never modify
      const bodyTypePropRead = bodyController.property("Pseudo/GravitaeBody-0001") as Property;
      const activeComp = app.project.activeItem as CompItem;
      bodyType = bodyTypePropRead.valueAtTime(activeComp.workAreaStart, false);
      isStaticFromBodyType = bodyType === 2;
    }

    const sampled = bodyAnimatedProperties(layer.id, activeCompId);

    // Collect transform properties to read last keyframe info
    const transformGroup = layer.property("ADBE Transform Group") as PropertyGroup;
    const positionProp = transformGroup.property("ADBE Position") as Property;
    const rotationProp = transformGroup.property("ADBE Rotate Z") as Property;
    const scaleProp = transformGroup.property("ADBE Scale") as Property;
    const anchorProp = transformGroup.property("ADBE Anchor Point") as Property;
    const bodyTypeProp = bodyController.property("Pseudo/GravitaeBody-0001") as Property;
    const densityProp = bodyController.property("Pseudo/GravitaeBody-0003") as Property;
    const frictionProp = bodyController.property("Pseudo/GravitaeBody-0004") as Property;
    const airFrictionProp = bodyController.property("Pseudo/GravitaeBody-0005") as Property;
    const restitutionProp = bodyController.property("Pseudo/GravitaeBody-0006") as Property;

    // Helper to get last keyframe with a work-area-relative frame index
    const getLastKey = (prop: Property) => {
      const numKeys = prop.numKeys as number;
      if (!numKeys || numKeys < 1) return null;

      const activeComp = app.project.activeItem;
      if (!(activeComp instanceof CompItem)) return null;

      const workAreaStart = activeComp.workAreaStart;
      const workAreaDuration = activeComp.workAreaDuration;
      const frameRate = activeComp.frameRate;

      let idx = -1;
      for (let i = numKeys; i >= 1; i--) {
        const t = prop.keyTime(i) as number;
        if (t >= workAreaStart && t <= workAreaStart + workAreaDuration) {
          idx = i;
          break;
        }
      }
      if (idx === -1) idx = numKeys;

      const t = prop.keyTime(idx) as number;
      const isHold =
        prop.keyOutInterpolationType(idx) === KeyframeInterpolationType.HOLD ||
        prop.keyInInterpolationType(idx) === KeyframeInterpolationType.HOLD;

      const frame = Math.floor((t - workAreaStart) * frameRate);
      return { frame, isHold };
    };



    // Build animatedProperties only for keys that were actually sampled (i.e., have keyframes)
    const animatedProps: any = {};

    if (sampled.position && sampled.position.length) {
      const positionPre = sampled.position[0] as [number, number];
      const positionVals = sampled.position.slice(1) as [number, number][];
      animatedProps.position = {
        preValue: positionPre,
        values: positionVals,
        lastKeyFrame: getLastKey(positionProp),
      };
    }

    if (sampled.rotation && sampled.rotation.length) {
      const rotationPre = sampled.rotation[0] as number;
      const rotationVals = sampled.rotation.slice(1) as number[];
      animatedProps.rotation = {
        preValue: rotationPre,
        values: rotationVals,
        lastKeyFrame: getLastKey(rotationProp),
      };
    }

    if (sampled.scale && sampled.scale.length) {
      const scalePre = sampled.scale[0] as [number, number];
      const scaleVals = sampled.scale.slice(1) as [number, number][];
      animatedProps.scale = {
        preValue: scalePre,
        values: scaleVals,
        lastKeyFrame: getLastKey(scaleProp),
      };
    }

    if (sampled.anchorPoint && sampled.anchorPoint.length) {
      const anchorPre = sampled.anchorPoint[0] as [number, number];
      const anchorVals = sampled.anchorPoint.slice(1) as [number, number][];
      animatedProps.anchorPoint = {
        preValue: anchorPre,
        values: anchorVals,
        lastKeyFrame: getLastKey(anchorProp),
      };
    }

    if (sampled.bodyType && sampled.bodyType.length) {
      const bodyTypePre = sampled.bodyType[0] as number;
      const bodyTypeVals = sampled.bodyType.slice(1) as number[];
      animatedProps.bodyType = {
        preValue: bodyTypePre,
        values: bodyTypeVals,
        lastKeyFrame: getLastKey(bodyTypeProp),
      };
    }

    if (sampled.density && sampled.density.length) {
      const densityPre = sampled.density[0] as number;
      const densityVals = sampled.density.slice(1) as number[];
      animatedProps.density = {
        preValue: densityPre,
        values: densityVals,
        lastKeyFrame: getLastKey(densityProp),
      };
    }

    if (sampled.friction && sampled.friction.length) {
      const frictionPre = sampled.friction[0] as number;
      const frictionVals = sampled.friction.slice(1) as number[];
      animatedProps.friction = {
        preValue: frictionPre,
        values: frictionVals,
        lastKeyFrame: getLastKey(frictionProp),
      };
    }

    if (sampled.airFriction && sampled.airFriction.length) {
      const airFrictionPre = sampled.airFriction[0] as number;
      const airFrictionVals = sampled.airFriction.slice(1) as number[];
      animatedProps.frictionAir = {
        preValue: airFrictionPre,
        values: airFrictionVals,
        lastKeyFrame: getLastKey(airFrictionProp),
      };
    }

    if (sampled.restitution && sampled.restitution.length) {
      const restitutionPre = sampled.restitution[0] as number;
      const restitutionVals = sampled.restitution.slice(1) as number[];
      animatedProps.restitution = {
        preValue: restitutionPre,
        values: restitutionVals,
        lastKeyFrame: getLastKey(restitutionProp),
      };
    }

    compositionData[activeCompId.toString()].layers[layer.id] = {
      name: layer.name,
      type: getLayerType(layer.id, activeCompId) || "Unknown",
      isStatic: isStaticFromBodyType,
      isCentroidSet: false,
      matterObject: undefined,
      shapeInfo: shapeInfo as any,
      inOut: [layer.inPoint, layer.outPoint],
      layerRotation: layer.transform.rotation.value,
      layerScale: [
        layer.transform.scale.value[0],
        layer.transform.scale.value[1],
      ],
      layerPosition: [
        layer.transform.position.value[0],
        layer.transform.position.value[1],
      ],
      layerAnchor: [
        layer.transform.anchorPoint.value[0],
        layer.transform.anchorPoint.value[1],
      ],
      animatedProperties: hasOwnKeys(animatedProps) ? animatedProps : undefined,

      startPropertiesValues: {
        bodyType: bodyType,
        density: densityProp.value,
        friction: frictionProp.value,
        frictionAir: airFrictionProp.value,
        restitution: restitutionProp.value,
      },
      simulatedKeyframes: {
        position: [],
        rotation: [],
      },
    };
  });
  return compositionData;

};


export const checkLayerExist = (layerName: string) => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) return;
  let found = false;
  for (let i = 1; i <= activeComp.numLayers; i++) {
    const layer = activeComp.layer(i);
    if (layer.name === layerName) {
      found = true;
    }
  }
  return found;
};

export const getTextLayerInfo = (layerId: number): textShape | null => {
  const activeComp = app.project.activeItem;
  if (!activeComp || !(activeComp instanceof CompItem)) return null;
  const index = getLayerById(layerId);
  const layer = index != null ? activeComp.layer(index) : null;
  if (!layer || !(layer instanceof TextLayer)) return null;
  const layerTransform = layer.property(
    "ADBE Transform Group"
  ) as PropertyGroup;
  const layerPosition = layerTransform?.property("ADBE Position") as Property;
  const layerRotation = layerTransform?.property("ADBE Rotate Z") as Property;
  const layerScale = layerTransform?.property("ADBE Scale") as Property;
  const layerAnchor = layerTransform?.property("ADBE Anchor Point") as Property;
  const bounds = layer.sourceRectAtTime(0, false);
  const posX = layerPosition ? layerPosition.value[0] : 0;
  const posY = layerPosition ? layerPosition.value[1] : 0;
  const anchorX = layerAnchor ? layerAnchor.value[0] : 0;
  const anchorY = layerAnchor ? layerAnchor.value[1] : 0;
  const scaleX = layerScale ? layerScale.value[0] / 100 : 1;
  const scaleY = layerScale ? layerScale.value[1] / 100 : 1;
  const rotationRad =
    ((layerRotation ? layerRotation.value : 0) * Math.PI) / 180;
  const corners: [number, number][] = [
    [bounds.left - anchorX, bounds.top - anchorY],
    [bounds.left + bounds.width - anchorX, bounds.top - anchorY],
    [
      bounds.left + bounds.width - anchorX,
      bounds.top + bounds.height - anchorY,
    ],
    [bounds.left - anchorX, bounds.top + bounds.height - anchorY],
  ];
  const transformedCorners: [number, number][] = [];

  for (let i = 0; i < corners.length; i++) {
    const [x, y] = corners[i];
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const rotatedX =
      scaledX * Math.cos(rotationRad) - scaledY * Math.sin(rotationRad);
    const rotatedY =
      scaledX * Math.sin(rotationRad) + scaledY * Math.cos(rotationRad);
    const finalX = posX + rotatedX;
    const finalY = posY + rotatedY;
    transformedCorners.push([finalX, finalY]);
  }

  const verticesData: VertexData[] = [];
  for (let i = 0; i < transformedCorners.length; i++) {
    const position = transformedCorners[i];
    verticesData.push({
      index: i,
      position: position,
      inTangent: position,
      outTangent: position,
    });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of transformedCorners) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const transformedWidth = maxX - minX;
  const transformedHeight = maxY - minY;

  const shapeInfo: ShapeInfo = {
    layerName: layer.name,
    type: "path",
    vertices: 4,
    verticesData: verticesData,
    position: computeCentroid(transformedCorners),
    originalPos: [100, 100],
    rotation: layerRotation ? layerRotation.value : 0,
    scale: [100, 100],
    size: [transformedWidth, transformedHeight],
  };

  return {
    "Text Shape": {
      "Path 1": shapeInfo,
    },
  };
};

export const getSelectedLayersId = (): number[] => {
  const selectedComp = app.project.activeItem;
  if (!selectedComp || !(selectedComp instanceof CompItem)) return [];

  const selectedLayers: Layer[] = (selectedComp as CompItem).selectedLayers;
  const layerIds: number[] = [];
  forEach(selectedLayers, (layer) => {
    layerIds.push(layer.id);
  });
  return layerIds;
};

export const createWorldController = (
  existingLayer: number
) => {
  app.beginUndoGroup("Create World Controller");
  const activeComp = app.project.activeItem;
  if (activeComp instanceof CompItem) {
    const prevSelectedLayers = activeComp.selectedLayers;
    let world;
    let index;
    const presetFile = getPresetFile("gravitaeWorld.ffx");

    if (existingLayer !== 1) {
      index = getLayerById(existingLayer);
      if (index) {
        for (const layer of prevSelectedLayers) {
          layer.selected = false;
        }
        world = activeComp.layer(index);
        world.selected = true;
        if (presetFile.exists) {
          world.applyPreset(presetFile);
        } else {
          alert("Preset file not found!");
        }
        world.selected = false;
      }
    } else {
      activeComp.layers.addShape();
      index = 1;
      world = activeComp.layer(index);
      let char = "◎";
      world.name = `Gravitae World`;
      world.label = 0; // Set label color to black (0)
      if (presetFile.exists) {
        world.applyPreset(presetFile);
      } else {
        alert("Preset file not found!");
      }
    }

    if (world) {
      world.selected = false; // Deselect the layer
      // Restore previous selection
      for (const layer of prevSelectedLayers) {
        layer.selected = true;
      }
      return world.id;
    }
  }
  app.endUndoGroup();
};



export const applySimulationToLayers = (
  compId: number,
  layerData: Record<
    string,
    {
      positions: [number, number][];
      rotations: number[];
      scales: [number, number][];
    }
  >
) => {
  app.beginUndoGroup("Apply Physics Simulation");
  try {
    const activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      app.endUndoGroup();
      return false;
    }

    for (const layerIdStr in layerData) {
      if (layerData.hasOwnProperty(layerIdStr)) {
        const layerId = Number(layerIdStr);
        const data = layerData[layerId];
        const index = getLayerById(layerId, compId);
        const layer = index != null ? activeComp.layer(index) : null;

        if (layer) {
          const transform = layer.property(
            "ADBE Transform Group"
          ) as PropertyGroup;

          // Position
          if (data.positions && data.positions.length) {
            const layerPosition = transform.property(
              "ADBE Position"
            ) as Property;
            layerPosition.expression = `posVal=${JSON.stringify(
              data.positions
            )};
idx = Math.floor(timeToFrames(time)) % posVal.length;
posVal[idx]`;
          }

          // Rotation
          if (data.rotations && data.rotations.length) {
            const layerRotation = transform.property(
              "ADBE Rotate Z"
            ) as Property;
            layerRotation.expression = `rotVal=${JSON.stringify(
              data.rotations
            )};
idx = Math.floor(timeToFrames(time)) % rotVal.length;
radiansToDegrees(rotVal[idx])`;
          }

          // Scale
          if (data.scales && data.scales.length) {
            const layerScale = transform.property("ADBE Scale") as Property;
            layerScale.expression = `scaleVal=${JSON.stringify(data.scales)};
idx = Math.floor(timeToFrames(time)) % scaleVal.length;
[scaleVal[idx][0], scaleVal[idx][1]]`;
          }
        }
      }
    }

    app.endUndoGroup();
    return;
  } catch (error) {
    app.endUndoGroup();
    return;
  }
};

export const resetSimulationOnLayers = (
  compId: number,
  layerIds: number[]
) => {

  app.beginUndoGroup("Reset Physics Simulation");
  try {
    setTimeAtWorkareaIn();
    // Set time indicator to work area start

    const activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      app.endUndoGroup();
      return false;
    }

    for (let i = 0; i < layerIds.length; i++) {
      const layerId = layerIds[i];
      const index = getLayerById(layerId, compId);
      const layer = index != null ? activeComp.layer(index) : null;

      if (layer) {
        const transform = layer.property(
          "ADBE Transform Group"
        ) as PropertyGroup;

        // Clear Position expression
        // const layerPosition = transform.property("ADBE Position") as Property;
        // if (layerPosition && layerPosition.expression) {
        //   layerPosition.expression = "";
        // }

        // Clear Rotation expression
        const layerRotation = transform.property("ADBE Rotate Z") as Property;
        if (layerRotation && layerRotation.expression) {
          layerRotation.expression = "";
        }

        // Clear Scale expression
        const layerScale = transform.property("ADBE Scale") as Property;
        if (layerScale && layerScale.expression) {
          layerScale.expression = "";
        }
      }
    }



    app.endUndoGroup();
    return true;
  } catch (error) {
    app.endUndoGroup();
    return false;
  }
};

export const bodyAnimatedProperties = (layerId: number, compId: number): AnimatedPropertyValues => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) {
    return {
      position: [],
      rotation: [],
      scale: [],
      anchorPoint: [],
      bodyType: [],
      density: [],
      friction: [],
      airFriction: [],
      restitution: []
    };
  }
  const index = getLayerById(layerId, compId);
  const layer = index != null ? activeComp.layer(index) : null;
  if (!layer) {
    return {
      position: [],
      rotation: [],
      scale: [],
      anchorPoint: [],
      bodyType: [],
      density: [],
      friction: [],
      airFriction: [],
      restitution: []
    };
  }

  const transformGroup = layer.property("ADBE Transform Group");
  const position = transformGroup.property("ADBE Position") as Property;
  const rotation = transformGroup.property("ADBE Rotate Z") as Property;
  const scale = transformGroup.property("ADBE Scale") as Property;
  const anchorPoint = transformGroup.property("ADBE Anchor Point") as Property;
  const bodyController = layer
    .property("ADBE Effect Parade")
    .property("Pseudo/GravitaeBody");
  const bodyType = bodyController.property(
    "Pseudo/GravitaeBody-0001"
  ) as Property;
  const density = bodyController.property(
    "Pseudo/GravitaeBody-0003"
  ) as Property;
  const friction = bodyController.property(
    "Pseudo/GravitaeBody-0004"
  ) as Property;
  const airFriction = bodyController.property(
    "Pseudo/GravitaeBody-0005"
  ) as Property;
  const restitution = bodyController.property(
    "Pseudo/GravitaeBody-0006"
  ) as Property;

  // Get work area start and end times
  const workAreaStart = activeComp.workAreaStart;
  const workAreaDuration = activeComp.workAreaDuration;
  const frameRate = activeComp.frameRate;
  const frameDuration = 1 / frameRate;

  // Calculate total frames in work area
  const totalFrames = Math.round(workAreaDuration * frameRate);

  // Return object containing valueAtTime only for properties that have keyframes in work area
  const frameData: { [key: string]: any[] } = {};

  // Helper function to get keyframe times within work area
  const getKeyframeTimes = (prop: Property): number[] => {
    if (!prop || !prop.numKeys) return [];
    const times: number[] = [];
    for (let i = 1; i <= prop.numKeys; i++) {
      const time = prop.keyTime(i);
      if (time >= workAreaStart && time <= workAreaStart + workAreaDuration) {
        times.push(time);
      }
    }
    return times;
  };

  // Compute last keyframe frame index (work-area relative)
  const getLastKeyframeFrameIndex = (prop: Property): number => {
    const times = getKeyframeTimes(prop);
    if (times.length === 0) return 0;
    const lastTime = times[times.length - 1];
    const idx = Math.floor((lastTime - workAreaStart) * frameRate);
    return Math.max(0, Math.min(idx, totalFrames - 1));
  };

  // Sample a property: sample entire work area regardless of whether keys exist inside
  const sampleProperty = (prop: Property, propName: keyof AnimatedPropertyValues): void => {
    if (!prop) {
      frameData[propName] = [];
      return;
    }

    // No keyframes at all → empty (use static value elsewhere)
    if (!prop.numKeys) {
      frameData[propName] = [];
      return;
    }

    // Allocate array: [pre, frame0..frameN-1]
    const arr = new Array(totalFrames + 1);
    frameData[propName] = arr;

    // Pre-work-area sample
    frameData[propName][0] = prop.valueAtTime(workAreaStart - frameDuration, false);

    // Sample every frame across the work area using AE's evaluator
    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = workAreaStart + frame * frameDuration;
      frameData[propName][frame + 1] = prop.valueAtTime(currentTime, false);
    }
  };

  // Helper function to interpolate between values
  const interpolateValues = (start: any, end: any, t: number): any => {
    if (start && typeof start === 'object' && start.length !== undefined) {
      const result = [];
      for (let i = 0; i < start.length; i++) {
        result[i] = start[i] + (end[i] - start[i]) * t;
      }
      return result;
    }
    return start + (end - start) * t;
  };

  // Sample each property
  sampleProperty(position, 'position');
  sampleProperty(rotation, 'rotation');
  sampleProperty(scale, 'scale');
  sampleProperty(anchorPoint, 'anchorPoint');
  sampleProperty(bodyType, 'bodyType');
  sampleProperty(density, 'density');
  sampleProperty(friction, 'friction');
  sampleProperty(airFriction, 'airFriction');
  sampleProperty(restitution, 'restitution');

  return frameData;
};

export const checkEffectExist = (
  layerId: number,
  compId: number,
  effectName: string
): boolean => {
  app.beginUndoGroup("Apply preset");
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) {
    app.endUndoGroup();
    return false;
  }
  const index = getLayerById(layerId, compId);
  const layer = index != null ? activeComp.layer(index) : null;
  var effectInstance = layer
    ?.property("ADBE Effect Parade")
    .property(effectName);
  const exists = effectInstance !== null && effectInstance !== undefined;
  app.endUndoGroup();
  // alert(`${layer?.name} has effect: ${exists}`)

  return exists;
};

export const removeGravitaeBodyControlValues = (
  layerId: number,
  compId: number
) => {
  app.beginUndoGroup("Edit Gravitae Body Controller");
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) {
    app.endUndoGroup();
    return;
  }
  const index = getLayerById(layerId, compId);
  const layer = index != null ? activeComp.layer(index) : null;
  const transform = layer?.property("ADBE Transform Group") as PropertyGroup;
  const layerAnchorPoint = transform.property("ADBE Anchor Point") as Property;
  const layerPosition = transform.property("ADBE Position") as Property;
  const layerRotation = transform.property("ADBE Rotate Z") as Property;
  const layerScale = transform.property("ADBE Scale") as Property;
  const controller = layer
    ?.property("ADBE Effect Parade")
    .property("Pseudo/GravitaeBody");
  if (controller) {
    layerAnchorPoint.expression = "";
    layerPosition.expression = "";
    layerRotation.expression = "";
    layerScale.expression = "";
    controller.remove();
  }
  if (layer) {
    layer.selected = true;
  }
  app.endUndoGroup();
  return;
};

export const getLayerById = (
  layerId: number,
  compId?: number
): number | null => {
  const activeComp = app.project.activeItem;
  if (!activeComp || !(activeComp instanceof CompItem)) return null;

  // If a specific compId is provided and it doesn't match the current comp, the layer is from a different comp
  if (compId && activeComp.id !== compId) {
    dispatchTS("deleteLayerObjEvent", { layerId: layerId });
    return null;
  }

  for (let i = 1; i <= activeComp.numLayers; i++) {
    const layer = activeComp.layer(i);
    if (layer.id === layerId) {
      return layer.index;
    }
  }
  dispatchTS("deleteLayerObjEvent", { layerId: layerId });
  return null;
};

export const getLayerType = (
  layerId: number,
  compId?: number
): string | null => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) return null;
  const index = getLayerById(layerId, compId);
  const layer = index != null ? activeComp.layer(index) : null;
  // Guard against null or invalid layer
  if (!layer) return "invalid";

  if (layer instanceof TextLayer) return "text";
  if (layer instanceof ShapeLayer) return "shape";
  if (layer instanceof AVLayer) {
    if (layer.source instanceof FootageItem) {
      // Check if it's a solid
      if (layer.source.mainSource instanceof SolidSource) return "solid";
      else return "media";
    }
    if (layer.source instanceof CompItem) return "composition";
  }
  if (layer instanceof CameraLayer) return "camera";
  if (layer instanceof LightLayer) return "light";
  return "unknown"; // Default case for unrecognized layer types
};

// Composition related
export const getActiveComp = () => {
  return app.project.activeItem as CompItem;
};

export const doesCompExist = (compId: number): boolean => {
  try {
    for (let i = 1; i <= app.project.numItems; i++) {
      const item = app.project.item(i);
      if (item instanceof CompItem && item.id === compId) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

export const getCompSize = (): [number, number] => {
  const activeComp = getActiveComp();
  if (!(activeComp instanceof CompItem)) return [0, 0];
  return [activeComp.width, activeComp.height];
};

export const getCompId = (): number | null => {
  try {
    const activeComp = getActiveComp();
    if (!(activeComp instanceof CompItem)) return null;
    if (activeComp.width === 0 || activeComp.height === 0) {
      return null;
    }
    return activeComp.id;
  } catch (error) {
    return null;
  }
};

export const getWorkareaInOut = (): [number, number] => {
  const activeComp = getActiveComp();
  const frameRate = activeComp.frameRate;
  if (!(activeComp instanceof CompItem)) return [0, 0];
  const startTime = activeComp.displayStartTime;
  // Subtract a tiny amount to ensure we don't exceed the last frame
  return [
    startTime + activeComp.workAreaStart,
    activeComp.workAreaStart +
    startTime +
    activeComp.workAreaDuration -
    1 / frameRate,
  ];
};

export const getCompFramerate = (): number => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) return 0;
  return activeComp.frameRate;
};

export const getCompDuration = (): number => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) return 0;
  return activeComp.duration;
};

export const setTimeAtWorkareaIn = () => {
  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) return;
  const workareaIn = activeComp.workAreaStart;
  activeComp.time = workareaIn;
};

export const getTimingInfo = () => {
  const compId = getCompId();
  const framerate = getCompFramerate();
  const duration = getCompDuration();
  const workarea = getWorkareaInOut();
  setTimeAtWorkareaIn();
  return {
    compId,
    framerate,
    duration,
    workarea,
  };
};

//Shape related

const processRectangleShape = (
  prop: PropertyGroup,
  layer: ShapeLayer
): ShapeInfo | null => {
  const shapeInfo: ShapeInfo = { layerName: layer.name, type: "rectangle" };
  const sizeProp = prop.property("ADBE Vector Rect Size") as Property;
  const posProp = prop.property("ADBE Vector Rect Position") as Property;
  const roundnessProp = prop.property("ADBE Vector Rect Roundness") as Property;

  if (
    !sizeProp ||
    !posProp ||
    !roundnessProp ||
    sizeProp.propertyValueType === PropertyValueType.NO_VALUE ||
    posProp.propertyValueType === PropertyValueType.NO_VALUE ||
    roundnessProp.propertyValueType === PropertyValueType.NO_VALUE
  )
    return null;
  const shapeGroup = prop.propertyGroup() as PropertyGroup;
  const transform = getShapeTransform(shapeGroup, layer);
  if (!transform) return null;
  shapeInfo.position = transform.position;
  shapeInfo.size = sizeProp.value;
  shapeInfo.roundness = roundnessProp.value;
  shapeInfo.rotation = transform.rotation;
  shapeInfo.scale = transform.scale;
  return shapeInfo;
};

const processEllipseShape = (
  prop: PropertyGroup,
  layer: ShapeLayer
): ShapeInfo | null => {
  const shapeInfo: ShapeInfo = { layerName: layer.name, type: "ellipse" };
  const sizeProp = prop.property("ADBE Vector Ellipse Size") as Property;
  const posProp = prop.property("ADBE Vector Ellipse Position") as Property;

  if (
    !sizeProp ||
    !posProp ||
    sizeProp.propertyValueType === PropertyValueType.NO_VALUE ||
    posProp.propertyValueType === PropertyValueType.NO_VALUE
  )
    return null;
  const shapeGroup = prop.propertyGroup() as PropertyGroup;
  const transform = getShapeTransform(shapeGroup, layer);
  if (!transform) return null;
  shapeInfo.position = transform.position;
  shapeInfo.size = sizeProp.value;
  shapeInfo.rotation = transform.rotation;
  shapeInfo.scale = transform.scale;
  return shapeInfo;
};

const processStarShape = (
  prop: PropertyGroup,
  layer: ShapeLayer
): ShapeInfo | null => {
  const shapeInfo: ShapeInfo = { layerName: layer.name, type: "star" };
  const innerRadiusProp = prop.property(
    "ADBE Vector Star Inner Radius"
  ) as Property;
  const pointsProp = prop.property("ADBE Vector Star Points") as Property;
  const innerRoundnessProp = prop.property(
    "ADBE Vector Star Inner Roundess"
  ) as Property;
  const outerRadiusProp = prop.property(
    "ADBE Vector Star Outer Radius"
  ) as Property;
  const outerRoundnessProp = prop.property(
    "ADBE Vector Star Outer Roundess"
  ) as Property;
  const starRotation = prop.property("ADBE Vector Star Rotation") as Property;
  const shapeGroup = prop.propertyGroup() as PropertyGroup;
  const transform = getShapeTransform(shapeGroup, layer);
  if (!transform) return null;

  shapeInfo.position = transform.position;
  shapeInfo.originalPos = transform.originalPos; // Add this line
  shapeInfo.rotation = transform.rotation;
  shapeInfo.anchor = transform.anchor;
  shapeInfo.scale = transform.scale;
  shapeInfo.points = pointsProp.value;
  shapeInfo.starRotation = starRotation.value;
  shapeInfo.innerRadius = innerRadiusProp.value;
  shapeInfo.outerRadius = outerRadiusProp.value;
  shapeInfo.innerRoundness = innerRoundnessProp.value;
  shapeInfo.outerRoundness = outerRoundnessProp.value;

  return shapeInfo;
};

const processPolygonShape = (
  prop: PropertyGroup,
  layer: ShapeLayer
): ShapeInfo | null => {
  const shapeInfo: ShapeInfo = { layerName: layer.name, type: "polygon" };
  const pointsProp = prop.property("ADBE Vector Star Points") as Property;
  const outerRadiusProp = prop.property(
    "ADBE Vector Star Outer Radius"
  ) as Property;
  const outerRoundnessProp = prop.property(
    "ADBE Vector Star Outer Roundess"
  ) as Property;
  const starRotation = prop.property("ADBE Vector Star Rotation") as Property;
  const shapeGroup = prop.propertyGroup() as PropertyGroup;
  const transform = getShapeTransform(shapeGroup, layer);
  if (!transform) return null;
  shapeInfo.position = transform.position;
  shapeInfo.rotation = transform.rotation;
  shapeInfo.scale = transform.scale;
  shapeInfo.points = pointsProp.value;
  shapeInfo.starRotation = starRotation.value;
  shapeInfo.outerRadius = outerRadiusProp.value;
  shapeInfo.outerRoundness = outerRoundnessProp.value;
  shapeInfo.anchor = transform.anchor;
  return shapeInfo;
};

const processPathShape = (
  prop: PropertyGroup,
  layer: ShapeLayer
): ShapeInfo | null => {
  const shapeInfo: ShapeInfo = { layerName: layer.name, type: "path" };
  const localVerticesData: VertexData[] = [];
  const pathProp = prop.property("ADBE Vector Shape") as Property;
  if (!pathProp || pathProp.propertyValueType === PropertyValueType.NO_VALUE)
    return null;
  const vertices = pathProp.value.vertices as [number, number][];
  if (!vertices || vertices.length === 0) return null;
  shapeInfo.vertices = vertices.length;
  const inTangents = pathProp.value.inTangents as [number, number][];
  const outTangents = pathProp.value.outTangents as [number, number][];
  const shapeGroup = prop.propertyGroup() as PropertyGroup;
  const transform = getShapeTransform(shapeGroup, layer);
  if (!transform) return null;
  const transformRotationRad = (transform.rotation * Math.PI) / 180;
  const scaleX = transform.scale[0] / 100;
  const scaleY = transform.scale[1] / 100;
  for (let i = 0; i < vertices.length; i++) {
    const [vx, vy] = vertices[i];
    const scaledX = vx * scaleX;
    const scaledY = vy * scaleY;
    const rotatedX =
      scaledX * Math.cos(transformRotationRad) -
      scaledY * Math.sin(transformRotationRad);
    const rotatedY =
      scaledX * Math.sin(transformRotationRad) +
      scaledY * Math.cos(transformRotationRad);
    const anchorX =
      (transform.anchor?.[0] ?? 0) * scaleX * Math.cos(transformRotationRad) -
      (transform.anchor?.[1] ?? 0) * scaleY * Math.sin(transformRotationRad);
    const anchorY =
      (transform.anchor?.[0] ?? 0) * scaleX * Math.sin(transformRotationRad) +
      (transform.anchor?.[1] ?? 0) * scaleY * Math.cos(transformRotationRad);
    const finalX = transform.position[0] - anchorX + rotatedX;
    const finalY = transform.position[1] - anchorY + rotatedY;
    const vertexData: {
      index: number;
      position: [number, number];
      inTangent?: [number, number];
      outTangent?: [number, number];
    } = {
      index: i,
      position: [finalX, finalY],
    };
    if (inTangents && inTangents[i]) {
      const [inX, inY] = inTangents[i];
      const scaledInX = inX * scaleX;
      const scaledInY = inY * scaleY;
      const rotInX =
        scaledInX * Math.cos(transformRotationRad) -
        scaledInY * Math.sin(transformRotationRad);
      const rotInY =
        scaledInX * Math.sin(transformRotationRad) +
        scaledInY * Math.cos(transformRotationRad);
      vertexData.inTangent = [finalX + rotInX, finalY + rotInY];
    }
    if (outTangents && outTangents[i]) {
      const [outX, outY] = outTangents[i];
      const scaledOutX = outX * scaleX;
      const scaledOutY = outY * scaleY;
      const rotOutX =
        scaledOutX * Math.cos(transformRotationRad) -
        scaledOutY * Math.sin(transformRotationRad);
      const rotOutY =
        scaledOutX * Math.sin(transformRotationRad) +
        scaledOutY * Math.cos(transformRotationRad);
      vertexData.outTangent = [finalX + rotOutX, finalY + rotOutY];
    }

    localVerticesData.push(vertexData);
  }
  shapeInfo.verticesData = localVerticesData;
  const positions: [number, number][] = [];
  for (let i = 0; i < localVerticesData.length; i++) {
    positions.push(localVerticesData[i].position);
  }
  shapeInfo.position = computeCentroid(positions);
  shapeInfo.rotation = transform.rotation;
  shapeInfo.scale = transform.scale;
  shapeInfo.size = [
    1 * scaleX * transform.scale[0],
    1 * scaleY * transform.scale[1],
  ];
  return shapeInfo;
};

const getShapeTransform = (
  prop: PropertyGroup,
  layer: ShapeLayer
): TransformData | null => {
  const shapeGroup = prop.propertyGroup();
  const shapeContent = shapeGroup.property("ADBE Vectors Group");
  const shapeProp = shapeContent.property(1);
  let innerPos: Property | null = null;
  const matchName = shapeProp.matchName;
  if (matchName === "ADBE Vector Shape - Rect") {
    innerPos = shapeProp.property("ADBE Vector Rect Position") as Property;
  } else if (matchName === "ADBE Vector Shape - Ellipse") {
    innerPos = shapeProp.property("ADBE Vector Ellipse Position") as Property;
  } else if (matchName === "ADBE Vector Shape - Star") {
    innerPos = shapeProp.property("ADBE Vector Star Position") as Property;
  }
  const innerPosValue = innerPos ? innerPos.value : [0, 0];
  const transformGroup = shapeGroup?.property(
    "ADBE Vector Transform Group"
  ) as PropertyGroup;
  if (!transformGroup) return null;
  const transformPosition = transformGroup.property(
    "ADBE Vector Position"
  ) as Property;
  const transformRotation = transformGroup.property(
    "ADBE Vector Rotation"
  ) as Property;
  const transformScale = transformGroup.property(
    "ADBE Vector Scale"
  ) as Property;
  const layerTransform = layer.property(
    "ADBE Transform Group"
  ) as PropertyGroup;
  const transformAnchor = transformGroup.property(
    "ADBE Vector Anchor"
  ) as Property;
  const layerPosition = layerTransform?.property("ADBE Position") as Property;
  const layerRotation = layerTransform?.property("ADBE Rotate Z") as Property;
  const layerScale = layerTransform?.property("ADBE Scale") as Property;
  const layerAnchor = layerTransform?.property("ADBE Anchor Point") as Property;
  if (
    !transformPosition ||
    !transformRotation ||
    !transformScale ||
    !layerPosition ||
    !layerRotation ||
    !transformAnchor ||
    !layerScale ||
    !layerAnchor ||
    transformPosition.propertyValueType === PropertyValueType.NO_VALUE ||
    transformRotation.propertyValueType === PropertyValueType.NO_VALUE ||
    transformScale.propertyValueType === PropertyValueType.NO_VALUE ||
    transformAnchor.propertyValueType === PropertyValueType.NO_VALUE
  ) {
    return null;
  }
  const shapePos = transformPosition.value;
  const shapeScale = transformScale.value;
  const layerScaleValue = layerScale.value;
  const shapeRotation = transformRotation.value;
  const innerPosRotated = rotatePoint(
    { x: innerPosValue[0], y: innerPosValue[1] },
    transformRotation.value
  );
  const innerPosScaled = {
    x: innerPosRotated.x * (shapeScale[0] / 100),
    y: innerPosRotated.y * (shapeScale[1] / 100),
  };
  const shapeAnchorRotated = rotatePoint(
    { x: transformAnchor.value[0], y: transformAnchor.value[1] },
    transformRotation.value
  );
  const shapeAnchorScaled = {
    x: shapeAnchorRotated.x * (shapeScale[0] / 100),
    y: shapeAnchorRotated.y * (shapeScale[1] / 100),
  };
  const localPoint = {
    x: shapePos[0] + innerPosScaled.x,
    y: shapePos[1] + innerPosScaled.y,
  };
  const worldPos = {
    x: layerPosition.value[0] + localPoint.x - layerAnchor.value[0],
    y: layerPosition.value[1] + localPoint.y - layerAnchor.value[1],
  };
  const worldScale = {
    x: shapeScale[0],
    y: shapeScale[1],
  };

  return {
    position: [Number(worldPos.x), Number(worldPos.y)],
    originalPos: [Number(shapePos[0]), Number(shapePos[1])],
    rotation: shapeRotation,
    scale: [worldScale.x, worldScale.y],
    anchor: [transformAnchor.value[0], transformAnchor.value[1]],
  };
};

// Geometry Related
const rotatePoint = (point: { x: number; y: number }, angleDeg: number) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  return {
    x: point.x * cosA - point.y * sinA,
    y: point.x * sinA + point.y * cosA,
  };
};

export const computeCentroid = (
  points: [number, number][]
): [number, number] => {
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point[0];
    sumY += point[1];
  }
  return [sumX / n, sumY / n];
};

export const setLayersCentroid = (compData: ProjectCompositions, forceLayerIds?: number[]) => {
  app.beginUndoGroup("Set Layer Centroid");

  const activeComp = app.project.activeItem;
  if (!(activeComp instanceof CompItem)) {
    app.endUndoGroup();
    return false;
  }

  const activeCompId = activeComp.id;
  const compEntry = compData[activeCompId.toString()];
  if (!compEntry || !compEntry.layers) {
    app.endUndoGroup();
    return false;
  }

  for (const layerId in compEntry.layers) {
    const layerData = compEntry.layers[Number(layerId)];

    const index = getLayerById(Number(layerId), activeCompId);
    const aeLayer = index != null ? activeComp.layer(index) : null;
    if (!aeLayer) {
      continue;
    }

    const layerAnchorPoint = (aeLayer
      .property("ADBE Transform Group") as PropertyGroup)
      .property("ADBE Anchor Point") as Property;
    const layerPosition = (aeLayer
      .property("ADBE Transform Group") as PropertyGroup)
      .property("ADBE Position") as Property;

    // Check if this layer should be forced to recalculate
    let shouldForce = false;
    if (forceLayerIds) {
      for (let i = 0; i < forceLayerIds.length; i++) {
        if (forceLayerIds[i] === Number(layerId)) {
          shouldForce = true;
          break;
        }
      }
    }

    if (!shouldForce) {
      const anchorExpression = layerAnchorPoint.expression;
      const positionExpression = layerPosition.expression;
      const isCentroidAlreadySet =
        anchorExpression.indexOf("//Centroid set") !== -1 &&
        positionExpression.indexOf("//Centroid set") !== -1;

      if (isCentroidAlreadySet) {
        continue; // Skip this layer if centroid is already set
      }
    }

    const layerDataMatterPosition = layerData.matterObject?.position;
    if (!layerDataMatterPosition) {
      continue;
    }

    // Calculate localPoint using CURRENT (Evaluated) matrix
    // This ensures that if the layer is rotated/moved with expressions active,
    // we capture the correct local point corresponding to the centroid.
    const m = getLayerMatrix(aeLayer);
    const inv = invertMatrix(m);

    if (!inv) {
      // Matrix inversion failed - fallback to simple positioning
      console.warn("Matrix inversion failed for layer", layerId);
      continue;
    }

    const worldPos = [layerDataMatterPosition.x, layerDataMatterPosition.y];
    const localPoint = applyMatrix(inv, worldPos as [number, number]);

    // Clear expressions to read the Static Position
    layerAnchorPoint.expression = "";
    layerPosition.expression = "";

    const currentPosition = layerPosition.value as number[];
    // Set expressions to update anchor and position
    layerAnchorPoint.expression = `//Centroid set\n[${localPoint[0]}, ${localPoint[1]}]`;
    layerPosition.expression = `//Centroid set\n[${worldPos[0]}, ${worldPos[1]}] - [${currentPosition[0]},${currentPosition[1]}] + value `;
  }

  app.endUndoGroup();
  return true;
};

function getLayerMatrix(layer: any): Matrix2D {
  // Use consistent property access method
  const transform = layer.property("ADBE Transform Group");
  const anchor = transform.property("ADBE Anchor Point").value;
  const position = transform.property("ADBE Position").value;
  const scale = transform.property("ADBE Scale").value;
  const rotation = transform.property("ADBE Rotate Z").value;

  const radians = (rotation * Math.PI) / 180;
  const cosR = Math.cos(radians);
  const sinR = Math.sin(radians);
  const sx = scale[0] / 100.0;
  const sy = scale[1] / 100.0;

  return {
    a: cosR * sx,
    b: -sinR * sy,
    c: sinR * sx,
    d: cosR * sy,
    tx: position[0] - anchor[0] * cosR * sx + anchor[1] * sinR * sy,
    ty: position[1] - anchor[0] * sinR * sx - anchor[1] * cosR * sy,
  };
}
function invertMatrix(m: Matrix2D): Matrix2D | null {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-6) return null;
  const invDet = 1.0 / det;
  return {
    a: m.d * invDet,
    b: -m.b * invDet,
    c: -m.c * invDet,
    d: m.a * invDet,
    tx: (m.b * m.ty - m.d * m.tx) * invDet,
    ty: (m.c * m.tx - m.a * m.ty) * invDet,
  };
}
function applyMatrix(m: Matrix2D, point: [number, number]): [number, number] {
  return [
    m.a * point[0] + m.b * point[1] + m.tx,
    m.c * point[0] + m.d * point[1] + m.ty,
  ];
}

function removeInitialValue(layerId: number) {
  if (initialValues[layerId] && initialValues[layerId].position) {
    delete initialValues[layerId];
  }
}
export { removeInitialValue };
