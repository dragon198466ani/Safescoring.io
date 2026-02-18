"use client";

/**
 * Unified Modal Component
 *
 * Single source of truth for all modal implementations.
 * Uses Headless UI Dialog for accessibility (keyboard support, focus trap).
 *
 * Replaces inconsistent implementations in:
 * - UpgradeModal (custom backdrop)
 * - DonationModal (daisyUI modal class)
 * - PillarInfoModal (Headless UI)
 * - SetupCreator (custom implementation)
 */

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { XIcon } from "./Icons";

// Size presets - mobile-first with responsive scaling
const SIZES = {
  sm: "max-w-[calc(100vw-2rem)] sm:max-w-md",
  md: "max-w-[calc(100vw-2rem)] sm:max-w-lg",
  lg: "max-w-[calc(100vw-2rem)] sm:max-w-2xl",
  xl: "max-w-[calc(100vw-2rem)] sm:max-w-4xl",
  full: "max-w-[calc(100vw-1rem)]",
};

/**
 * Modal Component
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title (optional)
 * @param {string} size - Size preset: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} showCloseButton - Whether to show close button (default: true)
 * @param {ReactNode} children - Modal content
 * @param {string} className - Additional classes for modal panel
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  showCloseButton = true,
  children,
  className = "",
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal container - improved mobile padding */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${SIZES[size]} transform rounded-xl sm:rounded-2xl bg-base-100 shadow-xl transition-all max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col ${className}`}
              >
                {/* Header with title and close button */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between p-4 sm:p-6 border-b border-base-300 shrink-0">
                    {title && (
                      <Dialog.Title className="text-xl font-bold">
                        {title}
                      </Dialog.Title>
                    )}
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm btn-circle ml-auto"
                        aria-label="Close modal"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content - scrollable */}
                <div className={`overflow-y-auto flex-1 ${title || showCloseButton ? "" : "p-4 sm:p-6"}`}>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Modal.Body - Wrapper for modal body content with consistent padding
 */
Modal.Body = function ModalBody({ children, className = "" }) {
  return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
};

/**
 * Modal.Footer - Wrapper for modal footer with action buttons
 */
Modal.Footer = function ModalFooter({ children, className = "" }) {
  return (
    <div
      className={`flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-base-300 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * ConfirmModal - Pre-built confirmation modal pattern
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal should close
 * @param {function} onConfirm - Callback when confirm button clicked
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Button variant: 'primary' | 'error' | 'warning'
 * @param {boolean} loading - Whether confirm action is loading
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
}) {
  const buttonVariants = {
    primary: "btn-primary",
    error: "btn-error",
    warning: "btn-warning",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <Modal.Body>
        <p className="text-base-content/70">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
          {cancelText}
        </button>
        <button
          className={`btn ${buttonVariants[variant]}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner loading-sm" />}
          {confirmText}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

/**
 * AlertModal - Pre-built alert/info modal pattern
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info", // info, success, warning, error
  buttonText = "OK",
}) {
  const icons = {
    info: (
      <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    success: (
      <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <Modal.Body className="text-center">
        <div className="flex justify-center mb-4">{icons[type]}</div>
        {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
        <p className="text-base-content/70">{message}</p>
      </Modal.Body>
      <Modal.Footer className="justify-center">
        <button className="btn btn-primary" onClick={onClose}>
          {buttonText}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default Modal;
