// DeleteConfirmDialog.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertTriangle, X } from "lucide-react";

export default function DeleteConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  postTitle,
  canPermanentDelete 
}) {
  const [deleteType, setDeleteType] = useState('soft');

  const handleConfirm = () => {
    onConfirm(deleteType);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div 
          className="bg-white rounded-xl shadow-xl max-w-md w-full"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-[#111827]">Delete Post</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "<span className="font-medium text-[#111827]">{postTitle}</span>"?
            </p>
            
            {canPermanentDelete && (
              <div className="space-y-3 mt-4">
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="deleteType"
                    value="soft"
                    checked={deleteType === 'soft'}
                    onChange={(e) => setDeleteType('soft')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[#111827]">Soft Delete</p>
                    <p className="text-sm text-gray-500">
                      Move to trash - can be restored later
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                  <input
                    type="radio"
                    name="deleteType"
                    value="permanent"
                    checked={deleteType === 'permanent'}
                    onChange={(e) => setDeleteType('permanent')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-red-600">Permanent Delete</p>
                    <p className="text-sm text-red-500">
                      This action cannot be undone. All data will be permanently removed.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                deleteType === 'permanent' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              <Trash2 size={18} />
              {deleteType === 'permanent' ? 'Permanently Delete' : 'Move to Trash'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}