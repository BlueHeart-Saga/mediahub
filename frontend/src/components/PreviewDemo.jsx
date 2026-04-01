// PreviewDemo.jsx
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Eye, 
  Clock, 
  MessageCircle, 
  User,
  Calendar,
  FolderOpen,
  Tag,
  ThumbsUp,
  Building2,
  ExternalLink,
  FileText,
  Play,
  Link2,
  Quote as QuoteIcon,
  Code,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Heart,
  Share2,
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2
} from "lucide-react";
import { useState } from "react";

// Helper function to get image URL (same as in EditorContent)
const getImageUrl = (imageId) => {
  if (!imageId) return null;
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  return `${API_BASE}/api/images/${imageId}`;
};

// Helper function to get document URL
const getDocumentUrl = (documentId) => {
  if (!documentId) return null;
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  return `${API_BASE}/api/documents/${documentId}`;
};

export default function PreviewDemo({ isOpen, onClose, postData }) {
  const [deviceView, setDeviceView] = useState('desktop'); // 'mobile', 'tablet', 'desktop'
  const [showMetadata, setShowMetadata] = useState(true);

  // Device dimensions for preview
  const deviceDimensions = {
    mobile: 'w-[375px]',
    tablet: 'w-[768px]',
    desktop: 'w-full'
  };

  if (!isOpen || !postData) return null;

  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="mb-4" key={block.id}>
            <h1 className="text-3xl font-bold text-[#111827]">{block.data.value}</h1>
          </div>
        );

      case 'subheading':
        return (
          <div className="mb-3" key={block.id}>
            <h2 className="text-2xl font-semibold text-[#111827]">{block.data.value}</h2>
          </div>
        );

      case 'text':
        return (
          <div className="mb-4" key={block.id}>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{block.data.value}</p>
          </div>
        );

      case 'image':
        return (
          <div className="my-6" key={block.id}>
            <div className="rounded-lg overflow-hidden shadow-lg bg-gray-100">
              {block.data.file_id ? (
                <img 
                  src={getImageUrl(block.data.file_id)}
                  alt={block.data.alt || block.data.caption || 'Post image'}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/800x400?text=Image+Not+Found';
                  }}
                />
              ) : block.data.preview ? (
                <img 
                  src={block.data.preview}
                  alt={block.data.alt || block.data.caption || 'Preview'}
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image placeholder</span>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-sm text-gray-500 mt-2 text-center italic">{block.data.caption}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="my-6" key={block.id}>
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
              {block.data.embed_url ? (
                <iframe
                  src={block.data.embed_url}
                  title={block.data.caption || 'Video content'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <Play className="w-12 h-12 text-gray-400" />
                  <span className="ml-2 text-gray-400">Video: {block.data.url}</span>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-sm text-gray-500 mt-2 text-center">{block.data.caption}</p>
            )}
          </div>
        );

      case 'embed':
        return (
          <div className="my-6" key={block.id}>
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
              {block.data.embed_url ? (
                <iframe
                  src={block.data.embed_url}
                  title={block.data.caption || 'Embedded content'}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Link2 className="w-12 h-12 text-gray-400" />
                  <span className="ml-2 text-gray-500">Embed: {block.data.url}</span>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-sm text-gray-500 mt-2 text-center">{block.data.caption}</p>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="my-6" key={block.id}>
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-lg p-3 mr-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#111827] mb-1">
                    {block.data.title || 'Document'}
                  </h3>
                  {block.data.description && (
                    <p className="text-sm text-gray-600 mb-2">{block.data.description}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="flex items-center mr-4">
                      <FileText className="w-4 h-4 mr-1" />
                      PDF Document
                    </span>
                    {block.data.size && (
                      <span>{(block.data.size / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-500 ml-4" />
              </div>
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className="my-6" key={block.id}>
            <blockquote className="relative pl-6 border-l-4 border-[#111827]">
              <QuoteIcon className="absolute -left-2 -top-2 w-6 h-6 text-gray-300" />
              <p className="text-gray-700 italic text-lg leading-relaxed">"{block.data.value}"</p>
              {block.data.author && (
                <cite className="text-sm text-gray-500 mt-2 block not-italic">— {block.data.author}</cite>
              )}
            </blockquote>
          </div>
        );

      case 'pull-quote':
        return (
          <div className="my-8" key={block.id}>
            <aside className="bg-gray-50 p-8 rounded-lg text-center">
              <QuoteIcon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-medium text-[#111827] italic">"{block.data.value}"</p>
            </aside>
          </div>
        );

      case 'code':
        return (
          <div className="my-6" key={block.id}>
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">
                {block.data.language || 'code'}
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className={`language-${block.data.language || 'text'} text-sm text-gray-100 font-mono`}>
                  {block.data.value}
                </code>
              </pre>
            </div>
          </div>
        );

      case 'bullet-list':
        return (
          <div className="my-4" key={block.id}>
            <ul className="space-y-2">
              {block.data.items?.map((item, i) => (
                <li key={i} className="flex items-start text-gray-600">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>{item || 'Empty list item'}</span>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'numbered-list':
        return (
          <div className="my-4" key={block.id}>
            <ol className="space-y-2 list-decimal list-inside">
              {block.data.items?.map((item, i) => (
                <li key={i} className="text-gray-600">
                  <span className="ml-1">{item || 'Empty list item'}</span>
                </li>
              ))}
            </ol>
          </div>
        );

      case 'cta':
        return (
          <div className="my-8 text-center" key={block.id}>
            <button 
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium transition-all ${
                block.data.style === 'primary' 
                  ? 'bg-[#111827] text-white hover:bg-gray-800 shadow-lg' 
                  : block.data.style === 'secondary'
                  ? 'bg-gray-200 text-[#111827] hover:bg-gray-300'
                  : 'border-2 border-[#111827] text-[#111827] hover:bg-[#111827] hover:text-white'
              }`}
            >
              {block.data.label || 'Call to Action'}
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        );

      case 'divider':
        return (
          <div className="my-8" key={block.id}>
            <hr className="border-gray-200" />
          </div>
        );

      case 'callout':
        const calloutStyles = {
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          success: 'bg-green-50 border-green-200 text-green-800',
          note: 'bg-gray-50 border-gray-200 text-gray-800'
        };
        
        const calloutIcons = {
          info: <Info className="w-5 h-5" />,
          warning: <AlertTriangle className="w-5 h-5" />,
          success: <CheckCircle className="w-5 h-5" />,
          note: <AlertCircle className="w-5 h-5" />
        };

        return (
          <div className={`my-6 p-4 rounded-lg border ${calloutStyles[block.data.type] || calloutStyles.note}`} key={block.id}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {calloutIcons[block.data.type] || calloutIcons.note}
              </div>
              <div className="flex-1">
                <p className="leading-relaxed">{block.data.value || 'Callout text'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <motion.div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Close preview"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full">
                Preview Mode
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Device Toggle */}
              <div className="flex items-center bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setDeviceView('mobile')}
                  className={`p-2 rounded-md transition-colors ${
                    deviceView === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-300'
                  }`}
                  title="Mobile view"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceView('tablet')}
                  className={`p-2 rounded-md transition-colors ${
                    deviceView === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-300'
                  }`}
                  title="Tablet view"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceView('desktop')}
                  className={`p-2 rounded-md transition-colors ${
                    deviceView === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-300'
                  }`}
                  title="Desktop view"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>

              {/* Toggle Metadata */}
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className={`p-2 rounded-lg transition-colors ${
                  showMetadata ? 'bg-[#111827] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title="Toggle metadata"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    document.querySelector('.preview-content')?.requestFullscreen();
                  }
                }}
                className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-gray-500">
              {postData.status === 'published' ? 'Live Preview' : 'Draft Preview'}
            </div>
          </div>

          {/* Preview Content with Device Frame */}
          <div className="flex-1 overflow-auto bg-gray-100 p-8 preview-content">
            <div className={`mx-auto transition-all duration-300 ${deviceDimensions[deviceView]}`}>
              {/* Mobile/Tablet Frame */}
              {(deviceView === 'mobile' || deviceView === 'tablet') && (
                <div className="bg-black rounded-[3rem] p-4 shadow-2xl">
                  <div className="bg-white rounded-[2rem] overflow-hidden">
                    {/* Device Notch */}
                    <div className="bg-black h-6 w-40 mx-auto rounded-b-2xl"></div>
                    
                    {/* Actual Content */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                      <PreviewContent 
                        postData={postData} 
                        showMetadata={showMetadata}
                        renderBlock={renderBlock}
                        getImageUrl={getImageUrl}
                      />
                    </div>
                    
                    {/* Device Home Indicator */}
                    <div className="bg-black h-1 w-32 mx-auto rounded-full my-2"></div>
                  </div>
                </div>
              )}

              {/* Desktop View */}
              {deviceView === 'desktop' && (
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                  <div className="bg-gray-100 h-8 flex items-center px-4 border-b border-gray-200">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-gray-500 bg-white px-4 py-1 rounded-full">
                        {postData.title || 'Untitled'} • Preview
                      </span>
                    </div>
                  </div>
                  <div className="p-8  overflow-y-auto">
                    <PreviewContent 
                      postData={postData} 
                      showMetadata={showMetadata}
                      renderBlock={renderBlock}
                      getImageUrl={getImageUrl}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Est. read time: {Math.max(1, Math.ceil((postData.blocks?.length || 0) * 0.5))} min
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {postData.blocks?.length || 0} blocks
              </span>
            </div>
            
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#111827] text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Preview Content Component
function PreviewContent({ postData, showMetadata, renderBlock, getImageUrl }) {
  return (
    <article className="prose prose-lg max-w-none">
      {/* Metadata */}
      {showMetadata && (
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {postData.title || 'Untitled Post'}
          </h1>
          
          {postData.subtitle && (
            <p className="text-xl text-gray-600 italic mb-6">{postData.subtitle}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Author Name
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="w-4 h-4" />
              {postData.section_slug || 'Uncategorized'}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              {postData.category_slug || 'General'}
            </span>
          </div>

          {/* Tags */}
          {postData.tags && postData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {postData.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cover Image */}
      {postData.cover_image_id && showMetadata && (
        <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
          <img 
            src={getImageUrl(postData.cover_image_id)}
            alt={postData.title}
            className="w-full h-auto"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/1200x600?text=Cover+Image';
            }}
          />
        </div>
      )}

      {/* Content Blocks */}
      <div className="space-y-6">
        {postData.blocks && postData.blocks.length > 0 ? (
          postData.blocks.map(block => renderBlock(block))
        ) : (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No content blocks yet</p>
            <p className="text-sm mt-2">Add blocks in the editor to see preview</p>
          </div>
        )}
      </div>

      {/* Like and Share Placeholders */}
      {showMetadata && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Heart className="w-5 h-5" />
              <span>Like</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}