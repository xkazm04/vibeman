import React, { useState } from 'react';
import { ModalTransition, ModalContent } from '../ModalTransition';
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Example: Simple Confirmation Modal using ModalTransition
 */
export const SimpleConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} variant="spring" transition="spring">
      <ModalContent className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/40 shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/40 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-gray-300 mb-6">{message}</p>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-gray-300 rounded-lg transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg transition-all font-medium"
          >
            Confirm
          </button>
        </div>
      </ModalContent>
    </ModalTransition>
  );
};

/**
 * Example: Success Notification Modal
 */
export const SuccessNotificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: string;
}> = ({ isOpen, onClose, message }) => {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} variant="slideDown" transition="smooth">
      <ModalContent className="bg-gradient-to-r from-green-900/90 to-emerald-900/90 rounded-xl border border-green-500/40 shadow-lg max-w-md w-full p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">Success</h3>
            <p className="text-green-200 text-sm">{message}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-green-800/40 rounded transition-colors">
            <X className="w-4 h-4 text-green-300" />
          </button>
        </div>
      </ModalContent>
    </ModalTransition>
  );
};

/**
 * Example: Warning Modal
 */
export const WarningModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onProceed, title, message }) => {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} variant="scale" transition="smooth">
      <ModalContent className="bg-gradient-to-br from-orange-900/90 to-red-900/90 rounded-2xl border border-orange-500/40 shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-start space-x-4 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-orange-100">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-gray-300 rounded-lg transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onProceed();
              onClose();
            }}
            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-lg transition-all font-medium"
          >
            Proceed Anyway
          </button>
        </div>
      </ModalContent>
    </ModalTransition>
  );
};

/**
 * Example: Info Modal with Slide Up Animation
 */
export const InfoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} variant="slideUp" transition="smooth">
      <ModalContent className="bg-gradient-to-br from-blue-900/90 to-indigo-900/90 rounded-t-2xl border-t border-x border-blue-500/40 shadow-2xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800/40 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-blue-300" />
          </button>
        </div>

        <div className="text-blue-100">{children}</div>

        <div className="flex items-center justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg transition-all font-medium"
          >
            Got it
          </button>
        </div>
      </ModalContent>
    </ModalTransition>
  );
};

/**
 * Example: Stacked Modals (modal opens on top of modal)
 */
export const StackedModalsExample: React.FC = () => {
  const [firstModalOpen, setFirstModalOpen] = useState(false);
  const [secondModalOpen, setSecondModalOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setFirstModalOpen(true)}
        className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-lg"
      >
        Open First Modal
      </button>

      {/* First Modal */}
      <ModalTransition
        isOpen={firstModalOpen}
        onClose={() => setFirstModalOpen(false)}
        variant="default"
        zIndex={50}
      >
        <ModalContent className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md">
          <h2 className="text-xl font-semibold text-white mb-4">First Modal</h2>
          <p className="text-gray-300 mb-4">This is the first modal.</p>
          <button
            onClick={() => setSecondModalOpen(true)}
            className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg"
          >
            Open Second Modal
          </button>
        </ModalContent>
      </ModalTransition>

      {/* Second Modal (on top) */}
      <ModalTransition
        isOpen={secondModalOpen}
        onClose={() => setSecondModalOpen(false)}
        variant="spring"
        transition="spring"
        zIndex={60}
      >
        <ModalContent className="bg-purple-900/95 rounded-lg border border-purple-500/40 p-6 max-w-sm">
          <h2 className="text-xl font-semibold text-white mb-4">Second Modal</h2>
          <p className="text-purple-100 mb-4">This modal appears on top of the first one!</p>
          <button
            onClick={() => setSecondModalOpen(false)}
            className="px-4 py-2 bg-purple-500/30 border border-purple-400/50 text-purple-200 rounded-lg"
          >
            Close This Modal
          </button>
        </ModalContent>
      </ModalTransition>
    </div>
  );
};

/**
 * Complete usage example with all modal types
 */
export const ModalTransitionUsageExample: React.FC = () => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">ModalTransition Examples</h1>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setConfirmOpen(true)}
          className="px-4 py-3 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all"
        >
          Open Confirmation Modal
        </button>

        <button
          onClick={() => setSuccessOpen(true)}
          className="px-4 py-3 bg-green-500/20 border border-green-500/40 text-green-300 rounded-lg hover:bg-green-500/30 transition-all"
        >
          Show Success Notification
        </button>

        <button
          onClick={() => setWarningOpen(true)}
          className="px-4 py-3 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-all"
        >
          Show Warning
        </button>

        <button
          onClick={() => setInfoOpen(true)}
          className="px-4 py-3 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-all"
        >
          Show Info Modal
        </button>
      </div>

      <SimpleConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => console.log('Confirmed!')}
        title="Confirm Action"
        message="Are you sure you want to proceed with this action?"
      />

      <SuccessNotificationModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        message="Your changes have been saved successfully!"
      />

      <WarningModal
        isOpen={warningOpen}
        onClose={() => setWarningOpen(false)}
        onProceed={() => console.log('Proceeding with warning')}
        title="Warning: Destructive Action"
        message="This action cannot be undone. Are you sure you want to continue?"
      />

      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Information"
      >
        <div className="space-y-2">
          <p>This is an example of an info modal using the slideUp variant.</p>
          <p>You can put any content here, including:</p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>Lists</li>
            <li>Forms</li>
            <li>Tables</li>
            <li>Complex layouts</li>
          </ul>
        </div>
      </InfoModal>
    </div>
  );
};
