import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Viewer3D from "../components/Viewer3D";
import ControlsSidebar from "../components/ControlsSidebar";
import RightDrawer from "../components/RightDrawer";
import { AnnotationToolDrawer } from "../components/annotation-tool";
import TableOfContentsDrawer from "../components/TableOfContentsDrawer";
import TCPreview from "../components/TCPreview";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Upload,
  Trash2,
  ArrowLeft,
  StickyNote,
} from "lucide-react";
import type {
  NodeTransform,
  NoteAnnotation,
  NotePage,
  TextAnnotation,
  PartListItem,
  TocSection,
  AnimationItem,
  CameraState,
  HighlightOverride,
  NonSelectedStyle,
} from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "../components/ui/dialog";
import NoteRichEditor from "../components/annotations/NoteRichEditor";
import { useSectionPlayback } from "../hooks/useSectionPlayback";

const defaultNodeTransform = (): NodeTransform => ({
  visible: true,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scale: 1,
});

export default function ViewerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnnotationTool = location.pathname === "/annotation-tool";
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Drawer controls state
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [tocDrawerOpen, setTocDrawerOpen] = useState(false);

  // Model controls state
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [positionZ, setPositionZ] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);
  const [scale, setScale] = useState(1);

  // Animation controls state
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState("");
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animationLoop, setAnimationLoop] = useState(true);
  const [animationMode, setAnimationMode] = useState<"single" | "sequence">(
    "single",
  );
  const [animationSequence, setAnimationSequence] = useState<string[]>([]);

  // Lighting controls state
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [directionalIntensity, setDirectionalIntensity] = useState(1);
  const [directionalX, setDirectionalX] = useState(5);
  const [directionalY, setDirectionalY] = useState(5);
  const [directionalZ, setDirectionalZ] = useState(5);

  // Camera controls state
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(5);
  const [cameraZ, setCameraZ] = useState(10);
  const [fov, setFov] = useState(50);

  // Container size state
  const [containerWidth, setContainerWidth] = useState("100%");
  const [containerHeight, setContainerHeight] = useState("100vh");
  const [containerAlign, setContainerAlign] = useState<
    "left" | "center" | "right"
  >("left");
  const [containerVerticalAlign, setContainerVerticalAlign] = useState<
    "top" | "center" | "bottom"
  >("top");

  // Scene controls state
  const [backgroundColor, setBackgroundColor] = useState("#1a1a1a");
  const [enableGrid, setEnableGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [gridDivisions, setGridDivisions] = useState(10);
  const [gridCellColor, setGridCellColor] = useState("#6f6f6f");
  const [gridSectionColor, setGridSectionColor] = useState("#d6d6d6");
  const [gridPositionY, setGridPositionY] = useState(0);

  // Environment controls state
  const [envPreset, setEnvPreset] = useState<string>("sunset");
  const [envHdrUrl, setEnvHdrUrl] = useState<string | null>(null);
  const [envBackground, setEnvBackground] = useState(false);
  const [envBackgroundBlurriness, setEnvBackgroundBlurriness] = useState(0);
  const [envBackgroundIntensity, setEnvBackgroundIntensity] = useState(1);
  const [envIntensity, setEnvIntensity] = useState(1);

  // Skeletons controls state
  const [skeletonNames, setSkeletonNames] = useState<string[]>([]);
  const [selectedSkeleton, setSelectedSkeleton] = useState("");
  const [skeletonVisible, setSkeletonVisible] = useState(true);
  const [showSkeletonHelper, setShowSkeletonHelper] = useState(false);

  // Materials controls state
  const [materialNames, setMaterialNames] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [materialColor, setMaterialColor] = useState("#ffffff");
  const [materialMetalness, setMaterialMetalness] = useState(0.5);
  const [materialRoughness, setMaterialRoughness] = useState(0.5);
  const [materialOpacity, setMaterialOpacity] = useState(1);
  const [materialEmissive, setMaterialEmissive] = useState("#000000");
  const [materialEmissiveIntensity, setMaterialEmissiveIntensity] = useState(0);
  const [materialTextureMap, setMaterialTextureMap] = useState<
    Record<string, string>
  >({});

  // Textures controls state
  const [textureNames, setTextureNames] = useState<string[]>([]);
  const [selectedTexture, setSelectedTexture] = useState("");
  const [textureScaleX, setTextureScaleX] = useState(1);
  const [textureScaleY, setTextureScaleY] = useState(1);
  const [textureOffsetX, setTextureOffsetX] = useState(0);
  const [textureOffsetY, setTextureOffsetY] = useState(0);
  const [textureRotation, setTextureRotation] = useState(0);

  // Nodes controls state (per-node transforms)
  const [nodeNames, setNodeNames] = useState<string[]>([]);
  const [nodeTransforms, setNodeTransforms] = useState<
    Record<string, NodeTransform>
  >({});

  // Note annotations state
  const [notes, setNotes] = useState<NoteAnnotation[]>([]);
  const [showNoteAnnotations, setShowNoteAnnotations] = useState(true);
  const [isPlacingNote, setIsPlacingNote] = useState(false);
  const [focusNotePosition, setFocusNotePosition] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteDraft, setEditNoteDraft] = useState<{
    title: string;
    pages: NotePage[];
    color?: string;
  } | null>(null);

  // Text annotations state
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [isPlacingText, setIsPlacingText] = useState(false);

  // Part list
  const [partListItems, setPartListItems] = useState<PartListItem[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [pendingPartNodeName, setPendingPartNodeName] = useState<string | null>(
    null,
  );
  const [pendingPartLabel, setPendingPartLabel] = useState("");

  // Table of Contents sections state
  const [tocSections, setTocSections] = useState<TocSection[]>([]);
  const [activeTocSectionId, setActiveTocSectionId] = useState<string | null>(
    null,
  );
  const [cameraTargetX, setCameraTargetX] = useState<number | null>(null);
  const [cameraTargetY, setCameraTargetY] = useState<number | null>(null);
  const [cameraTargetZ, setCameraTargetZ] = useState<number | null>(null);
  const [cameraTargetFov, setCameraTargetFov] = useState<number | null>(null);

  // Clip durations map (clipName → seconds)
  const [clipDurations, setClipDurations] = useState<Record<string, number>>(
    {},
  );

  // Model ref accessor for section playback
  const getModelRef = useCallback(() => (window as any).__modelRef, []);

  const sectionPlayback = useSectionPlayback({
    sections: tocSections,
    clipDurations,
    playClip: useCallback(
      (clipName: string, trimIn: number, trimOut: number, speed: number) => {
        const ref = getModelRef();
        if (ref?.playClipTrimmed)
          ref.playClipTrimmed(clipName, trimIn, trimOut, speed);
      },
      [getModelRef],
    ),
    seekClip: useCallback(
      (clipName: string, timeSec: number) => {
        const ref = getModelRef();
        if (ref?.seekClip) ref.seekClip(clipName, timeSec);
      },
      [getModelRef],
    ),
    pauseClip: useCallback(() => {
      const ref = getModelRef();
      if (ref?.pauseClip) ref.pauseClip();
    }, [getModelRef]),
    stopClip: useCallback(() => {
      const ref = getModelRef();
      if (ref?.stopClip) ref.stopClip();
    }, [getModelRef]),
    getClipTime: useCallback(() => {
      const ref = getModelRef();
      return ref?.getClipTime?.() ?? 0;
    }, [getModelRef]),
    applyCameraOverride: useCallback((camera: CameraState) => {
      setCameraTargetX(camera.x);
      setCameraTargetY(camera.y);
      setCameraTargetZ(camera.z);
      setCameraTargetFov(camera.fov);
    }, []),
    applyHighlightOverride: useCallback(
      (hl: HighlightOverride | null) => setActiveItemHighlight(hl),
      [],
    ),
  });

  const handleAddTocSection = () => {
    setTocSections((prev) => [
      ...prev,
      { id: `sec-${Date.now()}`, title: "New Section", animations: [] },
    ]);
  };

  const handleRemoveTocSection = (id: string) => {
    setTocSections((prev) => prev.filter((s) => s.id !== id));
    if (activeTocSectionId === id) setActiveTocSectionId(null);
  };

  const handleUpdateTocSection = (id: string, updates: Partial<TocSection>) => {
    setTocSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  // --- Animation stack CRUD ---
  const handleAddAnimationItem = (sectionId: string, clipName: string) => {
    const dur = clipDurations[clipName] ?? 0;
    const newItem: AnimationItem = {
      id: `anim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      animationClipName: clipName,
      speed: 1,
      trim: {
        sourceStartSec: 0,
        sourceEndSec: dur,
        trimInSec: 0,
        trimOutSec: dur,
      },
    };
    setTocSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, animations: [...(s.animations ?? []), newItem] }
          : s,
      ),
    );
  };

  const handleRemoveAnimationItem = (sectionId: string, itemId: string) => {
    if (sectionPlayback.state.itemId === itemId) sectionPlayback.stopAll();
    setTocSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              animations: (s.animations ?? []).filter((a) => a.id !== itemId),
            }
          : s,
      ),
    );
  };

  const handleReorderAnimationItems = (
    sectionId: string,
    fromIdx: number,
    toIdx: number,
  ) => {
    setTocSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const anims = [...(s.animations ?? [])];
        const [moved] = anims.splice(fromIdx, 1);
        anims.splice(toIdx, 0, moved);
        return { ...s, animations: anims };
      }),
    );
  };

  const handleUpdateAnimationItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<AnimationItem>,
  ) => {
    setTocSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              animations: (s.animations ?? []).map((a) =>
                a.id === itemId ? { ...a, ...patch } : a,
              ),
            }
          : s,
      ),
    );
  };

  const handleResetTrim = (sectionId: string, itemId: string) => {
    setTocSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          animations: (s.animations ?? []).map((a) => {
            if (a.id !== itemId) return a;
            const dur = clipDurations[a.animationClipName] ?? 0;
            return {
              ...a,
              trim: {
                sourceStartSec: 0,
                sourceEndSec: dur,
                trimInSec: 0,
                trimOutSec: dur,
              },
            };
          }),
        };
      }),
    );
  };

  // --- Per-item camera override handlers ---
  const handleToggleItemCameraOverride = (
    sectionId: string,
    itemId: string,
    enabled: boolean,
  ) => {
    handleUpdateAnimationItem(sectionId, itemId, {
      cameraOverride: {
        enabled,
        camera: findItem(sectionId, itemId)?.cameraOverride?.camera ?? {
          x: cameraX,
          y: cameraY,
          z: cameraZ,
          fov,
        },
      },
    });
  };

  const handleSetItemCameraFromView = (sectionId: string, itemId: string) => {
    const existing = findItem(sectionId, itemId)?.cameraOverride;
    handleUpdateAnimationItem(sectionId, itemId, {
      cameraOverride: {
        enabled: existing?.enabled ?? true,
        camera: { x: cameraX, y: cameraY, z: cameraZ, fov },
      },
    });
  };

  const handlePreviewItemCamera = (sectionId: string, itemId: string) => {
    const cam = findItem(sectionId, itemId)?.cameraOverride?.camera;
    if (cam) {
      setCameraTargetX(cam.x);
      setCameraTargetY(cam.y);
      setCameraTargetZ(cam.z);
      setCameraTargetFov(cam.fov);
    }
  };

  const handleClearItemCamera = (sectionId: string, itemId: string) => {
    handleUpdateAnimationItem(sectionId, itemId, { cameraOverride: undefined });
  };

  // --- Per-item highlight override handlers ---
  const defaultHighlight = (): HighlightOverride => ({
    enabled: false,
    mode: "both",
    selectedNodeIds: [],
    selectedMaterialIds: [],
    nonSelectedStyle: {
      type: "overrideColor",
      color: "#808080",
      intensity: 1.0,
    },
  });

  const handleToggleItemHighlight = (
    sectionId: string,
    itemId: string,
    enabled: boolean,
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: { ...existing, enabled },
    });
  };

  const handleSetItemHighlightMode = (
    sectionId: string,
    itemId: string,
    mode: "node" | "material" | "both",
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: { ...existing, mode },
    });
  };

  const handleAddItemSelectedNodes = (
    sectionId: string,
    itemId: string,
    nodeIds: string[],
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    const merged = Array.from(
      new Set([...existing.selectedNodeIds, ...nodeIds]),
    );
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: { ...existing, selectedNodeIds: merged },
    });
  };

  const handleRemoveItemSelectedNode = (
    sectionId: string,
    itemId: string,
    nodeId: string,
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: {
        ...existing,
        selectedNodeIds: existing.selectedNodeIds.filter((n) => n !== nodeId),
      },
    });
  };

  const handleAddItemSelectedMaterials = (
    sectionId: string,
    itemId: string,
    materialIds: string[],
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    const merged = Array.from(
      new Set([...existing.selectedMaterialIds, ...materialIds]),
    );
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: { ...existing, selectedMaterialIds: merged },
    });
  };

  const handleRemoveItemSelectedMaterial = (
    sectionId: string,
    itemId: string,
    materialId: string,
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: {
        ...existing,
        selectedMaterialIds: existing.selectedMaterialIds.filter(
          (m) => m !== materialId,
        ),
      },
    });
  };

  const handleClearItemHighlightSelection = (
    sectionId: string,
    itemId: string,
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: { ...existing, selectedNodeIds: [], selectedMaterialIds: [] },
    });
  };

  const handleSetItemNonSelectedStyle = (
    sectionId: string,
    itemId: string,
    patch: Partial<NonSelectedStyle>,
  ) => {
    const existing =
      findItem(sectionId, itemId)?.highlight ?? defaultHighlight();
    handleUpdateAnimationItem(sectionId, itemId, {
      highlight: {
        ...existing,
        nonSelectedStyle: { ...existing.nonSelectedStyle, ...patch },
      },
    });
  };

  /** Find a specific animation item across sections */
  const findItem = (sectionId: string, itemId: string) => {
    const sec = tocSections.find((s) => s.id === sectionId);
    return sec?.animations?.find((a) => a.id === itemId);
  };

  // Expose section-playback handlers for TableOfContentsDrawer (available when drawer is updated)
  void handleAddAnimationItem;
  void handleRemoveAnimationItem;
  void handleReorderAnimationItems;
  void handleUpdateAnimationItem;
  void handleResetTrim;
  void handleToggleItemCameraOverride;
  void handleSetItemCameraFromView;
  void handlePreviewItemCamera;
  void handleClearItemCamera;
  void handleToggleItemHighlight;
  void handleSetItemHighlightMode;
  void handleAddItemSelectedNodes;
  void handleRemoveItemSelectedNode;
  void handleAddItemSelectedMaterials;
  void handleRemoveItemSelectedMaterial;
  void handleClearItemHighlightSelection;
  void handleSetItemNonSelectedStyle;

  const handleTocSectionClick = (section: TocSection) => {
    setActiveTocSectionId(section.id);
    // Play section animation stack if any
    const anims = section.animations ?? [];
    if (anims.length > 0) {
      sectionPlayback.playSection(section.id);
    } else if (section.animationName) {
      setSelectedAnimation(section.animationName);
      setAnimationSpeed(section.animationSpeed ?? 1);
      setAnimationEnabled(true);
    }
    const hasCamera =
      section.cameraX !== undefined ||
      section.cameraY !== undefined ||
      section.cameraZ !== undefined ||
      section.cameraFov !== undefined;
    if (hasCamera) {
      setCameraTargetX(section.cameraX ?? null);
      setCameraTargetY(section.cameraY ?? null);
      setCameraTargetZ(section.cameraZ ?? null);
      setCameraTargetFov(section.cameraFov ?? null);
    }
    setTocHighlightNodes(section.highlightNodes ?? []);
  };

  const handleCameraTransitionEnd = () => {
    if (cameraTargetX != null) setCameraX(cameraTargetX);
    if (cameraTargetY != null) setCameraY(cameraTargetY);
    if (cameraTargetZ != null) setCameraZ(cameraTargetZ);
    if (cameraTargetFov != null) setFov(cameraTargetFov);
    setCameraTargetX(null);
    setCameraTargetY(null);
    setCameraTargetZ(null);
    setCameraTargetFov(null);
  };

  const handleNodeNamesChange = (
    names: string[],
    initialTransforms?: Record<string, NodeTransform>,
  ) => {
    setNodeNames(names);
    setNodeTransforms((prev) => {
      const next = { ...prev };
      names.forEach((n) => {
        if (!next[n])
          next[n] = initialTransforms?.[n] ?? defaultNodeTransform();
      });
      return next;
    });
  };

  const updateNodeTransform = (
    nodeName: string,
    patch: Partial<NodeTransform>,
  ) => {
    setNodeTransforms((prev) => ({
      ...prev,
      [nodeName]: { ...defaultNodeTransform(), ...prev[nodeName], ...patch },
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedModel(url);
      setPositionX(0);
      setPositionY(0);
      setPositionZ(0);
      setRotationX(0);
      setRotationY(0);
      setRotationZ(0);
      setScale(1);
      setSelectedAnimation("");
      setAnimationEnabled(false);
      setAnimationSequence([]);
      setAnimationMode("single");
      setSelectedSkeleton("");
      setSkeletonVisible(true);
      setShowSkeletonHelper(false);
      setSelectedMaterial("");
      setMaterialColor("#ffffff");
      setMaterialMetalness(0.5);
      setMaterialRoughness(0.5);
      setMaterialOpacity(1);
      setMaterialEmissive("#000000");
      setMaterialEmissiveIntensity(0);
      setMaterialTextureMap({});
      setSelectedTexture("");
      setTextureScaleX(1);
      setTextureScaleY(1);
      setTextureOffsetX(0);
      setTextureOffsetY(0);
      setTextureRotation(0);
      setNodeNames([]);
      setNodeTransforms({});
      setNotes([]);
      setIsPlacingNote(false);
      setTextAnnotations([]);
      setIsPlacingText(false);
      setPartListItems([]);
      setSelectedPartId(null);
      setIsAddingPart(false);
      setPendingPartNodeName(null);
      setPendingPartLabel("");
      setEnvPreset("sunset");
      if (envHdrUrl?.startsWith("blob:")) URL.revokeObjectURL(envHdrUrl);
      setEnvHdrUrl(null);
      setEnvBackground(false);
      setEnvBackgroundBlurriness(0);
      setEnvBackgroundIntensity(1);
      setEnvIntensity(1);
    }
  };

  const handlePartListAdd = () => {
    if (!pendingPartNodeName?.trim() || !pendingPartLabel.trim()) return;
    const newPart: PartListItem = {
      id: `part-${Date.now()}`,
      nodeName: pendingPartNodeName.trim(),
      label: pendingPartLabel.trim(),
    };
    setPartListItems((prev) => [...prev, newPart]);
    setSelectedPartId(newPart.id);
    setPendingPartNodeName(null);
    setPendingPartLabel("");
    setIsAddingPart(false);
  };

  const handlePartListDelete = (id: string) => {
    setPartListItems((prev) => prev.filter((p) => p.id !== id));
    if (selectedPartId === id) setSelectedPartId(null);
  };

  const [tocHighlightNodes, setTocHighlightNodes] = useState<string[]>([]);
  const [activeItemHighlight, setActiveItemHighlight] =
    useState<HighlightOverride | null>(null);

  const highlightedNodeNames: string[] = (() => {
    const names: string[] = [...tocHighlightNodes];
    if (selectedPartId != null) {
      const partNode = partListItems.find(
        (p) => p.id === selectedPartId,
      )?.nodeName;
      if (partNode && !names.includes(partNode)) names.push(partNode);
    }
    return names;
  })();

  const handleNotePlace = (payload: {
    x: number;
    y: number;
    z: number;
    attachedBoneName?: string;
    attachedBoneOffset?: { x: number; y: number; z: number };
  }) => {
    if (!isPlacingNote) return;
    const newNote: NoteAnnotation = {
      id: `note-${Date.now()}`,
      positionX: payload.x,
      positionY: payload.y,
      positionZ: payload.z,
      text: "",
      pages: [{ content: "" }, { content: "" }],
      offsetY: 0,
      cardWidth: 300,
      cardHeight: 240,
      createdAt: new Date(),
      interactionMode: "On Click",
      displayStyle: "Text",
      ...(payload.attachedBoneName &&
        payload.attachedBoneOffset && {
          attachedBoneName: payload.attachedBoneName,
          attachedBoneOffset: payload.attachedBoneOffset,
        }),
    };
    setNotes([...notes, newNote]);
    setIsPlacingNote(false);
  };

  const handleNoteUpdate = (id: string, updates: Partial<NoteAnnotation>) => {
    setNotes(
      notes.map((note) => (note.id === id ? { ...note, ...updates } : note)),
    );
  };

  const handleNoteDelete = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const handleOpenNoteEdit = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      setEditingNoteId(id);
      setEditNoteDraft({
        title: note.title ?? "",
        pages: note.pages?.length ? note.pages : [{ content: note.text ?? "" }],
        color: note.color,
      });
    }
  };

  const handleSaveNoteEdit = () => {
    if (!editingNoteId || !editNoteDraft) return;
    handleNoteUpdate(editingNoteId, {
      title: editNoteDraft.title.trim() || undefined,
      pages: editNoteDraft.pages,
      color: editNoteDraft.color,
    });
    setEditingNoteId(null);
    setEditNoteDraft(null);
  };

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null);
    setEditNoteDraft(null);
  };

  const handleTextPlace = (position: { x: number; y: number; z: number }) => {
    if (!isPlacingText) return;
    const newTextAnnotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      positionX: position.x,
      positionY: position.y,
      positionZ: position.z,
      text: "New Text",
      fontSize: 16,
      color: "#ffffff",
      offsetY: 0,
      createdAt: new Date(),
    };
    setTextAnnotations([...textAnnotations, newTextAnnotation]);
    setIsPlacingText(false);
  };

  const handleTextUpdate = (id: string, updates: Partial<TextAnnotation>) => {
    setTextAnnotations(
      textAnnotations.map((text) =>
        text.id === id ? { ...text, ...updates } : text,
      ),
    );
  };

  const handleTextDelete = (id: string) => {
    setTextAnnotations(textAnnotations.filter((text) => text.id !== id));
  };

  const handleAnimationNamesChange = (names: string[]) => {
    setAnimationNames(names);
    if (names.length > 0 && !selectedAnimation) {
      setSelectedAnimation(names[0]);
      setAnimationEnabled(true);
    }
    // Populate clip durations from the model ref
    const ref = (window as any).__modelRef;
    if (ref?.getClipDurations) {
      const durations = ref.getClipDurations() as Record<string, number>;
      setClipDurations(durations);
    }
  };

  const handleAnimationPlay = () => {
    const modelRef = (window as any).__modelRef;
    if (modelRef) modelRef.play();
  };

  const handleAnimationPause = () => {
    const modelRef = (window as any).__modelRef;
    if (modelRef) modelRef.pause();
  };

  const handleAnimationStop = () => {
    const modelRef = (window as any).__modelRef;
    if (modelRef) modelRef.stop();
  };

  const handleAnimationReset = () => {
    const modelRef = (window as any).__modelRef;
    if (modelRef) modelRef.reset();
  };

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <input
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />

      <TCPreview
        sections={tocSections}
        activeSectionId={activeTocSectionId}
        onSectionClick={handleTocSectionClick}
      />
      <TableOfContentsDrawer
        isOpen={tocDrawerOpen}
        setIsOpen={setTocDrawerOpen}
        sections={tocSections}
        animationNames={animationNames}
        clipDurations={clipDurations}
        nodeNames={nodeNames}
        onAddSection={handleAddTocSection}
        onRemoveSection={handleRemoveTocSection}
        onUpdateSection={handleUpdateTocSection}
        onCameraPreview={(cam) => {
          if (cam.x !== undefined) setCameraX(cam.x);
          if (cam.y !== undefined) setCameraY(cam.y);
          if (cam.z !== undefined) setCameraZ(cam.z);
          if (cam.fov !== undefined) setFov(cam.fov);
        }}
        onAddAnimationItem={handleAddAnimationItem}
        onRemoveAnimationItem={handleRemoveAnimationItem}
        onReorderAnimationItems={handleReorderAnimationItems}
        onUpdateAnimationItem={handleUpdateAnimationItem}
        onResetTrim={handleResetTrim}
        onToggleItemCameraOverride={handleToggleItemCameraOverride}
        onSetItemCameraFromView={handleSetItemCameraFromView}
        onPreviewItemCamera={handlePreviewItemCamera}
        onClearItemCamera={handleClearItemCamera}
        materialNames={materialNames}
        onToggleItemHighlight={handleToggleItemHighlight}
        onSetItemHighlightMode={handleSetItemHighlightMode}
        onAddItemSelectedNodes={handleAddItemSelectedNodes}
        onRemoveItemSelectedNode={handleRemoveItemSelectedNode}
        onAddItemSelectedMaterials={handleAddItemSelectedMaterials}
        onRemoveItemSelectedMaterial={handleRemoveItemSelectedMaterial}
        onClearItemHighlightSelection={handleClearItemHighlightSelection}
        onSetItemNonSelectedStyle={handleSetItemNonSelectedStyle}
        playbackState={sectionPlayback.state}
        onPlaySection={sectionPlayback.playSection}
        onPlayItem={(sectionId, itemId) =>
          sectionPlayback.playItem(sectionId, itemId)
        }
        onPauseActive={sectionPlayback.pauseActive}
        onStopActive={sectionPlayback.stopActive}
        onSeekItem={(sectionId, itemId, t) =>
          sectionPlayback.seekItem(sectionId, itemId, t)
        }
      />
      {isAnnotationTool ? (
        <AnnotationToolDrawer
          isOpen={rightDrawerOpen}
          setIsOpen={setRightDrawerOpen}
          notes={notes}
          isPlacingNote={isPlacingNote}
          onTogglePlaceNote={() => setIsPlacingNote(!isPlacingNote)}
          movingNoteId={movingNoteId}
          onStartMoveNote={(id) => setMovingNoteId(id || null)}
          onNoteUpdate={(id, updates) => handleNoteUpdate(id, updates)}
          onNoteDelete={handleNoteDelete}
          textAnnotations={textAnnotations}
          isPlacingText={isPlacingText}
          onTogglePlaceText={() => setIsPlacingText(!isPlacingText)}
          onTextUpdate={handleTextUpdate}
          onTextDelete={handleTextDelete}
          nodeNames={nodeNames}
          partListItems={partListItems}
          isAddingPart={isAddingPart}
          setIsAddingPart={setIsAddingPart}
          pendingPartNodeName={pendingPartNodeName}
          setPendingPartNodeName={setPendingPartNodeName}
          pendingPartLabel={pendingPartLabel}
          setPendingPartLabel={setPendingPartLabel}
          onPartListAdd={handlePartListAdd}
        />
      ) : (
        <RightDrawer
          isOpen={rightDrawerOpen}
          setIsOpen={setRightDrawerOpen}
          notes={notes}
          isPlacingNote={isPlacingNote}
          onTogglePlaceNote={() => setIsPlacingNote(!isPlacingNote)}
          onNoteUpdate={(id, updates) => handleNoteUpdate(id, updates)}
          onNoteDelete={handleNoteDelete}
          movingNoteId={movingNoteId}
          onStartMoveNote={(id) => setMovingNoteId(id || null)}
          textAnnotations={textAnnotations}
          isPlacingText={isPlacingText}
          onTogglePlaceText={() => setIsPlacingText(!isPlacingText)}
          onTextUpdate={handleTextUpdate}
          onTextDelete={handleTextDelete}
          nodeNames={nodeNames}
          partListItems={partListItems}
          isAddingPart={isAddingPart}
          setIsAddingPart={setIsAddingPart}
          pendingPartNodeName={pendingPartNodeName}
          setPendingPartNodeName={setPendingPartNodeName}
          pendingPartLabel={pendingPartLabel}
          setPendingPartLabel={setPendingPartLabel}
          onPartListAdd={handlePartListAdd}
        />
      )}
      <ControlsSidebar
        modelControls={{
          positionX,
          positionY,
          positionZ,
          rotationX,
          rotationY,
          rotationZ,
          scale,
          setPositionX,
          setPositionY,
          setPositionZ,
          setRotationX,
          setRotationY,
          setRotationZ,
          setScale,
        }}
        animationControls={{
          enabled: animationEnabled,
          selectedAnimation,
          animationNames,
          speed: animationSpeed,
          loop: animationLoop,
          mode: animationMode,
          sequence: animationSequence,
          setEnabled: setAnimationEnabled,
          setSelectedAnimation,
          setSpeed: setAnimationSpeed,
          setLoop: setAnimationLoop,
          setMode: setAnimationMode,
          setSequence: setAnimationSequence,
          onPlay: handleAnimationPlay,
          onPause: handleAnimationPause,
          onStop: handleAnimationStop,
          onReset: handleAnimationReset,
        }}
        lightingControls={{
          ambientIntensity,
          directionalIntensity,
          directionalX,
          directionalY,
          directionalZ,
          setAmbientIntensity,
          setDirectionalIntensity,
          setDirectionalX,
          setDirectionalY,
          setDirectionalZ,
        }}
        cameraControls={{
          cameraX,
          cameraY,
          cameraZ,
          fov,
          setCameraX,
          setCameraY,
          setCameraZ,
          setFov,
        }}
        sceneControls={{
          containerWidth,
          containerHeight,
          containerAlign,
          containerVerticalAlign,
          setContainerWidth,
          setContainerHeight,
          setContainerAlign,
          setContainerVerticalAlign,
          backgroundColor,
          enableGrid,
          gridSize,
          gridDivisions,
          gridCellColor,
          gridSectionColor,
          gridPositionY,
          setBackgroundColor,
          setEnableGrid,
          setGridSize,
          setGridDivisions,
          setGridCellColor,
          setGridSectionColor,
          setGridPositionY,
          envPreset,
          envHdrUrl,
          envBackground,
          envBackgroundBlurriness,
          envBackgroundIntensity,
          envIntensity,
          setEnvPreset,
          setEnvHdrUrl,
          setEnvBackground,
          setEnvBackgroundBlurriness,
          setEnvBackgroundIntensity,
          setEnvIntensity,
        }}
        skeletonControls={{
          skeletonNames,
          selectedSkeleton,
          skeletonVisible,
          showSkeletonHelper,
          setSkeletonNames,
          setSelectedSkeleton,
          setSkeletonVisible,
          setShowSkeletonHelper,
        }}
        materialControls={{
          materialNames,
          selectedMaterial,
          materialColor,
          materialMetalness,
          materialRoughness,
          materialOpacity,
          materialEmissive,
          materialEmissiveIntensity,
          materialTextureMap,
          setMaterialNames,
          setSelectedMaterial,
          setMaterialColor,
          setMaterialMetalness,
          setMaterialRoughness,
          setMaterialOpacity,
          setMaterialEmissive,
          setMaterialEmissiveIntensity,
          setMaterialTextureMap,
        }}
        textureControls={{
          textureNames,
          selectedTexture,
          textureScaleX,
          textureScaleY,
          textureOffsetX,
          textureOffsetY,
          textureRotation,
          setTextureNames,
          setSelectedTexture,
          setTextureScaleX,
          setTextureScaleY,
          setTextureOffsetX,
          setTextureOffsetY,
          setTextureRotation,
        }}
        nodeControls={{
          nodeNames,
          nodeTransforms,
          updateNodeTransform,
        }}
        isOpen={leftDrawerOpen}
        setIsOpen={setLeftDrawerOpen}
      />
      <div
        className="flex-1 relative"
        id="viewer-3d"
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            !target.closest("[data-drawer]") &&
            !target.closest("[data-drawer-toggle]")
          ) {
            setLeftDrawerOpen(false);
            setRightDrawerOpen(false);
            setTocDrawerOpen(false);
          }
        }}
      >
        {partListItems.length > 0 && (
          <div className="absolute top-4 left-4 z-20 w-56">
            <Card className="bg-card/90 backdrop-blur-sm border-border/80 [&>*]:text-foreground">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">
                  Part Names
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Entire model
                </p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <ul className="space-y-0.5">
                  {partListItems.map((part) => (
                    <li key={part.id}>
                      <div
                        className={`flex items-center justify-between gap-2 py-2 px-2 rounded-md cursor-pointer text-sm ${
                          selectedPartId === part.id
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setSelectedPartId(
                            selectedPartId === part.id ? null : part.id,
                          )
                        }
                      >
                        <span className="truncate">
                          {part.label || part.nodeName}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePartListDelete(part.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        <Viewer3D
          modelUrl={selectedModel ?? undefined}
          positionX={positionX}
          positionY={positionY}
          positionZ={positionZ}
          rotationX={rotationX}
          rotationY={rotationY}
          rotationZ={rotationZ}
          scale={scale}
          selectedAnimation={selectedAnimation}
          animationEnabled={animationEnabled}
          animationSpeed={animationSpeed}
          animationLoop={animationLoop}
          animationMode={animationMode}
          animationSequence={animationSequence}
          onAnimationNamesChange={handleAnimationNamesChange}
          ambientIntensity={ambientIntensity}
          directionalIntensity={directionalIntensity}
          directionalX={directionalX}
          directionalY={directionalY}
          directionalZ={directionalZ}
          cameraX={cameraX}
          cameraY={cameraY}
          cameraZ={cameraZ}
          fov={fov}
          cameraTargetX={cameraTargetX}
          cameraTargetY={cameraTargetY}
          cameraTargetZ={cameraTargetZ}
          cameraTargetFov={cameraTargetFov}
          onCameraTransitionEnd={handleCameraTransitionEnd}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          containerAlign={containerAlign}
          containerVerticalAlign={containerVerticalAlign}
          backgroundColor={backgroundColor}
          enableGrid={enableGrid}
          gridSize={gridSize}
          gridDivisions={gridDivisions}
          gridCellColor={gridCellColor}
          gridSectionColor={gridSectionColor}
          gridPositionY={gridPositionY}
          envPreset={envPreset}
          envHdrUrl={envHdrUrl}
          envBackground={envBackground}
          envBackgroundBlurriness={envBackgroundBlurriness}
          envBackgroundIntensity={envBackgroundIntensity}
          envIntensity={envIntensity}
          skeletonNames={skeletonNames}
          selectedSkeleton={selectedSkeleton}
          skeletonVisible={skeletonVisible}
          showSkeletonHelper={showSkeletonHelper}
          onSkeletonNamesChange={setSkeletonNames}
          materialNames={materialNames}
          selectedMaterial={selectedMaterial}
          materialColor={materialColor}
          materialMetalness={materialMetalness}
          materialRoughness={materialRoughness}
          materialOpacity={materialOpacity}
          materialEmissive={materialEmissive}
          materialEmissiveIntensity={materialEmissiveIntensity}
          materialTextureMap={materialTextureMap}
          onMaterialNamesChange={setMaterialNames}
          textureNames={textureNames}
          selectedTexture={selectedTexture}
          textureScaleX={textureScaleX}
          textureScaleY={textureScaleY}
          textureOffsetX={textureOffsetX}
          textureOffsetY={textureOffsetY}
          textureRotation={textureRotation}
          onTextureNamesChange={setTextureNames}
          nodeNames={nodeNames}
          nodeTransforms={nodeTransforms}
          onNodeNamesChange={handleNodeNamesChange}
          highlightedNodeNames={highlightedNodeNames}
          activeItemHighlight={activeItemHighlight}
          notes={notes}
          showNoteAnnotations={showNoteAnnotations}
          isPlacingNote={isPlacingNote}
          onNotePlace={handleNotePlace}
          onNoteUpdate={handleNoteUpdate}
          onNoteDelete={handleNoteDelete}
          onNoteEdit={handleOpenNoteEdit}
          showEditButtonOnNoteCards={!isAnnotationTool}
          focusNotePosition={focusNotePosition}
          onFocusNoteDone={() => setFocusNotePosition(null)}
          movingNoteId={movingNoteId}
          onEndMoveNote={() => setMovingNoteId(null)}
          textAnnotations={textAnnotations}
          isPlacingText={isPlacingText}
          onTextPlace={handleTextPlace}
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload New Model
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (selectedModel?.startsWith("blob:")) {
                URL.revokeObjectURL(selectedModel!);
              }
              setSelectedModel(null);
            }}
          >
            Clear
          </Button>
          <Button
            variant={showNoteAnnotations ? "secondary" : "outline"}
            onClick={() => setShowNoteAnnotations((v) => !v)}
            title={
              showNoteAnnotations
                ? "ซ่อน Note Annotations"
                : "แสดง Note Annotations"
            }
          >
            <StickyNote className="mr-2 h-4 w-4" />
            Note Annotations
          </Button>
        </div>

        <Dialog
          open={editingNoteId !== null}
          onOpenChange={(open) => !open && handleCancelNoteEdit()}
          closeOnOverlayClick={false}
        >
          <DialogContent
            className="max-w-2xl w-full mx-auto"
            onClose={handleCancelNoteEdit}
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>แก้ไขโน้ต</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {editNoteDraft && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      หัวข้อ
                    </label>
                    <input
                      type="text"
                      value={editNoteDraft.title}
                      onChange={(e) =>
                        setEditNoteDraft((prev) =>
                          prev ? { ...prev, title: e.target.value } : null,
                        )
                      }
                      placeholder="เช่น หัวข้อโน้ต หรือเว้นว่างได้"
                      className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      สีหัวการ์ด / หมุด
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editNoteDraft.color ?? "#ef4444"}
                        onChange={(e) =>
                          setEditNoteDraft((prev) =>
                            prev ? { ...prev, color: e.target.value } : null,
                          )
                        }
                        className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
                        title="เลือกสี"
                      />
                      <input
                        type="text"
                        value={editNoteDraft.color ?? "#ef4444"}
                        onChange={(e) =>
                          setEditNoteDraft((prev) =>
                            prev
                              ? { ...prev, color: e.target.value || undefined }
                              : null,
                          )
                        }
                        placeholder="#ef4444"
                        className="flex-1 p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>
                  <NoteRichEditor
                    key={editingNoteId ?? "edit"}
                    pages={editNoteDraft.pages}
                    onChange={(pages) =>
                      setEditNoteDraft((prev) =>
                        prev ? { ...prev, pages } : null,
                      )
                    }
                    height={320}
                  />
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelNoteEdit}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveNoteEdit} disabled={!editNoteDraft}>
                บันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
