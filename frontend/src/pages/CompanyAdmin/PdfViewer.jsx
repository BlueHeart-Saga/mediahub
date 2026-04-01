import { useState } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';

export default function PdfViewer({ url, title, showPreview = false }) {
  const [error, setError] = useState(false);

  if (error || !showPreview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <FileText className="w-5 h-5 mr-2" />
        <span>{title || 'View PDF'}</span>
        <ExternalLink className="w-4 h-4 ml-2" />
      </a>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
        <span className="font-medium text-gray-700 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          {title || 'PDF Document'}
        </span>
        <a
          href={url}
          download
          className="text-gray-500 hover:text-gray-700"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
      <iframe
        src={`${url}#view=FitH`}
        className="w-full h-[600px]"
        title={title}
        onError={() => setError(true)}
      />
    </div>
  );
}