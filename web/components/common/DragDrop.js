"use client";

import { useState, useRef, useCallback, useEffect, createContext, useContext } from "react";

/**
 * Drag & Drop System - Touch & Tablet Optimized
 * 
 * Lightweight drag-drop implementation without external dependencies.
 * Supports both mouse and touch events for tablet compatibility.
 * 
 * Features:
 * - Smooth animations during drag
 * - Drop zones with visual feedback
 * - Trash/delete zone support
 * - Reordering lists
 * - Touch-friendly with proper gesture handling
 */

// Context for drag state
const DragContext = createContext(null);

export function useDragContext() {
  return useContext(DragContext);
}

/**
 * DragDropProvider - Wrap your draggable area with this
 * 
 * @example
 * <DragDropProvider onDrop={handleDrop}>
 *   <DraggableItem id="1">Item 1</DraggableItem>
 *   <DropZone id="zone-1">Drop here</DropZone>
 *   <TrashZone>Delete</TrashZone>
 * </DragDropProvider>
 */
export function DragDropProvider({ 
  children, 
  onDrop,
  onReorder,
  onDelete,
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState(null);

  const startDrag = useCallback((item, startPos) => {
    setDraggedItem(item);
    setDragPosition(startPos);
    setIsDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  }, []);

  const updateDrag = useCallback((pos) => {
    setDragPosition(pos);
  }, []);

  const endDrag = useCallback((dropZoneId) => {
    if (draggedItem && dropZoneId) {
      if (dropZoneId === "__trash__" && onDelete) {
        onDelete(draggedItem);
      } else if (onDrop) {
        onDrop(draggedItem, dropZoneId);
      }
    }
    setDraggedItem(null);
    setIsDragging(false);
    setActiveDropZone(null);
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
  }, [draggedItem, onDrop, onDelete]);

  const cancelDrag = useCallback(() => {
    setDraggedItem(null);
    setIsDragging(false);
    setActiveDropZone(null);
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
  }, []);

  return (
    <DragContext.Provider
      value={{
        draggedItem,
        dragPosition,
        isDragging,
        activeDropZone,
        setActiveDropZone,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        onReorder,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

/**
 * DraggableItem - Make any element draggable
 * 
 * @example
 * <DraggableItem id="product-1" data={{ name: "Bitcoin" }}>
 *   <ProductCard />
 * </DraggableItem>
 */
export function DraggableItem({
  children,
  id,
  data = {},
  disabled = false,
  className = "",
  dragHandleClassName = "",
}) {
  const context = useDragContext();
  const elementRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragged = context?.draggedItem?.id === id;

  const handleStart = useCallback((clientX, clientY) => {
    if (disabled || !context) return;
    
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;

    setOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });

    context.startDrag(
      { id, data, element: elementRef.current },
      { x: clientX, y: clientY }
    );
  }, [disabled, context, id, data]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left click
    if (dragHandleClassName && !e.target.closest(`.${dragHandleClassName}`)) return;
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart, dragHandleClassName]);

  const handleTouchStart = useCallback((e) => {
    if (dragHandleClassName && !e.target.closest(`.${dragHandleClassName}`)) return;
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart, dragHandleClassName]);

  // Global move/end handlers
  useEffect(() => {
    if (!isDragged || !context) return;

    const handleMouseMove = (e) => {
      context.updateDrag({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      context.updateDrag({ x: touch.clientX, y: touch.clientY });
      e.preventDefault();
    };

    const handleEnd = () => {
      context.endDrag(context.activeDropZone);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", context.cancelDrag);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", context.cancelDrag);
    };
  }, [isDragged, context]);

  return (
    <>
      {/* Original element (becomes ghost when dragging) */}
      <div
        ref={elementRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`
          ${disabled ? "" : "cursor-grab active:cursor-grabbing"}
          ${isDragged ? "opacity-30" : ""}
          touch-manipulation
          transition-opacity duration-150
          ${className}
        `}
        style={{ touchAction: disabled ? "auto" : "none" }}
      >
        {children}
      </div>

      {/* Dragged clone (follows cursor) */}
      {isDragged && context && (
        <div
          className="fixed pointer-events-none z-[9999] transition-transform duration-75"
          style={{
            left: context.dragPosition.x - offset.x,
            top: context.dragPosition.y - offset.y,
            transform: "scale(1.05) rotate(2deg)",
            filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}

/**
 * DropZone - Area where items can be dropped
 * 
 * @example
 * <DropZone id="wallet-zone" accepts={["product"]}>
 *   <div>Drop products here</div>
 * </DropZone>
 */
export function DropZone({
  children,
  id,
  accepts = [],
  className = "",
  activeClassName = "ring-2 ring-primary ring-offset-2 bg-primary/10",
  hoverClassName = "scale-[1.02]",
}) {
  const context = useDragContext();
  const zoneRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  const canAccept = useCallback(() => {
    if (!context?.draggedItem) return false;
    if (accepts.length === 0) return true;
    return accepts.includes(context.draggedItem.data?.type);
  }, [context?.draggedItem, accepts]);

  // Check if cursor is over this zone
  useEffect(() => {
    if (!context?.isDragging || !zoneRef.current) {
      setIsOver(false);
      return;
    }

    const checkPosition = () => {
      const rect = zoneRef.current?.getBoundingClientRect();
      if (!rect) return;

      const { x, y } = context.dragPosition;
      const over = 
        x >= rect.left && 
        x <= rect.right && 
        y >= rect.top && 
        y <= rect.bottom;

      setIsOver(over);
      if (over && canAccept()) {
        context.setActiveDropZone(id);
      } else if (context.activeDropZone === id) {
        context.setActiveDropZone(null);
      }
    };

    checkPosition();
  }, [context?.isDragging, context?.dragPosition, context?.activeDropZone, id, canAccept]);

  const isActive = context?.activeDropZone === id && canAccept();

  return (
    <div
      ref={zoneRef}
      className={`
        transition-all duration-200 ease-out
        ${className}
        ${isActive ? activeClassName : ""}
        ${isOver && canAccept() ? hoverClassName : ""}
      `}
    >
      {children}
    </div>
  );
}

/**
 * TrashZone - Special drop zone for deleting items
 * 
 * @example
 * <TrashZone>
 *   <TrashIcon />
 *   <span>Drop to delete</span>
 * </TrashZone>
 */
export function TrashZone({
  children,
  className = "",
  show = "always", // "always" | "dragging"
}) {
  const context = useDragContext();
  const zoneRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  // Check if cursor is over trash zone
  useEffect(() => {
    if (!context?.isDragging || !zoneRef.current) {
      setIsOver(false);
      return;
    }

    const rect = zoneRef.current.getBoundingClientRect();
    const { x, y } = context.dragPosition;
    const over = 
      x >= rect.left && 
      x <= rect.right && 
      y >= rect.top && 
      y <= rect.bottom;

    setIsOver(over);
    if (over) {
      context.setActiveDropZone("__trash__");
    } else if (context.activeDropZone === "__trash__") {
      context.setActiveDropZone(null);
    }
  }, [context?.isDragging, context?.dragPosition, context?.activeDropZone]);

  const isActive = context?.activeDropZone === "__trash__";
  const shouldShow = show === "always" || context?.isDragging;

  if (!shouldShow) return null;

  return (
    <div
      ref={zoneRef}
      className={`
        transition-all duration-300 ease-out
        ${context?.isDragging ? "opacity-100 scale-100" : "opacity-50 scale-95"}
        ${isActive ? "bg-error/20 border-error scale-110" : "bg-base-300 border-base-content/20"}
        ${isOver ? "animate-pulse" : ""}
        border-2 border-dashed rounded-2xl
        flex items-center justify-center gap-2
        min-h-[60px] min-w-[60px]
        ${className}
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`w-6 h-6 transition-colors ${isActive ? "text-error" : "text-base-content/50"}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
      {children}
    </div>
  );
}

/**
 * SortableList - Reorderable list with drag & drop
 * 
 * @example
 * <SortableList
 *   items={products}
 *   onReorder={(newOrder) => setProducts(newOrder)}
 *   renderItem={(item, index) => <ProductCard product={item} />}
 *   keyExtractor={(item) => item.id}
 * />
 */
export function SortableList({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  className = "",
  itemClassName = "",
  gap = 2,
  direction = "vertical", // "vertical" | "horizontal" | "grid"
}) {
  const [localItems, setLocalItems] = useState(items);
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setHoverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && hoverIndex !== null && dragIndex !== hoverIndex) {
      const newItems = [...localItems];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, removed);
      setLocalItems(newItems);
      onReorder?.(newItems);
    }
    setDragIndex(null);
    setHoverIndex(null);
  };

  const directionClasses = {
    vertical: "flex flex-col",
    horizontal: "flex flex-row flex-wrap",
    grid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <div className={`${directionClasses[direction]} gap-${gap} ${className}`}>
      {localItems.map((item, index) => (
        <SortableItem
          key={keyExtractor(item)}
          index={index}
          isDragging={dragIndex === index}
          isOver={hoverIndex === index}
          onDragStart={() => handleDragStart(index)}
          onDragOver={() => handleDragOver(index)}
          onDragEnd={handleDragEnd}
          className={itemClassName}
        >
          {renderItem(item, index)}
        </SortableItem>
      ))}
    </div>
  );
}

function SortableItem({
  children,
  index,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  className = "",
}) {
  const ref = useRef(null);
  const [touchStart, setTouchStart] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    });
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    
    const deltaX = Math.abs(e.touches[0].clientX - touchStart.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStart.y);
    
    // Start drag after 10px movement
    if (deltaX > 10 || deltaY > 10) {
      onDragStart();
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    onDragEnd();
  };

  return (
    <div
      ref={ref}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragEnd={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        transition-all duration-200 ease-out
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${isOver ? "transform translate-y-2 border-t-2 border-primary" : ""}
        cursor-grab active:cursor-grabbing
        touch-manipulation
        ${className}
      `}
    >
      {children}
    </div>
  );
}
