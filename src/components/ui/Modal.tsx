import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

export interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  transparent?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  title,
  size = 'medium',
  transparent = false,
}) => {
  // Determine width class based on size prop
  const getWidthClass = () => {
    switch (size) {
      case 'small':
        return 'sm:max-w-md';
      case 'medium':
        return 'sm:max-w-lg';
      case 'large':
        return 'sm:max-w-3xl';
      case 'full':
        return 'sm:max-w-7xl';
      default:
        return 'sm:max-w-lg';
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-50 inset-0 overflow-y-auto"
        onClose={onClose}
      >
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            {/* Replace Dialog.Overlay with a simple div that has the same styling */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >            <Dialog.Panel 
              className={`inline-block align-bottom ${transparent ? 'bg-transparent' : 'bg-white rounded-lg'} text-left overflow-hidden ${transparent ? '' : 'shadow-xl'} transform transition-all sm:my-8 sm:align-middle ${getWidthClass()} sm:w-full`}
            >
              {title && !transparent && (
                <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-brand-blue"
                  >
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
              )}
              {transparent ? (
                <>{children}</>
              ) : (
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">{children}</div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
