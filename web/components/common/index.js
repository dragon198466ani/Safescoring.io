/**
 * Common Components Index
 *
 * Central export for all reusable UI components
 * Import from '@/components/common' instead of individual files
 *
 * @example
 * import { Button, Modal, Input, EmptyState } from '@/components/common';
 */

// Modal Components
export { default as ModalBase, ModalFooter, ModalBody } from "./ModalBase";
export { Modal, ConfirmModal, AlertModal } from "./Modal";

// Button Components
export {
  default as Button,
  IconButton,
  CircleButton,
  ButtonGroup,
  LinkButton,
  AsyncButton,
} from "./Button";

// Input/Form Components
export {
  default as Input,
  Textarea,
  Select,
  Checkbox,
  Toggle,
  SearchInput,
  FormGroup,
} from "./Input";

// Loading/Skeleton Components
export {
  default as LoadingSkeleton,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonScore,
  SkeletonPillars,
  SkeletonChart,
  SkeletonList,
  SkeletonProductCard,
  SkeletonPage,
} from "./LoadingSkeleton";

// Empty State Components
export {
  default as EmptyState,
  SearchEmptyState,
  ErrorState,
  LoadingState,
} from "./EmptyState";

// Alert/Message Components
export {
  default as Alert,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  InlineAlert,
} from "./Alert";

// Icons
export { default as CloseIcon } from "./CloseIcon";
export * from "./Icons";

// User Components
export { default as UserAvatar } from "./UserAvatar";

// Tooltip & Help Components
export {
  default as Tooltip,
  InfoTooltip,
  HelpBubble,
} from "./Tooltip";

// Drag & Drop Components
export {
  DragDropProvider,
  DraggableItem,
  DropZone,
  TrashZone,
  SortableList,
  useDragContext,
} from "./DragDrop";
