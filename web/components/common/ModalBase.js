"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import CloseIcon from "./CloseIcon";

/**
 * ModalBase - Reusable Modal Component
 *
 * Use this as the base for all modals in the application.
 * Supports different sizes, custom headers, and content.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title (optional)
 * @param {React.ReactNode} children - Modal content
 * @param {string} size - Modal size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} showClose - Whether to show close button (default: true)
 * @param {string} className - Additional classes for the panel
 */
export default function ModalBase({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
  className = "",
}) {
  // Size classes mapping
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-6xl",
  };

  const maxWidthClass = sizeClasses[size] || sizeClasses.md;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal Container — bottom-sheet on mobile, centered on desktop */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={`
                  w-full ${maxWidthClass} transform overflow-hidden
                  rounded-t-2xl sm:rounded-2xl bg-base-100 border border-base-300
                  p-6 text-left align-middle shadow-xl transition-all
                  max-h-[90vh] overflow-y-auto
                  ${className}
                `}
              >
                {/* Header */}
                {(title || showClose) && (
                  <div className="flex items-center justify-between mb-4">
                    {title && (
                      <Dialog.Title as="h3" className="text-lg font-semibold">
                        {title}
                      </Dialog.Title>
                    )}
                    {!title && <div />}
                    {showClose && (
                      <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm btn-square"
                        aria-label="Close modal"
                      >
                        <CloseIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Modal Footer - Consistent footer for modals with actions
 */
export function ModalFooter({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-base-300 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Modal Body - Scrollable body content
 */
export function ModalBody({ children, className = "" }) {
  return (
    <div className={`max-h-[60vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}
